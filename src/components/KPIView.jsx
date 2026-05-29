import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';
import { STATO_COLORS, STATI_TASK, IN_CARICO_OPTIONS } from '../constants.js';
import { getAvatarColor, getInitials, getAvatarUrl, staffKey, staffLabel, getWeekKey, getWeekRange, workingDays } from '../utils.js';
import { ProdottiBadges } from './ProdottiSelector.jsx';
import { creaTaskStandard } from './ProgettiView.jsx';
import { Avatar } from './Avatar.jsx';
import { useIsMobile } from './DesktopOnly.jsx';
import { SchedaDemoModal, NuovoDocumentoModal } from './SchedaDemoModal.jsx';
import { RaccoltaRequisitiModal } from './RaccoltaRequisitiModal.jsx';
import { AssistenteAI } from './AssistenteAI.jsx';

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
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? 'var(--brand-700)' : 'var(--gray-200)'}`, padding: '6px 2px 8px', cursor: disabled ? 'default' : 'pointer', minHeight: 34 }}>
        <span style={{ fontSize: '13px', color: selectedLabel ? 'var(--gray-900)' : 'var(--gray-400)', fontStyle: selectedLabel ? 'normal' : 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedLabel || placeholder}</span>
        {!disabled && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}><polyline points="6 9 12 15 18 9"/></svg>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '0.5px solid var(--gray-200)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ padding: '6px 8px', borderBottom: '0.5px solid var(--gray-100)' }}>
            <input value={search} onChange={e => { e.stopPropagation(); setSearch(e.target.value); }} onClick={e => e.stopPropagation()} placeholder="Cerca..." autoFocus
              style={{ width: '100%', padding: '5px 8px', fontSize: '12px', border: '0.5px solid var(--gray-200)', borderRadius: 6, outline: 'none', background: 'var(--gray-50)', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.map((o, i) => { const val = o.value ?? o; const label = o.label ?? o; const isSel = val === value; return (
              <div key={i} onClick={() => { onChange(val); setOpen(false); setSearch(''); }}
                style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', background: isSel ? 'var(--brand-50)' : '#fff', color: isSel ? 'var(--brand-800)' : 'var(--gray-900)', fontWeight: isSel ? 500 : 400 }}
                onMouseOver={e => { if (!isSel) e.currentTarget.style.background = 'var(--gray-50)'; }}
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

  const isStaffOpen = (sName) => {
    if (sName in expanded) return !!expanded[sName];
    return !!(expandClients || expandCommesse);
  };
  const isClientOpen = (sName, cId) => {
    const key = `${sName}-${cId}`;
    if (key in expanded) return !!expanded[key];
    return !!expandCommesse;
  };
  const isCommesseOpen = (sName, cId) => {
    if (!isClientOpen(sName, cId)) return false;
    const key = `comm-${sName}-${cId}`;
    if (key in expanded) return !!expanded[key];
    return !!expandCommesse;
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
  const bdR = (strong) => ({ borderRight: strong ? '2px solid var(--gray-200)' : '1px solid var(--gray-100)' });
  const bdB = { borderBottom: '1px solid var(--gray-100)' };
  const bdBstrong = { borderBottom: '1px solid var(--gray-200)' };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid var(--gray-200)', fontSize: '13px' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...cell(), minWidth: 230, position: 'sticky', left: 0, background: 'var(--gray-50)', zIndex: 10, ...bdBstrong, borderRight: '2px solid var(--gray-200)', padding: '12px 14px', fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase' }}>
              Consulente / Cliente / Commessa
            </th>
            <th rowSpan={2} style={{ ...cell({ textAlign: 'center', minWidth: 95 }), background: 'var(--gray-50)', ...bdBstrong, borderRight: '2px solid var(--gray-200)' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-700)', letterSpacing: '0.04em' }}>{monthKey}</div>
              <div style={{ fontSize: '10px', fontWeight: 500, color: 'var(--gray-400)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giorni previsti</div>
            </th>
            {weeks.map((w, i) => (
              <th key={w.key} colSpan={2} style={{ textAlign: 'center', padding: '8px 0 4px', fontSize: '11px', fontWeight: 700, color: w.muted ? 'var(--gray-400)' : 'var(--brand-700)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--gray-200)', borderRight: i < 2 ? '2px solid var(--gray-200)' : undefined, background: w.muted ? 'var(--gray-50)' : 'var(--brand-50)' }}>
                {w.label}
                <span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--gray-400)', display: 'block', marginTop: 1 }}>{w.range}</span>
              </th>
            ))}
          </tr>
          <tr>
            {weeks.map((w, i) => (
              <React.Fragment key={w.key}>
                <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 600, color: 'var(--gray-500)', background: w.muted ? 'var(--gray-50)' : 'var(--brand-50)', ...bdBstrong, textAlign: 'center', minWidth: 70 }}>GG Prev</th>
                <th style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 600, color: 'var(--gray-500)', background: w.muted ? 'var(--gray-50)' : 'var(--brand-50)', ...bdBstrong, borderRight: i < 2 ? '2px solid var(--gray-200)' : undefined, minWidth: 150 }}>Note</th>
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
                <tr style={{ background: 'var(--gray-50)', cursor: 'pointer' }} onClick={() => toggleStaff(sName)}>
                  <td style={{ ...cell({ padding: '10px 12px' }), position: 'sticky', left: 0, background: 'var(--gray-50)', zIndex: 5, fontWeight: 700, fontSize: '13px', color: 'var(--gray-950)', borderRight: '2px solid var(--gray-200)', ...bdBstrong }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, border: `1px solid ${avatarColor.text}22` }}>{initials}</div>
                      <span>{staffLabel(sObj)}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--gray-400)' }}>{staffOpen ? '▼' : '▶'}</span>
                    </div>
                  </td>
                  <td style={{ ...cell({ textAlign: 'center' }), borderRight: '2px solid var(--gray-200)', ...bdBstrong, fontWeight: 700, color: monthTotal > 0 ? 'var(--gray-950)' : 'var(--gray-400)' }}>{monthTotal > 0 ? monthTotal : '—'}</td>
                  {weeks.map((w, i) => {
                    const tot = weekTotals[i];
                    return (
                      <React.Fragment key={w.key}>
                        <td style={{ ...cell({ textAlign: 'center' }), ...bdBstrong, background: w.muted ? 'var(--gray-50)' : '#fff', fontWeight: 700, color: tot > 0 ? 'var(--gray-950)' : 'var(--gray-400)' }}>{tot > 0 ? tot : '—'}</td>
                        <td style={{ ...cell(), ...bdBstrong, ...bdR(i < 2), background: w.muted ? 'var(--gray-50)' : '#fff' }} />
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
                        <td style={{ ...cell({ paddingLeft: 28, padding: '9px 8px 9px 28px' }), position: 'sticky', left: 0, background: '#fff', zIndex: 5, borderRight: '2px solid var(--gray-200)', ...bdB, color: 'var(--brand-600)', fontWeight: 600 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: 9, color: 'var(--gray-400)', width: 10 }}>{clientOpen ? '▼' : '▶'}</span>
                            <span style={{ flex: 1 }}>{c.nome_progetto}</span>
                            {clientOpen && <span onClick={(e) => toggleCommesse(sName, c.id, e)} style={{ fontSize: 9, color: commOpen ? 'var(--brand-600)' : 'var(--gray-400)', padding: '2px 5px', borderRadius: '4px', background: commOpen ? 'var(--brand-50)' : 'var(--gray-100)', cursor: 'pointer' }}>{commOpen ? '▴' : '▾'}</span>}
                          </div>
                        </td>
                        <td style={{ ...cell({ textAlign: 'center' }), borderRight: '2px solid var(--gray-200)', ...bdB, color: 'var(--gray-500)' }}>{clientMonthGg > 0 ? clientMonthGg : ''}</td>
                        {weeks.map((w, i) => (
                          <React.Fragment key={w.key}>
                            <td style={{ ...cell({ textAlign: 'center' }), ...bdB, background: w.muted ? 'var(--gray-50)' : '#fff', color: 'var(--gray-500)' }}>{commesse.reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${sName}-${w.key}`]) || 0), 0) || ''}</td>
                            <td style={{ ...cell(), ...bdB, ...bdR(i < 2), background: w.muted ? 'var(--gray-50)' : '#fff' }} />
                          </React.Fragment>
                        ))}
                      </tr>
                      {clientOpen && commOpen && commesse.map(co => (
                        <tr key={`${sName}-${co.id}`} style={{ background: '#fff' }}>
                          <td style={{ ...cell({ paddingLeft: 48, padding: '6px 8px 6px 48px' }), position: 'sticky', left: 0, background: '#fff', zIndex: 5, borderRight: '2px solid var(--gray-200)', ...bdB, color: 'var(--gray-500)', fontSize: '12px' }}>{co.nome_commessa}</td>
                          <td style={{ ...cell({ textAlign: 'center' }), borderRight: '2px solid var(--gray-200)', ...bdB, color: 'var(--gray-400)', fontSize: 12 }}>
                            {assignments[`${co.id}-${sName}-${monthKey}`] > 0 ? assignments[`${co.id}-${sName}-${monthKey}`] : '—'}
                          </td>
                          {weeks.map((w, i) => {
                            const noteKey = `note-${co.id}-${sName}-${w.key}`;
                            const noteVal = localNotes[noteKey] !== undefined ? localNotes[noteKey] : (assignments[`${co.id}-${sName}-${w.key}-note`] || '');
                            return (
                              <React.Fragment key={w.key}>
                                <td style={{ ...cell({ textAlign: 'center' }), ...bdB, background: w.muted ? 'var(--gray-50)' : '#fff' }}>
                                  {w.muted ? (
                                    <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{assignments[`${co.id}-${sName}-${w.key}`] > 0 ? assignments[`${co.id}-${sName}-${w.key}`] : '—'}</span>
                                  ) : (
                                    <input type="number" step="0.5" min="0"
                                      value={assignments[`${co.id}-${sName}-${w.key}`] || ''}
                                      onChange={e => saveGg(co.id, sName, w.key, e.target.value)}
                                      style={{ border: 'none', borderBottom: '1.5px solid transparent', background: 'transparent', outline: 'none', textAlign: 'center', width: 44, fontSize: 12, padding: '3px 0' }}
                                      onFocus={e => e.target.style.borderBottomColor = 'var(--brand-700)'}
                                      onBlur={e => e.target.style.borderBottomColor = 'transparent'} />
                                  )}
                                </td>
                                <td style={{ ...cell(), ...bdB, ...bdR(i < 2), background: w.muted ? 'var(--gray-50)' : '#fff' }}>
                                  {w.muted ? (
                                    <span style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: noteVal ? 'normal' : 'italic' }}>{noteVal || ''}</span>
                                  ) : (
                                    <input type="text" placeholder="" value={noteVal}
                                      onChange={e => setLocalNotes(p => ({ ...p, [noteKey]: e.target.value }))}
                                      onBlur={e => saveNote(co.id, sName, w.key, e.target.value)}
                                      style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '12px', color: 'var(--gray-500)', outline: 'none', fontStyle: noteVal ? 'normal' : 'italic' }} />
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
                  <tr style={{ background: 'var(--brand-50)' }}>
                    <td style={{ ...cell({ padding: '8px 12px 8px 28px' }), position: 'sticky', left: 0, background: 'var(--brand-50)', zIndex: 5, borderRight: '2px solid var(--gray-200)', borderBottom: '2px solid var(--gray-200)', fontWeight: 700, fontSize: '11px', color: 'var(--brand-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Totale Giorni</td>
                    <td style={{ ...cell({ textAlign: 'center' }), borderRight: '2px solid var(--gray-200)', borderBottom: '2px solid var(--gray-200)', fontWeight: 700, color: 'var(--brand-700)' }}>{monthTotal > 0 ? monthTotal : ''}</td>
                    {weeks.map((w, i) => (
                      <React.Fragment key={w.key}>
                        <td style={{ ...cell({ textAlign: 'center' }), borderBottom: '2px solid var(--gray-200)', background: w.muted ? '#e8f0fa' : '#dbeafe', fontWeight: 700, color: 'var(--brand-700)' }}>{weekTotals[i] > 0 ? weekTotals[i] : ''}</td>
                        <td style={{ ...cell(), borderBottom: '2px solid var(--gray-200)', ...bdR(i < 2), background: w.muted ? '#e8f0fa' : '#dbeafe' }} />
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

  const efficaciaColor = efficacia === null ? 'var(--gray-400)' : efficacia >= 75 ? '#16a34a' : efficacia >= 60 ? '#d97706' : '#dc2626';
  const efficaciaBg = efficacia === null ? 'var(--gray-50)' : efficacia >= 75 ? '#f0fdf4' : efficacia >= 60 ? '#fffbeb' : '#fef2f2';
  const efficaciaBorder = efficacia === null ? 'var(--gray-200)' : efficacia >= 75 ? '#bbf7d0' : efficacia >= 60 ? '#fde68a' : '#fecaca';

  let statoColor = 'var(--gray-400)', statoLabel = 'Non iniziata', statoBg = 'var(--gray-50)', statoBorder = 'var(--gray-200)';
  if (senzaTetto) { statoLabel = 'A consumo'; statoColor = '#d97706'; statoBg = '#fffbeb'; statoBorder = '#fde68a'; }
  else if (overBudget) { statoLabel = 'Sforamento'; statoColor = '#dc2626'; statoBg = '#fef2f2'; statoBorder = '#fecaca'; }
  else if (esaurita) { statoLabel = 'Esaurita'; statoColor = 'var(--gray-500)'; statoBg = 'var(--gray-100)'; statoBorder = 'var(--gray-200)'; }
  else if (giorniConsuntivati > 0) { statoLabel = 'In corso'; statoColor = '#16a34a'; statoBg = '#f0fdf4'; statoBorder = '#bbf7d0'; }

  const StatBox = ({ val, label, color }) => (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 80 }}>
      <div style={{ fontSize: '28px', fontWeight: 800, color: color || 'var(--gray-950)', lineHeight: 1.1 }}>{val}</div>
      <div style={{ fontSize: '10px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '560px', boxShadow: '0 32px 64px rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, var(--brand-800) 0%, var(--brand-700) 100%)', padding: '24px 28px', position: 'relative' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '12px', color: 'var(--gray-500)' }}>
                <span>Avanzamento</span>
                <span style={{ fontWeight: 700, color: overBudget ? '#dc2626' : 'var(--brand-700)' }}>{Math.round(pct)}%</span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'var(--gray-100)', borderRadius: '5px', overflow: 'hidden' }}>
                <div style={{ width: `${overBudget ? 100 : pct}%`, height: '100%', background: overBudget ? '#E24B4A' : esaurita ? 'var(--gray-400)' : 'var(--brand-700)', borderRadius: '5px', transition: 'width 0.4s' }} />
              </div>
            </div>
          )}
          {senzaTetto && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#d97706', fontStyle: 'italic' }}>
              Bolla a consumo — nessun tetto ore definito
            </div>
          )}

          {/* Stat boxes */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--gray-50)', borderRadius: '14px', padding: '20px 16px', border: '1px solid var(--gray-200)' }}>
            <StatBox val={senzaTetto ? '∞' : fmtGg(giorniPrevisti)} label="Previsti" color="var(--gray-500)" />
            <div style={{ width: '1px', background: 'var(--gray-200)', flexShrink: 0 }} />
            <StatBox val={fmtGg(giorniConsuntivati)} label="Svolti" color={overBudget ? '#dc2626' : giorniConsuntivati > 0 ? '#16a34a' : 'var(--gray-400)'} />
            {!senzaTetto && <>
              <div style={{ width: '1px', background: 'var(--gray-200)', flexShrink: 0 }} />
              <StatBox val={overBudget ? `-${fmtGg(Math.abs(giorniResidui))}` : fmtGg(giorniResidui)} label="Residui" color={overBudget ? '#dc2626' : giorniResidui <= 2 ? '#d97706' : 'var(--gray-500)'} />
            </>}
            <div style={{ width: '1px', background: 'var(--gray-200)', flexShrink: 0 }} />
            <StatBox val={fmtGg(giorniPagamento)} label="Pagamento" color={giorniPagamento > 0 ? 'var(--brand-700)' : 'var(--gray-400)'} />
            <div style={{ width: '1px', background: 'var(--gray-200)', flexShrink: 0 }} />
            <div style={{ textAlign: 'center', flex: 1, minWidth: 80, background: efficaciaBg, border: `1px solid ${efficaciaBorder}`, borderRadius: '10px', padding: '8px' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: efficaciaColor, lineHeight: 1.1 }}>{efficacia !== null ? `${Math.round(efficacia)}%` : '—'}</div>
              <div style={{ fontSize: '10px', color: efficaciaColor, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4, opacity: 0.85 }}>Efficacia</div>
            </div>
          </div>

          {/* Info aggiuntive */}
          {(bolla.codice_cliente || bolla.commessa_id) && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {bolla.codice_cliente && (
                <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '8px', padding: '8px 14px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--gray-400)' }}>Cod. cliente: </span>
                  <span style={{ fontWeight: 700, color: 'var(--gray-950)', fontFamily: 'monospace' }}>{bolla.codice_cliente}</span>
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

  const efficaciaColor = efficacia === null ? 'var(--gray-400)' : efficacia >= 75 ? '#16a34a' : efficacia >= 60 ? '#d97706' : '#dc2626';
  const efficaciaBg = efficacia === null ? 'var(--gray-50)' : efficacia >= 75 ? '#f0fdf4' : efficacia >= 60 ? '#fffbeb' : '#fef2f2';
  const efficaciaBorder = efficacia === null ? 'var(--gray-200)' : efficacia >= 75 ? '#bbf7d0' : efficacia >= 60 ? '#fde68a' : '#fecaca';

  let statoColor = 'var(--gray-400)', statoLabel = 'Non iniziata', statoBg = 'var(--gray-50)', statoBorder = 'var(--gray-200)';
  if (senzaTetto) { statoLabel = 'A consumo'; statoColor = '#d97706'; statoBg = '#fffbeb'; statoBorder = '#fde68a'; }
  else if (overBudget) { statoLabel = 'Sforamento'; statoColor = '#dc2626'; statoBg = '#fef2f2'; statoBorder = '#fecaca'; }
  else if (esaurita) { statoLabel = 'Esaurita'; statoColor = 'var(--gray-500)'; statoBg = 'var(--gray-100)'; statoBorder = 'var(--gray-200)'; }
  else if (giorniConsuntivati > 0) { statoLabel = 'In corso'; statoColor = '#16a34a'; statoBg = '#f0fdf4'; statoBorder = '#bbf7d0'; }

  return (
    <div onClick={onClick} style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px', cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.15s, border-color 0.15s' }}
      onMouseOver={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,84,166,0.10)'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
      onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--gray-200)'; }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: 'var(--brand-700)', background: 'var(--brand-50)', padding: '3px 8px', borderRadius: '6px', border: '1px solid #bfdbfe', flexShrink: 0 }}>{b.codice}</span>
        <span style={{ fontSize: '13px', color: 'var(--gray-950)', fontWeight: 500, flex: 1 }}>{b.descrizione || '—'}</span>
        <span style={{ fontSize: '11px', fontWeight: 600, color: statoColor, background: statoBg, border: `1px solid ${statoBorder}`, padding: '3px 10px', borderRadius: '20px', flexShrink: 0 }}>{statoLabel}</span>
        {onClick && <span style={{ fontSize: '11px', color: 'var(--gray-400)', flexShrink: 0 }}>→</span>}
      </div>
      {commesseMap && b.commessa_id && commesseMap[b.commessa_id] && (
        <div style={{ fontSize: '11px', color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: 'var(--gray-400)' }}>Commessa:</span>
          <span style={{ fontWeight: 600, color: 'var(--gray-500)' }}>{commesseMap[b.commessa_id]}</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ textAlign: 'center', minWidth: 44 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: senzaTetto ? 'var(--gray-400)' : 'var(--gray-950)' }}>{senzaTetto ? '∞' : fmtGg(giorniPrevisti)}</div>
          <div style={{ fontSize: '9px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>previsti</div>
        </div>
        <div style={{ flex: 1 }}>
          {!senzaTetto ? (
            <>
              <div style={{ width: '100%', height: '6px', background: 'var(--gray-100)', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                <div style={{ width: `${overBudget ? 100 : pct}%`, height: '100%', background: overBudget ? '#E24B4A' : esaurita ? 'var(--gray-400)' : '#639922', borderRadius: '3px', transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--gray-400)', textAlign: 'center' }}>{Math.round(pct)}% consumato</div>
            </>
          ) : (
            <div style={{ fontSize: '11px', color: '#d97706', fontStyle: 'italic', textAlign: 'center' }}>A consumo</div>
          )}
        </div>
        <div style={{ textAlign: 'center', minWidth: 44 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: overBudget ? '#dc2626' : giorniConsuntivati > 0 ? '#16a34a' : 'var(--gray-400)' }}>{fmtGg(giorniConsuntivati)}</div>
          <div style={{ fontSize: '9px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>svolti</div>
        </div>
        {!senzaTetto && (
          <div style={{ textAlign: 'center', minWidth: 44 }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: overBudget ? '#dc2626' : giorniResidui <= 2 ? '#d97706' : 'var(--gray-500)' }}>
              {overBudget ? `-${fmtGg(Math.abs(giorniResidui))}` : fmtGg(giorniResidui)}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>residui</div>
          </div>
        )}
        <div style={{ width: '1px', height: '40px', background: 'var(--gray-200)', flexShrink: 0 }} />
        <div style={{ textAlign: 'center', minWidth: 44 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: giorniPagamento > 0 ? 'var(--brand-700)' : 'var(--gray-400)' }}>{fmtGg(giorniPagamento)}</div>
          <div style={{ fontSize: '9px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>pagamento</div>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '10px', padding: '8px 12px' }}>
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="6.5" cy="6.5" r="5" stroke="var(--gray-400)" strokeWidth="1.5"/>
        <path d="M10 10l3 3" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <input type="text" placeholder={placeholder || 'Cerca per codice o descrizione...'} value={value} onChange={e => onChange(e.target.value)}
        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', flex: 1, color: 'var(--gray-950)' }} />
      {value && <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '16px', lineHeight: 1, padding: 0 }}>×</button>}
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

  if (loading) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)', fontSize: '13px' }}>Caricamento bolle...</div>;
  if (!client?.codice_cliente) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)', fontSize: '13px', fontStyle: 'italic' }}>Nessun codice gestionale associato a questo cliente.</div>;
  if (bolle.length === 0) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)', fontSize: '13px', fontStyle: 'italic' }}>Nessuna bolla importata per questo cliente.</div>;

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
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '13px', fontStyle: 'italic' }}>Nessuna bolla trovata per "{filterText}"</div>
      )}
      {bolleAssociate.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid var(--gray-100)' }}>Associate a commessa ({bolleAssociate.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bolleAssociate.map(b => <BollaCard key={b.id} b={b} consuntivi={consuntivi} consuntiviPag={consuntiviPag} commesseMap={commesseMap} onClick={() => setBollaSelezionata(b)} />)}
          </div>
        </div>
      )}
      {bolleLibere.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid var(--gray-100)' }}>Non associate ({bolleLibere.length})</div>
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

  if (loading) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)', fontSize: '13px' }}>Caricamento bolle...</div>;
  if (bolle.length === 0) return <div style={{ textAlign: 'center', padding: '32px', color: 'var(--gray-400)', fontSize: '13px', fontStyle: 'italic' }}>Nessuna bolla associata a questa commessa.</div>;

  const bolleFiltered = bolle.filter(b => {
    if (!filterText) return true;
    const q = filterText.toLowerCase();
    return b.codice.toLowerCase().includes(q) || (b.descrizione || '').toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <FilterBar value={filterText} onChange={setFilterText} />
      {bolleFiltered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--gray-400)', fontSize: '13px', fontStyle: 'italic' }}>Nessuna bolla trovata per "{filterText}"</div>
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
  const sectionStyle = { background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '16px', padding: '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' };
  const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', gap: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' };
  const inputStyle = { padding: '9px 12px', border: '1px solid var(--gray-200)', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', color: 'var(--gray-950)', background: 'var(--gray-50)', outline: 'none', width: '100%', boxSizing: 'border-box' };
  const btnStyle = (disabled) => ({ padding: '9px 20px', borderRadius: '9px', border: 'none', background: disabled ? 'var(--gray-200)' : 'var(--brand-700)', color: disabled ? 'var(--gray-400)' : '#fff', fontSize: '13px', fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0 });
  const statusStyle = (type) => ({ padding: '9px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: type === 'success' ? '#f0fdf4' : '#fef2f2', color: type === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}` });
  const fileDropStyle = (hasFile) => ({ border: `2px dashed ${hasFile ? 'var(--brand-700)' : 'var(--gray-200)'}`, borderRadius: '10px', padding: '16px 20px', textAlign: 'center', cursor: 'pointer', background: hasFile ? 'var(--brand-50)' : 'var(--gray-50)', color: hasFile ? 'var(--brand-700)' : 'var(--gray-400)', fontSize: '13px', transition: 'all 0.15s' });
  const colTipStyle = { background: 'var(--gray-100)', border: '1px solid var(--gray-200)', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', color: 'var(--gray-500)', fontFamily: 'monospace' };

  // ── KPI Cards ──
  const RUOLI_ORDER = ['PM', 'Project Manager', 'Consulente', 'Programmatore', 'Analista'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* ── KPI STRIP ── */}
      {kpiLoading ? (
        <div style={{ color: 'var(--gray-400)', fontSize: '13px', padding: '12px 0' }}>Caricamento KPI...</div>
      ) : kpi && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>

          {/* KPI CLIENTI */}
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--brand-50)', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>🏢</div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--brand-700)', lineHeight: 1 }}>{kpi.nClienti}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-950)', marginTop: 2 }}>Clienti</div>
              </div>
            </div>
            {Object.keys(kpi.prodottiCount).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--gray-100)', paddingTop: '12px' }}>
                {Object.entries(kpi.prodottiCount).sort((a, b) => b[1] - a[1]).map(([prod, cnt]) => (
                  <div key={prod} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{prod}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-700)' }}>{cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPI RISORSE */}
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', flex: '1 1 220px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#f0fdf4', border: '1.5px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>👤</div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>{kpi.nRisorse}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-950)', marginTop: 2 }}>Risorse</div>
              </div>
            </div>
            {Object.keys(kpi.ruoliCount).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--gray-100)', paddingTop: '12px' }}>
                {RUOLI_ORDER.filter(r => kpi.ruoliCount[r]).map(r => (
                  <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{r}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{kpi.ruoliCount[r]}</span>
                  </div>
                ))}
                {Object.entries(kpi.ruoliCount).filter(([r]) => !RUOLI_ORDER.includes(r)).map(([r, cnt]) => (
                  <div key={r} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>{r}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{cnt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* KPI BOLLE */}
          <div style={{ background: '#fff', border: '1px solid var(--gray-200)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', flex: '2 1 300px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fffbeb', border: '1.5px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📋</div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{kpi.nBolle}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gray-950)', marginTop: 2 }}>Bolle</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--gray-100)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Giorni lavoro previsti</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-500)' }}>{fmtGg(kpi.totGiorniPrevisti)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Fatti</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>{fmtGg(kpi.totGiorniFatti)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Pagamento</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-700)' }}>{fmtGg(kpi.totGiorniPagamento)}</span>
              </div>
              {kpi.efficaciaGlobale !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px dashed var(--gray-100)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Efficacia globale</span>
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
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-950)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span> Ricerca Bolle
          </div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: 4 }}>Cerca una bolla per codice o descrizione — clicca per aprire la scheda</div>
        </div>
        <FilterBar value={bolleSearch} onChange={setBolleSearch} placeholder="Cerca bolla per codice o descrizione..." />
        {bolleRicercaLoading && <div style={{ color: 'var(--gray-400)', fontSize: '12px', marginTop: 8 }}>Ricerca in corso...</div>}
        {!bolleRicercaLoading && bolleSearch && bolleRicerca.length === 0 && (
          <div style={{ color: 'var(--gray-400)', fontSize: '12px', marginTop: 12, fontStyle: 'italic' }}>Nessuna bolla trovata per "{bolleSearch}"</div>
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
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-950)', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '18px' }}>🏢</span> Importa Cliente</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: 4 }}>Aggiunge un nuovo cliente all'anagrafica</div>
        </div>

        {/* Form singolo */}
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Inserimento manuale</div>
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
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Import da Excel</div>
        <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginBottom: '10px' }}>
          Colonne attese: {['Nome cliente *', 'Codice esterno', 'PM responsabile'].map((c, i) => <span key={i} style={colTipStyle}>{c}</span>)}
        </div>
        <div style={fileDropStyle(!!clientiFile)} onClick={() => clientiInputRef.current?.click()}>
          {clientiFile ? <><span style={{ fontSize: '16px' }}>📄</span> {clientiFile.name}</> : <><span style={{ fontSize: '16px' }}>📁</span> Clicca per selezionare il file Excel (.xlsx)</>}
          <input ref={clientiInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { setClientiFile(e.target.files[0] || null); setClientiFileStatus(null); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={btnStyle(clientiFileSaving || !clientiFile)} disabled={clientiFileSaving || !clientiFile} onClick={handleImportaClientiExcel}>{clientiFileSaving ? '⏳ Importazione...' : '↑ Importa Clienti'}</button>
          {clientiFile && !clientiFileSaving && <button onClick={() => { setClientiFile(null); setClientiFileStatus(null); if (clientiInputRef.current) clientiInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '13px' }}>Rimuovi file</button>}
          {clientiFileStatus && <div style={statusStyle(clientiFileStatus.type)}>{clientiFileStatus.msg}</div>}
        </div>
      </div>

      {/* ── IMPORTA BOLLE ── */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-950)', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '18px' }}>📋</span> Importa Bolle di Lavoro</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: 4 }}>
            Colonne attese: {['Codice bolla *', 'Descrizione', 'Codice cliente', 'Ore previste', 'ID commessa (opz)'].map((c, i) => <span key={i} style={colTipStyle}>{c}</span>)}
          </div>
        </div>
        <div style={fileDropStyle(!!bolleFile)} onClick={() => bolleInputRef.current?.click()}>
          {bolleFile ? <><span>📄</span> {bolleFile.name}</> : <><span>📁</span> Clicca per selezionare il file Excel (.xlsx)</>}
          <input ref={bolleInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { setBolleFile(e.target.files[0] || null); setBolleStatus(null); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={btnStyle(bolleSaving || !bolleFile)} disabled={bolleSaving || !bolleFile} onClick={handleImportaBolle}>{bolleSaving ? '⏳ Importazione...' : '↑ Importa Bolle'}</button>
          {bolleFile && !bolleSaving && <button onClick={() => { setBolleFile(null); setBolleStatus(null); if (bolleInputRef.current) bolleInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '13px' }}>Rimuovi file</button>}
          {bolleStatus && <div style={statusStyle(bolleStatus.type)}>{bolleStatus.msg}</div>}
        </div>
      </div>

      {/* ── IMPORTA CONSUNTIVI ── */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-950)', display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '18px' }}>📊</span> Importa Consuntivi</div>
          <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: 4 }}>
            I consuntivi vengono scritti direttamente in <code style={{ background: 'var(--gray-100)', padding: '1px 5px', borderRadius: '4px', fontSize: '11px' }}>consuntivi_globali</code>.<br />
            Colonne attese: {['Data *', 'Cod. Cliente', 'Operatore', 'Note', 'Ore Tecniche', 'Ore Pagamento', 'Bolla'].map((c, i) => <span key={i} style={colTipStyle}>{c}</span>)}
          </div>
        </div>
        <div style={fileDropStyle(!!consuntiviFile)} onClick={() => consuntiviInputRef.current?.click()}>
          {consuntiviFile ? <><span>📄</span> {consuntiviFile.name}</> : <><span>📁</span> Clicca per selezionare il file Excel (.xlsx)</>}
          <input ref={consuntiviInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { setConsuntiviFile(e.target.files[0] || null); setConsuntiviStatus(null); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px', flexWrap: 'wrap' }}>
          <button style={btnStyle(consuntiviSaving || !consuntiviFile)} disabled={consuntiviSaving || !consuntiviFile} onClick={handleImportaConsuntivi}>{consuntiviSaving ? '⏳ Importazione...' : '↑ Importa Consuntivi'}</button>
          {consuntiviFile && !consuntiviSaving && <button onClick={() => { setConsuntiviFile(null); setConsuntiviStatus(null); if (consuntiviInputRef.current) consuntiviInputRef.current.value = ''; }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '13px' }}>Rimuovi file</button>}
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
    icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><circle cx="19" cy="13" r="6" stroke="var(--brand-700)" strokeWidth="2"/><path d="M5 34c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="var(--brand-700)" strokeWidth="2" strokeLinecap="round"/></svg>),
  },
  {
    key: 'cliente', label: 'Clienti', desc: 'Anagrafica, team e pianificazione mensile', adminOnly: false,
    icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="5" y="14" width="28" height="20" rx="2" stroke="var(--brand-700)" strokeWidth="2"/><path d="M13 14V9a2 2 0 012-2h8a2 2 0 012 2v5" stroke="var(--brand-700)" strokeWidth="2"/><rect x="10" y="20" width="5" height="5" rx="1" stroke="var(--brand-700)" strokeWidth="1.5"/><rect x="23" y="20" width="5" height="5" rx="1" stroke="var(--brand-700)" strokeWidth="1.5"/><rect x="16" y="22" width="6" height="12" rx="1" stroke="var(--brand-700)" strokeWidth="1.5"/><path d="M5 34h28" stroke="var(--brand-700)" strokeWidth="2" strokeLinecap="round"/></svg>),
  },
  {
    key: 'commessa', label: 'Commesse', desc: 'Dettaglio commessa, team e allocazione', adminOnly: false,
    icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="6" y="4" width="26" height="30" rx="3" stroke="var(--brand-700)" strokeWidth="2"/><path d="M12 13h14M12 19h14M12 25h8" stroke="var(--brand-700)" strokeWidth="2" strokeLinecap="round"/><circle cx="28" cy="28" r="6" fill="var(--brand-50)" stroke="var(--brand-700)" strokeWidth="1.5"/><path d="M25.5 28l2 2 3-3" stroke="var(--brand-700)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  },
  {
    key: 'dati', label: 'Dati', desc: 'KPI globali, ricerca bolle e importazione', adminOnly: true,
    icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <rect x="5" y="22" width="6" height="12" rx="2" stroke="var(--brand-700)" strokeWidth="2"/>
      <rect x="16" y="14" width="6" height="20" rx="2" stroke="var(--brand-700)" strokeWidth="2"/>
      <rect x="27" y="6" width="6" height="28" rx="2" stroke="var(--brand-700)" strokeWidth="2"/>
      <path d="M8 18l8-6 8 4 8-10" stroke="var(--brand-700)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand-800)', letterSpacing: '.04em', textTransform: 'uppercase' }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>Scegli un&apos;azione</div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: 'var(--gray-400)', cursor: 'pointer', lineHeight: 1, padding: '2px 6px' }}>&times;</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: cols }}>
        {fns.map((item, i) => (
          <div key={i} onClick={item.fn}
            style={{ padding: '18px 22px', cursor: 'pointer', borderRight: i < fns.length - 1 ? '1px solid var(--gray-100)' : 'none', display: 'flex', flexDirection: 'column', gap: 10, background: '#fff' }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--gray-50)'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#fff'; }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-950)', marginBottom: 3 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)', lineHeight: 1.4 }}>{item.desc}</div>
            </div>
            <div style={{ fontSize: 12, color: color, fontWeight: 500 }}>&rarr;</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// ── KpiActionsPanel ───────────────────────────────────────────────────────────
function KpiActionsPanel({ tipo, color, onClose, staff, clients, onNavigate, onGestisciClienti, onNuovaCommessaDiretta, setEntity, setSelected, setSearch, setActiveKpi }) {
  const [q, setQ] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => { setTimeout(() => ref.current && ref.current.focus(), 60); }, [tipo]);
  const title = { risorsa: 'Risorse', cliente: 'Clienti', commessa: 'Commesse', bolle: 'Bolle' }[tipo];
  const sR  = q ? staff.filter(s => (s.nome + ' ' + s.cognome + ' ' + (s.ruolo || '')).toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];
  const sC  = q ? clients.filter(c => c.nome_progetto.toLowerCase().includes(q.toLowerCase())).slice(0, 5) : [];
  const sCo = q ? clients.flatMap(c => (c.commesse || []).filter(co => co.attiva !== false && co.nome_commessa.toLowerCase().includes(q.toLowerCase())).map(co => ({ ...co, clientName: c.nome_progetto, clientId: c.id }))).slice(0, 5) : [];
  const go = fn => { fn(); onClose(); };
  const SrchBox = ({ ph }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--gray-50)', border: '1px solid ' + color + '33', borderRadius: 8, padding: '7px 11px', marginBottom: 14 }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
      <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder={ph} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, flex: 1, color: 'var(--gray-950)', fontFamily: 'inherit' }} />
      {q && <span onClick={() => setQ('')} style={{ cursor: 'pointer', color: 'var(--gray-400)', fontSize: 13, lineHeight: 1 }}>×</span>}
    </div>
  );
  const Act = ({ icon, label, sub, fn }) => (
    <div onClick={() => go(fn)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={'ti ' + icon} style={{ fontSize: 15, color: color }} aria-hidden="true" />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
  const Row = ({ onClick, children }) => (
    <div onClick={() => go(onClick)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.background = 'var(--brand-50)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
      {children}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gray-200)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}><path d="m9 18 6-6-6-6"/></svg>
    </div>
  );
  const Sep = () => <div style={{ height: '0.5px', background: 'var(--gray-100)', margin: '6px 0' }} />;
  return (
    <div style={{ background: '#fff', border: '1px solid ' + color + '33', borderRadius: 14, padding: '16px 18px', boxShadow: '0 4px 20px rgba(0,18,41,.07)', borderTop: '3px solid ' + color }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{title}</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 16, lineHeight: 1 }} onMouseOver={e => e.currentTarget.style.color = 'var(--gray-500)'} onMouseOut={e => e.currentTarget.style.color = 'var(--gray-400)'}>×</button>
      </div>
      {tipo === 'risorsa' && (
        <div>
          <SrchBox ph="Cerca risorsa..." />
          {sR.length > 0 && <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '.5px solid var(--gray-100)' }}>{sR.map(s => <Row key={s.id} onClick={() => { setEntity('risorsa'); setSelected(s.cognome + ' ' + s.nome); setSearch(s.cognome + ' ' + s.nome); setActiveKpi(null); }}><div style={{ width: 26, height: 26, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#0F6E56', flexShrink: 0 }}>{(s.nome?.[0]||'')+(s.cognome?.[0]||'')}</div><div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>{s.cognome} {s.nome}</div><div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{s.ruolo}</div></div></Row>)}</div>}
          {q && !sR.length && <div style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', marginBottom: 10 }}>Nessun risultato</div>}
          <Act icon="ti-users" label="Gestisci risorse" sub="Aggiungi, modifica, rimuovi" fn={() => onNavigate && onNavigate('manageStaff')} />
          <Act icon="ti-table" label="Skill Matrix" sub="Valutazioni e competenze" fn={() => onNavigate && onNavigate('skills')} />
        </div>
      )}
      {tipo === 'cliente' && (
        <div>
          <SrchBox ph="Cerca cliente..." />
          {sC.length > 0 && <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '.5px solid var(--gray-100)' }}>{sC.map(c => <Row key={c.id} onClick={() => { setEntity('cliente'); setSelected(c.id); setSearch(c.nome_progetto); setActiveKpi(null); }}><i className="ti ti-building" style={{ fontSize: 14, color: '#185FA5', flexShrink: 0 }} aria-hidden="true" /><span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>{c.nome_progetto}</span></Row>)}</div>}
          {q && !sC.length && <div style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', marginBottom: 10 }}>Nessun risultato</div>}
          <Act icon="ti-settings" label="Gestisci clienti" sub="Anagrafica e configurazione" fn={() => onGestisciClienti && onGestisciClienti()} />
        </div>
      )}
      {tipo === 'commessa' && (
        <div>
          <SrchBox ph="Cerca commessa..." />
          {sCo.length > 0 && <div style={{ marginBottom: 10, paddingBottom: 10, borderBottom: '.5px solid var(--gray-100)' }}>{sCo.map(co => <Row key={co.id} onClick={() => { setEntity('commessa'); setSelected(co.id); setSearch(co.clientName + ' › ' + co.nome_commessa); setActiveKpi(null); }}><i className="ti ti-briefcase" style={{ fontSize: 14, color: '#854F0B', flexShrink: 0 }} aria-hidden="true" /><div><div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>{co.nome_commessa}</div><div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{co.clientName}</div></div></Row>)}</div>}
          {q && !sCo.length && <div style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', marginBottom: 10 }}>Nessun risultato</div>}
          <Act icon="ti-plus" label="Nuova commessa" sub="Crea e assegna subito" fn={() => onNuovaCommessaDiretta && onNuovaCommessaDiretta()} />
        </div>
      )}
      {tipo === 'bolle' && (
        <div>
          <Act icon="ti-search" label="Cerca bolle" sub="Per codice o descrizione" fn={() => { setEntity && setEntity('dati'); setActiveKpi(null); }} />
          <Sep />
          <Act icon="ti-file-upload" label="Importa bolle" sub="Da file Excel" fn={() => { setEntity && setEntity('dati'); setActiveKpi(null); }} />
          <Act icon="ti-clock" label="Importa consuntivi" sub="Da file Excel" fn={() => { setEntity && setEntity('dati'); setActiveKpi(null); }} />
          <Act icon="ti-building" label="Importa clienti" sub="Da file Excel" fn={() => { setEntity && setEntity('dati'); setActiveKpi(null); }} />
        </div>
      )}
    </div>
  );
}

// ── SubAccordion — sotto-gruppo attività ──────────────────────────────────────
function SubAccordion({ gruppo, myKey, onOpenCardModal, onOpenTask }) {
  const [open, setOpen] = React.useState(false);
  const { label, color, items } = gruppo;
  const PC = { alta: { bar: '#E24B4A', text: '#A32D2D' }, media: { bar: '#BA7517', text: '#633806' }, bassa: { bar: '#639922', text: '#27500A' } };
  return (
    <div style={{ marginLeft: 13, borderLeft: `3px solid ${open ? color : 'var(--gray-200)'}`, marginBottom: 4, borderRadius: '0 8px 8px 0', transition: 'border-color .2s' }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', cursor: 'pointer', userSelect: 'none', borderRadius: '0 8px 8px 0', transition: 'background .15s', background: open ? color + '08' : 'transparent' }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = color + '06'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = open ? color + '08' : 'transparent'; }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: open ? color : 'var(--gray-600)', transition: 'color .15s' }}>{label}</span>
          {items.length > 0 && (
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: open ? color : color + '20', color: open ? '#fff' : color, fontWeight: 700, transition: 'all .15s' }}>{items.length}</span>
          )}
          {items.length === 0 && (
            <span style={{ fontSize: 10, color: 'var(--gray-400)', fontStyle: 'italic' }}>nessuna</span>
          )}
        </div>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={open ? color : 'var(--gray-300)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && items.length > 0 && (
        <div style={{ paddingBottom: 4 }}>
          {items.map((item, idx) => {
            const pc = PC[item.priorita] || PC.media;
            return (
              <div key={item.id || idx}
                onClick={() => item._isTask ? (onOpenTask && onOpenTask(item)) : (onOpenCardModal && onOpenCardModal(item))}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: '0 8px 8px 0', cursor: 'pointer', transition: 'background .1s', borderBottom: '0.5px solid var(--gray-100)' }}
                onMouseOver={e => { e.currentTarget.style.background = color + '08'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent'; }}>
                <div style={{ width: 3, height: 24, borderRadius: 2, background: pc.bar, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titolo}</div>
                  <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.clientName && <span>{item.clientName}</span>}
                    {item.commessaNome && <span style={{ marginLeft: 4 }}>· {item.commessaNome}</span>}
                    {!item.clientName && !item.commessaNome && '—'}
                  </div>
                </div>
                {item.priorita && <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:pc.text, flexShrink:0 }}><span style={{ width:6, height:6, borderRadius:'50%', background:pc.bar, flexShrink:0, display:'inline-block' }} />{item.priorita}</span>}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--gray-200)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6"/></svg>
              </div>
            );
          })}
        </div>
      )}
      {open && items.length === 0 && (
        <div style={{ padding: '4px 10px 8px', fontSize: 11, color: 'var(--gray-300)', fontStyle: 'italic' }}>Nessuna attività</div>
      )}
    </div>
  );
}

// ── AccordionHome ─────────────────────────────────────────────────────────────
function AccordionHome({ tipo, myKey, clients, onOpenCardModal, onOpenCommessa, onOpenProgetto, onOpenTask, defaultOpen = false }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(defaultOpen); // se defaultOpen carica subito
  const loadedKeyRef = React.useRef(null);
  const cfgMap = { attivita: { label: 'Attività in carico', color: '#185FA5' }, commesse: { label: 'Commesse', color: '#0F6E56' }, progetti: { label: 'Progetti', color: '#854F0B' } };
  const cfg = cfgMap[tipo];
  const PC = { alta: { bar: '#E24B4A', text: '#A32D2D' }, media: { bar: '#BA7517', text: '#633806' }, bassa: { bar: '#639922', text: '#27500A' } };

  const load = React.useCallback(async () => {
    console.log('[AccordionHome] load chiamato', tipo, 'myKey:', myKey, 'ref:', loadedKeyRef.current);
    if (!myKey) { console.log('[AccordionHome] STOP: myKey vuoto'); return; }
    if (loadedKeyRef.current === `${tipo}-${myKey}`) { console.log('[AccordionHome] STOP: già caricato'); return; }
    loadedKeyRef.current = `${tipo}-${myKey}`;
    setLoading(true);
    try {
      if (tipo === 'attivita') {
        const { data: cols } = await supabase.from('workflow_colonne').select('id,nome');
        const ch = new Set((cols || []).filter(c => /complet|annullat|done|chiusa/i.test(c.nome)).map(c => c.id));
        const { data: wfs } = await supabase.from('workflows').select('id,nome,di_sistema');
        const wfMap = {};
        (wfs || []).forEach(w => { wfMap[w.id] = w.nome; });

        // Attività dove sono assegnatario singolo (sviluppo)
        const { data: attSingolo } = await supabase
          .from('attivita')
          .select('id,titolo,priorita,colonna_id,commessa_id,workflow_id,assegnatario,assegnatari,cliente_id')
          .eq('assegnatario', myKey);

        // Attività prevendita dove sono negli assegnatari multipli (jsonb array)
        const { data: attMultiplo, error: errMultiplo } = await supabase
          .from('attivita')
          .select('id,titolo,priorita,colonna_id,commessa_id,workflow_id,assegnatario,assegnatari,cliente_id')
          .contains('assegnatari', [myKey]);
        console.log('[AccordionHome attivita] myKey:', myKey, '| attMultiplo:', attMultiplo, '| err:', errMultiplo);

        // Task di progetto assegnati a me (task_owner)
        const { data: taskProgetto } = await supabase
          .from('progetto_task')
          .select('id,attivita,priorita,stato,progetto_id')
          .eq('task_owner', myKey)
          .not('stato', 'eq', 'Chiusa');

        // Unisci attività workflow deduplicando per id
        const allAtt = Object.values(
          [...(attSingolo || []), ...(attMultiplo || [])]
            .reduce((acc, a) => { acc[a.id] = a; return acc; }, {})
        );

        const ac = (clients || []).flatMap(c => (c.commesse || []).map(co => ({ ...co, clientName: c.nome_progetto, clientId: c.id })));
        const attNorm = allAtt.filter(a => !ch.has(a.colonna_id)).map(a => {
          const cm = ac.find(co => co.id === a.commessa_id);
          return { ...a, clientName: cm ? cm.clientName : null, commessaNome: cm ? cm.nome_commessa : null, clientId: cm ? cm.clientId : null, workflowNome: wfMap[a.workflow_id] || null };
        });

        // Risolvi progetto_id → commessa via query su progetti
        let taskNorm = [];
        if ((taskProgetto || []).length > 0) {
          const pIds = [...new Set(taskProgetto.map(t => t.progetto_id).filter(Boolean))];
          const { data: prData } = await supabase.from('progetti').select('id,commessa_id').in('id', pIds);
          const pMap = {};
          (prData || []).forEach(p => { pMap[p.id] = p.commessa_id; });
          taskNorm = taskProgetto.map(t => {
            const commessaId = pMap[t.progetto_id] || null;
            const cm = ac.find(co => co.id === commessaId);
            return {
              id: 'task-' + t.id,
              titolo: t.attivita,
              priorita: t.priorita,
              colonna_id: null,
              commessa_id: commessaId,
              clientName: cm ? cm.clientName : null,
              commessaNome: cm ? cm.nome_commessa : null,
              workflowNome: 'Task Progetto',
              _isTask: true,
            };
          });
        }

        setItems([...attNorm, ...taskNorm]);
      } else if (tipo === 'commesse') {
        setItems((clients || []).flatMap(c => (c.commesse || []).filter(co => co.attiva !== false && (co.pm_commessa === myKey || (co.team || []).includes(myKey))).map(co => ({ ...co, clientName: c.nome_progetto, clientId: c.id }))));
      } else {
        // Trova commesse attive dove l'utente è PM o nel team (dai dati già caricati in clients)
        const commesseAttive = (clients || []).flatMap(c =>
          (c.commesse || [])
            .filter(co =>
              co.attiva !== false &&
              (co.pm_commessa === myKey || (co.team || []).includes(myKey))
            )
            .map(co => ({ ...co, clientName: c.nome_progetto, clientId: c.id }))
        );

        if (!commesseAttive.length) { setItems([]); setLoading(false); return; }

        // Una sola query: progetti aperti collegati a quelle commesse
        const ids = commesseAttive.map(co => co.id);
        const { data: pr, error: prErr } = await supabase
          .from('progetti')
          .select('id,commessa_id,chiuso')
          .in('commessa_id', ids);
        console.log('[PROGETTI DEBUG] ids:', ids, '| risultato:', pr, '| errore:', prErr);

        const commesseMap = {};
        commesseAttive.forEach(co => { commesseMap[co.id] = co; });

        setItems((pr || [])
          .filter(p => p.chiuso !== true)
          .map(p => {
            const co = commesseMap[p.commessa_id];
            return {
              ...p,
              clientName: co ? co.clientName : null,
              commessaNome: co ? co.nome_commessa : null,
            };
          })
        );
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [tipo, myKey, clients]);
  React.useEffect(() => { if (myKey) { loadedKeyRef.current = null; load(); } }, [myKey, tipo]);
  React.useEffect(() => { if (defaultOpen && myKey) load(); }, []);
  const click = item => {
    if (tipo === 'attivita' && onOpenCardModal) onOpenCardModal(item);
    else if (tipo === 'commesse' && onOpenCommessa) onOpenCommessa(item.clientId, item.id);
    else if (tipo === 'progetti' && onOpenProgetto) onOpenProgetto(item.id, item.commessa_id);
  };
  return (
    <div style={{ borderBottom: '1px solid var(--gray-100)' }}>
      <div onClick={() => { load(); setOpen(v => !v); }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px', cursor: 'pointer', userSelect: 'none', borderRadius: 10, background: open ? cfg.color + '0a' : 'transparent', transition: 'background .2s', marginBottom: open ? 2 : 0 }}
        onMouseOver={e => { if (!open) e.currentTarget.style.background = cfg.color + '07'; }}
        onMouseOut={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 3, height: 18, borderRadius: 2, background: open ? cfg.color : 'var(--gray-300)', transition: 'background .2s', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: open ? cfg.color : 'var(--gray-700)', transition: 'color .2s' }}>{cfg.label}</span>
          {items.length > 0 && <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 20, background: cfg.color, color: '#fff', fontWeight: 700 }}>{items.length}</span>}
          {items.length === 0 && !loading && <span style={{ fontSize: 10, color: 'var(--gray-400)', fontStyle: 'italic' }}>nessuna</span>}
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={open ? cfg.color : 'var(--gray-400)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{ paddingBottom: 8 }}>
          {loading && <div style={{ padding: '8px 0 10px 13px', fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Caricamento...</div>}
          {!loading && tipo !== 'attivita' && !items.length && <div style={{ padding: '8px 0 10px 13px', fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Nessun elemento</div>}

          {/* ── Attività: 3 sotto-gruppi ── */}
          {!loading && tipo === 'attivita' && (() => {
            const gruppi = [
              {
                key: 'prevendita',
                label: 'Prevendita',
                color: '#0F6E56',
                items: items.filter(a => !a._isTask && /prevendita/i.test(a.workflowNome || '')),
              },
              {
                key: 'sviluppo',
                label: 'Richieste sviluppo',
                color: '#185FA5',
                items: items.filter(a => !a._isTask && !/prevendita/i.test(a.workflowNome || '')),
              },
              {
                key: 'task',
                label: 'Task progetto',
                color: '#7c3aed',
                items: items.filter(a => a._isTask),
              },
            ];
            return gruppi.map(g => (
              <SubAccordion key={g.key} gruppo={g} myKey={myKey} onOpenCardModal={onOpenCardModal} onOpenTask={onOpenTask} />
            ));
          })()}

          {!loading && tipo !== 'attivita' && items.map((item, idx) => {
            const pc = PC[item.priorita] || PC.media;
            return (
              <div key={item.id || idx} onClick={() => click(item)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px 8px 13px', borderRadius: 6, cursor: 'pointer', borderLeft: '2px solid transparent', transition: 'all .1s' }} onMouseOver={e => { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.borderLeftColor = cfg.color; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeftColor = 'transparent'; }}>
                <div style={{ width: 3, height: 26, borderRadius: 2, background: cfg.color + '50', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipo === 'commesse' ? item.nome_commessa : (item.commessaNome || '—')}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.clientName}</div>
                </div>
                {tipo === 'commesse' && <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 4, background: item.pm_commessa === myKey ? '#E6F1FB' : 'var(--gray-100)', color: item.pm_commessa === myKey ? '#0C447C' : 'var(--gray-500)', fontWeight: 600, flexShrink: 0 }}>{item.pm_commessa === myKey ? 'PM' : 'team'}</span>}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gray-200)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="m9 18 6-6-6-6"/></svg>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function CollaboratoriButton({ onNavigate, setEntity, setSelected, setSearch, staff = [] }) {
  const [showMenu, setShowMenu] = useState(false);
  const [mode, setMode] = useState('main');
  const [q, setQ] = useState('');
  const [popupStyle, setPopupStyle] = useState({});
  const ref = React.useRef(null);
  const inputRef = React.useRef(null);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setShowMenu(false); setMode('main'); setQ(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (mode === 'search' && inputRef.current) setTimeout(() => inputRef.current?.focus(), 50);
  }, [mode]);

  const openMenu = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const popupW = 240;
    const popupH = 120;
    let left = rect.left + rect.width / 2 - popupW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= popupH + 12 ? rect.bottom + 8 : rect.top - popupH - 8;
    setPopupStyle({ position: 'fixed', top, left, width: popupW, zIndex: 9999 });
    setShowMenu(true); setMode('main'); setQ('');
  };

  useEffect(() => {
    if (showMenu && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const popupW = 240;
      const popupH = mode === 'search' ? 320 : 120;
      let left = rect.left + rect.width / 2 - popupW / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));
      const spaceBelow = window.innerHeight - rect.bottom;
      const top = spaceBelow >= popupH + 12 ? rect.bottom + 8 : rect.top - popupH - 8;
      setPopupStyle({ position: 'fixed', top, left, width: popupW, zIndex: 9999 });
    }
  }, [mode, showMenu]);

  const staffFiltrato = q.trim()
    ? staff.filter(s => `${s.cognome} ${s.nome}`.toLowerCase().includes(q.toLowerCase()) || (s.ruolo || '').toLowerCase().includes(q.toLowerCase()))
    : staff.slice(0, 8);

  const handleSelectStaff = (s) => {
    const key = `${s.cognome} ${s.nome}`;
    setEntity && setEntity('risorsa');
    setSelected && setSelected(key);
    setSearch && setSearch(key);
    setShowMenu(false); setMode('main'); setQ('');
  };

  return (
    <div ref={ref} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div onClick={openMenu}
        style={{ width: 52, height: 52, borderRadius: '50%', background: showMenu ? 'var(--brand-800)' : 'var(--brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .18s', boxShadow: '0 4px 18px rgba(0,0,0,.20)', cursor: 'pointer' }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--brand-800)'}
        onMouseOut={e => { if (!showMenu) e.currentTarget.style.background = 'var(--brand-700)'; }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
          <circle cx="17" cy="9" r="3"/><path d="M21 21v-1.5a3 3 0 0 0-3-3h-1"/>
        </svg>
      </div>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-500)' }}>Collaboratori</span>

      {showMenu && (
        <div style={{ ...popupStyle, background: 'var(--color-surface, #fff)', border: '0.5px solid var(--gray-200)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,18,41,0.18)', overflow: 'hidden' }}>
          {mode === 'main' ? (
            <>
              <div onClick={() => { setShowMenu(false); onNavigate && onNavigate('skills'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer', borderBottom: '0.5px solid var(--gray-100)' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>Skill matrix</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Valutazioni competenze</div>
                </div>
              </div>
              <div onClick={() => setMode('search')}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>Cerca collaboratore</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Profilo e pianificazione</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '0.5px solid var(--gray-100)' }}>
                <button onClick={() => { setMode('main'); setQ(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18, lineHeight: 1, padding: '0 4px', flexShrink: 0 }}>‹</button>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
                <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Nome o ruolo..."
                  style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: 'var(--gray-950)', fontFamily: 'inherit' }} />
                {q && <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>}
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {staffFiltrato.length === 0
                  ? <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Nessun risultato</div>
                  : staffFiltrato.map(s => {
                    const key = `${s.cognome} ${s.nome}`;
                    const ac = getAvatarColor(key);
                    return (
                      <div key={s.id} onClick={() => handleSelectStaff(s)}
                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', cursor: 'pointer' }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{getInitials(key)}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-950)' }}>{key}</div>
                          <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{s.ruolo || '—'}</div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function KPIView({ staff, matrix, clients, assignments, skillsConfig, currentMonths, trainingCells, onOpenProgetto, userOverride, isAdmin, onNuovaCommessa, onNavigate, onGestisciClienti, onNuovaCommessaDiretta, onOpenCard, onOpenCommessa, onOpenTask }) {
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
  const [showDocMenu, setShowDocMenu] = useState(false);
  const [showSchedaDemo, setShowSchedaDemo] = useState(false);
  const [showRaccoltaRequisiti, setShowRaccoltaRequisiti] = useState(false);
  const docMenuRef = useRef(null);

  // Chiudi menu documento cliccando fuori
  useEffect(() => {
    const handler = (e) => { if (docMenuRef.current && !docMenuRef.current.contains(e.target)) setShowDocMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const RUOLI_ORDER_KPI = ['PM', 'Project Manager', 'Consulente', 'Programmatore', 'Analista'];

  useEffect(() => {
    const load = async () => {
      setKpiLoading(true);
      try {
        const { data: allStaffData } = await supabase.from('staff').select('id, ruolo');
        const nRisorse = (allStaffData || []).length;
        const ruoliCount = {};
        (allStaffData || []).forEach(s => { const r = s.ruolo || 'Non definito'; ruoliCount[r] = (ruoliCount[r] || 0) + 1; });
        const { data: allCommesse } = await supabase.from('commesse').select('id, client_id, attiva');
        const nCommesseAttive = (allCommesse || []).filter(co => co.attiva !== false).length;
        const clientiConCommessaAttiva = new Set((allCommesse || []).filter(co => co.attiva !== false).map(co => co.client_id));
        const nClientiAttivi = clientiConCommessaAttiva.size;
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
    <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)' }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{ padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: active === t.key ? 700 : 400, color: active === t.key ? 'var(--brand-700)' : 'var(--gray-500)', borderBottom: active === t.key ? '2.5px solid var(--brand-700)' : '2.5px solid transparent', marginBottom: '-1px', transition: 'all 0.15s' }}>{t.label}</button>
      ))}
    </div>
  );

  // ── Pagina dedicata risorsa ──────────────────────────────────────
  if (entity === 'risorsa' && selected) {
    return (
      <RisorsaDetail
        selected={selected} staff={staff} matrix={matrix} clients={clients}
        assignments={assignments} skillsConfig={skillsConfig} currentMonths={currentMonths}
        trainingCells={trainingCells} isMobile={isMobile}
        scrollToSkill={activeKpi === 'skillmap'}
        onBack={() => { setSelected(''); setSearch(''); }}
      />
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--gray-50)', transition: 'background 0.35s' }}>

      {/* HERO */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid var(--gray-200)' }}>
        <div style={{ padding: isMobile ? '20px 16px' : '28px 32px' }}>
          <div style={{ fontSize: '11px', color: 'var(--gray-400)', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: '8px' }}>ZCS · Delivery Hub</div>
          <div style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 500, color: 'var(--gray-950)', marginBottom: '4px' }}>
            Benvenuto{userOverride?.genere === 'F' ? 'a' : ''}, {userOverride ? userOverride.nome : (staff.find(s => s.is_admin)?.nome || 'Admin')}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--gray-500)' }}>
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {userOverride?.ruolo || 'Operation Manager'}
          </div>
        </div>
        <div style={{ height: '2px', background: 'linear-gradient(90deg, var(--brand-800) 0%, var(--brand-500) 55%, transparent 100%)', transition: 'background 0.35s' }} />
        <div data-tutorial="home-ticker" style={{ overflow: 'hidden', padding: '20px 0', background: '#fff', borderTop: '0.5px solid var(--gray-100)' }}>
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

      {kpi && (
        <div style={{ padding: isMobile ? '16px' : '24px 32px 0', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '28px', alignItems: 'start' }}>

          {/* SINISTRA */}
          <div>
            <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 20 }}>

              {/* LA TUA SCHEDA — navy scuro */}
              <div data-tutorial="home-my-card" onClick={() => {
                setEntity('risorsa');
                setSelected(`${userOverride?.cognome} ${userOverride?.nome}`);
                setSearch(`${userOverride?.cognome} ${userOverride?.nome}`);
                setActiveKpi(null);
              }} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--brand-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .18s', boxShadow: '0 4px 18px rgba(0,0,0,.25)' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--brand-900,var(--brand-900))'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--brand-800)'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-500)' }}>Area personale</span>
              </div>

              {/* COLLABORATORI — solo per coordinatore */}
              {userOverride?.ruolo?.toLowerCase() === 'coordinatore' && (
                <div data-tutorial="home-collaboratori">
                  <CollaboratoriButton onNavigate={onNavigate} setEntity={setEntity} setSelected={setSelected} setSearch={setSearch} staff={staff} />
                </div>
              )}

              {/* NUOVA ATTIVITÀ — blu medio */}
              <div data-tutorial="home-nuova-attivita" onClick={() => onNuovaCommessa && onNuovaCommessa()} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .18s', boxShadow: '0 4px 18px rgba(0,0,0,.18)' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--brand-700)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--brand-600)'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-500)' }}>Nuova attività</span>
              </div>

              {/* NUOVO DOCUMENTO */}
              <div data-tutorial="home-nuovo-documento" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div onClick={() => setShowDocMenu(true)}
                  style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--brand-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background .18s', boxShadow: '0 4px 18px rgba(0,0,0,.15)' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--brand-600)'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--brand-500)'}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
                  </svg>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-500)' }}>Nuovo documento</span>
              </div>
            </div>

            {/* Modale scelta tipo documento */}
            {showDocMenu && (
              <NuovoDocumentoModal
                onClose={() => setShowDocMenu(false)}
                onSchedaDemo={() => { setShowDocMenu(false); setShowSchedaDemo(true); }}
                onRaccoltaRequisiti={() => { setShowDocMenu(false); setShowRaccoltaRequisiti(true); }}
              />
            )}

            {/* Modale Scheda Demo */}
            {showSchedaDemo && <SchedaDemoModal onClose={() => setShowSchedaDemo(false)} staff={staff} />}

            {/* Modale Raccolta Requisiti */}
            {showRaccoltaRequisiti && <RaccoltaRequisitiModal onClose={() => setShowRaccoltaRequisiti(false)} staff={staff} clients={clients} currentUser={userOverride} />}

            {userOverride && (
              <div data-tutorial="home-coinvolto" style={{ background: 'var(--gray-50,#f8fafc)', border: '0.5px solid var(--gray-200)', borderRadius: 12, padding: '8px 4px', marginTop: 4 }}>
                <div style={{ margin: '8px 8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 16, borderRadius: 2, background: 'var(--brand-700)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-700)', letterSpacing: '.07em', textTransform: 'uppercase' }}>Dove sei coinvolto</span>
                </div>
                <AccordionHome tipo="commesse" myKey={userOverride.sKey || `${userOverride.cognome} ${userOverride.nome}`} clients={clients} onOpenCommessa={(cliId, commId) => onOpenCommessa && onOpenCommessa(cliId, commId)} />
                <AccordionHome tipo="attivita" myKey={userOverride.sKey || `${userOverride.cognome} ${userOverride.nome}`} clients={clients} onOpenCardModal={card => onOpenCard && onOpenCard(card)} onOpenTask={onOpenTask} />
              </div>
            )}
          </div>

          {/* DESTRA */}
          <div>
            <div data-tutorial="home-cubes" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: 16 }}>
              {[
                { key: 'risorsa',  color: '#0F6E56', label: 'Risorse',         num: kpi.nRisorse,        rows: RUOLI_ORDER_KPI.filter(r => kpi.ruoliCount[r]).map(r => [r, kpi.ruoliCount[r], '#0F6E56']).concat(Object.entries(kpi.ruoliCount).filter(([r]) => !RUOLI_ORDER_KPI.includes(r)).map(([r, c]) => [r, c, '#0F6E56'])), static: true },
                { key: 'cliente',  color: '#185FA5', label: 'Clienti attivi',  num: kpi.nClientiAttivi,  rows: Object.entries(kpi.prodottiCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, c]) => [p, c, '#185FA5']), static: true },
                { key: 'commessa', color: '#854F0B', label: 'Commesse aperte', num: kpi.nCommesseAttive, rows: [['Sviluppo aperte', kpi.nAttivitaSviluppoAperte, '#854F0B']], static: true },
                { key: 'bolle',    color: '#534AB7', label: 'Bolle',           num: kpi.nBolle,          rows: [['Previsto', Math.round(kpi.totGgPrevisti) + 'gg', '#534AB7'], ['Consuntivato', Math.round(kpi.totGgFatti) + 'gg', '#534AB7'], ['Residuo', Math.round(kpi.residuo) + 'gg', kpi.residuo >= 0 ? '#0F6E56' : '#dc2626'], ...(kpi.efficacia != null ? [['Efficacia', Math.round(kpi.efficacia) + '%', kpi.efficacia >= 75 ? '#0F6E56' : kpi.efficacia >= 60 ? '#854F0B' : '#dc2626']] : [])], static: true },
              ].map(card => (
                <div key={card.key} onClick={() => !card.static && setActiveKpi(activeKpi === card.key ? null : card.key)} style={{ background: 'var(--color-surface, #fff)', border: (!card.static && activeKpi === card.key) ? `1.5px solid ${card.color}` : '0.5px solid var(--gray-200)', borderRadius: 12, padding: '12px 14px', boxShadow: (!card.static && activeKpi === card.key) ? `0 4px 16px rgba(0,0,0,.10)` : 'none', position: 'relative', overflow: 'hidden', cursor: card.static ? 'default' : 'pointer', transition: 'all .18s', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: card.color, borderRadius: '12px 12px 0 0', opacity: (!card.static && activeKpi === card.key) ? 1 : 0.5 }} />
                  <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--gray-900)', lineHeight: 1, marginBottom: 8 }}>{card.num}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, borderTop: '0.5px solid var(--gray-100)', paddingTop: 7 }}>
                    {card.rows.map(([lbl, val, col], ri) => (
                      <div key={ri} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{lbl}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: col }}>{val}</span>
                      </div>
                    ))}
                  </div>
                  {!card.static && (
                    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 5, marginTop: 4 }}>
                      <svg style={{ opacity: activeKpi === card.key ? 0.8 : 0.3, transition: 'opacity .2s' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={activeKpi === card.key ? card.color : 'var(--gray-400)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {activeKpi && (
              <KpiActionsPanel tipo={activeKpi} color={{ risorsa: '#0F6E56', cliente: '#185FA5', commessa: '#854F0B', bolle: '#534AB7' }[activeKpi]}
                onClose={() => setActiveKpi(null)} staff={staff} clients={clients}
                onNavigate={onNavigate} onGestisciClienti={onGestisciClienti} onNuovaCommessaDiretta={onNuovaCommessaDiretta}
                setEntity={setEntity} setSelected={setSelected} setSearch={setSearch} setActiveKpi={setActiveKpi} />
            )}
          </div>

        </div>
      )}

      <div style={{ padding: isMobile ? '16px 16px 24px' : '32px 32px 24px' }}>

        {/* Scheda Dati */}
        {entity === 'dati' && isAdmin && <DatiView clients={clients} staff={staff} />}

        {/* Dettaglio Risorsa */}
        {entity === 'risorsa' && selected && (
          <RisorsaDetail selected={selected} staff={staff} matrix={matrix} clients={clients}
            assignments={assignments} skillsConfig={skillsConfig} currentMonths={currentMonths}
            trainingCells={trainingCells} isMobile={isMobile}
            scrollToSkill={activeKpi === 'skillmap'} />
        )}

        {/* Dettaglio Cliente */}
        {entity === 'cliente' && selected && (() => {
          const c = clients.find(cl => cl.id === selected);
          if (!c) return null;
          const activeCommesse = showOnlyActiveKpi ? c.commesse.filter(co => co.attiva !== false) : c.commesse;
          const allTeam = [...new Set(activeCommesse.flatMap(co => co.team))];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200)', padding: isMobile ? '16px' : '24px 28px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #bfdbfe', flexShrink: 0 }}>
                  <svg width="30" height="30" viewBox="0 0 38 38" fill="none"><rect x="5" y="14" width="28" height="20" rx="2" stroke="var(--brand-700)" strokeWidth="2"/><path d="M13 14V9a2 2 0 012-2h8a2 2 0 012 2v5" stroke="var(--brand-700)" strokeWidth="2"/><rect x="10" y="20" width="5" height="5" rx="1" stroke="var(--brand-700)" strokeWidth="1.5"/><rect x="23" y="20" width="5" height="5" rx="1" stroke="var(--brand-700)" strokeWidth="1.5"/><rect x="16" y="22" width="6" height="12" rx="1" stroke="var(--brand-700)" strokeWidth="1.5"/><path d="M5 34h28" stroke="var(--brand-700)" strokeWidth="2" strokeLinecap="round"/></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: 'var(--gray-950)' }}>{c.nome_progetto}</div>
                  {c.pm_name ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 6 }}>
                      <Avatar name={c.pm_name} avatarUrl={getAvatarUrl(c.pm_name, staff)} size={22} />
                      <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>PM: <strong style={{ color: 'var(--gray-950)' }}>{c.pm_name}</strong></span>
                    </div>
                  ) : <div style={{ fontSize: '12px', color: 'var(--gray-400)', marginTop: 4, fontStyle: 'italic' }}>Nessun PM assegnato</div>}
                </div>
                <div style={{ display: 'flex', gap: '32px', alignSelf: isMobile ? 'flex-start' : 'center' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--brand-700)' }}>{activeCommesse.length}</div><div style={{ fontSize: '11px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commesse</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--brand-700)' }}>{allTeam.length}</div><div style={{ fontSize: '11px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risorse</div></div>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200)', padding: isMobile ? '16px' : '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Team assegnato</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {allTeam.map(s => { const ac = getAvatarColor(s); return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '10px', padding: '8px 14px' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{getInitials(s)}</div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--gray-950)' }}>{s}</span>
                    </div>
                  ); })}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <TabBar tabs={[{ key: 'pianificazione', label: 'Pianificazione mensile' }, { key: 'bolle', label: 'Bolle & Consuntivi' }]} active={clienteTab} onChange={setClienteTab} />
                <div style={{ padding: isMobile ? '16px' : '24px 28px', overflowX: clienteTab === 'pianificazione' ? 'auto' : 'hidden' }}>
                  {clienteTab === 'pianificazione' && (
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', minWidth: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', minWidth: 150, position: 'sticky', left: 0 }}>Commessa / Risorsa</th>
                        {currentMonths.map(m => <th key={m.label} style={{ textAlign: 'center', padding: '8px 10px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', minWidth: 60, fontSize: '11px', fontWeight: 600, color: 'var(--brand-700)', textTransform: 'uppercase' }}>{m.label}</th>)}
                      </tr></thead>
                      <tbody>
                        {activeCommesse.map(co => (
                          <React.Fragment key={co.id}>
                            <tr style={{ background: 'var(--gray-50)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--gray-950)', borderBottom: '1px solid var(--gray-100)', position: 'sticky', left: 0, background: 'var(--gray-50)' }}>{co.nome_commessa}</td>
                              {currentMonths.map(m => <td key={m.label} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--gray-100)', fontWeight: 600, color: 'var(--gray-500)' }}>{co.team.reduce((s, mem) => s + (parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0), 0) || ''}</td>)}
                            </tr>
                            {co.team.map(mem => (
                              <tr key={mem}>
                                <td style={{ padding: '6px 12px 6px 28px', color: 'var(--gray-500)', borderBottom: '1px solid var(--gray-100)', position: 'sticky', left: 0, background: '#fff' }}>{mem}</td>
                                {currentMonths.map(m => { const v = parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0; return <td key={m.label} style={{ textAlign: 'center', padding: '6px 8px', borderBottom: '1px solid var(--gray-100)' }}>{v > 0 && <span style={{ display: 'inline-block', background: 'var(--brand-50)', color: 'var(--brand-700)', borderRadius: '6px', padding: '2px 8px', fontWeight: 600, fontSize: '11px' }}>{v}</span>}</td>; })}
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
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200)', padding: isMobile ? '16px' : '24px 28px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 56, height: 56, borderRadius: '14px', background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', border: '1.5px solid #bfdbfe', flexShrink: 0 }}>📋</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{co.clientName}</div>
                  <div style={{ fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: 'var(--gray-950)' }}>{co.nome_commessa}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: 6 }}>
                    {co.pm_commessa && <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>PM: <strong>{co.pm_commessa}</strong></span>}
                    {co.data_inizio && <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Dal: <strong>{co.data_inizio}</strong></span>}
                    {co.data_fine && <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>Al: <strong>{co.data_fine}</strong></span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', alignItems: isMobile ? 'center' : 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--brand-700)' }}>{co.team?.length || 0}</div><div style={{ fontSize: '11px', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risorse</div></div>
                  {progettoInfo && (progettoInfo.exists ? (
                    <button onClick={() => onOpenProgetto && onOpenProgetto(progettoInfo.id, co.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #bfdbfe', background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>→ Apri progetto</button>
                  ) : (
                    <button onClick={async () => {
                      const { data, error } = await supabase.from('progetti').insert({ commessa_id: co.id }).select().single();
                      if (!error && data) { await creaTaskStandard(data.id); setProgettoInfo({ id: data.id, exists: true }); }
                    }} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #C0DD97', background: '#f0fdf4', color: '#27500a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>✦ Genera progetto</button>
                  ))}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200)', padding: isMobile ? '16px' : '24px 28px', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Team assegnato</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {(co.team || []).map(s => { const ac = getAvatarColor(s); return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: '10px', padding: '8px 14px' }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>{getInitials(s)}</div>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--gray-950)' }}>{s}</span>
                    </div>
                  ); })}
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid var(--gray-200)', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <TabBar tabs={[{ key: 'pianificazione', label: 'Pianificazione mensile' }, { key: 'bolle', label: 'Bolle & Consuntivi' }]} active={commessaTab} onChange={setCommessaTab} />
                <div style={{ padding: isMobile ? '16px' : '24px 28px', overflowX: commessaTab === 'pianificazione' ? 'auto' : 'hidden' }}>
                  {commessaTab === 'pianificazione' && (
                    <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '12px', minWidth: '100%' }}>
                      <thead><tr>
                        <th style={{ textAlign: 'left', padding: '8px 12px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', minWidth: 140, position: 'sticky', left: 0 }}>Risorsa</th>
                        {currentMonths.map(m => <th key={m.label} style={{ textAlign: 'center', padding: '8px 10px', background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', minWidth: 60, fontSize: '11px', fontWeight: 600, color: 'var(--brand-700)', textTransform: 'uppercase' }}>{m.label}</th>)}
                      </tr></thead>
                      <tbody>
                        <tr style={{ background: 'var(--brand-50)' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--brand-700)', borderBottom: '1px solid var(--gray-200)', position: 'sticky', left: 0, background: 'var(--brand-50)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Totale</td>
                          {currentMonths.map(m => { const tot = (co.team || []).reduce((s, mem) => s + (parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0), 0); return <td key={m.label} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--gray-200)', fontWeight: 700, color: 'var(--brand-700)' }}>{tot > 0 ? tot : ''}</td>; })}
                        </tr>
                        {(co.team || []).map(mem => (
                          <tr key={mem}>
                            <td style={{ padding: '8px 12px', color: 'var(--gray-700)', borderBottom: '1px solid var(--gray-100)', position: 'sticky', left: 0, background: '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Avatar name={mem} avatarUrl={getAvatarUrl(mem, staff)} size={22} />{mem}</div>
                            </td>
                            {currentMonths.map(m => { const v = parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0; return <td key={m.label} style={{ textAlign: 'center', padding: '6px 8px', borderBottom: '1px solid var(--gray-100)' }}>{v > 0 && <span style={{ display: 'inline-block', background: 'var(--brand-50)', color: 'var(--brand-700)', borderRadius: '6px', padding: '2px 8px', fontWeight: 600, fontSize: '11px' }}>{v}</span>}</td>; })}
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

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// RISORSA DETAIL
// ─────────────────────────────────────────────
export function RisorsaDetail({ selected, staff, matrix, clients, assignments, skillsConfig, currentMonths, trainingCells, isMobile, scrollToSkill, onBack }) {
  const [activeTab, setActiveTab] = React.useState('skill');
  const [activeFolder, setActiveFolder] = React.useState('');
  const [skillSearch, setSkillSearch] = React.useState('');
  const [storData, setStorData] = React.useState([]);
  const [forData, setForData] = React.useState([]);
  const [loadingStor, setLoadingStor] = React.useState(false);
  const [expandedClients, setExpandedClients] = React.useState({});
  const [pianoVista, setPianoVista] = React.useState('mensile');
  const [weeklyExpandClients, setWeeklyExpandClients] = React.useState(true);
  const [weeklyExpandCommesse, setWeeklyExpandCommesse] = React.useState(true);

  const FOLDERS = Object.keys(skillsConfig || {});
  const staffObj = staff.find(s => staffKey(s) === selected);

  // Clienti e commesse attive per questa risorsa
  const staffClients = clients.filter(c =>
    c.commesse.some(co => (co.team || []).includes(selected) && co.attiva !== false)
  ).map(c => ({
    ...c,
    commesseRisorsa: c.commesse.filter(co => (co.team || []).includes(selected) && co.attiva !== false),
  }));
  const totalCommesse = staffClients.reduce((s, c) => s + c.commesseRisorsa.length, 0);

  React.useEffect(() => {
    if (FOLDERS.length > 0 && !activeFolder) setActiveFolder(FOLDERS[0]);
  }, [skillsConfig]);

  React.useEffect(() => {
    if (!selected) return;
    setLoadingStor(true);
    Promise.all([
      supabase.from('skill_data').select('*').eq('staff_key', selected).order('data_valutazione', { ascending: false }),
      supabase.from('skill_formazione').select('*').eq('staff_key', selected),
    ]).then(([{ data: sd }, { data: fd }]) => {
      setStorData(sd || []);
      setForData(fd || []);
      setLoadingStor(false);
    });
  }, [selected]);

  // Espandi tutti i clienti di default
  React.useEffect(() => {
    const exp = {};
    staffClients.forEach(c => { exp[c.id] = true; });
    setExpandedClients(exp);
  }, [selected]);

  const storBySkill = React.useMemo(() => {
    const map = {};
    storData.forEach(r => {
      if (!map[r.skill_key]) map[r.skill_key] = [];
      map[r.skill_key].push(r);
    });
    return map;
  }, [storData]);

  const livLabel = v => v === 4 ? 'Referente' : v === 3 ? 'Esperto' : v === 2 ? 'Operativo' : v === 1 ? 'Base' : '—';
  const livColor = v => v === 4 ? { bg: '#EAF3DE', text: '#27500A', border: '#C0DD97' }
    : v === 3 ? { bg: '#E1F5EE', text: '#085041', border: '#9FE1CB' }
    : v === 2 ? { bg: '#E6F1FB', text: '#0C447C', border: '#B5D4F4' }
    : v === 1 ? { bg: '#FAEEDA', text: '#633806', border: '#FAC775' }
    : { bg: 'var(--gray-50)', text: 'var(--gray-400)', border: 'var(--gray-200)' };
  const fmtDate = d => { if (!d) return ''; const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y.slice(2)}`; };
  const skills = (skillsConfig[activeFolder] || []).filter(sk => !skillSearch || sk.toLowerCase().includes(skillSearch.toLowerCase()));
  const nReferente = FOLDERS.flatMap(f => (skillsConfig[f] || []).filter(sk => (matrix?.[`${selected}-${sk}`] || 0) === 4)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: 'var(--gray-50)', height: '100%' }}>

      {/* ── TOOLBAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 24px', background: 'var(--color-surface, #fff)', borderBottom: '0.5px solid var(--gray-200)', flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 500, color: 'var(--gray-500)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--gray-950)'}
          onMouseOut={e => e.currentTarget.style.color = 'var(--gray-500)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Home
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* ── BANNER NAVY ── */}
        <div style={{ background: 'var(--brand-800, #001d47)', padding: isMobile ? '18px 16px' : '22px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Avatar name={selected} avatarUrl={getAvatarUrl(selected, staff)} size={isMobile ? 44 : 52} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 500, color: '#fff', lineHeight: 1.2 }}>{selected}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginTop: 3 }}>{staffObj?.ruolo || '—'}</div>
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 20 : 32, flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 500, color: '#fff' }}>{staffClients.length}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>clienti</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 500, color: '#fff' }}>{totalCommesse}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>commesse</div>
              </div>
              {nReferente > 0 && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 500, color: '#C0DD97' }}>{nReferente}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>referente</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── TAB BAR ── */}
        <div style={{ display: 'flex', background: 'var(--color-surface, #fff)', borderBottom: '0.5px solid var(--gray-200)', padding: '0 24px', flexShrink: 0 }}>
          {[{ key: 'skill', label: 'Skill map' }, { key: 'pianificazione', label: 'Pianificazione' }, { key: 'attivita', label: 'Attività' }, { key: 'statistiche', label: 'Statistiche' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding: '11px 18px', border: 'none', borderBottom: activeTab === t.key ? '2.5px solid var(--brand-800)' : '2.5px solid transparent', background: 'transparent', color: activeTab === t.key ? 'var(--brand-800)' : 'var(--gray-500)', fontWeight: activeTab === t.key ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB SKILL MAP ── */}
        {activeTab === 'skill' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>

            {/* SX: Skill map */}
            <div style={{ padding: '20px 24px', background: 'var(--color-surface, #fff)', borderRight: isMobile ? 'none' : '0.5px solid var(--gray-200)', borderBottom: isMobile ? '0.5px solid var(--gray-200)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', flex: 1 }}>Skill map</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--gray-50)', border: '0.5px solid var(--gray-200)', borderRadius: 7, padding: '4px 8px' }}>
                  <svg width="11" height="11" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="var(--gray-400)" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="var(--gray-400)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  <input value={skillSearch} onChange={e => setSkillSearch(e.target.value)} placeholder="Cerca..." style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 11, width: 80, color: 'var(--gray-950)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
                {FOLDERS.map(f => (
                  <button key={f} onClick={() => setActiveFolder(f)}
                    style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, border: '0.5px solid', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                      background: activeFolder === f ? 'var(--brand-800)' : 'transparent',
                      color: activeFolder === f ? '#fff' : 'var(--gray-500)',
                      borderColor: activeFolder === f ? 'var(--brand-800)' : 'var(--gray-200)',
                    }}>
                    {f}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {skills.length === 0 && <div style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Nessuna skill trovata</div>}
                {skills.map(skill => {
                  const val = matrix?.[`${selected}-${skill}`] || 0;
                  const isTrain = trainingCells?.[`${selected}-${skill}`];
                  const c = livColor(val);
                  return (
                    <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, border: `0.5px solid ${c.border}`, background: c.bg }}>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: i <= val ? c.text : 'rgba(0,0,0,.1)' }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 12, color: c.text, flex: 1, lineHeight: 1.3 }}>
                        {isTrain && <span style={{ marginRight: 4, fontSize: 10 }}>📚</span>}
                        {skill}
                      </span>
                      {val > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: c.text, background: 'rgba(255,255,255,.6)', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{livLabel(val)}</span>}
                    </div>
                  );
                })}
              </div>
              {/* Donut completezza */}
              {(() => {
                const folderSkills = skillsConfig[activeFolder] || [];
                if (folderSkills.length === 0) return null;
                const maxScore = folderSkills.length * 4;
                const actualScore = folderSkills.reduce((s, sk) => s + (matrix?.[`${selected}-${sk}`] || 0), 0);
                const pct = maxScore > 0 ? Math.round((actualScore / maxScore) * 100) : 0;
                const R = 38, cx = 50, cy = 50, stroke = 10;
                const circ = 2 * Math.PI * R;
                const dash = (pct / 100) * circ;
                const color = pct >= 75 ? '#639922' : pct >= 50 ? '#BA7517' : pct >= 25 ? '#185FA5' : '#94a3b8';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 16, padding: '12px 14px', background: 'var(--gray-50)', border: '0.5px solid var(--gray-200)', borderRadius: 10 }}>
                    <svg width="80" height="80" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--gray-100)" strokeWidth={stroke} />
                      <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth={stroke}
                        strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
                      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="18" fontWeight="600" fill={color} fontFamily="inherit">{pct}%</text>
                    </svg>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-950)', marginBottom: 3 }}>Completezza {activeFolder}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{actualScore} / {maxScore} punti</div>
                      <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>{folderSkills.length} skill · max 4 pt ciascuna</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* DX: Formazione + Storico */}
            <div style={{ padding: '20px 24px', background: 'var(--color-surface, #fff)' }}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>In formazione</div>
                {forData.length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Nessuna formazione in corso</div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {forData.map(r => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: '#FAEEDA', border: '0.5px solid #FAC775' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#633806" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                          <span style={{ fontSize: 12, color: '#633806', flex: 1 }}>{r.skill_key}</span>
                          <span style={{ fontSize: 10, color: '#854F0B', flexShrink: 0 }}>dal {fmtDate(r.data_inizio)}</span>
                        </div>
                      ))}
                    </div>
                }
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>Storico valutazioni</div>
                {loadingStor ? <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Caricamento...</div>
                  : storData.length === 0
                  ? <div style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Nessuna valutazione registrata</div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {storData.slice(0, 12).map((r, i) => {
                        const prev = storData.find((x, j) => j > i && x.skill_key === r.skill_key);
                        const delta = prev ? r.voto - prev.voto : null;
                        const c = livColor(r.voto);
                        return (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, background: 'var(--gray-50)', border: '0.5px solid var(--gray-200)' }}>
                            <span style={{ fontSize: 10, color: 'var(--gray-400)', flexShrink: 0, minWidth: 40 }}>{fmtDate(r.data_valutazione)}</span>
                            <span style={{ fontSize: 12, color: 'var(--gray-950)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.skill_key}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color: c.text, background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>
                              {livLabel(r.voto)}{delta !== null && delta !== 0 ? (delta > 0 ? ' ↑' : ' ↓') : ''}
                            </span>
                          </div>
                        );
                      })}
                      {storData.length > 12 && <div style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center', marginTop: 4 }}>+{storData.length - 12} altre</div>}
                    </div>
                }
              </div>
            </div>
          </div>
        )}

        {/* ── TAB PIANIFICAZIONE ── */}
        {activeTab === 'pianificazione' && (() => {
          // buildWeeks non serve più — usiamo WeeklyView
          if (staffClients.length === 0 && pianoVista === 'mensile') return (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-400)', background: 'var(--color-surface,#fff)' }}>
              <div style={{ fontSize: 24, marginBottom: 10 }}>📋</div>
              <div style={{ fontSize: 13 }}>Nessuna commessa attiva assegnata</div>
            </div>
          );

          return (
            <div style={{ background: 'var(--color-surface,#fff)', display: 'flex', flexDirection: 'column' }}>
              {/* Toggle mensile/settimanale */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderBottom: '0.5px solid var(--gray-200)', flexShrink: 0 }}>
                <div style={{ display: 'flex', background: 'var(--gray-100)', borderRadius: 20, padding: 2 }}>
                  {[{ key: 'mensile', label: 'Mensile' }, { key: 'settimanale', label: 'Settimanale' }].map(v => (
                    <button key={v.key} onClick={() => setPianoVista(v.key)}
                      style={{ padding: '4px 14px', borderRadius: 20, border: 'none', fontSize: 12, fontWeight: pianoVista === v.key ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', background: pianoVista === v.key ? 'var(--color-surface,#fff)' : 'transparent', color: pianoVista === v.key ? 'var(--gray-950)' : 'var(--gray-500)', boxShadow: pianoVista === v.key ? '0 1px 3px rgba(0,0,0,.08)' : 'none', transition: 'all .15s' }}>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vista settimanale — WeeklyView filtrata sulla risorsa */}
              {pianoVista === 'settimanale' && (
                <WeeklyView
                  staff={staff}
                  clients={clients}
                  assignments={assignments}
                  setAssignments={() => {}}
                  filterStaff={selected}
                  showOnlyActive={true}
                  expandClients={weeklyExpandClients}
                  expandCommesse={weeklyExpandCommesse}
                />
              )}

              {/* Vista mensile */}
              {pianoVista === 'mensile' && (
                <div style={{ overflowX: 'auto', padding: '0 0 20px' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 500 }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-50)' }}>
                        <th style={{ textAlign: 'left', padding: '9px 24px', borderBottom: '1px solid var(--gray-200)', fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.06em', position: 'sticky', left: 0, background: 'var(--gray-50)', minWidth: 200, zIndex: 2 }}>
                          Cliente / Commessa
                        </th>
                        {currentMonths.map(m => (
                          <th key={m.label} style={{ textAlign: 'center', padding: '9px 10px', borderBottom: '1px solid var(--gray-200)', fontSize: 11, fontWeight: 600, color: 'var(--brand-700)', textTransform: 'uppercase', minWidth: 52, whiteSpace: 'nowrap' }}>
                            {m.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staffClients.map((c) => (
                        <React.Fragment key={c.id}>
                          <tr onClick={() => setExpandedClients(p => ({ ...p, [c.id]: !p[c.id] }))}
                            style={{ cursor: 'pointer', background: 'var(--gray-50)' }}
                            onMouseOver={e => e.currentTarget.style.background = '#f0f7ff'}
                            onMouseOut={e => e.currentTarget.style.background = 'var(--gray-50)'}>
                            <td style={{ padding: '9px 24px', fontWeight: 700, color: 'var(--brand-700)', borderBottom: '0.5px solid var(--gray-200)', position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                              <span style={{ marginRight: 7, fontSize: 10, color: 'var(--gray-400)' }}>{expandedClients[c.id] ? '▼' : '▶'}</span>
                              {c.nome_progetto}
                              <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--gray-400)', fontWeight: 400 }}>{c.commesseRisorsa.length} commess{c.commesseRisorsa.length === 1 ? 'a' : 'e'}</span>
                            </td>
                            {currentMonths.map(m => {
                              const tot = c.commesseRisorsa.reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${selected}-${m.label}`]) || 0), 0);
                              return (
                                <td key={m.label} style={{ textAlign: 'center', padding: '9px 8px', borderBottom: '0.5px solid var(--gray-200)', fontWeight: 700, color: 'var(--gray-700)' }}>
                                  {tot > 0 ? tot : ''}
                                </td>
                              );
                            })}
                          </tr>
                          {expandedClients[c.id] && c.commesseRisorsa.map((co, coi) => (
                            <tr key={co.id} style={{ background: coi % 2 === 0 ? '#fff' : 'var(--gray-50)' }}>
                              <td style={{ padding: '7px 24px 7px 40px', color: 'var(--gray-700)', borderBottom: '0.5px solid var(--gray-100)', position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: co.attiva !== false ? '#22c55e' : '#94a3b8', flexShrink: 0 }} />
                                  {co.nome_commessa}
                                </span>
                              </td>
                              {currentMonths.map(m => {
                                const v = parseFloat(assignments[`${co.id}-${selected}-${m.label}`]) || 0;
                                return (
                                  <td key={m.label} style={{ textAlign: 'center', padding: '7px 8px', borderBottom: '0.5px solid var(--gray-100)' }}>
                                    {v > 0 && <span style={{ display: 'inline-block', background: 'var(--brand-50,#eff6ff)', color: 'var(--brand-700)', borderRadius: 5, padding: '2px 7px', fontWeight: 600, fontSize: 11 }}>{v}</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}

                      {/* Totale assegnato */}
                      <tr style={{ background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)' }}>
                        <td style={{ padding: '9px 24px', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', position: 'sticky', left: 0, background: 'var(--gray-50)', zIndex: 1 }}>
                          Totale assegnato
                        </td>
                        {currentMonths.map(m => {
                          const tot = staffClients.flatMap(c => c.commesseRisorsa)
                            .reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${selected}-${m.label}`]) || 0), 0);
                          return (
                            <td key={m.label} style={{ textAlign: 'center', padding: '9px 8px', fontWeight: 700, color: 'var(--gray-700)' }}>
                              {tot > 0 ? tot : '—'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Giorni disponibili residui */}
                      <tr style={{ background: '#fff' }}>
                        <td style={{ padding: '9px 24px', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', position: 'sticky', left: 0, background: '#fff', zIndex: 1 }}>
                          Giorni disponibili
                        </td>
                        {currentMonths.map(m => {
                          const assegnati = staffClients.flatMap(c => c.commesseRisorsa)
                            .reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${selected}-${m.label}`]) || 0), 0);
                          const totGg = workingDays(m.label);
                          const residuo = totGg - assegnati;
                          const color = residuo > 3 ? '#16a34a' : residuo > 0 ? '#BA7517' : residuo === 0 ? '#64748b' : '#dc2626';
                          const bg = residuo > 3 ? '#f0fdf4' : residuo > 0 ? '#fffbeb' : residuo === 0 ? 'var(--gray-50)' : '#fef2f2';
                          return (
                            <td key={m.label} style={{ textAlign: 'center', padding: '9px 8px' }}>
                              <span style={{ display: 'inline-block', background: bg, color, borderRadius: 5, padding: '2px 7px', fontWeight: 700, fontSize: 11 }}>
                                {residuo}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── TAB ATTIVITÀ ── */}
        {activeTab === 'attivita' && (
          <RisorsaAttivita selected={selected} clients={clients} />
        )}

        {activeTab === 'statistiche' && (
          <RisorsaStatistiche selected={selected} staff={staff} matrix={matrix} skillsConfig={skillsConfig} assignments={assignments} currentMonths={currentMonths} clients={clients} />
        )}

      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// RISORSA — TAB ATTIVITÀ
// ─────────────────────────────────────────────────────────────────────────────
function RisorsaAttivita({ selected, clients }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!selected) return;
    setLoading(true);
    const load = async () => {
      // Workflow assegnatario singolo
      const { data: attSingolo } = await supabase.from('attivita')
        .select('id,titolo,priorita,colonna_id,commessa_id,workflow_id,assegnatario,assegnatari,cliente_id,scadenza')
        .eq('assegnatario', selected);
      // Workflow assegnatari multipli
      const { data: attMultiplo } = await supabase.from('attivita')
        .select('id,titolo,priorita,colonna_id,commessa_id,workflow_id,assegnatario,assegnatari,cliente_id,scadenza')
        .contains('assegnatari', [selected]);
      // Task di progetto
      const { data: taskProgetto } = await supabase.from('progetto_task')
        .select('id,attivita,priorita,stato,progetto_id,in_carico_a')
        .eq('task_owner', selected)
        .not('stato', 'eq', 'Chiusa');
      // Workflow names
      const { data: wfs } = await supabase.from('workflows').select('id,nome');
      const wfMap = {};
      (wfs || []).forEach(w => { wfMap[w.id] = w.nome; });
      // Colonne chiuse
      const { data: cols } = await supabase.from('workflow_colonne').select('id,nome');
      const closedCols = new Set((cols || []).filter(c => /chius|complet|done/i.test(c.nome)).map(c => c.id));
      const ac = (clients || []).flatMap(c => (c.commesse || []).map(co => ({ ...co, clientName: c.nome_progetto })));
      // Deduplica workflow
      const allAtt = Object.values([...(attSingolo || []), ...(attMultiplo || [])].reduce((a, x) => { a[x.id] = x; return a; }, {}))
        .filter(a => !closedCols.has(a.colonna_id))
        .map(a => {
          const cm = ac.find(co => co.id === a.commessa_id);
          return { ...a, clientName: cm?.clientName || null, commessaNome: cm?.nome_commessa || null, workflowNome: wfMap[a.workflow_id] || null, _type: /prevendita/i.test(wfMap[a.workflow_id] || '') ? 'prevendita' : 'sviluppo' };
        });
      // Task progetto
      let taskNorm = [];
      if ((taskProgetto || []).length) {
        const pIds = [...new Set(taskProgetto.map(t => t.progetto_id).filter(Boolean))];
        const { data: prData } = await supabase.from('progetti').select('id,commessa_id').in('id', pIds);
        const pMap = {}; (prData || []).forEach(p => { pMap[p.id] = p.commessa_id; });
        taskNorm = taskProgetto.map(t => {
          const cm = ac.find(co => co.id === pMap[t.progetto_id]);
          return { id: 'task-' + t.id, titolo: t.attivita, priorita: t.priorita, stato: t.stato, clientName: cm?.clientName || null, commessaNome: cm?.nome_commessa || null, _type: 'task' };
        });
      }
      setItems([...allAtt, ...taskNorm]);
      setLoading(false);
    };
    load();
  }, [selected]);

  const gruppi = [
    { key: 'prevendita', label: 'Prevendita', color: '#0F6E56', bg: '#EAF3DE', border: '#C0DD97', icon: '🤝', items: items.filter(i => i._type === 'prevendita') },
    { key: 'sviluppo',   label: 'Richieste sviluppo', color: '#185FA5', bg: '#E6F1FB', border: '#B5D4F4', icon: '⚙️', items: items.filter(i => i._type === 'sviluppo') },
    { key: 'task',       label: 'Task progetto', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: '✅', items: items.filter(i => i._type === 'task') },
  ];

  const PRIO = { alta: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', label: 'Alta' }, media: { bg: '#fffbeb', text: '#d97706', border: '#fde68a', label: 'Media' }, bassa: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0', label: 'Bassa' } };
  const fmtDate = d => { if (!d) return null; try { const dt = new Date(d); return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}`; } catch { return null; } };

  if (loading) return <div style={{ padding: '40px 24px', color: 'var(--gray-400)', fontSize: 13 }}>Caricamento attività...</div>;

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--color-surface,#fff)' }}>
      {gruppi.map(g => (
        <div key={g.key}>
          {/* Header gruppo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 3, height: 16, borderRadius: 2, background: g.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: g.color, textTransform: 'uppercase', letterSpacing: '.06em' }}>{g.label}</span>
            <span style={{ fontSize: 11, fontWeight: 600, background: g.bg, color: g.color, border: `0.5px solid ${g.border}`, borderRadius: 20, padding: '1px 8px' }}>{g.items.length}</span>
          </div>
          {/* Lista items */}
          {g.items.length === 0 ? (
            <div style={{ padding: '10px 14px', fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', background: 'var(--gray-50)', borderRadius: 8, border: '0.5px solid var(--gray-200)' }}>Nessuna attività</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {g.items.map(item => {
                const p = PRIO[(item.priorita || '').toLowerCase()] || PRIO.bassa;
                const scad = fmtDate(item.scadenza);
                const isOverdue = item.scadenza && new Date(item.scadenza) < new Date();
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, background: '#fff', border: `0.5px solid var(--gray-200)`, boxShadow: '0 1px 2px rgba(0,0,0,.04)' }}>
                    {/* Barra priorità */}
                    <div style={{ width: 3, height: 28, borderRadius: 2, background: p.bg === '#f0fdf4' ? '#16a34a' : p.bg === '#fffbeb' ? '#d97706' : '#dc2626', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-950)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titolo || '—'}</div>
                      {(item.clientName || item.commessaNome) && (
                        <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>
                          {[item.clientName, item.commessaNome].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                    {/* Priorità badge */}
                    <span style={{ fontSize: 10, fontWeight: 600, color: p.text, background: p.bg, border: `0.5px solid ${p.border}`, borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>{p.label}</span>
                    {/* Scadenza */}
                    {scad && (
                      <span style={{ fontSize: 10, color: isOverdue ? '#dc2626' : 'var(--gray-400)', fontWeight: isOverdue ? 600 : 400, flexShrink: 0 }}>
                        {isOverdue ? '⚠ ' : ''}{scad}
                      </span>
                    )}
                    {/* Stato task */}
                    {item.stato && (
                      <span style={{ fontSize: 10, color: 'var(--gray-500)', background: 'var(--gray-50)', border: '0.5px solid var(--gray-200)', borderRadius: 4, padding: '1px 6px', flexShrink: 0 }}>{item.stato}</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RISORSA — TAB STATISTICHE
// ─────────────────────────────────────────────────────────────────────────────
function RisorsaStatistiche({ selected, matrix, skillsConfig, assignments, currentMonths, clients }) {
  const [consData, setConsData] = React.useState([]);
  const [loadingCons, setLoadingCons] = React.useState(true);

  React.useEffect(() => {
    if (!selected) return;
    supabase.from('consuntivi')
      .select('data_attivita, ore_tecniche, ore_pagamento')
      .eq('utente', selected)
      .then(({ data }) => { setConsData(data || []); setLoadingCons(false); });
  }, [selected]);

  const FOLDERS = Object.keys(skillsConfig || {});

  // ── 1. Dati per istogramma pianificazione mensile ──
  const staffClients = (clients || []).filter(c => c.commesse.some(co => (co.team || []).includes(selected)));
  const pianoMesi = currentMonths.map(m => {
    const assegnati = staffClients.flatMap(c => c.commesse.filter(co => (co.team || []).includes(selected)))
      .reduce((s, co) => s + (parseFloat(assignments[`${co.id}-${selected}-${m.label}`]) || 0), 0);
    const disponibili = workingDays(m.label);
    return { label: m.label, assegnati, disponibili, residuo: disponibili - assegnati };
  });

  // ── 2. Dati efficacia per mese dai consuntivi ──
  const mesiIT = { GEN:'01',FEB:'02',MAR:'03',APR:'04',MAG:'05',GIU:'06',LUG:'07',AGO:'08',SET:'09',OTT:'10',NOV:'11',DIC:'12' };
  const efficaciaMesi = currentMonths.map(m => {
    const [mes, aa] = m.label.split(' ');
    const anno = '20' + aa;
    const mNum = mesiIT[mes];
    const ym = `${anno}-${mNum}`;
    const righe = consData.filter(r => r.data_attivita && r.data_attivita.startsWith(ym));
    const oreTec = righe.reduce((s, r) => s + (parseFloat(r.ore_tecniche) || 0), 0);
    const orePag = righe.reduce((s, r) => s + (parseFloat(r.ore_pagamento) || 0), 0);
    const eff = oreTec > 0 ? Math.round(orePag / oreTec * 100) : null;
    return { label: m.label, oreTec: Math.round(oreTec * 10) / 10, orePag: Math.round(orePag * 10) / 10, eff };
  });
  const mesiConDati = efficaciaMesi.filter(m => m.eff !== null);
  const efficaciaMedia = mesiConDati.length > 0 ? Math.round(mesiConDati.reduce((s, m) => s + m.eff, 0) / mesiConDati.length) : null;

  // ── SVG helpers ──
  const BAR_H = 120, BAR_W_EACH = 36, BAR_GAP = 12;
  const effColor = e => e >= 80 ? '#27500A' : e >= 60 ? '#BA7517' : '#dc2626';
  const effBg = e => e >= 80 ? '#EAF3DE' : e >= 60 ? '#fffbeb' : '#fef2f2';

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24, background: 'var(--color-surface,#fff)' }}>

      {/* ── 1. TORTE COMPLETEZZA SKILL ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Completezza competenze per prodotto</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {FOLDERS.map(folder => {
            const skills = skillsConfig[folder] || [];
            if (skills.length === 0) return null;
            const maxScore = skills.length * 4;
            const score = skills.reduce((s, sk) => s + (matrix?.[`${selected}-${sk}`] || 0), 0);
            const pct = maxScore > 0 ? Math.round(score / maxScore * 100) : 0;
            const R = 30, cx = 36, cy = 36, sw = 8;
            const circ = 2 * Math.PI * R;
            const dash = pct / 100 * circ;
            const col = pct >= 75 ? '#27500A' : pct >= 50 ? '#BA7517' : pct >= 25 ? '#185FA5' : '#94a3b8';
            return (
              <div key={folder} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 16px', background: 'var(--gray-50)', border: '0.5px solid var(--gray-200)', borderRadius: 12, minWidth: 100 }}>
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--gray-100)" strokeWidth={sw} />
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke={col} strokeWidth={sw}
                    strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4} strokeLinecap="round" />
                  <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={col} fontFamily="inherit">{pct}%</text>
                </svg>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-700)', textAlign: 'center' }}>{folder}</div>
                <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{score}/{maxScore}pt</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. ISTOGRAMMA PIANIFICAZIONE ── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 14 }}>Pianificazione mensile — giorni</div>
        <div style={{ overflowX: 'auto' }}>
          <svg width={Math.max(400, pianoMesi.length * (BAR_W_EACH * 2 + BAR_GAP + 8) + 60)} height={BAR_H + 60} style={{ display: 'block' }}>
            {/* Griglia */}
            {[0, 25, 50, 75, 100].map(pct => {
              const maxGg = Math.max(...pianoMesi.map(m => m.disponibili), 1);
              const y = BAR_H - (pct / 100 * BAR_H) + 10;
              return (
                <g key={pct}>
                  <line x1="40" y1={y} x2={pianoMesi.length * (BAR_W_EACH * 2 + BAR_GAP + 8) + 44} y2={y} stroke="var(--gray-100)" strokeWidth="1" />
                  <text x="36" y={y + 4} textAnchor="end" fontSize="9" fill="var(--gray-400)">{Math.round(maxGg * pct / 100)}</text>
                </g>
              );
            })}
            {pianoMesi.map((m, i) => {
              const maxGg = Math.max(...pianoMesi.map(x => x.disponibili), 1);
              const x = 44 + i * (BAR_W_EACH * 2 + BAR_GAP + 8);
              const hDisp = (m.disponibili / maxGg) * BAR_H;
              const hAss = (m.assegnati / maxGg) * BAR_H;
              const overplan = m.assegnati > m.disponibili;
              return (
                <g key={m.label}>
                  {/* Barra disponibili */}
                  <rect x={x} y={BAR_H - hDisp + 10} width={BAR_W_EACH} height={Math.max(hDisp, 1)} rx="3"
                    fill="#E6F1FB" stroke="#B5D4F4" strokeWidth="0.5" />
                  <text x={x + BAR_W_EACH / 2} y={BAR_H - hDisp + 6} textAnchor="middle" fontSize="9" fontWeight="600" fill="#185FA5">{m.disponibili}</text>
                  {/* Barra assegnati */}
                  <rect x={x + BAR_W_EACH + 4} y={BAR_H - hAss + 10} width={BAR_W_EACH} height={Math.max(hAss, 1)} rx="3"
                    fill={overplan ? '#fecaca' : '#C0DD97'} stroke={overplan ? '#fca5a5' : '#97C459'} strokeWidth="0.5" />
                  {m.assegnati > 0 && <text x={x + BAR_W_EACH * 1.5 + 4} y={BAR_H - hAss + 6} textAnchor="middle" fontSize="9" fontWeight="600" fill={overplan ? '#dc2626' : '#27500A'}>{m.assegnati}</text>}
                  {/* Label mese */}
                  <text x={x + BAR_W_EACH + 2} y={BAR_H + 22} textAnchor="middle" fontSize="9" fill="var(--gray-400)">{m.label}</text>
                </g>
              );
            })}
            {/* Legenda */}
            <rect x="44" y={BAR_H + 34} width="10" height="8" rx="2" fill="#E6F1FB" stroke="#B5D4F4" strokeWidth="0.5" />
            <text x="57" y={BAR_H + 41} fontSize="9" fill="var(--gray-500)">Disponibili</text>
            <rect x="110" y={BAR_H + 34} width="10" height="8" rx="2" fill="#C0DD97" stroke="#97C459" strokeWidth="0.5" />
            <text x="123" y={BAR_H + 41} fontSize="9" fill="var(--gray-500)">Assegnati</text>
          </svg>
        </div>
      </div>

      {/* ── 3. EFFICACIA DAI CONSUNTIVI ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Efficacia mensile dai consuntivi</div>
          {efficaciaMedia !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: effBg(efficaciaMedia), border: `0.5px solid ${effColor(efficaciaMedia)}20` }}>
              <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>Media:</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: effColor(efficaciaMedia) }}>{efficaciaMedia}%</span>
            </div>
          )}
        </div>
        {loadingCons ? (
          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Caricamento...</div>
        ) : mesiConDati.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic' }}>Nessun consuntivo trovato</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <svg width={Math.max(400, efficaciaMesi.length * (BAR_W_EACH + BAR_GAP) + 60)} height={BAR_H + 60} style={{ display: 'block' }}>
              {/* Griglia 25/50/75/100% */}
              {[25, 50, 75, 100].map(pct => {
                const y = BAR_H - (pct / 100 * BAR_H) + 10;
                return (
                  <g key={pct}>
                    <line x1="40" y1={y} x2={efficaciaMesi.length * (BAR_W_EACH + BAR_GAP) + 44} y2={y} stroke="var(--gray-100)" strokeWidth="1" strokeDasharray={pct === 80 ? '4,2' : 'none'} />
                    <text x="36" y={y + 4} textAnchor="end" fontSize="9" fill="var(--gray-400)">{pct}%</text>
                  </g>
                );
              })}
              {/* Linea obiettivo 80% */}
              {(() => { const y = BAR_H - 0.8 * BAR_H + 10; return <line key="obj" x1="40" y1={y} x2={efficaciaMesi.length * (BAR_W_EACH + BAR_GAP) + 44} y2={y} stroke="#27500A" strokeWidth="1" strokeDasharray="4,3" opacity="0.4" />; })()}
              {efficaciaMesi.map((m, i) => {
                const x = 44 + i * (BAR_W_EACH + BAR_GAP);
                if (m.eff === null) return (
                  <g key={m.label}>
                    <text x={x + BAR_W_EACH / 2} y={BAR_H + 22} textAnchor="middle" fontSize="9" fill="var(--gray-300)">{m.label}</text>
                  </g>
                );
                const h = (m.eff / 100) * BAR_H;
                const col = effColor(m.eff);
                return (
                  <g key={m.label}>
                    <rect x={x} y={BAR_H - h + 10} width={BAR_W_EACH} height={Math.max(h, 2)} rx="3"
                      fill={effBg(m.eff)} stroke={col} strokeWidth="1" />
                    <text x={x + BAR_W_EACH / 2} y={BAR_H - h + 6} textAnchor="middle" fontSize="9" fontWeight="700" fill={col}>{m.eff}%</text>
                    <text x={x + BAR_W_EACH / 2} y={BAR_H + 22} textAnchor="middle" fontSize="9" fill="var(--gray-400)">{m.label}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

    </div>
  );
}


export function HomeUser({ currentStaff, staff, matrix, clients, assignments, currentMonths, skillsConfig, trainingCells }) {
  if (!currentStaff) return null;
  const sKey = `${currentStaff.cognome} ${currentStaff.nome}`;
  const myStaff = staff.filter(s => staffKey(s) === sKey);
  const myClients = clients.filter(c => c.commesse.some(co => (co.team || []).includes(sKey) || co.pm_commessa === sKey))
    .map(c => ({ ...c, commesse: c.commesse.filter(co => (co.team || []).includes(sKey) || co.pm_commessa === sKey) }));

  const userEntities = [
    { key: 'risorsa', label: 'Area personale', desc: 'Skill map e pianificazione personale', adminOnly: false, icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><circle cx="19" cy="13" r="6" stroke="var(--brand-700)" strokeWidth="2"/><path d="M5 34c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="var(--brand-700)" strokeWidth="2" strokeLinecap="round"/></svg>) },
    { key: 'cliente', label: 'Clienti', desc: 'I clienti a cui sei assegnato', adminOnly: false, icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="5" y="14" width="28" height="20" rx="2" stroke="var(--brand-700)" strokeWidth="2"/><path d="M13 14V9a2 2 0 012-2h8a2 2 0 012 2v5" stroke="var(--brand-700)" strokeWidth="2"/><rect x="10" y="20" width="5" height="5" rx="1" stroke="var(--brand-700)" strokeWidth="1.5"/><rect x="23" y="20" width="5" height="5" rx="1" stroke="var(--brand-700)" strokeWidth="1.5"/></svg>) },
    { key: 'commessa', label: 'Commesse', desc: 'Le commesse a cui sei assegnato', adminOnly: false, icon: (<svg width="38" height="38" viewBox="0 0 38 38" fill="none"><rect x="6" y="4" width="26" height="30" rx="3" stroke="var(--brand-700)" strokeWidth="2"/><path d="M12 13h14M12 19h14M12 25h8" stroke="var(--brand-700)" strokeWidth="2" strokeLinecap="round"/></svg>) },
  ];

  return (
    <KPIView staff={myStaff} matrix={matrix} clients={myClients} assignments={assignments}
      skillsConfig={skillsConfig} currentMonths={currentMonths} trainingCells={trainingCells}
      isAdmin={false}
      userOverride={{ sKey, entities: userEntities, defaultEntity: 'risorsa', defaultSelected: sKey, nome: currentStaff.nome, cognome: currentStaff.cognome, ruolo: currentStaff.ruolo }} />
  );
}