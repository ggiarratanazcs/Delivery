import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { Avatar } from './Avatar.jsx';
import { BolleCommessa } from './KPIView.jsx';
import { getAvatarColor, getInitials, getAvatarUrl } from '../utils.js';
import { creaTaskStandard } from './ProgettiView.jsx';

// ── Selettore dropdown inline ─────────────────────────────────
function Sel({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()));
  const label = options.find(o => o.value === value)?.label || '';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? '#0d4d8a' : '#e2e8f0'}`, padding: '8px 2px', cursor: 'pointer', minHeight: 38 }}>
        <span style={{ fontSize: 13, color: label ? '#0f172a' : '#94a3b8', fontStyle: label ? 'normal' : 'italic' }}>{label || placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,18,41,0.14)', zIndex: 9999 }}>
          <div style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9' }}>
            <input value={search} onChange={e => { e.stopPropagation(); setSearch(e.target.value); }} onClick={e => e.stopPropagation()}
              placeholder="Cerca..." autoFocus
              style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 6, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nessun risultato</div>}
            {filtered.map((o, i) => (
              <div key={i} onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', background: o.value === value ? '#eff6ff' : '#fff', color: o.value === value ? '#001d47' : '#1e293b', fontWeight: o.value === value ? 500 : 400 }}
                onMouseOver={e => { if (o.value !== value) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseOut={e => { if (o.value !== value) e.currentTarget.style.background = '#fff'; }}>
                {o.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wizard Nuova Attività ─────────────────────────────────────
export function NuovaAttivitaWizard({ clients, onClose, onNuovaCommessa, onApriCommessa }) {
  const [step, setStep] = useState(1);        // 1=scelta, 2=seleziona commessa
  const [clienteId, setClienteId] = useState('');
  const [commessaId, setCommessaId] = useState('');
  const [soloAttive, setSoloAttive] = useState(true);

  const clienteOpts = clients
    .filter(c => soloAttive ? (c.commesse || []).some(co => co.attiva !== false) : true)
    .map(c => ({ value: c.id, label: c.nome_progetto }));
  const commesseOpts = clienteId
    ? (clients.find(c => c.id === clienteId)?.commesse || [])
        .filter(co => soloAttive ? co.attiva !== false : true)
        .map(co => ({ value: co.id, label: co.nome_commessa }))
    : [];

  const handleApriCommessa = () => {
    if (commessaId && clienteId) onApriCommessa(commessaId, clienteId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}
        style={{ position: 'relative', maxWidth: 480, width: '100%', borderRadius: 20, padding: 0 }}>

        {/* Header */}
        <div style={{ background: '#001d47', padding: '16px 20px 18px' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 16 }}>&#215;</button>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                {step === 1 ? 'Nuova attività' : '← Indietro'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>
                {step === 1 ? 'Cosa vuoi fare?' : 'Seleziona la commessa'}
              </div>
            </div>
            {step === 2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, border: `1px solid ${soloAttive ? '#9FE1CB' : 'rgba(255,255,255,0.2)'}`, background: soloAttive ? 'rgba(15,110,86,0.3)' : 'rgba(255,255,255,0.08)', cursor: 'pointer', marginRight: 36 }}
                onClick={() => { setSoloAttive(v => !v); setClienteId(''); setCommessaId(''); }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: soloAttive ? '#9FE1CB' : 'rgba(255,255,255,0.3)' }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: soloAttive ? '#9FE1CB' : 'rgba(255,255,255,0.5)' }}>Solo attive</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 1 — Scelta */}
        {step === 1 && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Opzione A — Nuova commessa */}
            <div onClick={onNuovaCommessa}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#185FA5'; e.currentTarget.style.background = '#f0f7ff'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E6F1FB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>
                  <line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Nuova commessa</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Crea una nuova commessa per un cliente esistente</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>

            {/* Opzione B — Commessa esistente */}
            <div onClick={() => setStep(2)}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 14, border: '1.5px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = '#0F6E56'; e.currentTarget.style.background = '#f0fdf8'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Commessa esistente</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Apri e modifica una commessa già presente</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
        )}

        {/* Step 2 — Seleziona commessa */}
        {step === 2 && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Cliente</div>
              <Sel options={clienteOpts} value={clienteId} onChange={v => { setClienteId(v); setCommessaId(''); }} placeholder="Seleziona cliente..." />
            </div>
            {clienteId && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Commessa</div>
                <Sel options={commesseOpts} value={commessaId} onChange={setCommessaId} placeholder="Seleziona commessa..." />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, paddingTop: 8, borderTop: '0.5px solid #f1f5f9', marginTop: 4 }}>
              <button onClick={() => { setStep(1); setClienteId(''); setCommessaId(''); }}
                style={{ padding: '8px 16px', borderRadius: 10, border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>Indietro</button>
              <button onClick={handleApriCommessa} disabled={!commessaId}
                style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: commessaId ? '#001d47' : '#e2e8f0', color: commessaId ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 500, cursor: commessaId ? 'pointer' : 'default' }}>
                Apri commessa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Popup scheda commessa ─────────────────────────────────────
export function CommessaPopup({ commessaId, clients, staff, assignments, currentMonths, onOpenProgetto, onClose }) {
  const [commessaTab, setCommessaTab] = useState('pianificazione');
  const [progettoInfo, setProgettoInfo] = useState(null);

  const co = clients.flatMap(c => (c.commesse || []).map(co2 => ({ ...co2, clientName: c.nome_progetto }))).find(co2 => co2.id === commessaId);

  useEffect(() => {
    if (!commessaId) return;
    supabase.from('progetti').select('id').eq('commessa_id', commessaId).single()
      .then(({ data }) => setProgettoInfo(data ? { id: data.id, exists: true } : { id: null, exists: false }));
  }, [commessaId]);

  if (!co) return null;

  const TabBar = ({ tabs, active, onChange }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', padding: '0 24px', gap: 0 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          style={{ padding: '12px 16px', border: 'none', borderBottom: active === t.key ? '2px solid #0054a6' : '2px solid transparent', background: 'transparent', color: active === t.key ? '#0054a6' : '#64748b', fontSize: 12, fontWeight: active === t.key ? 600 : 400, cursor: 'pointer' }}>
          {t.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}
        style={{ position: 'relative', maxWidth: 720, width: '100%', borderRadius: 20, padding: 0, overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header navy */}
        <div style={{ background: '#001d47', padding: '14px 20px 16px', flexShrink: 0 }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 16 }}>&#215;</button>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{co.clientName}</div>
          <div style={{ fontSize: 16, fontWeight: 500, color: '#fff' }}>{co.nome_commessa}</div>
          <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
            {co.pm_commessa && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>PM: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{co.pm_commessa}</strong></span>}
            {co.data_inizio && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Dal: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{co.data_inizio}</strong></span>}
            {co.data_fine && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Al: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{co.data_fine}</strong></span>}
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Risorse: <strong style={{ color: 'rgba(255,255,255,0.85)' }}>{co.team?.length || 0}</strong></span>
          </div>
        </div>

        {/* Bottoni azione */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 20px', display: 'flex', gap: 8, flexShrink: 0 }}>
          {progettoInfo?.exists && (
            <button onClick={() => onOpenProgetto && onOpenProgetto(progettoInfo.id, co.id)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              Apri progetto
            </button>
          )}
          {progettoInfo && !progettoInfo.exists && (
            <button onClick={async () => {
              const { data, error } = await supabase.from('progetti').insert({ commessa_id: co.id }).select().single();
              if (!error && data) { await creaTaskStandard(data.id); setProgettoInfo({ id: data.id, exists: true }); }
            }} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #C0DD97', background: '#f0fdf4', color: '#27500a', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              Genera progetto
            </button>
          )}
        </div>

        {/* Tab */}
        <TabBar tabs={[{ key: 'team', label: 'Team' }, { key: 'pianificazione', label: 'Pianificazione mensile' }, { key: 'bolle', label: 'Bolle & Consuntivi' }]} active={commessaTab} onChange={setCommessaTab} />

        {/* Corpo scrollabile */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {commessaTab === 'team' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {(co.team || []).length === 0 && <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>Nessuna risorsa assegnata</div>}
              {(co.team || []).map(s => {
                const ac = getAvatarColor(s);
                return (
                  <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '8px 14px' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{getInitials(s)}</div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{s}</span>
                  </div>
                );
              })}
            </div>
          )}

          {commessaTab === 'pianificazione' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, minWidth: '100%' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minWidth: 140, position: 'sticky', left: 0 }}>Risorsa</th>
                  {currentMonths.map(m => <th key={m.label} style={{ textAlign: 'center', padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minWidth: 60, fontSize: 11, fontWeight: 600, color: '#0054a6', textTransform: 'uppercase' }}>{m.label}</th>)}
                </tr></thead>
                <tbody>
                  <tr style={{ background: '#f0f7ff' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0054a6', borderBottom: '1px solid #e2e8f0', position: 'sticky', left: 0, background: '#f0f7ff', fontSize: 11, textTransform: 'uppercase' }}>Totale</td>
                    {currentMonths.map(m => { const tot = (co.team || []).reduce((s, mem) => s + (parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0), 0); return <td key={m.label} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#0054a6' }}>{tot > 0 ? tot : ''}</td>; })}
                  </tr>
                  {(co.team || []).map(mem => (
                    <tr key={mem}>
                      <td style={{ padding: '8px 12px', color: '#374151', borderBottom: '1px solid #f1f5f9', position: 'sticky', left: 0, background: '#fff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={mem} size={22} />
                          {mem}
                        </div>
                      </td>
                      {currentMonths.map(m => { const v = parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0; return <td key={m.label} style={{ textAlign: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>{v > 0 && <span style={{ display: 'inline-block', background: '#eff6ff', color: '#0054a6', borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 11 }}>{v}</span>}</td>; })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {commessaTab === 'bolle' && <BolleCommessa commessaId={commessaId} />}
        </div>
      </div>
    </div>
  );
}