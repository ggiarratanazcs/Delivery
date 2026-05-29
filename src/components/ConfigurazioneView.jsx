import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabase.js';
import { useState as useStateN, useEffect as useEffectN } from 'react';
import { ManageStaffModal } from './StaffModals.jsx';
import { ManageClientsModal, EditClientModal, ClientModal } from './ClientModals.jsx';
import { GestioneDatiModal, TabClienti, TabBolle, TabConsuntivi } from './GestioneDati.jsx';
import { RUOLO_COLORS } from '../constants.js';

const RUOLI_CON_TEAM = ['Programmatore', 'Analista'];

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
    primary:   { background: 'var(--brand-800)', color: '#fff' },
    secondary: { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' },
    danger:    { background: '#fee2e2', color: '#dc2626' },
    success:   { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant] }}>{children}</button>;
}

// ─────────────────────────────────────────────
// Form creazione nuovo workflow (standalone, senza import da TodoView)
function NuovoWfForm({ onSave, onCancel }) {
  const [nome, setNome] = React.useState('');
  return (
    <>
      <div className="form-group">
        <label>Nome workflow</label>
        <input placeholder="es. Delivery, Sviluppo..." value={nome} onChange={e => setNome(e.target.value)} autoFocus />
      </div>
      <div className="modal-actions">
        <button className="btn-cancel" onClick={onCancel}>Annulla</button>
        <button className="btn-save" onClick={() => nome.trim() && onSave(nome.trim())}>Salva</button>
      </div>
    </>
  );
}

// RUOLI CONFIG
function RuoliConfig() {
  const [items, setItems] = useState([]);
  const [newNome, setNewNome] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('config_ruoli').select('*').order('ordine');
    setItems(data || []);
  };
  const add = async () => {
    if (!newNome.trim() || saving) return;
    setSaving(true);
    await supabase.from('config_ruoli').insert({ nome: newNome.trim(), ordine: items.length });
    setNewNome(''); await load(); setSaving(false);
  };
  const del = async (id) => {
    if (!window.confirm('Eliminare questo ruolo?')) return;
    await supabase.from('config_ruoli').delete().eq('id', id); await load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Ruoli</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Ruoli disponibili per le risorse. I ruoli "Analista" e "Programmatore" abilitano il campo Team sviluppo.</div>
      </div>
      {/* Form aggiungi */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <input placeholder="Nome ruolo..." value={newNome} onChange={e => setNewNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          style={{ flex: 1, padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        <button onClick={add} disabled={saving || !newNome.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '1px solid #bfdbfe', background: newNome.trim() ? '#eff6ff' : '#f8fafc', color: newNome.trim() ? '#0054a6' : '#94a3b8', fontSize: 13, fontWeight: 500, cursor: newNome.trim() ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Aggiungi
        </button>
      </div>
      {/* Lista */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Nessun ruolo configurato</div>
        ) : items.map((r, i) => {
          const rc = (RUOLO_COLORS && RUOLO_COLORS[r.nome]) || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
          const hasTeam = RUOLI_CON_TEAM.includes(r.nome);
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < items.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: 12, padding: '3px 12px', borderRadius: 20, background: rc.bg, color: rc.text, border: `0.5px solid ${rc.border}`, fontWeight: 600 }}>{r.nome}</span>
              {hasTeam && (
                <span style={{ fontSize: 11, color: '#7c3aed', background: '#fdf4ff', border: '0.5px solid #e9d5ff', borderRadius: 20, padding: '2px 9px' }}>con team</span>
              )}
              <span style={{ flex: 1 }} />
              <button onClick={() => del(r.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: '4px', borderRadius: 6, transition: 'all 0.15s' }}
                onMouseOver={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; }}
                onMouseOut={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'transparent'; }}>
                <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// TEAM CONFIG
function TeamConfig() {
  const [items, setItems] = useState([]);
  const [newNome, setNewNome] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  const load = async () => {
    const { data } = await supabase.from('config_team_prodotto').select('*').order('ordine');
    setItems(data || []);
  };
  const add = async () => {
    if (!newNome.trim() || saving) return;
    setSaving(true);
    await supabase.from('config_team_prodotto').insert({ nome: newNome.trim(), ordine: items.length });
    setNewNome(''); await load(); setSaving(false);
  };
  const del = async (id) => {
    if (!window.confirm('Eliminare questo team?')) return;
    await supabase.from('config_team_prodotto').delete().eq('id', id); await load();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Team sviluppo</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Team di prodotto assegnabili alle risorse con ruolo Analista o Programmatore.</div>
      </div>
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <input placeholder="Nome team..." value={newNome} onChange={e => setNewNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
          style={{ flex: 1, padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        <button onClick={add} disabled={saving || !newNome.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 8, border: '1px solid #bfdbfe', background: newNome.trim() ? '#eff6ff' : '#f8fafc', color: newNome.trim() ? '#0054a6' : '#94a3b8', fontSize: 13, fontWeight: 500, cursor: newNome.trim() ? 'pointer' : 'default', fontFamily: 'inherit', transition: 'all 0.15s' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Aggiungi
        </button>
      </div>
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        {items.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Nessun team configurato</div>
        ) : items.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < items.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', flex: 1 }}>{t.nome}</span>
            <button onClick={() => del(t.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: '4px', borderRadius: 6, transition: 'all 0.15s' }}
              onMouseOver={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; }}
              onMouseOut={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'transparent'; }}>
              <i className="ti ti-trash" style={{ fontSize: 15 }} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── STRUTTURA PERMESSI ────────────────────────────────────────────
const PERMESSI_STRUTTURA = [
  {
    key: 'pianificazione', label: 'Pianificazione',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    sub: [
      { key: 'clienti', label: 'Vista Clienti' },
      { key: 'risorse', label: 'Vista Risorse' },
      { key: 'gantt', label: 'Gantt' },
    ]
  },
  {
    key: 'progetti', label: 'Progetti',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
    sub: []
  },
  {
    key: 'skills', label: 'Skills',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    sub: [
      { key: 'matrice', label: 'Matrice' },
      { key: 'storico', label: 'Storico' },
      { key: 'formazione', label: 'Formazione' },
    ]
  },
  {
    key: 'workflow', label: 'WorkFlow',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 17.5m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0"/></svg>,
    sub: []
  },
  {
    key: 'novita', label: 'Novità di Prodotto',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    sub: []
  },
  {
    key: 'delivery', label: 'Delivery Room',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="16 3 12 7 8 3"/></svg>,
    sub: []
  },
];

// Helpers
const defaultPermessi = () => Object.fromEntries(
  PERMESSI_STRUTTURA.map(s => [s.key, { visible: true, sub: Object.fromEntries(s.sub.map(ss => [ss.key, true])) }])
);
const mergePermessi = (saved) => {
  const def = defaultPermessi();
  if (!saved) return def;
  return Object.fromEntries(PERMESSI_STRUTTURA.map(s => {
    const cur = saved[s.key] || { visible: true, sub: {} };
    return [s.key, {
      visible: cur.visible !== false,
      sub: Object.fromEntries(s.sub.map(ss => [ss.key, cur.sub?.[ss.key] !== false]))
    }];
  }));
};

// ── PANNELLO PERMESSI RISORSA ─────────────────────────────────────
function PermessiPanel({ staffObj, onSave, onCancel }) {
  const [perm, setPerm] = React.useState(() => mergePermessi(staffObj?.permessi));
  const [saving, setSaving] = React.useState(false);

  const toggleSection = (key) => {
    setPerm(p => {
      const newVisible = !p[key].visible;
      const newSub = Object.fromEntries(Object.keys(p[key].sub || {}).map(sk => [sk, newVisible]));
      return { ...p, [key]: { ...p[key], visible: newVisible, sub: newSub } };
    });
  };

  const toggleSub = (sKey, ssKey) => {
    setPerm(p => {
      const newSub = { ...p[sKey].sub, [ssKey]: !p[sKey].sub[ssKey] };
      const anyOn = Object.values(newSub).some(Boolean);
      return { ...p, [sKey]: { ...p[sKey], visible: anyOn, sub: newSub } };
    });
  };

  const save = async () => {
    setSaving(true);
    await supabase.from('staff').update({ permessi: perm }).eq('id', staffObj.id);
    setSaving(false);
    onSave(perm);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,18,41,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: 'var(--brand-800)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {`${staffObj?.cognome?.[0] || ''}${staffObj?.nome?.[0] || ''}`.toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{staffObj?.cognome} {staffObj?.nome}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Permessi di accesso alle sezioni</div>
          </div>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Le sezioni disabilitate scompaiono dalla navigazione dell'utente. Gli admin vedono sempre tutto.</div>
          {PERMESSI_STRUTTURA.map(s => (
            <div key={s.key} style={{ border: `0.5px solid ${perm[s.key]?.visible ? '#e2e8f0' : '#fecaca'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s' }}>
              {/* Riga sezione */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: perm[s.key]?.visible ? '#f8fafc' : '#fef2f2', transition: 'background 0.15s' }}>
                <span style={{ color: perm[s.key]?.visible ? 'var(--brand-700)' : '#fca5a5' }}>{s.icon}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: perm[s.key]?.visible ? '#0f172a' : '#ef4444' }}>{s.label}</span>
                {/* Toggle switch */}
                <div onClick={() => toggleSection(s.key)} style={{ width: 40, height: 22, borderRadius: 11, background: perm[s.key]?.visible ? 'var(--brand-700)' : '#e2e8f0', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: perm[s.key]?.visible ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
              {/* Sub-sezioni */}
              {s.sub.length > 0 && perm[s.key]?.visible && (
                <div style={{ padding: '8px 16px 12px 42px', display: 'flex', flexWrap: 'wrap', gap: '8px', borderTop: '0.5px solid #f1f5f9' }}>
                  {s.sub.map(ss => {
                    const on = perm[s.key]?.sub?.[ss.key] !== false;
                    return (
                      <div key={ss.key} onClick={() => toggleSub(s.key, ss.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, border: `1px solid ${on ? '#bfdbfe' : '#e2e8f0'}`, background: on ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: on ? 600 : 400, color: on ? '#0054a6' : '#94a3b8', transition: 'all 0.15s', userSelect: 'none' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: on ? '#0054a6' : '#cbd5e1', flexShrink: 0, transition: 'background 0.15s' }} />
                        {ss.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '0.5px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onCancel} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Annulla</button>
          <button onClick={save} disabled={saving} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvataggio…' : 'Salva permessi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// WORKFLOW TAB — gestione completa workflow (lista + editor + documenti)
// ─────────────────────────────────────────────
function WorkflowTab({ WfEditorModal }) {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewWf, setShowNewWf] = useState(false);
  const [editingWf, setEditingWf] = useState(null); // { id, nome, diSistema }
  const [subTab, setSubTab] = useState('gestione'); // 'gestione' | 'documenti'

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('workflows').select('id, nome, di_sistema').order('id');
    setWorkflows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Modale editor workflow */}
      {editingWf && WfEditorModal && (
        <WfEditorModal
          workflowId={editingWf.id}
          workflowNome={editingWf.nome}
          diSistema={editingWf.diSistema}
          onClose={() => { setEditingWf(null); load(); }}
          onDelete={() => { setEditingWf(null); load(); }}
        />
      )}

      {/* Header sezione */}
      <div style={{ marginBottom: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Workflow</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Gestisci i workflow del portale e configura i documenti per colonna.</div>
      </div>

      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
        {[{ key: 'gestione', label: 'Gestione workflow' }, { key: 'documenti', label: 'Documenti per colonna' }].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ padding: '8px 20px', border: 'none', borderBottom: subTab === t.key ? '2.5px solid var(--brand-800)' : '2.5px solid transparent', background: 'transparent', color: subTab === t.key ? 'var(--brand-800)' : '#64748b', fontWeight: subTab === t.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'documenti' && <WorkflowDocConfig />}

      {subTab === 'gestione' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Bottone nuovo */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn onClick={() => setShowNewWf(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nuovo workflow
            </Btn>
          </div>

          {/* Lista workflow */}
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Caricamento…</div>
          ) : workflows.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13, border: '0.5px dashed #e2e8f0', borderRadius: 10 }}>Nessun workflow configurato</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {workflows.map((wf, i) => (
                <div key={wf.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, transition: 'all 0.12s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor = '#bfdbfe'}
                  onMouseOut={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
                  {/* Icona */}
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17h3a1 1 0 0 1 1 1v2M21 14v2a1 1 0 0 1-1 1h-2"/></svg>
                  </div>
                  {/* Nome */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{wf.nome}</div>
                    {wf.di_sistema && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Workflow di sistema</div>}
                  </div>
                  {wf.di_sistema && (
                    <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', borderRadius: 20, padding: '2px 10px', border: '0.5px solid #e2e8f0', flexShrink: 0 }}>sistema</span>
                  )}
                  {/* Bottone configura */}
                  <button onClick={() => setEditingWf({ id: wf.id, nome: wf.nome, diSistema: !!wf.di_sistema })}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, border: '0.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, transition: 'all 0.12s' }}
                    onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#0054a6'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                    Configura
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modale nuovo workflow */}
      {showNewWf && (
        <div className="modal-overlay" onClick={() => setShowNewWf(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '340px' }}>
            <button className="btn-close-circle" onClick={() => setShowNewWf(false)}>×</button>
            <div className="modal-header" style={{ paddingRight: '44px' }}><h3>Nuovo workflow</h3></div>
            <NuovoWfForm onSave={async (nome) => { await supabase.from('workflows').insert({ nome }); setShowNewWf(false); load(); }} onCancel={() => setShowNewWf(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

// WORKFLOW DOC CONFIG — configura documenti per colonna
// ─────────────────────────────────────────────
const TIPI_DOCUMENTO = [
  { key: 'raccolta_requisiti', label: 'Raccolta Requisiti', icon: '📋', desc: 'Specifica funzionale strutturata' },
  { key: 'scheda_demo',        label: 'Scheda Demo',        icon: '🖥️', desc: 'Scheda preparazione demo cliente' },
];

function WorkflowDocConfig() {
  const [workflows, setWorkflows] = useState([]);
  const [colonne, setColonne] = useState([]);
  const [config, setConfig] = useState({}); // { colonna_id: { tipo: abilitato } }
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Carica workflows e colonne — queste esistono sempre
        const [{ data: wf, error: e1 }, { data: col, error: e2 }] = await Promise.all([
          supabase.from('workflows').select('*').order('id'),
          supabase.from('workflow_colonne').select('*').order('ordine'),
        ]);

        if (e1) console.warn('workflows:', e1.message);
        if (e2) console.warn('workflow_colonne:', e2.message);

        setWorkflows(wf || []);
        setColonne(col || []);
        if (wf && wf.length > 0) setExpanded({ [wf[0].id]: true });

        // Carica config documenti — potrebbe non esistere ancora la tabella
        const { data: cfg, error: e3 } = await supabase
          .from('workflow_colonna_documenti').select('*');

        if (e3) {
          console.warn('workflow_colonna_documenti non trovata — esegui card_documenti_setup.sql in Supabase');
        } else {
          const map = {};
          (cfg || []).forEach(r => {
            if (!map[r.colonna_id]) map[r.colonna_id] = {};
            map[r.colonna_id][r.tipo] = r.abilitato;
          });
          setConfig(map);
        }
      } catch (err) {
        console.error('WorkflowDocConfig load error:', err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const toggleTipo = async (colonnaId, tipo) => {
    const current = config[colonnaId]?.[tipo] ?? false;
    const newVal = !current;
    setSaving(true);

    const { error } = await supabase.from('workflow_colonna_documenti').upsert({
      colonna_id: colonnaId,
      tipo,
      abilitato: newVal,
    }, { onConflict: 'colonna_id,tipo' });

    if (error) {
      alert('Errore: tabella workflow_colonna_documenti non trovata.\nEsegui prima card_documenti_setup.sql in Supabase.');
      setSaving(false);
      return;
    }

    setConfig(prev => ({
      ...prev,
      [colonnaId]: { ...(prev[colonnaId] || {}), [tipo]: newVal }
    }));
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Caricamento workflow…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {workflows.length === 0 && (
        <div style={{ background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 12, padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          Nessun workflow configurato
        </div>
      )}

      {workflows.map(wf => {
        const wfColonne = colonne.filter(c => c.workflow_id === wf.id);
        const isOpen = expanded[wf.id];
        return (
          <div key={wf.id} style={{ border: '1.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            {/* Header workflow */}
            <div onClick={() => setExpanded(p => ({ ...p, [wf.id]: !p[wf.id] }))}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: isOpen ? '#f8fafc' : '#fff', cursor: 'pointer', userSelect: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-800)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{wf.nome}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{wfColonne.length} colonne</span>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {/* Colonne */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #e2e8f0' }}>
                {wfColonne.length === 0 && (
                  <div style={{ padding: '16px 18px', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nessuna colonna in questo workflow</div>
                )}
                {wfColonne.map((col, i) => {
                  const hasTipiAbilitati = TIPI_DOCUMENTO.some(t => config[col.id]?.[t.key]);
                  return (
                    <div key={col.id} style={{ padding: '14px 18px', borderBottom: i < wfColonne.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Badge colonna */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.colore || '#64748b', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{col.nome}</span>
                        {hasTipiAbilitati && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 20, padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>attivo</span>
                        )}
                      </div>
                      {/* Toggle per ogni tipo documento */}
                      <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                        {TIPI_DOCUMENTO.map(tipo => {
                          const abilitato = config[col.id]?.[tipo.key] ?? false;
                          return (
                            <button key={tipo.key} onClick={() => toggleTipo(col.id, tipo.key)} disabled={saving}
                              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${abilitato ? 'var(--brand-800)' : '#e2e8f0'}`, background: abilitato ? 'var(--brand-800)' : '#fff', color: abilitato ? '#fff' : '#64748b', fontSize: 12, fontWeight: abilitato ? 600 : 400, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                              <span style={{ fontSize: 13 }}>{tipo.icon}</span>
                              {tipo.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
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
        <div style={{ background: 'var(--brand-800)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                              <button onClick={() => handleSaveEdit(f.id)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>✓</button>
                              <button onClick={() => setEditId(null)} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>×</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: 'var(--brand-800)' }}>{String(f.utenti_max).padStart(3, '0')}</span>
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
                  style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: (!nuova.utenti_max || !nuova.gg) ? '#e2e8f0' : 'var(--brand-800)', color: (!nuova.utenti_max || !nuova.gg) ? '#94a3b8' : '#fff', fontSize: 13, fontWeight: 600, cursor: (!nuova.utenti_max || !nuova.gg) ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, label: '' });

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

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset input
    setImporting(true);
    setImportResult(null);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // Salta la riga di intestazione (prima riga)
      const dataRows = rows.slice(1).filter(r => r[0] && r[2] !== '' && r[3] !== '');

      // Prefisso in base al prodotto
      const prefix = prodotto === 'Cassiopea' ? 'CSP-' : 'T7X-';

      // Raggruppa per codice per fare meno query
      const byCode = {};
      for (const row of dataRows) {
        const codiceCorto = String(row[0]).trim().toUpperCase();
        const utentiMax = parseInt(String(row[2]).trim());
        const gg = parseFloat(String(row[3]).replace(',', '.'));
        if (!codiceCorto || isNaN(utentiMax) || isNaN(gg)) continue;
        const codiceCompleto = prefix + codiceCorto;
        if (!byCode[codiceCompleto]) byCode[codiceCompleto] = [];
        byCode[codiceCompleto].push({ utenti_max: utentiMax, gg });
      }

      let inserted = 0, updated = 0, skipped = 0;
      const notFound = [];
      const codici = Object.keys(byCode);
      const totFasce = Object.values(byCode).reduce((s, f) => s + f.length, 0);
      let processedFasce = 0;

      setImportProgress({ current: 0, total: totFasce, label: 'Avvio importazione…' });

      for (let ci = 0; ci < codici.length; ci++) {
        const codice = codici[ci];
        const fasce = byCode[codice];

        setImportProgress(p => ({ ...p, label: codice }));

        // Cerca il modulo nel DB
        const { data: moduli } = await supabase
          .from('listino_moduli')
          .select('id')
          .eq('codice', codice)
          .eq('prodotto', prodotto)
          .limit(1);

        if (!moduli || moduli.length === 0) {
          notFound.push(codice);
          skipped += fasce.length;
          processedFasce += fasce.length;
          setImportProgress(p => ({ ...p, current: processedFasce }));
          continue;
        }

        const moduloId = moduli[0].id;

        for (const fascia of fasce) {
          const { data: existing } = await supabase
            .from('listino_fasce')
            .select('id, gg')
            .eq('listino_modulo_id', moduloId)
            .eq('utenti_max', fascia.utenti_max)
            .limit(1);

          if (existing && existing.length > 0) {
            if (existing[0].gg !== fascia.gg) {
              await supabase.from('listino_fasce').update({ gg: fascia.gg }).eq('id', existing[0].id);
              updated++;
            } else {
              skipped++;
            }
          } else {
            await supabase.from('listino_fasce').insert({
              listino_modulo_id: moduloId,
              utenti_max: fascia.utenti_max,
              gg: fascia.gg,
            });
            inserted++;
          }
          processedFasce++;
          setImportProgress(p => ({ ...p, current: processedFasce }));
        }
      }

      setImportResult({ inserted, updated, skipped, notFound });
      setImportProgress({ current: 0, total: 0, label: '' });
      await loadModuli();
    } catch (err) {
      console.error('Import error:', err);
      setImportResult({ inserted: 0, updated: 0, skipped: 0, notFound: [], errors: 1 });
      setImportProgress({ current: 0, total: 0, label: '' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* Selezione prodotto */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0' }}>
        {PRODOTTI.map(p => (
          <button key={p} onClick={() => setProdotto(p)}
            style={{ padding: '8px 20px', border: 'none', borderBottom: prodotto === p ? '2.5px solid var(--brand-800)' : '2.5px solid transparent', background: 'transparent', color: prodotto === p ? 'var(--brand-800)' : '#64748b', fontWeight: prodotto === p ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: -1 }}>
            {p}
          </button>
        ))}
      </div>

      {/* Import Excel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: importing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: importing ? 0.6 : 1, transition: 'all 0.15s' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {importing ? 'Importazione in corso…' : 'Importa da Excel'}
            <input type="file" accept=".xlsx,.xls,.csv" disabled={importing} style={{ display: 'none' }}
              onChange={handleImportExcel} />
          </label>
          {!importing && importResult && (
            <div style={{ fontSize: 12, color: importResult.errors > 0 ? '#d97706' : '#16a34a', background: importResult.errors > 0 ? '#fffbeb' : '#f0fdf4', border: `1px solid ${importResult.errors > 0 ? '#fde68a' : '#bbf7d0'}`, borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {importResult.inserted} inserite · {importResult.updated} aggiornate
              {importResult.skipped > 0 && ` · ${importResult.skipped} saltate`}
              {importResult.notFound.length > 0 && ` · Non trovati: ${importResult.notFound.slice(0,3).join(', ')}${importResult.notFound.length > 3 ? '…' : ''}`}
            </div>
          )}
        </div>

        {/* Progress bar animata */}
        {importing && importProgress.total > 0 && (
          <div style={{ background: '#f1f5f9', borderRadius: 10, overflow: 'hidden', height: 6, width: '100%', maxWidth: 500 }}>
            <div style={{
              height: '100%',
              width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
              background: 'linear-gradient(90deg, var(--brand-800), #2563eb)',
              borderRadius: 10,
              transition: 'width 0.2s ease',
            }} />
          </div>
        )}
        {importing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#64748b' }}>
            {/* Spinner */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            {importProgress.total > 0
              ? <span>{importProgress.current} / {importProgress.total} fasce — <strong style={{ color: 'var(--brand-800)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>{importProgress.label}</strong></span>
              : <span>Lettura file…</span>
            }
          </div>
        )}
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
                <button onClick={handleAddArea} disabled={saving} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>✓</button>
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
                    <span style={{ fontSize: 11, fontWeight: sel ? 700 : 500, color: sel ? 'var(--brand-800)' : '#374151', flex: 1, lineHeight: 1.2 }}>{area}</span>
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
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-800)', letterSpacing: '0.04em' }}>{areaAttiva}</span>
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
                                  <button onClick={() => saveEdit(m.id)} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>✓</button>
                                  <button onClick={() => setEditingId(null)} style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>×</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '10px 14px', fontFamily: 'IBM Plex Mono, monospace', color: 'var(--brand-800)', fontWeight: 600 }}>{m.codice}</td>
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
// ── SCALETTA DEFAULT CONFIG ───────────────────────────────────────
function ScalettaDefaultConfig() {
  const [punti, setPunti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitolo, setNewTitolo] = useState('');
  const [newDurata, setNewDurata] = useState(5);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitolo, setEditTitolo] = useState('');
  const [editDurata, setEditDurata] = useState(5);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('delivery_scaletta_default').select('*').order('ordine');
    setPunti(data || []);
    setLoading(false);
  };

  const add = async () => {
    if (!newTitolo.trim() || saving) return;
    setSaving(true);
    const maxOrdine = punti.length > 0 ? Math.max(...punti.map(p => p.ordine)) : 0;
    const { data } = await supabase.from('delivery_scaletta_default').insert({
      titolo: newTitolo.trim(), durata_min: newDurata, ordine: maxOrdine + 10,
    }).select().single();
    if (data) setPunti(prev => [...prev, data]);
    setNewTitolo(''); setNewDurata(5); setSaving(false);
  };

  const saveEdit = async (p) => {
    await supabase.from('delivery_scaletta_default').update({ titolo: editTitolo.trim(), durata_min: editDurata }).eq('id', p.id);
    setPunti(prev => prev.map(x => x.id === p.id ? { ...x, titolo: editTitolo.trim(), durata_min: editDurata } : x));
    setEditingId(null);
  };

  const del = async (id) => {
    if (!window.confirm('Rimuovere questo punto dalla scaletta default?')) return;
    await supabase.from('delivery_scaletta_default').delete().eq('id', id);
    setPunti(prev => prev.filter(p => p.id !== id));
  };

  const totMin = punti.reduce((s, p) => s + (p.durata_min || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Form aggiungi */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <input value={newTitolo} onChange={e => setNewTitolo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') add(); }}
          placeholder="Nuovo punto scaletta..."
          style={{ flex: 1, padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        <input type="number" value={newDurata} onChange={e => setNewDurata(Number(e.target.value))}
          min={1} max={60}
          style={{ width: 60, padding: '7px 8px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', textAlign: 'center' }} />
        <span style={{ fontSize: 12, color: '#64748b', flexShrink: 0 }}>min</span>
        <Btn onClick={add} disabled={!newTitolo.trim() || saving}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Aggiungi
        </Btn>
      </div>

      {/* Lista */}
      <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 18px', background: '#f8fafc', borderBottom: '0.5px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em' }}>{punti.length} punti · {totMin} min totali</span>
        </div>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Caricamento...</div>
        ) : punti.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>Nessun punto configurato</div>
        ) : punti.map((p, i) => (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: i < punti.length - 1 ? '0.5px solid #f1f5f9' : 'none' }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
            {editingId === p.id ? (
              <>
                <input value={editTitolo} onChange={e => setEditTitolo(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(p); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                  style={{ flex: 1, padding: '4px 8px', border: '1px solid #185FA5', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                <input type="number" value={editDurata} onChange={e => setEditDurata(Number(e.target.value))}
                  min={1} max={60}
                  style={{ width: 52, padding: '4px 6px', border: '1px solid #185FA5', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit', textAlign: 'center' }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>min</span>
                <button onClick={() => saveEdit(p)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: 'none', background: '#001d47', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Salva</button>
                <button onClick={() => setEditingId(null)} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, border: '0.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', cursor: 'pointer', fontFamily: 'inherit' }}>Annulla</button>
              </>
            ) : (
              <>
                <div style={{ flex: 1, fontSize: 13, color: '#0f172a', fontWeight: 400 }}>{p.titolo}</div>
                <span style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', borderRadius: 20, padding: '2px 9px', flexShrink: 0 }}>{p.durata_min} min</span>
                <button onClick={() => { setEditingId(p.id); setEditTitolo(p.titolo); setEditDurata(p.durata_min); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '3px', borderRadius: 5, transition: 'all .12s' }}
                  onMouseOver={e => { e.currentTarget.style.color = '#185FA5'; e.currentTarget.style.background = '#eff6ff'; }}
                  onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'transparent'; }}>
                  <i className="ti ti-edit" style={{ fontSize: 14 }} />
                </button>
                <button onClick={() => del(p.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: '3px', borderRadius: 5, transition: 'all .12s' }}
                  onMouseOver={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fef2f2'; }}
                  onMouseOut={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.background = 'transparent'; }}>
                  <i className="ti ti-trash" style={{ fontSize: 14 }} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NOTIFICHE CONFIG GLOBALE ──────────────────────────────────────
function NotificheConfigGlobale() {
  const [tipi, setTipi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    supabase.from('notifiche_config_globale').select('*').order('tipo_evento')
      .then(({ data }) => { setTipi(data || []); setLoading(false); });
  }, []);

  const toggle = async (tipo, value) => {
    setSaving(tipo);
    await supabase.from('notifiche_config_globale').update({ abilitato: value }).eq('tipo_evento', tipo);
    setTipi(prev => prev.map(t => t.tipo_evento === tipo ? { ...t, abilitato: value } : t));
    setSaving(null);
  };

  return (
    <div style={{ background: 'var(--color-surface, #fff)', border: '0.5px solid var(--gray-200, #e2e8f0)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 18px', background: 'var(--gray-50, #f8fafc)', borderBottom: '0.5px solid var(--gray-200, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500, #64748b)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Tipi di evento</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400, #94a3b8)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Abilitato</span>
      </div>
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--gray-400, #94a3b8)', fontSize: 13 }}>Caricamento...</div>
      ) : tipi.map((t, i) => (
        <div key={t.tipo_evento} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderBottom: i < tipi.length - 1 ? '0.5px solid var(--gray-100, #f1f5f9)' : 'none' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: t.abilitato ? 'var(--brand-50, #eff6ff)' : 'var(--gray-100, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className={`ti ${t.icona || 'ti-bell'}`} style={{ fontSize: 16, color: t.abilitato ? 'var(--brand-700, #185FA5)' : 'var(--gray-400, #94a3b8)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950, #0f172a)' }}>{t.label}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400, #94a3b8)', marginTop: 2 }}>{t.descrizione}</div>
          </div>
          <div onClick={() => toggle(t.tipo_evento, !t.abilitato)}
            style={{ width: 40, height: 22, borderRadius: 11, background: t.abilitato ? 'var(--brand-800, #001d47)' : 'var(--gray-200, #e2e8f0)', cursor: saving === t.tipo_evento ? 'default' : 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, opacity: saving === t.tipo_evento ? 0.6 : 1 }}>
            <div style={{ position: 'absolute', top: 3, left: t.abilitato ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CONFIGURAZIONE VIEW ───────────────────────────────────────────
// ─────────────────────────────────────────────
// TAB ORGANIGRAMMA
// ─────────────────────────────────────────────
function TabOrganigramma({ staff, onReload }) {
  const [subTab, setSubTab] = React.useState('gestione'); // 'gestione' | 'grafico'
  const [relazioni, setRelazioni] = useState([]); // { id, staff_id, supervisore_id }
  const [selectedSup, setSelectedSup] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { loadRelazioni(); }, []);

  const loadRelazioni = async () => {
    setLoading(true);
    const { data } = await supabase.from('staff_supervisori').select('*');
    setRelazioni(data || []);
    setLoading(false);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); };

  const sKey = s => `${s.cognome} ${s.nome}`;
  const getAv = (key) => {
    const palette = ['#B5D4F4','#C0DD97','#FAC775','#F4B5D4','#D4B5F4','#B5F4D4','#F4D4B5'];
    const i = key.split('').reduce((a,c) => a + c.charCodeAt(0), 0) % palette.length;
    return { bg: palette[i], text: '#001d47' };
  };
  const initials = key => key.split(' ').map(w => w[0]?.toUpperCase()||'').join('').slice(0,2);

  const membroIds = relazioni.filter(r => r.supervisore_id === selectedSup).map(r => r.staff_id);

  const addMembro = async (staffId) => {
    if (membroIds.includes(staffId)) return;
    setSaving(true);
    const { data, error } = await supabase.from('staff_supervisori')
      .insert({ staff_id: staffId, supervisore_id: selectedSup }).select().single();
    if (!error && data) { setRelazioni(prev => [...prev, data]); showToast('Collaboratore aggiunto'); }
    setSaving(false);
  };

  const removeMembro = async (staffId) => {
    setSaving(true);
    const rel = relazioni.find(r => r.supervisore_id === selectedSup && r.staff_id === staffId);
    if (rel) {
      await supabase.from('staff_supervisori').delete().eq('id', rel.id);
      setRelazioni(prev => prev.filter(r => r.id !== rel.id));
      showToast('Collaboratore rimosso');
    }
    setSaving(false);
  };

  const supSelezionato = staff.find(s => s.id === selectedSup);
  const membriStaff = staff.filter(s => membroIds.includes(s.id));
  const disponibili = staff.filter(s =>
    s.id !== selectedSup && !membroIds.includes(s.id) &&
    (!search || sKey(s).toLowerCase().includes(search.toLowerCase()) || (s.ruolo||'').toLowerCase().includes(search.toLowerCase()))
  );

  // ── GRAFICO SVG ───────────────────────────────────────────────────
  const GraficoOrg = () => {
    // Costruisce albero: per ogni supervisore, lista dei suoi membri diretti
    // Le persone condivise compaiono in più rami (replicate visivamente)
    
    const sKey = s => `${s.cognome} ${s.nome}`;
    const staffById = {};
    staff.forEach(s => { staffById[s.id] = s; });

    // Nodi radice = chi non è mai staff_id (nessuno li supervisiona)
    const supervisoredIds = new Set(relazioni.map(r => r.staff_id));
    const roots = staff.filter(s => !supervisoredIds.has(s.id) && 
      relazioni.some(r => r.supervisore_id === s.id)); // supervisori radice
    // Chi non è in nessuna relazione
    const inRelazioni = new Set([
      ...relazioni.map(r => r.staff_id),
      ...relazioni.map(r => r.supervisore_id)
    ]);
    const isolati = staff.filter(s => !inRelazioni.has(s.id));

    // Ricorsivo: costruisce nodo con figli
    const buildNode = (staffId, visited = new Set()) => {
      if (visited.has(staffId)) return null; // evita cicli
      visited.add(staffId);
      const s = staffById[staffId];
      if (!s) return null;
      const childIds = relazioni
        .filter(r => r.supervisore_id === staffId)
        .map(r => r.staff_id);
      const children = childIds
        .map(cid => buildNode(cid, new Set(visited)))
        .filter(Boolean);
      return { s, children };
    };

    const trees = roots.map(r => buildNode(r.id));

    // Colori ZCS
    const BOX_BG = '#D6E8F7';
    const BOX_BORDER = '#4A90D9';
    const BOX_BG_ROOT = '#A8D0F0';
    const BOX_BG_LEAF = '#E8F4FD';
    const TEXT_DARK = '#001d47';
    const ARROW = '#4A90D9';

    // Componente ricorsivo per un nodo
    const NodeBox = ({ node, depth = 0 }) => {
      const key = sKey(node.s);
      const isRoot = depth === 0;
      const isLeaf = node.children.length === 0;
      const bg = isRoot ? BOX_BG_ROOT : isLeaf ? BOX_BG_LEAF : BOX_BG;
      const fontWeight = isRoot ? 700 : isLeaf ? 400 : 600;
      const fontSize = isRoot ? 13 : 12;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Box */}
          <div style={{
            background: bg,
            border: `1.5px solid ${BOX_BORDER}`,
            borderRadius: 4,
            padding: '8px 14px',
            minWidth: 160,
            maxWidth: 200,
            textAlign: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          }}>
            <div style={{ fontSize, fontWeight, color: TEXT_DARK, lineHeight: 1.3 }}>
              {key.toUpperCase()}
            </div>
            {node.s.ruolo && (
              <div style={{ fontSize: 10, color: '#2a5e8c', marginTop: 3, lineHeight: 1.3 }}>
                {node.s.ruolo.toUpperCase()}
              </div>
            )}
          </div>

          {/* Freccia + figli */}
          {node.children.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Linea verticale discendente */}
              <div style={{ width: 2, height: 20, background: ARROW }} />

              {node.children.length === 1 ? (
                // Figlio singolo: linea diritta
                <NodeBox node={node.children[0]} depth={depth + 1} />
              ) : (
                // Più figli: linea orizzontale + rami
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Barra orizzontale */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                    {node.children.map((child, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {/* Linea verticale verso il basso */}
                        <div style={{ width: 2, height: 20, background: ARROW }} />
                        <NodeBox node={child} depth={depth + 1} />
                      </div>
                    ))}
                    {/* Linea orizzontale che collega i rami */}
                    {node.children.length > 1 && (() => {
                      // Calcolata via CSS con pseudo-elementi non disponibili — usiamo un trucco flex
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    };

    // Versione con linea orizzontale reale usando SVG overlay — usiamo un approccio più semplice:
    // ogni nodo con più figli usa una struttura a T con bordi CSS

    const TreeNode = ({ node, depth = 0 }) => {
      const key = sKey(node.s);
      const isRoot = depth === 0;
      const bg = isRoot ? BOX_BG_ROOT : node.children.length > 0 ? BOX_BG : BOX_BG_LEAF;
      const fw = isRoot ? 700 : node.children.length > 0 ? 600 : 400;

      return (
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* BOX */}
          <div style={{
            background: bg, border: `1.5px solid ${BOX_BORDER}`, borderRadius: 4,
            padding: '8px 16px', minWidth: 150, maxWidth: 220, textAlign: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.10)', cursor: 'default',
          }}>
            <div style={{ fontSize: isRoot ? 13 : 12, fontWeight: fw, color: TEXT_DARK, lineHeight: 1.35 }}>
              {key.toUpperCase()}
            </div>
            {node.s.ruolo && (
              <div style={{ fontSize: 10, color: '#2a5e8c', marginTop: 3, lineHeight: 1.3, fontWeight: 400 }}>
                {node.s.ruolo.toUpperCase()}
              </div>
            )}
          </div>

          {node.children.length > 0 && (
            <>
              {/* Linea verticale giù */}
              <div style={{ width: 2, height: 18, background: ARROW, flexShrink: 0 }} />

              {node.children.length === 1 ? (
                <TreeNode node={node.children[0]} depth={depth + 1} />
              ) : (
                /* Connettore a T */
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Linea orizzontale */}
                  <div style={{ display: 'flex', position: 'relative' }}>
                    {node.children.map((child, i) => {
                      const isFirst = i === 0;
                      const isLast = i === node.children.length - 1;
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                          {/* Segmento linea orizzontale */}
                          <div style={{
                            height: 2, background: ARROW,
                            width: isFirst || isLast ? '50%' : '100%',
                            alignSelf: isFirst ? 'flex-end' : isLast ? 'flex-start' : 'stretch',
                          }} />
                          {/* Linea verticale verso figlio */}
                          <div style={{ width: 2, height: 16, background: ARROW }} />
                          {/* Figlio */}
                          <TreeNode node={child} depth={depth + 1} />
                          {/* Padding orizzontale tra nodi */}
                          <div style={{ width: '100%', minWidth: 20 }} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      );
    };

    return (
      <div style={{ overflowX: 'auto', overflowY: 'auto', background: '#f0f7ff', borderRadius: 12, border: '1px solid #bfdbfe', padding: 32 }}>
        {relazioni.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 13, padding: 40 }}>
            Nessuna relazione configurata — vai in Gestione per aggiungere collaboratori
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
            {trees.filter(Boolean).map((tree, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <TreeNodeReal node={tree} depth={0} sKey={sKey} />
              </div>
            ))}
          </div>
        )}

        {isolati.length > 0 && (
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px dashed #bfdbfe' }}>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12, textAlign: 'center' }}>Non assegnati</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {isolati.map(s => (
                <div key={s.id} style={{ background: '#fff', border: '1px dashed #bfdbfe', borderRadius: 4, padding: '6px 14px', textAlign: 'center', opacity: 0.6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: TEXT_DARK }}>{sKey(s).toUpperCase()}</div>
                  {s.ruolo && <div style={{ fontSize: 9, color: '#64748b' }}>{s.ruolo.toUpperCase()}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // TreeNodeReal — componente separato per evitare hook issues
  const TreeNodeReal = ({ node, depth, sKey }) => {
    const ARROW = '#4A90D9';
    const BOX_BG_ROOT = '#A8D0F0';
    const BOX_BG = '#D6E8F7';
    const BOX_BG_LEAF = '#E8F4FD';
    const BOX_BORDER = '#4A90D9';
    const TEXT_DARK = '#001d47';

    const key = sKey(node.s);
    const isRoot = depth === 0;
    const isSupervisor = node.children.length > 0;
    const bg = isRoot ? BOX_BG_ROOT : isSupervisor ? BOX_BG : BOX_BG_LEAF;
    const fw = isRoot ? 700 : isSupervisor ? 600 : 400;

    // Separa figli-foglia da figli-supervisori
    const leafChildren = node.children.filter(c => c.children.length === 0);
    const supChildren  = node.children.filter(c => c.children.length > 0);
    // Tutti i figli sono foglie → box verticale unico
    const allLeaves = node.children.length > 0 && supChildren.length === 0;

    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* BOX nodo corrente */}
        <div style={{
          background: bg, border: `1.5px solid ${BOX_BORDER}`, borderRadius: 4,
          padding: '10px 18px', minWidth: 160, maxWidth: 220, textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        }}>
          <div style={{ fontSize: isRoot ? 13 : 12, fontWeight: fw, color: TEXT_DARK, lineHeight: 1.35 }}>
            {key.toUpperCase()}
          </div>
          {node.s.ruolo && (
            <div style={{ fontSize: 10, color: '#2a5e8c', marginTop: 3, fontWeight: 400, lineHeight: 1.3 }}>
              {node.s.ruolo.toUpperCase()}
            </div>
          )}
        </div>

        {node.children.length > 0 && (
          <>
            {/* Linea verticale */}
            <div style={{ width: 2, height: 20, background: ARROW }} />

            {allLeaves ? (
              /* ── CASO 1: tutti foglie → box lista verticale ── */
              <div style={{
                background: BOX_BG_LEAF, border: `1.5px solid ${BOX_BORDER}`, borderRadius: 4,
                padding: '10px 18px', minWidth: 160, maxWidth: 220, textAlign: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
              }}>
                {node.children.map((child, i) => (
                  <div key={i}>
                    {i > 0 && <div style={{ height: '0.5px', background: BOX_BORDER, opacity: 0.3, margin: '5px 0' }} />}
                    <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_DARK, lineHeight: 1.3 }}>
                      {sKey(child.s).toUpperCase()}
                    </div>
                    {child.s.ruolo && (
                      <div style={{ fontSize: 9, color: '#2a5e8c', lineHeight: 1.2 }}>
                        {child.s.ruolo.toUpperCase()}
                      </div>
                    )}
                  </div>
                ))}
              </div>

            ) : node.children.length === 1 ? (
              /* ── CASO 2: figlio singolo ── */
              <TreeNodeReal node={node.children[0]} depth={depth + 1} sKey={sKey} />

            ) : (
              /* ── CASO 3: mix supervisori (+ eventuali foglie in coda) → orizzontale ── */
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24 }}>
                {/* Supervisori in orizzontale */}
                {supChildren.map((child, i) => (
                  <TreeNodeReal key={i} node={child} depth={depth + 1} sKey={sKey} />
                ))}
                {/* Foglie raggruppate in box verticale */}
                {leafChildren.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      background: BOX_BG_LEAF, border: `1.5px solid ${BOX_BORDER}`, borderRadius: 4,
                      padding: '10px 18px', minWidth: 160, maxWidth: 220, textAlign: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                    }}>
                      {leafChildren.map((child, i) => (
                        <div key={i}>
                          {i > 0 && <div style={{ height: '0.5px', background: BOX_BORDER, opacity: 0.3, margin: '5px 0' }} />}
                          <div style={{ fontSize: 11, fontWeight: 500, color: TEXT_DARK, lineHeight: 1.3 }}>
                            {sKey(child.s).toUpperCase()}
                          </div>
                          {child.s.ruolo && (
                            <div style={{ fontSize: 9, color: '#2a5e8c', lineHeight: 1.2 }}>
                              {child.s.ruolo.toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  };


  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)' }}>Caricamento...</div>;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>

      {/* Sub-tab Gestione / Grafico */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--gray-200)' }}>
        {[{ key: 'gestione', label: 'Gestione' }, { key: 'grafico', label: 'Grafico' }].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ padding: '8px 20px', border: 'none', borderBottom: subTab === t.key ? '2.5px solid var(--brand-800)' : '2.5px solid transparent', background: 'transparent', color: subTab === t.key ? 'var(--brand-800)' : 'var(--gray-500)', fontWeight: subTab === t.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'grafico' && <GraficoOrg />}

      {subTab === 'gestione' && (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 24, maxWidth: 860 }}>

          {/* ── COLONNA SX: lista supervisori ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 10 }}>Supervisori</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {staff.map(s => {
                const key = sKey(s);
                const av = getAv(key);
                const isSel = selectedSup === s.id;
                const nMembri = relazioni.filter(r => r.supervisore_id === s.id).length;
                return (
                  <div key={s.id} onClick={() => { setSelectedSup(s.id); setSearch(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: '0.5px solid', transition: 'all 0.12s',
                      background: isSel ? 'var(--brand-50,#eff6ff)' : 'var(--color-surface)',
                      borderColor: isSel ? 'var(--brand-200,#bfdbfe)' : 'var(--gray-200)',
                    }}
                    onMouseOver={e => { if (!isSel) e.currentTarget.style.background = 'var(--gray-50)'; }}
                    onMouseOut={e => { if (!isSel) e.currentTarget.style.background = 'var(--color-surface)'; }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{initials(key)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: isSel ? 600 : 400, color: isSel ? 'var(--brand-800)' : 'var(--gray-950)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key}</div>
                      <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{s.ruolo || '—'}</div>
                    </div>
                    {nMembri > 0 && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: isSel ? 'var(--brand-700)' : 'var(--gray-100)', color: isSel ? '#fff' : 'var(--gray-500)', flexShrink: 0 }}>{nMembri}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── COLONNA DX ── */}
          <div>
            {!selectedSup ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--gray-400)' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>👥</div>
                <div style={{ fontSize: 13 }}>Seleziona un supervisore per gestire il suo gruppo</div>
              </div>
            ) : (
              <>
                {supSelezionato && (() => {
                  const key = sKey(supSelezionato);
                  const av = getAv(key);
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--brand-800)', borderRadius: 12, marginBottom: 20 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{initials(key)}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{key}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{supSelezionato.ruolo || '—'} · {membriStaff.length} collaborator{membriStaff.length === 1 ? 'e' : 'i'}</div>
                      </div>
                    </div>
                  );
                })()}

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Gruppo visibile</div>
                  {membriStaff.length === 0 ? (
                    <div style={{ padding: '16px', textAlign: 'center', border: '0.5px dashed var(--gray-200)', borderRadius: 8, color: 'var(--gray-400)', fontSize: 12, fontStyle: 'italic' }}>Nessun collaboratore</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {membriStaff.map((s, i) => {
                        const key = sKey(s);
                        const av = getAv(key);
                        const altriSup = relazioni.filter(r => r.staff_id === s.id && r.supervisore_id !== selectedSup).length;
                        return (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: '0.5px solid var(--gray-200)', background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--gray-50)' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{initials(key)}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>{key}</div>
                              <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{s.ruolo || '—'}</div>
                            </div>
                            {altriSup > 0 && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#fef9c3', color: '#854d0e', border: '0.5px solid #fde047', flexShrink: 0 }}>condiviso</span>}
                            <button onClick={() => removeMembro(s.id)} disabled={saving}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-300)', padding: '2px 4px' }}
                              onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                              onMouseOut={e => e.currentTarget.style.color = 'var(--gray-300)'}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 8 }}>Aggiungi collaboratori</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--gray-50)', border: '0.5px solid var(--gray-200)', borderRadius: 8, padding: '7px 10px', marginBottom: 10 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome o ruolo..."
                      style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--gray-950)', fontFamily: 'inherit' }} />
                    {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 220, overflowY: 'auto' }}>
                    {disponibili.length === 0 && <div style={{ padding: 12, textAlign: 'center', color: 'var(--gray-400)', fontSize: 12, fontStyle: 'italic' }}>Nessuna persona disponibile</div>}
                    {disponibili.map(s => {
                      const key = sKey(s);
                      const av = getAv(key);
                      const nGruppi = relazioni.filter(r => r.staff_id === s.id).length;
                      return (
                        <div key={s.id} onClick={() => !saving && addMembro(s.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', border: '0.5px solid transparent', transition: 'all 0.12s' }}
                          onMouseOver={e => { e.currentTarget.style.background = 'var(--brand-50,#eff6ff)'; e.currentTarget.style.borderColor = 'var(--brand-200,#bfdbfe)'; }}
                          onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{initials(key)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-950)' }}>{key}</div>
                            <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{s.ruolo || '—'}</div>
                          </div>
                          {nGruppi > 0 && <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>in {nGruppi} gruppi</span>}
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: 'var(--brand-800)', color: '#fff', borderRadius: 40, padding: '10px 24px', fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 9999, pointerEvents: 'none' }}>
          {toast}
        </div>
      )}
    </div>
  );
}


export function ConfigurazioneView({ staff, clients, onBack, onReload, WfEditorModal, skillsConfig = {}, setSkillsConfig }) {
  const [tab, setTab] = useState('listino');
  const [risorseSubTab, setRisorseSubTab] = useState('elenco');
  const [showManageStaff, setShowManageStaff] = useState(false);
  const [staffEditTarget, setStaffEditTarget] = useState(null);
  const [searchRisorse, setSearchRisorse] = useState('');
  const [searchClienti, setSearchClienti] = useState('');
  const [showManageClients, setShowManageClients] = useState(false);
  const [clientEditTarget, setClientEditTarget] = useState(null); // null = nuovo, object = edit
  const [showClientModal, setShowClientModal] = useState(false);
  const [permessiTarget, setPermessiTarget] = useState(null);
  const [showGestioneDati, setShowGestioneDati] = useState(false);
  const [datiSubTab, setDatiSubTab] = useState('clienti');
  const [skillsFolder, setSkillsFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [skillSaving, setSkillSaving] = useState(false);
  const [orgStaff, setOrgStaff] = useState([]);
  const [orgSaving, setOrgSaving] = useState(false);

  // Inizializza skillsFolder al primo folder disponibile
  useEffect(() => {
    const folders = Object.keys(skillsConfig);
    if (folders.length > 0 && !skillsFolder) setSkillsFolder(folders[0]);
  }, [skillsConfig]);

  const TABS = [
    { key: 'listino',  label: 'Listino Prodotti', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
    { key: 'workflow', label: 'Workflow',          icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17h3a1 1 0 0 1 1 1v2M21 14v2a1 1 0 0 1-1 1h-2"/><line x1="17.5" y1="14" x2="17.5" y2="14.01"/></svg> },
    { key: 'risorse',  label: 'Risorse',           icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
    { key: 'clienti',  label: 'Clienti',           icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg> },
    { key: 'skills',   label: 'Skill Map',         icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { key: 'organigramma', label: 'Organigramma',  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><rect x="1" y="16" width="6" height="4" rx="1"/><rect x="9" y="16" width="6" height="4" rx="1"/><rect x="17" y="16" width="6" height="4" rx="1"/><line x1="12" y1="6" x2="12" y2="10"/><line x1="12" y1="10" x2="4" y2="14"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="10" x2="20" y2="14"/></svg> },
    { key: 'dati',     label: 'Dati',              icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg> },
    { key: 'notifiche', label: 'Notifiche',        icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
    { key: 'delivery', label: 'Delivery Room',     icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="16 3 12 7 8 3"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg> },
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
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--brand-800)' }}>Configurazione</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Gestione centralizzata del portale</div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', border: 'none', borderBottom: tab === t.key ? '2.5px solid var(--brand-800)' : '2.5px solid transparent', background: 'transparent', color: tab === t.key ? 'var(--brand-800)' : '#64748b', fontWeight: tab === t.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: -1 }}>
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

        {/* WORKFLOW */}
        {tab === 'workflow' && (
          <WorkflowTab WfEditorModal={WfEditorModal} />
        )}

        {/* RISORSE */}
        {tab === 'risorse' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Gestione Risorse</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Clicca su una risorsa per modificarla.</div>
              </div>
              {risorseSubTab === 'elenco' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input value={searchRisorse} onChange={e => setSearchRisorse(e.target.value)}
                      placeholder="Cerca risorsa…"
                      style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', width: 160, background: '#f8fafc', color: '#0f172a', transition: 'border-color 0.15s' }}
                      onFocus={e => e.target.style.borderColor = '#185FA5'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                  <Btn onClick={() => { setStaffEditTarget(null); setShowManageStaff(true); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    Nuova risorsa
                  </Btn>
                </div>
              )}
            </div>

            {/* Sotto-tab */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', marginBottom: 4 }}>
              {[
                { key: 'elenco', label: 'Elenco', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg> },
                { key: 'ruoli', label: 'Ruoli', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h3a1 1 0 0 0 1-1V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-3a1 1 0 0 0-1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2a1 1 0 0 0-1-1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/></svg> },
                { key: 'team', label: 'Team sviluppo', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg> },
              ].map(t => (
                <button key={t.key} onClick={() => setRisorseSubTab(t.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: 'none', borderBottom: risorseSubTab === t.key ? '2.5px solid var(--brand-800)' : '2.5px solid transparent', background: 'transparent', color: risorseSubTab === t.key ? 'var(--brand-800)' : '#64748b', fontWeight: risorseSubTab === t.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* Elenco risorse */}
            {risorseSubTab === 'elenco' && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ruolo</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.filter(s => {
                        if (!searchRisorse.trim()) return true;
                        const q = searchRisorse.toLowerCase();
                        return (s.nome + ' ' + s.cognome).toLowerCase().includes(q) || (s.cognome + ' ' + s.nome).toLowerCase().includes(q) || s.ruolo?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
                      }).map(s => (
                      <tr key={s.id}
                        onClick={() => { setStaffEditTarget(s); setShowManageStaff(true); }}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f0f7ff'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 16px', fontWeight: 500, color: '#0f172a' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E6F1FB', color: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                              {`${s.cognome?.[0] || ''}${s.nome?.[0] || ''}`.toUpperCase()}
                            </div>
                            {s.cognome} {s.nome}
                          </div>
                        </td>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>{s.ruolo || '—'}</td>
                        <td style={{ padding: '10px 16px', color: '#64748b', fontSize: 12 }}>{s.email}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                          {s.is_admin ? <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>Admin</span> : <span style={{ color: '#e2e8f0', fontSize: 18 }}>—</span>}
                        </td>
                        {/* Pulsante permessi — solo per non-admin */}
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          {!s.is_admin && (
                            <button onClick={e => { e.stopPropagation(); setPermessiTarget(s); }}
                              title="Gestisci permessi"
                              style={{ background: 'none', border: '0.5px solid #e2e8f0', borderRadius: 7, cursor: 'pointer', padding: '4px 8px', color: '#94a3b8', transition: 'all 0.15s', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              onMouseOver={e => { e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = '#0054a6'; e.currentTarget.style.background = '#eff6ff'; }}
                              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.background = 'none'; }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                              <span style={{ fontSize: 11, fontWeight: 500 }}>Permessi</span>
                            </button>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12 }}>›</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ruoli */}
            {risorseSubTab === 'ruoli' && <RuoliConfig />}

            {/* Team sviluppo */}
            {risorseSubTab === 'team' && <TeamConfig />}
          </div>
        )}

        {/* CLIENTI */}
        {tab === 'clienti' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Gestione Clienti</div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Clicca su un cliente per modificarlo.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input value={searchClienti} onChange={e => setSearchClienti(e.target.value)}
                    placeholder="Cerca cliente…"
                    style={{ paddingLeft: 30, paddingRight: 10, paddingTop: 6, paddingBottom: 6, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12, outline: 'none', fontFamily: 'inherit', width: 160, background: '#f8fafc', color: '#0f172a', transition: 'border-color 0.15s' }}
                    onFocus={e => e.target.style.borderColor = '#185FA5'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </div>
                <Btn onClick={() => { setClientEditTarget(null); setShowClientModal(true); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>
                  Inserisci cliente
                </Btn>
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cliente</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Codice</th>
                    <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commesse attive</th>
                    <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PM</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {clients.filter(c => {
                      if (!searchClienti.trim()) return true;
                      const q = searchClienti.toLowerCase();
                      return c.nome_progetto?.toLowerCase().includes(q) || c.pm_name?.toLowerCase().includes(q) || c.codice_cliente?.toLowerCase().includes(q);
                    }).map(c => {
                    const attive = (c.commesse || []).filter(co => co.attiva !== false).length;
                    return (
                      <tr key={c.id}
                        onClick={() => { setClientEditTarget(c); setShowClientModal(true); }}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f0f7ff'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <td style={{ padding: '10px 16px', fontWeight: 500, color: '#0f172a' }}>{c.nome_progetto}</td>
                        <td style={{ padding: '10px 16px' }}>
                          {c.codice_cliente
                            ? <span style={{ fontSize: 11, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', background: '#f1f5f9', color: '#475569', borderRadius: 4, padding: '2px 7px', border: '0.5px solid #e2e8f0' }}>{c.codice_cliente}</span>
                            : <span style={{ color: '#e2e8f0' }}>—</span>}
                        </td>
                        <td style={{ padding: '10px 16px', textAlign: 'center', color: attive > 0 ? '#2563eb' : '#94a3b8', fontWeight: attive > 0 ? 700 : 400 }}>{attive}</td>
                        <td style={{ padding: '10px 16px', color: '#64748b' }}>{c.pm_name || '—'}</td>
                        <td style={{ padding: '10px 12px', color: '#94a3b8', fontSize: 12 }}>›</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DATI */}
        {tab === 'organigramma' && (
          <TabOrganigramma staff={staff} orgStaff={orgStaff} setOrgStaff={setOrgStaff} orgSaving={orgSaving} setOrgSaving={setOrgSaving} onReload={onReload} />
        )}

        {tab === 'skills' && (
          <div style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, maxWidth: 900 }}>

              {/* ── COLONNA SINISTRA: lista folder ── */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>Folder prodotto</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                  {Object.keys(skillsConfig).map(folder => (
                    <div key={folder} onClick={() => setSkillsFolder(folder)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', border: '0.5px solid', transition: 'all 0.12s',
                        background: skillsFolder === folder ? 'var(--brand-50, #eff6ff)' : '#fff',
                        borderColor: skillsFolder === folder ? 'var(--brand-200, #bfdbfe)' : '#e2e8f0',
                        color: skillsFolder === folder ? 'var(--brand-800)' : '#0f172a',
                        fontWeight: skillsFolder === folder ? 600 : 400,
                      }}>
                      <span style={{ fontSize: 13 }}>{folder}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: skillsFolder === folder ? 'var(--brand-700)' : '#94a3b8' }}>{(skillsConfig[folder] || []).length}</span>
                        <button onClick={async e => {
                          e.stopPropagation();
                          if ((skillsConfig[folder] || []).length > 0) { alert(`Non puoi eliminare "${folder}": contiene ${skillsConfig[folder].length} skill.`); return; }
                          if (!window.confirm(`Eliminare il folder "${folder}"?`)) return;
                          const { error } = await supabase.from('skills_settings').delete().eq('category', folder);
                          if (!error) {
                            setSkillsConfig(prev => { const n = { ...prev }; delete n[folder]; return n; });
                            if (skillsFolder === folder) setSkillsFolder(Object.keys(skillsConfig).filter(f => f !== folder)[0] || '');
                          }
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '1px 3px', lineHeight: 1, fontSize: 13 }}
                          onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                          onMouseOut={e => e.currentTarget.style.color = '#fca5a5'}>
                          <i className="ti ti-trash" style={{ fontSize: 12 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Aggiungi folder */}
                <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Nuovo folder</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
                      placeholder="es. InfoBusiness"
                      onKeyDown={async e => { if (e.key === 'Enter') { e.preventDefault(); await addFolder(); } }}
                      style={{ flex: 1, fontSize: 12, padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none', fontFamily: 'inherit', background: '#fff' }} />
                    <button onClick={async () => {
                      if (!newFolderName.trim()) return;
                      const name = newFolderName.trim();
                      if (skillsConfig[name]) { alert('Folder già esistente'); return; }
                      setSkillSaving(true);
                      // Inseriamo una riga placeholder per creare il folder (verrà rimossa se non si aggiungono skill)
                      setSkillsConfig(prev => ({ ...prev, [name]: [] }));
                      setSkillsFolder(name);
                      setNewFolderName('');
                      setSkillSaving(false);
                    }} disabled={!newFolderName.trim()}
                      style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: newFolderName.trim() ? 'var(--brand-800)' : '#e2e8f0', color: '#fff', fontSize: 12, fontWeight: 600, cursor: newFolderName.trim() ? 'pointer' : 'default' }}>
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* ── COLONNA DESTRA: skill del folder selezionato ── */}
              <div>
                {!skillsFolder ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Seleziona un folder</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-800)', flex: 1 }}>{skillsFolder}</div>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{(skillsConfig[skillsFolder] || []).length} skill</span>
                    </div>

                    {/* Lista skill */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                      {(skillsConfig[skillsFolder] || []).length === 0 && (
                        <div style={{ padding: '20px', textAlign: 'center', border: '0.5px dashed #e2e8f0', borderRadius: 8, color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>Nessuna skill — aggiungine una sotto</div>
                      )}
                      {(skillsConfig[skillsFolder] || []).map((skill, idx) => (
                        <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: '0.5px solid #e2e8f0', background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          <span style={{ fontSize: 13, color: '#0f172a', flex: 1 }}>{skill}</span>
                          <button onClick={async () => {
                            if (!window.confirm(`Eliminare la skill "${skill}"?`)) return;
                            const { error } = await supabase.from('skills_settings').delete().eq('category', skillsFolder).eq('skill_name', skill);
                            if (!error) setSkillsConfig(prev => ({ ...prev, [skillsFolder]: prev[skillsFolder].filter(s => s !== skill) }));
                          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', padding: '2px 4px', lineHeight: 1 }}
                            onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                            onMouseOut={e => e.currentTarget.style.color = '#fca5a5'}>
                            <i className="ti ti-trash" style={{ fontSize: 13 }} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Aggiungi skill */}
                    <div style={{ background: '#f8fafc', border: '0.5px solid #e2e8f0', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Aggiungi skill a <strong>{skillsFolder}</strong></div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={newSkillName} onChange={e => setNewSkillName(e.target.value)}
                          placeholder="Nome skill..."
                          onKeyDown={async e => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            if (!newSkillName.trim() || skillSaving) return;
                            const name = newSkillName.trim();
                            if ((skillsConfig[skillsFolder] || []).includes(name)) { alert('Skill già presente'); return; }
                            setSkillSaving(true);
                            const { error } = await supabase.from('skills_settings').insert({ category: skillsFolder, skill_name: name });
                            if (!error) { setSkillsConfig(prev => ({ ...prev, [skillsFolder]: [...(prev[skillsFolder] || []), name] })); setNewSkillName(''); }
                            else alert('Errore: ' + error.message);
                            setSkillSaving(false);
                          }}
                          style={{ flex: 1, fontSize: 13, padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, outline: 'none', fontFamily: 'inherit', background: '#fff' }} />
                        <button onClick={async () => {
                          if (!newSkillName.trim() || skillSaving) return;
                          const name = newSkillName.trim();
                          if ((skillsConfig[skillsFolder] || []).includes(name)) { alert('Skill già presente'); return; }
                          setSkillSaving(true);
                          const { error } = await supabase.from('skills_settings').insert({ category: skillsFolder, skill_name: name });
                          if (!error) { setSkillsConfig(prev => ({ ...prev, [skillsFolder]: [...(prev[skillsFolder] || []), name] })); setNewSkillName(''); }
                          else alert('Errore: ' + error.message);
                          setSkillSaving(false);
                        }} disabled={!newSkillName.trim() || skillSaving}
                          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: newSkillName.trim() ? 'var(--brand-800)' : '#e2e8f0', color: '#fff', fontSize: 13, fontWeight: 600, cursor: newSkillName.trim() ? 'pointer' : 'default' }}>
                          {skillSaving ? '...' : 'Aggiungi'}
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>Premi Invio o clicca Aggiungi</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'dati' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ marginBottom: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Gestione Dati</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Import bolle, consuntivi e clienti da file Excel.</div>
            </div>

            {/* Sotto-tab */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', margin: '16px 0 24px' }}>
              {[
                { key: 'clienti', label: 'Import Clienti', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/></svg> },
                { key: 'bolle',   label: 'Import Bolle',    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
                { key: 'consuntivi', label: 'Import Consuntivi', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              ].map(t => (
                <button key={t.key} onClick={() => setDatiSubTab(t.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', border: 'none', borderBottom: datiSubTab === t.key ? '2.5px solid var(--brand-800)' : '2.5px solid transparent', background: 'transparent', color: datiSubTab === t.key ? 'var(--brand-800)' : '#64748b', fontWeight: datiSubTab === t.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {datiSubTab === 'clienti'    && <TabClienti />}
            {datiSubTab === 'bolle'      && <TabBolle />}
            {datiSubTab === 'consuntivi' && <TabConsuntivi />}
          </div>
        )}

        {/* NOTIFICHE */}
        {tab === 'notifiche' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-950, #0f172a)' }}>Configurazione notifiche</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500, #64748b)', marginTop: 3 }}>Abilita o disabilita i tipi di evento che possono generare notifiche per tutti gli utenti.</div>
            </div>
            <NotificheConfigGlobale />
          </div>
        )}

        {/* DELIVERY ROOM */}
        {tab === 'delivery' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Scaletta di riunione</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>Configura i punti default della scaletta settimanale. Ogni settimana la Delivery Room la proporrà automaticamente.</div>
            </div>
            <ScalettaDefaultConfig />
          </div>
        )}
      </div>

      {/* Modali */}
      {showManageStaff && (
        <ManageStaffModal
          staff={staff}
          isAdmin={true}
          initialEditTarget={staffEditTarget}
          initialShowNew={staffEditTarget === null}
          onClose={() => { setShowManageStaff(false); setStaffEditTarget(null); onReload && onReload(); }}
        />
      )}
      {permessiTarget && (
        <PermessiPanel
          staffObj={permessiTarget}
          onSave={(nuoviPermessi) => {
            setPermessiTarget(null);
            onReload && onReload();
          }}
          onCancel={() => setPermessiTarget(null)}
        />
      )}
      {showClientModal && clientEditTarget && (
        <EditClientModal
          client={clientEditTarget}
          staff={staff}
          matrix={{}}
          clients={clients}
          onClose={() => { setShowClientModal(false); setClientEditTarget(null); onReload && onReload(); }}
        />
      )}
      {showClientModal && !clientEditTarget && (
        <ClientModal
          staff={staff}
          matrix={{}}
          onClose={() => { setShowClientModal(false); onReload && onReload(); }}
        />
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