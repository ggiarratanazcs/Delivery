import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { PRIORITA_COLORS } from '../constants.js';
import { staffKey, staffLabel } from '../utils.js';

// ── DatePicker inline ─────────────────────────────────────────
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const GG = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];
function DatePicker({ value, onChange, placeholder = 'gg/mm/aaaa', disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const today = new Date(); today.setHours(0,0,0,0);
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [vy, setVy] = React.useState((parsed || today).getFullYear());
  const [vm, setVm] = React.useState((parsed || today).getMonth());
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  React.useEffect(() => { if (parsed) { setVy(parsed.getFullYear()); setVm(parsed.getMonth()); } }, [value]);
  const fd = new Date(vy, vm, 1).getDay(); const off = fd === 0 ? 6 : fd - 1;
  const dim = new Date(vy, vm + 1, 0).getDate();
  const disp = parsed ? `${String(parsed.getDate()).padStart(2,'0')}/${String(parsed.getMonth()+1).padStart(2,'0')}/${parsed.getFullYear()}` : '';
  const sel = day => { const d = new Date(vy, vm, day); onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); setOpen(false); };
  const cells = [...Array(off).fill(null), ...Array.from({length: dim}, (_,i) => i+1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => !disabled && setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? '#0d4d8a' : '#e2e8f0'}`, padding: '6px 2px 8px', cursor: disabled ? 'default' : 'pointer', minHeight: 34 }}>
        <span style={{ fontSize: '13px', color: disp ? '#1e293b' : '#94a3b8', fontStyle: disp ? 'normal' : 'italic', flex: 1 }}>{disp || placeholder}</span>
        {!disabled && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        {disp && !disabled && <svg onClick={e => { e.stopPropagation(); onChange(''); }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 4, cursor: 'pointer' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 400, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', padding: '14px 14px 10px', width: 252, userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => { if (vm === 0) { setVm(11); setVy(y => y-1); } else setVm(m => m-1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: '#64748b', fontSize: 16 }}>‹</button>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{MESI[vm]} {vy}</span>
            <button onClick={() => { if (vm === 11) { setVm(0); setVy(y => y+1); } else setVm(m => m+1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: '#64748b', fontSize: 16 }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {GG.map(g => <div key={g} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>{g}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const td = new Date(vy, vm, day); const isSel = parsed && td.getTime() === parsed.getTime(); const isT = td.getTime() === today.getTime();
              return <div key={i} onClick={() => sel(day)} style={{ textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: '12px', cursor: 'pointer', background: isSel ? '#001d47' : isT ? '#eff6ff' : 'transparent', color: isSel ? '#fff' : isT ? '#0d4d8a' : '#1e293b', fontWeight: isSel || isT ? 600 : 400, border: isT && !isSel ? '1px solid #bfdbfe' : '1px solid transparent' }} onMouseOver={e => { if (!isSel) e.currentTarget.style.background = '#f1f5f9'; }} onMouseOut={e => { if (!isSel) e.currentTarget.style.background = isT ? '#eff6ff' : 'transparent'; }}>{day}</div>;
            })}
          </div>
          <div style={{ borderTop: '0.5px solid #f1f5f9', marginTop: 10, paddingTop: 8, textAlign: 'center' }}>
            <button onClick={() => { const t = today; onChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`); setOpen(false); }} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#0d4d8a', cursor: 'pointer', fontWeight: 500 }}>Oggi</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── SelectDropdown inline ─────────────────────────────────────
function SelectDropdown({ options = [], value, onChange, placeholder = 'Scegli...', disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = options.filter(o => !search || (o.label ?? o).toString().toLowerCase().includes(search.toLowerCase()));
  const selLabel = options.find(o => (o.value ?? o) === value)?.label ?? value ?? '';
  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 0 }}>
      <div onClick={() => !disabled && setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? '#0d4d8a' : '#e2e8f0'}`, padding: '6px 2px 8px', cursor: disabled ? 'default' : 'pointer', minHeight: 34, background: 'transparent', minWidth: 0 }}>
        <span style={{ fontSize: '13px', color: selLabel ? '#1e293b' : '#94a3b8', fontStyle: selLabel ? 'normal' : 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selLabel || placeholder}</span>
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

// ── Log Panel ─────────────────────────────────────────────────
function LogPanel({ attivitaId, onClose }) {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    supabase.from('attivita_log').select('*').eq('attivita_id', attivitaId).order('created_at', { ascending: false })
      .then(({ data }) => { setLogs(data || []); setLoading(false); });
  }, [attivitaId]);
  const fmtDate = d => d ? new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const icons = { inserimento: '✦', colonna: '→', pianificazione: '📅', assegnazione: '👤', stima_ore: '⏱', modifica: '✎', novita_prodotto: '★' };
  const colors = { inserimento: '#0054a6', colonna: '#0F6E56', pianificazione: '#7c3aed', assegnazione: '#d97706', stima_ore: '#64748b', modifica: '#64748b', novita_prodotto: '#f59e0b' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#001d47', borderRadius: '20px 20px 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>Storico attività</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>Log eventi</div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 16 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>Caricamento...</div>}
        {!loading && logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>⏱</div>
            <div style={{ fontSize: 13 }}>Nessun evento registrato</div>
          </div>
        )}
        {!loading && logs.length > 0 && (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: 0, bottom: 0, width: 1, background: '#f1f5f9' }} />
            {logs.map((log) => (
              <div key={log.id} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#f8fafc', border: `2px solid ${colors[log.tipo] || '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, fontSize: 12 }}>
                  {icons[log.tipo] || '·'}
                </div>
                <div style={{ flex: 1, paddingTop: 4 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#0f172a', marginBottom: 2 }}>{log.descrizione || log.tipo}</div>
                  {log.da_colonna && log.a_colonna && (
                    <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                      <span style={{ background: '#fef2f2', color: '#dc2626', padding: '1px 6px', borderRadius: 4 }}>{log.da_colonna}</span>
                      <span style={{ margin: '0 6px', color: '#94a3b8' }}>→</span>
                      <span style={{ background: '#f0fdf4', color: '#15803d', padding: '1px 6px', borderRadius: 4 }}>{log.a_colonna}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    {log.utente && <span style={{ marginRight: 8, color: '#64748b', fontWeight: 500 }}>{log.utente}</span>}
                    {fmtDate(log.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Osservatori Panel ─────────────────────────────────────────
function OsservatoriPanel({ attivitaId, currentUserKey, currentUserName, onClose }) {
  const [osservatori, setOsservatori] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const load = () => {
    supabase.from('attivita_osservatori').select('*').eq('attivita_id', attivitaId).order('created_at')
      .then(({ data }) => { setOsservatori(data || []); setLoading(false); });
  };
  React.useEffect(() => { load(); }, [attivitaId]);

  const isObserving = osservatori.some(o => o.staff_key === currentUserKey);

  const toggleSelf = async () => {
    setSaving(true);
    if (isObserving) {
      await supabase.from('attivita_osservatori').delete().eq('attivita_id', attivitaId).eq('staff_key', currentUserKey);
    } else {
      await supabase.from('attivita_osservatori').insert({ attivita_id: attivitaId, staff_key: currentUserKey, nome_cognome: currentUserName });
    }
    setSaving(false);
    load();
  };

  const initials = name => name.split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase();
  const avatarColor = name => {
    const cols = [['#E6F1FB','#185FA5'],['#E1F5EE','#0F6E56'],['#FAEEDA','#854F0B'],['#FBEAF0','#993556'],['#EAF3DE','#3B6D11']];
    let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % cols.length;
    return cols[h];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: '#001d47', borderRadius: '20px 20px 0 0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Notifiche attività</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff' }}>Osservatori</div>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 16 }}>×</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={toggleSelf} disabled={saving}
          style={{ width: '100%', padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${isObserving ? '#fecaca' : '#9FE1CB'}`, background: isObserving ? '#fef2f2' : '#f0fdf8', color: isObserving ? '#dc2626' : '#0F6E56', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isObserving
              ? <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
              : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
            }
          </svg>
          {isObserving ? 'Smetti di osservare' : 'Osserva questa attività'}
        </button>
        <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>
          {loading ? 'Caricamento...' : `${osservatori.length} osservator${osservatori.length === 1 ? 'e' : 'i'}`}
        </div>
        {!loading && osservatori.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px', display: 'block' }}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            <div style={{ fontSize: 13 }}>Nessun osservatore</div>
          </div>
        )}
        {!loading && osservatori.map(o => {
          const [bg, txt] = avatarColor(o.nome_cognome);
          const isSelf = o.staff_key === currentUserKey;
          return (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: isSelf ? '#f0fdf8' : '#f8fafc', borderRadius: 10, border: `0.5px solid ${isSelf ? '#9FE1CB' : '#e2e8f0'}` }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: bg, color: txt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                {initials(o.nome_cognome)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{o.nome_cognome}</div>
                {isSelf && <div style={{ fontSize: 10, color: '#0F6E56' }}>tu</div>}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── CardModal principale ──────────────────────────────────────
export function CardModal({ card, colonne, defaultColId, workflowId, staff, clients, transizioni, onClose, onDelete, isAdmin = false }) {
  const isEdit = !!card;
  const [titolo, setTitolo] = useState(card?.titolo || '');
  const [descrizione, setDescrizione] = useState(card?.descrizione || '');
  const [colId, setColId] = useState(card?.colonna_id || defaultColId || '');
  const [priorita, setPriorita] = useState(card?.priorita || 'media');
  const [pm, setPm] = useState(card?.pm || '');
  const [assegnatario, setAssegnatario] = useState(card?.assegnatario || '');
  const [teamSviluppo, setTeamSviluppo] = useState(card?.team_sviluppo || '');
  const [assegnata, setAssegnata] = useState(card?.assegnata_a || '');
  const [dataRichiesta, setDataRichiesta] = useState(card?.data_richiesta || '');
  const [bollaId, setBollaId] = useState(card?.bolla_id || '');
  const [rifPratica, setRifPratica] = useState(card?.rif_pratica || '');
  const [clienteId, setClienteId] = useState(card?.cliente_id || '');
  const [stimaOre, setStimaOre] = useState(card?.stima_ore || '');
  const [saving, setSaving] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [showOsservatori, setShowOsservatori] = useState(false);
  const [isStarred, setIsStarred] = useState(card?.novita_prodotto || false);

  // ── currentUser ────────────────────────────────────────────
  // IMPORTANTE: la chiave deve essere "Cognome Nome" — identico
  // a come viene salvato assegnata_a / assegnatario / pm nel DB
  // (funzione staffKey in utils.js restituisce `${cognome} ${nome}`)
  const [currentUser, setCurrentUser] = React.useState({ key: '', name: '' });
  React.useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const email = data?.user?.email || '';
      const { data: s } = await supabase.from('staff').select('nome, cognome').eq('email', email).single();
      if (s) {
        const key = `${s.cognome} ${s.nome}`;
        setCurrentUser({ key, name: key });
      }
    });
  }, []);

  const [teamConfig, setTeamConfig] = useState([]);
  const [staffSviluppo, setStaffSviluppo] = useState([]);
  const [bolleList, setBolleList] = useState([]);

  useEffect(() => {
    Promise.all([
      supabase.from('config_team_prodotto').select('*').order('ordine'),
      supabase.from('staff').select('id, nome, cognome, ruolo, team_prodotto').in('ruolo', ['Programmatore', 'Analista']),
      supabase.from('bolle_lavoro').select('id, codice, descrizione').order('codice'),
    ]).then(([{ data: teams }, { data: devs }, { data: bolle }]) => {
      setTeamConfig(teams || []);
      setStaffSviluppo(devs || []);
      setBolleList(bolle || []);
    });
  }, []);

  const colonneDisponibili = colonne.filter(c => {
    if (!card?.colonna_id) return true;
    if (c.id === card.colonna_id) return true;
    return (transizioni || []).some(t => t.da_colonna_id === card.colonna_id && t.a_colonna_id === c.id);
  });

  const colonnaCorrente = colonne.find(c => c.id === colId);
  const colonnaColor = colonnaCorrente?.colore || '#001d47';

  const pmOptions = (staff || []).filter(s => s.ruolo === 'PM' || s.is_admin);
  const commessaLabel = card?.commessa
    ? [clients?.find(c => c.id === card.commessa.client_id)?.nome_progetto, card.commessa.nome_commessa].filter(Boolean).join(' · ')
    : null;
  const inRitardo = isEdit && card?.data_fine_lavori && dataRichiesta && card.data_fine_lavori > dataRichiesta;
  const giorniRitardo = inRitardo ? Math.round((new Date(card.data_fine_lavori) - new Date(dataRichiesta)) / 86400000) : 0;

  // ── writeLog ───────────────────────────────────────────────
  const writeLog = async (tipo, desc, extra = {}) => {
    try {
      await supabase.from('attivita_log').insert({
        attivita_id: card?.id,
        tipo,
        descrizione: desc,
        utente: currentUser.key || 'sistema',
        ...extra,
      });
    } catch (e) { console.error('writeLog error:', e); }
  };

  // ── Stellina novità prodotto ───────────────────────────────
  const toggleStar = async () => {
    if (!isAdmin) return;
    const newVal = !isStarred;
    setIsStarred(newVal);
    if (card?.id) {
      await supabase.from('attivita').update({ novita_prodotto: newVal }).eq('id', card.id);
      await writeLog('novita_prodotto', newVal ? 'Segnalata come novità di prodotto' : 'Rimossa dalle novità di prodotto');
    }
  };

  // ── notificaDestinatari ────────────────────────────────────
  // Invia a: PM + assegnatario + risorsa + osservatori
  // escludiKey: chi ha già ricevuto notifica diretta specifica
  //             (passare '' per notificare tutti senza esclusioni)
  // NOTA: NON escludiamo più l'autore — se uno si auto-assegna
  //       deve ricevere la notifica per poterla vedere nel campanellino
  const notificaDestinatari = async (cardId, testo, escludiKey = '') => {
    try {
      const destinatari = new Set();
      // Usa i valori correnti dello stato React (post-modifica)
      if (pm && pm.trim() && pm.trim() !== escludiKey) destinatari.add(pm.trim());
      if (assegnatario && assegnatario.trim() && assegnatario.trim() !== escludiKey) destinatari.add(assegnatario.trim());
      if (assegnata && assegnata.trim() && assegnata.trim() !== escludiKey) destinatari.add(assegnata.trim());

      // Osservatori dal DB
      const { data: ossList } = await supabase
        .from('attivita_osservatori')
        .select('staff_key')
        .eq('attivita_id', cardId);
      (ossList || []).forEach(o => {
        if (o.staff_key && o.staff_key.trim() !== escludiKey) destinatari.add(o.staff_key.trim());
      });

      if (destinatari.size === 0) return;
      await supabase.from('notifiche').insert(
        [...destinatari].map(dest => ({
          destinatario: dest,
          testo,
          tipo: 'workflow',
          riferimento_id: cardId,
        }))
      );
    } catch (e) { console.error('notificaDestinatari error:', e); }
  };

  // ── handleSave ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!titolo.trim()) return;
    if (!colId) { alert('Seleziona una colonna.'); return; }
    setSaving(true);

    const payload = {
      workflow_id: workflowId,
      colonna_id: colId || null,
      titolo: titolo.trim(),
      descrizione: descrizione || null,
      priorita,
      pm: pm || null,
      assegnatario: assegnatario || null,
      team_sviluppo: teamSviluppo || null,
      assegnata_a: assegnata || null,
      data_richiesta: dataRichiesta || null,
      bolla_id: bollaId || null,
      rif_pratica: rifPratica || null,
      cliente_id: clienteId || null,
      stima_ore: stimaOre ? parseFloat(stimaOre) : null,
    };

    try {
      if (isEdit) {
        await supabase.from('attivita').update(payload).eq('id', card.id);

        // ── Cambio colonna ──────────────────────────────────
        if (card.colonna_id !== colId) {
          const da = colonne.find(c => c.id === card.colonna_id)?.nome || '';
          const a = colonne.find(c => c.id === colId)?.nome || '';
          await writeLog('colonna', `Spostata da "${da}" a "${a}"`, { da_colonna: da, a_colonna: a });
          // Notifica tutti (PM, assegnatario, risorsa, osservatori) senza esclusioni
          await notificaDestinatari(card.id, `"${titolo}" è stata spostata in "${a}"`);
        }

        // ── Cambio assegnatario ─────────────────────────────
        if ((card.assegnatario || '') !== (assegnatario || '')) {
          await writeLog('assegnazione', `Assegnato a: ${assegnatario || '—'}`);
          if (assegnatario) {
            // Notifica diretta al nuovo assegnatario (sempre, anche se è l'autore)
            await supabase.from('notifiche').insert({
              destinatario: assegnatario.trim(),
              testo: `Sei stato assegnato all'attività "${titolo}"`,
              tipo: 'workflow',
              riferimento_id: card.id,
            });
            // Notifica gli altri (PM, risorsa, osservatori) escludendo solo chi ha già ricevuto
            await notificaDestinatari(card.id, `"${titolo}": assegnata a ${assegnatario}`, assegnatario.trim());
          }
        }

        // ── Cambio risorsa sviluppo ─────────────────────────
        if ((card.assegnata_a || '') !== (assegnata || '')) {
          await writeLog('assegnazione', `Risorsa assegnata: ${assegnata || '—'}`);
          if (assegnata) {
            // Notifica diretta alla nuova risorsa (sempre)
            await supabase.from('notifiche').insert({
              destinatario: assegnata.trim(),
              testo: `Sei stato assegnato come risorsa all'attività "${titolo}"`,
              tipo: 'workflow',
              riferimento_id: card.id,
            });
            // Notifica gli altri (PM, assegnatario, osservatori) escludendo solo chi ha già ricevuto
            await notificaDestinatari(card.id, `"${titolo}": risorsa assegnata a ${assegnata}`, assegnata.trim());
          }
        }

        // ── Cambio PM ───────────────────────────────────────
        if ((card.pm || '') !== (pm || '')) {
          await writeLog('assegnazione', `PM assegnato: ${pm || '—'}`);
          if (pm) {
            // Notifica diretta al nuovo PM (sempre)
            await supabase.from('notifiche').insert({
              destinatario: pm.trim(),
              testo: `Sei stato assegnato come PM dell'attività "${titolo}"`,
              tipo: 'workflow',
              riferimento_id: card.id,
            });
            // Notifica gli altri (assegnatario, risorsa, osservatori) escludendo solo chi ha già ricevuto
            await notificaDestinatari(card.id, `"${titolo}": PM assegnato a ${pm}`, pm.trim());
          }
        }

        // ── Cambio stima ore ────────────────────────────────
        if (card.stima_ore !== payload.stima_ore && payload.stima_ore) {
          await writeLog('stima_ore', `Stima ore: ${payload.stima_ore}h`);
          await notificaDestinatari(card.id, `"${titolo}": stima aggiornata a ${payload.stima_ore}h`);
        }

        // ── Cambio date pianificazione ──────────────────────
        const { data: cardFull } = await supabase
          .from('attivita').select('data_inizio_lavori, data_fine_lavori').eq('id', card.id).single();
        if (cardFull && (
          cardFull.data_inizio_lavori !== card.data_inizio_lavori ||
          cardFull.data_fine_lavori !== card.data_fine_lavori
        )) {
          await notificaDestinatari(card.id, `"${titolo}": date di pianificazione aggiornate`);
        }

      } else {
        // ── Nuova card ──────────────────────────────────────
        const { data: newCard } = await supabase.from('attivita').insert(payload).select().single();
        if (newCard) {
          await supabase.from('attivita_log').insert({
            attivita_id: newCard.id,
            tipo: 'inserimento',
            descrizione: `Attività creata: "${payload.titolo}"`,
            utente: currentUser.key || 'sistema',
          });

          // Notifica PM + assegnatario + risorsa alla creazione (tutti, nessuna esclusione)
          const destinatariCreazione = new Set();
          if (pm && pm.trim()) destinatariCreazione.add(pm.trim());
          if (assegnatario && assegnatario.trim()) destinatariCreazione.add(assegnatario.trim());
          if (assegnata && assegnata.trim()) destinatariCreazione.add(assegnata.trim());

          if (destinatariCreazione.size > 0) {
            await supabase.from('notifiche').insert(
              [...destinatariCreazione].map(dest => ({
                destinatario: dest,
                testo: `Sei stato assegnato alla nuova attività "${titolo}"`,
                tipo: 'workflow',
                riferimento_id: newCard.id,
              }))
            );
          }
        }
      }
    } catch (e) {
      console.error('handleSave error:', e);
      alert('Errore nel salvataggio: ' + e.message);
    }

    setSaving(false);
    onClose();
  };

  const fld = (label, children) => (
    <div style={{ marginBottom: 0 }}>
      <div style={{ fontSize: '10px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>{label}</div>
      {children}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: '660px', padding: 0, borderRadius: '20px' }}>

        {/* Log panel sovrapposto */}
        {showLog && isEdit && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowLog(false)}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,18,41,0.18)' }} onClick={e => e.stopPropagation()}>
              <LogPanel attivitaId={card.id} onClose={() => setShowLog(false)} />
            </div>
          </div>
        )}
        {showOsservatori && isEdit && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowOsservatori(false)}>
            <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 380, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 12px 40px rgba(0,18,41,0.18)' }} onClick={e => e.stopPropagation()}>
              <OsservatoriPanel attivitaId={card.id} currentUserKey={currentUser.key} currentUserName={currentUser.name} onClose={() => setShowOsservatori(false)} />
            </div>
          </div>
        )}

        {/* Linea colorata colonna */}
        <div style={{ height: 4, background: colonnaColor, borderRadius: '20px 20px 0 0' }} />

        {/* Header navy */}
        <div style={{ background: '#001d47', padding: '12px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {commessaLabel && (
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>{commessaLabel}</div>
              )}
              <input value={titolo} onChange={e => setTitolo(e.target.value)} placeholder="Titolo attività..." autoFocus
                style={{ fontSize: '15px', fontWeight: 500, width: '100%', border: 'none', borderBottom: '1.5px solid rgba(255,255,255,0.2)', borderRadius: 0, background: 'transparent', padding: '4px 0 8px', outline: 'none', fontFamily: 'inherit', color: '#fff' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {isEdit && (<>
                {/* Stellina — visibile a tutti, cliccabile solo admin */}
                <button onClick={toggleStar}
                  title={isAdmin ? (isStarred ? 'Rimuovi da novità prodotto' : 'Segnala come novità prodotto') : (isStarred ? 'Novità di prodotto' : 'Non segnalata come novità')}
                  style={{ background: isStarred ? 'rgba(250,199,117,0.25)' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isAdmin ? 'pointer' : 'default', color: isStarred ? '#FAC775' : 'rgba(255,255,255,0.5)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={isStarred ? '#FAC775' : 'none'} stroke={isStarred ? '#FAC775' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </button>
                <button onClick={() => { setShowOsservatori(true); setShowLog(false); }} title="Osservatori"
                  style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button onClick={() => { setShowLog(true); setShowOsservatori(false); }} title="Storico attività"
                  style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </button>
              </>)}
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 16 }}>×</button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '12px 16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {fld('Descrizione',
              <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} placeholder="Aggiungi una descrizione..." rows={1}
                style={{ width: '100%', fontSize: '13px', border: 'none', borderBottom: '1.5px solid #e2e8f0', borderRadius: 0, background: 'transparent', padding: '4px 0 8px', outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            )}

            {fld(<>Colonna {!isEdit && <span style={{ fontSize: 10, color: '#0F6E56', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— assegnata automaticamente</span>}</>,
              isEdit ? (
                <>
                  <SelectDropdown options={colonneDisponibili.map(c => ({ value: c.id, label: c.nome }))} value={colId} onChange={setColId} placeholder="— seleziona colonna —" />
                  {colonneDisponibili.length < colonne.length && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>Solo le transizioni consentite sono disponibili.</div>
                  )}
                </>
              ) : (
                <div style={{ padding: '6px 2px 8px', borderBottom: '1.5px solid #e2e8f0', fontSize: 13, color: '#1e293b', fontWeight: 500 }}>
                  {colonneDisponibili.find(c => c.id === colId)?.nome || '—'}
                </div>
              )
            )}

            {fld('Priorità',
              <div style={{ display: 'flex', gap: '6px', paddingTop: 2 }}>
                {['bassa', 'media', 'alta'].map(p => {
                  const pc = PRIORITA_COLORS[p];
                  return <div key={p} onClick={() => setPriorita(p)} style={{ flex: 1, textAlign: 'center', padding: '4px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${priorita === p ? pc.border : '#e2e8f0'}`, background: priorita === p ? pc.bg : 'transparent', color: priorita === p ? pc.text : '#94a3b8', fontSize: 12, fontWeight: priorita === p ? 500 : 400, userSelect: 'none', textTransform: 'capitalize' }}>{p}</div>;
                })}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {fld('PM', <SelectDropdown options={[{ value: '', label: '— nessuno —' }, ...pmOptions.map(s => ({ value: staffKey(s), label: staffLabel(s) }))]} value={pm} onChange={setPm} placeholder="— nessuno —" />)}
              {fld('Assegnatario', <SelectDropdown options={[{ value: '', label: '— nessuno —' }, ...(staff || []).map(s => ({ value: staffKey(s), label: staffLabel(s) }))]} value={assegnatario} onChange={setAssegnatario} placeholder="— nessuno —" />)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {fld('Team sviluppo', <SelectDropdown options={[{ value: '', label: '— nessuno —' }, ...teamConfig.map(t => ({ value: t.nome, label: t.nome }))]} value={teamSviluppo} onChange={v => { setTeamSviluppo(v); setAssegnata(''); }} placeholder="— nessuno —" />)}
              {fld('Risorsa', <SelectDropdown options={[{ value: '', label: '— nessuna —' }, ...(teamSviluppo ? staffSviluppo.filter(s => s.team_prodotto === teamSviluppo) : staffSviluppo).map(s => ({ value: `${s.cognome} ${s.nome}`, label: `${s.cognome} ${s.nome}` }))]} value={assegnata} onChange={setAssegnata} placeholder="— nessuna —" />)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {fld('Data richiesta', <DatePicker value={dataRichiesta} onChange={setDataRichiesta} />)}
              {fld('Cliente', <SelectDropdown options={[{ value: '', label: '— nessuno —' }, ...(clients || []).map(c => ({ value: c.id, label: c.nome_progetto }))]} value={clienteId} onChange={setClienteId} placeholder="— nessuno —" />)}
            </div>

            {isEdit && card?.data_fine_lavori && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Previsto rilascio</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#0F6E56', fontFamily: 'monospace' }}>{card.data_fine_lavori.split('-').reverse().join('/')}</span>
                    <span style={{ fontSize: 10, color: '#0F6E56', background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: 4, padding: '1px 6px' }}>da pianificazione</span>
                  </div>
                </div>
                {inRitardo && <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: '#dc2626', fontWeight: 500 }}>In ritardo</div><div style={{ fontSize: 11, color: '#dc2626' }}>+{giorniRitardo} gg</div></div>}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '12px' }}>
              {fld('Bolla', <SelectDropdown options={[{ value: '', label: '— nessuna —' }, ...bolleList.map(b => ({ value: b.id, label: `${b.codice}${b.descrizione ? ' — ' + b.descrizione : ''}` }))]} value={bollaId} onChange={setBollaId} placeholder="— nessuna —" />)}
              {fld('Rif. Pratica', <input type="text" placeholder="es. PR.26.12345" value={rifPratica} onChange={e => setRifPratica(e.target.value)} />)}
            </div>

            {fld('Stima ore', <input type="number" min="1" step="1" placeholder="es. 16" value={stimaOre} onChange={e => setStimaOre(e.target.value)} style={{ fontFamily: 'monospace' }} />)}

          </div>
        </div>

        <div className="modal-actions" style={{ margin: '10px 16px 14px', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
          {isEdit && <button onClick={onDelete} style={{ background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: 13, marginRight: 'auto' }}>Elimina</button>}
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
        </div>
      </div>
    </div>
  );
}