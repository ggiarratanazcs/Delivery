import React, { useState, useEffect } from 'react';
import { DatePicker } from './DatePicker.jsx';
import { supabase } from '../supabase.js';
import {
  REPARTI_STANDARD, STATI_TASK, STATO_COLORS, IN_CARICO_OPTIONS,
  PRIORITA_COLORS, STATI_COLORS_BAR,
} from '../constants.js';
import { getAvatarColor, getInitials, staffKey, staffLabel } from '../utils.js';
import { MultiPillFilter } from './MultiPillFilter.jsx';
import { useIsMobile, DesktopOnly } from './DesktopOnly.jsx';
import { BolleCommessa } from './KPIView.jsx';
import { CardPreviewModal } from './CardPreviewModal.jsx';
import { RelazioneProgettoPDF } from './RelazioneProgettoPDF.jsx';

export async function creaTaskStandard(progettoId) {
  const tasks = [];
  REPARTI_STANDARD.forEach((reparto, ri) => {
    tasks.push({
      progetto_id: progettoId,
      task_id_display: String(ri + 1),
      reparto,
      categoria: null,
      attivita: null,
      stato: null,
      ordine: ri * 100,
    });
  });
  await supabase.from('progetto_task').insert(tasks);
}


// SelectDropdown inline
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

export function ProgettiList({ clients, staff, currentUser, onOpenProgetto }) {
  const [progetti, setProgetti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();

  useEffect(() => { loadProgetti(); }, []);

  const loadProgetti = async () => {
    setLoading(true);
    const { data } = await supabase.from('progetti').select('*').order('created_at', { ascending: false });
    setProgetti(data || []);
    setLoading(false);
  };

  const progettiArricchiti = progetti.map(p => {
    const allComm = clients.flatMap(c => c.commesse.map(co => ({ ...co, clientName: c.nome_progetto })));
    const commessa = allComm.find(co => co.id === p.commessa_id);
    return { ...p, commessa };
  }).filter(p => {
    if (!p.commessa) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.commessa?.nome_commessa?.toLowerCase().includes(s) ||
      p.commessa?.clientName?.toLowerCase().includes(s) ||
      p.commessa?.pm_commessa?.toLowerCase().includes(s)
    );
  });

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Caricamento...</div>;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px' : '28px 32px', background: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: '12px', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Progetti</h2>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: 3 }}>{progettiArricchiti.length} progetti attivi</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '7px 12px', width: isMobile ? '100%' : 'auto' }}>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input type="text" placeholder="Cerca progetto, cliente, PM..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', width: isMobile ? '100%' : '240px', color: '#0f172a' }} />
        </div>
      </div>

      {progettiArricchiti.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📂</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Nessun progetto trovato</div>
          <div style={{ fontSize: '12px', marginTop: 4 }}>Genera un progetto da una commessa nella sezione Pianificazione</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {progettiArricchiti.map(p => {
            const co = p.commessa;
            const pm = co?.pm_commessa || '—';
            const pmAc = pm !== '—' ? getAvatarColor(pm) : { bg: '#f1f5f9', text: '#94a3b8' };
            const isActive = co?.attiva !== false;
            return (
              <div key={p.id}
                onClick={() => onOpenProgetto(p.id, p.commessa_id)}
                style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #e2e8f0', padding: '20px 22px', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s, transform 0.12s', borderLeft: `4px solid ${isActive ? '#0054a6' : '#94a3b8'}` }}
                onMouseOver={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseOut={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0054a6', marginBottom: '3px', lineHeight: 1.2 }}>{co?.clientName || '—'}</div>
                <div style={{ fontSize: '13px', fontWeight: 400, color: '#64748b', marginBottom: '12px', lineHeight: 1.3 }}>{co?.nome_commessa || 'Commessa non trovata'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: pmAc.bg, color: pmAc.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                    {pm !== '—' ? getInitials(pm) : '?'}
                  </div>
                  <span style={{ fontSize: '12px', color: '#475569' }}>{pm}</span>
                  {co?.data_inizio && (
                    <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: 'auto' }}>
                      {co.data_inizio}{co.data_fine ? ` → ${co.data_fine}` : ''}
                    </span>
                  )}
                </div>
                {co?.team && co.team.length > 0 && (
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {co.team.slice(0, 5).map(s => {
                      const ac = getAvatarColor(s);
                      return <div key={s} style={{ width: 22, height: 22, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600 }} title={s}>{getInitials(s)}</div>;
                    })}
                    {co.team.length > 5 && <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f1f5f9', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600 }}>+{co.team.length - 5}</div>}
                  </div>
                )}
                <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, border: '0.5px solid', background: isActive ? '#eff6ff' : '#f1f5f9', color: isActive ? '#0054a6' : '#94a3b8', borderColor: isActive ? '#bfdbfe' : '#e2e8f0' }}>
                    {isActive ? 'Attiva' : 'Chiusa'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProgettoView({ progettoId, commessaId, clients, staff, currentUser, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [commessa, setCommessa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chiuso, setChiuso] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskParentId, setNewTaskParentId] = useState(null);
  const [newTaskReparto, setNewTaskReparto] = useState(null);
  const [subView, setSubView] = useState('home');
  const [filterReparto, setFilterReparto] = useState([]);
  const [filterStato, setFilterStato] = useState([]);
  const [filterInCarico, setFilterInCarico] = useState([]);
  const [colFilters, setColFilters] = useState({}); // { colName: Set(values) | string }
  const [colFilterOpen, setColFilterOpen] = useState(null); // quale header ha il dropdown aperto

  useEffect(() => {
    if (!colFilterOpen) return;
    const close = () => setColFilterOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [colFilterOpen]);
  const [showModuloModal, setShowModuloModal] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [expandAll, setExpandAll] = useState(true);
  const [cardPreview, setCardPreview] = useState(null);
  const [colonneMap, setColonneMap] = useState({});
  const isMobile = useIsMobile();

  const isRepartoOpen = (reparto) => {
    if (expandAll) return true;
    if (expanded[reparto] === undefined) return true;
    return expanded[reparto] === true;
  };

  useEffect(() => { loadProgetto(); }, [progettoId]);

  const loadProgetto = async () => {
    setLoading(true);
    const { data: taskData } = await supabase.from('progetto_task').select('*').eq('progetto_id', progettoId).order('ordine');
    setTasks(taskData || []);
    const { data: progData } = await supabase.from('progetti').select('chiuso').eq('id', progettoId).single();
    const allComm = clients.flatMap(c => c.commesse.map(co => ({ ...co, clientName: c.nome_progetto })));
    const comm = allComm.find(co => co.id === commessaId) || null;
    setCommessa(comm);
    setChiuso(progData?.chiuso === true || comm?.attiva === false);
    setLoading(false);
  };

  const openCardPreview = async (attivitaId) => {
    const { data: att } = await supabase
      .from('attivita')
      .select('*, bolla:bolla_id(codice), colonna:colonna_id(nome)')
      .eq('id', attivitaId)
      .single();
    if (!att) return;
    // Normalizza campo risorsa (può essere assegnata o assegnata_a)
    const card = { ...att, assegnata: att.assegnata || att.assegnata_a };
    const colMap = { ...colonneMap };
    if (att.colonna_id && att.colonna?.nome) colMap[att.colonna_id] = att.colonna.nome;
    setColonneMap(colMap);
    setCardPreview(card);
  };

  const isReparto = (t) => !t.attivita && t.stato === null;
  const reparti = [...new Set(tasks.filter(t => isReparto(t)).map(t => t.reparto).filter(Boolean))];

  const saveTask = async (task) => {
    const payload = {
      progetto_id: progettoId,
      reparto: task.reparto || null,
      categoria: task.categoria || null,
      attivita: task.attivita || null,
      priorita: task.priorita || 'media',
      stato: task.stato || 'Da Iniziare',
      note: task.note || null,
      in_carico_a: task.in_carico_a || 'ZCS',
      previsto: task.previsto || null,
      collaudo: task.collaudo || null,
      step: task.step || 1,
      parent_id: task.parent_id || null,
      ordine: task.ordine || 0,
      task_id_display: task.task_id_display || '',
    };
    if (task.id) {
      const { error } = await supabase.from('progetto_task').update(payload).eq('id', task.id);
      if (error) { alert('Errore salvataggio: ' + error.message); return; }
    } else {
      const siblings = tasks.filter(t => {
        if (payload.parent_id) return t.parent_id === payload.parent_id;
        return !t.parent_id && !isReparto(t) && t.reparto === payload.reparto;
      });
      const parentTask = payload.parent_id ? tasks.find(t => t.id === payload.parent_id) : null;
      const base = parentTask
        ? parentTask.task_id_display
        : tasks.find(t => isReparto(t) && t.reparto === payload.reparto)?.task_id_display || '0';
      payload.task_id_display = `${base}.${siblings.length + 1}`;
      payload.ordine = (tasks[tasks.length - 1]?.ordine || 0) + 10;
      const { error } = await supabase.from('progetto_task').insert(payload);
      if (error) { alert('Errore inserimento: ' + error.message); return; }
    }
    await loadProgetto();
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const deleteTask = async (id) => {
    if (!window.confirm('Eliminare questo task?')) return;
    await supabase.from('progetto_task').delete().eq('id', id);
    await loadProgetto();
  };

  if (loading) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Caricamento...</div>;

  const STATO_COL = { ...STATO_COLORS };
  const tdStyle = { padding: '8px 10px', fontSize: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };

  const tasksByReparto = reparti.map(rep => ({
    reparto: rep,
    repartoTask: tasks.find(t => isReparto(t) && t.reparto === rep),
    children: tasks.filter(t => !isReparto(t) && t.reparto === rep),
  }));

  const taskRows = tasksByReparto.flatMap(({ reparto, repartoTask, children }) => {
    const filteredChildren = children.filter(t => {
      if (filterReparto.length > 0 && !filterReparto.includes(t.reparto)) return false;
      if (filterStato.length > 0 && !filterStato.includes(t.stato)) return false;
      if (filterInCarico.length > 0 && !filterInCarico.includes(t.in_carico_a)) return false;
      // Filtri colonna
      for (const [col, val] of Object.entries(colFilters)) {
        if (!val || (Array.isArray(val) ? val.length === 0 : val === '')) continue;
        const fieldMap = { 'Categoria': 'categoria', 'Priorità': 'priorita', 'Stato': 'stato', 'In carico a': 'in_carico_a', 'Step': 'step', 'Attività': 'attivita', 'Note': 'note', 'Previsto': 'previsto', 'Collaudo': 'collaudo' };
        const field = fieldMap[col];
        if (!field) continue;
        const cellVal = (t[field] || '').toString().toLowerCase();
        if (Array.isArray(val)) { if (val.length > 0 && !val.includes(t[field])) return false; }
        else { if (val && !cellVal.includes(val.toLowerCase())) return false; }
      }
      return true;
    });
    if (filterReparto.length > 0 && filteredChildren.length === 0) return [];
    return [
      { type: 'reparto', reparto, repartoTask },
      ...(isRepartoOpen(reparto) ? filteredChildren.map(t => ({ type: 'task', task: t })) : []),
    ];
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>

      {/* HEADER */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'stretch', gap: 0, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: isMobile ? '10px 0 6px' : '12px 0', marginRight: isMobile ? 0 : '24px', borderRight: isMobile ? 'none' : '1px solid #e2e8f0', paddingRight: isMobile ? 0 : '24px', borderBottom: isMobile ? '1px solid #f1f5f9' : 'none', width: isMobile ? '100%' : 'auto' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', flexShrink: 0 }}>
            ← <span>Progetti</span>
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{commessa?.nome_commessa || 'Progetto'}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: 1 }}>{commessa?.clientName} · PM: {commessa?.pm_commessa || '—'}</div>
          </div>
          {chiuso && isMobile && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', color: '#92400e', fontWeight: 500, flexShrink: 0 }}>🔒 Chiuso</div>
          )}
        </div>

        {isMobile ? (
          <div style={{ padding: '8px 0', width: '100%' }}>
            <select value={subView} onChange={e => setSubView(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', fontWeight: 600, color: '#0054a6', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230054a6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
              {[{ key: 'home', label: 'Home' }, { key: 'dettaglio', label: 'Dettaglio Attività' }, { key: 'gantt', label: 'Gantt' }, { key: 'avanzamento', label: 'Avanzamento' }, { key: 'consuntivi', label: 'Consuntivi' }, { key: 'note', label: 'Note' }].map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', gap: '3px', alignSelf: 'center', margin: '0 16px' }}>
              {[{ key: 'home', label: 'Home' }, { key: 'dettaglio', label: 'Dettaglio Attività' }, { key: 'gantt', label: 'Gantt' }, { key: 'avanzamento', label: 'Avanzamento' }, { key: 'consuntivi', label: 'Consuntivi' }, { key: 'note', label: 'Note' }].map(tab => (
                <button key={tab.key} onClick={() => setSubView(tab.key)} style={{ padding: '6px 14px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s', background: subView === tab.key ? '#fff' : 'transparent', color: subView === tab.key ? '#0054a6' : '#64748b', fontWeight: subView === tab.key ? 600 : 400, boxShadow: subView === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{tab.label}</button>
              ))}
            </div>
            {chiuso && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#92400e', fontWeight: 500, flexShrink: 0, marginLeft: 'auto' }}>
                🔒 Progetto chiuso — sola lettura
              </div>
            )}

            {subView === 'dettaglio' && !chiuso && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 0', flexWrap: 'wrap' }}>
                <div style={{ width: 1, height: 18, background: '#e2e8f0' }} />
                <button onClick={() => {
                  if (expandAll) { setExpandAll(false); const c = {}; reparti.forEach(r => { c[r] = false; }); setExpanded(c); }
                  else { setExpandAll(true); setExpanded({}); }
                }} style={{ padding: '5px 10px', borderRadius: '20px', border: '1px solid', fontSize: '11px', fontWeight: 600, cursor: 'pointer', ...(expandAll ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#0054a6' } : { background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }) }}>
                  {expandAll ? '▼' : '▶'}
                </button>
                <button onClick={() => setShowModuloModal(true)} style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Modulo</button>
                <button onClick={() => { setEditingTask(null); setNewTaskParentId(null); setNewTaskReparto(reparti[0] || ''); setShowTaskModal(true); }} style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>+ Task</button>
              </div>
            )}
          </div>
        )}

        {isMobile && subView === 'dettaglio' && !chiuso && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 0', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9' }}>
            <button onClick={() => setShowModuloModal(true)} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Modulo</button>
            <button onClick={() => { setEditingTask(null); setNewTaskParentId(null); setNewTaskReparto(reparti[0] || ''); setShowTaskModal(true); }} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>+ Task</button>
          </div>
        )}
      </div>

      {subView === 'home' && (
        <ProgettoHome commessa={commessa} commessaId={commessaId} tasks={tasks} staff={staff} progettoId={progettoId} isReparto={isReparto} chiuso={chiuso} />
      )}

      {subView === 'dettaglio' && (
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px' : '20px 24px' }}>
              {/* Badge filtri attivi */}
              {Object.entries(colFilters).some(([,v]) => Array.isArray(v) ? v.length > 0 : v !== '') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 4px 10px', flexWrap: 'wrap' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#0054a6" stroke="#0054a6" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#0054a6' }}>Filtri attivi:</span>
                  {Object.entries(colFilters).filter(([,v]) => Array.isArray(v) ? v.length > 0 : v !== '').map(([col, val]) => (
                    <span key={col} style={{ fontSize: 11, background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: 20, padding: '2px 10px', color: '#0054a6', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <b>{col}</b>: {Array.isArray(val) ? val.join(', ') : val}
                      <span onClick={e => { e.stopPropagation(); setColFilters(p => { const n = { ...p }; delete n[col]; return n; }); }} style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 13, lineHeight: 1 }}>&#215;</span>
                    </span>
                  ))}
                  <span onClick={() => setColFilters({})} style={{ fontSize: 11, color: '#dc2626', cursor: 'pointer', textDecoration: 'underline' }}>Rimuovi tutti</span>
                </div>
              )}
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['ID', 'Categoria', 'Attività', 'Priorità', 'Stato', 'Note', 'In carico a', 'Previsto', 'Collaudo', 'Step', ''].map(h => {
                  const DISCRETE = ['Categoria', 'Priorità', 'Stato', 'In carico a', 'Step'];
                  const TEXT = ['Attività', 'Note', 'Previsto', 'Collaudo'];
                  const filterable = DISCRETE.includes(h) || TEXT.includes(h);
                  const fieldMap = { 'Categoria': 'categoria', 'Priorità': 'priorita', 'Stato': 'stato', 'In carico a': 'in_carico_a', 'Step': 'step', 'Attività': 'attivita', 'Note': 'note', 'Previsto': 'previsto', 'Collaudo': 'collaudo' };
                  const field = fieldMap[h];
                  const activeVals = colFilters[h];
                  const hasFilter = activeVals && (Array.isArray(activeVals) ? activeVals.length > 0 : activeVals !== '');
                  const uniqueVals = field ? [...new Set(tasks.filter(t => !isReparto(t) && t[field]).map(t => t[field]))].sort() : [];
                  return (
                    <th key={h} style={{ padding: '10px 10px', textAlign: 'left', fontWeight: 600, fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', position: 'relative', userSelect: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: filterable ? 'pointer' : 'default' }}
                        onClick={e => { e.stopPropagation(); filterable && setColFilterOpen(colFilterOpen === h ? null : h); }}>
                        {h}
                        {filterable && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill={hasFilter ? '#0054a6' : 'none'} stroke={hasFilter ? '#0054a6' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                          </svg>
                        )}
                      </div>
                      {colFilterOpen === h && filterable && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', minWidth: 180, padding: 8 }}
                          onClick={e => e.stopPropagation()}>
                          {DISCRETE.includes(h) ? (
                            <>
                              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, padding: '0 4px' }}>Filtra per {h}</div>
                              {uniqueVals.map(v => {
                                const sel = Array.isArray(activeVals) && activeVals.includes(v);
                                return (
                                  <div key={v} onClick={() => {
                                    const cur = Array.isArray(activeVals) ? activeVals : [];
                                    setColFilters(p => ({ ...p, [h]: sel ? cur.filter(x => x !== v) : [...cur, v] }));
                                  }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: sel ? '#eff6ff' : 'transparent', fontSize: 12, color: sel ? '#0054a6' : '#374151', fontWeight: sel ? 500 : 400 }}
                                    onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                                    onMouseOut={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
                                    <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${sel ? '#0054a6' : '#cbd5e1'}`, background: sel ? '#0054a6' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                      {sel && <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><polyline points="1.5 6 4.5 9 10.5 3"/></svg>}
                                    </div>
                                    {v}
                                  </div>
                                );
                              })}
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, padding: '0 4px' }}>Cerca in {h}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 7, padding: '5px 8px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/></svg>
                                <input autoFocus type="text" value={typeof activeVals === 'string' ? activeVals : ''}
                                  onChange={e => setColFilters(p => ({ ...p, [h]: e.target.value }))}
                                  placeholder={`Cerca...`}
                                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, flex: 1, color: '#0f172a' }} />
                                {activeVals && <span onClick={() => setColFilters(p => ({ ...p, [h]: '' }))} style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>×</span>}
                              </div>
                            </>
                          )}
                          {hasFilter && (
                            <div onClick={() => setColFilters(p => { const n = { ...p }; delete n[h]; return n; })}
                              style={{ marginTop: 6, padding: '5px 8px', fontSize: 11, color: '#dc2626', cursor: 'pointer', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                              Rimuovi filtro
                            </div>
                          )}
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {taskRows.map((row, i) => {
                if (row.type === 'reparto') {
                  return (
                    <tr key={`rep-${row.reparto}`} style={{ background: '#f1f5f9', cursor: 'pointer', borderTop: '1.5px solid #e2e8f0' }}
                      onClick={() => { const cur = isRepartoOpen(row.reparto); setExpandAll(false); setExpanded(p => ({ ...p, [row.reparto]: !cur })); }}>
                      <td style={{ ...tdStyle, color: '#475569', fontFamily: 'monospace', fontSize: '11px', borderBottom: '1px solid #e2e8f0' }}>{row.repartoTask?.task_id_display}</td>
                      <td colSpan={9} style={{ ...tdStyle, color: '#475569', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', fontSize: '11px', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ marginRight: 8 }}>{isRepartoOpen(row.reparto) ? '▼' : '▶'}</span>
                        {row.reparto}
                      </td>
                      <td style={{ ...tdStyle, borderBottom: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button onClick={e => { e.stopPropagation(); setEditingTask(null); setNewTaskParentId(null); setNewTaskReparto(row.reparto); setShowTaskModal(true); }} style={{ background: '#e2e8f0', border: 'none', borderRadius: '6px', padding: '3px 8px', color: '#475569', cursor: 'pointer', fontSize: '11px' }}>+ Task</button>
                          <button onClick={async e => {
                            e.stopPropagation();
                            if (!window.confirm(`Eliminare il modulo "${row.reparto}" e tutti i suoi task?`)) return;
                            const ids = tasks.filter(t => t.reparto === row.reparto).map(t => t.id);
                            if (ids.length > 0) await supabase.from('progetto_task').delete().in('id', ids);
                            if (row.repartoTask?.id) await supabase.from('progetto_task').delete().eq('id', row.repartoTask.id);
                            await loadProgetto();
                          }} style={{ background: 'none', border: 'none', borderRadius: '6px', padding: '3px 6px', color: '#cbd5e1', cursor: 'pointer', fontSize: '12px', transition: 'all 0.15s' }}
                            onMouseOver={e => { e.currentTarget.style.color = '#dc2626'; }}
                            onMouseOut={e => { e.currentTarget.style.color = '#cbd5e1'; }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                }
                const task = row.task;
                const sc = STATO_COL[task.stato] || STATO_COL['Da Iniziare'];
                const pc = PRIORITA_COLORS[task.priorita] || PRIORITA_COLORS.media;
                const depth = (task.task_id_display?.split('.').length - 2) * 14;
                return (
                  <tr key={task.id}
                    onClick={() => {
                      if (task.attivita_id) { openCardPreview(task.attivita_id); return; }
                      if (!chiuso) { setEditingTask(task); setShowTaskModal(true); }
                    }}
                    onMouseOver={e => e.currentTarget.style.background = task.attivita_id ? '#f0fdf8' : '#f8fafc'}
                    onMouseOut={e => e.currentTarget.style.background = task.attivita_id ? '#f8fffe' : '#fff'}
                    style={{ background: task.attivita_id ? '#f8fffe' : '#fff', borderLeft: task.attivita_id ? '2px solid #9FE1CB' : 'none', cursor: 'pointer' }}>
                    <td style={{ ...tdStyle, color: '#94a3b8', fontFamily: 'monospace', paddingLeft: 10 + Math.max(0, depth) }}>{task.task_id_display}</td>
                    <td style={{ ...tdStyle, color: '#475569' }}>{task.categoria}</td>
                    <td style={{ ...tdStyle, color: '#0f172a', fontWeight: 500, minWidth: 160 }}>{task.attivita}</td>
                    <td style={{ ...tdStyle }}>
                      {task.priorita && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: pc.bg, color: pc.text, fontWeight: 500, border: `0.5px solid ${pc.border}` }}>{task.priorita}</span>}
                    </td>
                    <td style={{ ...tdStyle }}>
                      {task.stato && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: sc.bg, color: sc.text, fontWeight: 500, border: `0.5px solid ${sc.border}`, whiteSpace: 'nowrap' }}>{task.stato}</span>}
                    </td>
                    <td style={{ ...tdStyle, color: '#64748b', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={task.note}>{task.note}</td>
                    <td style={{ ...tdStyle, color: '#475569', whiteSpace: 'nowrap' }}>
                      {task.in_carico_a === 'CLIENTE' && commessa?.clientName ? commessa.clientName
                       : task.in_carico_a === 'ZCS/CLIENTE' && commessa?.clientName ? `ZCS/${commessa.clientName}`
                       : task.in_carico_a}
                    </td>
                    <td style={{ ...tdStyle, color: '#475569', whiteSpace: 'nowrap' }}>{task.previsto ? new Date(task.previsto).toLocaleDateString('it-IT') : ''}</td>
                    <td style={{ ...tdStyle, color: '#475569', whiteSpace: 'nowrap' }}>{task.collaudo ? new Date(task.collaudo).toLocaleDateString('it-IT') : ''}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {task.step && <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: '50%', background: '#eff6ff', color: '#0054a6', fontSize: '11px', fontWeight: 700, lineHeight: '20px', textAlign: 'center', border: '1px solid #bfdbfe' }}>{task.step}</span>}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                      {task.attivita_id ? (
                        <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>da workflow</span>
                      ) : (<>
                        <button onClick={e => { e.stopPropagation(); if (!chiuso) { setEditingTask(null); setNewTaskParentId(task.id); setNewTaskReparto(task.reparto); setShowTaskModal(true); } }} style={{ background: 'none', border: 'none', cursor: chiuso ? 'default' : 'pointer', color: chiuso ? '#e2e8f0' : '#94a3b8', fontSize: '13px', marginRight: 4 }} title="Sub-task">↳</button>
                        <button onClick={e => { e.stopPropagation(); deleteTask(task.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', fontSize: '13px' }} title="Elimina">🗑</button>
                      </>)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

{subView === 'gantt' && (
  <DesktopOnly label="Gantt progetto">
    <ProgettoGantt
      tasks={tasks.filter(t => !isReparto(t))}
      reparti={reparti}
      isReparto={isReparto}
      commessaId={commessaId}
      onTaskClick={(task) => { if (task.attivita_id) { openCardPreview(task.attivita_id); return; } if (!chiuso) { setEditingTask(task); setShowTaskModal(true); } }}
    />
  </DesktopOnly>
)}
      {subView === 'avanzamento' && (
        <DesktopOnly label="Avanzamento">
          <AvanzamentoView tasks={tasks.filter(t => !isReparto(t))} clientName={commessa?.clientName} />
        </DesktopOnly>
      )}

      {subView === 'consuntivi' && <ConsuntiviView progettoId={progettoId} commessaId={commessaId} />}
      {subView === 'note' && <NoteProgetto progettoId={progettoId} staff={staff} currentUser={currentUser} commessa={commessa} chiuso={chiuso} />}

      {showModuloModal && !chiuso && <ModuloModal progettoId={progettoId} repartiEsistenti={reparti} onClose={() => { setShowModuloModal(false); loadProgetto(); }} />}
      {showTaskModal && (editingTask?.attivita_id ? true : !chiuso) && (
        <TaskModal task={editingTask} reparti={reparti} defaultReparto={newTaskReparto} defaultParentId={newTaskParentId} onSave={saveTask} clientName={commessa?.clientName} readOnly={!!(chiuso || editingTask?.attivita_id)} onClose={() => { setShowTaskModal(false); setEditingTask(null); }} />
      )}
      {cardPreview && (
        <CardPreviewModal
          card={cardPreview}
          colonnaNome={cardPreview.colonna?.nome || colonneMap[cardPreview.colonna_id]}
          onClose={() => setCardPreview(null)}
        />
      )}
    </div>
  );
}

export function ModuloModal({ progettoId, repartiEsistenti, onClose }) {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!nome.trim()) { setError('Inserisci un nome per il modulo.'); return; }
    if (repartiEsistenti.map(r => r.toUpperCase()).includes(nome.trim().toUpperCase())) { setError('Un modulo con questo nome esiste già.'); return; }
    setSaving(true);
    const nextOrdine = repartiEsistenti.length * 100;
    const nextId = String(repartiEsistenti.length + 1);
    const { error: err } = await supabase.from('progetto_task').insert({
      progetto_id: progettoId, task_id_display: nextId, reparto: nome.trim().toUpperCase(),
      categoria: null, attivita: null, stato: null, ordine: nextOrdine,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '360px' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}><h3>Nuovo modulo</h3></div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Nome modulo <span style={{ color: '#dc2626' }}>*</span></label>
          <input placeholder="es. PRODUZIONE, LOGISTICA..." value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} style={{ textTransform: 'uppercase' }} autoFocus />
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>Moduli esistenti: {repartiEsistenti.join(', ') || '—'}</div>
        </div>
        {error && <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '10px', padding: '6px 10px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>{error}</div>}
        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOSTITUISCI SOLO LA FUNZIONE ProgettoHome in ProgettiView.jsx
// Tutto il resto del file rimane invariato.
// Assicurati che BolleCommessa sia importato da KPIView.jsx —
// è già presente nell'import originale del file:
//   import { BolleCommessa } from './KPIView.jsx';
// ─────────────────────────────────────────────────────────────────────────────


export function ProgettoHome({ commessa, commessaId, tasks, staff, progettoId, isReparto, chiuso }) {
  const [consuntivi, setConsuntivi] = useState([]);
  const [ordini, setOrdini] = useState([]);
  const [bolleConsulenza, setBolleConsulenza] = useState([]);
  const [bolleSviluppo, setBolleSviluppo] = useState([]);
  const [consuntiviSviluppo, setConsuntiviSviluppo] = useState([]);
  const [consuntiviPerBolla, setConsuntiviPerBolla] = useState({});
  const [bollaSelezionata, setBollaSelezionata] = useState(null);
  const [searchBolle, setSearchBolle] = useState(false); // toggle chiuse
  // ── Attività sviluppo (da workflow) ──
  const [attivitaSviluppo, setAttivitaSviluppo] = useState([]);
  const isMobile = useIsMobile();
  const reparti = [...new Set(tasks.filter(t => isReparto(t)).map(t => t.reparto).filter(Boolean))];
 
  const loadData = async () => {
    // 1. Bolle consulenza
    const { data: bolleConsData } = await supabase
      .from('commessa_bolle')
      .select('bolla_id, bolle_lavoro(id, codice, descrizione, giorni_disponibili, ore_previste)')
      .eq('commessa_id', commessaId)
      .eq('tipo', 'consulenza');
    const bCons = (bolleConsData || []).map(r => r.bolle_lavoro).filter(Boolean);
    setBolleConsulenza(bCons);
 
    // 2. Bolle sviluppo
    const { data: bolleSvilData } = await supabase
      .from('commessa_bolle')
      .select('bolla_id, bolle_lavoro(id, codice, descrizione, giorni_disponibili, ore_previste)')
      .eq('commessa_id', commessaId)
      .eq('tipo', 'sviluppo');
    const bSvil = (bolleSvilData || []).map(r => r.bolle_lavoro).filter(Boolean);
    setBolleSviluppo(bSvil);
 
    // 3. Consuntivi per tutte le bolle
    const codiciCons = bCons.map(b => b.codice).filter(Boolean);
    const codiciSvil = bSvil.map(b => b.codice).filter(Boolean);
    const tuttiCodici = [...new Set([...codiciCons, ...codiciSvil])];
    let tuttiCons = [];
    if (tuttiCodici.length > 0) {
      const { data } = await supabase
        .from('consuntivi_globali')
        .select('codice_bolla, ore_tecniche, ore_pagamento')
        .in('codice_bolla', tuttiCodici);
      tuttiCons = data || [];
    }
    const perBolla = {};
    tuttiCons.forEach(c => {
      if (!perBolla[c.codice_bolla]) perBolla[c.codice_bolla] = { oreTec: 0, orePag: 0 };
      perBolla[c.codice_bolla].oreTec += parseFloat(c.ore_tecniche) || 0;
      perBolla[c.codice_bolla].orePag += parseFloat(c.ore_pagamento) || 0;
    });
    setConsuntiviPerBolla(perBolla);
    const cons = tuttiCons.filter(c => codiciCons.includes(c.codice_bolla));
    setConsuntivi(cons);
    const consSvil = tuttiCons.filter(c => codiciSvil.includes(c.codice_bolla));
    setConsuntiviSviluppo(consSvil);
 
    // 4. Attività sviluppo dalla commessa (workflow)
    const { data: atts } = await supabase
      .from('attivita')
      .select('id, titolo, data_rilascio, colonna_id, colonna:colonna_id(nome)')
      .eq('commessa_id', commessaId);
    setAttivitaSviluppo(atts || []);
 
    // 5. Ordini cliente — carica per commessa_id (slegati dal progetto)
    const { data: ord } = await supabase
      .from('ordini_cliente')
      .select('*')
      .eq('commessa_id', commessaId)
      .order('codice');
    setOrdini(ord || []);
  };
 
  useEffect(() => { loadData(); }, [progettoId, commessaId]);
 
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const taskList = tasks.filter(t => !isReparto(t));
  const STATI = ['Da Iniziare', 'Da approfondire', 'In Corso', 'Da collaudare', 'Chiusa'];
  const totale = taskList.length;
  const chiuse = taskList.filter(t => t.stato === 'Chiusa').length;
  const percComplete = totale > 0 ? Math.round((chiuse / totale) * 100) : 0;
  const inRitardo = taskList.filter(t => {
    if (t.stato === 'Chiusa') return false;
    if (!t.previsto) return false;
    const [y, m, d] = t.previsto.split('-').map(Number);
    return new Date(y, m - 1, d) < today;
  }).length;
 
  // KPI consulenza
  const oreTecCons = consuntivi.reduce((s, c) => s + (parseFloat(c.ore_tecniche) || 0), 0);
  const orePagCons = consuntivi.reduce((s, c) => s + (parseFloat(c.ore_pagamento) || 0), 0);
  const efficaciaCons = oreTecCons > 0 ? (orePagCons / oreTecCons * 100) : null;
  const giorniDispCons = bolleConsulenza.reduce((s, b) => s + (b.ore_previste ? b.ore_previste / 8 : (b.giorni_disponibili || 0)), 0);
  const giorniSvoltiCons = oreTecCons / 8;
  const giorniResiduiCons = giorniDispCons - giorniSvoltiCons;
 
  // KPI sviluppo (consuntivi per compatibilità report PDF)
  const oreTecSvil = consuntiviSviluppo.reduce((s, c) => s + (parseFloat(c.ore_tecniche) || 0), 0);
  const orePagSvil = consuntiviSviluppo.reduce((s, c) => s + (parseFloat(c.ore_pagamento) || 0), 0);
  const giorniDispSvil = bolleSviluppo.reduce((s, b) => s + (b.ore_previste ? b.ore_previste / 8 : (b.giorni_disponibili || 0)), 0);
  const giorniSvoltiSvil = oreTecSvil / 8;
  const giorniResiduiSvil = giorniDispSvil - giorniSvoltiSvil;
  const efficaciaSvil = oreTecSvil > 0 ? (orePagSvil / oreTecSvil * 100) : null;
 
  // KPI attività sviluppo workflow
  const isColonnaChiusa = (col) => col && /complet|annullat|done|chiusa/i.test(col);
  const attSvilTotale = attivitaSviluppo.length;
  const attSvilChiuse = attivitaSviluppo.filter(a => isColonnaChiusa(a.colonna?.nome)).length;
  const attSvilAperte = attSvilTotale - attSvilChiuse;
  const attSvilInRitardo = attivitaSviluppo.filter(a => {
    if (isColonnaChiusa(a.colonna?.nome)) return false;
    if (!a.data_rilascio) return false;
    const [y, m, d] = a.data_rilascio.split('-').map(Number);
    return new Date(y, m - 1, d) < today;
  }).length;
 
  // KPI economici
  const COSTO_ORA = 42;
  const valoreProgetto = ordini.reduce((s, o) => s + (parseFloat(o.importo) || 0), 0);
  const costoProgetto = (oreTecCons + oreTecSvil) * COSTO_ORA;
  const margine = valoreProgetto - costoProgetto;
  const marginePerc = valoreProgetto > 0 ? (margine / valoreProgetto * 100) : null;
  const costoPct = valoreProgetto > 0 ? Math.min(100, costoProgetto / valoreProgetto * 100) : 0;
  const marginColor = margine >= 0 ? '#3B6D11' : '#A32D2D';
  const marginBarColor = margine >= 0 ? '#639922' : '#E24B4A';
  const statiCounts = STATI.map(s => ({ stato: s, count: taskList.filter(t => t.stato === s).length }));
 
  let giorniRim = null;
  if (commessa?.data_fine) {
    const [y, m, d] = commessa.data_fine.split('-').map(Number);
    giorniRim = Math.ceil((new Date(y, m - 1, d) - today) / 86400000);
  }
 
  const teamMembers = (commessa?.team || []).map(sKey => {
    const s = staff.find(x => staffKey(x) === sKey);
    return s
      ? { label: staffLabel(s), initials: getInitials(staffLabel(s)), color: getAvatarColor(staffLabel(s)) }
      : { label: sKey, initials: getInitials(sKey), color: getAvatarColor(sKey) };
  });
 
  const pm = commessa?.pm_commessa ? (() => {
    const s = staff.find(x => staffKey(x) === commessa.pm_commessa);
    return s
      ? { label: staffLabel(s), initials: getInitials(staffLabel(s)), color: getAvatarColor(staffLabel(s)) }
      : { label: commessa.pm_commessa, initials: getInitials(commessa.pm_commessa), color: getAvatarColor(commessa.pm_commessa) };
  })() : null;
 
  const fmtDate = (str) => {
    if (!str) return '—';
    const [y, m, d] = str.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  };
  const fmtNum = (n, dec = 1) => (Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec)).toFixed(dec).replace('.', ',');
  const efficaciaColor = (e) => e === null ? '#94a3b8' : e >= 80 ? '#27500a' : e >= 60 ? '#633806' : '#791f1f';
 
  const residuoPct = (residuo, disponibile) => {
    if (!disponibile) return 0;
    return Math.max(0, Math.min(100, (residuo / disponibile) * 100));
  };
  const residuoColor = (pct) => pct > 40 ? '#639922' : pct > 15 ? '#BA7517' : '#E24B4A';
 
  // ── Componente KPI Consulenza ──────────────────────────────────────────────
  const KpiGiorni = ({ label, accent, accentLight, accentBorder, giorniDisp, giorniSvolti, giorniResidui, oreTec, orePag, efficacia, bolle }) => {
    const pct = residuoPct(giorniResidui, giorniDisp);
    const col = residuoColor(pct);
    const hasData = giorniDisp > 0 || oreTec > 0;
    return (
      <div style={{ background: '#fff', borderRadius: '12px', border: `0.5px solid ${accentBorder}`, padding: '16px 18px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
          {bolle.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {bolle.map(b => (
                <span key={b.id} style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, color: accent, background: accentLight, border: `0.5px solid ${accentBorder}`, borderRadius: '4px', padding: '1px 5px' }}>{b.codice}</span>
              ))}
            </div>
          )}
        </div>
        {!hasData ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nessuna bolla associata</div>
        ) : (
          <>
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Giorni residui</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '24px', fontWeight: 500, color: col, lineHeight: 1 }}>{fmtNum(Math.max(0, giorniResidui))}</span>
                {giorniDisp > 0 && <span style={{ fontSize: '11px', color: '#94a3b8' }}>su {fmtNum(giorniDisp)} disponibili</span>}
              </div>
              {giorniDisp > 0 && (
                <div style={{ marginTop: '6px', height: 5, background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              )}
            </div>
            <div style={{ borderTop: '0.5px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Giorni tecnici</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{fmtNum(oreTec / 8)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Giorni pagamento</span>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{fmtNum(orePag / 8)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Efficacia</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: efficaciaColor(efficacia) }}>
                  {efficacia !== null ? `${fmtNum(efficacia)}%` : '—'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };
 
  // ── Componente KPI Sviluppo workflow ────────────────────────────────────────
  const KpiSviluppo = () => (
    <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #9FE1CB', padding: '16px 18px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0F6E56', flexShrink: 0 }} />
        <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sviluppo</div>
      </div>
 
      {attSvilTotale === 0 ? (
        <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nessuna attività di sviluppo</div>
      ) : (
        <>
          {/* Numero grande: totale */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>Attività totali</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '28px', fontWeight: 500, color: '#0F6E56', lineHeight: 1 }}>{attSvilTotale}</span>
            </div>
            {/* Barra aperte/chiuse */}
            <div style={{ marginTop: '8px', height: 5, background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${attSvilTotale > 0 ? (attSvilChiuse / attSvilTotale * 100) : 0}%`, height: '100%', background: '#0F6E56', borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
              {attSvilTotale > 0 ? Math.round(attSvilChiuse / attSvilTotale * 100) : 0}% completate
            </div>
          </div>
 
          {/* Dettaglio */}
          <div style={{ borderTop: '0.5px solid #f1f5f9', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F6E56' }} />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Aperte</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{attSvilAperte}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8' }} />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Chiuse</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>{attSvilChiuse}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: attSvilInRitardo > 0 ? '#E24B4A' : '#e2e8f0' }} />
                <span style={{ fontSize: '11px', color: attSvilInRitardo > 0 ? '#dc2626' : '#64748b', fontWeight: attSvilInRitardo > 0 ? 600 : 400 }}>In ritardo</span>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 600, color: attSvilInRitardo > 0 ? '#dc2626' : '#94a3b8' }}>{attSvilInRitardo}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
 
  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px' : '24px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '18px' }}>
 
      {/* ── HEADER NAVY SOTTILE ── */}
      <div style={{ background: '#001d47', borderRadius: '12px', padding: isMobile ? '12px 16px' : '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '3px' }}>
            {commessa?.clientName || '—'}
          </div>
          <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 500, color: '#fff', lineHeight: 1.25 }}>
            {commessa?.nome_commessa || 'Progetto'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{fmtDate(commessa?.data_inizio)}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>→</span>
            <span>{fmtDate(commessa?.data_fine)}</span>
          </div>
          <span style={{ fontSize: '10px', padding: '2px 9px', borderRadius: '20px', fontWeight: 500, border: `1px solid ${commessa?.attiva !== false ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}`, color: commessa?.attiva !== false ? '#fff' : 'rgba(255,255,255,0.4)' }}>
            {commessa?.attiva !== false ? 'Attiva' : 'Chiusa'}
          </span>
          {giorniRim !== null && (
            <span style={{ fontSize: '11px', color: giorniRim < 0 ? '#fca5a5' : giorniRim < 14 ? '#fcd34d' : 'rgba(255,255,255,0.45)' }}>
              {giorniRim < 0 ? `${Math.abs(giorniRim)}g scaduta` : `${giorniRim}g al termine`}
            </span>
          )}
          {!isMobile && (
            <RelazioneProgettoPDF
              commessa={commessa} tasks={tasks} isReparto={isReparto} reparti={reparti}
              oreTecCons={oreTecCons} orePagCons={orePagCons} giorniDispCons={giorniDispCons}
              giorniSvoltiCons={giorniSvoltiCons} giorniResiduiCons={giorniResiduiCons}
              oreTecSvil={oreTecSvil} orePagSvil={orePagSvil} giorniDispSvil={giorniDispSvil}
              giorniSvoltiSvil={giorniSvoltiSvil} giorniResiduiSvil={giorniResiduiSvil}
              bolleConsulenza={bolleConsulenza} bolleSviluppo={bolleSviluppo}
            />
          )}
        </div>
      </div>
 
      {/* ── CARD PM + TEAM ── */}
      {(pm || teamMembers.length > 0) && (
        <div style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #e2e8f0', padding: isMobile ? '14px 16px' : '16px 22px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          {pm && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: pm.color.bg, color: pm.color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500, flexShrink: 0 }}>{pm.initials}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{pm.label}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>PM</div>
              </div>
            </div>
          )}
          {pm && teamMembers.length > 0 && <div style={{ width: 1, height: 28, background: '#e2e8f0', flexShrink: 0 }} />}
          {teamMembers.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>Team</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {teamMembers.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div title={m.label} style={{ width: 30, height: 30, borderRadius: '50%', background: m.color.bg, color: m.color.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, border: `1px solid ${m.color.text}22`, flexShrink: 0 }}>{m.initials}</div>
                    <span style={{ fontSize: '12px', color: '#475569' }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
 
      {/* ── KPI ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
 
        {/* Giorni progetto + Sviluppo affiancati — 2 colonne */}
        <div style={{ display: 'flex', gap: '12px', gridColumn: isMobile ? '1' : '1 / 3', flexDirection: isMobile ? 'column' : 'row' }}>
          <KpiGiorni
            label="Giorni progetto"
            accent="#185FA5"
            accentLight="#E6F1FB"
            accentBorder="#B5D4F4"
            giorniDisp={giorniDispCons}
            giorniSvolti={giorniSvoltiCons}
            giorniResidui={giorniResiduiCons}
            oreTec={oreTecCons}
            orePag={orePagCons}
            efficacia={efficaciaCons}
            bolle={[]}
          />
          <KpiSviluppo />
        </div>
 
        {/* Attività totali */}
        <div style={{ background: '#fff', borderRadius: '12px', border: `0.5px solid ${inRitardo > 0 ? '#fecaca' : '#e2e8f0'}`, padding: '16px 18px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Attività totali</div>
          <div style={{ fontSize: '26px', fontWeight: 500, color: '#0f172a', lineHeight: 1 }}>{totale}</div>
          <div style={{ margin: '10px 0 4px', height: 5, background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${percComplete}%`, height: '100%', background: '#0054a6', borderRadius: '3px' }} />
          </div>
          <div style={{ fontSize: '11px', color: '#64748b' }}>{percComplete}% completate</div>
          <div style={{ borderTop: '0.5px solid #f1f5f9', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: inRitardo > 0 ? '#dc2626' : '#94a3b8', fontWeight: 500 }}>⚠ In ritardo</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: inRitardo > 0 ? '#dc2626' : '#94a3b8', lineHeight: 1 }}>
              {inRitardo}
              <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400, marginLeft: 4 }}>{totale - chiuse > 0 ? `su ${totale - chiuse} aperte` : ''}</span>
            </span>
          </div>
        </div>
 
        {/* Economico */}
        <div style={{ background: '#fff', borderRadius: '12px', border: `0.5px solid ${margine >= 0 && valoreProgetto > 0 ? '#C0DD97' : valoreProgetto === 0 ? '#e2e8f0' : '#fecaca'}`, padding: '16px 18px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)', gridColumn: isMobile ? '1' : 'auto' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Economico</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Valore</span>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#185FA5' }}>{valoreProgetto > 0 ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valoreProgetto) : '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0 }}>Costo</span>
              <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${costoPct}%`, height: '100%', background: '#D85A30', borderRadius: '2px' }} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: '#D85A30', flexShrink: 0 }}>{costoProgetto > 0 ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(costoProgetto) : '—'}</span>
            </div>
            <div style={{ borderTop: '0.5px solid #f1f5f9', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#64748b', flexShrink: 0 }}>Margine</span>
              <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                {marginePerc !== null && <div style={{ width: `${Math.min(100, Math.abs(marginePerc))}%`, height: '100%', background: marginBarColor, borderRadius: '2px' }} />}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: marginColor, flexShrink: 0 }}>
                {valoreProgetto > 0 ? `${fmtNum(marginePerc)}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
 
      {/* ── RIEPILOGO ATTIVITÀ + ORDINI CLIENTE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '18px' }}>
 
        {/* Riepilogo attività (ex Distribuzione stati) */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #e2e8f0', padding: isMobile ? '16px' : '20px 22px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Riepilogo attività</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {statiCounts.map(({ stato, count }) => {
              const pct = totale > 0 ? (count / totale * 100) : 0;
              const sc = STATO_COLORS[stato];
              return (
                <div key={stato} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 110, flexShrink: 0 }}>
                    <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: sc.bg, color: sc.text, fontWeight: 500, border: `0.5px solid ${sc.border}`, whiteSpace: 'nowrap' }}>{stato}</span>
                  </div>
                  <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: STATI_COLORS_BAR[stato], borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '12px', color: '#64748b', minWidth: 18, textAlign: 'right' }}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
 
        {/* Ordini cliente (ex Documenti di progetto) */}
        <div style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #e2e8f0', padding: isMobile ? '16px' : '20px 22px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ordini cliente</div>
            <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Gestiti dalla commessa</span>
          </div>
          {ordini.length === 0 ? (
            <div style={{ border: '0.5px solid #e2e8f0', borderRadius: '10px', padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>Nessun ordine cliente associato</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {['Codice', 'Numero', 'Data', 'Importo (€)'].map((h, i) => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: i >= 3 ? 'right' : 'left', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ordini.map((o, i) => (
                    <tr key={o.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#0054a6' }}>{o.codice}</td>
                      <td style={{ padding: '9px 12px', color: '#475569' }}>{o.numero}</td>
                      <td style={{ padding: '9px 12px', color: '#475569' }}>{o.data ? new Date(o.data + 'T00:00:00').toLocaleDateString('it-IT') : '—'}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                        {o.importo ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(o.importo) : '—'}
                      </td>
 
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
 
      {/* ── BOLLE DI LAVORO ── */}
      {(() => {
        const tutteBolle = [
          ...bolleConsulenza.map(b => ({ ...b, _tipo: 'consulenza' })),
          ...bolleSviluppo.map(b => ({ ...b, _tipo: 'sviluppo' })),
        ];
        const bolleConDati = tutteBolle.map(b => {
          const giorniDisp = b.ore_previste ? (b.ore_previste / 8) : (b.giorni_disponibili || 0);
          const cb = consuntiviPerBolla[b.codice] || { oreTec: 0, orePag: 0 };
          const svolti = cb.oreTec / 8;
          const pagamento = cb.orePag / 8;
          const residui = giorniDisp - svolti;
          const pct = giorniDisp > 0 ? Math.max(0, Math.min(100, (svolti / giorniDisp) * 100)) : 0;
          const barColor = pct < 70 ? '#639922' : pct < 90 ? '#BA7517' : '#E24B4A';
          const isChiusa = giorniDisp > 0 && residui <= 0;
          return { ...b, giorniDisp, svolti, pagamento, residui, pct, barColor, isChiusa };
        });
        const [searchTesto, setSearchTesto] = useState('');
        const [mostraChiuse, setMostraChiuse] = useState(false);
        const bolleFiltered = searchTesto.trim()
          ? bolleConDati.filter(b =>
              b.codice?.toLowerCase().includes(searchTesto.toLowerCase()) ||
              (b.descrizione || '').toLowerCase().includes(searchTesto.toLowerCase()))
          : bolleConDati;
        const bolleAperte = bolleFiltered.filter(b => !b.isChiusa);
        const bolleChiuse = bolleFiltered.filter(b => b.isChiusa);
        const coloriTipo = {
          consulenza: { accent: '#185FA5', accentLight: '#E6F1FB', accentBorder: '#B5D4F4' },
          sviluppo:   { accent: '#0F6E56', accentLight: '#E1F5EE', accentBorder: '#9FE1CB' },
        };
        const BollaRow = ({ b }) => {
          const { accent, accentLight, accentBorder } = coloriTipo[b._tipo] || coloriTipo.consulenza;
          return (
            <div onClick={() => setBollaSelezionata({ ...b, accent, accentLight, accentBorder, tipo: b._tipo })}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: `0.5px solid ${accentBorder}`, background: accentLight, cursor: 'pointer', transition: 'all 0.12s', opacity: b.isChiusa ? 0.65 : 1 }}
              onMouseOver={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}>
              <span style={{ fontSize: '9px', fontWeight: 700, color: accent, background: '#fff', border: `0.5px solid ${accentBorder}`, borderRadius: '4px', padding: '1px 5px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {b._tipo === 'consulenza' ? 'cons' : 'svil'}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: accent, flexShrink: 0 }}>{b.codice}</span>
              <span style={{ fontSize: '12px', color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.descrizione || '—'}</span>
              <div style={{ width: 48, flexShrink: 0 }}>
                <div style={{ height: 4, background: '#fff', borderRadius: '2px', overflow: 'hidden', border: `0.5px solid ${accentBorder}` }}>
                  <div style={{ width: `${b.pct}%`, height: '100%', background: b.barColor, borderRadius: '2px' }} />
                </div>
              </div>
              <div style={{ flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: b.isChiusa ? '#94a3b8' : accent, fontFamily: 'monospace' }}>{b.residui.toFixed(1)}g res.</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{b.giorniDisp.toFixed(1)}g tot.</div>
              </div>
              <span style={{ fontSize: '10px', color: '#94a3b8' }}>›</span>
            </div>
          );
        };
        return (
          <div style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #e2e8f0', padding: isMobile ? '16px' : '20px 22px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Bolle di lavoro
                {tutteBolle.length > 0 && <span style={{ color: '#cbd5e1', fontWeight: 400, marginLeft: 6 }}>{bolleAperte.length} aperte{bolleChiuse.length > 0 ? ` · ${bolleChiuse.length} chiuse` : ''}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', flex: 1, maxWidth: 280 }}>
                <svg width="12" height="12" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0 }}><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <input type="text" placeholder="Cerca per codice o descrizione..." value={searchTesto} onChange={e => setSearchTesto(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: '12px', background: 'transparent', color: '#0f172a', flex: 1 }} />
                {searchTesto && <button onClick={() => setSearchTesto('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>}
              </div>
            </div>
            {tutteBolle.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic', border: '0.5px dashed #e2e8f0', borderRadius: '8px' }}>Nessuna bolla associata a questa commessa</div>
            ) : (
              <>
                {bolleAperte.length > 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: bolleChiuse.length > 0 ? '14px' : 0 }}>{bolleAperte.map(b => <BollaRow key={b.id + b._tipo} b={b} />)}</div>}
                {bolleAperte.length === 0 && searchTesto && <div style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginBottom: 12 }}>Nessuna bolla aperta trovata</div>}
                {bolleChiuse.length > 0 && (
                  <div style={{ borderTop: bolleAperte.length > 0 ? '1px solid #f1f5f9' : 'none', paddingTop: bolleAperte.length > 0 ? '12px' : 0 }}>
                    <div onClick={() => setMostraChiuse(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none', marginBottom: mostraChiuse ? '10px' : 0 }}>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{mostraChiuse ? '▼' : '▶'}</span>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chiuse ({bolleChiuse.length})</span>
                    </div>
                    {mostraChiuse && <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>{bolleChiuse.map(b => <BollaRow key={b.id + b._tipo} b={b} />)}</div>}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })()}
 
      {/* ── MODALE DETTAGLIO BOLLA ── */}
      {bollaSelezionata && (() => {
        const b = bollaSelezionata;
        const efficacia = b.svolti > 0 ? (b.pagamento / b.svolti * 100) : null;
        const efficaciaColor = efficacia === null ? '#94a3b8' : efficacia >= 80 ? '#27500a' : efficacia >= 60 ? '#633806' : '#791f1f';
        const efficaciaBg = efficacia === null ? '#f8fafc' : efficacia >= 80 ? '#f0fdf4' : efficacia >= 60 ? '#fffbeb' : '#fef2f2';
        const efficaciaBorder = efficacia === null ? '#e2e8f0' : efficacia >= 80 ? '#86efac' : efficacia >= 60 ? '#fcd34d' : '#fca5a5';
        const fmtG = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
        return (
          <div className="modal-overlay" onClick={() => setBollaSelezionata(null)}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '420px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', position: 'relative' }}>
              <div style={{ background: '#001d47', padding: '22px 24px 20px', position: 'relative' }}>
                <button onClick={() => setBollaSelezionata(null)} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '14px', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Bolla di lavoro</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.12)', padding: '4px 12px', borderRadius: '8px' }}>{b.codice}</span>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', background: b.accent, color: '#fff', fontWeight: 600 }}>{b._tipo === 'consulenza' ? 'Consulenza' : 'Sviluppo'}</span>
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.4, fontWeight: 400 }}>{b.descrizione || '—'}</div>
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Avanzamento</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: b.accent }}>{Math.round(b.pct)}%</span>
                  </div>
                  <div style={{ height: 8, background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${b.pct}%`, height: '100%', background: b.barColor, borderRadius: '4px', transition: 'width 0.4s' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', background: '#f8fafc', borderRadius: '12px', padding: '16px', border: '0.5px solid #e2e8f0' }}>
                  {[{ label: 'PREVISTI', val: fmtG(b.giorniDisp), color: '#0f172a' }, { label: 'SVOLTI', val: fmtG(b.svolti), color: '#185FA5' }, { label: 'RESIDUI', val: fmtG(Math.max(0, b.residui)), color: b.barColor }, { label: 'PAGAMENTO', val: fmtG(b.pagamento), color: '#475569' }].map(({ label, val, color }) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color, lineHeight: 1, marginBottom: '4px' }}>{val}</div>
                      <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>{label}</div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'center', background: efficaciaBg, borderRadius: '8px', padding: '4px 2px', border: `1px solid ${efficaciaBorder}` }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: efficaciaColor, lineHeight: 1, marginBottom: '4px' }}>{efficacia !== null ? `${Math.round(efficacia)}%` : '—'}</div>
                    <div style={{ fontSize: '9px', color: efficaciaColor, fontWeight: 600, letterSpacing: '0.05em' }}>EFFICACIA</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
 
 
    </div>
  );
}

export function OrdineModal({ progettoId, onClose }) {
  const [codice, setCodice] = useState('');
  const [numero, setNumero] = useState('');
  const [data, setData] = useState('');
  const [importo, setImporto] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!codice.trim() || !numero.trim()) { setError('Codice e numero sono obbligatori.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('ordini_cliente').insert({
      progetto_id: progettoId, codice: codice.trim().toUpperCase(), numero: numero.trim(),
      data: data || null, importo: parseFloat(String(importo).replace(',', '.')) || 0,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position:'relative', minWidth:'340px' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight:'44px' }}><h3>Nuovo ordine cliente</h3></div>
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Codice <span style={{ color:'#dc2626' }}>*</span></label>
              <input placeholder="es. ABCDE" value={codice} onChange={e => setCodice(e.target.value)} maxLength={5} style={{ textTransform:'uppercase', fontFamily:'monospace', letterSpacing:'0.1em' }} autoFocus />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Numero <span style={{ color:'#dc2626' }}>*</span></label>
              <input placeholder="es. 42" value={numero} onChange={e => setNumero(e.target.value)} maxLength={4} />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Data</label>
              <DatePicker value={data} onChange={setData} />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label>Importo (€)</label>
              <input placeholder="es. 15000,00" value={importo} onChange={e => setImporto(e.target.value)} />
            </div>
          </div>
          {error && <div style={{ color:'#dc2626', fontSize:'12px', padding:'6px 10px', background:'#fef2f2', borderRadius:'6px', border:'1px solid #fecaca' }}>{error}</div>}
        </div>
        <div className="modal-actions" style={{ marginTop:'20px' }}>
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOSTITUISCI SOLO LA FUNZIONE ProgettoGantt in ProgettiView.jsx
// Aggiunge indicatori di rilascio attività sviluppo sulla timeline
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SOSTITUISCI SOLO LA FUNZIONE ProgettoGantt in ProgettiView.jsx
// Aggiunge indicatori di rilascio attività sviluppo sulla timeline
// ─────────────────────────────────────────────────────────────────────────────

export function ProgettoGantt({ tasks, reparti, isReparto, onTaskClick, commessaId }) {
  const scrollRef = React.useRef(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [filterStato, setFilterStato] = useState([]);
  const [filterInCarico, setFilterInCarico] = useState([]);
  const [expandAll, setExpandAll] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [cardPreview, setCardPreview] = useState(null);

  const openCardPreview = async (attId) => {
    const { data: att } = await supabase
      .from('attivita')
      .select('*, bolla:bolla_id(codice), colonna:colonna_id(nome)')
      .eq('id', attId)
      .single();
    if (!att) return;
    setCardPreview({ ...att, assegnata: att.assegnata || att.assegnata_a });
  };

  // Attività sviluppo con data_rilascio
  const [attivitaSviluppo, setAttivitaSviluppo] = useState([]);
  const [bolleMap, setBolleMap] = useState({}); // { bolla_id: { codice, descrizione } }
  const [colonneMap, setColonneMap] = useState({}); // { colonna_id: nome_colonna }
  
  useEffect(() => {
    if (!commessaId) return;
    const load = async () => {
      // Attività con data_rilascio associate alla commessa
      const { data: att } = await supabase
        .from('attivita')
        .select('id, titolo, data_rilascio, bolla_id, colonna_id, priorita')
        .eq('commessa_id', commessaId)
        .not('data_rilascio', 'is', null);

      if (!att || att.length === 0) { setAttivitaSviluppo([]); return; }
      setAttivitaSviluppo(att);

      // Carica nomi bolle
      const bollaIds = [...new Set(att.map(a => a.bolla_id).filter(Boolean))];
      if (bollaIds.length > 0) {
        const { data: bolle } = await supabase
          .from('bolle_lavoro')
          .select('id, codice, descrizione')
          .in('id', bollaIds);
        const bm = {};
        (bolle || []).forEach(b => { bm[b.id] = b; });
        setBolleMap(bm);
      }

      // Carica nomi colonne workflow (= stato corrente)
      const colIds = [...new Set(att.map(a => a.colonna_id).filter(Boolean))];
      if (colIds.length > 0) {
        const { data: cols } = await supabase
          .from('workflow_colonne')
          .select('id, nome')
          .in('id', colIds);
        const cm = {};
        (cols || []).forEach(c => { cm[c.id] = c.nome; });
        setColonneMap(cm);
      }
    };
    load();
  }, [commessaId]);

  const isRepartoOpen = (rep) => {
    if (expandAll) return true;
    if (expanded[rep] === undefined) return true;
    return expanded[rep] === true;
  };

  const parseDate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const dates = tasks.flatMap(t => [parseDate(t.previsto), parseDate(t.collaudo)].filter(Boolean));
  // Includi anche le date_rilascio delle attività sviluppo nel calcolo range
  
  const minDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date(today.getFullYear(), today.getMonth(), 1);
  const maxDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date(today.getFullYear(), today.getMonth() + 3, 0);

  const startDay = new Date(minDate);
  startDay.setDate(startDay.getDate() - 21);
  const dow = startDay.getDay();
  startDay.setDate(startDay.getDate() - (dow === 0 ? 6 : dow - 1));

  const endDay = new Date(maxDate);
  endDay.setDate(endDay.getDate() + 21);
  const edow = endDay.getDay();
  if (edow !== 0) endDay.setDate(endDay.getDate() + (7 - edow));

  const allDays = [];
  const cur = new Date(startDay);
  while (cur <= endDay) { allDays.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }

  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  const DAY_W = 24;
  const ROW_H = 32;
  const LABEL_W = 240;
  // Riga extra per gli indicatori di rilascio sviluppo
  
  const dayIndex = (dateStr) => {
    if (!dateStr) return -1;
    const d = parseDate(dateStr);
    if (!d) return -1;
    return allDays.findIndex(ad => ad.getTime() === d.getTime());
  };

  const todayIdx = allDays.findIndex(d => d.getTime() === today.getTime());

  React.useEffect(() => {
    if (scrollRef.current && todayIdx >= 0) {
      scrollRef.current.scrollLeft = Math.max(0, todayIdx * DAY_W - 300);
    }
  }, []);

  const taskRows = reparti.flatMap(rep => {
    const repTasks = tasks.filter(t => {
      if (filterStato.length > 0 && !filterStato.includes(t.stato)) return false;
      if (filterInCarico.length > 0 && !filterInCarico.includes(t.in_carico_a)) return false;
      return true;
    }).filter(t => t.reparto === rep);
    if (repTasks.length === 0 && (filterStato.length > 0 || filterInCarico.length > 0)) return [];
    return [
      { type: 'reparto', label: rep },
      ...(isRepartoOpen(rep) ? repTasks.map(t => ({ type: 'task', task: t })) : []),
    ];
  });

  // Raggruppa attività sviluppo per data (possono esserci più attività nella stessa data)
    
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>
      {/* ── TOOLBAR ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, flexWrap: 'wrap' }}>
        <button onClick={() => { if(scrollRef.current) scrollRef.current.scrollLeft -= DAY_W * 7; }} style={{ padding: '5px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '16px', color: '#475569' }}>‹</button>
        <button onClick={() => { if(scrollRef.current && todayIdx >= 0) scrollRef.current.scrollLeft = Math.max(0, todayIdx * DAY_W - 300); }} style={{ padding: '5px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#0054a6' }}>Oggi</button>
        <button onClick={() => { if(scrollRef.current) scrollRef.current.scrollLeft += DAY_W * 7; }} style={{ padding: '5px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: '16px', color: '#475569' }}>›</button>
        <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />
        <MultiPillFilter label="Stato" options={STATI_TASK} selected={filterStato} onChange={setFilterStato} />
        <MultiPillFilter label="In carico" options={IN_CARICO_OPTIONS} selected={filterInCarico} onChange={setFilterInCarico} />
        {(filterStato.length > 0 || filterInCarico.length > 0) && (
          <button onClick={() => { setFilterStato([]); setFilterInCarico([]); }} style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '11px', cursor: 'pointer' }}>✕</button>
        )}
        <button onClick={() => {
          if (expandAll) { setExpandAll(false); const closed = {}; reparti.forEach(r => { closed[r] = false; }); setExpanded(closed); }
          else { setExpandAll(true); setExpanded({}); }
        }} style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid', fontSize: '11px', fontWeight: 600, cursor: 'pointer', ...(expandAll ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#0054a6' } : { background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }) }}>
          {expandAll ? '▼ Comprimi' : '▶ Espandi'}
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', fontSize: '11px', color: '#64748b', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 12, height: 12, borderRadius: '3px', background: '#1e40af' }} /> Previsto</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 12, height: 12, borderRadius: '3px', background: '#22c55e' }} /> Collaudo</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: 2, height: 14, background: '#ef4444' }} /> Oggi</div>
        </div>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', minWidth: LABEL_W + allDays.length * DAY_W }}>

          {/* ── LABEL COLUMN ── */}
          <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 20, background: '#fff', borderRight: '2px solid #e2e8f0', boxShadow: '2px 0 8px rgba(0,0,0,0.06)' }}>
            {/* Header settimane */}
            <div style={{ height: 56, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }} />
            {/* Righe task */}
            {taskRows.map((row, i) => (
              <div key={i}
                onClick={() => {
                  if (row.type === 'task') { onTaskClick && onTaskClick(row.task); return; }
                  const cur = isRepartoOpen(row.label);
                  setExpandAll(false);
                  setExpanded(p => ({ ...p, [row.label]: !cur }));
                }}
                style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 14px', borderBottom: '1px solid #f1f5f9', background: row.type === 'reparto' ? '#f1f5f9' : '#fff', fontSize: '12px', fontWeight: row.type === 'reparto' ? 600 : 400, color: '#475569', textTransform: row.type === 'reparto' ? 'uppercase' : 'none', letterSpacing: row.type === 'reparto' ? '0.07em' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: row.type === 'task' ? 'pointer' : 'default' }}
                onMouseOver={e => { if (row.type === 'task') e.currentTarget.style.background = '#f0f7ff'; }}
                onMouseOut={e => { if (row.type === 'task') e.currentTarget.style.background = '#fff'; }}
              >
                {row.type === 'task' ? (
                  <span title={row.task.attivita}>
                    <span style={{ color: '#94a3b8', fontFamily: 'monospace', marginRight: 6, fontSize: '10px' }}>{row.task.task_id_display}</span>
                    {row.task.attivita}
                  </span>
                ) : (
                  <span>
                    <span style={{ marginRight: 8, fontSize: 10 }}>{isRepartoOpen(row.label) ? '▼' : '▶'}</span>
                    {row.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* ── GRID COLUMN ── */}
          <div style={{ flex: 1 }}>
            {/* Header settimane */}
            <div style={{ display: 'flex', height: 28, position: 'sticky', top: 0, zIndex: 15, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {weeks.map((wkDays, wi) => {
                const mon = wkDays[0];
                const wNum = Math.ceil((((mon - new Date(mon.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
                return (
                  <div key={wi} style={{ width: wkDays.length * DAY_W, flexShrink: 0, display: 'flex', alignItems: 'center', paddingLeft: 6, borderRight: '1px solid #cbd5e1', fontSize: '10px', color: '#0054a6', fontWeight: 600, gap: 4, overflow: 'hidden', background: '#f8fafc' }}>
                    <span style={{ color: '#94a3b8' }}>W{wNum}</span>
                    <span>{mon.getDate()} {mon.toLocaleString('it-IT', { month: 'short' })} {String(mon.getFullYear()).slice(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Header giorni */}
            <div style={{ display: 'flex', height: 28, position: 'sticky', top: 28, zIndex: 15, borderBottom: '2px solid #e2e8f0' }}>
              {allDays.map((d, di) => {
                const isToday = di === todayIdx;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isMon = d.getDay() === 1;
                return (
                  <div key={di} style={{ width: DAY_W, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1.2, background: isToday ? '#0054a6' : isWeekend ? '#f0f2f5' : '#f8fafc', borderRight: isMon ? '1px solid #cbd5e1' : '0.5px solid #e2e8f0' }}>
                    <span style={{ fontSize: '8px', color: isToday ? '#fff' : isWeekend ? '#cbd5e1' : '#94a3b8', fontWeight: 600 }}>{d.toLocaleString('it-IT', { weekday: 'narrow' }).toUpperCase()[0]}</span>
                    <span style={{ fontSize: '9px', color: isToday ? '#fff' : isWeekend ? '#cbd5e1' : '#475569', fontWeight: isToday ? 700 : 400 }}>{d.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* ── RIGA INDICATORI SVILUPPO ── */}
            {attivitaSviluppo.length > 0 && (() => {
              const grouped = {};
              attivitaSviluppo.forEach(att => {
                const idx = dayIndex(att.data_rilascio);
                if (idx < 0) return;
                if (!grouped[idx]) grouped[idx] = [];
                grouped[idx].push(att);
              });
              return (
                <div style={{ display: 'flex', height: ROW_H, borderBottom: '2px solid #9FE1CB', position: 'relative', background: '#f0fdf8' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sviluppo</span>
                  </div>
                  {allDays.map((d, di) => {
                    const attsHere = grouped[di] || [];
                    return (
                      <div key={di} style={{ width: DAY_W, flexShrink: 0, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        {attsHere.length > 0 && (
                          <div
                            onClick={() => openCardPreview(attsHere[0].id)}
                            title={attsHere.map(a => a.titolo).join(', ')}
                            style={{ cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block', filter: 'drop-shadow(0 1px 2px rgba(15,110,86,0.4))' }}>
                              <polygon points="7,1 13,7 7,13 1,7" fill="#0F6E56" stroke="#fff" strokeWidth="1.5"/>
                            </svg>
                            {attsHere.length > 1 && (
                              <div style={{ position: 'absolute', top: -5, right: -5, width: 11, height: 11, borderRadius: '50%', background: '#BA7517', color: '#fff', fontSize: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fff' }}>
                                {attsHere.length}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* ── RIGHE TASK ── */}
            {taskRows.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', height: ROW_H, borderBottom: '1px solid #f1f5f9', position: 'relative', background: row.type === 'reparto' ? 'rgba(241,245,249,0.8)' : 'transparent' }}>
                {todayIdx >= 0 && (
                  <div style={{ position: 'absolute', left: todayIdx * DAY_W + DAY_W / 2, top: 0, bottom: 0, width: 1.5, background: '#ef4444', opacity: 0.35, zIndex: 5, pointerEvents: 'none' }} />
                )}
                {allDays.map((d, di) => {
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isMon = d.getDay() === 1;
                  const isToday = di === todayIdx;
                  let dot = null;
                  if (row.type === 'task') {
                    const pIdx = dayIndex(row.task.previsto);
                    const cIdx = dayIndex(row.task.collaudo);
                    const both = pIdx === cIdx && pIdx >= 0 && di === pIdx;
                    if (both) {
                      dot = <div style={{ display: 'flex', gap: '2px' }}><div style={{ width: 9, height: 14, borderRadius: '2px', background: '#1e40af' }} /><div style={{ width: 9, height: 14, borderRadius: '2px', background: '#22c55e' }} /></div>;
                    } else if (di === pIdx) {
                      dot = <div style={{ width: 14, height: 14, borderRadius: '3px', background: '#1e40af', boxShadow: '0 1px 3px rgba(30,64,175,0.5)' }} />;
                    } else if (di === cIdx) {
                      dot = <div style={{ width: 14, height: 14, borderRadius: '3px', background: '#22c55e', boxShadow: '0 1px 3px rgba(34,197,94,0.5)' }} />;
                    }
                  }
                  return (
                    <div key={di} style={{ width: DAY_W, flexShrink: 0, height: '100%', background: isToday ? 'rgba(0,84,166,0.04)' : isWeekend ? 'rgba(240,242,245,0.5)' : 'transparent', borderRight: isMon ? '1px solid #e2e8f0' : '0.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {dot}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {cardPreview && (
        <CardPreviewModal
          card={cardPreview}
          colonnaNome={cardPreview.colonna?.nome}
          onClose={() => setCardPreview(null)}
        />
      )}
    </div>
  );
}
export function AvanzamentoView({ tasks, clientName }) {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const getMon = (d) => {
    const dt = new Date(d);
    const dow = dt.getDay();
    dt.setDate(dt.getDate() - (dow === 0 ? 6 : dow - 1));
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const weeks = Array.from({ length: 10 }, (_, i) => {
    const mon = getMon(today);
    mon.setDate(mon.getDate() + (i - 1) * 7);
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
    const wNum = Math.ceil((((mon - new Date(mon.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
    return { mon: new Date(mon), sun, wNum, key: mon.toISOString().slice(0, 10), isPrev: i === 0, isCurrent: i === 1 };
  });

  const clientLabel = clientName || 'CLIENTE';
  const zcsClienteLabel = `ZCS/${clientLabel}`;
  const OWNERS = ['ZCS', clientLabel, zcsClienteLabel];
  const STATI = ['Da approfondire', 'Da Iniziare', 'In Corso', 'Da collaudare', 'Chiusa'];

  const ownerToDb = (owner) => {
    if (owner === clientLabel) return ['CLIENTE', clientLabel];
    if (owner === zcsClienteLabel) return ['ZCS/CLIENTE', zcsClienteLabel];
    return [owner];
  };

  const tasksByOwner = (owner) => {
    const dbVals = ownerToDb(owner);
    return tasks.filter(t => dbVals.includes(t.in_carico_a));
  };

  const isInWeek = (dateStr, weekMon) => {
    const d = parseDate(dateStr);
    if (!d) return false;
    const sun = new Date(weekMon); sun.setDate(sun.getDate() + 6);
    return d >= weekMon && d <= sun;
  };

  const isInRitardo = (t) => {
    if (t.stato === 'Chiusa') return false;
    const prev = parseDate(t.previsto);
    return prev && prev < today;
  };

  const previsti = (ownerTasks, weekMon) => ownerTasks.filter(t => isInWeek(t.previsto, weekMon));
  const chiusi = (ownerTasks, weekMon) => ownerTasks.filter(t => isInWeek(t.collaudo, weekMon) && t.stato === 'Chiusa');

  const tdS = { padding: '5px 8px', fontSize: '11px', borderBottom: '1px solid #f1f5f9' };
  const thS = { padding: '5px 8px', fontSize: '10px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' };

  const selectedTasks = selectedWeek
    ? tasks.filter(t => {
        if (!ownerToDb(selectedWeek.owner).includes(t.in_carico_a)) return false;
        if (selectedWeek.mode === 'chiusi') return isInWeek(t.collaudo, new Date(selectedWeek.weekKey)) && t.stato === 'Chiusa';
        return isInWeek(t.previsto, new Date(selectedWeek.weekKey));
      })
    : [];

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#f8fafc', display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
        {OWNERS.map(owner => {
          const ownerTasks = tasksByOwner(owner);
          const aperti = ownerTasks.filter(t => t.stato !== 'Chiusa');
          const inRitardo = ownerTasks.filter(isInRitardo);
          return (
            <div key={owner} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ background: '#f1f5f9', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{owner}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{ownerTasks.length} attività totali</span>
              </div>
              <div style={{ display: 'flex', gap: '0' }}>
                <div style={{ width: 240, flexShrink: 0, borderRight: '1px solid #e2e8f0' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ ...thS, textAlign: 'left' }}></th>
                        <th style={{ ...thS, textAlign: 'center' }}>Aperti</th>
                        <th style={{ ...thS, textAlign: 'center', color: '#dc2626' }}>Ritardo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: '#f0f7ff' }}>
                        <td style={{ ...tdS, fontWeight: 700, color: '#0054a6' }}>Totale Aperti</td>
                        <td style={{ ...tdS, textAlign: 'center', fontWeight: 700, color: '#0054a6' }}>{aperti.length}</td>
                        <td style={{ ...tdS, textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>{inRitardo.length}</td>
                      </tr>
                      {STATI.map(stato => {
                        const statTasks = ownerTasks.filter(t => t.stato === stato);
                        const statRit = statTasks.filter(isInRitardo);
                        const sc = STATO_COLORS[stato];
                        return (
                          <tr key={stato}>
                            <td style={{ ...tdS }}><span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: sc.bg, color: sc.text, fontWeight: 500, whiteSpace: 'nowrap' }}>{stato}</span></td>
                            <td style={{ ...tdS, textAlign: 'center', color: '#475569' }}>{statTasks.length}</td>
                            <td style={{ ...tdS, textAlign: 'center', color: statRit.length > 0 ? '#dc2626' : '#94a3b8' }}>{statRit.length}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ padding: '6px 8px', fontSize: '10px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', borderTop: '1px solid #f1f5f9' }}>Ticket nelle settimane</div>
                </div>
                <div style={{ flex: 1, overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
                    <thead>
                      <tr>
                        {weeks.map((w) => {
                          const isCurrent = w.isCurrent;
                          const isPrev = w.isPrev;
                          return (
                            <th key={w.key} colSpan={2} style={{ padding: '6px 8px', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: isCurrent ? '#fff' : isPrev ? '#64748b' : '#0054a6', background: isCurrent ? '#f59e0b' : isPrev ? '#f1f5f9' : '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', letterSpacing: '0.03em', opacity: isPrev ? 0.85 : 1 }}>
                              <div>WEEK {w.wNum}</div>
                              <div style={{ fontWeight: 400, fontSize: '9px', marginTop: 1 }}>{w.mon.getDate()} {w.mon.toLocaleString('it-IT', { month: 'short' })} {String(w.mon.getFullYear()).slice(2)}</div>
                              {isCurrent && <div style={{ fontSize: '9px', fontWeight: 400, opacity: 0.8 }}>corrente</div>}
                              {isPrev && <div style={{ fontSize: '9px', fontWeight: 400, color: '#94a3b8' }}>precedente</div>}
                            </th>
                          );
                        })}
                      </tr>
                      <tr>
                        {weeks.map((w) => (
                          <React.Fragment key={w.key}>
                            <th style={{ ...thS, textAlign: 'center', borderRight: 'none', minWidth: 44 }}>PREV.</th>
                            <th style={{ ...thS, textAlign: 'center', borderRight: '1px solid #e2e8f0', minWidth: 44 }}>CHIUSI</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {weeks.map((w) => {
                          const prev = previsti(ownerTasks, w.mon);
                          const chi = chiusi(ownerTasks, w.mon);
                          const isCurrent = w.isCurrent;
                          const isPrev = w.isPrev;
                          const isSelected = selectedWeek?.weekKey === w.key && selectedWeek?.owner === owner;
                          return (
                            <React.Fragment key={w.key}>
                              <td onClick={() => setSelectedWeek(isSelected && selectedWeek?.mode === 'previsti' ? null : { weekKey: w.key, owner, mode: 'previsti' })}
                                style={{ ...tdS, textAlign: 'center', cursor: 'pointer', background: isSelected && selectedWeek?.mode === 'previsti' ? '#eff6ff' : isCurrent ? '#fffbeb' : isPrev ? '#f9fafb' : '#fff', fontWeight: 700, fontSize: '13px', color: prev.length > 0 ? '#0054a6' : '#cbd5e1', borderRight: 'none', opacity: isPrev ? 0.75 : 1 }}>
                                {prev.length || '·'}{prev.filter(isInRitardo).length > 0 && <span style={{ marginLeft: 3, fontSize: '9px', color: '#dc2626' }}>▲</span>}
                              </td>
                              <td onClick={() => setSelectedWeek(isSelected && selectedWeek?.mode === 'chiusi' ? null : { weekKey: w.key, owner, mode: 'chiusi' })}
                                style={{ ...tdS, textAlign: 'center', cursor: 'pointer', background: isSelected && selectedWeek?.mode === 'chiusi' ? '#f0fdf4' : isCurrent ? '#fffbeb' : isPrev ? '#f9fafb' : '#fff', fontWeight: 700, fontSize: '13px', color: chi.length > 0 ? '#16a34a' : '#cbd5e1', borderRight: '1px solid #e2e8f0', opacity: isPrev ? 0.75 : 1 }}>
                                {chi.length || '·'}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedWeek && (
        <div style={{ width: 380, flexShrink: 0, background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', position: 'sticky', top: 0 }}>
          <div style={{ background: '#f1f5f9', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {selectedWeek.mode === 'chiusi' ? 'Chiusi' : 'Previsti'} — Sett. {weeks.find(w => w.key === selectedWeek.weekKey)?.wNum} · {selectedWeek.owner}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 2 }}>{selectedTasks.length} attività</div>
            </div>
            <button onClick={() => setSelectedWeek(null)} style={{ background: '#e2e8f0', border: 'none', borderRadius: '6px', color: '#475569', cursor: 'pointer', fontSize: '14px', padding: '3px 8px' }}>×</button>
          </div>
          {selectedTasks.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>Nessuna attività</div>
          ) : (
            <div style={{ overflow: 'auto', maxHeight: 500 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ ...thS, width: 30 }}>ID</th>
                    <th style={{ ...thS }}>Reparto</th>
                    <th style={{ ...thS }}>Categoria</th>
                    <th style={{ ...thS }}>Attività</th>
                    <th style={{ ...thS, width: 60 }}>Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTasks.map(t => {
                    const sc = STATO_COLORS[t.stato] || STATO_COLORS['Da Iniziare'];
                    const ritardo = isInRitardo(t);
                    return (
                      <tr key={t.id} style={{ background: ritardo ? '#fef2f2' : '#fff', borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ ...tdS, fontFamily: 'monospace', color: '#94a3b8', fontSize: '10px' }}>{t.task_id_display}</td>
                        <td style={{ ...tdS, color: '#64748b' }}>{t.reparto}</td>
                        <td style={{ ...tdS, color: '#475569' }}>{t.categoria}</td>
                        <td style={{ ...tdS, color: '#0f172a', fontWeight: 500 }}>{t.attivita}{ritardo && <span style={{ marginLeft: 4, fontSize: '9px', color: '#dc2626' }}>▲ ritardo</span>}</td>
                        <td style={{ ...tdS }}><span style={{ fontSize: '9px', padding: '2px 5px', borderRadius: '4px', background: sc.bg, color: sc.text, whiteSpace: 'nowrap', fontWeight: 500 }}>{t.stato}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CONSUNTIVI VIEW — legge da consuntivi_globali
// via bolle associate alla commessa del progetto
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// SOSTITUISCI SOLO LA FUNZIONE ConsuntiviView in ProgettiView.jsx
// Tutto il resto del file rimane invariato.
// ─────────────────────────────────────────────────────────────────────────────

export function ConsuntiviView({ progettoId, commessaId }) {
  const [consuntivi, setConsuntivi] = useState([]);
  const [bolle, setBolle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOperatore, setFilterOperatore] = useState([]);
  const [filterBolla, setFilterBolla] = useState([]);
  const [filterDataDa, setFilterDataDa] = useState('');
  const [filterDataA, setFilterDataA] = useState('');

  useEffect(() => { loadConsuntivi(); }, [progettoId, commessaId]);

  const loadConsuntivi = async () => {
    setLoading(true);
    try {
      // 1. Bolle associate alla commessa
      const { data: bolleData } = await supabase
        .from('bolle_lavoro')
        .select('codice, descrizione')
        .eq('commessa_id', commessaId)
        .order('codice');

      const bol = bolleData || [];
      const codici = bol.map(b => b.codice);
      let cons = [];

      if (codici.length > 0) {
        const { data: consData } = await supabase
          .from('consuntivi_globali')
          .select('*')
          .in('codice_bolla', codici)
          .order('anno_mese')
          .order('codice_operatore');
        cons = consData || [];
      }

      // 2. Fetch staff per lookup codice operatore → nome completo
      const { data: staffData } = await supabase
        .from('staff')
        .select('codice, nome, cognome');

      // mappa codice (normalizzato) → "Nome Cognome"
      const staffByCodice = {};
      (staffData || []).forEach(s => {
        if (s.codice) {
          staffByCodice[String(s.codice).trim()] = `${s.nome} ${s.cognome}`;
        }
      });

      // 3. Arricchisci i consuntivi con il nome operatore
      cons = cons.map(c => ({
        ...c,
        nome_operatore: staffByCodice[String(c.codice_operatore || '').trim()] || null,
      }));

      setBolle(bol);
      setConsuntivi(cons);
    } catch (err) {
      console.error('Errore caricamento consuntivi:', err);
    }
    setLoading(false);
  };

  // Filtraggio
  const operatori = [...new Set(consuntivi.map(c => c.codice_operatore).filter(Boolean))].sort();

  const filtered = consuntivi.filter(c => {
    if (filterOperatore.length > 0 && !filterOperatore.includes(c.codice_operatore)) return false;
    if (filterBolla.length > 0 && !filterBolla.includes(c.codice_bolla)) return false;
    if (filterDataDa && c.anno_mese < filterDataDa.slice(0, 7)) return false;
    if (filterDataA && c.anno_mese > filterDataA.slice(0, 7)) return false;
    return true;
  });

  const totOreT = filtered.reduce((s, c) => s + (parseFloat(c.ore_tecniche) || 0), 0);
  const totOreP = filtered.reduce((s, c) => s + (parseFloat(c.ore_pagamento) || 0), 0);
  const fmtNum = (n) => (parseFloat(n) || 0).toFixed(2).replace('.', ',');

  const tdS = {
    padding: '9px 12px',
    fontSize: '12px',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── TOOLBAR FILTRI ───────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
        <MultiPillFilter label="Operatore" options={operatori} selected={filterOperatore} onChange={setFilterOperatore} />
        <MultiPillFilter label="Bolla" options={bolle.map(b => b.codice)} selected={filterBolla} onChange={setFilterBolla} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
          <span>Dal</span>
          <input type="month" value={filterDataDa ? filterDataDa.slice(0, 7) : ''}
            onChange={e => setFilterDataDa(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#475569', background: '#f8fafc' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
          <span>Al</span>
          <input type="month" value={filterDataA ? filterDataA.slice(0, 7) : ''}
            onChange={e => setFilterDataA(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#475569', background: '#f8fafc' }} />
        </div>
        {(filterOperatore.length > 0 || filterBolla.length > 0 || filterDataDa || filterDataA) && (
          <button
            onClick={() => { setFilterOperatore([]); setFilterBolla([]); setFilterDataDa(''); setFilterDataA(''); }}
            style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '11px', cursor: 'pointer' }}>
            ✕ Reset
          </button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#475569', padding: '4px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span>Ore tecniche: <strong style={{ color: '#0054a6' }}>{fmtNum(totOreT)}</strong></span>
            <span>Ore pagamento: <strong style={{ color: '#16a34a' }}>{fmtNum(totOreP)}</strong></span>
          </div>
        </div>
      </div>

      {/* ── TABELLA ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Caricamento...</div>
        ) : bolle.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>📋</div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>Nessuna bolla associata</div>
            <div style={{ fontSize: '12px', marginTop: 4 }}>Associa delle bolle a questa commessa per vedere i consuntivi</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ fontSize: '28px', marginBottom: '10px' }}>📊</div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>Nessun consuntivo</div>
            <div style={{ fontSize: '12px', marginTop: 4 }}>
              {consuntivi.length > 0
                ? 'Nessun consuntivo corrisponde ai filtri selezionati'
                : 'Nessun consuntivo trovato per le bolle di questa commessa'}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {['Anno/Mese', 'Operatore', 'Bolla', 'Note', 'Ore Tecniche', 'Ore Pagamento'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: i >= 4 ? 'right' : 'left', fontWeight: 600, fontSize: '11px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e2e8f0', borderRight: i < 5 ? '1px solid #e2e8f0' : 'none' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}
                  onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}
                  style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>

                  {/* Anno/Mese */}
                  <td style={{ ...tdS, whiteSpace: 'nowrap', color: '#475569', borderRight: '1px solid #f1f5f9', fontFamily: 'monospace' }}>
                    {c.anno_mese}
                  </td>

                  {/* Operatore — codice + nome sotto */}
                  <td style={{ ...tdS, borderRight: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '12px', fontFamily: 'monospace' }}>
                      {c.codice_operatore || '—'}
                    </div>
                    {c.nome_operatore && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {c.nome_operatore}
                      </div>
                    )}
                  </td>

                  {/* Bolla */}
                  <td style={{ ...tdS, borderRight: '1px solid #f1f5f9' }}>
                    {c.codice_bolla && (
                      <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '6px', background: '#f1f5f9', color: '#0054a6', fontFamily: 'monospace', fontWeight: 600 }}>
                        {c.codice_bolla}
                      </span>
                    )}
                  </td>

                  {/* Note */}
                  <td style={{ ...tdS, color: '#64748b', borderRight: '1px solid #f1f5f9', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.note_attivita}>
                    {c.note_attivita}
                  </td>

                  {/* Ore tecniche */}
                  <td style={{ ...tdS, textAlign: 'right', fontFamily: 'monospace', color: '#0054a6', fontWeight: 600, borderRight: '1px solid #f1f5f9' }}>
                    {fmtNum(c.ore_tecniche)}
                  </td>

                  {/* Ore pagamento */}
                  <td style={{ ...tdS, textAlign: 'right', fontFamily: 'monospace', color: '#16a34a', fontWeight: 600 }}>
                    {fmtNum(c.ore_pagamento)}
                  </td>
                </tr>
              ))}

              {/* Riga totali */}
              <tr style={{ background: '#f8fafc' }}>
                <td colSpan={4} style={{ ...tdS, fontWeight: 700, color: '#475569', textAlign: 'right', borderTop: '2px solid #e2e8f0', borderRight: '1px solid #f1f5f9' }}>
                  Totale
                </td>
                <td style={{ ...tdS, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#0054a6', borderTop: '2px solid #e2e8f0', borderRight: '1px solid #f1f5f9' }}>
                  {fmtNum(totOreT)}
                </td>
                <td style={{ ...tdS, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#16a34a', borderTop: '2px solid #e2e8f0' }}>
                  {fmtNum(totOreP)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function TaskModal({ task, reparti, defaultReparto, defaultParentId, onSave, onClose, clientName, readOnly = false }) {
  const [f, setF] = useState({
    id: task?.id || null,
    reparto: task?.reparto || defaultReparto || '',
    categoria: task?.categoria || '',
    attivita: task?.attivita || '',
    priorita: task?.priorita || 'media',
    stato: task?.stato || 'Da Iniziare',
    note: task?.note || '',
    in_carico_a: task?.in_carico_a || 'ZCS',
    previsto: task?.previsto || '',
    collaudo: task?.collaudo || '',
    step: task?.step || 1,
    parent_id: task?.parent_id || defaultParentId || null,
    task_id_display: task?.task_id_display || '',
    ordine: task?.ordine || 0,
  });
  const [saving, setSaving] = useState(false);
  const inp = readOnly ? { disabled: true } : {};

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: '560px' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>{readOnly ? 'Dettaglio task' : task ? 'Modifica task' : 'Nuovo task'}</h3>
          {readOnly && task?.attivita_id && <div style={{ fontSize: '11px', color: '#0F6E56', background: '#f0fdf8', border: '0.5px solid #9FE1CB', borderRadius: '6px', padding: '3px 10px', display: 'inline-block', marginTop: 4 }}>🔗 Sincronizzato da workflow sviluppo</div>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Reparto</label>
            <SelectDropdown options={reparti.map(r => ({ value: r, label: r }))} value={f.reparto} onChange={v => !readOnly && setF({ ...f, reparto: v })} disabled={readOnly} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Categoria</label>
            <SelectDropdown options={[{ value: '', label: '— nessuna —' }, 'Configurazione','Analisi','Sviluppo','Test','Formazione','Consulenza','Documentazione','Altro'].map(v => typeof v === 'string' ? { value: v, label: v } : v)} value={f.categoria} onChange={v => !readOnly && setF({ ...f, categoria: v })} disabled={readOnly} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
            <label>Attività <span style={{ color: '#dc2626' }}>*</span></label>
            <input value={f.attivita} onChange={e => setF({ ...f, attivita: e.target.value })} placeholder="Descrivi l'attività..." autoFocus />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Priorità</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['bassa','media','alta'].map(p => {
                const pc = PRIORITA_COLORS[p];
                return (
                  <div key={p} onClick={() => setF({ ...f, priorita: p })} style={{ flex: 1, textAlign: 'center', padding: '7px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${f.priorita === p ? pc.border : '#e2e8f0'}`, background: f.priorita === p ? pc.bg : '#f8fafc', color: f.priorita === p ? pc.text : '#64748b', fontSize: '12px', fontWeight: f.priorita === p ? 700 : 400, transition: 'all 0.15s', userSelect: 'none', textTransform: 'capitalize' }}>{p}</div>
                );
              })}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Stato</label>
            <SelectDropdown options={STATI_TASK.map(s => ({ value: s, label: s }))} value={f.stato} onChange={v => setF({ ...f, stato: v })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>In carico a</label>
            <SelectDropdown options={IN_CARICO_OPTIONS.map(s => ({ value: s, label: s === 'CLIENTE' && clientName ? clientName : s === 'ZCS/CLIENTE' && clientName ? `ZCS/${clientName}` : s }))} value={f.in_carico_a} onChange={v => setF({ ...f, in_carico_a: v })} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Step</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[1,2,3].map(s => (
                <div key={s} onClick={() => setF({ ...f, step: s })} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700, fontSize: '14px', border: '1px solid', background: f.step === s ? '#0054a6' : '#f8fafc', borderColor: f.step === s ? '#0054a6' : '#e2e8f0', color: f.step === s ? '#fff' : '#64748b', transition: 'all 0.15s', userSelect: 'none' }}>{s}</div>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Previsto</label>
            <DatePicker value={f.previsto} onChange={v => !readOnly && setF({ ...f, previsto: v })} disabled={readOnly} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Collaudo</label>
            <DatePicker value={f.collaudo} onChange={v => !readOnly && setF({ ...f, collaudo: v })} disabled={readOnly} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
            <label>Note</label>
            <input value={f.note} onChange={e => !readOnly && setF({ ...f, note: e.target.value })} placeholder="Note aggiuntive..." {...inp} />
          </div>
        </div>
        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="btn-cancel" onClick={onClose}>{readOnly ? 'Chiudi' : 'Annulla'}</button>
          {!readOnly && <button className="btn-save" disabled={saving || !f.attivita.trim()} onClick={async () => { setSaving(true); await onSave(f); setSaving(false); }}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>}
        </div>
      </div>
    </div>
  );
}

const NOTE_CATEGORIE = ['Riunione', 'Decisione', 'Problema', 'Memo tecnico', 'Comunicazione cliente', 'Altro'];
const CAT_COLORS = {
  'Riunione': { bg: '#eff6ff', text: '#1d4ed8' },
  'Decisione': { bg: '#f0fdf4', text: '#15803d' },
  'Problema': { bg: '#fef2f2', text: '#dc2626' },
  'Memo tecnico': { bg: '#faf5ff', text: '#7c3aed' },
  'Comunicazione cliente': { bg: '#fffbeb', text: '#b45309' },
  'Altro': { bg: '#f8fafc', text: '#475569' },
};

export function NoteProgetto({ progettoId, staff, currentUser, commessa, chiuso }) {
  const [note, setNote] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAutore, setFilterAutore] = useState('');
  const [filterDal, setFilterDal] = useState('');
  const [filterAl, setFilterAl] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingNota, setEditingNota] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [exportLoading, setExportLoading] = useState(false);
  const isMobile = useIsMobile();

  const loadNote = async () => {
    const { data } = await supabase.from('note_progetto').select('*').eq('progetto_id', progettoId).order('created_at', { ascending: false });
    setNote(data || []);
    setLoading(false);
  };

  useEffect(() => { loadNote(); }, [progettoId]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const fmtDateTime = (d) => d ? new Date(d).toLocaleString('it-IT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const filtered = note.filter(n => {
    if (search) { const s = search.toLowerCase(); if (!n.titolo?.toLowerCase().includes(s) && !n.testo?.toLowerCase().includes(s) && !n.codice?.toLowerCase().includes(s)) return false; }
    if (filterAutore && !(n.autori || []).includes(filterAutore)) return false;
    if (filterCat && n.categoria !== filterCat) return false;
    if (filterDal && new Date(n.created_at) < new Date(filterDal)) return false;
    if (filterAl && new Date(n.created_at) > new Date(filterAl + 'T23:59:59')) return false;
    return true;
  });

  const allAutori = [...new Set(note.flatMap(n => n.autori || []))].sort();

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questa nota?')) return;
    await supabase.from('note_progetto').delete().eq('id', id);
    loadNote();
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const lines = [
        `DIARIO DI PROGETTO`, `Progetto: ${commessa?.nome_commessa || '—'}`,
        `Cliente: ${commessa?.clientName || '—'}`, `Esportato il: ${new Date().toLocaleDateString('it-IT')}`, '',
        '─'.repeat(60), '',
        ...filtered.flatMap(n => [`[${n.codice}] ${n.titolo}`, `Data: ${fmtDateTime(n.created_at)} | Categoria: ${n.categoria || '—'} | Autori: ${(n.autori || []).join(', ')}`, '', n.testo, '', '─'.repeat(60), '']),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note-progetto-${commessa?.nome_commessa?.replace(/\s+/g, '-') || progettoId}-${new Date().toISOString().slice(0,10)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExportLoading(false); }
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px' : '24px', background: '#f8fafc' }}>
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', width: isMobile ? '100%' : 'auto' }}>
          <svg width="12" height="12" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/></svg>
          <input type="text" placeholder="Cerca nelle note..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: 'none', outline: 'none', fontSize: '14px', color: '#0f172a', background: 'transparent', width: '100%' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginLeft: isMobile ? 0 : 'auto' }}>
          <SelectDropdown
            options={[{ value: '', label: 'Tutti gli autori' }, ...allAutori.map(a => ({ value: a, label: a }))]}
            value={filterAutore} onChange={setFilterAutore} placeholder="Tutti gli autori"
          />
          <SelectDropdown
            options={[{ value: '', label: 'Tutte le categorie' }, ...NOTE_CATEGORIE.map(c => ({ value: c, label: c }))]}
            value={filterCat} onChange={setFilterCat} placeholder="Tutte le categorie"
          />
          {(filterAutore || filterCat || filterDal || filterAl || search) && (
            <button onClick={() => { setFilterAutore(''); setFilterCat(''); setFilterDal(''); setFilterAl(''); setSearch(''); }} style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '11px', cursor: 'pointer' }}>✕</button>
          )}
          <button onClick={handleExport} disabled={exportLoading || filtered.length === 0} style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }}>↓ Esporta</button>
          <button onClick={() => { if (!chiuso) { setEditingNota(null); setShowModal(true); } }} disabled={chiuso} style={{ padding: '5px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', background: chiuso ? '#f8fafc' : '#eff6ff', color: chiuso ? '#94a3b8' : '#0054a6', fontSize: '12px', fontWeight: 600, cursor: chiuso ? 'not-allowed' : 'pointer', opacity: chiuso ? 0.5 : 1 }}>
            + Nuova nota
          </button>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '16px' }}>
        {filtered.length} {filtered.length === 1 ? 'nota' : 'note'}{filtered.length !== note.length && ` (su ${note.length} totali)`}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Caricamento...</div>}
      {!loading && note.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '28px', marginBottom: '12px' }}>📝</div>
          <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: 4 }}>Nessuna nota</div>
          <div style={{ fontSize: '12px' }}>Crea la prima nota di progetto con "+ Nuova nota"</div>
        </div>
      )}
      {!loading && note.length > 0 && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>Nessuna nota corrisponde ai filtri selezionati</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map(n => {
          const cat = CAT_COLORS[n.categoria] || CAT_COLORS['Altro'];
          const isExpanded = expanded[n.id];
          const testo = n.testo || '';
          const isLong = testo.length > 300;
          const displayTesto = isLong && !isExpanded ? testo.slice(0, 300) + '...' : testo;
          return (
            <div key={n.id} style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderBottom: '0.5px solid #f1f5f9', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>{n.codice}</span>
                <div style={{ width: 1, height: 14, background: '#e2e8f0', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', flex: 1 }}>{n.titolo}</span>
                {n.categoria && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: cat.bg, color: cat.text, fontWeight: 500, flexShrink: 0 }}>{n.categoria}</span>}
                <button onClick={() => { setEditingNota(n); setShowModal(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px', padding: '2px 4px' }} onMouseOver={e => e.currentTarget.style.color='#0054a6'} onMouseOut={e => e.currentTarget.style.color='#94a3b8'}>✏️</button>
                <button onClick={() => handleDelete(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '13px', padding: '2px 4px' }} onMouseOver={e => e.currentTarget.style.color='#dc2626'} onMouseOut={e => e.currentTarget.style.color='#94a3b8'}>🗑</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 16px', background: '#fafbfc', borderBottom: '0.5px solid #f1f5f9', fontSize: '11px', color: '#64748b', flexWrap: 'wrap' }}>
                <span>📅 {fmtDateTime(n.created_at)}</span>
                {n.updated_at && n.updated_at !== n.created_at && <span style={{ color: '#94a3b8' }}>· mod. {fmtDate(n.updated_at)}</span>}
                <span>✍️ {(n.autori || []).join(', ') || '—'}</span>
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{displayTesto}</div>
                {isLong && (
                  <button onClick={() => setExpanded(p => ({ ...p, [n.id]: !isExpanded }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0054a6', fontSize: '11px', fontWeight: 600, marginTop: '8px', padding: 0 }}>
                    {isExpanded ? '▲ Comprimi' : '▼ Leggi tutto'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <NotaModal nota={editingNota} progettoId={progettoId} staff={staff} noteCount={note.length} onClose={() => { setShowModal(false); setEditingNota(null); loadNote(); }} />
      )}
    </div>
  );
}

export function NotaModal({ nota, progettoId, staff, noteCount, onClose }) {
  const isEdit = !!nota;
  const nextCodice = `NP-${String(noteCount + 1).padStart(3, '0')}`;
  const [f, setF] = useState({
    codice: nota?.codice || nextCodice,
    titolo: nota?.titolo || '',
    testo: nota?.testo || '',
    categoria: nota?.categoria || '',
    autori: nota?.autori || [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const staffOptions = staff.map(s => `${s.cognome} ${s.nome}`).sort();
  const toggleAutore = (name) => { setF(p => ({ ...p, autori: p.autori.includes(name) ? p.autori.filter(a => a !== name) : [...p.autori, name] })); };

  const handleSave = async () => {
    if (!f.titolo.trim() || !f.testo.trim()) { setError('Titolo e testo sono obbligatori.'); return; }
    if (f.autori.length === 0) { setError('Seleziona almeno un autore.'); return; }
    setSaving(true);
    const payload = { progetto_id: progettoId, codice: f.codice.trim(), titolo: f.titolo.trim(), testo: f.testo.trim(), categoria: f.categoria || null, autori: f.autori, updated_at: new Date().toISOString() };
    let err;
    if (isEdit) { ({ error: err } = await supabase.from('note_progetto').update(payload).eq('id', nota.id)); }
    else { ({ error: err } = await supabase.from('note_progetto').insert(payload)); }
    if (err) { setError(err.message); setSaving(false); return; }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '680px', width: '100%' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}><h3>{isEdit ? 'Modifica nota' : 'Nuova nota di progetto'}</h3></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Codice</label>
              <input value={f.codice} onChange={e => setF(p => ({ ...p, codice: e.target.value }))} style={{ fontFamily: 'monospace' }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Titolo <span style={{ color: '#dc2626' }}>*</span></label>
              <input placeholder="es. Verbale riunione avvio progetto" value={f.titolo} onChange={e => setF(p => ({ ...p, titolo: e.target.value }))} autoFocus />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Categoria</label>
              <SelectDropdown
                options={[{ value: '', label: '— nessuna —' }, ...NOTE_CATEGORIE.map(c => ({ value: c, label: c }))]}
                value={f.categoria} onChange={v => setF(p => ({ ...p, categoria: v }))} placeholder="— nessuna —"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Autori <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '6px 8px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc', minHeight: '36px' }}>
                {staffOptions.map(name => (
                  <button key={name} type="button" onClick={() => toggleAutore(name)}
                    style={{ padding: '2px 8px', borderRadius: '20px', border: '1px solid', fontSize: '11px', cursor: 'pointer', transition: 'all 0.15s', ...(f.autori.includes(name) ? { background: '#eff6ff', borderColor: '#bfdbfe', color: '#0054a6', fontWeight: 600 } : { background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }) }}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Testo <span style={{ color: '#dc2626' }}>*</span></label>
            <textarea value={f.testo} onChange={e => setF(p => ({ ...p, testo: e.target.value }))} placeholder="Scrivi il contenuto della nota..." rows={10}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ color: '#dc2626', fontSize: '12px', padding: '6px 10px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>{error}</div>}
        </div>
        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva nota'}</button>
        </div>
      </div>
    </div>
  );
}