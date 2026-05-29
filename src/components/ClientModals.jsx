import React, { useState, useEffect } from 'react';
import { DatePicker } from './DatePicker.jsx';
import { supabase } from '../supabase.js';
import { REPARTI_STANDARD, SKILLS_FOLDERS, DEFAULT_SKILLS } from '../constants.js';
import { getAvatarColor, getInitials, staffKey, staffLabel, workingDays } from '../utils.js';
import { ProdottiSelector, ProdottiBadges } from './ProdottiSelector.jsx';
import { creaTaskStandard } from './ProgettiView.jsx';
import * as XLSX from 'xlsx';

// ── EmailJS config ───────────────────────────────────────────
const EMAILJS_SERVICE  = 'service_67j6e7k';
const EMAILJS_TEMPLATE = 'template_f3hq3fr';
const EMAILJS_KEY      = '4NYSQD6icz1YRnkZw';

async function sendMailCommessa({ destinatario, testo, nomeCommessa, staff }) {
  const s = (staff || []).find(x => `${x.cognome} ${x.nome}` === destinatario);
  if (!s?.email) { console.warn('Email non trovata per:', destinatario); return; }
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:  EMAILJS_SERVICE,
        template_id: EMAILJS_TEMPLATE,
        user_id:     EMAILJS_KEY,
        template_params: {
          to_email: s.email,
          name:     s.nome,
          commessa: nomeCommessa,
          message:  `${testo}

Commessa: ${nomeCommessa}

Apri il portale: https://react-efzysfuq.stackblitz.io`,
        },
      }),
    });
    console.log('EmailJS:', res.status, res.status === 200 ? 'OK' : await res.text());
  } catch (e) { console.warn('Errore invio mail:', e); }
}


// ─────────────────────────────────────────────
// MultiSelectDropdown riutilizzabile
// ─────────────────────────────────────────────
function MultiSelectDropdown({ options, selected, onChange, placeholder, accentColor, accentBg, accentBorder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };

  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()));
  const selectedLabels = options.filter(o => selected.includes(o.value)).map(o => o.label);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Pill area */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '5px 7px', minHeight: '32px', border: `1px solid ${selected.length > 0 ? accentBorder : '#e2e8f0'}`, borderRadius: '8px', background: '#f8fafc', marginBottom: '4px' }}>
        {selected.length === 0
          ? <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>{placeholder}</span>
          : selectedLabels.map(label => (
            <span key={label} onClick={() => toggle(options.find(o => o.label === label)?.value)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, color: accentColor, background: '#fff', border: `0.5px solid ${accentBorder}`, borderRadius: '20px', padding: '2px 8px', cursor: 'pointer' }}>
              {label}
              <span style={{ fontSize: '10px', opacity: 0.5 }}>×</span>
            </span>
          ))
        }
      </div>
      {/* Trigger */}
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 9px', border: `1px solid ${open ? 'var(--brand-700)' : '#e2e8f0'}`, borderRadius: '8px', background: '#fff', cursor: 'pointer', userSelect: 'none' }}>
        <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input value={search} onChange={e => { e.stopPropagation(); setSearch(e.target.value); if (!open) setOpen(true); }} onClick={e => e.stopPropagation()} placeholder="Cerca..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', flex: 1, color: '#0f172a', fontFamily: 'inherit' }} />
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 200, maxHeight: '200px', overflowY: 'auto' }}>
          {filtered.length === 0 && <div style={{ padding: '10px 12px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nessun risultato</div>}
          {filtered.map(o => {
            const sel = selected.includes(o.value);
            return (
              <div key={o.value} onClick={() => toggle(o.value)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', cursor: 'pointer', background: sel ? accentBg : '#fff', transition: 'background 0.1s' }}
                onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseOut={e => { if (!sel) e.currentTarget.style.background = '#fff'; }}>
                <div style={{ width: 14, height: 14, borderRadius: '3px', flexShrink: 0, border: `2px solid ${sel ? accentColor : '#cbd5e1'}`, background: sel ? accentColor : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sel && <span style={{ color: '#fff', fontSize: '9px', lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontSize: '12px', fontWeight: sel ? 500 : 400, color: sel ? accentColor : '#374151', flex: 1 }}>{o.label}</span>
                {o.sub && <span style={{ fontSize: '10px', color: '#94a3b8' }}>{o.sub}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// BolleDropdown — dropdown con pill e badge chiusa
// ─────────────────────────────────────────────
function BolleDropdown({ bolleDisponibili, bolleAssociate, onToggle, consuntiviPerBolla = {} }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = React.useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isBollaChiusa = (b) => {
    const giorniDisp = b.ore_previste ? b.ore_previste / 8 : (b.giorni_disponibili || 0);
    const cb = consuntiviPerBolla[b.codice] || { oreTec: 0 };
    return giorniDisp > 0 && (cb.oreTec / 8) >= giorniDisp;
  };

  const filtered = bolleDisponibili.filter(b =>
    !search ||
    b.codice.toLowerCase().includes(search.toLowerCase()) ||
    (b.descrizione || '').toLowerCase().includes(search.toLowerCase())
  );

  const selectedBolle = bolleDisponibili.filter(b => bolleAssociate.includes(b.id));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Pill area */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', padding: '5px 7px', minHeight: '32px', border: `1px solid ${bolleAssociate.length > 0 ? '#bfdbfe' : '#e2e8f0'}`, borderRadius: '8px', background: '#f8fafc', marginBottom: '4px' }}>
        {selectedBolle.length === 0
          ? <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', alignSelf: 'center' }}>Nessuna bolla selezionata</span>
          : selectedBolle.map(b => {
            const chiusa = isBollaChiusa(b);
            return (
              <span key={b.id} onClick={() => onToggle(b.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 500, color: chiusa ? '#0F6E56' : '#0C447C', background: '#fff', border: `0.5px solid ${chiusa ? '#9FE1CB' : '#B5D4F4'}`, borderRadius: '20px', padding: '2px 8px', cursor: 'pointer', opacity: chiusa ? 0.55 : 1 }}>
                <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '10px' }}>{b.codice}</span>
                {chiusa && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                <span style={{ fontSize: '10px', opacity: 0.5 }}>×</span>
              </span>
            );
          })
        }
      </div>
      {/* Trigger search */}
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 9px', border: `1px solid ${open ? 'var(--brand-700)' : '#e2e8f0'}`, borderRadius: '8px', background: '#fff', cursor: 'pointer', userSelect: 'none' }}>
        <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input value={search} onChange={e => { e.stopPropagation(); setSearch(e.target.value); if (!open) setOpen(true); }} onClick={e => e.stopPropagation()} placeholder="Cerca per codice o descrizione..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', flex: 1, color: '#0f172a', fontFamily: 'inherit' }} />
        {bolleDisponibili.length > 0 && <span style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0 }}>{bolleAssociate.length}/{bolleDisponibili.length}</span>}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 200, maxHeight: '220px', overflowY: 'auto' }}>
          {filtered.length === 0 && <div style={{ padding: '10px 12px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nessun risultato</div>}
          {filtered.map(b => {
            const sel = bolleAssociate.includes(b.id);
            const chiusa = isBollaChiusa(b);
            const g = b.ore_previste ? (b.ore_previste / 8).toFixed(1) : (b.giorni_disponibili || 0).toFixed(1);
            return (
              <div key={b.id} onClick={() => onToggle(b.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 12px', cursor: 'pointer', background: sel ? (chiusa ? '#f0fdf8' : '#eff6ff') : '#fff', opacity: chiusa ? 0.7 : 1, transition: 'background 0.1s' }}
                onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseOut={e => { if (!sel) e.currentTarget.style.background = '#fff'; }}>
                <div style={{ width: 14, height: 14, borderRadius: '3px', flexShrink: 0, border: `2px solid ${sel ? (chiusa ? '#0F6E56' : '#0054a6') : '#cbd5e1'}`, background: sel ? (chiusa ? '#0F6E56' : '#0054a6') : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sel && <span style={{ color: '#fff', fontSize: '9px', lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '11px', fontWeight: 700, color: sel ? (chiusa ? '#0F6E56' : '#0054a6') : '#475569', flexShrink: 0 }}>{b.codice}</span>
                <span style={{ fontSize: '11px', color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.descrizione || '—'}</span>
                {chiusa && <span style={{ fontSize: '9px', background: '#E1F5EE', color: '#085041', border: '0.5px solid #9FE1CB', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>chiusa</span>}
                <span style={{ fontSize: '11px', fontWeight: 500, color: sel ? (chiusa ? '#0F6E56' : '#0054a6') : '#94a3b8', flexShrink: 0 }}>{g}g</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// SelectDropdown inline
// ─────────────────────────────────────────────
function SelectDropdown({ options = [], value, onChange, placeholder = 'Scegli...', disabled = false }) {
  const [sdOpen, setSdOpen] = React.useState(false);
  const [sdSearch, setSdSearch] = React.useState('');
  const sdRef = React.useRef(null);
  const [dropStyle, setDropStyle] = React.useState({});
  React.useEffect(() => {
    const h = (e) => { if (sdRef.current && !sdRef.current.contains(e.target)) { setSdOpen(false); setSdSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  React.useEffect(() => {
    if (sdOpen && sdRef.current) {
      const rect = sdRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const showAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
      setDropStyle(showAbove
        ? { position: 'fixed', left: rect.left, width: rect.width, bottom: window.innerHeight - rect.top + 4, zIndex: 9999 }
        : { position: 'fixed', left: rect.left, width: rect.width, top: rect.bottom + 4, zIndex: 9999 });
    }
  }, [sdOpen]);
  const filtered = options.filter(o => !sdSearch || (o.label ?? o).toString().toLowerCase().includes(sdSearch.toLowerCase()));
  const selLabel = options.find(o => (o.value ?? o) === value)?.label ?? value ?? '';
  return (
    <div ref={sdRef} style={{ position: 'relative' }}>
      <div onClick={() => !disabled && setSdOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${sdOpen ? 'var(--brand-700)' : '#e2e8f0'}`, padding: '6px 2px 8px', cursor: disabled ? 'default' : 'pointer', minHeight: 34, background: 'transparent' }}>
        <span style={{ fontSize: '13px', color: selLabel ? '#1e293b' : '#94a3b8', fontStyle: selLabel ? 'normal' : 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selLabel || placeholder}</span>
        {!disabled && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: sdOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}><polyline points="6 9 12 15 18 9"/></svg>}
      </div>
      {sdOpen && (
        <div style={{ ...dropStyle, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', overflow: 'hidden', maxWidth: 500 }}>
          <div style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9' }}>
            <input value={sdSearch} onChange={e => { e.stopPropagation(); setSdSearch(e.target.value); }} onClick={e => e.stopPropagation()} placeholder="Cerca..." autoFocus
              style={{ width: '100%', padding: '5px 8px', fontSize: '12px', border: '0.5px solid #e2e8f0', borderRadius: 6, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.map((o, i) => { const val = o.value ?? o; const label = o.label ?? o; const isSel = val === value; return (
              <div key={i} onClick={() => { onChange(val); setSdOpen(false); setSdSearch(''); }}
                style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', background: isSel ? '#eff6ff' : '#fff', color: isSel ? 'var(--brand-800)' : '#1e293b', fontWeight: isSel ? 500 : 400 }}
                onMouseOver={e => { if (!isSel) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseOut={e => { if (!isSel) e.currentTarget.style.background = '#fff'; }}>{label}</div>
            ); })}
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
// KPI Economico Sidebar — versione compatta per la sidebar commessa
function KpiEconomicoSidebar({ commessaId, ordiniCommessa }) {
  const [costo, setCosto] = useState(0);
  const [loadingKpi, setLoadingKpi] = useState(false);
  const COSTO_GIORNO = 380;

  useEffect(() => {
    if (!commessaId) { setCosto(0); return; }
    setLoadingKpi(true);
    supabase.from('commessa_bolle').select('bolla_id, bolle_lavoro(codice)').eq('commessa_id', commessaId)
      .then(async ({ data: cb }) => {
        const codici = (cb || []).map(r => r.bolle_lavoro?.codice).filter(Boolean);
        if (codici.length === 0) { setCosto(0); setLoadingKpi(false); return; }
        const { data: cons } = await supabase.from('consuntivi_globali').select('ore_tecniche').in('codice_bolla', codici);
        const totOre = (cons || []).reduce((s, c) => s + (parseFloat(c.ore_tecniche) || 0), 0);
        setCosto((totOre / 8) * COSTO_GIORNO);
        setLoadingKpi(false);
      });
  }, [commessaId]);

  const valore = ordiniCommessa.reduce((s, o) => s + (parseFloat(o.importo) || 0), 0);
  const margine = valore - costo;
  const marginePerc = valore > 0 ? (margine / valore * 100) : null;
  const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmtNum = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
  const margineColor = margine >= 0 && valore > 0 ? '#16a34a' : valore > 0 ? '#dc2626' : '#94a3b8';
  const costoPct = valore > 0 ? Math.min(100, (costo / valore) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Valore</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#185FA5', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{valore > 0 ? fmtEur(valore) : '—'}</span>
          {valore > 0 && <div style={{ fontSize: '9px', color: '#94a3b8' }}>da ordini</div>}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Costo</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#D85A30', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{loadingKpi ? '...' : costo > 0 ? fmtEur(costo) : '—'}</span>
          {costo > 0 && <div style={{ fontSize: '9px', color: '#94a3b8' }}>{fmtNum(costo / COSTO_GIORNO)}g</div>}
        </div>
      </div>
      {valore > 0 && costo > 0 && (
        <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden', margin: '2px 0' }}>
          <div style={{ width: `${costoPct}%`, height: '100%', background: '#D85A30', borderRadius: 2 }} />
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '0.5px solid #e2e8f0', marginTop: '2px' }}>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>Margine</span>
        <span style={{ fontSize: '13px', fontWeight: 700, color: margineColor, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
          {marginePerc !== null ? `${fmtNum(marginePerc)}%` : '—'}
        </span>
      </div>
    </div>
  );
}

// KPI Economico Commessa
// ─────────────────────────────────────────────
function KpiEconomicoCommessa({ commessaId, ordiniCommessa }) {
  const [costo, setCosto] = useState(0);
  const [loadingKpi, setLoadingKpi] = useState(false);

  const COSTO_GIORNO = 380;

  useEffect(() => {
    if (!commessaId) { setCosto(0); return; }
    setLoadingKpi(true);
    // Carica bolle associate alla commessa, poi consuntivi per quelle bolle
    supabase.from('commessa_bolle').select('bolla_id, bolle_lavoro(codice)').eq('commessa_id', commessaId)
      .then(async ({ data: cb }) => {
        const codici = (cb || []).map(r => r.bolle_lavoro?.codice).filter(Boolean);
        if (codici.length === 0) { setCosto(0); setLoadingKpi(false); return; }
        const { data: cons } = await supabase.from('consuntivi_globali').select('ore_tecniche').in('codice_bolla', codici);
        const totOre = (cons || []).reduce((s, c) => s + (parseFloat(c.ore_tecniche) || 0), 0);
        setCosto((totOre / 8) * COSTO_GIORNO);
        setLoadingKpi(false);
      });
  }, [commessaId]);

  const valore = ordiniCommessa.reduce((s, o) => s + (parseFloat(o.importo) || 0), 0);
  const margine = valore - costo;
  const marginePerc = valore > 0 ? (margine / valore * 100) : null;
  const fmtEur = (n) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmtNum = (n, d = 1) => (Math.round(n * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
  const margineColor = margine >= 0 ? '#9FE1CB' : '#fca5a5';
  const barColor = margine >= 0 ? '#5DCAA5' : '#F09595';

  return (
    <div style={{ background: '#0d2240', borderRadius: '10px', padding: '12px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr', gap: 0, alignItems: 'center' }}>
      {/* Icona label */}
      <div style={{ paddingRight: '16px', borderRight: '0.5px solid rgba(255,255,255,0.1)', marginRight: '16px' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B5D4F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', marginBottom: '3px' }}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <div style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap' }}>Economico</div>
      </div>
      {/* Valore */}
      <div style={{ padding: '0 14px', borderRight: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.42)', marginBottom: '3px' }}>Valore commessa</div>
        <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{valore > 0 ? fmtEur(valore) : '—'}</div>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: '2px' }}>da ordini cliente</div>
      </div>
      {/* Costo */}
      <div style={{ padding: '0 14px', borderRight: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.42)', marginBottom: '3px' }}>Costo manodopera</div>
        <div style={{ fontSize: '16px', fontWeight: 500, color: '#85B7EB', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{loadingKpi ? '...' : costo > 0 ? fmtEur(costo) : '—'}</div>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: '2px' }}>{costo > 0 ? `${fmtNum(costo / COSTO_GIORNO)}g · ${COSTO_GIORNO} €/g` : 'da consuntivi'}</div>
        {valore > 0 && costo > 0 && (
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '5px' }}>
            <div style={{ width: `${Math.min(100, (costo / valore) * 100)}%`, height: '100%', background: '#85B7EB', borderRadius: '2px' }} />
          </div>
        )}
      </div>
      {/* Margine */}
      <div style={{ paddingLeft: '14px' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.42)', marginBottom: '3px' }}>Margine</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <div style={{ fontSize: '16px', fontWeight: 500, color: marginePerc !== null ? margineColor : 'rgba(255,255,255,0.3)', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
            {marginePerc !== null ? `${fmtNum(marginePerc)}%` : '—'}
          </div>
          {margine !== 0 && valore > 0 && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{fmtEur(margine)}</div>}
        </div>
        {marginePerc !== null && (
          <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginTop: '5px' }}>
            <div style={{ width: `${Math.min(100, Math.abs(marginePerc))}%`, height: '100%', background: barColor, borderRadius: '2px' }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// OrdineForm inline
// ─────────────────────────────────────────────
function OrdineForm({ onSave, onCancel, bolleDisponibili = [], bolleGiaAssegnate = [] }) {
  const [codice, setCodice] = useState('');
  const [numero, setNumero] = useState('');
  const [data, setData] = useState('');
  const [importo, setImporto] = useState('');
  const [bolleSelezionate, setBolleSelezionate] = useState([]);
  const [bolleOpen, setBolleOpen] = useState(false);
  const [bolleSearch, setBolleSearch] = useState('');
  const bolleRef = React.useRef(null);

  React.useEffect(() => {
    const h = (e) => { if (bolleRef.current && !bolleRef.current.contains(e.target)) setBolleOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Bolle senza ordine assegnato (libere) tra quelle associate alla commessa
  const bolleLibere = bolleDisponibili.filter(b => !bolleGiaAssegnate.includes(b.id));
  const bolleFiltrate = bolleLibere.filter(b =>
    !bolleSearch || b.codice.toLowerCase().includes(bolleSearch.toLowerCase()) || (b.descrizione || '').toLowerCase().includes(bolleSearch.toLowerCase())
  );

  const toggleBolla = (id) => setBolleSelezionate(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = () => {
    if (!codice.trim() || !numero.trim()) return;
    onSave({
      codice: codice.trim().toUpperCase(),
      numero: numero.trim(),
      data: data || null,
      importo: parseFloat(String(importo).replace(',', '.')) || 0,
      bolleIds: bolleSelezionate,
    });
  };

  const canSave = codice.trim() && numero.trim();

  return (
    <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#0C447C', marginBottom: '10px' }}>Nuovo ordine</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Codice *</div>
          <input value={codice} onChange={e => setCodice(e.target.value)} placeholder="es. ABCDE" maxLength={5}
            style={{ width: '100%', fontSize: '13px', border: 'none', borderBottom: '1.5px solid #bfdbfe', background: 'transparent', padding: '3px 0 6px', outline: 'none', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.08em', boxSizing: 'border-box', textTransform: 'uppercase' }} autoFocus />
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Numero *</div>
          <input value={numero} onChange={e => setNumero(e.target.value)} placeholder="es. 42" maxLength={4}
            style={{ width: '100%', fontSize: '13px', border: 'none', borderBottom: '1.5px solid #bfdbfe', background: 'transparent', padding: '3px 0 6px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data</div>
          <DatePicker value={data} onChange={setData} />
        </div>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Importo €</div>
          <input value={importo} onChange={e => setImporto(e.target.value)} placeholder="es. 15000"
            style={{ width: '100%', fontSize: '13px', border: 'none', borderBottom: '1.5px solid #bfdbfe', background: 'transparent', padding: '3px 0 6px', outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Selezione bolle */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bolle associate a questo ordine</div>
        {/* Pill selezionate */}
        {bolleSelezionate.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
            {bolleSelezionate.map(id => {
              const b = bolleDisponibili.find(x => x.id === id);
              return b ? (
                <span key={id} onClick={() => toggleBolla(id)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#0C447C', background: '#fff', border: '0.5px solid #bfdbfe', borderRadius: 20, padding: '2px 8px', cursor: 'pointer', fontFamily: 'monospace' }}>
                  {b.codice} <span style={{ fontSize: 10, opacity: 0.5 }}>×</span>
                </span>
              ) : null;
            })}
          </div>
        )}
        {/* Dropdown bolle */}
        <div ref={bolleRef} style={{ position: 'relative' }}>
          <div onClick={() => setBolleOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', border: `1px solid ${bolleOpen ? '#185FA5' : '#bfdbfe'}`, borderRadius: 8, background: '#fff', cursor: 'pointer' }}>
            <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input value={bolleSearch} onChange={e => { e.stopPropagation(); setBolleSearch(e.target.value); if (!bolleOpen) setBolleOpen(true); }} onClick={e => e.stopPropagation()}
              placeholder={bolleLibere.length === 0 ? 'Nessuna bolla libera' : 'Cerca bolla...'}
              disabled={bolleLibere.length === 0}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, flex: 1, fontFamily: 'inherit' }} />
            <span style={{ fontSize: 10, color: '#94a3b8' }}>{bolleSelezionate.length}/{bolleLibere.length}</span>
          </div>
          {bolleOpen && bolleFiltrate.length > 0 && (
            <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 300, maxHeight: 180, overflowY: 'auto' }}>
              {bolleFiltrate.map(b => {
                const sel = bolleSelezionate.includes(b.id);
                const g = (b.giorni_disponibili || 0).toFixed(1);
                return (
                  <div key={b.id} onClick={() => toggleBolla(b.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', cursor: 'pointer', background: sel ? '#eff6ff' : '#fff' }}
                    onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseOut={e => { if (!sel) e.currentTarget.style.background = '#fff'; }}>
                    <div style={{ width: 13, height: 13, borderRadius: 3, border: `2px solid ${sel ? '#0054a6' : '#cbd5e1'}`, background: sel ? '#0054a6' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {sel && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0054a6', fontFamily: 'monospace', flexShrink: 0 }}>{b.codice}</span>
                    <span style={{ fontSize: 11, color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.descrizione || '—'}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{g}g</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {bolleLibere.length === 0 && bolleDisponibili.length > 0 && (
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>Tutte le bolle sono già assegnate a un ordine</div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button onClick={onCancel} style={{ padding: '5px 14px', borderRadius: '8px', border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Annulla</button>
        <button onClick={handleSave} disabled={!canSave} style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', background: canSave ? 'var(--brand-800)' : '#cbd5e1', color: '#fff', fontSize: '12px', fontWeight: 500, cursor: canSave ? 'pointer' : 'default' }}>Aggiungi</button>
      </div>
    </div>
  );
}

export function ProjectModal({ staff, clients, matrix, targetedEdit, onClose, onOpenProgetto }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCommessaId, setSelectedCommessaId] = useState('');
  const [f, setF] = useState({ nome_commessa: '', pm_commessa: '', team: [], data_inizio: '', data_fine: '', attiva: true, buffer_pianificazione: 0 });
  const [isEdit, setIsEdit] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progettoId, setProgettoId] = useState(null);
  const [checkingProgetto, setCheckingProgetto] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showOrdineToast, setShowOrdineToast] = useState(false);

  // Navigazione sidebar
  const [activeSection, setActiveSection] = useState('generale');

  const [hasConsulenza, setHasConsulenza] = useState(true);
  const [hasSviluppo, setHasSviluppo] = useState(false);

  const [bolleDisponibili, setBolleDisponibili] = useState([]);
  const [bolleAssociate, setBolleAssociate] = useState([]);
  const [consuntiviPerBolla, setConsuntiviPerBolla] = useState({});

  const [teamLavoro, setTeamLavoro] = useState([]);
  const [staffSviluppo, setStaffSviluppo] = useState([]);

  const [attivitaSviluppo, setAttivitaSviluppo] = useState([]);
  const [nuovaAttivita, setNuovaAttivita] = useState({ titolo: '', priorita: 'media', rif_pratica: '', data_rilascio: '', data_richiesta: '', bolla_id: '' });
  const [showNuovaAttivita, setShowNuovaAttivita] = useState(false);
  const [editingAttivita, setEditingAttivita] = useState(null);
  const [wfStati, setWfStati] = useState({});
  const [showChiusiAtt, setShowChiusiAtt] = useState(false);

  const [ordiniCommessa, setOrdiniCommessa] = useState([]);
  const [showOrdineForm, setShowOrdineForm] = useState(false);
  const [andamentoData, setAndamentoData] = useState({ giorniBolle: 0, oreTecniche: 0, orePagamento: 0, loadingAnd: false });
  const [ordinePopup, setOrdinePopup] = useState(null); // { ordine, bolle[] }

  useEffect(() => {
    if (targetedEdit) {
      setSelectedClientId(targetedEdit.clientId);
      setSelectedCommessaId(targetedEdit.commessaId || '');
      // Quando arriva da OrdiniRichiesteView con prefillOrdine, parte sempre da generale
      // L'ordine viene inserito automaticamente dopo il salvataggio
    }
  }, [targetedEdit]);

  const pms = staff.filter(s => s.ruolo === 'PM');
  const availableCommesse = clients.find(c => c.id === selectedClientId)?.commesse || [];

  useEffect(() => {
    supabase.from('staff').select('id, nome, cognome, ruolo, team_prodotto')
      .then(({ data }) => setStaffSviluppo(data || []));
  }, []);

  const [bolleOccupate, setBolleOccupate] = useState(new Set()); // bolla_id usate in altre commesse

  useEffect(() => {
    if (!selectedClientId) { setBolleDisponibili([]); setBolleOccupate(new Set()); return; }
    const client = clients.find(c => c.id === selectedClientId);
    const progettiIds = (client?.commesse || []).map(co => co.id).filter(Boolean);
    const queries = [];
    if (client?.codice_cliente)
      queries.push(supabase.from('bolle_lavoro').select('*').eq('codice_cliente', client.codice_cliente));
    if (progettiIds.length > 0)
      queries.push(supabase.from('bolle_lavoro').select('*').in('progetto_id', progettiIds));
    if (queries.length === 0) { setBolleDisponibili([]); return; }
    Promise.all(queries).then(async results => {
      const map = {};
      results.flatMap(r => r.data || []).forEach(b => { map[b.id] = b; });
      const bolle = Object.values(map);
      setBolleDisponibili(bolle);
      const codici = bolle.map(b => b.codice).filter(Boolean);
      if (codici.length > 0) {
        const { data: cons } = await supabase.from('consuntivi_globali').select('codice_bolla, ore_tecniche').in('codice_bolla', codici);
        const perBolla = {};
        (cons || []).forEach(c => {
          if (!perBolla[c.codice_bolla]) perBolla[c.codice_bolla] = { oreTec: 0 };
          perBolla[c.codice_bolla].oreTec += parseFloat(c.ore_tecniche) || 0;
        });
        setConsuntiviPerBolla(perBolla);
      }
      // Carica bolle già associate ad ALTRE commesse dello stesso cliente
      if (progettiIds.length > 0) {
        const { data: cb } = await supabase.from('commessa_bolle').select('bolla_id, commessa_id').in('commessa_id', progettiIds);
        const occupate = new Set(
          (cb || [])
            .filter(r => r.commessa_id !== selectedCommessaId) // escludi la commessa corrente
            .map(r => r.bolla_id)
        );
        setBolleOccupate(occupate);
      }
    });
  }, [selectedClientId, clients, selectedCommessaId]);

  useEffect(() => {
    if (selectedCommessaId) {
      const comm = availableCommesse.find(c => c.id === selectedCommessaId);
      if (comm) {
        setF({ nome_commessa: comm.nome_commessa, pm_commessa: comm.pm_commessa || '', team: comm.team || [], data_inizio: comm.data_inizio || '', data_fine: comm.data_fine || '', attiva: comm.attiva !== false, buffer_pianificazione: comm.buffer_pianificazione || 0 });
        setIsEdit(true);
        setIsEditMode(false);
        supabase.from('commesse').select('has_consulenza, has_sviluppo, buffer_pianificazione').eq('id', selectedCommessaId).single()
          .then(({ data: td }) => { if (td) { setHasConsulenza(td.has_consulenza !== false); setHasSviluppo(!!td.has_sviluppo); if (td.buffer_pianificazione != null) setF(p => ({ ...p, buffer_pianificazione: td.buffer_pianificazione })); } });
        setCheckingProgetto(true);
        supabase.from('progetti').select('id').eq('commessa_id', selectedCommessaId).single()
          .then(({ data }) => { setProgettoId(data?.id || null); setCheckingProgetto(false); });
        supabase.from('project_team').select('staff_name').eq('commessa_id', selectedCommessaId)
          .then(({ data }) => setTeamLavoro([...new Set((data || []).map(t => t.staff_name))]));
        supabase.from('attivita').select('id, titolo, priorita, data_rilascio, data_richiesta, colonna_id, bolla_id, rif_pratica, team_sviluppo, assegnata_a').eq('commessa_id', selectedCommessaId)
          .then(async ({ data: att }) => {
            if (!att || att.length === 0) { setAttivitaSviluppo([]); setWfStati({}); return; }
            setAttivitaSviluppo(att);
            const colonnaIds = [...new Set(att.map(a => a.colonna_id).filter(Boolean))];
            if (colonnaIds.length > 0) {
              const { data: cols } = await supabase.from('workflow_colonne').select('id, nome').in('id', colonnaIds);
              const map = {}; (cols || []).forEach(c => { map[c.id] = c.nome; });
              const sm = {}; att.forEach(a => { if (a.colonna_id) sm[a.id] = map[a.colonna_id] || '—'; });
              setWfStati(sm);
            }
          });
        supabase.from('ordini_cliente').select('*').eq('commessa_id', selectedCommessaId).order('codice')
          .then(({ data }) => setOrdiniCommessa(data || []));

        // Carica dati andamento
        setAndamentoData(p => ({ ...p, loadingAnd: true }));
        supabase.from('commessa_bolle').select('bolla_id, bolle_lavoro(codice, giorni_disponibili)').eq('commessa_id', selectedCommessaId)
          .then(async ({ data: cb }) => {
            const giorniBolle = (cb || []).reduce((s, r) => s + (parseFloat(r.bolle_lavoro?.giorni_disponibili) || 0), 0);
            const codici = (cb || []).map(r => r.bolle_lavoro?.codice).filter(Boolean);
            if (codici.length === 0) { setAndamentoData({ giorniBolle, oreTecniche: 0, orePagamento: 0, loadingAnd: false }); return; }
            const { data: cons } = await supabase.from('consuntivi_globali').select('ore_tecniche, ore_pagamento').in('codice_bolla', codici);
            const oreTecniche = (cons || []).reduce((s, c) => s + (parseFloat(c.ore_tecniche) || 0), 0);
            const orePagamento = (cons || []).reduce((s, c) => s + (parseFloat(c.ore_pagamento) || 0), 0);
            setAndamentoData({ giorniBolle, oreTecniche, orePagamento, loadingAnd: false });
          });
      }
    } else {
      setF({ nome_commessa: '', pm_commessa: '', team: [], data_inizio: '', data_fine: '', attiva: true, buffer_pianificazione: 0 });
      setHasConsulenza(true); setHasSviluppo(false);
      setIsEdit(false); setIsEditMode(true); setProgettoId(null);
      setBolleAssociate([]); setTeamLavoro([]);
      setAttivitaSviluppo([]); setWfStati({});
      setShowNuovaAttivita(false); setEditingAttivita(null);
      setOrdiniCommessa([]); setShowOrdineForm(false);
      setAndamentoData({ giorniBolle: 0, oreTecniche: 0, orePagamento: 0, loadingAnd: false });
    }
  }, [selectedCommessaId, selectedClientId]);

  useEffect(() => {
    if (!selectedCommessaId) { setBolleAssociate([]); return; }
    supabase.from('commessa_bolle').select('bolla_id').eq('commessa_id', selectedCommessaId)
      .then(({ data }) => setBolleAssociate([...new Set((data || []).map(b => b.bolla_id))]));
  }, [selectedCommessaId]);

  const handleAddOrdine = async (ordineData) => {
    if (!selectedCommessaId) return;
    try {
      const { bolleIds = [], ...rest } = ordineData;
      const { data: newOrd } = await supabase.from('ordini_cliente').insert({ ...rest, commessa_id: selectedCommessaId }).select().single();
      if (newOrd) {
        setOrdiniCommessa(prev => [...prev, newOrd]);
        if (bolleIds.length > 0) {
          // Aggiorna ordine_id sulle bolle selezionate
          await supabase.from('bolle_lavoro').update({ ordine_id: newOrd.id }).in('id', bolleIds);
          // Aggiunge le bolle a commessa_bolle se non già presenti
          const nuoveAssoc = bolleIds.filter(id => !bolleAssociate.includes(id));
          if (nuoveAssoc.length > 0) {
            await supabase.from('commessa_bolle').insert(
              nuoveAssoc.map(bid => ({ commessa_id: selectedCommessaId, bolla_id: bid, tipo: 'consulenza' }))
            );
            setBolleAssociate(prev => [...prev, ...nuoveAssoc]);
          }
          setBolleDisponibili(prev => prev.map(b => bolleIds.includes(b.id) ? { ...b, ordine_id: newOrd.id } : b));
        }
      }
      setShowOrdineForm(false);
    } catch (err) { alert('Errore: ' + err.message); }
  };

  const handleDeleteOrdine = async (id) => {
    if (!window.confirm('Eliminare questo ordine?')) return;
    await supabase.from('ordini_cliente').delete().eq('id', id);
    setOrdiniCommessa(prev => prev.filter(o => o.id !== id));
  };

  const handleChiudi = async () => {
    if (!window.confirm('Chiudere questa commessa?\n\nViene impostata come inattiva con data chiusura odierna.\nSe esiste un progetto collegato verrà bloccato in sola lettura.')) return;
    setIsClosing(true);
    const oggi = new Date().toISOString().slice(0, 10);
    try {
      await supabase.from('commesse').update({ attiva: false, data_fine: oggi, data_chiusura: oggi }).eq('id', selectedCommessaId);
      if (progettoId) await supabase.from('progetti').update({ chiuso: true }).eq('id', progettoId);
      onClose();
    } catch (err) { alert(err.message); } finally { setIsClosing(false); }
  };

  const handleSave = async () => {
    if (!selectedClientId || !f.nome_commessa) return;
    setIsSaving(true);
    try {
      let commId = selectedCommessaId;
      let prevTeamCons = [], prevTeamSvil = [], prevDataInizio = null, prevDataFine = null, prevPm = null;
      if (isEdit && commId) {
        const { data: prevComm } = await supabase.from('commesse').select('data_inizio, data_fine, pm_commessa').eq('id', commId).single();
        prevDataInizio = prevComm?.data_inizio || null; prevDataFine = prevComm?.data_fine || null; prevPm = prevComm?.pm_commessa || null;
        const { data: prevTeam } = await supabase.from('project_team').select('staff_name, tipo').eq('commessa_id', commId);
        prevTeamCons = (prevTeam || []).filter(t => !t.tipo || t.tipo === 'consulenza').map(t => t.staff_name);
        prevTeamSvil = (prevTeam || []).filter(t => t.tipo === 'sviluppo').map(t => t.staff_name);
      }
      const payload = { client_id: selectedClientId, nome_commessa: f.nome_commessa.trim(), pm_commessa: f.pm_commessa || null, data_inizio: f.data_inizio || null, data_fine: f.data_fine || null, attiva: f.attiva, has_consulenza: hasConsulenza, has_sviluppo: hasSviluppo, buffer_pianificazione: parseFloat(f.buffer_pianificazione) || 0 };
      if (isEdit) await supabase.from('commesse').update(payload).eq('id', commId);
      else { const { data } = await supabase.from('commesse').insert(payload).select().single(); commId = data.id; }

      await supabase.from('project_team').delete().eq('commessa_id', commId);
      if (teamLavoro.length > 0)
        await supabase.from('project_team').insert(teamLavoro.map(t => ({ commessa_id: commId, staff_name: t })));
      await supabase.from('commessa_bolle').delete().eq('commessa_id', commId);
      if (bolleAssociate.length > 0)
        await supabase.from('commessa_bolle').insert(bolleAssociate.map(bid => ({ commessa_id: commId, bolla_id: bid, tipo: 'consulenza' })));

      const nomeCommessa = f.nome_commessa.trim();
      const notificheInsert = [];
      const newPm = f.pm_commessa || null;
      if (newPm && newPm !== prevPm) notificheInsert.push({ destinatario: newPm, testo: `Sei stato nominato PM della commessa "${nomeCommessa}"`, tipo: 'commessa', riferimento_id: commId });
      const prevTeamAll = [...prevTeamCons, ...prevTeamSvil];
      teamLavoro.filter(s => !prevTeamAll.includes(s)).forEach(dest => notificheInsert.push({ destinatario: dest, testo: `Sei stato aggiunto al team di lavoro della commessa "${nomeCommessa}"`, tipo: 'commessa', riferimento_id: commId }));
      const dateChanged = isEdit && ((f.data_inizio || null) !== prevDataInizio || (f.data_fine || null) !== prevDataFine);
      if (dateChanged) {
        const fmtDate = d => d ? d.split('-').reverse().join('/') : '—';
        new Set([...teamLavoro]).forEach(dest => notificheInsert.push({ destinatario: dest, testo: `Date aggiornate per la commessa "${nomeCommessa}": ${fmtDate(f.data_inizio)} → ${fmtDate(f.data_fine)}`, tipo: 'commessa', riferimento_id: commId }));
      }
      if (notificheInsert.length > 0) {
        await supabase.from('notifiche').insert(notificheInsert);
        const clienteNome = clients?.find(c => c.id === selectedClientId)?.nome_progetto || '—';
        // Carica bolle associate fresche dal DB
        const { data: bolleDB } = await supabase.from('commessa_bolle')
          .select('bolla_id, bolle_lavoro(codice, descrizione)')
          .eq('commessa_id', commId);
        const bolleNomi = (bolleDB || []).map(b => b.bolle_lavoro?.codice + (b.bolle_lavoro?.descrizione ? ' – ' + b.bolle_lavoro.descrizione : '')).filter(Boolean);
        // Carica attività fresche dal DB
        const { data: attDB } = await supabase.from('attivita').select('titolo').eq('commessa_id', commId).limit(10);
        const attivitaList = (attDB || []).map(a => a.titolo).filter(Boolean);
        const extraInfo = {
          cliente:     clienteNome,
          team:        teamLavoro.length > 0 ? teamLavoro.join(', ') : '—',
          bolle:       bolleNomi.length > 0 ? bolleNomi.join(', ') : '—',
          data_inizio: f.data_inizio,
          data_fine:   f.data_fine,
          attivita:    attivitaList.length > 0 ? attivitaList.slice(0,5).join(', ') + (attivitaList.length > 5 ? ` e altre ${attivitaList.length - 5}...` : '') : '—',
        };
        console.log('extraInfo:', extraInfo);
        await Promise.all(notificheInsert.map(n => sendMailCommessa({ destinatario: n.destinatario, testo: n.testo, nomeCommessa, staff, extraInfo })));
      }
      // FIX 2: se arrivato da OrdiniRichiesteView, inserisce l'ordine nella nuova commessa
      if (targetedEdit?.prefillOrdine && commId) {
        const po = targetedEdit.prefillOrdine;
        const { data: newOrd } = await supabase.from('ordini_cliente').insert({
          commessa_id: commId,
          codice: po.codice_documento || 'ORD',
          numero: po.numero_ordine,
          data: po.data_ordine || null,
          importo: po.importo || 0,
        }).select().single();
        if (newOrd && po.bolle_ids?.length > 0) {
          await supabase.from('bolle_lavoro').update({ ordine_id: newOrd.id }).in('id', po.bolle_ids);
          // Aggiunge le bolle alla nuova commessa in commessa_bolle
          await supabase.from('commessa_bolle').insert(
            po.bolle_ids.map(bid => ({ commessa_id: commId, bolla_id: bid, tipo: 'consulenza' }))
          );
        }
        if (po.id) {
          await supabase.from('ordini_workflow').update({ stato: 'assegnato', commessa_id: commId }).eq('id', po.id);
        }
        // Mostra toast "Ordine pianificato" prima di chiudere
        setShowOrdineToast(true);
        await new Promise(r => setTimeout(r, 2200));
      }
      onClose();
    } catch (err) { alert(err.message); } finally { setIsSaving(false); }
  };

  const handleAddAttivita = async () => {
    if (!nuovaAttivita.titolo.trim() || !selectedCommessaId) return;
    try {
      const { data: wfData } = await supabase.from('workflows').select('id').ilike('nome', '%viluppo%').limit(1);
      let primaColonnaId = null;
      if (wfData && wfData.length > 0) {
        const { data: colData } = await supabase.from('workflow_colonne').select('id').eq('workflow_id', wfData[0].id).order('ordine').limit(1);
        primaColonnaId = colData?.[0]?.id || null;
      }
      const { data: inserted } = await supabase.from('attivita').insert({
        workflow_id: wfData?.[0]?.id || null, colonna_id: primaColonnaId, commessa_id: selectedCommessaId,
        titolo: nuovaAttivita.titolo.trim(), priorita: nuovaAttivita.priorita,
        rif_pratica: nuovaAttivita.rif_pratica || null, data_rilascio: nuovaAttivita.data_rilascio || null,
        bolla_id: nuovaAttivita.bolla_id || null, tipo: 'sviluppo',
        pm: f.pm_commessa || null,
        data_richiesta: nuovaAttivita.data_richiesta || null, cliente_id: selectedClientId || null,
      }).select().single();
      if (inserted) {
        setAttivitaSviluppo(prev => [...prev, inserted]);
        if (primaColonnaId) {
          const { data: colNome } = await supabase.from('workflow_colonne').select('nome').eq('id', primaColonnaId).single();
          setWfStati(prev => ({ ...prev, [inserted.id]: colNome?.nome || '—' }));
        }
      }
      setNuovaAttivita({ titolo: '', priorita: 'media', rif_pratica: '', data_rilascio: '', data_richiesta: '', bolla_id: '' });
      setShowNuovaAttivita(false);
    } catch (err) { alert('Errore: ' + err.message); }
  };

  const handleSaveAttivita = async () => {
    if (!editingAttivita || !editingAttivita.titolo.trim()) return;
    try {
      const payload = { titolo: editingAttivita.titolo.trim(), priorita: editingAttivita.priorita, rif_pratica: editingAttivita.rif_pratica || null, data_rilascio: editingAttivita.data_rilascio || null, bolla_id: editingAttivita.bolla_id || null, team_sviluppo: editingAttivita.team_sviluppo || null, assegnata_a: editingAttivita.assegnata_a || null, data_richiesta: editingAttivita.data_richiesta || null, pm: f.pm_commessa || null };
      await supabase.from('attivita').update(payload).eq('id', editingAttivita.id);
      setAttivitaSviluppo(prev => prev.map(a => a.id === editingAttivita.id ? { ...a, ...payload } : a));
      setEditingAttivita(null);
    } catch (err) { alert('Errore: ' + err.message); }
  };

  const handleDeleteAttivita = async (id) => {
    if (!window.confirm('Eliminare questa attività?')) return;
    await supabase.from('attivita').delete().eq('id', id);
    setAttivitaSviluppo(prev => prev.filter(a => a.id !== id));
    setWfStati(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const fmtEur = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const totaleOrdini = ordiniCommessa.reduce((s, o) => s + (parseFloat(o.importo) || 0), 0);
  const isChiusa = att => { const col = wfStati[att.id] || ''; return /complet|annullat/i.test(col); };

  // ── Stili sidebar ──────────────────────────────────────────────
  const NAVY = 'var(--brand-800)';
  const sidebarSections = [
    { key: 'generale', label: 'Dati generali', sub: f.nome_commessa || 'Da compilare' },
    { key: 'team', label: 'Team di lavoro', sub: teamLavoro.length > 0 ? `${teamLavoro.length} risorse` : 'Nessuna risorsa' },
    { key: 'bolle', label: 'Bolle', sub: bolleAssociate.length > 0 ? `${bolleAssociate.length} associate` : 'Nessuna bolla' },
    { key: 'ordini', label: 'Ordini cliente', sub: totaleOrdini > 0 ? fmtEur(totaleOrdini) : 'Nessun ordine' },
    ...(hasSviluppo ? [{ key: 'sviluppo', label: 'Attività sviluppo', sub: attivitaSviluppo.filter(a => !isChiusa(a)).length > 0 ? `${attivitaSviluppo.filter(a => !isChiusa(a)).length} aperte` : 'Nessuna attività' }] : []),
    ...(selectedCommessaId ? [{ key: 'pianoFatturazione', label: 'Piano Fatturazione', sub: ordiniCommessa.length > 0 ? `${ordiniCommessa.length} ordini` : 'Nessun ordine' }] : []),
    ...(selectedCommessaId ? [{ key: 'andamento', label: 'Andamento', sub: 'KPI di commessa' }] : []),
  ];

  const NavItem = ({ s, idx }) => {
    const isActive = activeSection === s.key;
    const isDone = isEdit && s.key !== activeSection && (s.key === 'team' ? teamLavoro.length > 0 : s.key === 'bolle' ? bolleAssociate.length > 0 : s.key === 'ordini' ? ordiniCommessa.length > 0 : false);
    return (
      <div onClick={() => setActiveSection(s.key)} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 14px', borderRadius: '10px', cursor: 'pointer', background: isActive ? NAVY : 'transparent', transition: 'background 0.15s', marginBottom: '2px' }}
        onMouseOver={e => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
        onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 500, ...(isActive ? { background: 'rgba(255,255,255,0.15)', color: '#fff' } : isDone ? { background: '#E6F1FB', color: '#185FA5' } : { background: 'transparent', border: '1px solid #e2e8f0', color: '#94a3b8' }) }}>
          {isDone ? '✓' : idx + 1}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: isActive ? '#fff' : '#0f172a', lineHeight: 1.3 }}>{s.label}</div>
          <div style={{ fontSize: '11px', marginTop: '1px', color: isActive ? 'rgba(255,255,255,0.5)' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.sub}</div>
        </div>
      </div>
    );
  };

  // ── Sezione Generale ───────────────────────────────────────────
  const SectionGenerale = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
        <FormField label="Cliente">
          <SelectDropdown options={clients.map(c => ({ value: c.id, label: c.nome_progetto }))} value={selectedClientId} onChange={setSelectedClientId} placeholder="Seleziona cliente..." disabled={!!(targetedEdit && targetedEdit.clientId && targetedEdit.commessaId === '')} />
        </FormField>
        <FormField label="Commessa">
          <SelectDropdown options={[{ value: '', label: '— Nuova —' }, ...availableCommesse.map(co => ({ value: co.id, label: co.nome_commessa }))]} value={selectedCommessaId} onChange={setSelectedCommessaId} placeholder="— Nuova —" disabled={!selectedClientId} />
        </FormField>
        <FormField label="Nome commessa" fullWidth>
          <input
            key={selectedCommessaId || 'new'}
            defaultValue={f.nome_commessa}
            onBlur={e => setF(p => ({ ...p, nome_commessa: e.target.value }))}
            onChange={e => { f.nome_commessa = e.target.value; }}
            placeholder="Nome della commessa..."
            style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #e2e8f0', borderRadius: 0, background: 'transparent', padding: '6px 0 8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
        </FormField>
        <FormField label="Project manager">
          <SelectDropdown options={[{ value: '', label: '— nessuno —' }, ...pms.map(s => ({ value: staffKey(s), label: staffLabel(s) }))]} value={f.pm_commessa} onChange={v => setF({ ...f, pm_commessa: v })} placeholder="— nessuno —" />
        </FormField>
        <div />
        <FormField label="Data inizio">
          <DatePicker value={f.data_inizio} onChange={v => setF({ ...f, data_inizio: v })} />
        </FormField>
        <FormField label="Data fine">
          <DatePicker value={f.data_fine} onChange={v => setF({ ...f, data_fine: v })} />
        </FormField>
        <FormField label="Buffer pianificazione %">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              key={selectedCommessaId || 'new-buf'}
              type="number" min="0" max="200" step="5"
              defaultValue={f.buffer_pianificazione || ''}
              onBlur={e => setF(p => ({ ...p, buffer_pianificazione: parseFloat(e.target.value) || 0 }))}
              placeholder="0"
              style={{ width: '80px', border: 'none', borderBottom: '1.5px solid #e2e8f0', borderRadius: 0, background: 'transparent', padding: '6px 0 8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', textAlign: 'right' }} />
            <span style={{ fontSize: '13px', color: '#64748b' }}>%</span>
            {f.buffer_pianificazione > 0 && (
              <span style={{ fontSize: '11px', color: '#854F0B', background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: 20, padding: '2px 8px', marginLeft: 4 }}>
                +{f.buffer_pianificazione}% oltre il residuo bolla
              </span>
            )}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 4 }}>
            Giorni pianificabili oltre il residuo
          </div>
        </FormField>
      </div>
      <div style={{ marginTop: '20px' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Tipo commessa</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* Consulenza — sempre attiva, navy */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', cursor: 'not-allowed', border: `1px solid ${hasConsulenza ? '#B5D4F4' : '#e2e8f0'}`, background: hasConsulenza ? '#E6F1FB' : '#f8fafc', fontSize: '13px', fontWeight: hasConsulenza ? 500 : 400, color: hasConsulenza ? '#0C447C' : '#64748b', userSelect: 'none' }}>
            <i className="ti ti-headphones" aria-hidden="true" style={{ fontSize: '14px' }} />
            Consulenza
          </div>
          {/* Sviluppo — amber dorato */}
          <div onClick={() => { if (hasSviluppo && attivitaSviluppo.length > 0) { alert('Non è possibile rimuovere il tipo Sviluppo: esistono ' + attivitaSviluppo.length + ' attività collegate.'); return; } setHasSviluppo(v => !v); }}
            style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', cursor: (hasSviluppo && attivitaSviluppo.length > 0) ? 'not-allowed' : 'pointer', border: `1px solid ${hasSviluppo ? '#FAC775' : '#e2e8f0'}`, background: hasSviluppo ? '#FAEEDA' : '#f8fafc', fontSize: '13px', fontWeight: hasSviluppo ? 500 : 400, color: hasSviluppo ? '#633806' : '#64748b', userSelect: 'none', transition: 'all 0.15s', opacity: (hasSviluppo && attivitaSviluppo.length > 0) ? 0.75 : 1 }}>
            <i className="ti ti-code" aria-hidden="true" style={{ fontSize: '14px' }} />
            Sviluppo
          </div>
        </div>
      </div>
    </div>
  );

  // Team state
  const [mostraChiuseBolla, setMostraChiuseBolla] = useState(false);
  const [bollaSelezionata, setBollaSelezionata] = useState(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [teamDropOpen, setTeamDropOpen] = useState(false);
  const teamDropRef = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (teamDropRef.current && !teamDropRef.current.contains(e.target)) setTeamDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const staffOrdinato = [...staffSviluppo].sort((a, b) => {
    const ro = { 'PM': 0, 'Consulente': 0, 'Analista': 1, 'Programmatore': 2 };
    const ra = ro[a.ruolo] ?? 3, rb = ro[b.ruolo] ?? 3;
    if (ra !== rb) return ra - rb;
    return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`);
  });
  const staffAggiungibile = staffOrdinato.filter(s => !teamLavoro.includes(`${s.cognome} ${s.nome}`));
  const staffFiltrato = staffAggiungibile.filter(s =>
    !teamSearch || `${s.cognome} ${s.nome}`.toLowerCase().includes(teamSearch.toLowerCase()) || (s.ruolo || '').toLowerCase().includes(teamSearch.toLowerCase())
  );
  const teamObjs = teamLavoro.map(key => staffSviluppo.find(s => `${s.cognome} ${s.nome}` === key)).filter(Boolean);

  // Bolle state
  const [bolleSearch, setBolleSearch] = useState('');
  const [bolleDropOpen, setBolleDropOpen] = useState(false);
  const bolleDropRef = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (bolleDropRef.current && !bolleDropRef.current.contains(e.target)) setBolleDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const bolleAssociateObjs = bolleDisponibili.filter(b => bolleAssociate.includes(b.id));
  // Escludi bolle già in altre commesse (ma non quelle già associate a questa commessa)
  const bolleAggiungibili = bolleDisponibili.filter(b => !bolleAssociate.includes(b.id) && !bolleOccupate.has(b.id));
  const bolleOccupateNonAssociate = bolleDisponibili.filter(b => !bolleAssociate.includes(b.id) && bolleOccupate.has(b.id)).length;
  const bolleFiltrate = bolleAggiungibili.filter(b =>
    !bolleSearch || b.codice.toLowerCase().includes(bolleSearch.toLowerCase()) || (b.descrizione || '').toLowerCase().includes(bolleSearch.toLowerCase())
  );

  const getBollaCalc = (b) => {
    const giorniDisp = b.ore_previste ? (b.ore_previste / 8) : (b.giorni_disponibili || 0);
    const cb = consuntiviPerBolla[b.codice] || { oreTec: 0, orePag: 0 };
    const svolti = cb.oreTec / 8;
    const pagamento = cb.orePag / 8;
    const residui = giorniDisp - svolti;
    const pct = giorniDisp > 0 ? Math.max(0, Math.min(100, (svolti / giorniDisp) * 100)) : 0;
    const barColor = pct < 70 ? '#639922' : pct < 90 ? '#BA7517' : '#E24B4A';
    const isChiusa = giorniDisp > 0 && residui <= 0;
    return { giorniDisp, svolti, pagamento, residui, pct, barColor, isChiusa };
  };

  // ── Sezione Team ───────────────────────────────────────────────
  const SectionTeam = () => (
    <div>
      <div ref={teamDropRef} style={{ position: 'relative', marginBottom: '14px' }}>
        <button onClick={() => { setTeamDropOpen(v => !v); setTeamSearch(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
          <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: '13px' }} /> Aggiungi risorsa
        </button>
        {teamDropOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '300px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,18,41,0.12)', zIndex: 300, overflow: 'hidden' }}>
            <div style={{ padding: '8px 10px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <input value={teamSearch} onChange={e => setTeamSearch(e.target.value)} placeholder="Cerca risorsa..." autoFocus
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', flex: 1, fontFamily: 'inherit' }} />
              {staffAggiungibile.length > 0 && <span style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0 }}>{staffAggiungibile.length} disponibili</span>}
            </div>
            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
              {staffFiltrato.length === 0
                ? <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nessuna risorsa trovata</div>
                : staffFiltrato.map(s => {
                    const key = `${s.cognome} ${s.nome}`;
                    const av = getAvatarColor(key);
                    return (
                      <div key={key} onClick={() => { setTeamLavoro(prev => [...prev, key]); setTeamDropOpen(false); setTeamSearch(''); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{getInitials(key)}</div>
                        <span style={{ fontSize: '13px', color: '#0f172a', flex: 1 }}>{key}</span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>{s.ruolo}</span>
                      </div>
                    );
                  })
              }
            </div>
          </div>
        )}
      </div>
      {teamObjs.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', border: '0.5px dashed #e2e8f0', borderRadius: '10px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Nessuna risorsa nel team</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {teamObjs.map((s, i) => {
            const key = `${s.cognome} ${s.nome}`;
            const av = getAvatarColor(key);
            const isPm = f.pm_commessa === key;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: av.bg, color: av.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{getInitials(key)}</div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', flex: 1 }}>{key}</span>
                {isPm && <span style={{ fontSize: '10px', fontWeight: 600, color: '#0054a6', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '4px', padding: '2px 7px', flexShrink: 0 }}>PM</span>}
                {s.ruolo && <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic', flexShrink: 0 }}>{s.ruolo}</span>}
                <button onClick={() => setTeamLavoro(prev => prev.filter(k => k !== key))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', fontSize: '14px', padding: '0 2px', flexShrink: 0 }}
                  onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                  onMouseOut={e => e.currentTarget.style.color = '#e2e8f0'}>
                  <i className="ti ti-trash" aria-hidden="true" style={{ fontSize: '14px' }} />
                </button>
              </div>
            );
          })}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 2px', borderTop: '0.5px solid #e2e8f0', marginTop: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Totale risorse</span>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#185FA5' }}>{teamObjs.length}</span>
          </div>
        </div>
      )}
    </div>
  );

  // ── Sezione Bolle ──────────────────────────────────────────────
  const SectionBolle = () => (
    <div>
      {!selectedClientId ? (
        <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Seleziona un cliente nella sezione Dati generali</div>
      ) : (
        <>
          <div ref={bolleDropRef} style={{ position: 'relative', marginBottom: '14px' }}>
            <button onClick={() => { setBolleDropOpen(v => !v); setBolleSearch(''); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: '13px' }} /> Associa bolla
            </button>
            {bolleDropOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '320px', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,18,41,0.12)', zIndex: 300, overflow: 'hidden' }}>
                <div style={{ padding: '8px 10px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <input value={bolleSearch} onChange={e => setBolleSearch(e.target.value)} placeholder="Cerca per codice o descrizione..." autoFocus
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', flex: 1, fontFamily: 'inherit' }} />
                  {bolleAggiungibili.length > 0 && <span style={{ fontSize: '10px', color: '#94a3b8', flexShrink: 0 }}>{bolleAggiungibili.length} disponibili</span>}
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {bolleFiltrate.length === 0
                    ? <div style={{ padding: '12px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                        {bolleOccupateNonAssociate > 0
                          ? `Nessuna bolla libera (${bolleOccupateNonAssociate} già usate in altre commesse)`
                          : 'Nessuna bolla disponibile'}
                      </div>
                    : bolleFiltrate.map(b => {
                        const { giorniDisp, isChiusa } = getBollaCalc(b);
                        return (
                          <div key={b.id}
                            onClick={() => { setBolleAssociate(prev => [...prev, b.id]); setBolleDropOpen(false); setBolleSearch(''); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', opacity: isChiusa ? 0.6 : 1 }}
                            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '11px', fontWeight: 700, color: '#0054a6', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '5px', padding: '2px 7px', flexShrink: 0 }}>{b.codice}</span>
                            <span style={{ fontSize: '12px', color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.descrizione || '—'}</span>
                            {isChiusa && <span style={{ fontSize: '9px', background: '#E1F5EE', color: '#085041', border: '0.5px solid #9FE1CB', borderRadius: '4px', padding: '1px 5px', flexShrink: 0 }}>chiusa</span>}
                            <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8', flexShrink: 0 }}>{giorniDisp.toFixed(1)}g</span>
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            )}
          </div>

          {bolleAssociateObjs.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', border: '0.5px dashed #e2e8f0', borderRadius: '10px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Nessuna bolla associata</div>
          ) : (() => {
            const bolleConCalc = bolleAssociateObjs.map(b => ({ ...b, ...getBollaCalc(b) }));
            const bolleAperte = bolleConCalc.filter(b => !b.isChiusa);
            const bolleChiuse = bolleConCalc.filter(b => b.isChiusa);

            const renderBollaRow = (b, i) => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #bfdbfe', background: i % 2 === 0 ? '#fff' : '#f8fafc', cursor: 'pointer', transition: 'all 0.12s', opacity: b.isChiusa ? 0.65 : 1 }}
                onClick={() => setBollaSelezionata({ ...b, accent: '#185FA5', accentLight: '#E6F1FB', accentBorder: '#B5D4F4', _tipo: 'consulenza' })}
                onMouseOver={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; }}>
                <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '12px', fontWeight: 700, color: '#185FA5', background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: '5px', padding: '2px 8px', flexShrink: 0 }}>{b.codice}</span>
                <span style={{ fontSize: '12px', color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.descrizione || '—'}</span>
                <div style={{ width: 44, flexShrink: 0 }}>
                  <div style={{ height: 4, background: '#E6F1FB', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${b.pct}%`, height: '100%', background: b.barColor, borderRadius: '2px' }} />
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: b.isChiusa ? '#94a3b8' : '#185FA5', fontVariantNumeric: 'tabular-nums' }}>{Math.max(0, b.residui).toFixed(1)}g res.</div>
                  <div style={{ fontSize: '10px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>{b.giorniDisp.toFixed(1)}g tot.</div>
                </div>
                <button onClick={e => { e.stopPropagation(); setBolleAssociate(prev => prev.filter(x => x !== b.id)); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: '0 2px', flexShrink: 0 }}
                  onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                  onMouseOut={e => e.currentTarget.style.color = '#e2e8f0'}>
                  <i className="ti ti-trash" aria-hidden="true" style={{ fontSize: '14px' }} />
                </button>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>›</span>
              </div>
            );

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {bolleAperte.map((b, i) => renderBollaRow(b, i))}
                {bolleAperte.length === 0 && <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nessuna bolla aperta</div>}
                {bolleChiuse.length > 0 && (
                  <div style={{ marginTop: '4px' }}>
                    <div onClick={() => setMostraChiuseBolla(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderRadius: '6px', background: '#f1f5f9', cursor: 'pointer', userSelect: 'none', marginBottom: mostraChiuseBolla ? '6px' : 0 }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{mostraChiuseBolla ? '▼' : '▶'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chiuse ({bolleChiuse.length})</span>
                    </div>
                    {mostraChiuseBolla && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{bolleChiuse.map((b, i) => renderBollaRow(b, i))}</div>}
                  </div>
                )}
                {bolleAssociateObjs.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 2px', borderTop: '0.5px solid #e2e8f0', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Totale giorni</span>
                    <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '14px', fontWeight: 500, color: '#185FA5' }}>
                      {bolleAssociateObjs.reduce((s, b) => s + (b.giorni_disponibili || 0), 0).toFixed(1)}g
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );

  // ── Sezione Ordini ─────────────────────────────────────────────
  const SectionOrdini = () => (
    <div>
      {!selectedCommessaId ? (
        <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Salva prima la commessa per aggiungere ordini</div>
      ) : (
        <>
          {showOrdineForm && <OrdineForm onSave={handleAddOrdine} onCancel={() => setShowOrdineForm(false)} bolleDisponibili={bolleAssociateObjs} bolleGiaAssegnate={bolleAssociateObjs.filter(b => b.ordine_id).map(b => b.id)} />}
          {!showOrdineForm && (
            <button onClick={() => setShowOrdineForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginBottom: '14px' }}>
              <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: '13px' }} /> Aggiungi ordine
            </button>
          )}
          {ordiniCommessa.length === 0 && !showOrdineForm ? (
            <div style={{ padding: '24px', textAlign: 'center', border: '0.5px dashed #e2e8f0', borderRadius: '10px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Nessun ordine associato</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ordiniCommessa.map((o, i) => {
                // Bolle associate a questo ordine
                const bolleOrdine = bolleDisponibili.filter(b => b.ordine_id === o.id);
                return (
                <div key={o.id}
                  onClick={() => bolleOrdine.length > 0 && setOrdinePopup({ ordine: o, bolle: bolleOrdine })}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#fafbfc', cursor: bolleOrdine.length > 0 ? 'pointer' : 'default', transition: 'all .12s' }}
                  onMouseOver={e => { if (bolleOrdine.length > 0) { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
                  onMouseOut={e => { e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                  <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '12px', fontWeight: 600, color: '#0054a6', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '5px', padding: '2px 8px', flexShrink: 0 }}>{o.codice}·{o.numero}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{o.data ? new Date(o.data + 'T00:00:00').toLocaleDateString('it-IT') : '—'}</span>
                  <span style={{ flex: 1 }} />
                  {bolleOrdine.length > 0 && (
                    <span style={{ fontSize: '10px', color: '#185FA5', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 20, padding: '1px 8px', flexShrink: 0 }}>
                      {bolleOrdine.length} boll{bolleOrdine.length === 1 ? 'a' : 'e'} ›
                    </span>
                  )}
                  <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{o.importo ? fmtEur(o.importo) : '—'}</span>
                  <button onClick={e => { e.stopPropagation(); handleDeleteOrdine(o.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', fontSize: '14px', padding: '0 2px' }} onMouseOver={e => { e.stopPropagation(); e.currentTarget.style.color = '#dc2626'; }} onMouseOut={e => e.currentTarget.style.color = '#e2e8f0'}>
                    <i className="ti ti-trash" aria-hidden="true" style={{ fontSize: '14px' }} />
                  </button>
                </div>
                );
              })}
              {ordiniCommessa.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 2px', borderTop: '0.5px solid #e2e8f0', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Totale valore</span>
                  <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '14px', fontWeight: 500, color: '#185FA5' }}>{fmtEur(totaleOrdini)}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  // ── Sezione Attività sviluppo ──────────────────────────────────
  const SectionSviluppo = () => {
    const aperti = attivitaSviluppo.filter(a => !isChiusa(a));
    const chiusi = attivitaSviluppo.filter(a => isChiusa(a));

    const renderAtt = (att) => {
      const attChiusa = isChiusa(att);
      const isEditing = editingAttivita?.id === att.id && !attChiusa;
      const pColor = att.priorita === 'alta' ? { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' } : att.priorita === 'bassa' ? { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' } : { bg: '#fefce8', text: '#92400e', border: '#fcd34d' };
      const statoWf = wfStati[att.id];
      const bollaAtt = bolleDisponibili.find(b => b.id === att.bolla_id);

      if (isEditing) return (
        <div key={att.id} style={{ background: '#FAEEDA', border: '1px solid #FAC775', borderRadius: '12px', padding: '16px', marginBottom: '8px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <input value={editingAttivita.titolo} onChange={e => setEditingAttivita(p => ({ ...p, titolo: e.target.value }))}
            style={{ fontSize: '13px', fontWeight: 500, width: '100%', border: 'none', borderBottom: '1.5px solid #FAC775', borderRadius: 0, background: 'transparent', padding: '4px 0 8px', outline: 'none' }} autoFocus />
          <div>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Priorità</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['bassa', 'media', 'alta'].map(p => (
                <div key={p} onClick={() => setEditingAttivita(prev => ({ ...prev, priorita: p }))}
                  style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: editingAttivita.priorita === p ? 500 : 400, border: `1px solid ${editingAttivita.priorita === p ? (p === 'alta' ? '#fca5a5' : p === 'media' ? '#fcd34d' : '#86efac') : '#e2e8f0'}`, background: editingAttivita.priorita === p ? (p === 'alta' ? '#fef2f2' : p === 'media' ? '#fefce8' : '#f0fdf4') : 'transparent', color: editingAttivita.priorita === p ? (p === 'alta' ? '#dc2626' : p === 'media' ? '#92400e' : '#16a34a') : '#94a3b8' }}>{p}</div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Data richiesta</div>
              <DatePicker value={editingAttivita.data_richiesta || ''} onChange={v => setEditingAttivita(p => ({ ...p, data_richiesta: v }))} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rif. pratica</div>
              <input value={editingAttivita.rif_pratica || ''} onChange={e => setEditingAttivita(p => ({ ...p, rif_pratica: e.target.value }))} placeholder="es. PR.26.12345"
                style={{ width: '100%', fontSize: '13px', border: 'none', borderBottom: '1.5px solid #FAC775', borderRadius: 0, background: 'transparent', padding: '4px 0 8px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Bolla</div>
              <select value={editingAttivita.bolla_id || ''} onChange={e => setEditingAttivita(p => ({ ...p, bolla_id: e.target.value }))}
                style={{ width: '100%', fontSize: '13px', border: 'none', borderBottom: '1.5px solid #FAC775', borderRadius: 0, background: 'transparent', padding: '4px 0 8px', outline: 'none', appearance: 'none', cursor: 'pointer', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '22px' }}>
                <option value="">— nessuna —</option>
                {bolleDisponibili.filter(b => bolleAssociate.includes(b.id)).map(b => (<option key={b.id} value={b.id}>{b.codice} — {b.descrizione || '—'}</option>))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '0.5px solid #FAC775' }}>
            <button onClick={() => handleDeleteAttivita(att.id)} style={{ padding: '6px 16px', borderRadius: '8px', border: '0.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '12px', cursor: 'pointer' }}>Elimina</button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setEditingAttivita(null)} style={{ padding: '6px 16px', borderRadius: '8px', border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Annulla</button>
              <button onClick={handleSaveAttivita} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#633806', color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>Salva</button>
            </div>
          </div>
        </div>
      );

      return (
        <div key={att.id} onClick={() => { if (!attChiusa) { setEditingAttivita({ ...att, rif_pratica: att.rif_pratica ?? '', data_rilascio: att.data_rilascio ?? '', data_richiesta: att.data_richiesta ?? '' }); setShowNuovaAttivita(false); } }}
          style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '10px 12px', borderRadius: '8px', border: '0.5px solid #e2e8f0', background: attChiusa ? '#f8fafc' : '#fff', marginBottom: '5px', cursor: attChiusa ? 'default' : 'pointer', transition: 'all 0.12s' }}
          onMouseOver={e => { if (!attChiusa) { e.currentTarget.style.borderColor = '#FAC775'; e.currentTarget.style.background = '#FAEEDA'; } }}
          onMouseOut={e => { if (!attChiusa) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#fff'; } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', flex: 1 }}>{att.titolo}</span>
            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: pColor.bg, color: pColor.text, border: `0.5px solid ${pColor.border}`, fontWeight: 500 }}>{att.priorita}</span>
            {!attChiusa && <i className="ti ti-pencil" aria-hidden="true" style={{ fontSize: '11px', color: '#94a3b8' }} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {att.data_richiesta && <span style={{ fontSize: '10px', color: '#475569', background: '#f1f5f9', border: '0.5px solid #e2e8f0', borderRadius: '4px', padding: '1px 6px' }}>📅 {att.data_richiesta.split('-').reverse().join('/')}</span>}
            {bollaAtt && <span style={{ fontSize: '10px', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: '#633806', background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: '4px', padding: '1px 6px' }}>{bollaAtt.codice}</span>}
            {att.rif_pratica && <span style={{ fontSize: '10px', color: '#0054a6', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{att.rif_pratica}</span>}
            {statoWf && <span style={{ fontSize: '10px', fontStyle: 'italic', color: '#94a3b8', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />{statoWf}</span>}
          </div>
        </div>
      );
    };

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '13px', color: '#64748b' }}>{attivitaSviluppo.length === 0 ? 'Nessuna attività' : `${aperti.length} aperte · ${chiusi.length} chiuse`}</div>
          {selectedCommessaId && (
            <button onClick={() => { setShowNuovaAttivita(v => !v); setEditingAttivita(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #FAC775', background: '#FAEEDA', color: '#633806', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
              <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: '13px' }} /> Nuova attività
            </button>
          )}
        </div>

        {showNuovaAttivita && (
          <div style={{ background: '#FAEEDA', border: '1px solid #FAC775', borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input placeholder="Titolo attività..." value={nuovaAttivita.titolo} onChange={e => setNuovaAttivita(p => ({ ...p, titolo: e.target.value }))}
              style={{ fontSize: '13px', fontWeight: 500, width: '100%', border: 'none', borderBottom: '1.5px solid #FAC775', borderRadius: 0, background: 'transparent', padding: '4px 0 8px', outline: 'none' }} autoFocus />
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Priorità</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['bassa', 'media', 'alta'].map(p => (
                  <div key={p} onClick={() => setNuovaAttivita(prev => ({ ...prev, priorita: p }))}
                    style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: nuovaAttivita.priorita === p ? 500 : 400, border: `1px solid ${nuovaAttivita.priorita === p ? (p === 'alta' ? '#fca5a5' : p === 'media' ? '#fcd34d' : '#86efac') : '#e2e8f0'}`, background: nuovaAttivita.priorita === p ? (p === 'alta' ? '#fef2f2' : p === 'media' ? '#fefce8' : '#f0fdf4') : 'transparent', color: nuovaAttivita.priorita === p ? (p === 'alta' ? '#dc2626' : p === 'media' ? '#92400e' : '#16a34a') : '#94a3b8' }}>{p}</div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Data richiesta</div>
                <DatePicker value={nuovaAttivita.data_richiesta} onChange={v => setNuovaAttivita(p => ({ ...p, data_richiesta: v }))} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Rif. pratica</div>
                <input value={nuovaAttivita.rif_pratica} onChange={e => setNuovaAttivita(p => ({ ...p, rif_pratica: e.target.value }))} placeholder="es. PR.26.12345"
                  style={{ width: '100%', fontSize: '13px', border: 'none', borderBottom: '1.5px solid #FAC775', borderRadius: 0, background: 'transparent', padding: '4px 0 8px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Bolla</div>
                <select value={nuovaAttivita.bolla_id || ''} onChange={e => setNuovaAttivita(p => ({ ...p, bolla_id: e.target.value }))}
                  style={{ width: '100%', fontSize: '13px', border: 'none', borderBottom: '1.5px solid #FAC775', borderRadius: 0, background: 'transparent', padding: '4px 0 8px', outline: 'none', appearance: 'none', cursor: 'pointer', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', paddingRight: '22px' }}>
                  <option value="">— nessuna —</option>
                  {bolleDisponibili.filter(b => bolleAssociate.includes(b.id)).map(b => (<option key={b.id} value={b.id}>{b.codice} — {b.descrizione || '—'}</option>))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '0.5px solid #FAC775' }}>
              <button onClick={() => { setShowNuovaAttivita(false); setNuovaAttivita({ titolo: '', priorita: 'media', rif_pratica: '', data_rilascio: '', data_richiesta: '', bolla_id: '' }); }} style={{ padding: '6px 16px', borderRadius: '8px', border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Annulla</button>
              <button onClick={handleAddAttivita} style={{ padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#633806', color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>Aggiungi</button>
            </div>
          </div>
        )}

        {aperti.map(att => <React.Fragment key={att.id}>{renderAtt(att)}</React.Fragment>)}
        {chiusi.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <div onClick={() => setShowChiusiAtt(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', borderRadius: '6px', background: '#f1f5f9', cursor: 'pointer', userSelect: 'none', marginBottom: showChiusiAtt ? '6px' : 0 }}>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>{showChiusiAtt ? '▼' : '▶'}</span>
              <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chiuse ({chiusi.length})</span>
            </div>
            {showChiusiAtt && chiusi.map(att => <div key={att.id} style={{ opacity: 0.6 }}>{renderAtt(att)}</div>)}
          </div>
        )}
      </div>
    );
  };

  // ── Sezione Piano Fatturazione ────────────────────────────────
// ── Andamento component ───────────────────────────────────────────
function SectionAndamento({ ordiniCommessa, andamentoData }) {
  const COSTO_GIORNO = 380;
  const fmtEur = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmtN = (n, d = 1) => Number(n).toFixed(d).replace('.', ',');
  const valore = ordiniCommessa.reduce((s, o) => s + (parseFloat(o.importo) || 0), 0);
  const giorniTec = andamentoData.oreTecniche / 8;
  const giorniPag = andamentoData.orePagamento / 8;
  const costo = giorniTec * COSTO_GIORNO;
  const margine = valore - costo;
  const marginePerc = valore > 0 ? (margine / valore) * 100 : null;
  const giorniResidui = andamentoData.giorniBolle - giorniPag;
  const efficacia = giorniTec > 0 ? (giorniPag / giorniTec) * 100 : null;
  const margineColor = margine >= 0 && valore > 0 ? '#16a34a' : valore > 0 ? '#dc2626' : '#94a3b8';
  const efficaciaColor = efficacia === null ? '#94a3b8' : efficacia >= 80 ? '#16a34a' : efficacia >= 60 ? '#f59e0b' : '#dc2626';
  const residuiColor = giorniResidui > 0 ? '#16a34a' : giorniResidui < 0 ? '#dc2626' : '#94a3b8';

  // Stile KPI identico a PianoFatturazione: sfondo colorato, bordo colorato, no accent top
  const KpiCard = ({ label, value, sub, color, bg, border, barPct, barColor }) => (
    <div style={{ background: bg || '#f8fafc', border: `1px solid ${border || '#e2e8f0'}`, borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: color || '#0f172a', fontVariantNumeric: 'tabular-nums', marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: barPct != null ? 8 : 0 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
      {barPct != null && (
        <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden', marginTop: 6 }}>
          <div style={{ width: `${Math.min(100, Math.abs(barPct))}%`, height: '100%', background: barColor || color || '#3b82f6', borderRadius: 2 }} />
        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Economico */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Economico</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <KpiCard label="Valore contratto" value={valore > 0 ? fmtEur(valore) : '—'}
            color="#001d47" bg="#eff6ff" border="#bfdbfe"
            sub={ordiniCommessa.length > 0 ? `${ordiniCommessa.length} ordini` : 'Nessun ordine'} />
          <KpiCard label="Costo manodopera" value={andamentoData.loadingAnd ? '...' : costo > 0 ? fmtEur(costo) : '—'}
            color="#9a3412" bg="#fff7ed" border="#fed7aa"
            sub={costo > 0 ? `${fmtN(giorniTec)}g · ${COSTO_GIORNO} €/g` : 'da consuntivi'}
            barPct={valore > 0 ? (costo/valore)*100 : null} barColor="#D85A30" />
          <KpiCard label="Margine"
            value={marginePerc !== null ? `${margine >= 0 ? '+' : ''}${fmtN(marginePerc)}%` : '—'}
            color={margineColor}
            bg={margine >= 0 && valore > 0 ? '#f0fdf4' : valore > 0 ? '#fef2f2' : '#f8fafc'}
            border={margine >= 0 && valore > 0 ? '#bbf7d0' : valore > 0 ? '#fecaca' : '#e2e8f0'}
            sub={marginePerc !== null ? fmtEur(margine) : 'Inserisci ordini'} />
        </div>
      </div>
      {/* Giorni */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>Giorni</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
          {/* Bolle + Residui */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#001d47', fontVariantNumeric: 'tabular-nums', marginBottom: 2 }}>
              {andamentoData.loadingAnd ? '...' : andamentoData.giorniBolle > 0 ? `${fmtN(andamentoData.giorniBolle)}g` : '—'}
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Bolle previste</div>
            <div style={{ height: '0.5px', background: '#bfdbfe', margin: '8px 0 6px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: 10, color: '#64748b' }}>Residui</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: residuiColor, fontVariantNumeric: 'tabular-nums' }}>
                {andamentoData.loadingAnd ? '...' : andamentoData.giorniBolle > 0 ? `${fmtN(giorniResidui)}g` : '—'}
              </span>
            </div>
          </div>
          <KpiCard label="Giorni tecnici" value={andamentoData.loadingAnd ? '...' : giorniTec > 0 ? `${fmtN(giorniTec)}g` : '—'}
            color="#334155" bg="#f8fafc" border="#e2e8f0"
            sub={giorniTec > 0 ? `${fmtN(giorniTec*8)}h totali` : 'da consuntivi'}
            barPct={andamentoData.giorniBolle > 0 ? (giorniTec/andamentoData.giorniBolle)*100 : null} barColor="#64748b" />
          <KpiCard label="Giorni pagamento" value={andamentoData.loadingAnd ? '...' : giorniPag > 0 ? `${fmtN(giorniPag)}g` : '—'}
            color="#0C447C" bg="#eff6ff" border="#bfdbfe"
            sub={giorniPag > 0 ? `${fmtN(giorniPag*8)}h fatturabili` : 'da consuntivi'}
            barPct={andamentoData.giorniBolle > 0 ? (giorniPag/andamentoData.giorniBolle)*100 : null} barColor="#185FA5" />
          <KpiCard label="Efficacia"
            value={efficacia !== null ? `${fmtN(efficacia)}%` : '—'}
            color={efficaciaColor}
            bg={efficacia === null ? '#f8fafc' : efficacia >= 80 ? '#f0fdf4' : efficacia >= 60 ? '#fffbeb' : '#fef2f2'}
            border={efficacia === null ? '#e2e8f0' : efficacia >= 80 ? '#bbf7d0' : efficacia >= 60 ? '#fde68a' : '#fecaca'}
            sub={efficacia !== null ? (efficacia >= 80 ? 'ottima copertura' : efficacia >= 60 ? 'copertura parziale' : 'bassa copertura') : 'pag / tec'}
            barPct={efficacia !== null ? Math.min(100, efficacia) : null} barColor={efficaciaColor} />
        </div>
      </div>
    </div>
  );
}

// ── Piano Fatturazione component ─────────────────────────────
function PianoFatturazione({ ordiniCommessa, bolleDisponibili, bolleAssociate, consuntiviPerBolla }) {
    const [pfVista, setPfVista] = React.useState('dettaglio'); // 'dettaglio' | 'grafico'
    const [pfFilterBolla, setPfFilterBolla] = React.useState('');
    const [pfFilterOrdine, setPfFilterOrdine] = React.useState('');

    const MESI_IT_PF = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
    const fmtE = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);
    const fmtD = iso => { if (!iso) return '—'; const [y,m,d] = iso.split('-'); return `${d}/${m}/${y}`; };

    // Bolle associate con dati
    const bolleConDati = bolleDisponibili
      .filter(b => bolleAssociate.includes(b.id))
      .filter(b => !pfFilterBolla || b.codice === pfFilterBolla);

    // Costruisce righe consuntivo arricchite
    const righeDettaglio = React.useMemo(() => {
      const rows = [];
      bolleConDati.forEach(b => {
        const cb = consuntiviPerBolla[b.codice] || { oreTec: 0, orePag: 0 };
        const giorniDisp = b.giorni_disponibili || 0;
        // Trova ordine collegato tramite ordine_id reale
        const ordineCollegato = b.ordine_id ? ordiniCommessa.find(o => o.id === b.ordine_id) : null;
        // Valore giorno/ora basato sull'ordine collegato e i giorni della bolla
        const vgOra = ordineCollegato && giorniDisp > 0
          ? (parseFloat(ordineCollegato.importo) || 0) / giorniDisp / 8
          : 0;
        rows.push({
          bolla: b.codice,
          bollDesc: b.descrizione || '—',
          ordineLabel: ordineCollegato ? `${ordineCollegato.codice}·${ordineCollegato.numero}` : '—',
          ordineData: ordineCollegato?.data || null,
          ordineImporto: ordineCollegato ? (parseFloat(ordineCollegato.importo) || 0) : 0,
          giorniDisp,
          oreTec: cb.oreTec,
          orePag: cb.orePag,
          giorniTec: cb.oreTec / 8,
          giorniPag: cb.orePag / 8,
          erogato: vgOra * cb.oreTec,
          pct: giorniDisp > 0 ? Math.min(100, Math.round((cb.oreTec/8) / giorniDisp * 100)) : null,
        });
      });
      return rows;
    }, [bolleConDati, consuntiviPerBolla, ordiniCommessa]);

    // KPI aggregati
    const ordiniFiltratiPF = ordiniCommessa.filter(o => !pfFilterOrdine || `${o.codice}·${o.numero}` === pfFilterOrdine);
    const totFatturato = ordiniFiltratiPF.reduce((s,o) => s + (parseFloat(o.importo)||0), 0);
    const totOreTec = righeDettaglio.reduce((s,r) => s + r.oreTec, 0);
    const totOrePag = righeDettaglio.reduce((s,r) => s + r.orePag, 0);
    const totGiorniDisp = bolleConDati.reduce((s,b) => s + (b.giorni_disponibili||0), 0);
    const vgOraGlobale = totGiorniDisp > 0 && totFatturato > 0 ? (totFatturato / totGiorniDisp) / 8 : 0;
    const totErogato = totOreTec * vgOraGlobale;
    const daErogareEuro = Math.max(0, totFatturato - totErogato);
    const daErogareGg = Math.max(0, totGiorniDisp - totOreTec/8);

    const ordiniFiltro = ordiniCommessa.map(o => `${o.codice}·${o.numero}`);
    const bolleFiltro = bolleDisponibili.filter(b => bolleAssociate.includes(b.id)).map(b => b.codice);

    // Dati grafico SVG
    const chartData = React.useMemo(() => {
      const mesiMap = {};
      const add = (mk, key, val) => {
        if (!mesiMap[mk]) mesiMap[mk] = { ordine: 0, consuntivo: 0 };
        mesiMap[mk][key] = (mesiMap[mk][key]||0) + val;
      };
      // Ordini — posizionati nel mese della loro data
      ordiniCommessa.forEach(o => {
        if (o.data) add(o.data.slice(0,7), 'ordine', parseFloat(o.importo)||0);
      });
      // Consuntivi per bolla — distribuiti per mese tramite ordine collegato
      bolleConDati.forEach(b => {
        const cb = consuntiviPerBolla[b.codice] || { oreTec: 0 };
        if (!cb.oreTec) return;
        const ordine = b.ordine_id ? ordiniCommessa.find(o => o.id === b.ordine_id) : null;
        const giorniDisp = b.giorni_disponibili || 0;
        const vgOra = ordine && giorniDisp > 0 ? (parseFloat(ordine.importo)||0) / giorniDisp / 8 : 0;
        if (!vgOra) return;
        const mese = ordine?.data ? ordine.data.slice(0,7) : null;
        if (mese) add(mese, 'consuntivo', cb.oreTec * vgOra);
      });
      // Consuntivi per mese — usiamo andamentoData mensile se disponibile
      // Approssimazione: distribuiamo proporzionalmente
      // In futuro: query diretta per mese
      return Object.keys(mesiMap).sort().map(mk => {
        const [y,mo] = mk.split('-');
        return { label: `${MESI_IT_PF[Number(mo)-1]} ${y.slice(2)}`, ...mesiMap[mk] };
      });
    }, [ordiniCommessa]);

    const selStyle = { padding: '5px 9px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: 11, outline: 'none', fontFamily: 'inherit', background: '#fff', color: '#0f172a' };

    // SVG grafico
    const SvgChart = ({ data }) => {
      const [tip, setTip] = React.useState(null);
      if (!data.length) return <div style={{ height: 160, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:12 }}>Nessun dato grafico disponibile</div>;
      const W=520, H=160, pL=44, pR=8, pT=8, pB=28;
      const cW=W-pL-pR, cH=H-pT-pB;
      const maxV = Math.max(...data.flatMap(d => [d.ordine||0, d.consuntivo||0]), 1);
      const niceMax = Math.ceil(maxV/1000)*1000 || 1000;
      const ticks = [0, Math.round(niceMax/2), niceMax];
      const bW = Math.min(28, (cW/data.length)*0.35);
      const fmtS = v => v>=1000?`€${(v/1000).toFixed(0)}k`:`€${v}`;
      return (
        <div style={{ position:'relative', width:'100%', overflowX:'auto' }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', fontFamily:'inherit' }}>
            {ticks.map(t => {
              const y = pT + cH - (t/niceMax)*cH;
              return <g key={t}>
                <line x1={pL} y1={y} x2={W-pR} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
                <text x={pL-4} y={y+3} textAnchor="end" fontSize="9" fill="#94a3b8">{fmtS(t)}</text>
              </g>;
            })}
            {data.map((d,gi) => {
              const gx = pL + gi*(cW/data.length) + (cW/data.length)*0.1;
              const items = [
                { key:'ordine', color:'#001d47', label:'Ordine', val:d.ordine||0 },
                { key:'consuntivo', color:'#FAC775', label:'Erogato', val:d.consuntivo||0 },
              ];
              return <g key={d.label}>
                {items.map((it,ki) => {
                  const val = it.val; if (!val) return null;
                  const bh = (val/niceMax)*cH;
                  const x = gx + ki*(bW+2);
                  const y = pT+cH-bh;
                  return <rect key={it.key} x={x} y={y} width={bW} height={bh} fill={it.color} rx="2"
                    style={{cursor:'pointer'}}
                    onMouseEnter={e=>setTip({gi,key:it.key,val,label:d.label,name:it.label,x:e.clientX,y:e.clientY})}
                    onMouseLeave={()=>setTip(null)}/>;
                })}
                <text x={gx+(bW+2)} y={H-pB+12} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.label}</text>
              </g>;
            })}
          </svg>
          {tip && <div style={{ position:'fixed', top:tip.y-50, left:tip.x+10, background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'7px 10px', fontSize:11, boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:200, pointerEvents:'none' }}>
            <div style={{ fontWeight:700, color:'#0f172a', marginBottom:3 }}>{tip.label}</div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ width:8,height:8,borderRadius:1,background:tip.key==='ordine'?'#001d47':'#FAC775',display:'inline-block' }}/>
              <span style={{ color:'#475569' }}>{tip.name}:</span>
              <span style={{ fontWeight:600 }}>{fmtE(tip.val)}</span>
            </div>
          </div>}
        </div>
      );
    };

    return (
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* KPI strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {[
            { label:'Totale ordinato', val:fmtE(totFatturato), color:'#001d47', bg:'#eff6ff', border:'#bfdbfe' },
            { label:'Da erogare (€)', val:fmtE(daErogareEuro), color:daErogareEuro>0?'#16a34a':'#94a3b8', bg:daErogareEuro>0?'#f0fdf4':'#f8fafc', border:daErogareEuro>0?'#bbf7d0':'#e2e8f0' },
            { label:'Da erogare (gg)', val:`${daErogareGg.toFixed(1)} gg`, color:'#854F0B', bg:'#fffbeb', border:'#fde68a' },
          ].map(k => (
            <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:10, padding:'10px 14px' }}>
              <div style={{ fontSize:16, fontWeight:600, color:k.color, fontVariantNumeric:'tabular-nums', marginBottom:2 }}>{k.val}</div>
              <div style={{ fontSize:10, color:'#64748b' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filtri + toggle vista */}
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <select value={pfFilterBolla} onChange={e=>setPfFilterBolla(e.target.value)} style={selStyle}>
            <option value=''>Tutte le bolle</option>
            {bolleFiltro.map(b=><option key={b} value={b}>{b}</option>)}
          </select>
          <select value={pfFilterOrdine} onChange={e=>setPfFilterOrdine(e.target.value)} style={selStyle}>
            <option value=''>Tutti gli ordini</option>
            {ordiniFiltro.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
          {(pfFilterBolla||pfFilterOrdine) && <button onClick={()=>{setPfFilterBolla('');setPfFilterOrdine('');}} style={{ fontSize:11, padding:'4px 10px', borderRadius:7, border:'0.5px solid #e2e8f0', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>Reset</button>}
          <div style={{ marginLeft:'auto', display:'flex', gap:5, background:'#f1f5f9', borderRadius:20, padding:2 }}>
            {[{key:'dettaglio',icon:'ti-list'},{key:'grafico',icon:'ti-chart-bar'}].map(v=>(
              <button key={v.key} onClick={()=>setPfVista(v.key)}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 12px', borderRadius:20, border:'none', background:pfVista===v.key?'#fff':'transparent', color:pfVista===v.key?'#0f172a':'#64748b', fontSize:11, cursor:'pointer', fontFamily:'inherit', fontWeight:pfVista===v.key?600:400 }}>
                <i className={`ti ${v.icon}`} style={{ fontSize:12 }}/>{v.key==='dettaglio'?'Dettaglio':'Grafico'}
              </button>
            ))}
          </div>
        </div>

        {/* Vista dettaglio */}
        {pfVista === 'dettaglio' && (
          <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Bolla','Descrizione','Ordini','Gg prev.','Gg tec.','Gg pag.','Avanz.'].map(h=>(
                    <th key={h} style={{ padding:'8px 10px', textAlign:['Gg prev.','Gg tec.','Gg pag.','Avanz.'].includes(h)?'right':'left', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {righeDettaglio.length === 0 && (
                  <tr><td colSpan={7} style={{ padding:'20px', textAlign:'center', color:'#94a3b8', fontSize:12, fontStyle:'italic' }}>Nessuna bolla associata</td></tr>
                )}
                {righeDettaglio.map((r,i) => {
                  // Ordini collegati alla commessa
                  const ordiniStr = r.ordineLabel || '—';
                  const barColor = r.pct===null?'#e2e8f0':r.pct>=100?'#16a34a':r.pct>=60?'#d97706':'#185FA5';
                  return (
                    <tr key={i} style={{ borderBottom:'0.5px solid #f1f5f9' }}
                      onMouseOver={e=>e.currentTarget.style.background='#f8fafc'}
                      onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'9px 10px', fontWeight:700, color:'#001d47', fontFamily:'monospace' }}>{r.bolla}</td>
                      <td style={{ padding:'9px 10px', color:'#475569', fontSize:11, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.bollDesc}</td>
                      <td style={{ padding:'9px 10px', fontSize:10, color:'#64748b' }}>{ordiniStr}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums' }}>{r.giorniDisp.toFixed(1)}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', color:'#185FA5', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{r.giorniTec.toFixed(1)}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right', color:'#0C447C', fontVariantNumeric:'tabular-nums', fontWeight:500 }}>{r.giorniPag.toFixed(1)}</td>
                      <td style={{ padding:'9px 10px', textAlign:'right' }}>
                        {r.pct !== null ? (
                          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2 }}>
                            <span style={{ fontSize:10, fontWeight:700, color:barColor }}>{r.pct}%</span>
                            <div style={{ width:48, height:3, background:'#e2e8f0', borderRadius:2 }}>
                              <div style={{ width:`${r.pct}%`, height:'100%', background:barColor, borderRadius:2 }}/>
                            </div>
                          </div>
                        ) : <span style={{ fontSize:10, color:'#cbd5e1' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Vista grafico */}
        {pfVista === 'grafico' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ display:'flex', gap:12 }}>
              {[{color:'#001d47',label:'Ordine (data ordine)'},{color:'#FAC775',label:'Erogato'}].map(l=>(
                <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{ width:10,height:10,borderRadius:1,background:l.color,flexShrink:0 }}/>
                  <span style={{ fontSize:11, color:'#475569' }}>{l.label}</span>
                </div>
              ))}
            </div>
            <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, padding:'14px 12px' }}>
              <SvgChart data={chartData} />
            </div>
            {/* Tabella ordini */}
            <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:12, overflow:'hidden' }}>
              <div style={{ padding:'8px 12px', borderBottom:'0.5px solid #e2e8f0', fontSize:10, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em' }}>Ordini</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Codice·N°','Data','Importo'].map(h=>(
                      <th key={h} style={{ padding:'7px 12px', textAlign:h==='Importo'?'right':'left', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordiniCommessa.length === 0 && (
                    <tr><td colSpan={3} style={{ padding:16, textAlign:'center', color:'#94a3b8', fontSize:12, fontStyle:'italic' }}>Nessun ordine</td></tr>
                  )}
                  {ordiniCommessa.map((o,i)=>(
                    <tr key={o.id} style={{ borderBottom:'0.5px solid #f1f5f9' }}
                      onMouseOver={e=>e.currentTarget.style.background='#f8fafc'}
                      onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'8px 12px', fontWeight:600, color:'#001d47', fontFamily:'monospace' }}>{o.codice}·{o.numero}</td>
                      <td style={{ padding:'8px 12px', color:'#475569' }}>{fmtD(o.data)}</td>
                      <td style={{ padding:'8px 12px', textAlign:'right', fontWeight:600, color:'#0f172a', fontVariantNumeric:'tabular-nums' }}>{o.importo?fmtE(o.importo):'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
}


  // ── Helper FormField ───────────────────────────────────────────
  const FormField = ({ label, children, fullWidth }) => (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto', marginBottom: '18px' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {children}
    </div>
  );

  // ── Sezione attiva ─────────────────────────────────────────────
  const sectionTitle = { generale: 'Dati generali', team: 'Team di lavoro', bolle: 'Bolle di commessa', ordini: 'Ordini cliente', sviluppo: 'Attività sviluppo', pianoFatturazione: 'Piano Fatturazione', andamento: 'Andamento' };
  const sectionSub = { generale: 'Cliente, nome, date e tipo commessa', team: 'Risorse assegnate a questa commessa', bolle: 'Bolle di lavoro associate', ordini: 'Ordini e valore contrattuale', sviluppo: 'Attività di sviluppo collegate', pianoFatturazione: 'Consuntivi e valore per ordine e bolla', andamento: 'Economico, giorni da bolle e consuntivato' };

  const fmtDate = d => { if (!d) return null; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '900px', width: '95vw', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 500, color: '#0f172a' }}>{isEdit ? 'Modifica commessa' : 'Nuova commessa'}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {selectedClientId && clients.find(c => c.id === selectedClientId)?.nome_progetto
                ? `${clients.find(c => c.id === selectedClientId).nome_progetto}${f.nome_commessa ? ' — ' + f.nome_commessa : ''}`
                : 'Compila i dati per creare o modificare la commessa'}
            </div>
          </div>
          <button className="btn-close-circle" onClick={onClose}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* ── SIDEBAR ── */}
          <div style={{ padding: '14px 10px', borderRight: '0.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px', background: '#fafbfc', overflowY: 'auto' }}>
            {sidebarSections.map((s, idx) => <NavItem key={s.key} s={s} idx={idx} />)}

            <div style={{ flex: 1 }} />

            {/* Box stato + Economico */}
            <div style={{ margin: '8px 4px 4px', borderRadius: '10px', background: '#fff', border: '0.5px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Stato commessa */}
              <div style={{ padding: '12px 12px 10px' }}>
                <div style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Stato commessa</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.attiva !== false ? '#22c55e' : '#94a3b8', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>{f.attiva !== false ? 'Attiva' : 'Chiusa'}</span>
                </div>
                {(f.data_inizio || f.data_fine) && (
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(f.data_inizio) || '—'} → {fmtDate(f.data_fine) || '—'}</div>
                )}
              </div>
              {/* KPI Economico compatto - rimosso, visibile in sezione Andamento */}
            </div>
          </div>

          {/* ── CONTENUTO SEZIONE ── */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '22px 28px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ fontSize: '15px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>{sectionTitle[activeSection]}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '22px' }}>{sectionSub[activeSection]}</div>
              {activeSection === 'generale' && SectionGenerale()}
              {activeSection === 'team' && SectionTeam()}
              {activeSection === 'bolle' && SectionBolle()}
              {activeSection === 'ordini' && SectionOrdini()}
              {activeSection === 'sviluppo' && SectionSviluppo()}
              {activeSection === 'pianoFatturazione' && <PianoFatturazione ordiniCommessa={ordiniCommessa} bolleDisponibili={bolleDisponibili} bolleAssociate={bolleAssociate} consuntiviPerBolla={consuntiviPerBolla} />}
              {activeSection === 'andamento' && <SectionAndamento ordiniCommessa={ordiniCommessa} andamentoData={andamentoData} />}
            </div>

            {/* ── FOOTER AZIONI ── */}
            <div style={{ padding: '12px 28px', borderTop: '0.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isEdit && selectedCommessaId && (
                <button onClick={async () => {
                  if (progettoId) { onOpenProgetto && onOpenProgetto(progettoId, selectedCommessaId); onClose(); }
                  else {
                    const { data: newProg } = await supabase.from('progetti').insert({ commessa_id: selectedCommessaId, creato_da: f.pm_commessa }).select().single();
                    if (newProg) { await creaTaskStandard(newProg.id); setProgettoId(newProg.id); onOpenProgetto && onOpenProgetto(newProg.id, selectedCommessaId); onClose(); }
                  }
                }} disabled={checkingProgetto}
                  style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px', borderRadius: '8px', border: '1px solid', fontSize: '13px', fontWeight: 500, cursor: 'pointer', ...(progettoId ? { background: '#f0fdf4', borderColor: '#C0DD97', color: '#27500A' } : { background: '#eff6ff', borderColor: '#bfdbfe', color: '#0054a6' }) }}>
                  {checkingProgetto ? '...' : progettoId ? '📂 Apri progetto' : '🚀 Genera progetto'}
                </button>
              )}
              <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: '8px', border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}>Annulla</button>
              {isEdit && selectedCommessaId && f.attiva && (
                <button onClick={handleChiudi} disabled={isClosing} style={{ padding: '8px 16px', borderRadius: '8px', border: '0.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '13px', cursor: 'pointer' }}>
                  {isClosing ? 'Chiusura...' : '🔒 Chiudi commessa'}
                </button>
              )}
              {isEdit && selectedCommessaId && !f.attiva && (
                <button onClick={async () => {
                  if (!window.confirm('Riaprire questa commessa?')) return;
                  await supabase.from('commesse').update({ attiva: true, data_chiusura: null }).eq('id', selectedCommessaId);
                  if (progettoId) await supabase.from('progetti').update({ chiuso: false }).eq('id', progettoId);
                  setF(p => ({ ...p, attiva: true }));
                }} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #C0DD97', background: '#f0fdf4', color: '#27500A', fontSize: '13px', cursor: 'pointer' }}>
                  🔓 Riapri commessa
                </button>
              )}
              {isEdit && !f.attiva && (
                <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#94a3b8', display: 'inline-block' }} /> Commessa chiusa
                </div>
              )}
              <button onClick={handleSave} disabled={isSaving || !f.attiva} style={{ padding: '8px 22px', borderRadius: '8px', border: 'none', background: isSaving || !f.attiva ? '#cbd5e1' : NAVY, color: '#fff', fontSize: '13px', fontWeight: 500, cursor: isSaving || !f.attiva ? 'default' : 'pointer' }}>
                {isSaving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ── POPUP BOLLE ORDINE ── */}
      {ordinePopup && (
        <div onClick={e => { e.stopPropagation(); setOrdinePopup(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,18,41,0.45)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 380, maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.22)' }}>
            <div style={{ background: 'var(--brand-800,#001d47)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Bolle associate</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{ordinePopup.ordine.codice}·{ordinePopup.ordine.numero}</div>
              </div>
              <button onClick={() => setOrdinePopup(null)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', padding: '3px 8px', fontSize: 16 }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ordinePopup.bolle.map(b => {
                const cb = consuntiviPerBolla[b.codice] || { oreTec: 0 };
                const g = b.giorni_disponibili || 0;
                const svolti = cb.oreTec / 8;
                const pct = g > 0 ? Math.min(100, Math.round(svolti / g * 100)) : 0;
                const barColor = pct < 70 ? '#16a34a' : pct < 90 ? '#d97706' : '#dc2626';
                return (
                  <div key={b.id} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', border: '0.5px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#185FA5', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 5, padding: '2px 8px', flexShrink: 0 }}>{b.codice}</span>
                      <span style={{ fontSize: 12, color: '#475569', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.descrizione || '—'}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: barColor, flexShrink: 0 }}>{pct}%</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b', marginBottom: 6 }}>
                      <span>Prev: <strong style={{ color: '#0f172a' }}>{g.toFixed(1)}g</strong></span>
                      <span>Svolti: <strong style={{ color: '#185FA5' }}>{svolti.toFixed(1)}g</strong></span>
                      <span>Residui: <strong style={{ color: barColor }}>{Math.max(0, g - svolti).toFixed(1)}g</strong></span>
                    </div>
                    <div style={{ height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ORDINE PIANIFICATO ── */}
      {showOrdineToast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, pointerEvents: 'none' }}>
          <style>{`@keyframes slideUpFadeIn { from { opacity:0; transform:translateX(-50%) translateY(14px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#001d47', color: '#fff', borderRadius: 40, padding: '13px 28px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', fontSize: 14, fontWeight: 600, animation: 'slideUpFadeIn .35s ease', whiteSpace: 'nowrap' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            Ordine pianificato
          </div>
        </div>
      )}

    </div>
  );
}
export function ManageSkillsModal({ skillsConfig, setSkillsConfig, onClose }) {
  const [activeTab, setActiveTab] = useState(SKILLS_FOLDERS[0]);
  const [newSkill, setNewSkill] = useState('');
  const [isPending, setIsPending] = useState(false);

  const addSkill = async () => {
    if (!newSkill.trim() || isPending) return;
    setIsPending(true);
    const name = newSkill.trim();
    const { error } = await supabase.from('skills_settings').insert({ category: activeTab, skill_name: name });
    if (error) { alert('Errore DB: ' + error.message); }
    else { setSkillsConfig(prev => ({ ...prev, [activeTab]: [...(prev[activeTab] || []), name] })); setNewSkill(''); }
    setIsPending(false);
  };

  const removeSkill = async (skill) => {
    if (!window.confirm('Eliminare?')) return;
    const { error } = await supabase.from('skills_settings').delete().eq('category', activeTab).eq('skill_name', skill);
    if (!error) setSkillsConfig(prev => ({ ...prev, [activeTab]: prev[activeTab].filter(s => s !== skill) }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>Gestione Skills</h3>
          <button className="btn-close-circle" onClick={onClose}>×</button>
        </div>
        <div className="folder-tabs" style={{ marginBottom: '15px' }}>
          {SKILLS_FOLDERS.map(f => <button key={f} className={activeTab === f ? 'active' : ''} onClick={() => setActiveTab(f)}>{f}</button>)}
        </div>
        <div className="form-group">
          <label>Nuova voce in {activeTab}</label>
          <div className="form-row" style={{ display: 'flex', gap: '10px' }}>
            <input value={newSkill} onChange={e => setNewSkill(e.target.value)} />
            <button className="btn-add-styled" onClick={addSkill}>{isPending ? '...' : '+'}</button>
          </div>
        </div>
        <div className="staff-scroll" style={{ maxHeight: '250px', overflowY: 'auto', marginTop: '15px' }}>
          {skillsConfig[activeTab]?.map(s => (
            <div key={s} className="staff-manage-row">
              <span>{s}</span>
              <button onClick={() => removeSkill(s)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClientModal({ staff, matrix, onClose }) {
  const [n, setN] = useState('');
  const [codice, setCodice] = useState('');
  const [p, setP] = useState('');
  const [prodotti, setProdotti] = useState([]);
  const [errCodice, setErrCodice] = useState('');
  const pms = staff.filter(s => s.ruolo === 'PM');
  const avatarColor = p ? getAvatarColor(p) : null;

  const handleCodice = (val) => { const cleaned = val.replace(/\D/g, '').slice(0, 8); setCodice(cleaned); setErrCodice(''); };

  const handleSave = async () => {
    if (!n.trim()) return;
    if (!codice || codice.length !== 8) { setErrCodice('Il codice gestionale è obbligatorio (8 cifre).'); return; }
    await supabase.from('projects').insert({ nome_progetto: n.trim(), pm_name: p || null, prodotti, codice_cliente: codice });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>Nuovo Cliente</h3>
          <button className="btn-close-circle" onClick={onClose}>×</button>
        </div>
        <div className="modal-grid">
          <div className="modal-left">
            <div className="form-group"><label>Nome cliente</label><input placeholder="Ragione sociale..." onChange={e => setN(e.target.value)} /></div>
            <div className="form-group">
              <label>Codice gestionale <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600, marginLeft: 6 }}>* obbligatorio</span></label>
              <input placeholder="es. 00012345" value={codice} onChange={e => handleCodice(e.target.value)} style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em', ...(errCodice ? { borderColor: '#fca5a5' } : {}) }} maxLength={8} />
              {errCodice && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 4 }}>{errCodice}</div>}
              {codice.length > 0 && codice.length < 8 && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>{codice.length}/8 cifre</div>}
            </div>
            <div className="form-group">
              <label>Project Manager</label>
              <select value={p} onChange={e => setP(e.target.value)}>
                <option value="">— nessuno —</option>
                {pms.map(s => <option key={staffKey(s)} value={staffKey(s)}>{staffLabel(s)}</option>)}
              </select>
            </div>
            {p && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', marginTop: '4px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor?.bg, color: avatarColor?.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{getInitials(p)}</div>
                <div><div style={{ fontSize: '13px', fontWeight: 600, color: '#0C447C' }}>{p}</div><div style={{ fontSize: '11px', color: '#185FA5', fontStyle: 'italic' }}>Project Manager</div></div>
              </div>
            )}
          </div>
          <div className="modal-right">
            <label className="label-title" style={{ marginBottom: '14px', display: 'block' }}>Prodotti posseduti</label>
            <ProdottiSelector prodotti={prodotti} onChange={setProdotti} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSave}>Salva</button>
        </div>
      </div>
    </div>
  );
}

export function EditClientModal({ client, staff, matrix, clients, onClose }) {
  const [pm, setPm] = useState(client.pm_name || '');
  const [codice, setCodice] = useState(client.codice_cliente || '');
  const [prodotti, setProdotti] = useState(client.prodotti || []);
  const [saving, setSaving] = useState(false);
  const [errCodice, setErrCodice] = useState('');
  const [commSearch, setCommSearch] = useState('');
  const [soloAttive, setSoloAttive] = useState(true);
  const [subModal, setSubModal] = useState(null);

  const pms = staff.filter(s => s.ruolo === 'PM');
  const avatarColor = pm ? getAvatarColor(pm) : null;
  const commesse = client.commesse || [];
  const filteredComm = commesse.filter(co => !soloAttive || co.attiva !== false).filter(co => co.nome_commessa.toLowerCase().includes(commSearch.toLowerCase()));

  const handleCodice = (val) => { const cleaned = val.replace(/\D/g, '').slice(0, 8); setCodice(cleaned); setErrCodice(''); };

  const handleSave = async () => {
    if (!codice || codice.length !== 8) { setErrCodice('Il codice gestionale è obbligatorio (8 cifre).'); return; }
    setSaving(true);
    await supabase.from('projects').update({ pm_name: pm || null, prodotti, codice_cliente: codice }).eq('id', client.id);
    setSaving(false);
    onClose();
  };

  if (subModal !== null) {
    return (
      <ProjectModal staff={staff} clients={clients} matrix={matrix}
        targetedEdit={subModal === 'new' ? { clientId: client.id, commessaId: '' } : { clientId: client.id, commessaId: subModal }}
        onClose={async () => {
          const { data: commData } = await supabase.from('commesse').select('*');
          const { data: tData } = await supabase.from('project_team').select('*');
          const freshComm = (commData || []).filter(co => co.client_id === client.id).map(co => ({ ...co, team: (tData || []).filter(t => t.commessa_id === co.id).map(t => t.staff_name) }));
          client.commesse = freshComm;
          setSubModal(null);
        }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bfdbfe' }}>
              <svg width="18" height="18" viewBox="0 0 38 38" fill="none"><rect x="5" y="14" width="28" height="20" rx="2" stroke="#185FA5" strokeWidth="2"/><path d="M13 14V9a2 2 0 012-2h8a2 2 0 012 2v5" stroke="#185FA5" strokeWidth="2"/><rect x="10" y="20" width="5" height="5" rx="1" stroke="#185FA5" strokeWidth="1.5"/><rect x="23" y="20" width="5" height="5" rx="1" stroke="#185FA5" strokeWidth="1.5"/><rect x="16" y="22" width="6" height="12" rx="1" stroke="#185FA5" strokeWidth="1.5"/></svg>
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{client.nome_progetto}</h3>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>
                Modifica cliente
                {client.codice_cliente && <span style={{ marginLeft: 8, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', border: '0.5px solid #e2e8f0' }}>{client.codice_cliente}</span>}
              </div>
            </div>
          </div>
          <button className="btn-close-circle" onClick={onClose}>×</button>
        </div>
        <div className="modal-grid">
          <div className="modal-left" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div className="form-group">
              <label>Codice gestionale <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600, marginLeft: 6 }}>* obbligatorio</span></label>
              <input placeholder="es. 00012345" value={codice} onChange={e => handleCodice(e.target.value)} style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.1em', ...(errCodice ? { borderColor: '#fca5a5' } : {}) }} maxLength={8} />
              {errCodice && <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 4 }}>{errCodice}</div>}
              {codice.length > 0 && codice.length < 8 && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>{codice.length}/8 cifre</div>}
            </div>
            <div className="form-group">
              <label>Project Manager</label>
              <select value={pm} onChange={e => setPm(e.target.value)}>
                <option value="">— nessuno —</option>
                {pms.map(s => <option key={staffKey(s)} value={staffKey(s)}>{staffLabel(s)}</option>)}
              </select>
            </div>
            {pm && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe', marginBottom: '16px' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor?.bg, color: avatarColor?.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{getInitials(pm)}</div>
                <div><div style={{ fontSize: '13px', fontWeight: 600, color: '#0C447C' }}>{pm}</div><div style={{ fontSize: '11px', color: '#185FA5', fontStyle: 'italic' }}>Project Manager</div></div>
              </div>
            )}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>Commesse</label>
                <button onClick={() => setSoloAttive(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', border: '1px solid', fontSize: '11px', fontWeight: 600, cursor: 'pointer', ...(soloAttive ? { background: '#f0fdf4', borderColor: '#22c55e', color: '#16a34a' } : { background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }) }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{soloAttive && <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'currentColor', display: 'block' }} />}</span>
                  Solo attive
                </button>
                <button onClick={() => setSubModal('new')} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Nuova</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 10px', marginBottom: '8px' }}>
                <svg width="12" height="12" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <input type="text" placeholder="Cerca commessa..." value={commSearch} onChange={e => setCommSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', flex: 1, color: '#0f172a' }} />
                {commSearch && <button onClick={() => setCommSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>}
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filteredComm.length === 0 && <div style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>Nessuna commessa</div>}
                {filteredComm.map(co => (
                  <div key={co.id} onClick={() => setSubModal(co.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0', background: '#fff', transition: 'all 0.15s' }}
                    onMouseOver={e => { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: co.attiva !== false ? '#22c55e' : '#94a3b8' }} />
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a', flex: 1 }}>{co.nome_commessa}</span>
                    {co.pm_commessa && <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>{co.pm_commessa}</span>}
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-right">
            <label className="label-title" style={{ marginBottom: '14px', display: 'block' }}>Prodotti posseduti</label>
            <ProdottiSelector prodotti={prodotti} onChange={setProdotti} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
        </div>
      </div>
    </div>
  );
}

export function ManageClientsModal({ clients, onClose, onEdit }) {
  const [search, setSearch] = useState('');
  const handleDelete = async (id) => { if (window.confirm('Eliminare cliente?')) { await supabase.from('projects').delete().eq('id', id); onClose(); } };
  const filtered = clients.filter(c => c.nome_progetto.toLowerCase().includes(search.toLowerCase()) || (c.codice_cliente || '').includes(search));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}><h3>Anagrafica Clienti</h3></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '7px 12px', marginBottom: '14px' }}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input type="text" placeholder="Cerca cliente o codice..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', flex: 1, color: '#0f172a' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>}
        </div>
        <div className="staff-scroll" style={{ maxHeight: '380px', overflowY: 'auto' }}>
          {filtered.length === 0 && <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '13px' }}>Nessun cliente trovato</div>}
          {filtered.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #f1f5f9', gap: '8px' }}>
              {c.codice_cliente && <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '11px', color: '#94a3b8', background: '#f8fafc', padding: '1px 6px', borderRadius: '4px', border: '0.5px solid #e2e8f0', flexShrink: 0 }}>{c.codice_cliente}</span>}
              <span style={{ fontWeight: 600, cursor: 'pointer', color: '#2563eb', flex: 1, fontSize: '13px' }} onClick={() => onEdit(c)}>{c.nome_progetto}</span>
              {c.pm_name && <span style={{ fontSize: '11px', color: '#64748b', marginRight: '10px', fontStyle: 'italic' }}>{c.pm_name}</span>}
              <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ImportExcelModal({ onClose }) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImporting(true);
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname], { header: 1 });
        const rows = data.slice(1).filter(r => r.length >= 2 && r[1]);
        const records = rows.map(row => ({ codice_cliente: row[0] ? String(row[0]).trim().replace(/\D/g, '').slice(0, 8) : null, nome_progetto: String(row[1] || '').trim(), pm_name: row[2] ? String(row[2]).trim() : null })).filter(r => r.nome_progetto);
        const chunkSize = 500;
        const total = records.length;
        for (let i = 0; i < total; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const { error } = await supabase.from('projects').insert(chunk);
          if (error) { alert('Errore importazione: ' + error.message); return; }
          setProgress(`Importati ${Math.min(i + chunkSize, total)} di ${total} clienti...`);
        }
        onClose();
      } finally { setImporting(false); setProgress(''); }
    };
    reader.readAsBinaryString(file);
  };

  const cols = [{ col: 'A', nome: 'Codice gestionale', fmt: '8 cifre (opzionale)' }, { col: 'B', nome: 'Cliente', fmt: 'ragione sociale' }, { col: 'C', nome: 'PM', fmt: 'nome PM (opzionale)' }];

  return (
    <div className="modal-overlay" onClick={importing ? undefined : onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '360px' }}>
        <button className="btn-close-circle" onClick={importing ? undefined : onClose} style={{ opacity: importing ? 0.3 : 1 }}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}><h3>Importa clienti da Excel</h3></div>
        <div style={{ background: '#1e3a5f', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Struttura file Excel</div>
          {cols.map(r => (
            <div key={r.col} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '5px', padding: '2px 7px', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', flexShrink: 0, minWidth: 22, textAlign: 'center' }}>{r.col}</span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff', flex: 1 }}>{r.nome}</span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{r.fmt}</span>
            </div>
          ))}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>La prima riga viene ignorata (intestazioni)</div>
        </div>
        {importing ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '13px', color: '#0054a6', fontWeight: 600, marginBottom: 8 }}>Importazione in corso...</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{progress}</div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              ⬆ Scegli file Excel
              <input type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}