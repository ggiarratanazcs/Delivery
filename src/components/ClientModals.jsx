import React, { useState, useEffect } from 'react';
import { DatePicker } from './DatePicker.jsx';
import { supabase } from '../supabase.js';
import { REPARTI_STANDARD, SKILLS_FOLDERS, DEFAULT_SKILLS } from '../constants.js';
import { getAvatarColor, getInitials, staffKey, staffLabel, workingDays } from '../utils.js';
import { ProdottiSelector, ProdottiBadges } from './ProdottiSelector.jsx';
import { creaTaskStandard } from './ProgettiView.jsx';
import * as XLSX from 'xlsx';

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
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 9px', border: `1px solid ${open ? '#0d4d8a' : '#e2e8f0'}`, borderRadius: '8px', background: '#fff', cursor: 'pointer', userSelect: 'none' }}>
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
                <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>{b.codice}</span>
                {chiusa && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                <span style={{ fontSize: '10px', opacity: 0.5 }}>×</span>
              </span>
            );
          })
        }
      </div>
      {/* Trigger search */}
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 9px', border: `1px solid ${open ? '#0d4d8a' : '#e2e8f0'}`, borderRadius: '8px', background: '#fff', cursor: 'pointer', userSelect: 'none' }}>
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
                <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: sel ? (chiusa ? '#0F6E56' : '#0054a6') : '#475569', flexShrink: 0 }}>{b.codice}</span>
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
  React.useEffect(() => {
    const h = (e) => { if (sdRef.current && !sdRef.current.contains(e.target)) { setSdOpen(false); setSdSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = options.filter(o => !sdSearch || (o.label ?? o).toString().toLowerCase().includes(sdSearch.toLowerCase()));
  const selLabel = options.find(o => (o.value ?? o) === value)?.label ?? value ?? '';
  return (
    <div ref={sdRef} style={{ position: 'relative' }}>
      <div onClick={() => !disabled && setSdOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${sdOpen ? '#0d4d8a' : '#e2e8f0'}`, padding: '6px 2px 8px', cursor: disabled ? 'default' : 'pointer', minHeight: 34, background: 'transparent' }}>
        <span style={{ fontSize: '13px', color: selLabel ? '#1e293b' : '#94a3b8', fontStyle: selLabel ? 'normal' : 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selLabel || placeholder}</span>
        {!disabled && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: sdOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}><polyline points="6 9 12 15 18 9"/></svg>}
      </div>
      {sdOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9' }}>
            <input value={sdSearch} onChange={e => { e.stopPropagation(); setSdSearch(e.target.value); }} onClick={e => e.stopPropagation()} placeholder="Cerca..." autoFocus
              style={{ width: '100%', padding: '5px 8px', fontSize: '12px', border: '0.5px solid #e2e8f0', borderRadius: 6, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.map((o, i) => { const val = o.value ?? o; const label = o.label ?? o; const isSel = val === value; return (
              <div key={i} onClick={() => { onChange(val); setSdOpen(false); setSdSearch(''); }}
                style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', background: isSel ? '#eff6ff' : '#fff', color: isSel ? '#001d47' : '#1e293b', fontWeight: isSel ? 500 : 400 }}
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
        <div style={{ fontSize: '16px', fontWeight: 500, color: '#fff', fontFamily: 'monospace' }}>{valore > 0 ? fmtEur(valore) : '—'}</div>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.28)', marginTop: '2px' }}>da ordini cliente</div>
      </div>
      {/* Costo */}
      <div style={{ padding: '0 14px', borderRight: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.42)', marginBottom: '3px' }}>Costo manodopera</div>
        <div style={{ fontSize: '16px', fontWeight: 500, color: '#85B7EB', fontFamily: 'monospace' }}>{loadingKpi ? '...' : costo > 0 ? fmtEur(costo) : '—'}</div>
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
          <div style={{ fontSize: '16px', fontWeight: 500, color: marginePerc !== null ? margineColor : 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
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
function OrdineForm({ onSave, onCancel }) {
  const [codice, setCodice] = useState('');
  const [numero, setNumero] = useState('');
  const [data, setData] = useState('');
  const [importo, setImporto] = useState('');

  const handleSave = () => {
    if (!codice.trim() || !numero.trim()) return;
    onSave({ codice: codice.trim().toUpperCase(), numero: numero.trim(), data: data || null, importo: parseFloat(String(importo).replace(',', '.')) || 0 });
  };

  return (
    <div style={{ background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 14px', marginBottom: '8px' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#0C447C', marginBottom: '10px' }}>Nuovo ordine</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Codice *</div>
          <input value={codice} onChange={e => setCodice(e.target.value)} placeholder="es. ABCDE" maxLength={5}
            style={{ width: '100%', fontSize: '13px', border: 'none', borderBottom: '1.5px solid #bfdbfe', background: 'transparent', padding: '3px 0 6px', outline: 'none', fontFamily: 'monospace', letterSpacing: '0.08em', boxSizing: 'border-box', textTransform: 'uppercase' }} autoFocus />
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button onClick={onCancel} style={{ padding: '5px 14px', borderRadius: '8px', border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}>Annulla</button>
        <button onClick={handleSave} disabled={!codice.trim() || !numero.trim()} style={{ padding: '5px 14px', borderRadius: '8px', border: 'none', background: codice.trim() && numero.trim() ? '#001d47' : '#cbd5e1', color: '#fff', fontSize: '12px', fontWeight: 500, cursor: codice.trim() && numero.trim() ? 'pointer' : 'default' }}>Aggiungi</button>
      </div>
    </div>
  );
}

export function ProjectModal({ staff, clients, matrix, targetedEdit, onClose, onOpenProgetto }) {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedCommessaId, setSelectedCommessaId] = useState('');
  const [f, setF] = useState({ nome_commessa: '', pm_commessa: '', team: [], data_inizio: '', data_fine: '', attiva: true });
  const [isEdit, setIsEdit] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progettoId, setProgettoId] = useState(null);
  const [checkingProgetto, setCheckingProgetto] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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

  useEffect(() => {
    if (targetedEdit) {
      setSelectedClientId(targetedEdit.clientId);
      setSelectedCommessaId(targetedEdit.commessaId || '');
    }
  }, [targetedEdit]);

  const pms = staff.filter(s => s.ruolo === 'PM');
  const availableCommesse = clients.find(c => c.id === selectedClientId)?.commesse || [];

  useEffect(() => {
    supabase.from('staff').select('id, nome, cognome, ruolo, team_prodotto')
      .then(({ data }) => setStaffSviluppo(data || []));
  }, []);

  useEffect(() => {
    if (!selectedClientId) { setBolleDisponibili([]); return; }
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
    });
  }, [selectedClientId, clients]);

  useEffect(() => {
    if (selectedCommessaId) {
      const comm = availableCommesse.find(c => c.id === selectedCommessaId);
      if (comm) {
        setF({ nome_commessa: comm.nome_commessa, pm_commessa: comm.pm_commessa || '', team: comm.team || [], data_inizio: comm.data_inizio || '', data_fine: comm.data_fine || '', attiva: comm.attiva !== false });
        setIsEdit(true);
        supabase.from('commesse').select('has_consulenza, has_sviluppo').eq('id', selectedCommessaId).single()
          .then(({ data: td }) => { if (td) { setHasConsulenza(td.has_consulenza !== false); setHasSviluppo(!!td.has_sviluppo); } });
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
      }
    } else {
      setF({ nome_commessa: '', pm_commessa: '', team: [], data_inizio: '', data_fine: '', attiva: true });
      setHasConsulenza(true); setHasSviluppo(false);
      setIsEdit(false); setProgettoId(null);
      setBolleAssociate([]); setTeamLavoro([]);
      setAttivitaSviluppo([]); setWfStati({});
      setShowNuovaAttivita(false); setEditingAttivita(null);
      setOrdiniCommessa([]); setShowOrdineForm(false);
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
      const { data: newOrd } = await supabase.from('ordini_cliente').insert({ ...ordineData, commessa_id: selectedCommessaId }).select().single();
      if (newOrd) setOrdiniCommessa(prev => [...prev, newOrd]);
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
      const payload = { client_id: selectedClientId, nome_commessa: f.nome_commessa.trim(), pm_commessa: f.pm_commessa || null, data_inizio: f.data_inizio || null, data_fine: f.data_fine || null, attiva: f.attiva, has_consulenza: hasConsulenza, has_sviluppo: hasSviluppo };
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
      if (notificheInsert.length > 0) await supabase.from('notifiche').insert(notificheInsert);
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
  const NAVY = '#001d47';
  const sidebarSections = [
    { key: 'generale', label: 'Dati generali', sub: f.nome_commessa || 'Da compilare' },
    { key: 'team', label: 'Team di lavoro', sub: teamLavoro.length > 0 ? `${teamLavoro.length} risorse` : 'Nessuna risorsa' },
    { key: 'bolle', label: 'Bolle', sub: bolleAssociate.length > 0 ? `${bolleAssociate.length} associate` : 'Nessuna bolla' },
    { key: 'ordini', label: 'Ordini cliente', sub: totaleOrdini > 0 ? fmtEur(totaleOrdini) : 'Nessun ordine' },
    ...(hasSviluppo ? [{ key: 'sviluppo', label: 'Attività sviluppo', sub: attivitaSviluppo.filter(a => !isChiusa(a)).length > 0 ? `${attivitaSviluppo.filter(a => !isChiusa(a)).length} aperte` : 'Nessuna attività' }] : []),
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
          <input value={f.nome_commessa} onChange={e => setF({ ...f, nome_commessa: e.target.value })} placeholder="Nome della commessa..." style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #e2e8f0', borderRadius: 0, background: 'transparent', padding: '6px 0 8px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }} />
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

  // ── Sezione Team ───────────────────────────────────────────────
  const SectionTeam = () => (
    <div>
      <MultiSelectDropdown
        options={[...staffSviluppo].sort((a, b) => {
          const ro = { 'PM': 0, 'Consulente': 0, 'Analista': 1, 'Programmatore': 2 };
          const ra = ro[a.ruolo] ?? 3, rb = ro[b.ruolo] ?? 3;
          if (ra !== rb) return ra - rb;
          return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`);
        }).map(s => ({ value: `${s.cognome} ${s.nome}`, label: `${s.cognome} ${s.nome}`, sub: s.ruolo }))}
        selected={teamLavoro} onChange={sel => setTeamLavoro(sel)}
        placeholder="Cerca e seleziona risorse..."
        accentColor="#0054a6" accentBg="#eff6ff" accentBorder="#bfdbfe"
      />
    </div>
  );

  // ── Sezione Bolle ──────────────────────────────────────────────
  const SectionBolle = () => (
    <div>
      {!selectedClientId ? (
        <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Seleziona un cliente nella sezione Dati generali</div>
      ) : bolleDisponibili.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Nessuna bolla disponibile per questo cliente</div>
      ) : (
        <BolleDropdown bolleDisponibili={bolleDisponibili} bolleAssociate={bolleAssociate} onToggle={id => setBolleAssociate(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])} consuntiviPerBolla={consuntiviPerBolla} />
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
          {showOrdineForm && <OrdineForm onSave={handleAddOrdine} onCancel={() => setShowOrdineForm(false)} />}
          {!showOrdineForm && (
            <button onClick={() => setShowOrdineForm(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginBottom: '14px' }}>
              <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: '13px' }} /> Aggiungi ordine
            </button>
          )}
          {ordiniCommessa.length === 0 && !showOrdineForm ? (
            <div style={{ padding: '24px', textAlign: 'center', border: '0.5px dashed #e2e8f0', borderRadius: '10px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Nessun ordine associato</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ordiniCommessa.map((o, i) => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: '0.5px solid #e2e8f0', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#0054a6', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '5px', padding: '2px 8px', flexShrink: 0 }}>{o.codice}·{o.numero}</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{o.data ? new Date(o.data + 'T00:00:00').toLocaleDateString('it-IT') : '—'}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{o.importo ? fmtEur(o.importo) : '—'}</span>
                  <button onClick={() => handleDeleteOrdine(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', fontSize: '14px', padding: '0 2px' }} onMouseOver={e => e.currentTarget.style.color = '#dc2626'} onMouseOut={e => e.currentTarget.style.color = '#e2e8f0'}>
                    <i className="ti ti-trash" aria-hidden="true" style={{ fontSize: '14px' }} />
                  </button>
                </div>
              ))}
              {ordiniCommessa.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px 2px', borderTop: '0.5px solid #e2e8f0', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Totale valore</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 500, color: '#185FA5' }}>{fmtEur(totaleOrdini)}</span>
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
            {bollaAtt && <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, color: '#633806', background: '#FAEEDA', border: '0.5px solid #FAC775', borderRadius: '4px', padding: '1px 6px' }}>{bollaAtt.codice}</span>}
            {att.rif_pratica && <span style={{ fontSize: '10px', color: '#0054a6', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px', fontFamily: 'monospace' }}>{att.rif_pratica}</span>}
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

  // ── Helper FormField ───────────────────────────────────────────
  const FormField = ({ label, children, fullWidth }) => (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto', marginBottom: '18px' }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {children}
    </div>
  );

  // ── Sezione attiva ─────────────────────────────────────────────
  const sectionTitle = { generale: 'Dati generali', team: 'Team di lavoro', bolle: 'Bolle di commessa', ordini: 'Ordini cliente', sviluppo: 'Attività sviluppo' };
  const sectionSub = { generale: 'Cliente, nome, date e tipo commessa', team: 'Risorse assegnate a questa commessa', bolle: 'Bolle di lavoro associate', ordini: 'Ordini e valore contrattuale', sviluppo: 'Attività di sviluppo collegate' };

  const fmtDate = d => { if (!d) return null; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '900px', width: '95vw', padding: 0, overflow: 'hidden' }}>

        {/* ── HEADER ── */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '0.5px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr', minHeight: '480px' }}>

          {/* ── SIDEBAR ── */}
          <div style={{ padding: '14px 10px', borderRight: '0.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '2px', background: '#fafbfc' }}>
            {sidebarSections.map((s, idx) => <NavItem key={s.key} s={s} idx={idx} />)}

            <div style={{ flex: 1 }} />

            {/* Box stato */}
            <div style={{ margin: '8px 4px 4px', padding: '12px', borderRadius: '10px', background: '#fff', border: '0.5px solid #e2e8f0' }}>
              <div style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '7px' }}>Stato commessa</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.attiva !== false ? '#22c55e' : '#94a3b8', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>{f.attiva !== false ? 'Attiva' : 'Chiusa'}</span>
              </div>
              {(f.data_inizio || f.data_fine) && (
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(f.data_inizio) || '—'} → {fmtDate(f.data_fine) || '—'}</div>
              )}
            </div>
          </div>

          {/* ── CONTENUTO SEZIONE ── */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '22px 28px', flex: 1, overflowY: 'auto', maxHeight: '420px' }}>
              <div style={{ fontSize: '15px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>{sectionTitle[activeSection]}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '22px' }}>{sectionSub[activeSection]}</div>
              {activeSection === 'generale' && <SectionGenerale />}
              {activeSection === 'team' && <SectionTeam />}
              {activeSection === 'bolle' && <SectionBolle />}
              {activeSection === 'ordini' && <SectionOrdini />}
              {activeSection === 'sviluppo' && <SectionSviluppo />}
            </div>

            {/* ── KPI ECONOMICO ── */}
            {selectedCommessaId && (
              <div style={{ padding: '10px 20px', borderTop: '0.5px solid #e2e8f0' }}>
                <KpiEconomicoCommessa commessaId={selectedCommessaId} ordiniCommessa={ordiniCommessa} />
              </div>
            )}

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
              <input placeholder="es. 00012345" value={codice} onChange={e => handleCodice(e.target.value)} style={{ fontFamily: 'monospace', letterSpacing: '0.1em', ...(errCodice ? { borderColor: '#fca5a5' } : {}) }} maxLength={8} />
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
                {client.codice_cliente && <span style={{ marginLeft: 8, fontFamily: 'monospace', fontSize: '11px', background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', border: '0.5px solid #e2e8f0' }}>{client.codice_cliente}</span>}
              </div>
            </div>
          </div>
          <button className="btn-close-circle" onClick={onClose}>×</button>
        </div>
        <div className="modal-grid">
          <div className="modal-left" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div className="form-group">
              <label>Codice gestionale <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600, marginLeft: 6 }}>* obbligatorio</span></label>
              <input placeholder="es. 00012345" value={codice} onChange={e => handleCodice(e.target.value)} style={{ fontFamily: 'monospace', letterSpacing: '0.1em', ...(errCodice ? { borderColor: '#fca5a5' } : {}) }} maxLength={8} />
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
              {c.codice_cliente && <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8', background: '#f8fafc', padding: '1px 6px', borderRadius: '4px', border: '0.5px solid #e2e8f0', flexShrink: 0 }}>{c.codice_cliente}</span>}
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
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '5px', padding: '2px 7px', fontFamily: 'monospace', flexShrink: 0, minWidth: 22, textAlign: 'center' }}>{r.col}</span>
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