import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';

const YodaIcon = ({ size = 28, invert = false }) => (
  <img src="/yoda.png" alt="Yoda" width={size} height={size}
    style={{ objectFit: 'contain', ...(invert ? { filter: 'brightness(0) invert(1)' } : {}) }} />
);
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : null;

async function loadAttivita(clients) {
  const { data } = await supabase
    .from('attivita')
    .select('id,titolo,descrizione,priorita,data_rilascio,data_richiesta,data_inizio_lavori,assegnata_a,commessa_id,colonna_id,avanzamento,note,novita_prodotto,tipo')
    .not('tipo', 'is', null)
    .order('created_at', { ascending: false });

  const { data: colonne } = await supabase.from('workflow_colonne').select('id,nome');
  const colMap = Object.fromEntries((colonne || []).map(c => [c.id, c.nome]));

  const commMap = {};
  (clients || []).forEach(c =>
    (c.commesse || []).forEach(co => {
      commMap[co.id] = { cliente: c.nome_progetto, commessa: co.nome_commessa, pm: co.pm_commessa || c.pm_name || '' };
    })
  );

  return (data || []).map(a => ({
    ...a,
    stato: colMap[a.colonna_id] || '—',
    ...(commMap[a.commessa_id] || { cliente: '—', commessa: '—', pm: '—' }),
  }));
}

function serialize(attivita) {
  if (!attivita?.length) return 'Nessuna attività trovata.';
  return attivita.map((a, i) => [
    `[${i + 1}] TITOLO: ${a.titolo || '—'} | TIPO: ${a.novita_prodotto ? 'Novità Prodotto' : a.tipo}`,
    `     CLIENTE: ${a.cliente} | COMMESSA: ${a.commessa} | PM: ${a.pm}`,
    `     STATO: ${a.stato} | PRIORITÀ: ${a.priorita || '—'} | AVANZAMENTO: ${a.avanzamento != null ? a.avanzamento + '%' : '—'}`,
    `     ASSEGNATO: ${a.assegnata_a || '—'} | RICHIESTO: ${fmtDate(a.data_richiesta) || '—'} | RILASCIO: ${fmtDate(a.data_rilascio) || '—'}`,
    a.descrizione ? `     DESC: ${a.descrizione.slice(0, 180)}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');
}

export function AssistenteAI({ clients, userOverride, bottomOffset = 28 }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attivita, setAttivita] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && attivita === null && !loadingData) {
      setLoadingData(true);
      loadAttivita(clients).then(data => {
        setAttivita(data);
        setLoadingData(false);
        if (messages.length === 0) {
          setMessages([{ role: 'assistant', text: `Ciao ${userOverride?.nome || ''}! Sono Yoda.\n\nPosso risponderti sull'andamento della pianificazione sviluppi.`, isIntro: true }]);
        }
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || !attivita) return;
    setInput('');
    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const { data: cfg } = await supabase.from('app_config').select('value').eq('key', 'groq_api_key').single();
      const key = cfg?.value || '';
      if (!key) throw new Error('no_key');

      const systemPrompt = `Sei Yoda, l'assistente AI del Portale Delivery ZCS Group. Rispondi SOLO in italiano.
Rispondi a domande sulle attività workflow: sviluppi software e novità di prodotto.
Rispondi con un mix di testo narrativo e dati strutturati. Tono professionale e diretto.
Non inventare dati non presenti. Se non trovi corrispondenze, dillo chiaramente.

ATTIVITÀ DISPONIBILI (${attivita.length} totali):
${serialize(attivita)}`;

      const history = newMessages.slice(-8).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: 1000, messages: [{ role: 'system', content: systemPrompt }, ...history] }),
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Errore nella risposta.';
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: e.message === 'no_key' ? 'Chiave Groq non configurata in app_config.' : 'Si è verificato un errore. Riprova.',
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const renderText = (text) => text.split('\n').map((line, i, arr) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <React.Fragment key={i}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        {i < arr.length - 1 && <br />}
      </React.Fragment>
    );
  });

  return (
    <>
      <div style={{ position: 'fixed', bottom: bottomOffset, right: 28, zIndex: 9990, pointerEvents: 'auto' }}>
        <button onClick={() => setOpen(v => !v)}
          style={{ width: 52, height: 52, borderRadius: '50%', background: open ? '#475569' : 'var(--brand-800)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,18,41,0.3)', transition: 'all 0.2s', overflow: 'hidden', padding: 0 }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
          {open ? <IconClose /> : <YodaIcon size={34} invert />}
        </button>
      </div>

      {open && (<>
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 9980, background: 'rgba(0,18,41,0.15)' }} />
        <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: '#fff', zIndex: 9985, boxShadow: '-8px 0 32px rgba(0,18,41,0.12)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.2s ease' }}>
          <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}} @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>

          <div style={{ background: 'var(--brand-800)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
              <YodaIcon size={30} invert />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Yoda</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', marginBottom: 2 }}>«Fare o non fare, non c'è provare»</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {loadingData ? 'Caricamento attività…' : attivita ? `${attivita.length} attività caricate` : 'Workflow · Sviluppo · Novità'}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '6px 8px', display: 'flex', alignItems: 'center' }}>
              <IconClose />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px', background: '#f8fafc', borderRadius: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-700)', animation: 'bounce 1s ease infinite' }} />
                <span style={{ fontSize: 13, color: '#64748b' }}>Caricamento attività workflow…</span>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                {m.role === 'assistant' && (
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--brand-50)', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, overflow: 'hidden' }}>
                    <YodaIcon size={20} />
                  </div>
                )}
                <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? 'var(--brand-800)' : m.isError ? '#fef2f2' : '#f8fafc', color: m.role === 'user' ? '#fff' : m.isError ? '#dc2626' : '#0f172a', fontSize: 13, lineHeight: 1.6, border: m.role === 'assistant' && !m.isError ? '0.5px solid #e2e8f0' : 'none' }}>
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--brand-50)', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  <YodaIcon size={20} />
                </div>
                <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', background: '#f8fafc', border: '0.5px solid #e2e8f0', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', animation: `bounce 1.2s ease ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && !loading && (
            <div style={{ padding: '0 16px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {['Sviluppi in corso', 'Attività senza data rilascio', 'Novità di prodotto', 'Attività urgenti'].map(s => (
                <button key={s} onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                  style={{ fontSize: 11, padding: '5px 11px', borderRadius: 20, border: '0.5px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                  onMouseOver={e => e.currentTarget.style.background = '#dbeafe'}
                  onMouseOut={e => e.currentTarget.style.background = '#eff6ff'}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding: '10px 16px 16px', borderTop: '0.5px solid #e2e8f0', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Chiedi a Yoda…" rows={1}
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5, maxHeight: 80, overflowY: 'auto', background: '#f8fafc', color: '#0f172a' }}
                onFocus={e => e.target.style.borderColor = '#185FA5'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              <button onClick={sendMessage} disabled={loading || !input.trim() || !attivita}
                style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: input.trim() && attivita ? 'var(--brand-800)' : '#e2e8f0', color: input.trim() && attivita ? '#fff' : '#94a3b8', cursor: input.trim() && attivita ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconSend />
              </button>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>Invio · Shift+Invio per andare a capo</div>
          </div>
        </div>
      </>)}
    </>
  );
}