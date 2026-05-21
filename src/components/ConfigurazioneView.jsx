import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase.js';
import { ManageStaffModal } from './StaffModals.jsx';
import { ManageClientsModal } from './ClientModals.jsx';
import { GestioneDatiModal } from './GestioneDati.jsx';

// ─────────────────────────────────────────────
// COSTANTI PRODOTTI
// ─────────────────────────────────────────────
const PRODOTTI = ['Teseo7', 'Cassiopea'];

const AREE_DEFAULT = {
  Teseo7: [
    'BASE','AMMINISTRAZIONE','LOGISTICA','AGGIUNTIVI','PRODUZIONE','CED',
    'PASSAGGIO / UPGRADE','RETAIL','CONTROLLO DI GESTIONE','PROGRAMMI ACCESSORI','INFOBUSINESS'
  ],
  Cassiopea: [
    'CRM SEGRETERIA','SFA AGENTI','BPM PRATICHE','RFID',
    'APP CRM','APP WMS','SMART RECEPTION','VERTICALI'
  ],
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function FieldText({ label, value, onChange, placeholder, mono, small }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => { setLocal(value || ''); }, [value]);
  const s = {
    width: '100%', padding: small ? '5px 8px' : '8px 10px',
    borderRadius: 6, border: '1.5px solid #e2e8f0',
    fontSize: small ? 12 : 13, color: '#0f172a', outline: 'none',
    background: '#f8fafc', fontFamily: mono ? 'IBM Plex Mono, monospace' : 'inherit',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      <input value={local} onChange={e => setLocal(e.target.value)} onBlur={e => onChange(e.target.value)}
        placeholder={placeholder || ''} style={s}
        onFocus={e => e.target.style.borderColor = '#2563eb'}
      />
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', small, disabled }) {
  const base = { display: 'flex', alignItems: 'center', gap: 6, padding: small ? '5px 12px' : '8px 16px', borderRadius: 8, fontSize: small ? 12 : 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit', border: 'none', transition: 'all 0.15s', opacity: disabled ? 0.5 : 1 };
  const variants = {
    primary:   { background: '#001d47', color: '#fff' },
    secondary: { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
    danger:    { background: '#fee2e2', color: '#dc2626' },
    success:   { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

// ─────────────────────────────────────────────
// TAB LISTINO PRODOTTI — con fasce utenti
// ─────────────────────────────────────────────

// Pannello fasce per un singolo modulo
function FascePanel({ modulo, onClose }) {
  const [fasce, setFasce] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuova, setNuova] = useState({ utenti_max: '', gg: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editVals, setEditVals] = useState({});

  const loadFasce = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('listino_fasce')
      .select('*')
      .eq('listino_modulo_id', modulo.id)
      .order('utenti_max');
    setFasce(data || []);
    setLoading(false);
  };

  useEffect(() => { loadFasce(); }, [modulo.id]);

  const handleAdd = async () => {
    if (!nuova.utenti_max || !nuova.gg) return;
    setSaving(true);
    await supabase.from('listino_fasce').insert({
      listino_modulo_id: modulo.id,
      utenti_max: parseInt(nuova.utenti_max),
      gg: parseFloat(nuova.gg),
    });
    setNuova({ utenti_max: '', gg: '' });
    setSaving(false);
    await loadFasce();
  };

  const handleDelete = async (id) => {
    await supabase.from('listino_fasce').delete().eq('id', id);
    await loadFasce();
  };

  const handleSaveEdit = async (id) => {
    await supabase.from('listino_fasce').update({
      utenti_max: parseInt(editVals.utenti_max),
      gg: parseFloat(editVals.gg),
    }).eq('id', id);
    setEditId(null);
    await loadFasce();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,18,41,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: 480, maxWidth: '95vw', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: '#001d47', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 2 }}>{modulo.codice}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{modulo.nome}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Fasce utenti — giornate da listino</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Info */}
        <div style={{ padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
          Per ogni fascia definisci il numero <strong>massimo di utenti</strong> e le giornate corrispondenti.<br/>
          La scheda demo sceglierà automaticamente la fascia più vicina al numero di utenti del cliente.
        </div>

        {/* Tabella fasce */}
        <div style={{ padding: '16px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 }}>Caricamento…</div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utenti max</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giornate</th>
                    <th style={{ width: 70 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {fasce.length === 0 && (
                    <tr><td colSpan={3} style={{ padding: '16px 12px', textAlign: 'center', color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                      Nessuna fascia. Il modulo usa {modulo.gg_default} gg fissi per tutti gli utenti.
                    </td></tr>
                  )}
                  {fasce.map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {editId === f.id ? (
                        <>
                          <td style={{ padding: '6px 10px' }}>
                            <input type="number" value={editVals.utenti_max}
                              onChange={e => setEditVals(p => ({ ...p, utenti_max: e.target.value }))}
                              style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #2563eb', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }} />
                          </td>
                          <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                            <input type="number" step="0.5" value={editVals.gg}
                              onChange={e => setEditVals(p => ({ ...p, gg: e.target.value }))}
                              style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #2563eb', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none' }} />
                          </td>
                          <td style={{ padding: '6px 10px' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button onClick={() => handleSaveEdit(f.id)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: '#001d47', color: '#fff', fontSize: 11, cursor: 'pointer' }}>✓</button>
                              <button onClick={() => setEditId(null)} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>×</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#001d47' }}>{String(f.utenti_max).padStart(3, '0')}</span>
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>utenti</span>
                              {i === 0 && <span style={{ fontSize: 10, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 20, padding: '1px 6px' }}>≤ {f.utenti_max}</span>}
                              {i > 0 && <span style={{ fontSize: 10, color: '#94a3b8' }}>{fasce[i-1].utenti_max + 1}–{f.utenti_max}</span>}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: '#2563eb' }}>
                            {f.gg} gg
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                              <button onClick={() => { setEditId(f.id); setEditVals({ utenti_max: f.utenti_max, gg: f.gg }); }}
                                style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>✎</button>
                              <button onClick={() => handleDelete(f.id)}
                                style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>×</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Aggiungi fascia */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', padding: '10px 0 0', borderTop: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Utenti max</label>
                  <input type="number" value={nuova.utenti_max} onChange={e => setNuova(p => ({ ...p, utenti_max: e.target.value }))}
                    placeholder="es. 010"
                    style={{ width: 90, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giornate</label>
                  <input type="number" step="0.5" value={nuova.gg} onChange={e => setNuova(p => ({ ...p, gg: e.target.value }))}
                    placeholder="es. 1"
                    style={{ width: 80, padding: '7px 10px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }}
                    onFocus={e => e.target.style.borderColor = '#2563eb'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <button onClick={handleAdd} disabled={saving || !nuova.utenti_max || !nuova.gg}
                  style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: (!nuova.utenti_max || !nuova.gg) ? '#e2e8f0' : '#001d47', color: (!nuova.utenti_max || !nuova.gg) ? '#94a3b8' : '#fff', fontSize: 13, fontWeight: 600, cursor: (!nuova.utenti_max || !nuova.gg) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  + Aggiungi
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ListinoTab({ staff, clients }) {
  const [prodotto, setProdotto] = useState('Teseo7');
  const [moduli, setModuli] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [areaAttiva, setAreaAttiva] = useState(null);
  const [showNuovoModulo, setShowNuovoModulo] = useState(false);
  const [showNuovaArea, setShowNuovaArea] = useState(false);
  const [nuovaArea, setNuovaArea] = useState('');
  const [nuovoModulo, setNuovoModulo] = useState({ codice: '', nome: '', gg: 0.5 });
  const [editingId, setEditingId] = useState(null);
  const [editVals, setEditVals] = useState({});
  const [fasceModulo, setFasceModulo] = useState(null); // modulo di cui mostrare le fasce

  const loadModuli = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('listino_moduli')
      .select('*')
      .eq('prodotto', prodotto)
      .order('area').order('ordine');
    setModuli(data || []);
    setLoading(false);
  }, [prodotto]);

  useEffect(() => { loadModuli(); }, [loadModuli]);

  useEffect(() => {
    const aree = [...new Set((moduli).map(m => m.area))];
    setAreaAttiva(aree[0] || null);
  }, [prodotto, moduli.length]);

  const aree = [...new Set(moduli.map(m => m.area))];
  const moduliArea = moduli.filter(m => m.area === areaAttiva);

  const handleDeleteModulo = async (id) => {
    if (!window.confirm('Eliminare questo modulo?')) return;
    await supabase.from('listino_moduli').delete().eq('id', id);
    await loadModuli();
  };

  const handleDeleteArea = async (area) => {
    const count = moduli.filter(m => m.area === area).length;
    if (!window.confirm(`Eliminare l'area "${area}" e tutti i suoi ${count} moduli?`)) return;
    await supabase.from('listino_moduli').delete().eq('prodotto', prodotto).eq('area', area);
    setAreaAttiva(null);
    await loadModuli();
  };

  const handleAddArea = async () => {
    if (!nuovaArea.trim()) return;
    setSaving(true);
    await supabase.from('listino_moduli').insert({
      prodotto, area: nuovaArea.trim(),
      codice: '', nome: 'Nuovo modulo', gg_default: 0.5, ordine: 0, prereq: []
    });
    setNuovaArea('');
    setShowNuovaArea(false);
    setSaving(false);
    await loadModuli();
    setAreaAttiva(nuovaArea.trim());
  };

  const handleAddModulo = async () => {
    if (!nuovoModulo.codice.trim() || !nuovoModulo.nome.trim() || !areaAttiva) return;
    setSaving(true);
    const ordine = moduliArea.length;
    await supabase.from('listino_moduli').insert({
      prodotto, area: areaAttiva,
      codice: nuovoModulo.codice.trim(),
      nome: nuovoModulo.nome.trim(),
      gg_default: parseFloat(nuovoModulo.gg) || 0.5,
      ordine, prereq: []
    });
    setNuovoModulo({ codice: '', nome: '', gg: 0.5 });
    setShowNuovoModulo(false);
    setSaving(false);
    await loadModuli();
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditVals({ codice: m.codice, nome: m.nome, gg_default: m.gg_default });
  };

  const saveEdit = async (id) => {
    await supabase.from('listino_moduli').update({
      codice: editVals.codice,
      nome: editVals.nome,
      gg_default: parseFloat(editVals.gg_default) || 0.5,
    }).eq('id', id);
    setEditingId(null);
    await loadModuli();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Selezione prodotto */}
      <div style={{ display: 'flex', gap: 8 }}>
        {PRODOTTI.map(p => (
          <button key={p} onClick={() => setProdotto(p)}
            style={{ padding: '8px 24px', borderRadius: 8, border: `2px solid ${prodotto === p ? '#001d47' : '#e2e8f0'}`, background: prodotto === p ? '#001d47' : '#fff', color: prodotto === p ? '#fff' : '#374151', fontSize: 14, fontWeight: prodotto === p ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>Caricamento moduli…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', flex: 1, minHeight: 0 }}>

          {/* SIDEBAR AREE */}
          <div style={{ borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aree</span>
              <button onClick={() => setShowNuovaArea(true)}
                style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>+</button>
            </div>

            {showNuovaArea && (
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 6 }}>
                <input value={nuovaArea} onChange={e => setNuovaArea(e.target.value)}
                  placeholder="Nome area…" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddArea(); if (e.key === 'Escape') setShowNuovaArea(false); }}
                  style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1.5px solid #2563eb', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={handleAddArea} disabled={saving} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#001d47', color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✓</button>
                <button onClick={() => setShowNuovaArea(false)} style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>×</button>
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {aree.length === 0 && (
                <div style={{ padding: '16px 12px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                  Nessuna area.<br/>Clicca + per aggiungere.
                </div>
              )}
              {aree.map(area => {
                const cnt = moduli.filter(m => m.area === area).length;
                const sel = area === areaAttiva;
                return (
                  <div key={area} onClick={() => setAreaAttiva(area)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', background: sel ? '#eff6ff' : 'transparent', borderRight: sel ? '3px solid #2563eb' : '3px solid transparent', transition: 'all 0.12s' }}
                    onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseOut={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ fontSize: 11, fontWeight: sel ? 700 : 500, color: sel ? '#001d47' : '#374151', flex: 1, lineHeight: 1.2 }}>{area}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{cnt}</span>
                    <button onClick={e => { e.stopPropagation(); handleDeleteArea(area); }}
                      style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 13, cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0 }}
                      onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                      onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}>×</button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* LISTA MODULI */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!areaAttiva ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                Seleziona o crea un'area
              </div>
            ) : (
              <>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#001d47', letterSpacing: '0.04em' }}>{areaAttiva}</span>
                  <Btn small onClick={() => setShowNuovoModulo(true)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Aggiungi modulo
                  </Btn>
                </div>

                {showNuovoModulo && (
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', background: '#eff6ff', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <div style={{ flex: '0 0 130px' }}>
                      <FieldText small label="Codice *" value={nuovoModulo.codice} onChange={v => setNuovoModulo(p => ({ ...p, codice: v }))} placeholder="es. T7X-BASG" mono />
                    </div>
                    <div style={{ flex: 1 }}>
                      <FieldText small label="Nome *" value={nuovoModulo.nome} onChange={v => setNuovoModulo(p => ({ ...p, nome: v }))} placeholder="es. Modulo Base" />
                    </div>
                    <div style={{ flex: '0 0 70px' }}>
                      <FieldText small label="GG default" value={String(nuovoModulo.gg)} onChange={v => setNuovoModulo(p => ({ ...p, gg: v }))} placeholder="0.5" mono />
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn small onClick={handleAddModulo} disabled={saving || !nuovoModulo.codice.trim() || !nuovoModulo.nome.trim()}>Salva</Btn>
                      <Btn small variant="secondary" onClick={() => setShowNuovoModulo(false)}>Annulla</Btn>
                    </div>
                  </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {moduliArea.length === 0 && (
                    <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                      Nessun modulo in questa area. Clicca "Aggiungi modulo".
                    </div>
                  )}
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em', width: 120 }}>Codice</th>
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em' }}>Nome</th>
                        <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em', width: 70 }}>GG def.</th>
                        <th style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.05em', width: 70 }}>Fasce</th>
                        <th style={{ width: 70 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {moduliArea.map(m => (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          {editingId === m.id ? (
                            <>
                              <td style={{ padding: '6px 10px' }}>
                                <input value={editVals.codice} onChange={e => setEditVals(p => ({ ...p, codice: e.target.value }))}
                                  style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1.5px solid #2563eb', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', outline: 'none' }} />
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <input value={editVals.nome} onChange={e => setEditVals(p => ({ ...p, nome: e.target.value }))}
                                  style={{ width: '100%', padding: '4px 8px', borderRadius: 6, border: '1.5px solid #2563eb', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
                              </td>
                              <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                <input type="number" step="0.5" min="0" value={editVals.gg_default} onChange={e => setEditVals(p => ({ ...p, gg_default: e.target.value }))}
                                  style={{ width: 55, padding: '4px 6px', borderRadius: 6, border: '1.5px solid #2563eb', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'right', outline: 'none' }} />
                              </td>
                              <td></td>
                              <td style={{ padding: '6px 10px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                  <button onClick={() => saveEdit(m.id)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: '#001d47', color: '#fff', fontSize: 11, cursor: 'pointer' }}>✓</button>
                                  <button onClick={() => setEditingId(null)} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>×</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', color: '#001d47', fontWeight: 600 }}>{m.codice}</td>
                              <td style={{ padding: '10px 14px', color: '#374151' }}>{m.nome}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontFamily: 'IBM Plex Mono, monospace' }}>{m.gg_default}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <button onClick={() => setFasceModulo(m)}
                                  style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                                  Fasce
                                </button>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                  <button onClick={() => startEdit(m)} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>✎</button>
                                  <button onClick={() => handleDeleteModulo(m.id)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>×</button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Pannello fasce */}
      {fasceModulo && <FascePanel modulo={fasceModulo} onClose={() => setFasceModulo(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB RISORSE — wrapper ManageStaffModal inline
// ─────────────────────────────────────────────
function RisorseTab({ staff, onReload }) {
  return (
    <div>
      <ManageStaffModal staff={staff} isAdmin={true} onClose={onReload} inline />
    </div>
  );
}

// ─────────────────────────────────────────────
// CONFIGURAZIONE VIEW — vista principale
// ─────────────────────────────────────────────
export function ConfigurazioneView({ staff, clients, onBack, onReload }) {
  const [tab, setTab] = useState('listino');
  const [showManageStaff, setShowManageStaff] = useState(false);
  const [showManageClients, setShowManageClients] = useState(false);
  const [showGestioneDati, setShowGestioneDati] = useState(false);

  const TABS = [
    { key: 'listino',  label: 'Listino Prodotti', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { key: 'risorse',  label: 'Risorse',           icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
    { key: 'clienti',  label: 'Clienti',            icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg> },
    { key: 'dati',     label: 'Dati',              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> },
  ];

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 32px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 20, paddingBottom: 0 }}>
          <button onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Home
          </button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#001d47' }}>Configurazione</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Gestione centralizzata del portale</div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', border: 'none', borderBottom: tab === t.key ? '2.5px solid #001d47' : '2.5px solid transparent', background: 'transparent', color: tab === t.key ? '#001d47' : '#64748b', fontWeight: tab === t.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: -1 }}>
              <span style={{ opacity: tab === t.key ? 1 : 0.5 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenuto tab */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>

        {/* LISTINO PRODOTTI */}
        {tab === 'listino' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Listino Prodotti</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>
                Configura i moduli disponibili per ogni prodotto. Le modifiche si riflettono immediatamente sulla Scheda Demo.
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 500 }}>
              <ListinoTab staff={staff} clients={clients} />
            </div>
          </div>
        )}

        {/* RISORSE */}
        {tab === 'risorse' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Gestione Risorse</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Aggiungi, modifica o rimuovi i collaboratori del team.</div>
              </div>
              <Btn onClick={() => setShowManageStaff(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                Gestisci risorse
              </Btn>
            </div>
            {/* Preview staff */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruolo</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 16px', fontWeight: 500, color: '#0f172a' }}>{s.cognome} {s.nome}</td>
                      <td style={{ padding: '10px 16px', color: '#64748b' }}>{s.ruolo || '—'}</td>
                      <td style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>{s.email}</td>
                      <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                        {s.is_admin ? <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>Admin</span> : <span style={{ color: '#e2e8f0', fontSize: 18 }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CLIENTI */}
        {tab === 'clienti' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Gestione Clienti</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Aggiungi, modifica o archivia i clienti e le loro commesse.</div>
              </div>
              <Btn onClick={() => setShowManageClients(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>
                Gestisci clienti
              </Btn>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commesse attive</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PM</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(c => {
                    const attive = (c.commesse || []).filter(co => co.attiva !== false).length;
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 16px', fontWeight: 500, color: '#0f172a' }}>{c.nome_progetto}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: attive > 0 ? '#2563eb' : '#94a3b8', fontWeight: attive > 0 ? 700 : 400 }}>{attive}</td>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>{c.pm_name || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DATI */}
        {tab === 'dati' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Gestione Dati</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Import bolle, consuntivi e clienti da file Excel. Ricerca bolle.</div>
              </div>
              <Btn onClick={() => setShowGestioneDati(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
                Apri gestione dati
              </Btn>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { title: 'Import Bolle', desc: 'Carica bolle di lavoro da Excel con codice, descrizione, ore previste e cliente.', icon: '📋' },
                { title: 'Import Consuntivi', desc: 'Carica ore consuntivate da Excel nella tabella consuntivi_globali.', icon: '📊' },
                { title: 'Import Clienti', desc: "Aggiorna l'anagrafica clienti in blocco da file Excel.", icon: '🏢' },
              ].map(card => (
                <div key={card.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: 24 }}>{card.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{card.title}</div>
                  <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{card.desc}</div>
                  <button onClick={() => setShowGestioneDati(true)}
                    style={{ marginTop: 'auto', padding: '7px 0', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Apri →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modali */}
      {showManageStaff && (
        <ManageStaffModal staff={staff} isAdmin={true} onClose={() => { setShowManageStaff(false); onReload && onReload(); }} />
      )}
      {showManageClients && (
        <ManageClientsModal clients={clients} staff={staff} onClose={() => { setShowManageClients(false); onReload && onReload(); }} />
      )}
      {showGestioneDati && (
        <div className="modal-overlay" onClick={() => setShowGestioneDati(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()} style={{ position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="btn-close-circle" onClick={() => setShowGestioneDati(false)}>×</button>
            <div className="modal-header"><h3>Gestione Dati</h3></div>
            <GestioneDatiModal clients={clients} staff={staff} onClose={() => setShowGestioneDati(false)} />
          </div>
        </div>
      )}
    </div>
  );
}