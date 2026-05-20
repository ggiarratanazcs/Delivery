import React, { useState, useEffect, useRef } from 'react';
import { CardPreviewModal } from './CardPreviewModal.jsx';
import { CardModal } from './CardModal.jsx';
import { ProjectModal } from './ClientModals.jsx';
import { supabase } from '../supabase.js';
import { STATO_COLORS, STATI_TASK, IN_CARICO_OPTIONS } from '../constants.js';
import { getAvatarColor, getInitials, getAvatarUrl, staffKey, staffLabel, getWeekKey, getWeekRange, workingDays } from '../utils.js';
import { ProdottiBadges } from './ProdottiSelector.jsx';
import { creaTaskStandard } from './ProgettiView.jsx';
import { Avatar } from './Avatar.jsx';
import { useIsMobile } from './DesktopOnly.jsx';

// SelectDropdown inline per evitare problemi di import
function SelectDropdown({ options = [], value, onChange, placeholder = 'Scegli...', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = options.filter(o => !search || (o.label ?? o).toString().toLowerCase().includes(search.toLowerCase()));
  const selectedLabel = options.find(o => (o.value ?? o) === value)?.label ?? value ?? '';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => !disabled && setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? '#0d4d8a' : '#e2e8f0'}`, padding: '6px 2px 8px', cursor: disabled ? 'default' : 'pointer', minHeight: 34 }}>
        <span style={{ fontSize: '13px', color: selectedLabel ? '#1e293b' : '#94a3b8', fontStyle: selectedLabel ? 'normal' : 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel || placeholder}</span>
        {!disabled && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}><polyline points="6 9 12 15 18 9"/></svg>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9' }}>
            <input value={search} onChange={e => { e.stopPropagation(); setSearch(e.target.value); }} onClick={e => e.stopPropagation()} placeholder="Cerca..." autoFocus
              style={{ width: '100%', padding: '5px 8px', fontSize: '12px', border: '0.5px solid #e2e8f0', borderRadius: 6, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.map((o, i) => { const val = o.value ?? o; const label = o.label ?? o; const isSel = val === value; return (
              <div key={i} onClick={() => { onChange(val); setOpen(false); setSearch(''); }}
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
// WEEKLY VIEW
// ─────────────────────────────────────────────
export function WeeklyView({ staff, clients, assignments, setAssignments, filterStaff, showOnlyActive, expandClients, expandCommesse }) {
  const [expanded, setExpanded] = useState({});
  const [localNotes, setLocalNotes] = useState({});

  const today = new Date();
  const currentWeek = getWeekKey(today);
  const prevDate = new Date(today); prevDate.setDate(today.getDate() - 7);
  const nextDate = new Date(today); nextDate.setDate(today.getDate() + 7);
  const prevWeek = getWeekKey(prevDate);
  const nextWeek = getWeekKey(nextDate);
  const weeks = [
    { key: prevWeek, label: 'Sett. Precedente', range: getWeekRange(prevWeek), muted: true },
    { key: currentWeek, label: 'Settimana corrente', range: getWeekRange(currentWeek), muted: false },
    { key: nextWeek, label: 'Sett. Successiva', range: getWeekRange(nextWeek), muted: false },
  ];

  const monthKey = today.toLocaleString('it-IT', { month: 'short', year: '2-digit' }).toUpperCase().replace('.', '');
  const filteredStaff = staff.filter(s => staffLabel(s).toLowerCase().includes((filterStaff || '').toLowerCase()));

  const saveGg = async (commessaId, staffName, key, value) => {
    const val = Math.max(0, parseFloat(value) || 0);
    const k = `${commessaId}-${staffName}-${key}`;
    setAssignments(prev => ({ ...prev, [k]: val }));
    await supabase.from('project_assignments').upsert({
      commessa_id: commessaId, staff_name: staffName, mese_anno: key, gg_previsti: val,
    }, { onConflict: 'commessa_id,staff_name,mese_anno' });
  };

  const saveNote = async (commessaId, staffName, weekKey, value) => {
    const noteKey = `note-${commessaId}-${staffName}-${weekKey}`;
    await supabase.from('project_assignments').upsert({
      commessa_id: commessaId, staff_name: staffName, mese_anno: weekKey,
      gg_previsti: parseFloat(assignments[`${commessaId}-${staffName}-${weekKey}`]) || 0,
      note: value,
    }, { onConflict: 'commessa_id,staff_name,mese_anno' });
    setAssignments(prev => ({ ...prev, [`${commessaId}-${staffName}-${weekKey}-note`]: value }));
    setLocalNotes(p => { const n = { ...p }; delete n[noteKey]; return n; });
  };

  const isStaffOpen = (sName) => expandClients || expandCommesse || !!expanded[sName];
  const isClientOpen = (sName, cId) => { if (expandCommesse) return true; return !!expanded[`${sName}-${cId}`]; };
  const isCommesseOpen = (sName, cId) => {
    if (!isClientOpen(sName, cId)) return false;
    if (expandCommesse) return true;
    return !!expanded[`comm-${sName}-${cId}`];
  };
  const toggleStaff = (sName) => setExpanded(p => ({ ...p, [sName]: !isStaffOpen(sName) }));
  const toggleClient = (sName, cId, e) => {
    e.stopPropagation();
    if (!isClientOpen(sName, cId)) {
      setExpanded(p => ({ ...p, [`${sName}-${cId}`]: true, [`comm-${sName}-${cId}`]: true }));
    } else if (isCommesseOpen(sName, cId)) {
      setExpanded(p => ({ ...p, [`comm-${sName}-${cId}`]: false }));
    } else {
      setExpanded(p => ({ ...p, [`comm-${sName}-${cId}`]: true }));
    }
  };
  const toggleCommesse = (sName, cId, e) => {
    e.stopPropagation();
    setExpanded(p => ({ ...p, [`comm-${sName}-${cId}`]: !isCommesseOpen(sName, cId) }));
  };

  const cell = (extra = {}) => ({ padding: '0 8px', verticalAlign: 'middle', ...extra });
  const bdR = (strong) => ({ borderRight: strong ? '2px solid #cbd5e1' : '1px solid #f1f5f9' });
  const bdB = { borderBottom: '1px solid #f1f5f9' };
  const bdBstrong = { borderBottom: '1px solid #e2e8f0' };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', fontSize: '13px' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...cell(), minWidth: 230, position: 'sticky', left: 0, background: '#f8fafc', zIndex: 10, ...bdBstrong, borderRight: '2px solid #e2e8f0', padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Consulente / Cliente / Commessa
            </th>
            <th rowSpan={2} style={{ ...cell({ textAlign: 'center', minWidth: 95 }), background: '#f8fafc', ...bdBstrong, borderRight: '2px solid #cbd5e1' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0054a6', letterSpacing: '0.04em' }}>{monthKey}</div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giorni previsti</div>
            </th>
            {weeks.map((w, i) => (
              <th key={w.key} colSpan={2} style={{ textAlign: 'center', padding: '8px 0 4px', fontSize: '11px', fontWeight: 700, color: w.muted ? '#94a3b8' : '#0054a6', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #e2e8f0', borderRight: i < 2 ? '2px solid #cbd5e1' : undefined, background: w.muted ? '#fafafa' : '#f0f7ff' }}>
                {w.label}
                <span style={{ fontSize: '10px', fontWeight: 400, color: '#94a3b8', display: 'block', marginTop: 1 }}>{w.range}</span>
              </th>
            ))}
          </tr>
          <tr>
            {weeks.map((w, i) => (
              <React.Fragment key={w.key}>
                <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 600, color: '#64748b', background: w.muted ? '#fafafa' : '#f0f7ff', ...bdBstrong, textAlign: 'center', minWidth: 70 }}>GG Prev</th>
                <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 600, color: '#64748b', background: w.muted ? '#fafafa' : '#f0f7ff', ...bdBstrong, borderRight: i < 2 ? '2px solid #cbd5e1' : undefined, minWidth: 150 }}>Note</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredStaff.map(sObj => {
            const sName = staffKey(sObj);
            const staffClients = clients.filter(c => c.commesse.some(co => co.team.includes(sName) && (!showOnlyActive || co.attiva !== false)));
            if (staffClients.length === 0) return null;
            const staffOpen = isStaffOpen(sName);
            const weekTotals = weeks.map(w => staffClients.flatMap(c => c.commesse.filter(co => co.team.includes(sName) && (!showOnlyActive || co.attiva !== false))).reduce((sum, co) => sum + (parseFloat(assignments[`${co.id}-${sName}-${w.key}`]) || 0), 0));
            const monthTotal = staffClients.flatMap(c => c.commesse.filter(co => co.team.includes(sName) && (!showOnlyActive || co.attiva !== false))).reduce((sum, co) => sum + (parseFloat(assignments[`${co.id}-${sName}-${monthKey}`]) || 0), 0);
            const avatarColor = getAvatarColor(sName);
            const initials = getInitials(sName);

            return (
              <React.Fragment key={sName}>
                <tr style={{ background: '#f8fafc', cursor: 'pointer' }} onClick={() => toggleStaff(sName)}>
                  <td style={{ ...cell({ padding: '10px 12px' }), position: 'sticky', left: 0, background: '#f8fafc', zIndex: 5, fontWeight: 700, fontSize: '13px', color: '#0f172a', borderRight: '2px solid #e2e8f0', ...bdBstrong }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, border: `1px solid ${avatarColor.text}22` }}>{initials}</div>
                      <span>{staffLabel(sObj)}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{staffOpen ? '▼' : '▶'}</span>
                    </div>
                  </td>
                  <td style={{ ...cell({ textAlign: 'center' }), borderRight: '2px solid #cbd5e1', ...bdBstrong, fontWeight: 700, color: monthTotal > 0 ? '#0f172a' : '#94a3b8' }}>{monthTotal > 0 ? monthTotal : '—'}</td>
                  {weeks.map((w, i) => {
                    const tot = weekTotals[i];
                    return (
                      <React.Fragment key={w.key}>
                        <td style={{ ...cell({ textAlign: 'center' }), ...bdBstrong, background: w.muted ? '#fafafa' : '#fff', fontWeight: 700, color: tot > 0 ? '#0f172a' : '#94a3b8' }}>{tot > 0 ? tot : '—'}</td>
                        <td style={{ ...cell(), ...bdBstrong, ...bdR(i < 2), background: w.muted ? '#fafafa' : '#fff' }} />
                      </React.Fragment>
                    );
                  })}
                </tr>
                {staffOpen && staffClients.map(c => {
                  const commesse = c.commesse.filter(co => co.team.includes(sName) && (!showOnlyActive || co.attiva !== false));
                  const clientOpen = isClientOpen(sName, c.id);
                  const commOpen = isCommesseOpen(sName, c.id);
                  const clientMonthGg = commesse.reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${sName}-${monthKey}`]) || 0), 0);
                  return (
                    <React.Fragment key={`${sName}-${c.id}`}>
                      <tr style={{ background: '#fff', cursor: 'pointer' }} onClick={(e) => toggleClient(sName, c.id, e)}>
                        <td style={{ ...cell({ paddingLeft: 28, padding: '9px 8px 9px 28px' }), position: 'sticky', left: 0, background: '#fff', zIndex: 5, borderRight: '2px solid #e2e8f0', ...bdB, color: '#2563eb', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: 9, color: '#94a3b8', width: 10 }}>{clientOpen ? '▼' : '▶'}</span>
                            <span style={{ flex: 1 }}>{c.nome_progetto}</span>
                            {clientOpen && <span onClick={(e) => toggleCommesse(sName, c.id, e)} style={{ fontSize: 9, color: commOpen ? '#2563eb' : '#94a3b8', padding: '2px 5px', borderRadius: '4px', background: commOpen ? '#eff6ff' : '#f1f5f9', cursor: 'pointer' }}>{commOpen ? '▴' : '▾'}</span>}
                          </div>
                        </td>
                        <td style={{ ...cell({ textAlign: 'center' }), borderRight: '2px solid #cbd5e1', ...bdB, color: '#475569' }}>{clientMonthGg > 0 ? clientMonthGg : ''}</td>
                        {weeks.map((w, i) => (
                          <React.Fragment key={w.key}>
                            <td style={{ ...cell({ textAlign: 'center' }), ...bdB, background: w.muted ? '#fafafa' : '#fff', color: '#475569' }}>{commesse.reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${sName}-${w.key}`]) || 0), 0) || ''}</td>
                            <td style={{ ...cell(), ...bdB, ...bdR(i < 2), background: w.muted ? '#fafafa' : '#fff' }} />
                          </React.Fragment>
                        ))}
                      </tr>
                      {clientOpen && commOpen && commesse.map(co => (
                        <tr key={`${sName}-${co.id}`} style={{ background: '#fff' }}>
                          <td style={{ ...cell({ paddingLeft: 48, padding: '6px 8px 6px 48px' }), position: 'sticky', left: 0, background: '#fff', zIndex: 5, borderRight: '2px solid #e2e8f0', ...bdB, color: '#64748b', fontSize: '12px' }}>{co.nome_commessa}</td>
                          <td style={{ ...cell({ textAlign: 'center' }), borderRight: '2px solid #cbd5e1', ...bdB, color: '#94a3b8', fontSize: 12 }}>
                            {assignments[`${co.id}-${sName}-${monthKey}`] > 0 ? assignments[`${co.id}-${sName}-${monthKey}`] : '—'}
                          </td>
                          {weeks.map((w, i) => {
                            const noteKey = `note-${co.id}-${sName}-${w.key}`;
                            const noteVal = localNotes[noteKey] !== undefined ? localNotes[noteKey] : (assignments[`${co.id}-${sName}-${w.key}-note`] || '');
                            return (
                              <React.Fragment key={w.key}>
                                <td style={{ ...cell({ textAlign: 'center' }), ...bdB, background: w.muted ? '#fafafa' : '#fff' }}>
                                  {w.muted ? (
                                    <span style={{ fontSize: 12, color: '#94a3b8' }}>{assignments[`${co.id}-${sName}-${w.key}`] > 0 ? assignments[`${co.id}-${sName}-${w.key}`] : '—'}</span>
                                  ) : (
                                    <input type="number" step="0.5" min="0"
                                      value={assignments[`${co.id}-${sName}-${w.key}`] || ''}
                                      onChange={e => saveGg(co.id, sName, w.key, e.target.value)}
                                      style={{ border: 'none', borderBottom: '1.5px solid transparent', background: 'transparent', outline: 'none', textAlign: 'center', width: 44, fontSize: 12, padding: '3px 0' }}
                                      onFocus={e => e.target.style.borderBottomColor = '#0d4d8a'}
                                      onBlur={e => e.target.style.borderBottomColor = 'transparent'} />
                                  )}
                                </td>
                                <td style={{ ...cell(), ...bdB, ...bdR(i < 2), background: w.muted ? '#fafafa' : '#fff' }}>
                                  {w.muted ? (
                                    <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: noteVal ? 'normal' : 'italic' }}>{noteVal || ''}</span>
                                  ) : (
                                    <input type="text" placeholder="" value={noteVal}
                                      onChange={e => setLocalNotes(p => ({ ...p, [noteKey]: e.target.value }))}
                                      onBlur={e => saveNote(co.id, sName, w.key, e.target.value)}
                                      style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '12px', color: '#475569', outline: 'none', fontStyle: noteVal ? 'normal' : 'italic' }} />
                                  )}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                {staffOpen && (
                  <tr style={{ background: '#f0f7ff' }}>
                    <td style={{ ...cell({ padding: '8px 12px 8px 28px' }), position: 'sticky', left: 0, background: '#f0f7ff', zIndex: 5, borderRight: '2px solid #e2e8f0', borderBottom: '2px solid #cbd5e1', fontWeight: 700, fontSize: '11px', color: '#0054a6', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totale Giorni</td>
                    <td style={{ ...cell({ textAlign: 'center' }), borderRight: '2px solid #cbd5e1', borderBottom: '2px solid #cbd5e1', fontWeight: 700, color: '#0054a6' }}>{monthTotal > 0 ? monthTotal : ''}</td>
                    {weeks.map((w, i) => (
                      <React.Fragment key={w.key}>
                        <td style={{ ...cell({ textAlign: 'center' }), borderBottom: '2px solid #cbd5e1', background: w.muted ? '#e8f0fa' : '#dbeafe', fontWeight: 700, color: '#0054a6' }}>{weekTotals[i] > 0 ? weekTotals[i] : ''}</td>
                        <td style={{ ...cell(), borderBottom: '2px solid #cbd5e1', ...bdR(i < 2), background: w.muted ? '#e8f0fa' : '#dbeafe' }} />
                      </React.Fragment>
                    ))}
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOLLA MODALE — popup scheda singola bolla
// ─────────────────────────────────────────────
function BollaModal({ bolla, consuntivi, consuntiviPag, onClose }) {
  if (!bolla) return null;
  const fmtGg = (v) => v % 1 === 0 ? v : parseFloat(v.toFixed(1));
  const orePreviste = parseFloat(bolla.ore_previste) || 0;
  const giorniPrevisti = orePreviste / 8;
  const giorniConsuntivati = (consuntivi[bolla.codice] || 0) / 8;
  const giorniPagamento = (consuntiviPag[bolla.codice] || 0) / 8;
  const giorniResidui = giorniPrevisti - giorniConsuntivati;
  const pct = giorniPrevisti > 0 ? Math.min(100, (giorniConsuntivati / giorniPrevisti) * 100) : 0;
  const overBudget = giorniConsuntivati > giorniPrevisti && giorniPrevisti > 0;
  const esaurita = pct >= 100;
  const senzaTetto = giorniPrevisti === 0;
  const efficacia = giorniConsuntivati > 0 ? (giorniPagamento / giorniConsuntivati) * 100 : null;

  const efficaciaColor = efficacia === null ? '#94a3b8' : efficacia >= 75 ? '#16a34a' : efficacia >= 60 ? '#d97706' : '#dc2626';
  const efficaciaBg = efficacia === null ? '#f8fafc' : efficacia >= 75 ? '#f0fdf4' : efficacia >= 60 ? '#fffbeb' : '#fef2f2';
  const efficaciaBorder = efficacia === null ? '#e2e8f0' : efficacia >= 75 ? '#bbf7d0' : efficacia >= 60 ? '#fde68a' : '#fecaca';

  let statoColor = '#94a3b8', statoLabel = 'Non iniziata', statoBg = '#f8fafc', statoBorder = '#e2e8f0';
  if (senzaTetto) { statoLabel = 'A consumo'; statoColor = '#d97706'; statoBg = '#fffbeb'; statoBorder = '#fde68a'; }
  else if (overBudget) { statoLabel = 'Sforamento'; statoColor = '#dc2626'; statoBg = '#fef2f2'; statoBorder = '#fecaca'; }
  else if (esaurita) { statoLabel = 'Esaurita'; statoColor = '#64748b'; statoBg = '#f1f5f9'; statoBorder = '#e2e8f0'; }
  else if (giorniConsuntivati > 0) { statoLabel = 'In corso'; statoColor = '#16a34a'; statoBg = '#f0fdf4'; statoBorder = '#bbf7d0'; }

  const StatBox = ({ val, label, color }) => (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 80 }}>
      <div style={{ fontSize: '28px', fontWeight: 800, color: color || '#0f172a', lineHeight: 1.1 }}>{val}</div>
      <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '560px', boxShadow: '0 32px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #001d47 0%, #0054a6 100%)', padding: '24px 28px', position: 'relative' }}>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Bolla di lavoro</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 800, color: '#fff', background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>{bolla.codice}</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: statoColor, background: statoBg, border: `1px solid ${statoBorder}`, padding: '3px 12px', borderRadius: '20px' }}>{statoLabel}</span>
          </div>
          {bolla.descrizione && <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: 8, fontWeight: 400 }}>{bolla.descrizione}</div>}
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: '18px', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Barra avanzamento */}
          {!senzaTetto && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '12px', color: '#64748b' }}>
                <span>Avanzamento</span>
                <span style={{ fontWeight: 700, color: overBudget ? '#dc2626' : '#0054a6' }}>{Math.round(pct)}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${overBudget ? 100 : pct}%`, height: '100%', background: overBudget ? '#E24B4A' : esaurita ? '#94a3b8' : '#0054a6', borderRadius: '5px', transition: 'width 0.4s' }} />
              </div>
            </div>
          )}
          {senzaTetto && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#d97706', fontStyle: 'italic' }}>
              Bolla a consumo — nessun tetto ore definito
            </div>
          )}

          {/* Stat boxes */}
          <div style={{ display: 'flex', gap: '8px', background: '#f8fafc', borderRadius: '14px', padding: '20px 16px', border: '1px solid #e2e8f0' }}>
            <StatBox val={senzaTetto ? '∞' : fmtGg(giorniPrevisti)} label="Previsti" color="#475569" />
            <div style={{ width: '1px', background: '#e2e8f0', flexShrink: 0 }} />
            <StatBox val={fmtGg(giorniConsuntivati)} label="Svolti" color={overBudget ? '#dc2626' : giorniConsuntivati > 0 ? '#16a34a' : '#94a3b8'} />
            {!senzaTetto && <>
              <div style={{ width: '1px', background: '#e2e8f0', flexShrink: 0 }} />
              <StatBox val={overBudget ? `-${fmtGg(Math.abs(giorniResidui))}` : fmtGg(giorniResidui)} label="Residui" color={overBudget ? '#dc2626' : giorniResidui <= 2 ? '#d97706' : '#475569'} />
            </>}
            <div style={{ width: '1px', background: '#e2e8f0', flexShrink: 0 }} />
            <StatBox val={fmtGg(giorniPagamento)} label="Pagamento" color={giorniPagamento > 0 ? '#0054a6' : '#94a3b8'} />
            <div style={{ width: '1px', background: '#e2e8f0', flexShrink: 0 }} />
            <div style={{ textAlign: 'center', flex: 1, minWidth: 80, background: efficaciaBg, border: `1px solid ${efficaciaBorder}`, borderRadius: '10px', padding: '8px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: efficaciaColor, lineHeight: 1.1 }}>{efficacia !== null ? `${Math.round(efficacia)}%` : '—'}</div>
              <div style={{ fontSize: '10px', color: efficaciaColor, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4, opacity: 0.85 }}>Efficacia</div>
            </div>
          </div>

          {/* Info aggiuntive */}
          {(bolla.codice_cliente || bolla.commessa_id) && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {bolla.codice_cliente && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', fontSize: '12px' }}>
                  <span style={{ color: '#94a3b8' }}>Cod. cliente: </span>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{bolla.codice_cliente}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// BOLLA CARD — riga cliccabile
// ─────────────────────────────────────────────
function BollaCard({ b, consuntivi, consuntiviPag, commesseMap, onClick }) {
  const fmtGg = (v) => v % 1 === 0 ? v : parseFloat(v.toFixed(1));
  const orePreviste = parseFloat(b.ore_previste) || 0;
  const giorniPrevisti = orePreviste / 8;
  const giorniConsuntivati = (consuntivi[b.codice] || 0) / 8;
  const giorniPagamento = (consuntiviPag[b.codice] || 0) / 8;
  const giorniResidui = giorniPrevisti - giorniConsuntivati;
  const pct = giorniPrevisti > 0 ? Math.min(100, (giorniConsuntivati / giorniPrevisti) * 100) : 0;
  const overBudget = giorniConsuntivati > giorniPrevisti && giorniPrevisti > 0;
  const esaurita = pct >= 100;
  const senzaTetto = giorniPrevisti === 0;
  const efficacia = giorniConsuntivati > 0 ? (giorniPagamento / giorniConsuntivati) * 100 : null;

  const efficaciaColor = efficacia === null ? '#94a3b8' : efficacia >= 75 ? '#16a34a' : efficacia >= 60 ? '#d97706' : '#dc2626';
  const efficaciaBg = efficacia === null ? '#f8fafc' : efficacia >= 75 ? '#f0fdf4' : efficacia >= 60 ? '#fffbeb' : '#fef2f2';
  const efficaciaBorder = efficacia === null ? '#e2e8f0' : efficacia >= 75 ? '#bbf7d0' : efficacia >= 60 ? '#fde68a' : '#fecaca';

  let statoColor = '#94a3b8', statoLabel = 'Non iniziata', statoBg = '#f8fafc', statoBorder = '#e2e8f0';
  if (senzaTetto) { statoLabel = 'A consumo'; statoColor = '#d97706'; statoBg = '#fffbeb'; statoBorder = '#fde68a'; }
  else if (overBudget) { statoLabel = 'Sforamento'; statoColor = '#dc2626'; statoBg = '#fef2f2'; statoBorder = '#fecaca'; }
  else if (esaurita) { statoLabel = 'Esaurita'; statoColor = '#64748b'; statoBg = '#f1f5f9'; statoBorder = '#e2e8f0'; }
  else if (giorniConsuntivati > 0) { statoLabel = 'In corso'; statoColor = '#16a34a'; statoBg = '#f0fdf4'; statoBorder = '#bbf7d0'; }

  return (
    <div onClick={onClick} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.15s, border-color 0.15s' }}
      onMouseOver={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,84,166,0.10)'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#0054a6', background: '#eff6ff', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', flexShrink: 0 }}>{b.codice}</span>
        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500, flex: 1 }}>{b.descrizione || '—'}</span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: statoColor, background: statoBg, border: `1px solid ${statoBorder}`, padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>{statoLabel}</span>
        {onClick && <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>→</span>}
      </div>
      {commesseMap && b.commessa_id && commesseMap[b.commessa_id] && (
        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#94a3b8' }}>Commessa:</span>
          <span style={{ fontWeight: 600, color: '#475569' }}>{commesseMap[b.commessa_id]}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ textAlign: 'center', minWidth: 44 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: senzaTetto ? '#94a3b8' : '#0f172a' }}>{senzaTetto ? '∞' : fmtGg(giorniPrevisti)}</div>
          <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>previsti</div>
        </div>
        <div style={{ flex: 1 }}>
          {!senzaTetto ? (
            <>
              <div style={{ width: '100%', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                <div style={{ width: `${overBudget ? 100 : pct}%`, height: '100%', background: overBudget ? '#E24B4A' : esaurita ? '#94a3b8' : '#639922', borderRadius: '3px', transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>{Math.round(pct)}% consumato</div>
            </>
          ) : (
            <div style={{ fontSize: '11px', color: '#d97706', fontStyle: 'italic', textAlign: 'center' }}>A consumo</div>
          )}
        </div>
        <div style={{ textAlign: 'center', minWidth: 44 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: overBudget ? '#dc2626' : giorniConsuntivati > 0 ? '#16a34a' : '#94a3b8' }}>{fmtGg(giorniConsuntivati)}</div>
          <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>svolti</div>
        </div>
        {!senzaTetto && (
          <div style={{ textAlign: 'center', minWidth: 44 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: overBudget ? '#dc2626' : giorniResidui <= 2 ? '#d97706' : '#475569' }}>
              {overBudget ? `-${fmtGg(Math.abs(giorniResidui))}` : fmtGg(giorniResidui)}
            </div>
            <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>residui</div>
          </div>
        )}
        <div style={{ width: '1px', height: '40px', background: '#e2e8f0', flexShrink: 0 }} />
        <div style={{ textAlign: 'center', minWidth: 44 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: giorniPagamento > 0 ? '#0054a6' : '#94a3b8' }}>{fmtGg(giorniPagamento)}</div>
          <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>pagamento</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 56, background: efficaciaBg, border: `1px solid ${efficaciaBorder}`, borderRadius: '8px', padding: '6px 8px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: efficaciaColor }}>{efficacia !== null ? `${Math.round(efficacia)}%` : '—'}</div>
          <div style={{ fontSize: '9px', color: efficaciaColor, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>efficacia</div>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 12px' }}>
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
        <path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <input type="text" placeholder={placeholder || 'Cerca per codice o descrizione...'} value={value} onChange={e => onChange(e.target.value)}
        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', flex: 1, color: '#0f172a' }} />
      {value && <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>}
    </div>
  );
}

// ─────────────────────────────────────────────
// BOLLE CLIENTE
// ─────────────────────────────────────────────
function BolleCliente({ clientId, clients }) {
  const [bolle, setBolle] = useState([]);
  const [consuntivi, setConsuntivi] = useState({});
  const [consuntiviPag, setConsuntiviPag] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [bollaSelezionata, setBollaSelezionata] = useState(null);

  const client = clients.find(c => c.id === clientId);

  useEffect(() => {
    if (!client?.codice_cliente) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const { data: bolleData } = await supabase.from('bolle_lavoro').select('*').eq('codice_cliente', client.codice_cliente).order('codice');
      const { data: cgData } = await supabase.from('consuntivi_globali').select('codice_bolla, ore_tecniche, ore_pagamento').eq('codice_cliente', client.codice_cliente);
      const cg = {}, cgp = {};
      if (cgData) cgData.forEach(r => {
        cg[r.codice_bolla] = (cg[r.codice_bolla] || 0) + (parseFloat(r.ore_tecniche) || 0);
        cgp[r.codice_bolla] = (cgp[r.codice_bolla] || 0) + (parseFloat(r.ore_pagamento) || 0);
      });
      setBolle(bolleData || []);
      setConsuntivi(cg);
      setConsuntiviPag(cgp);
      setLoading(false);
    };
    load();
  }, [clientId, client?.codice_cliente]);

  if (loading) return <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px' }}>Caricamento bolle...</div>;
  if (!client?.codice_cliente) return <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Nessun codice gestionale associato a questo cliente.</div>;
  if (bolle.length === 0) return <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Nessuna bolla importata per questo cliente.</div>;

  const commesseMap = {};
  client.commesse.forEach(co => { commesseMap[co.id] = co.nome_commessa; });

  const bolleFiltered = bolle.filter(b => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return b.codice.toLowerCase().includes(q) || (b.descrizione || '').toLowerCase().includes(q);
  });

  const bolleAssociate = bolleFiltered.filter(b => b.commessa_id);
  const bolleLibere = bolleFiltered.filter(b => !b.commessa_id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <FilterBar value={filterText} onChange={setFilterText} />
      {bolleFiltered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Nessuna bolla trovata per "{filterText}"</div>
      )}
      {bolleAssociate.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>Associate a commessa ({bolleAssociate.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bolleAssociate.map(b => <BollaCard key={b.id} b={b} consuntivi={consuntivi} consuntiviPag={consuntiviPag} commesseMap={commesseMap} onClick={() => setBollaSelezionata(b)} />)}
          </div>
        </div>
      )}
      {bolleLibere.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>Non associate ({bolleLibere.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bolleLibere.map(b => <BollaCard key={b.id} b={b} consuntivi={consuntivi} consuntiviPag={consuntiviPag} commesseMap={commesseMap} onClick={() => setBollaSelezionata(b)} />)}
          </div>
        </div>
      )}
      {bollaSelezionata && <BollaModal bolla={bollaSelezionata} consuntivi={consuntivi} consuntiviPag={consuntiviPag} onClose={() => setBollaSelezionata(null)} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// BOLLE COMMESSA
// ─────────────────────────────────────────────
function BolleCommessa({ commessaId }) {
  const [bolle, setBolle] = useState([]);
  const [consuntivi, setConsuntivi] = useState({});
  const [consuntiviPag, setConsuntiviPag] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [bollaSelezionata, setBollaSelezionata] = useState(null);

  useEffect(() => {
    if (!commessaId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const { data: bolleData } = await supabase.from('bolle_lavoro').select('*').eq('commessa_id', commessaId).order('codice');
      if (!bolleData || bolleData.length === 0) { setBolle([]); setLoading(false); return; }
      const codici = bolleData.map(b => b.codice);
      const { data: cgData } = await supabase.from('consuntivi_globali').select('codice_bolla, ore_tecniche, ore_pagamento').in('codice_bolla', codici);
      const cg = {}, cgp = {};
      if (cgData) cgData.forEach(r => {
        cg[r.codice_bolla] = (cg[r.codice_bolla] || 0) + (parseFloat(r.ore_tecniche) || 0);
        cgp[r.codice_bolla] = (cgp[r.codice_bolla] || 0) + (parseFloat(r.ore_pagamento) || 0);
      });
      setBolle(bolleData);
      setConsuntivi(cg);
      setConsuntiviPag(cgp);
      setLoading(false);
    };
    load();
  }, [commessaId]);

  if (loading) return <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px' }}>Caricamento bolle...</div>;
  if (bolle.length === 0) return <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Nessuna bolla associata a questa commessa.</div>;

  const bolleFiltered = bolle.filter(b => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return b.codice.toLowerCase().includes(q) || (b.descrizione || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <FilterBar value={filterText} onChange={setFilterText} />
      {bolleFiltered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Nessuna bolla trovata per "{filterText}"</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {bolleFiltered.map(b => <BollaCard key={b.id} b={b} consuntivi={consuntivi} consuntiviPag={consuntiviPag} commesseMap={null} onClick={() => setBollaSelezionata(b)} />)}
        </div>
      )}
      {bollaSelezionata && <BollaModal bolla={bollaSelezionata} consuntivi={consuntivi} consuntiviPag={consuntiviPag} onClose={() => setBollaSelezionata(null)} />}
    </div>
  );
}

export { BolleCommessa };

// ─────────────────────────────────────────────
// SCHEDA DATI (admin only)
// ─────────────────────────────────────────────
function DatiView({ clients, staff }) {
  const [kpi, setKpi] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  // ── Importa Cliente ──
  const [newCliente, setNewCliente] = useState({ nome: '', codice_esterno: '', pm_name: '' });
  const [clienteStatus, setClienteStatus] = useState(null);
  const [clienteSaving, setClienteSaving] = useState(false);
  const [clientiFile, setClientiFile] = useState(null);
  const [clientiFileStatus, setClientiFileStatus] = useState(null);
  const [clientiFileSaving, setClientiFileSaving] = useState(false);
  const clientiInputRef = useRef(null);

  // ── Importa Bolle ──
  const [bolleFile, setBolleFile] = useState(null);
  const [bolleStatus, setBolleStatus] = useState(null);
  const [bolleSaving, setBolleSaving] = useState(false);
  const bolleInputRef = useRef(null);

  // ── Importa Consuntivi ──
  const [consuntiviFile, setConsuntiviFile] = useState(null);
  const [consuntiviStatus, setConsuntiviStatus] = useState(null);
  const [consuntiviSaving, setConsuntiviSaving] = useState(false);
  const consuntiviInputRef = useRef(null);

  // ── Ricerca Bolle ──
  const [bolleSearch, setBolleSearch] = useState('');
  const [bolleRicerca, setBolleRicerca] = useState([]);
  const [bolleRicercaCons, setBolleRicercaCons] = useState({});
  const [bolleRicercaPag, setBolleRicercaPag] = useState({});
  const [bolleRicercaLoading, setBolleRicercaLoading] = useState(false);
  const [bollaAperta, setBollaAperta] = useState(null);

  useEffect(() => {
    const load = async () => {
      setKpiLoading(true);
      try {
        const nClienti = clients.length;
        const nRisorse = staff.length;

        // Bolle
        const { data: bolleData } = await supabase.from('bolle_lavoro').select('codice, ore_previste');
        const { data: cgData } = await supabase.from('consuntivi_globali').select('codice_bolla, ore_tecniche, ore_pagamento');

        const nBolle = bolleData?.length || 0;
        const totGiorniPrevisti = (bolleData || []).reduce((s, b) => s + ((parseFloat(b.ore_previste) || 0) / 8), 0);

        let totOreTecniche = 0, totOrePagamento = 0;
        (cgData || []).forEach(r => {
          totOreTecniche += parseFloat(r.ore_tecniche) || 0;
          totOrePagamento += parseFloat(r.ore_pagamento) || 0;
        });
        const totGiorniFatti = totOreTecniche / 8;
        const totGiorniPagamento = totOrePagamento / 8;
        const efficaciaGlobale = totGiorniFatti > 0 ? (totGiorniPagamento / totGiorniFatti) * 100 : null;

        // Breakdown prodotti clienti (da campo prodotti_posseduti o simile)
        // Leggo tutti i clienti con i loro prodotti
        const { data: clientiData } = await supabase.from('projects').select('id, prodotti');
        const prodottiCount = {};
        (clientiData || []).forEach(c => {
          const prods = Array.isArray(c.prodotti) ? c.prodotti : [];
          prods.forEach(p => { prodottiCount[p] = (prodottiCount[p] || 0) + 1; });
        });

        // Breakdown ruoli staff
        const ruoliCount = {};
        staff.forEach(s => {
          const r = s.ruolo || 'Non definito';
          ruoliCount[r] = (ruoliCount[r] || 0) + 1;
        });

        setKpi({ nClienti, nRisorse, nBolle, totGiorniPrevisti, totGiorniFatti, totGiorniPagamento, efficaciaGlobale, prodottiCount, ruoliCount });
      } catch (e) {
        console.error('Errore KPI:', e);
      }
      setKpiLoading(false);
    };
    load();
  }, [clients, staff]);

  // ── Ricerca bolle live ──
  useEffect(() => {
    if (!bolleSearch.trim()) { setBolleRicerca([]); return; }
    const timer = setTimeout(async () => {
      setBolleRicercaLoading(true);
      const q = bolleSearch.trim();
      const { data } = await supabase.from('bolle_lavoro').select('*')
        .or(`codice.ilike.%${q}%,descrizione.ilike.%${q}%`)
        .order('codice').limit(30);
      if (data && data.length > 0) {
        const codici = data.map(b => b.codice);
        const { data: cgData } = await supabase.from('consuntivi_globali')
          .select('codice_bolla, ore_tecniche, ore_pagamento').in('codice_bolla', codici);
        const cg = {}, cgp = {};
        (cgData || []).forEach(r => {
          cg[r.codice_bolla] = (cg[r.codice_bolla] || 0) + (parseFloat(r.ore_tecniche) || 0);
          cgp[r.codice_bolla] = (cgp[r.codice_bolla] || 0) + (parseFloat(r.ore_pagamento) || 0);
        });
        setBolleRicercaCons(cg);
        setBolleRicercaPag(cgp);
      }
      setBolleRicerca(data || []);
      setBolleRicercaLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [bolleSearch]);

  const fmtGg = (v) => {
    if (v === undefined || v === null) return '—';
    const n = parseFloat(v);
    return isNaN(n) ? '—' : (n % 1 === 0 ? n.toString() : n.toFixed(1));
  };

  // ── Handler Importa Cliente (form) ──
  const handleImportaCliente = async () => {
    if (!newCliente.nome.trim()) { setClienteStatus({ type: 'error', msg: 'Il nome del cliente è obbligatorio.' }); return; }
    setClienteSaving(true); setClienteStatus(null);
    const { error } = await supabase.from('projects').insert({
      nome_progetto: newCliente.nome.trim(),
      codice_cliente: newCliente.codice_esterno.trim() || null,
      pm_name: newCliente.pm_name.trim() || null,
    });
    setClienteSaving(false);
    if (error) { setClienteStatus({ type: 'error', msg: 'Errore: ' + error.message }); }
    else { setClienteStatus({ type: 'success', msg: `✓ Cliente "${newCliente.nome}" aggiunto.` }); setNewCliente({ nome: '', codice_esterno: '', pm_name: '' }); }
  };

  // ── Handler Import Excel Clienti ──
  // Colonne Excel attese: Nome cliente | Codice esterno | PM
  const handleImportaClientiExcel = async () => {
    if (!clientiFile) { setClientiFileStatus({ type: 'error', msg: 'Seleziona un file Excel.' }); return; }
    setClientiFileSaving(true); setClientiFileStatus(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await clientiFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const dataRows = rows.slice(1).filter(r => r[0]);
      if (dataRows.length === 0) throw new Error('Nessuna riga dati trovata.');
      const records = dataRows.map((r, i) => {
        if (!r[0]) throw new Error(`Riga ${i + 2}: nome cliente mancante.`);
        return { nome_progetto: String(r[0]).trim(), codice_cliente: r[1] ? String(r[1]).trim() : null, pm_name: r[2] ? String(r[2]).trim() : null };
      });
      const BATCH = 100;
let errore = null;
for (let i = 0; i < records.length; i += BATCH) {
  const chunk = records.slice(i, i + BATCH);
  const { error } = await supabase.from('projects').upsert(chunk, { onConflict: 'codice_cliente' });
  if (error) { errore = error; break; }
}
if (errore) throw new Error(errore.message);
setClientiFileStatus({ type: 'success', msg: `✓ Importati ${records.length} clienti.` });
      setClientiFile(null);
      if (clientiInputRef.current) clientiInputRef.current.value = '';
    } catch (err) {
      setClientiFileStatus({ type: 'error', msg: '✗ ' + err.message });
    }
    setClientiFileSaving(false);
  };

  // ── Handler Importa Bolle ──
  // Colonne: Codice bolla | Descrizione | Codice cliente | Ore previste | ID commessa (opz)
  const handleImportaBolle = async () => {
    if (!bolleFile) { setBolleStatus({ type: 'error', msg: 'Seleziona un file Excel.' }); return; }
    setBolleSaving(true); setBolleStatus(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await bolleFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const dataRows = rows.slice(1).filter(r => r[0]);
      if (dataRows.length === 0) throw new Error('Nessuna riga dati trovata.');
      const records = dataRows.map((r, i) => {
        if (!r[0]) throw new Error(`Riga ${i + 2}: codice bolla mancante.`);
        return {
          codice: String(r[0]).trim(),
          descrizione: r[1] ? String(r[1]).trim() : null,
          codice_cliente: r[2] ? String(r[2]).trim() : null,
          ore_previste: parseFloat(r[3]) || 0,
          commessa_id: r[4] ? String(r[4]).trim() : null,
        };
      });
      const { error } = await supabase.from('bolle_lavoro').upsert(records, { onConflict: 'codice' });
      if (error) throw new Error(error.message);
      setBolleStatus({ type: 'success', msg: `✓ Importate ${records.length} bolle.` });
      setBolleFile(null);
      if (bolleInputRef.current) bolleInputRef.current.value = '';
    } catch (err) {
      setBolleStatus({ type: 'error', msg: '✗ ' + err.message });
    }
    setBolleSaving(false);
  };

  // ── Handler Importa Consuntivi → consuntivi_globali ──
  // Colonne: Data | Codice Cliente | Utente/Operatore | Note | Ore Tecniche | Ore Pagamento | Bolla
  const handleImportaConsuntivi = async () => {
    if (!consuntiviFile) { setConsuntiviStatus({ type: 'error', msg: 'Seleziona un file Excel.' }); return; }
    setConsuntiviSaving(true); setConsuntiviStatus(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await consuntiviFile.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const dataRows = rows.slice(1).filter(r => r[0]);
      if (dataRows.length === 0) throw new Error('Nessuna riga dati trovata.');

      const records = dataRows.map((r, i) => {
        // Col A: Data → anno_mese (YYYY-MM)
        const rawDate = r[0];
        let annoMese = '';
        if (rawDate instanceof Date) {
          annoMese = rawDate.toISOString().slice(0, 7); // YYYY-MM
        } else if (typeof rawDate === 'string') {
          const parts = rawDate.split(/[-\/]/);
          if (parts.length === 3) {
            // DD-MM-YYYY o DD/MM/YYYY
            const [d, m, y] = parts;
            annoMese = `${y.length === 2 ? '20' + y : y}-${m.padStart(2, '0')}`;
          } else throw new Error(`Riga ${i + 2}: formato data non riconosciuto (${rawDate}).`);
        } else {
          throw new Error(`Riga ${i + 2}: data mancante.`);
        }
        return {
          anno_mese: annoMese,                           // Col A
          codice_cliente: r[1] ? String(r[1]).trim() : null,  // Col B
          codice_operatore: r[2] ? String(r[2]).trim() : null, // Col C
          note_attivita: r[3] ? String(r[3]).trim() : null,   // Col D
          ore_tecniche: parseFloat(r[4]) || 0,                // Col E
          ore_pagamento: parseFloat(r[5]) || 0,               // Col F
          codice_bolla: r[6] ? String(r[6]).trim() : null,    // Col G
        };
      });

      const { error } = await supabase.from('consuntivi_globali').insert(records);
      if (error) throw new Error(error.message);
      setConsuntiviStatus({ type: 'success', msg: `✓ Importati ${records.length} consuntivi.` });
      setConsuntiviFile(null);
      if (consuntiviInputRef.current) consuntiviInputRef.current.value = '';
    } catch (err) {
      setConsuntiviStatus({ type: 'error', msg: '✗ ' + err.message });
    }
    setConsuntiviSaving(false);
  };

  // ── Stili condivisi ──
  const sectionStyle = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' };
  const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: '11px', fontWeight: 700, color: '#475569', gap: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { padding: '9px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', color: '#0f172a', background: '#f8fafc', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const btnStyle = (disabled) => ({ padding: '9px 20px', borderRadius: '9px', border: 'none', background: disabled ? '#e2e8f0' : '#0054a6', color: disabled ? '#94a3b8' : '#fff', fontSize: '13px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 });
  const statusStyle = (type) => ({ padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: type === 'success' ? '#f0fdf4' : '#fef2f2', color: type === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}` });
  const fileDropStyle = (hasFile) => ({ border: `2px dashed ${hasFile ? '#0054a6' : '#cbd5e1'}`, borderRadius: '10px', padding: '16px 20px', textAlign: 'center', cursor: 'pointer', background: hasFile ? '#eff6ff' : '#f8fafc', color: hasFile ? '#0054a6' : '#94a3b8', fontSize: '13px', transition: 'all 0.15s' });
  const colTipStyle = { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', color: '#475569', fontFamily: 'monospace' };

  // ── KPI Cards ──
  const RUOLI_ORDER = ['PM', 'Project Manager', 'Consulente', 'Programmatore', 'Analista'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── KPI STRIP ── */}
      {kpiLoading ? (
        <div style={{ color: '#94a3b8', fontSize: '13px', padding: '12px 0' }}>Caricamento KPI...</div>
      ) : kpi && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>

          {/* KPI CLIENTI */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#eff6ff', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🏢</div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#0054a6', lineHeight: 1 }}>{kpi.nClienti}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: 2 }}>Clienti</div>
              </div>
            </div>
            {Object.keys(kpi.prodottiCount).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                {Object.entries(kpi.prodottiCount).sort((a, b) => b[1] - a[1]).map(([prod, cnt]) => (
                  <div key={prod} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{prod}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0054a6' }}>{cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPI RISORSE */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>👤</div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{kpi.nRisorse}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: 2 }}>Risorse</div>
              </div>
            </div>
            {Object.keys(kpi.ruoliCount).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                {RUOLI_ORDER.filter(r => kpi.ruoliCount[r]).map(r => (
                  <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{r}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{kpi.ruoliCount[r]}</span>
                  </div>
                ))}
                {Object.entries(kpi.ruoliCount).filter(([r]) => !RUOLI_ORDER.includes(r)).map(([r, cnt]) => (
                  <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{r}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPI BOLLE */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', flex: '2 1 300px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fffbeb', border: '1.5px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📋</div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{kpi.nBolle}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', marginTop: 2 }}>Bolle</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Giorni lavoro previsti</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{fmtGg(kpi.totGiorniPrevisti)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Fatti</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{fmtGg(kpi.totGiorniFatti)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Pagamento</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0054a6' }}>{fmtGg(kpi.totGiorniPagamento)}</span>
              </div>
              {kpi.efficaciaGlobale !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px dashed #f1f5f9' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Efficacia globale</span>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: kpi.efficaciaGlobale >= 75 ? '#16a34a' : kpi.efficaciaGlobale >= 60 ? '#d97706' : '#dc2626' }}>{Math.round(kpi.efficaciaGlobale)}%</span>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── RICERCA BOLLE ── */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span> Ricerca Bolle
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4 }}>Cerca una bolla per codice o descrizione — clicca per aprire la scheda</div>
        </div>
        <FilterBar value={bolleSearch} onChange={setBolleSearch} placeholder="Cerca bolla per codice o descrizione..." />
        {bolleRicercaLoading && <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: 8 }}>Ricerca in corso...</div>}
        {!bolleRicercaLoading && bolleSearch && bolleRicerca.length === 0 && (
          <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: 12, fontStyle: 'italic' }}>Nessuna bolla trovata per "{bolleSearch}"</div>
        )}
        {bolleRicerca.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
            {bolleRicerca.map(b => (
              <BollaCard key={b.id} b={b} consuntivi={bolleRicercaCons} consuntiviPag={bolleRicercaPag} commesseMap={null} onClick={() => setBollaAperta(b)} />
            ))}
          </div>
        )}
        {bollaAperta && <BollaModal bolla={bollaAperta} consuntivi={bolleRicercaCons} consuntiviPag={bolleRicercaPag} onClose={() => setBollaAperta(null)} />}
      </div>

      {/* ── IMPORTA CLIENTE ── */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '18px' }}>🏢</span> Importa Cliente</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4 }}>Aggiunge un nuovo cliente all'anagrafica</div>
        </div>

        {/* Form singolo */}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Inserimento manuale</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          <label style={labelStyle}>Nome cliente *<input style={inputStyle} type="text" placeholder="es. Comune di Firenze" value={newCliente.nome} onChange={e => setNewCliente(p => ({ ...p, nome: e.target.value }))} /></label>
          <label style={labelStyle}>Codice esterno<input style={inputStyle} type="text" placeholder="es. EXT-001" value={newCliente.codice_esterno} onChange={e => setNewCliente(p => ({ ...p, codice_esterno: e.target.value }))} /></label>
          <label style={labelStyle}>PM responsabile<input style={inputStyle} type="text" placeholder="Cognome Nome" value={newCliente.pm_name} onChange={e => setNewCliente(p => ({ ...p, pm_name: e.target.value }))} /></label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button style={btnStyle(clienteSaving || !newCliente.nome.trim())} disabled={clienteSaving || !newCliente.nome.trim()} onClick={handleImportaCliente}>{clienteSaving ? '⏳ Salvataggio...' : '＋ Aggiungi'}</button>
          {clienteStatus && <div style={statusStyle(clienteStatus.type)}>{clienteStatus.msg}</div>}
        </div>

        {/* Import Excel */}
        <div style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Import da Excel</div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
          Colonne attese: {['Nome cliente *', 'Codice esterno', 'PM responsabile'].map((c, i) => <span key={i} style={colTipStyle}>{c}</span>)}
        </div>
        <div style={fileDropStyle(!!clientiFile)} onClick={() => clientiInputRef.current?.click()}>
          {clientiFile ? <><span style={{ fontSize: '16px' }}>📄</span> {clientiFile.name}</> : <><span style={{ fontSize: '16px' }}>📁</span> Clicca per selezionare il file Excel (.xlsx)</>}
          <input ref={clientiInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { setClientiFile(e.target.files[0] || null); setClientiFileStatus(null); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={btnStyle(clientiFileSaving || !clientiFile)} disabled={clientiFileSaving || !clientiFile} onClick={handleImportaClientiExcel}>{clientiFileSaving ? '⏳ Importazione...' : '↑ Importa Clienti'}</button>
          {clientiFile && !clientiFileSaving && <button onClick={() => { setClientiFile(null); setClientiFileStatus(null); if (clientiInputRef.current) clientiInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}>Rimuovi file</button>}
          {clientiFileStatus && <div style={statusStyle(clientiFileStatus.type)}>{clientiFileStatus.msg}</div>}
        </div>
      </div>

      {/* ── IMPORTA BOLLE ── */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '18px' }}>📋</span> Importa Bolle di Lavoro</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4 }}>
            Colonne attese: {['Codice bolla *', 'Descrizione', 'Codice cliente', 'Ore previste', 'ID commessa (opz)'].map((c, i) => <span key={i} style={colTipStyle}>{c}</span>)}
          </div>
        </div>
        <div style={fileDropStyle(!!bolleFile)} onClick={() => bolleInputRef.current?.click()}>
          {bolleFile ? <><span>📄</span> {bolleFile.name}</> : <><span>📁</span> Clicca per selezionare il file Excel (.xlsx)</>}
          <input ref={bolleInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { setBolleFile(e.target.files[0] || null); setBolleStatus(null); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={btnStyle(bolleSaving || !bolleFile)} disabled={bolleSaving || !bolleFile} onClick={handleImportaBolle}>{bolleSaving ? '⏳ Importazione...' : '↑ Importa Bolle'}</button>
          {bolleFile && !bolleSaving && <button onClick={() => { setBolleFile(null); setBolleStatus(null); if (bolleInputRef.current) bolleInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}>Rimuovi file</button>}
          {bolleStatus && <div style={statusStyle(bolleStatus.type)}>{bolleStatus.msg}</div>}
        </div>
      </div>

      {/* ── IMPORTA CONSUNTIVI ── */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '18px' }}>📊</span> Importa Consuntivi</div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4 }}>
            I consuntivi vengono scritti direttamente in <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>consuntivi_globali</code>.<br />
            Colonne attese: {['Data *', 'Cod. Cliente', 'Operatore', 'Note', 'Ore Tecniche', 'Ore Pagamento', 'Bolla'].map((c, i) => <span key={i} style={colTipStyle}>{c}</span>)}
          </div>
        </div>
        <div style={fileDropStyle(!!consuntiviFile)} onClick={() => consuntiviInputRef.current?.click()}>
          {consuntiviFile ? <><span>📄</span> {consuntiviFile.name}</> : <><span>📁</span> Clicca per selezionare il file Excel (.xlsx)</>}
          <input ref={consuntiviInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { setConsuntiviFile(e.target.files[0] || null); setConsuntiviStatus(null); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={btnStyle(consuntiviSaving || !consuntiviFile)} disabled={consuntiviSaving || !consuntiviFile} onClick={handleImportaConsuntivi}>{consuntiviSaving ? '⏳ Importazione...' : '↑ Importa Consuntivi'}</button>
          {consuntiviFile && !consuntiviSaving && <button onClick={() => { setConsuntiviFile(null); setConsuntiviStatus(null); if (consuntiviInputRef.current) consuntiviInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px' }}>Rimuovi file</button>}
          {consuntiviStatus && <div style={statusStyle(consuntiviStatus.type)}>{consuntiviStatus.msg}</div>}
        </div>
      </div>

    </div>
  );
}

// ─────────────────────────────────────────────
// KPI ENTITIES
// ─────────────────────────────────────────────
const KPI_ENTITIES = [
  {
    key: 'risorsa', label: 'Risorse', desc: 'Skill map e pianificazione per consulente', adminOnly: false,
    icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><circle cx="19" cy="13" r="6" stroke="#0054a6" strokeWidth="2"/><path d="M5 34c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#0054a6" strokeWidth="2" strokeLinecap="round"/></svg>),
  },
  {
    key: 'cliente', label: 'Clienti', desc: 'Anagrafica, team e pianificazione mensile', adminOnly: false,
    icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="5" y="14" width="28" height="20" rx="2" stroke="#0054a6" strokeWidth="2"/><path d="M13 14V9a2 2 0 012-2h8a2 2 0 012 2v5" stroke="#0054a6" strokeWidth="2"/><rect x="10" y="20" width="5" height="5" rx="1" stroke="#0054a6" strokeWidth="1.5"/><rect x="23" y="20" width="5" height="5" rx="1" stroke="#0054a6" strokeWidth="1.5"/><rect x="16" y="22" width="6" height="12" rx="1" stroke="#0054a6" strokeWidth="1.5"/><path d="M5 34h28" stroke="#0054a6" strokeWidth="2" strokeLinecap="round"/></svg>),
  },
  {
    key: 'commessa', label: 'Commesse', desc: 'Dettaglio commessa, team e allocazione', adminOnly: false,
    icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="6" y="4" width="26" height="30" rx="3" stroke="#0054a6" strokeWidth="2"/><path d="M12 13h14M12 19h14M12 25h8" stroke="#0054a6" strokeWidth="2" strokeLinecap="round"/><circle cx="28" cy="28" r="6" fill="#f0f7ff" stroke="#0054a6" strokeWidth="1.5"/><path d="M25.5 28l2 2 3-3" stroke="#0054a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  },
  {
    key: 'dati', label: 'Dati', desc: 'KPI globali, ricerca bolle e importazione', adminOnly: true,
    icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <rect x="5" y="22" width="6" height="12" rx="2" stroke="#0054a6" strokeWidth="2"/>
      <rect x="16" y="14" width="6" height="20" rx="2" stroke="#0054a6" strokeWidth="2"/>
      <rect x="27" y="6" width="6" height="28" rx="2" stroke="#0054a6" strokeWidth="2"/>
      <path d="M8 18l8-6 8 4 8-10" stroke="#0054a6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>),
  },
];

// ─────────────────────────────────────────────
// KPI VIEW
// ─────────────────────────────────────────────

// KPI CSS
const KPI_CSS = '@keyframes kpiBounce{0%,100%{transform:translateY(0);opacity:.35}50%{transform:translateY(3px);opacity:.8}} @keyframes kpiPanelIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}} .kpi-panel-enter{animation:kpiPanelIn 0.22s ease-out both}';

// KpiPanel component
function KpiPanel({ activeKpi, onClose, onNavigate, onGestisciClienti, onNuovaCommessa, onNuovaCommessaDiretta, setEntity, setActiveKpi, setSelected, setSearch, isMobile }) {
  const colors = { risorsa: '#0F6E56', cliente: '#185FA5', commessa: '#854F0B', bolle: '#534AB7' };
  const bgs    = { risorsa: '#E1F5EE', cliente: '#E6F1FB', commessa: '#FAEEDA', bolle: '#EEEDFE' };
  const titles = { risorsa: 'Risorse', cliente: 'Clienti', commessa: 'Commesse', bolle: 'Bolle' };
  const fnMap = {
    risorsa: [
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>), label: 'Skill Matrix',     desc: 'Competenze del team',           fn: () => onNavigate && onNavigate('skills') },
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>), label: 'Ricerca risorsa',  desc: 'Scheda personale',              fn: () => { setEntity('risorsa'); setSelected(''); setSearch(''); setActiveKpi(null); } },
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>), label: 'Gestisci risorse', desc: 'Aggiungi o modifica',           fn: () => onNavigate && onNavigate('manageStaff') },
    ],
    cliente: [
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>), label: 'Cerca cliente',    desc: 'Anagrafica e pianificazione',   fn: () => { setEntity('cliente'); setSelected(''); setSearch(''); setActiveKpi(null); } },
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>), label: 'Gestisci clienti', desc: 'Aggiungi, modifica o archivia', fn: () => onGestisciClienti && onGestisciClienti() },
    ],
    commessa: [
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>), label: 'Cerca commessa',   desc: 'Team, date e allocazione',      fn: () => { setEntity('commessa'); setSelected(''); setSearch(''); setActiveKpi(null); } },
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>),    label: 'Nuova commessa',   desc: 'Crea e assegna subito',         fn: () => onNuovaCommessaDiretta && onNuovaCommessaDiretta() },
    ],
    bolle: [
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>),   label: 'Ricerca bolle',      desc: 'Per codice o descrizione', fn: () => { setEntity('dati'); setActiveKpi(null); } },
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>),   label: 'Importa consuntivi', desc: 'Carica file Excel',         fn: () => { setEntity('dati'); setActiveKpi(null); } },
      { icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 3v18M16 3v18M2 9h20M2 15h20"/></svg>), label: 'Importa clienti',    desc: 'Anagrafica da Excel',       fn: () => { setEntity('dati'); setActiveKpi(null); } },
    ],
  };
  const color = colors[activeKpi];
  const bg    = bgs[activeKpi];
  const title = titles[activeKpi];
  const fns   = fnMap[activeKpi] || [];
  const cols  = fns.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr';
  return (
    <div className="kpi-panel-enter" style={{ margin: isMobile ? '10px 16px 0' : '10px 32px 0', background: '#fff', borderRadius: 16, border: '1px solid #e8f0fe', overflow: 'hidden', boxShadow: '0 4px 24px rgba(24,95,165,.07)' }}>
      <style>{KPI_CSS}</style>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#001d47', letterSpacing: '.04em', textTransform: 'uppercase' }}>{title}</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Scegli un&apos;azione</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}>&times;</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: cols }}>
        {fns.map((item, i) => (
          <div key={i} onClick={item.fn}
            style={{ padding: '18px 22px', cursor: 'pointer', borderRight: i < fns.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', flexDirection: 'column', gap: 10, background: '#fff' }}
            onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{item.desc}</div>
            </div>
            <div style={{ fontSize: 12, color: color, fontWeight: 500 }}>&rarr;</div>
          </div>
        ))}
      </div>
    </div>
  );
}



// ── KpiPopup — popup contestuale per ogni cubo KPI ───────────────────────────
function KpiPopup({ tipo, color, onClose, staff, clients, onNavigate, onGestisciClienti, onNuovaCommessa, onNuovaCommessaDiretta, onImportExcel }) {
  const [search, setSearch] = React.useState('');
  const searchRef = React.useRef(null);
  React.useEffect(() => { if (searchRef.current) searchRef.current.focus(); }, []);

  // Chiudi cliccando fuori
  React.useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-kpi-popup]') && !e.target.closest('[data-kpi-trigger]')) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const Divider = () => <div style={{ height: '0.5px', background: '#f1f5f9', margin: '4px 0' }} />;
  const Item = ({ icon, label, sub, onClick, color: ic }) => (
    <div onClick={() => { onClick(); onClose(); }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.12s' }}
      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: (ic || color) + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15, color: ic || color }} aria-hidden="true" />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );

  const filteredStaff = search
    ? staff.filter(s => `${s.nome} ${s.cognome}`.toLowerCase().includes(search.toLowerCase()) || (s.ruolo || '').toLowerCase().includes(search.toLowerCase()))
    : [];

  const filteredClients = search
    ? clients.filter(c => c.nome_progetto.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
    : [];

  const filteredCommesse = search
    ? clients.flatMap(c => (c.commesse || []).filter(co => co.attiva !== false && co.nome_commessa.toLowerCase().includes(search.toLowerCase())).map(co => ({ ...co, clientName: c.nome_progetto, clientId: c.id }))).slice(0, 5)
    : [];

  const renderSearch = (placeholder, results, renderRow) => (
    <>
      <div style={{ padding: '8px 14px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px' }}>
          <i className="ti ti-search" style={{ fontSize: 13, color: '#94a3b8', flexShrink: 0 }} aria-hidden="true" />
          <input ref={searchRef} type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={placeholder}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, flex: 1, color: '#0f172a', fontFamily: 'inherit' }} />
          {search && <span onClick={() => setSearch('')} style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1 }}>×</span>}
        </div>
      </div>
      {search.trim() && results.length > 0 && (
        <div style={{ maxHeight: 180, overflowY: 'auto', padding: '4px 0' }}>
          {results.map(renderRow)}
        </div>
      )}
      {search.trim() && results.length === 0 && (
        <div style={{ padding: '8px 14px', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nessun risultato</div>
      )}
    </>
  );

  return (
    <div data-kpi-popup="1"
      style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 500, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,18,41,0.14)', width: 280, overflow: 'hidden', padding: '6px 0' }}>
      {/* Indicatore freccia */}
      <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 12, height: 12, background: '#fff', border: '1px solid #e2e8f0', borderBottom: 'none', borderRight: 'none', transform: 'translateX(-50%) rotate(45deg)' }} />

      {tipo === 'risorsa' && <>
        {renderSearch('Cerca risorsa per nome o ruolo...', filteredStaff, s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer' }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => { if (onNavigate) onNavigate('risorsa', null, `${s.cognome} ${s.nome}`); onClose(); }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#0F6E56', flexShrink: 0 }}>
              {(s.nome?.[0] || '') + (s.cognome?.[0] || '')}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{s.cognome} {s.nome}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.ruolo}</div>
            </div>
          </div>
        ))}
        <Divider />
        <Item icon="ti-users" label="Gestisci risorse" sub="Aggiungi, modifica, rimuovi" onClick={() => onNavigate && onNavigate('manageStaff')} />
        <Item icon="ti-table" label="Skill Matrix" sub="Valutazioni e competenze" onClick={() => onNavigate && onNavigate('skills')} />
      </>}

      {tipo === 'cliente' && <>
        {renderSearch('Cerca cliente...', filteredClients, c => (
          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer' }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => { if (onNavigate) onNavigate('cliente', c.id); onClose(); }}>
            <i className="ti ti-building" style={{ fontSize: 14, color: '#185FA5', flexShrink: 0 }} aria-hidden="true" />
            <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{c.nome_progetto}</div>
          </div>
        ))}
        <Divider />
        <Item icon="ti-settings" label="Gestisci clienti" sub="Anagrafica e configurazione" onClick={() => onGestisciClienti && onGestisciClienti()} />
      </>}

      {tipo === 'commessa' && <>
        {renderSearch('Cerca commessa...', filteredCommesse, co => (
          <div key={co.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', cursor: 'pointer' }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            onClick={() => { if (onNavigate) onNavigate('commessa', co.clientId, co.id); onClose(); }}>
            <i className="ti ti-briefcase" style={{ fontSize: 14, color: '#854F0B', flexShrink: 0 }} aria-hidden="true" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{co.nome_commessa}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{co.clientName}</div>
            </div>
          </div>
        ))}
        <Divider />
        <Item icon="ti-plus" label="Nuova commessa" sub="Crea e assegna subito" onClick={() => onNuovaCommessaDiretta && onNuovaCommessaDiretta()} />
      </>}

      {tipo === 'bolle' && <>
        <div style={{ padding: '8px 14px 4px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Importa</div>
        </div>
        <Item icon="ti-file-upload" label="Importa Bolle" sub="Da file Excel" onClick={() => onNavigate && onNavigate('importBolle')} />
        <Item icon="ti-clock" label="Importa Consuntivi" sub="Da file Excel" onClick={() => onNavigate && onNavigate('importConsuntivi')} />
        <Item icon="ti-building-import" label="Importa Clienti" sub="Da file Excel" onClick={() => onNavigate && onNavigate('importClienti')} />
      </>}
    </div>
  );
}

// ── AccordionPersonale — attività/commesse/progetti dell'utente loggato ───────
function AccordionPersonale({ tipo, userOverride, clients, onOpenProgetto, onOpenCommessa, onOpenCard, onOpenCardModal }) {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);

  const myKey = userOverride ? `${userOverride.cognome} ${userOverride.nome}` : null;

  const loadItems = React.useCallback(async () => {
    if (loaded || !myKey) return;
    setLoading(true);
    try {
      if (tipo === 'attivita') {
        const { data: cols } = await supabase.from('workflow_colonne').select('id, nome');
        const chiuse = new Set((cols || []).filter(c => /complet|annullat|done|chiusa/i.test(c.nome)).map(c => c.id));
        const { data: att } = await supabase
          .from('attivita')
          .select('id, titolo, priorita, colonna_id, commessa_id, colonna:colonna_id(nome)')
          .or(`assegnata_a.eq.${myKey},pm.eq.${myKey}`);
        const aperte = (att || []).filter(a => !chiuse.has(a.colonna_id));
        const allComm = (clients || []).flatMap(c => (c.commesse || []).map(co => ({ ...co, clientName: c.nome_progetto })));
        setItems(aperte.map(a => {
          const comm = allComm.find(co => co.id === a.commessa_id);
          return { ...a, clientName: comm?.clientName || null, commessaNome: comm?.nome_commessa || null, commessaId: comm?.id || null };
        }));
      } else if (tipo === 'commesse') {
        const allComm = (clients || []).flatMap(c =>
          (c.commesse || [])
            .filter(co => co.attiva !== false)
            .filter(co => co.pm_commessa === myKey || (co.team || []).includes(myKey))
            .map(co => ({ ...co, clientName: c.nome_progetto, clientId: c.id }))
        );
        setItems(allComm);
      } else if (tipo === 'progetti') {
        const allComm = (clients || []).flatMap(c =>
          (c.commesse || [])
            .filter(co => co.attiva !== false)
            .filter(co => co.pm_commessa === myKey || (co.team || []).includes(myKey))
            .map(co => ({ ...co, clientName: c.nome_progetto }))
        );
        const commIds = allComm.map(co => co.id);
        if (commIds.length === 0) { setItems([]); setLoaded(true); setLoading(false); return; }
        // neq chiuso=true per compatibilità Supabase boolean
        const { data: proj } = await supabase
          .from('progetti')
          .select('id, commessa_id, chiuso')
          .in('commessa_id', commIds)
          .neq('chiuso', true);
        setItems((proj || []).map(p => {
          const comm = allComm.find(co => co.id === p.commessa_id);
          return { ...p, clientName: comm?.clientName, commessaNome: comm?.nome_commessa };
        }));
      }
    } catch(e) { console.error('Accordion load error:', e); }
    setLoaded(true);
    setLoading(false);
  }, [tipo, myKey, clients, loaded]);

  const handleToggle = () => {
    if (!open && !loaded) loadItems();
    setOpen(v => !v);
  };

  const handleClick = (item) => {
    if (tipo === 'progetti' && onOpenProgetto) {
      onOpenProgetto(item.id, item.commessa_id);
    } else if (tipo === 'commesse' && onOpenCommessa) {
      onOpenCommessa(item.clientId, item.id);
    } else if (tipo === 'attivita' && onOpenCardModal) {
      onOpenCardModal(item);
    } else if (tipo === 'attivita' && onOpenCard) {
      onOpenCard(item);
    }
  };

  const PCOLOR = {
    alta:  { bg: '#FCEBEB', text: '#A32D2D', bar: '#E24B4A' },
    media: { bg: '#FAEEDA', text: '#633806', bar: '#BA7517' },
    bassa: { bg: '#EAF3DE', text: '#27500A', bar: '#639922' },
  };

  const configs = {
    attivita: { label: 'Le attività in carico a te',  color: '#185FA5', badgeBg: '#E6F1FB', badgeText: '#0C447C' },
    commesse: { label: 'Le commesse in cui lavori',   color: '#0F6E56', badgeBg: '#E1F5EE', badgeText: '#085041' },
    progetti: { label: 'I progetti in cui lavori',    color: '#854F0B', badgeBg: '#FAEEDA', badgeText: '#633806' },
  };
  const cfg = configs[tipo];
  const isClickable = tipo !== 'attivita' || true; // tutti cliccabili

  return (
    <div style={{ borderBottom: '1px solid #e8edf2' }}>
      {/* ── Header ── */}
      <div onClick={handleToggle}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: open ? cfg.color : '#cbd5e1', flexShrink: 0, transition: 'background 0.2s' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: open ? '#0f172a' : '#475569', transition: 'color 0.2s' }}>{cfg.label}</span>
          {loaded && items.length > 0 && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: cfg.badgeBg, color: cfg.badgeText, fontWeight: 600 }}>{items.length}</span>
          )}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={open ? cfg.color : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s, stroke 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {/* ── Body ── */}
      {open && (
        <div style={{ paddingBottom: 10 }}>
          {loading && <div style={{ padding: '8px 0 12px 13px', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Caricamento...</div>}
          {!loading && items.length === 0 && <div style={{ padding: '8px 0 12px 13px', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nessun elemento</div>}
          {!loading && items.map((item, i) => {
            const pc = PCOLOR[item.priorita] || PCOLOR.media;
            return (
              <div key={item.id || i}
                onClick={() => handleClick(item)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 8px 9px 13px', marginBottom: 2, borderRadius: 8, cursor: 'pointer', transition: 'background 0.12s', background: 'transparent', borderLeft: `2px solid transparent` }}
                onMouseOver={e => { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderLeftColor = cfg.color; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; }}>

                {/* Indicatore priorità / tipo */}
                {tipo === 'attivita' && (
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: pc.bar, flexShrink: 0 }} />
                )}
                {tipo !== 'attivita' && (
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: cfg.color + '55', flexShrink: 0 }} />
                )}

                {/* Testo */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tipo === 'attivita' ? item.titolo
                      : tipo === 'commesse' ? item.nome_commessa
                      : item.commessaNome || '—'}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tipo === 'attivita' ? (item.clientName || item.commessaNome || '—')
                      : tipo === 'commesse' ? item.clientName
                      : item.clientName}
                  </div>
                </div>

                {/* Badge destra */}
                {tipo === 'attivita' && item.priorita && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: pc.bg, color: pc.text, fontWeight: 600, flexShrink: 0, border: `0.5px solid ${pc.text}33` }}>{item.priorita}</span>
                )}
                {tipo === 'commesse' && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: item.pm_commessa === myKey ? '#E6F1FB' : '#f1f5f9', color: item.pm_commessa === myKey ? '#0C447C' : '#64748b', fontWeight: 600, flexShrink: 0 }}>
                    {item.pm_commessa === myKey ? 'PM' : 'team'}
                  </span>
                )}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6"/></svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


export function KPIView({ staff, matrix, clients, assignments, skillsConfig, currentMonths, trainingCells, onOpenProgetto, userOverride, isAdmin, onNuovaCommessa, onNavigate, onGestisciClienti, onNuovaCommessaDiretta }) {
  const [entity, setEntity] = useState(userOverride?.defaultEntity || null);
  const [selected, setSelected] = useState(userOverride?.defaultSelected || '');
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showOnlyActiveKpi, setShowOnlyActiveKpi] = useState(true);
  const [progettoInfo, setProgettoInfo] = useState(null);
  const [clienteTab, setClienteTab] = useState('pianificazione');
  const [commessaTab, setCommessaTab] = useState('pianificazione');
  const [kpi, setKpi] = useState(null);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [activeKpi, setActiveKpi] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [editCard, setEditCard] = useState(null);           // CardModal editing
  const [openCommessaTarget, setOpenCommessaTarget] = useState(null); // { clientId, commessaId }

  const RUOLI_ORDER_KPI = ['PM', 'Project Manager', 'Consulente', 'Programmatore', 'Analista'];

  useEffect(() => {
    const load = async () => {
      setKpiLoading(true);
      try {
        const nRisorse = staff.length;
        const ruoliCount = {};
        staff.forEach(s => { const r = s.ruolo || 'Non definito'; ruoliCount[r] = (ruoliCount[r] || 0) + 1; });
        const nCommesseAttive = clients.flatMap(c => c.commesse || []).filter(co => co.attiva !== false).length;
        const nClientiAttivi = clients.filter(c => (c.commesse || []).some(co => co.attiva !== false)).length;
        const { data: clientiData } = await supabase.from('projects').select('id, prodotti');
        const prodottiCount = {};
        (clientiData || []).forEach(c => { (Array.isArray(c.prodotti) ? c.prodotti : []).forEach(p => { prodottiCount[p] = (prodottiCount[p] || 0) + 1; }); });
        const { data: colonneAll } = await supabase.from('workflow_colonne').select('id, nome');
        const colonneConcluse = new Set((colonneAll || []).filter(c => /complet|annull|done|chius/i.test(c.nome)).map(c => c.id));
        const colonneAperteIds = (colonneAll || []).filter(c => !colonneConcluse.has(c.id)).map(c => c.id);
        const { count: nAttivitaSviluppoAperte } = colonneAperteIds.length > 0
          ? await supabase.from('attivita').select('id', { count: 'exact', head: true }).in('colonna_id', colonneAperteIds).not('commessa_id', 'is', null)
          : { count: 0 };
        const { data: bolleData } = await supabase.from('bolle_lavoro').select('id, ore_previste');
        const { data: cgData } = await supabase.from('consuntivi_globali').select('ore_tecniche, ore_pagamento');
        const nBolle = bolleData?.length || 0;
        const totGgPrevisti = (bolleData || []).reduce((s, b) => s + ((parseFloat(b.ore_previste) || 0) / 8), 0);
        let totOreTec = 0, totOrePag = 0;
        (cgData || []).forEach(r => { totOreTec += parseFloat(r.ore_tecniche) || 0; totOrePag += parseFloat(r.ore_pagamento) || 0; });
        const totGgFatti = totOreTec / 8;
        const totGgPag = totOrePag / 8;
        const efficacia = totGgFatti > 0 ? (totGgPag / totGgFatti) * 100 : null;
        const residuo = totGgPrevisti - totGgFatti;
        setKpi({ nRisorse, ruoliCount, nClientiAttivi, prodottiCount, nCommesseAttive, nAttivitaSviluppoAperte: nAttivitaSviluppoAperte || 0, nBolle, totGgPrevisti, totGgFatti, totGgPag, efficacia, residuo });
      } catch (e) { console.error('KPI error:', e); }
      setKpiLoading(false);
    };
    load();
  }, [staff, clients]);

  const isMobile = useIsMobile();
  const allEntities = userOverride?.entities || KPI_ENTITIES;
  const entities = allEntities.filter(e => !e.adminOnly || isAdmin);

  useEffect(() => {
    if (entity !== 'commessa' || !selected) { setProgettoInfo(null); return; }
    supabase.from('progetti').select('id').eq('commessa_id', selected).single()
      .then(({ data }) => setProgettoInfo(data ? { id: data.id, exists: true } : { id: null, exists: false }));
  }, [entity, selected]);

  useEffect(() => { setClienteTab('pianificazione'); setCommessaTab('pianificazione'); }, [selected]);

  const allOptions = entity === 'risorsa'
    ? staff.map(s => ({ id: staffKey(s), label: staffLabel(s) }))
    : entity === 'cliente'
    ? clients.map(c => ({ id: c.id, label: c.nome_progetto }))
    : entity === 'commessa'
    ? clients.flatMap(c => c.commesse
        .filter(co => showOnlyActiveKpi ? co.attiva !== false : true)
        .map(co => ({ id: co.id, label: `${c.nome_progetto} › ${co.nome_commessa}` })))
    : [];

  const filteredOptions = allOptions.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const handleSelect = (id, label) => { setSelected(id); setSearch(label); setShowDropdown(false); };

  const TabBar = ({ tabs, active, onChange }) => (
    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{ padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: active === t.key ? 700 : 400, color: active === t.key ? '#0054a6' : '#64748b', borderBottom: active === t.key ? '2.5px solid #0054a6' : '2.5px solid transparent', marginBottom: '-1px', transition: 'all 0.15s' }}>{t.label}</button>
      ))}
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc' }}>

      {/* HERO */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e2e8f0' }}>
        <div style={{ padding: isMobile ? '20px 16px' : '28px 32px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>ZCS · Portale Delivery</div>
          <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 500, color: '#0f172a', marginBottom: '4px' }}>
            {(() => {
              const u = userOverride;
              const nome = u?.nome || '';
              const cognome = u?.cognome || '';
              const vocale = /^[aeiouAEIOU]/.test(nome);
              const genere = u?.genere; // 'M' o 'F' se disponibile, altrimenti default maschile
              const benv = genere === 'F' ? 'Benvenuta' : 'Benvenuto';
              return `${benv}, ${nome}${cognome ? ' ' + cognome : ''}`.trim() || 'Benvenuto';
            })()}
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {userOverride?.ruolo || 'Operation Manager'}
          </div>
        </div>
        <div style={{ height: '2px', background: 'linear-gradient(90deg, #185FA5 0%, #B5D4F4 55%, transparent 100%)' }} />
        <div style={{ overflow: 'hidden', padding: '20px 0', background: '#fff', borderTop: '0.5px solid #f1f5f9' }}>
          <style>{`
            @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .ticker-track { display: flex; align-items: center; width: max-content; animation: ticker 36s linear infinite; }
            .ticker-track:hover { animation-play-state: paused; }
            .ticker-item { display: flex; align-items: center; justify-content: center; padding: 0 52px; flex-shrink: 0; }
            .ticker-item img { height: 34px; width: auto; max-width: 120px; object-fit: contain; opacity: 0.4; filter: grayscale(20%); transition: opacity 0.3s; }
            .ticker-item img:hover { opacity: 0.75; }
          `}</style>
          <div className="ticker-track">
            {['cassiopea.png','logo-smarty.png','TeseoPlus.png','infobusiness.png','follia.png','sostenibile.png',
              'cassiopea.png','logo-smarty.png','TeseoPlus.png','infobusiness.png','follia.png','sostenibile.png'].map((src, i) => (
              <div key={i} className="ticker-item"><img src={`/${src}`} alt={src.split('.')[0]} /></div>
            ))}
          </div>
        </div>
      </div>

      {kpi && (() => {
        const kpiCards = [
          { key: 'risorsa',  color: '#0F6E56', label: 'Risorse',         num: kpi.nRisorse,        rows: RUOLI_ORDER_KPI.filter(r => kpi.ruoliCount[r]).map(r => [r, kpi.ruoliCount[r], '#0F6E56']).concat(Object.entries(kpi.ruoliCount).filter(([r]) => !RUOLI_ORDER_KPI.includes(r)).map(([r,c]) => [r, c, '#0F6E56'])) },
          { key: 'cliente',  color: '#185FA5', label: 'Clienti attivi',  num: kpi.nClientiAttivi,  rows: Object.entries(kpi.prodottiCount).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([p,c]) => [p, c, '#185FA5']) },
          { key: 'commessa', color: '#854F0B', label: 'Commesse aperte', num: kpi.nCommesseAttive, rows: [['Sviluppo aperte', kpi.nAttivitaSviluppoAperte, '#854F0B']] },
          { key: 'bolle',    color: '#534AB7', label: 'Bolle',           num: kpi.nBolle,          rows: [['Previsto', Math.round(kpi.totGgPrevisti)+'gg', '#534AB7'], ['Consuntivato', Math.round(kpi.totGgFatti)+'gg', '#534AB7'], ['Residuo', Math.round(kpi.residuo)+'gg', kpi.residuo >= 0 ? '#0F6E56' : '#dc2626'], ...(kpi.efficacia != null ? [['Efficacia', Math.round(kpi.efficacia)+'%', kpi.efficacia >= 75 ? '#0F6E56' : kpi.efficacia >= 60 ? '#854F0B' : '#dc2626']] : [])] },
        ];
        return (
          <div style={{ padding: isMobile ? '16px' : '24px 32px 0' }}>
            {/* ── RIGA SUPERIORE: cerchio + 4 cubi ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr 1fr 1fr', gap: '12px', alignItems: 'stretch' }}>
              {/* Cerchio */}
              <div onClick={() => onNuovaCommessa && onNuovaCommessa()}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#001d47', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.18s', boxShadow: '0 4px 18px rgba(0,29,71,0.35)' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#0d3470'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,29,71,0.45)'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#001d47'; e.currentTarget.style.boxShadow = '0 4px 18px rgba(0,29,71,0.35)'; }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#001d47', textAlign: 'center', whiteSpace: 'nowrap' }}>Nuova attività</div>
              </div>
              {/* 4 cubi KPI con popup */}
              {kpiCards.map(card => (
                <div key={card.key} style={{ position: 'relative' }}>
                  <div onClick={() => setActiveKpi(activeKpi === card.key ? null : card.key)}
                    style={{ background: '#fff', border: activeKpi === card.key ? `1.5px solid ${card.color}` : '1px solid #e2e8f0', borderRadius: 16, padding: '18px 20px', boxShadow: activeKpi === card.key ? '0 8px 32px rgba(0,0,0,0.13)' : '0 2px 16px rgba(0,0,0,0.07)', position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.18s', display: 'flex', flexDirection: 'column', minHeight: 160 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: card.color, borderRadius: '16px 16px 0 0' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{card.label}</div>
                    <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', lineHeight: 1, marginBottom: 12 }}>{card.num}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, borderTop: '1px solid #f1f5f9', paddingTop: 10, flex: 1 }}>
                      {card.rows.map(([lbl, val, col], i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{lbl}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{val}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6, borderTop: '1px solid #f1f5f9', marginTop: 4 }}>
                      <svg style={{ animation: 'kpiBounce 1.8s ease-in-out infinite', opacity: activeKpi === card.key ? 1 : 0.7 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeKpi === card.key ? card.color : '#94a3b8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </div>
                  {/* Popup contestuale */}
                  {activeKpi === card.key && (
                    <KpiPopup
                      tipo={card.key}
                      color={card.color}
                      onClose={() => setActiveKpi(null)}
                      staff={staff}
                      clients={clients}
                      onNavigate={onNavigate}
                      onGestisciClienti={onGestisciClienti}
                      onNuovaCommessa={onNuovaCommessa}
                      onNuovaCommessaDiretta={onNuovaCommessaDiretta}
                      onImportExcel={onImportExcel}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* ── RIGA INFERIORE: accordion personali ── */}
            <div style={{ marginTop: 28, maxWidth: 520 }}>
              <AccordionPersonale tipo="attivita" userOverride={userOverride} clients={clients} onOpenProgetto={onOpenProgetto}
                onOpenCard={(card) => setPreviewCard(card)}
                onOpenCardModal={(card) => setEditCard(card)} />
              <AccordionPersonale tipo="commesse" userOverride={userOverride} clients={clients} onOpenProgetto={onOpenProgetto}
                onOpenCommessa={(clientId, commessaId) => setOpenCommessaTarget({ clientId, commessaId })} />
              <AccordionPersonale tipo="progetti" userOverride={userOverride} clients={clients} onOpenProgetto={onOpenProgetto} />
            </div>
          </div>
        );
      })()}

      {kpi && activeKpi && (
        <KpiPanel activeKpi={activeKpi} onClose={() => setActiveKpi(null)} isMobile={isMobile}
          onNavigate={onNavigate} onGestisciClienti={onGestisciClienti} onNuovaCommessa={onNuovaCommessa} onNuovaCommessaDiretta={onNuovaCommessaDiretta}
          setEntity={setEntity} setActiveKpi={setActiveKpi} setSelected={setSelected} setSearch={setSearch} />
      )}

      <div style={{ padding: isMobile ? '16px 16px 24px' : '32px 32px 24px' }}>

        {/* Barra ricerca ricerca — solo entità con dropdown */}
        {entity && entity !== 'dati' && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '32px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: isMobile ? '100%' : undefined, minWidth: isMobile ? undefined : '360px' }}>
              <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', ...(showDropdown ? { borderColor: '#0054a6' } : {}) }}>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <input type="text" placeholder={`Cerca ${entities.find(e2 => e2.key === entity)?.label.toLowerCase()}...`}
                  value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); if (!e.target.value) setSelected(''); }}
                  onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '15px', color: '#0f172a', outline: 'none', padding: '12px 0', fontWeight: selected ? 600 : 400 }} />
                {search && <button onClick={() => { setSearch(''); setSelected(''); setShowDropdown(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}>×</button>}
              </div>
              {showDropdown && filteredOptions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 50, maxHeight: '220px', overflowY: 'auto' }}>
                  {filteredOptions.map(o => (
                    <div key={o.id} onMouseDown={() => handleSelect(o.id, o.label)}
                      style={{ padding: '12px 14px', cursor: 'pointer', fontSize: '14px', color: o.id === selected ? '#0054a6' : '#0f172a', fontWeight: o.id === selected ? 600 : 400, background: o.id === selected ? '#eff6ff' : 'transparent', borderBottom: '1px solid #f1f5f9' }}
                      onMouseOver={e => { if (o.id !== selected) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseOut={e => { if (o.id !== selected) e.currentTarget.style.background = 'transparent'; }}>
                      {o.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {entity === 'commessa' && (
              <button onClick={() => setShowOnlyActiveKpi(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 16px', borderRadius: '12px', border: '1px solid', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', ...(showOnlyActiveKpi ? { background: '#f0fdf4', borderColor: '#22c55e', color: '#16a34a' } : { background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }) }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {showOnlyActiveKpi && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'block' }} />}
                </span>
                Solo attive
              </button>
            )}
          </div>
        )}

        {/* Scheda Dati */}
        {entity === 'dati' && isAdmin && <DatiView clients={clients} staff={staff} />}

        {/* Dettaglio Risorsa */}
        {entity === 'risorsa' && selected && (
          <RisorsaDetail selected={selected} staff={staff} matrix={matrix} clients={clients}
            assignments={assignments} skillsConfig={skillsConfig} currentMonths={currentMonths}
            trainingCells={trainingCells} isMobile={isMobile} />
        )}

        {/* Dettaglio Cliente */}
        {entity === 'cliente' && selected && (() => {
          const c = clients.find(cl => cl.id === selected);
          if (!c) return null;
          const activeCommesse = showOnlyActiveKpi ? c.commesse.filter(co => co.attiva !== false) : c.commesse;
          const allTeam = [...new Set(activeCommesse.flatMap(co => co.team))];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '24px 28px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #bfdbfe', flexShrink: 0 }}>
                  <svg width="30" height="30" viewBox="0 0 38 38" fill="none"><rect x="5" y="14" width="28" height="20" rx="2" stroke="#0054a6" strokeWidth="2"/><path d="M13 14V9a2 2 0 012-2h8a2 2 0 012 2v5" stroke="#0054a6" strokeWidth="2"/><rect x="10" y="20" width="5" height="5" rx="1" stroke="#0054a6" strokeWidth="1.5"/><rect x="23" y="20" width="5" height="5" rx="1" stroke="#0054a6" strokeWidth="1.5"/><rect x="16" y="22" width="6" height="12" rx="1" stroke="#0054a6" strokeWidth="1.5"/><path d="M5 34h28" stroke="#0054a6" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: '#0f172a' }}>{c.nome_progetto}</div>
                  {c.pm_name ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 6 }}>
                      <Avatar name={c.pm_name} avatarUrl={getAvatarUrl(c.pm_name, staff)} size={22} />
                      <span style={{ fontSize: '12px', color: '#64748b' }}>PM: <strong style={{ color: '#0f172a' }}>{c.pm_name}</strong></span>
                    </div>
                  ) : <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: 4, fontStyle: 'italic' }}>Nessun PM assegnato</div>}
                </div>
                <div style={{ display: 'flex', gap: '32px', alignSelf: isMobile ? 'flex-start' : 'center' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '22px', fontWeight: 700, color: '#0054a6' }}>{activeCommesse.length}</div><div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commesse</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '22px', fontWeight: 700, color: '#0054a6' }}>{allTeam.length}</div><div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risorse</div></div>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Team assegnato</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {allTeam.map(s => { const ac = getAvatarColor(s); return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 14px' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{getInitials(s)}</div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{s}</span>
                    </div>
                  ); })}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <TabBar tabs={[{ key: 'pianificazione', label: 'Pianificazione mensile' }, { key: 'bolle', label: 'Bolle & Consuntivi' }]} active={clienteTab} onChange={setClienteTab} />
                <div style={{ padding: isMobile ? '16px' : '24px 28px', overflowX: clienteTab === 'pianificazione' ? 'auto' : 'hidden' }}>
                  {clienteTab === 'pianificazione' && (
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', minWidth: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minWidth: 150, position: 'sticky', left: 0 }}>Commessa / Risorsa</th>
                        {currentMonths.map(m => <th key={m.label} style={{ textAlign: 'center', padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minWidth: 60, fontSize: '11px', fontWeight: 600, color: '#0054a6', textTransform: 'uppercase' }}>{m.label}</th>)}
                      </tr></thead>
                      <tbody>
                        {activeCommesse.map(co => (
                          <React.Fragment key={co.id}>
                            <tr style={{ background: '#f8fafc' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9', position: 'sticky', left: 0, background: '#f8fafc' }}>{co.nome_commessa}</td>
                              {currentMonths.map(m => <td key={m.label} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, color: '#475569' }}>{co.team.reduce((s, mem) => s + (parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0), 0) || ''}</td>)}
                            </tr>
                            {co.team.map(mem => (
                              <tr key={mem}>
                                <td style={{ padding: '6px 12px 6px 28px', color: '#64748b', borderBottom: '1px solid #f1f5f9', position: 'sticky', left: 0, background: '#fff' }}>{mem}</td>
                                {currentMonths.map(m => { const v = parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0; return <td key={m.label} style={{ textAlign: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>{v > 0 && <span style={{ display: 'inline-block', background: '#eff6ff', color: '#0054a6', borderRadius: '6px', padding: '2px 8px', fontWeight: 600, fontSize: '11px' }}>{v}</span>}</td>; })}
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {clienteTab === 'bolle' && <BolleCliente clientId={selected} clients={clients} />}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Dettaglio Commessa */}
        {entity === 'commessa' && selected && (() => {
          const co = clients.flatMap(c => c.commesse.map(co2 => ({ ...co2, clientName: c.nome_progetto, clientPM: c.pm_name }))).find(co2 => co2.id === selected);
          if (!co) return null;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '24px 28px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '14px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1.5px solid #bfdbfe', flexShrink: 0 }}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{co.clientName}</div>
                  <div style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: '#0f172a' }}>{co.nome_commessa}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: 6 }}>
                    {co.pm_commessa && <span style={{ fontSize: '12px', color: '#64748b' }}>PM: <strong>{co.pm_commessa}</strong></span>}
                    {co.data_inizio && <span style={{ fontSize: '12px', color: '#64748b' }}>Dal: <strong>{co.data_inizio}</strong></span>}
                    {co.data_fine && <span style={{ fontSize: '12px', color: '#64748b' }}>Al: <strong>{co.data_fine}</strong></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '22px', fontWeight: 700, color: '#0054a6' }}>{co.team?.length || 0}</div><div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risorse</div></div>
                  {progettoInfo && (progettoInfo.exists ? (
                    <button onClick={() => onOpenProgetto && onOpenProgetto(progettoInfo.id, co.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Apri progetto</button>
                  ) : (
                    <button onClick={async () => {
                      const { data, error } = await supabase.from('progetti').insert({ commessa_id: co.id }).select().single();
                      if (!error && data) { await creaTaskStandard(data.id); setProgettoInfo({ id: data.id, exists: true }); }
                    }} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #C0DD97', background: '#f0fdf4', color: '#27500a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>✦ Genera progetto</button>
                  ))}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Team assegnato</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {(co.team || []).map(s => { const ac = getAvatarColor(s); return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 14px' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{getInitials(s)}</div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{s}</span>
                    </div>
                  ); })}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <TabBar tabs={[{ key: 'pianificazione', label: 'Pianificazione mensile' }, { key: 'bolle', label: 'Bolle & Consuntivi' }]} active={commessaTab} onChange={setCommessaTab} />
                <div style={{ padding: isMobile ? '16px' : '24px 28px', overflowX: commessaTab === 'pianificazione' ? 'auto' : 'hidden' }}>
                  {commessaTab === 'pianificazione' && (
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', minWidth: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minWidth: 140, position: 'sticky', left: 0 }}>Risorsa</th>
                        {currentMonths.map(m => <th key={m.label} style={{ textAlign: 'center', padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minWidth: 60, fontSize: '11px', fontWeight: 600, color: '#0054a6', textTransform: 'uppercase' }}>{m.label}</th>)}
                      </tr></thead>
                      <tbody>
                        <tr style={{ background: '#f0f7ff' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0054a6', borderBottom: '1px solid #e2e8f0', position: 'sticky', left: 0, background: '#f0f7ff', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Totale</td>
                          {currentMonths.map(m => { const tot = (co.team || []).reduce((s, mem) => s + (parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0), 0); return <td key={m.label} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, color: '#0054a6' }}>{tot > 0 ? tot : ''}</td>; })}
                        </tr>
                        {(co.team || []).map(mem => (
                          <tr key={mem}>
                            <td style={{ padding: '8px 12px', color: '#374151', borderBottom: '1px solid #f1f5f9', position: 'sticky', left: 0, background: '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Avatar name={mem} avatarUrl={getAvatarUrl(mem, staff)} size={22} />{mem}</div>
                            </td>
                            {currentMonths.map(m => { const v = parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0; return <td key={m.label} style={{ textAlign: 'center', padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>{v > 0 && <span style={{ display: 'inline-block', background: '#eff6ff', color: '#0054a6', borderRadius: '6px', padding: '2px 8px', fontWeight: 600, fontSize: '11px' }}>{v}</span>}</td>; })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {commessaTab === 'bolle' && <BolleCommessa commessaId={selected} />}
                </div>
              </div>
            </div>
          );
        })()}

        {!entity && (
          <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '20px', fontSize: '14px' }}>
            {isMobile ? 'Seleziona una sezione dal menu qui sopra' : "Seleziona un'entità per visualizzare i dettagli"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// RISORSA DETAIL
// ─────────────────────────────────────────────
export function RisorsaDetail({ selected, staff, matrix, clients, assignments, skillsConfig, currentMonths, trainingCells, isMobile }) {
  const [expandedPlan, setExpandedPlan] = React.useState(null);
  const [skillSearch, setSkillSearch] = React.useState('');

  const FOLDERS = Object.keys(skillsConfig || {});
  const staffObj = staff.find(s => staffKey(s) === selected);
  const staffClients = clients.filter(c => c.commesse.some(co => co.team.includes(selected) && co.attiva !== false));

  const today = new Date();
  const weeks = [
    { key: getWeekKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7)), label: 'Sett. precedente', muted: true },
    { key: getWeekKey(today), label: 'Sett. corrente', muted: false },
    { key: getWeekKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7)), label: 'Sett. successiva', muted: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '24px 28px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <Avatar name={selected} avatarUrl={getAvatarUrl(selected, staff)} size={isMobile ? 48 : 56} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: '#0f172a' }}>{selected}</div>
          <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>{staffObj?.ruolo || 'Consulente'}</div>
        </div>
        <div style={{ display: 'flex', gap: '32px', alignSelf: isMobile ? 'flex-start' : 'center' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '22px', fontWeight: 700, color: '#0054a6' }}>{staffClients.length}</div><div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clienti</div></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '22px', fontWeight: 700, color: '#0054a6' }}>{staffClients.flatMap(c => c.commesse.filter(co => co.team.includes(selected) && co.attiva !== false)).length}</div><div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commesse</div></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
        {/* Mensile */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pianificazione mensile</div>
            <button onClick={() => setExpandedPlan('mensile')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}>⤢</button>
          </div>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', width: '100%' }}>
            <thead><tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minWidth: 120 }}>Cliente / Commessa</th>
              {currentMonths.map(m => <th key={m.label} style={{ textAlign: 'center', padding: '8px 6px', background: '#f0f7ff', borderBottom: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 600, color: '#0054a6', textTransform: 'uppercase', minWidth: 56 }}>{m.label}</th>)}
            </tr></thead>
            <tbody>
              {staffClients.map(c => {
                const commesse = c.commesse.filter(co => co.team.includes(selected) && co.attiva !== false);
                return (
                  <React.Fragment key={c.id}>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0054a6', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>{c.nome_progetto}</td>
                      {currentMonths.map(m => <td key={m.label} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>{commesse.reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${selected}-${m.label}`]) || 0), 0) || ''}</td>)}
                    </tr>
                    {commesse.map(co => (
                      <tr key={co.id}>
                        <td style={{ padding: '5px 10px 5px 20px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>{co.nome_commessa}</td>
                        {currentMonths.map(m => { const v = parseFloat(assignments[`${co.id}-${selected}-${m.label}`]) || 0; return <td key={m.label} style={{ textAlign: 'center', padding: '5px 6px', borderBottom: '1px solid #f1f5f9' }}>{v > 0 && <span style={{ display: 'inline-block', background: '#eff6ff', color: '#0054a6', borderRadius: '6px', padding: '2px 6px', fontWeight: 600, fontSize: '11px' }}>{v}</span>}</td>; })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Settimanale */}
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Settimane</div>
            <button onClick={() => setExpandedPlan('settimanale')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '18px' }}>⤢</button>
          </div>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', width: '100%' }}>
            <thead><tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minWidth: 120 }}>Cliente / Commessa</th>
              {weeks.map(w => <th key={w.key} style={{ textAlign: 'center', padding: '8px 6px', background: w.muted ? '#fafafa' : '#f0f7ff', borderBottom: '1px solid #e2e8f0', fontSize: '10px', fontWeight: 600, color: w.muted ? '#94a3b8' : '#0054a6', textTransform: 'uppercase', minWidth: 80 }}>{w.label}</th>)}
            </tr></thead>
            <tbody>
              {staffClients.map(c => {
                const commesse = c.commesse.filter(co => co.team.includes(selected) && co.attiva !== false);
                return (
                  <React.Fragment key={c.id}>
                    <tr style={{ background: '#f8fafc' }}>
                      <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0054a6', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>{c.nome_progetto}</td>
                      {weeks.map(w => <td key={w.key} style={{ textAlign: 'center', padding: '7px 6px', borderBottom: '1px solid #f1f5f9', background: w.muted ? '#fafafa' : '#fff', color: '#475569' }}>{commesse.reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${selected}-${w.key}`]) || 0), 0) || ''}</td>)}
                    </tr>
                    {commesse.map(co => (
                      <tr key={co.id}>
                        <td style={{ padding: '5px 10px 5px 20px', color: '#64748b', borderBottom: '1px solid #f1f5f9', fontSize: '11px' }}>{co.nome_commessa}</td>
                        {weeks.map(w => { const v = parseFloat(assignments[`${co.id}-${selected}-${w.key}`]) || 0; return <td key={w.key} style={{ textAlign: 'center', padding: '5px 6px', borderBottom: '1px solid #f1f5f9', background: w.muted ? '#fafafa' : '#fff' }}>{v > 0 && <span style={{ display: 'inline-block', background: w.muted ? '#f1f5f9' : '#eff6ff', color: '#0054a6', borderRadius: '6px', padding: '2px 6px', fontWeight: 600, fontSize: '11px' }}>{v}</span>}</td>; })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skill map */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: isMobile ? '16px' : '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Skill Map</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 10px' }}>
            <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input type="text" placeholder="Cerca skill..." value={skillSearch} onChange={e => setSkillSearch(e.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', color: '#0f172a', width: '110px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {FOLDERS.map(folder => {
            const skills = (skillsConfig[folder] || []).filter(sk => !skillSearch || sk.toLowerCase().includes(skillSearch.toLowerCase()));
            if (skills.length === 0) return null;
            return (
              <div key={folder}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0054a6', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid #eff6ff' }}>{folder}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {skills.map(skill => {
                    const key = `${selected}-${skill}`;
                    const val = matrix ? (matrix[key] || 0) : 0;
                    const isTrain = trainingCells && trainingCells[key];
                    const colors = val === 0 ? { bg: '#f8fafc', text: '#94a3b8', border: '#e2e8f0' }
                      : val === 1 ? { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' }
                      : val === 2 ? { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' }
                      : { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
                    return (
                      <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '8px', background: colors.bg, border: `1px solid ${colors.border}`, fontSize: '12px', fontWeight: val > 0 ? 600 : 400, color: colors.text }}>
                        {isTrain && <span style={{ fontSize: '10px' }}>📚</span>}
                        {skill}
                        {val > 0 && <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.6)', borderRadius: '4px', padding: '1px 4px' }}>{val}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modale espansa */}
      {expandedPlan && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setExpandedPlan(null)}>
          <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '1100px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 64px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{expandedPlan === 'mensile' ? 'Pianificazione mensile' : 'Vista settimanale'}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>{selected}</div>
              </div>
              <button onClick={() => setExpandedPlan(null)} style={{ background: 'none', border: 'none', fontSize: '22px', color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ overflow: 'auto', padding: '24px 28px', flex: 1 }}>
              <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '13px', width: '100%' }}>
                <thead><tr>
                  <th style={{ textAlign: 'left', padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', minWidth: 220, position: 'sticky', left: 0 }}>Cliente / Commessa</th>
                  {(expandedPlan === 'mensile' ? currentMonths : weeks).map(col => (
                    <th key={col.label || col.key} style={{ textAlign: 'center', padding: '10px 12px', background: col.muted ? '#fafafa' : '#f0f7ff', borderBottom: '1px solid #e2e8f0', minWidth: 80, fontSize: '11px', fontWeight: 600, color: col.muted ? '#94a3b8' : '#0054a6', textTransform: 'uppercase' }}>{col.label}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {staffClients.map(c => {
                    const commesse = c.commesse.filter(co => co.team.includes(selected) && co.attiva !== false);
                    return (
                      <React.Fragment key={c.id}>
                        <tr style={{ background: '#f8fafc' }}>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0054a6', borderBottom: '1px solid #f1f5f9', position: 'sticky', left: 0, background: '#f8fafc' }}>{c.nome_progetto}</td>
                          {(expandedPlan === 'mensile' ? currentMonths : weeks).map(col => { const k = expandedPlan === 'mensile' ? col.label : col.key; return <td key={k} style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #f1f5f9' }}>{commesse.reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${selected}-${k}`]) || 0), 0) || ''}</td>; })}
                        </tr>
                        {commesse.map(co => (
                          <tr key={co.id}>
                            <td style={{ padding: '8px 14px 8px 28px', color: '#64748b', borderBottom: '1px solid #f1f5f9', position: 'sticky', left: 0, background: '#fff' }}>{co.nome_commessa}</td>
                            {(expandedPlan === 'mensile' ? currentMonths : weeks).map(col => { const k = expandedPlan === 'mensile' ? col.label : col.key; const v = parseFloat(assignments[`${co.id}-${selected}-${k}`]) || 0; return <td key={k} style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid #f1f5f9', background: col.muted && expandedPlan !== 'mensile' ? '#fafafa' : '#fff' }}>{v > 0 && <span style={{ display: 'inline-block', background: '#eff6ff', color: '#0054a6', borderRadius: '6px', padding: '3px 10px', fontWeight: 600, fontSize: '12px' }}>{v}</span>}</td>; })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {previewCard && (
        <CardPreviewModal
          card={previewCard}
          colonnaNome={previewCard.colonna?.nome}
          onClose={() => setPreviewCard(null)}
        />
      )}
      {editCard && (
        <CardModal
          card={editCard}
          colonne={[]}
          workflowId={editCard.workflow_id}
          staff={staff}
          clients={clients}
          transizioni={[]}
          isAdmin={true}
          onClose={() => setEditCard(null)}
          onDelete={async () => { await supabase.from('attivita').delete().eq('id', editCard.id); setEditCard(null); }}
        />
      )}
      {openCommessaTarget && (
        <ProjectModal
          staff={staff}
          clients={clients}
          matrix={{}}
          targetedEdit={openCommessaTarget}
          onClose={() => { setOpenCommessaTarget(null); }}
          onOpenProgetto={(progettoId, commessaId) => { onOpenProgetto && onOpenProgetto(progettoId, commessaId); setOpenCommessaTarget(null); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// HOME USER
// ─────────────────────────────────────────────
export function HomeUser({ currentStaff, staff, matrix, clients, assignments, currentMonths, skillsConfig, trainingCells }) {
  if (!currentStaff) return null;
  const sKey = `${currentStaff.cognome} ${currentStaff.nome}`;
  const myStaff = staff.filter(s => staffKey(s) === sKey);
  const myClients = clients.filter(c => c.commesse.some(co => (co.team || []).includes(sKey) || co.pm_commessa === sKey))
    .map(c => ({ ...c, commesse: c.commesse.filter(co => (co.team || []).includes(sKey) || co.pm_commessa === sKey) }));

  const userEntities = [
    { key: 'risorsa', label: 'La tua scheda', desc: 'Skill map e pianificazione personale', adminOnly: false, icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><circle cx="19" cy="13" r="6" stroke="#0054a6" strokeWidth="2"/><path d="M5 34c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="#0054a6" strokeWidth="2" strokeLinecap="round"/></svg>) },
    { key: 'cliente', label: 'Clienti', desc: 'I clienti a cui sei assegnato', adminOnly: false, icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="5" y="14" width="28" height="20" rx="2" stroke="#0054a6" strokeWidth="2"/><path d="M13 14V9a2 2 0 012-2h8a2 2 0 012 2v5" stroke="#0054a6" strokeWidth="2"/><rect x="10" y="20" width="5" height="5" rx="1" stroke="#0054a6" strokeWidth="1.5"/><rect x="23" y="20" width="5" height="5" rx="1" stroke="#0054a6" strokeWidth="1.5"/></svg>) },
    { key: 'commessa', label: 'Commesse', desc: 'Le commesse a cui sei assegnato', adminOnly: false, icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="6" y="4" width="26" height="30" rx="3" stroke="#0054a6" strokeWidth="2"/><path d="M12 13h14M12 19h14M12 25h8" stroke="#0054a6" strokeWidth="2" strokeLinecap="round"/></svg>) },
  ];

  return (
    <KPIView staff={myStaff} matrix={matrix} clients={myClients} assignments={assignments}
      skillsConfig={skillsConfig} currentMonths={currentMonths} trainingCells={trainingCells}
      isAdmin={false}
      userOverride={{ sKey, entities: userEntities, defaultEntity: 'risorsa', defaultSelected: sKey, nome: currentStaff.nome, ruolo: currentStaff.ruolo }} />
  );
}