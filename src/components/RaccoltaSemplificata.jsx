import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';

// ── Icone ─────────────────────────────────────────────────────────
const YodaIcon = ({ size = 24, invert = false }) => (
  <img src="/yoda.png" alt="Yoda" width={size} height={size}
    style={{ objectFit: 'contain', ...(invert ? { filter: 'brightness(0) invert(1)' } : {}) }} />
);
const IconSend = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('it-IT');

// ── Domande progressive di Yoda ───────────────────────────────────
const DOMANDE = [
  { id: 'destinatario', testo: 'Cominciamo! A chi è destinato questo documento? (nome cliente o azienda)' },
  { id: 'titolo_doc', testo: 'Ottimo. Qual è il titolo generale della proposta? (es. "Gestione Cespiti", "Modulo Acquisti")' },
  { id: 'sistema', testo: 'Su quale sistema o modulo interveniamo? (es. Teseo, T7, Cassiopea...)' },
  { id: 'n_sviluppi', testo: 'Quanti interventi/sviluppi distinti vuoi documentare in questa proposta?' },
];

import { exportPropostaDocx } from './exportProposta.js';

// ── Componente principale ─────────────────────────────────────────
export function RaccoltaSemplificata({ onClose, clients, cardId = null, createdBy = '' }) {
  // Dati del documento
  const [destinatario, setDestinatario] = useState('');
  const [titoloDoc, setTitoloDoc] = useState('');
  const [sistema, setSistema] = useState('');
  const [sviluppi, setSviluppi] = useState([]); // [{ titolo, situazioneAttuale, soluzioneProposta, oneri }]

  // Chat Yoda
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [fase, setFase] = useState('intro'); // intro | raccolta | revisione
  const [exporting, setExporting] = useState(false);
  const [domandaIdx, setDomandaIdx] = useState(0);
  const [sviluppoCorrente, setSviluppoCorrente] = useState(0); // indice sviluppo in lavorazione
  const [campoCorrente, setCampoCorrente] = useState('titolo'); // titolo | situazione | soluzione | oneri

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Messaggio di benvenuto
    setMessages([{
      role: 'assistant',
      text: `Ciao! Sono **Yoda** 🟢\n\nTi aiuterò a creare la proposta di miglioramento in pochi passaggi.\n\n${DOMANDE[0].testo}`,
    }]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, fase]);

  const addMsg = (role, text) => setMessages(p => [...p, { role, text }]);

  const getGroqKey = async () => {
    const { data } = await supabase.from('app_config').select('value').eq('key', 'groq_api_key').single();
    return data?.value || '';
  };

  const callGroq = async (systemPrompt, userMsg) => {
    const key = await getGroqKey();
    if (!key) throw new Error('no_key');
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }],
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  };

  // ── Gestione risposte per fase ────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    addMsg('user', text);
    setLoading(true);

    try {
      if (fase === 'intro') {
        await handleIntroFase(text);
      } else if (fase === 'raccolta') {
        await handleRaccoltaFase(text);
      }
    } catch (e) {
      addMsg('assistant', e.message === 'no_key' ? 'Chiave Groq non configurata.' : 'Errore. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleIntroFase = async (text) => {
    const nuovoIdx = domandaIdx + 1;

    if (domandaIdx === 0) setDestinatario(text);
    if (domandaIdx === 1) setTitoloDoc(text);
    if (domandaIdx === 2) setSistema(text);
    if (domandaIdx === 3) {
      const n = parseInt(text) || 1;
      const vuoti = Array.from({ length: n }, () => ({ titolo: '', situazioneAttuale: '', soluzioneProposta: '', oneri: 'ZCS' }));
      setSviluppi(vuoti);
      setFase('raccolta');
      setSviluppoCorrente(0);
      setCampoCorrente('titolo');
      addMsg('assistant', `Perfetto! Raccoglierò le informazioni per **${n} intervento${n > 1 ? 'i' : ''}**.\n\nPartiamo dal **primo intervento** — qual è il titolo? (es. "Gestione valuta estera nelle commesse")`);
      return;
    }

    if (nuovoIdx < DOMANDE.length) {
      setDomandaIdx(nuovoIdx);
      addMsg('assistant', DOMANDE[nuovoIdx].testo);
    }
  };

  const handleRaccoltaFase = async (text) => {
    const aggiorna = (campo, valore) => {
      setSviluppi(prev => prev.map((s, i) => i === sviluppoCorrente ? { ...s, [campo]: valore } : s));
    };

    if (campoCorrente === 'titolo') {
      aggiorna('titolo', text);
      setCampoCorrente('situazione');
      // Yoda chiede la situazione attuale
      const prompt = `Sei Yoda, assistente per raccolta requisiti software. Stai aiutando a documentare uno sviluppo intitolato "${text}". Chiedi all'utente di descrivere la SITUAZIONE ATTUALE (il problema o limite esistente). Sii breve, max 2 righe.`;
      const reply = await callGroq(prompt, text);
      addMsg('assistant', reply);

    } else if (campoCorrente === 'situazione') {
      aggiorna('situazioneAttuale', text);
      setCampoCorrente('soluzione');
      const prompt = `Sei Yoda, assistente raccolta requisiti. L'utente ha descritto la situazione attuale: "${text}". Ora chiedi di descrivere la SOLUZIONE PROPOSTA (cosa deve fare il software). Sii breve, max 2 righe.`;
      const reply = await callGroq(prompt, text);
      addMsg('assistant', reply);

    } else if (campoCorrente === 'soluzione') {
      aggiorna('soluzioneProposta', text);
      setCampoCorrente('oneri');
      addMsg('assistant', `Gli oneri economici sono a carico di **ZCS** o del **cliente** (${destinatario})?`);

    } else if (campoCorrente === 'oneri') {
      const oneriVal = text.toLowerCase().includes('client') || text.toLowerCase().includes(destinatario.toLowerCase()) ? destinatario : 'ZCS';
      aggiorna('oneri', oneriVal);

      const prossimoIdx = sviluppoCorrente + 1;
      if (prossimoIdx < sviluppi.length) {
        setSviluppoCorrente(prossimoIdx);
        setCampoCorrente('titolo');
        addMsg('assistant', `Ottimo! Passiamo al **${prossimoIdx + 1}° intervento** — qual è il titolo?`);
      } else {
        // Tutti gli sviluppi completati
        setFase('revisione');
        addMsg('assistant', `✅ Ho tutte le informazioni! Il documento è pronto.\n\nPuoi **revisionare** il documento nella colonna destra e poi **esportarlo in Word**.\n\nVuoi modificare qualcosa o procedo con l'esportazione?`);
      }
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPropostaDocx({ destinatario, titoloDoc, sistema, sviluppi });
      // Salva in card_documenti
      await supabase.from('card_documenti').insert({
        card_id: cardId || null,
        tipo: 'proposta_miglioramento',
        titolo: titoloDoc || 'Proposta di Miglioramento',
        dati: { destinatario, titoloDoc, sistema, sviluppi },
        creato_da: createdBy || '',
      });
      addMsg('assistant', '**Documento salvato!** Trovi la proposta nell\'archivio documenti della card.');
    } catch (e) {
      addMsg('assistant', 'Errore durante la generazione del documento. Riprova.');
    } finally {
      setExporting(false);
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

  // Progresso compilazione
  const totCampi = sviluppi.length * 4;
  const compilati = sviluppi.reduce((s, sv) => {
    return s + (sv.titolo ? 1 : 0) + (sv.situazioneAttuale ? 1 : 0) + (sv.soluzioneProposta ? 1 : 0) + (sv.oneri ? 1 : 0);
  }, 0);
  const progresso = totCampi > 0 ? Math.round((compilati / totCampi) * 100) : 0;

  return (
    <div className="modal-overlay" onClick={e => e.stopPropagation()} style={{ alignItems: 'stretch', padding: 0 }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 1100, height: '90vh',
        background: '#fff', borderRadius: 20,
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 64px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{ background: 'var(--brand-800)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <YodaIcon size={32} invert />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Raccolta Requisiti — Guidata da Yoda</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>«Fare o non fare, non c'è provare»</div>
          </div>
          {fase === 'revisione' && (
            <button onClick={handleExport} disabled={exporting}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontSize: 13, fontWeight: 700, cursor: exporting ? 'wait' : 'pointer', opacity: exporting ? 0.7 : 1 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              {exporting ? 'Generazione…' : 'Esporta Word'}
            </button>
          )}
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', padding: '7px 10px', fontSize: 18, fontWeight: 700, lineHeight: 1 }}>×</button>
        </div>

        {/* Corpo — 2 colonne */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Sinistra — Chat Yoda */}
          <div style={{ width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0' }}>

            {/* Progress bar */}
            {sviluppi.length > 0 && (
              <div style={{ padding: '10px 18px 0', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Completamento documento</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand-700)' }}>{progresso}%</span>
                </div>
                <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${progresso}%`, height: '100%', background: 'var(--brand-700)', borderRadius: 2, transition: 'width 0.4s' }} />
                </div>
              </div>
            )}

            {/* Messaggi */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 8 }}>
                  {m.role === 'assistant' && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-50)', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, overflow: 'hidden' }}>
                      <YodaIcon size={18} />
                    </div>
                  )}
                  <div style={{ maxWidth: '80%', padding: '9px 13px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role === 'user' ? 'var(--brand-800)' : '#f8fafc', color: m.role === 'user' ? '#fff' : '#0f172a', fontSize: 13, lineHeight: 1.6, border: m.role === 'assistant' ? '0.5px solid #e2e8f0' : 'none' }}>
                    {renderText(m.text)}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-50)', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    <YodaIcon size={18} />
                  </div>
                  <div style={{ padding: '9px 13px', borderRadius: '14px 14px 14px 4px', background: '#f8fafc', border: '0.5px solid #e2e8f0', display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#94a3b8', animation: `bounce 1.2s ease ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>

            {/* Input */}
            <div style={{ padding: '10px 16px 14px', borderTop: '0.5px solid #e2e8f0', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Rispondi a Yoda…" rows={1}
                  style={{ flex: 1, padding: '8px 11px', border: '1px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none', lineHeight: 1.5, maxHeight: 70, background: '#f8fafc', color: '#0f172a' }}
                  onFocus={e => e.target.style.borderColor = '#185FA5'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                <button onClick={handleSend} disabled={loading || !input.trim()}
                  style={{ width: 36, height: 36, borderRadius: 9, border: 'none', background: input.trim() ? 'var(--brand-800)' : '#e2e8f0', color: input.trim() ? '#fff' : '#94a3b8', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <IconSend />
                </button>
              </div>
            </div>
          </div>

          {/* Destra — Preview documento */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: '#fafbfc' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>

              {/* Header documento */}
              <div style={{ background: 'var(--brand-800)', borderRadius: 12, padding: '24px 28px', marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
                  {titoloDoc || <span style={{ opacity: 0.4 }}>Titolo proposta</span>}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                  {destinatario || <span style={{ opacity: 0.5 }}>Destinatario</span>}
                  {sistema ? ` · Modulo ${sistema}` : ''}
                  {' · '}{fmtDate(new Date())}
                </div>
              </div>

              {/* Sviluppi */}
              {sviluppi.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                  Il documento si costruirà qui man mano che rispondi a Yoda
                </div>
              ) : sviluppi.map((s, i) => (
                <div key={i} style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '20px 24px', marginBottom: 16, borderLeft: `3px solid var(--brand-${700 - i * 100 > 400 ? 700 - i * 100 : 500})` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--brand-800)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: s.titolo ? '#0f172a' : '#94a3b8', fontStyle: s.titolo ? 'normal' : 'italic' }}>
                      {s.titolo || 'Titolo intervento…'}
                    </span>
                  </div>
                  {s.titolo && (
                    <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginBottom: 12 }}>Sviluppo a cura di ZCS</div>
                  )}
                  {s.situazioneAttuale && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Situazione attuale</div>
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{s.situazioneAttuale}</div>
                    </div>
                  )}
                  {s.soluzioneProposta && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4 }}>Soluzione proposta</div>
                      <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{s.soluzioneProposta}</div>
                    </div>
                  )}
                  {s.oneri && s.titolo && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 11, color: '#64748b', background: '#f1f5f9', borderRadius: 20, padding: '3px 10px' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      Oneri economici: {s.oneri}
                    </div>
                  )}
                </div>
              ))}

              {/* Riepilogo tabella */}
              {sviluppi.some(s => s.titolo) && (
                <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginTop: 8 }}>
                  <div style={{ background: 'var(--brand-800)', padding: '12px 20px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Riepilogo degli Interventi</div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['N°', 'Intervento', 'Sviluppo', 'Oneri economici'].map(h => (
                          <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sviluppi.filter(s => s.titolo).map((s, i) => (
                        <tr key={i} style={{ borderBottom: '0.5px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 14px', color: '#64748b' }}>{i + 1}</td>
                          <td style={{ padding: '8px 14px', color: '#0f172a', fontWeight: 500 }}>{s.titolo}</td>
                          <td style={{ padding: '8px 14px', color: '#64748b' }}>ZCS</td>
                          <td style={{ padding: '8px 14px', color: '#64748b' }}>{s.oneri || 'ZCS'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
