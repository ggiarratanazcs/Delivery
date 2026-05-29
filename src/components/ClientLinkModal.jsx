import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const SEZIONI = [
  { key: 'home',      label: 'Home progetto',     desc: 'KPI, attività, ordini, bolle' },
  { key: 'dettaglio', label: 'Dettaglio Attività', desc: 'Tabella task per modulo' },
  { key: 'gantt',     label: 'Gantt',              desc: 'Timeline attività' },
  { key: 'avanzamento', label: 'Avanzamento',      desc: 'Piano settimanale per owner' },
  { key: 'mappe',     label: 'Mappe',              desc: 'Mappe concettuali del progetto' },
];

export function ClienteLinkModal({ progettoId, commessa, onClose }) {
  const [sezioni, setSezioni] = useState(['home', 'dettaglio', 'gantt']);
  const [giorniScadenza, setGiorniScadenza] = useState(90);
  const [link, setLink] = useState(null);
  const [linkEsistente, setLinkEsistente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('progetto_link_cliente')
        .select('*').eq('progetto_id', progettoId).eq('attivo', true).single();
      if (data) { setLinkEsistente(data); setSezioni(data.sezioni); setLink(buildUrl(data.token)); }
      setLoading(false);
    };
    load();
  }, [progettoId]);

  const buildUrl = (token) => `${window.location.origin}/?token=${token}`;

  const toggleSezione = (key) => {
    setSezioni(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key]);
  };

  const genera = async () => {
    if (sezioni.length === 0) return;
    setSaving(true);
    const scadenza = new Date();
    scadenza.setDate(scadenza.getDate() + giorniScadenza);

    if (linkEsistente) {
      await supabase.from('progetto_link_cliente').update({
        sezioni, scadenza: scadenza.toISOString().slice(0, 10),
      }).eq('id', linkEsistente.id);
      setLink(buildUrl(linkEsistente.token));
    } else {
      const { data } = await supabase.from('progetto_link_cliente').insert({
        progetto_id: progettoId, sezioni,
        scadenza: scadenza.toISOString().slice(0, 10),
      }).select().single();
      if (data) { setLinkEsistente(data); setLink(buildUrl(data.token)); }
    }
    setSaving(false);
  };

  const revoca = async () => {
    if (!window.confirm('Revocare il link? Il cliente non potrà più accedere.')) return;
    await supabase.from('progetto_link_cliente').update({ attivo: false }).eq('id', linkEsistente.id);
    setLinkEsistente(null); setLink(null);
  };

  const copia = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,18,41,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 64px rgba(0,18,41,0.18)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'var(--brand-800)', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
              {commessa?.clientName} · {commessa?.nome_commessa}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Apri al cliente</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Caricamento…</div>
        ) : (
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Sezioni */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Sezioni visibili</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {SEZIONI.map(s => {
                  const on = sezioni.includes(s.key);
                  return (
                    <label key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${on ? 'var(--brand-800)' : '#e2e8f0'}`, background: on ? '#f0f4ff' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={on} onChange={() => toggleSezione(s.key)} style={{ width: 16, height: 16, accentColor: 'var(--brand-800)', cursor: 'pointer' }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: on ? 700 : 400, color: on ? 'var(--brand-800)' : '#374151' }}>{s.label}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{s.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Scadenza */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Scadenza link</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[30, 60, 90, 180].map(g => (
                  <button key={g} onClick={() => setGiorniScadenza(g)}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${giorniScadenza === g ? 'var(--brand-800)' : '#e2e8f0'}`, background: giorniScadenza === g ? 'var(--brand-800)' : '#fff', color: giorniScadenza === g ? '#fff' : '#64748b', fontSize: 12, fontWeight: giorniScadenza === g ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {g}gg
                  </button>
                ))}
              </div>
              {linkEsistente?.scadenza && (
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Scadenza attuale: {fmtDate(linkEsistente.scadenza)}</div>
              )}
            </div>

            {/* Link generato */}
            {link && (
              <div style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', padding: '12px 14px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Link cliente</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1, fontSize: 11, color: '#374151', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 7, padding: '7px 10px' }}>
                    {link}
                  </div>
                  <button onClick={copia}
                    style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: copied ? '#16a34a' : 'var(--brand-800)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'background 0.2s' }}>
                    {copied ? '✓ Copiato' : 'Copia'}
                  </button>
                  <button onClick={() => window.open(link, '_blank')} title="Apri in nuova tab"
                    style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Bottoni azione */}
            <div style={{ display: 'flex', gap: 8 }}>
              {linkEsistente && (
                <button onClick={revoca} style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Revoca link
                </button>
              )}
              <button onClick={genera} disabled={saving || sezioni.length === 0}
                style={{ flex: 1, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving || sezioni.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: sezioni.length === 0 ? 0.5 : 1 }}>
                {saving ? 'Generazione…' : linkEsistente ? 'Aggiorna link' : 'Genera link'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}