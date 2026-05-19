import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import './style.css';
import { supabase } from './supabase.js';
import {
  SKILLS_FOLDERS, DEFAULT_SKILLS, PRODOTTI_CATALOGO, CATEGORIA_COLORS,
  RUOLI, RUOLO_COLORS, COL_COLORS, PRIORITA_COLORS,
  REPARTI_STANDARD, STATI_TASK, STATO_COLORS, STATI_COLORS_BAR, IN_CARICO_OPTIONS,
  GANTT_COLUMN_WIDTH,
} from './constants.js';
import {
  workingDays, getDefaultStartDate, getWeekKey, getWeekRange,
  getAvatarColor, getInitials, getAvatarUrl, staffKey, staffLabel,
} from './utils.js';
import { HamburgerIcon } from './components/HamburgerIcon.jsx';
import { Avatar } from './components/Avatar.jsx';
import { LoadingOverlay } from './components/LoadingOverlay.jsx';
import { MultiPillFilter } from './components/MultiPillFilter.jsx';
import { LoginPage } from './components/LoginPage.jsx';
import { ProdottiSelector, ProdottiBadges } from './components/ProdottiSelector.jsx';
import { ManageStaffModal, StaffFormModal } from './components/StaffModals.jsx';
import { TodoView } from './components/TodoView.jsx';
import {
  ProgettiList, ProgettoView,
  creaTaskStandard,
} from './components/ProgettiView.jsx';
import { WeeklyView, KPIView, HomeUser } from './components/KPIView.jsx';
import { SviluppoView } from './components/SviluppoView.jsx';
import { NovitaProdottoView } from './components/NovitaProdottoView.jsx';
import { NuovaAttivitaWizard } from './components/NuovaAttivitaWizard.jsx';
import { CardModal } from './components/CardModal.jsx';
import {
  ProjectModal, ManageSkillsModal, ClientModal,
  EditClientModal, ManageClientsModal, ImportExcelModal,
} from './components/ClientModals.jsx';
import ThemeSelector from './components/ThemeSelector.jsx';
import { SkillStorico } from './components/SkillStorico.jsx';
import { SkillFormazione } from './components/SkillFormazione.jsx';
import { DesktopOnly, useIsMobile } from './components/DesktopOnly.jsx';
import { GestioneDatiModal } from './components/GestioneDati.jsx';
import { KpiPianificazione } from './components/KpiPianificazione.jsx';
import { PopupConsuntivi } from './components/ConsuntiviPopup.jsx';

const customStyles = `
  .skills-table { border-collapse: separate; border-spacing: 3px; }
  .skills-table th, .skills-table td { min-width: 100px; max-width: 100px; width: 100px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-radius: 6px; }
  .skills-table th.sticky-col, .skills-table td.sticky-col { min-width: 180px; max-width: 180px; width: 180px; text-align: left; border-right: none; border-radius: 8px; }
  .btn-add-styled { background: #2563eb; color: white; border: none; border-radius: 6px; padding: 0 15px; height: 40px; cursor: pointer; font-weight: bold; transition: background 0.2s; }
  .btn-add-styled:hover { background: #1d4ed8; }
  .menu-trigger-inline { background: none !important; border: none !important; border-radius: 6px !important; padding: 6px 8px !important; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #475569; transition: background 0.15s; }
  .menu-trigger-inline:hover { background: #f1f5f9 !important; color: #0f172a; }
  .btn-close-circle { background: none; color: #94a3b8; border: none; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; line-height: 1; transition: all 0.15s; position: absolute; top: 14px; right: 16px; }
  .btn-close-circle:hover { background: #f1f5f9; color: #0f172a; }
  .gantt-wrapper { display: flex; flex-direction: column; background: white; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-top: 10px; overflow: hidden; height: 650px; }
  .gantt-scroll-container { overflow: auto; display: flex; flex-direction: column; flex: 1; }
  .gantt-header { display: flex; background: #f8fafc; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 25; width: fit-content; }
  .gantt-label-col { min-width: 320px; width: 320px; border-right: 2px solid #e2e8f0; background: #f8fafc !important; position: sticky; left: 0; z-index: 21; display: flex; align-items: center; padding: 0 15px; height: 100%; box-shadow: 2px 0 5px rgba(0,0,0,0.03); }
  .gantt-timeline-header { display: flex; }
  .gantt-month-box { min-width: ${GANTT_COLUMN_WIDTH}px; width: ${GANTT_COLUMN_WIDTH}px; text-align: center; padding: 12px 0; border-right: 1px solid #e2e8f0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; background: #f8fafc; }
  .gantt-body { display: flex; flex-direction: column; width: fit-content; background: #fff; }
  .gantt-row { display: flex; border-bottom: 1px solid #f1f5f9; align-items: stretch; min-height: 48px; width: 100%; background: #fff !important; transition: background 0.1s; }
  .gantt-row:hover { background: #fafbff !important; }
  .gantt-bar-area { display: flex; flex: 1; position: relative; min-height: 48px; background-image: linear-gradient(to right, #f1f5f9 1px, transparent 1px); background-size: ${GANTT_COLUMN_WIDTH}px 100%; }
  .gantt-bar { position: absolute; height: 28px; color: white; border-radius: 6px; font-size: 11px; display: flex; align-items: center; padding: 0; top: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 5; cursor: pointer; border-right: 2px solid rgba(0,0,0,0.2); }
  .gantt-row.row-client .gantt-label-col { font-weight: bold; font-size: 13px; color: #0f172a; border-bottom: 1px solid #f1f5f9; }
  .gantt-row.row-commessa .gantt-label-col { padding-left: 35px; font-size: 12px; color: #475569; }
  .clickable-commessa { cursor: pointer; color: #2563eb; font-weight: 500; }
  .clickable-commessa:hover { text-decoration: underline; color: #1d4ed8; }
  .btn-add-inline { width: 22px; height: 22px; border-radius: 50%; border: 1px solid #e2e8f0; background: #fff; color: #94a3b8; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; margin-left: auto; }
  .btn-add-inline:hover { background: #2563eb; color: white; border-color: #2563eb; }
  .gantt-month-marker { position: absolute; top: 0; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: white; z-index: 10; pointer-events: none; border-left: 1px solid rgba(255,255,255,0.15); }
  .gantt-dot-danger { width: 7px; height: 7px; background-color: #fca5a5; border-radius: 50%; box-shadow: 0 0 5px rgba(239, 68, 68, 0.9); }
  .login-input::placeholder { color: rgba(255,255,255,0.45); }
  .login-input:focus { border-color: rgba(255,255,255,0.6) !important; background: rgba(255,255,255,0.22) !important; }
  @keyframes loginFadeIn { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
  .login-card { animation: loginFadeIn 0.5s ease-out both; }
`;

const mesiIT = { GEN:'01', FEB:'02', MAR:'03', APR:'04', MAG:'05', GIU:'06', LUG:'07', AGO:'08', SET:'09', OTT:'10', NOV:'11', DIC:'12' };

function CardSolaLettura({ card, colonneMap, clients, onClose }) {
  if (!card) return null;
  const colInfo = colonneMap[card.colonna_id] || { nome: '', colore: '#001d47' };
  const colonnaColor = colInfo.colore;
  let clienteNome = null, commessaNome = null;
  for (const cl of (clients || [])) {
    const co = (cl.commesse || []).find(co => co.id === card.commessa_id);
    if (co) { clienteNome = cl.nome_progetto; commessaNome = co.nome_commessa; break; }
  }
  const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : null;
  const pColor = card.priorita === 'alta' ? { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' } : card.priorita === 'bassa' ? { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' } : { bg: '#fefce8', text: '#92400e', border: '#fcd34d' };
  const row = (label, value) => value ? (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, padding: '6px 0', borderBottom: '0.5px solid #f1f5f9' }}>
      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', paddingTop: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#1e293b' }}>{value}</div>
    </div>
  ) : null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: '520px', padding: 0, borderRadius: '20px' }}>
        <div style={{ height: 4, background: colonnaColor, borderRadius: '20px 20px 0 0' }} />
        <div style={{ background: '#001d47', padding: '12px 16px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {clienteNome && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{clienteNome}{commessaNome ? ` · ${commessaNome}` : ''}</div>}
              <div style={{ fontSize: 15, fontWeight: 500, color: '#fff' }}>{card.titolo}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {colInfo.nome && <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: colonnaColor + '33', color: '#fff', border: `1px solid ${colonnaColor}66`, fontWeight: 500 }}>{colInfo.nome}</span>}
              <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 16 }}>×</button>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {card.descrizione && <div style={{ padding: '8px 0 12px', borderBottom: '0.5px solid #f1f5f9', fontSize: 13, color: '#475569', lineHeight: 1.5 }}>{card.descrizione}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '0.5px solid #f1f5f9' }}>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', width: 130 }}>Priorità</div>
            <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: pColor.bg, color: pColor.text, border: `1px solid ${pColor.border}`, fontWeight: 500, textTransform: 'capitalize' }}>{card.priorita || 'media'}</span>
          </div>
          {row('PM', card.pm)}
          {row('Assegnatario', card.assegnatario)}
          {row('Team sviluppo', card.team_sviluppo)}
          {row('Risorsa', card.assegnata_a)}
          {row('Data richiesta', fmtDate(card.data_richiesta))}
          {card.data_fine_lavori && row('Previsto rilascio', fmtDate(card.data_fine_lavori))}
          {row('Rif. Pratica', card.rif_pratica)}
          {row('Stima ore', card.stima_ore ? `${card.stima_ore}h` : null)}
        </div>
        <div className="modal-actions" style={{ margin: '0 20px 20px', paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sola visualizzazione</span>
          <button className="btn-cancel" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}

function SearchLens({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (open && ref.current) ref.current.focus();
  }, [open]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: open ? '#f8fafc' : 'transparent', border: open ? '1px solid #e2e8f0' : '1px solid transparent', borderRadius: 20, padding: open ? '4px 10px 4px 8px' : '4px', transition: 'all 0.2s', cursor: 'pointer' }}
        onClick={() => !open && setOpen(true)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={open ? '#0054a6' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }} onClick={e => { if (open) { e.stopPropagation(); setOpen(false); onChange(''); } }}>
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
        </svg>
        {open && (
          <input ref={ref} type="text" value={value} onChange={e => onChange(e.target.value)}
            placeholder="Cerca..."
            onBlur={() => { if (!value) setOpen(false); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, width: 120, color: '#0f172a' }} />
        )}
        {open && value && (
          <span onClick={e => { e.stopPropagation(); onChange(''); }} style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1 }}>×</span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState('kpi');
  const [planSubView, setPlanSubView] = useState('byProject');
  const [activeFolder, setActiveFolder] = useState('Teseo');
  const [skillsConfig, setSkillsConfig] = useState(DEFAULT_SKILLS);
  const [showSidebarSkills, setShowSidebarSkills] = useState(false);
  const [showSidebarPlan, setShowSidebarPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [clients, setClients] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [consuntiviGlobali, setConsuntiviGlobali] = useState({});
  const [consuntiviGlobaliOp, setConsuntiviGlobaliOp] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [filterClient, setFilterClient] = useState('');
  const [filterStaff, setFilterStaff] = useState('');
  const [filterSviluppo, setFilterSviluppo] = useState('');
  const [trainingMode, setTrainingMode] = useState(false);
  const [trainingCells, setTrainingCells] = useState({});
  const [skillsSubView, setSkillsSubView] = useState('matrice');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOnlyActiveGantt, setShowOnlyActiveGantt] = useState(true);
  const [showOnlyActiveProject, setShowOnlyActiveProject] = useState(true);
  const [showSviluppoProject, setShowSviluppoProject] = useState(true);
  const [showOnlyActiveWeekly, setShowOnlyActiveWeekly] = useState(true);
  const [showOnlyActiveResource, setShowOnlyActiveResource] = useState(true);
  const [expandAllWeekly, setExpandAllWeekly] = useState({ clients: false, commesse: false });
  const [expandAllResource, setExpandAllResource] = useState({ clients: false, commesse: false });
  const [expandAllByProject, setExpandAllByProject] = useState({ clients: false, commesse: false });
  const [expandAllGantt, setExpandAllGantt] = useState({ clients: false, commesse: false });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [targetedProjectEdit, setTargetedProjectEdit] = useState(null);
  const [showGestioneDati, setShowGestioneDati] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [timeFilters, setTimeFilters] = useState({
    byProject: { start: getDefaultStartDate(), horizon: 12 },
    byResource: { start: getDefaultStartDate(), horizon: 12 },
    gantt: { start: getDefaultStartDate(), horizon: 12 },
  });
  const [showManageStaff, setShowManageStaff] = useState(false);
  const [showManageSkills, setShowManageSkills] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showProjectModalFromWizard, setShowProjectModalFromWizard] = useState(false);
  const [showNuovaAttivitaWizard, setShowNuovaAttivitaWizard] = useState(false);
  const [wizardTargetedEdit, setWizardTargetedEdit] = useState(null);
  const [showWizardProjectModal, setShowWizardProjectModal] = useState(false);
  const [showManageClientsModal, setShowManageClientsModal] = useState(false);
  const [showImportExcelModal, setShowImportExcelModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [selectedClientEdit, setSelectedClientEdit] = useState(null);
  const [progettoAperto, setProgettoAperto] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffLoaded, setStaffLoaded] = useState(false);

  // Notifiche
  const [notifiche, setNotifiche] = useState([]);
  const [notificaApriCard, setNotificaApriCard] = useState(null);
  const [showNotifiche, setShowNotifiche] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Rilascio sviluppo Gantt
  const [attivitaRilascio, setAttivitaRilascio] = useState([]);
  const [cardSolaLettura, setCardSolaLettura] = useState(null);
  const [bolleRilascioMap, setBolleRilascioMap] = useState({});
  const [colonneRilascioMap, setColonneRilascioMap] = useState({});
  const [popupRilascioGantt, setPopupRilascioGantt] = useState(null);

  // ── Popup consuntivi dettaglio (vista byResource) ──────────
  const [popupConsuntivi, setPopupConsuntivi] = useState(null);
  // { commessa, staffNome, codiceOperatore, annoMese, meseLabel, clienteNome }

  const isMobile = useIsMobile();

  const TAB_LIST = [
    { key: 'kpi', label: 'Home', adminOnly: true },
    { key: 'homeUser', label: 'Home', adminOnly: false, userOnly: true },
    { key: 'planning', label: 'Pianificazione' },
    { key: 'todo', label: 'WorkFlow', adminOnly: true },
    { key: 'progetti', label: 'Progetti' },
    { key: 'novita', label: '★ Novità di Prodotto' },
  ];

  const visibleTabs = TAB_LIST.filter(tab => {
    if (tab.userOnly) return !isAdmin;
    if (tab.adminOnly) return isAdmin;
    return true;
  });

  const loadCurrentStaff = async (user) => {
    if (!user?.email) { setStaffLoaded(true); return; }
    const { data } = await supabase.from('staff').select('*').eq('email', user.email).single();
    if (data) {
      setCurrentStaff(data);
      setIsAdmin(data.is_admin === true);
      setView(data.is_admin ? 'kpi' : 'homeUser');
    } else {
      setIsAdmin(true);
      setView('kpi');
    }
    setStaffLoaded(true);
  };

  useEffect(() => {
    document.title = 'ZCS | Delivery Hub';
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsLoggedIn(true);
        setCurrentUser(data.session.user);
        loadCurrentStaff(data.session.user);
      }
    });
    loadAllData();
  }, []);

  // Notifiche real-time
  useEffect(() => {
    if (!currentStaff) return;
    const myKey = `${currentStaff.cognome} ${currentStaff.nome}`;
    supabase.from('notifiche').select('*').eq('destinatario', myKey)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setNotifiche(data || []));
    const channelName = `notifiche-${myKey.replace(/\s+/g, '-')}`;
    const existing = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);
    const sub = supabase.channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifiche',
        filter: `destinatario=eq.${myKey}`,
      }, (payload) => {
        const n = payload.new;
        setNotifiche(prev => [n, ...prev]);
        const toastId = Date.now();
        setToasts(prev => [...prev, { id: toastId, testo: n.testo }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toastId)), 5000);
      })
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [currentStaff]);

  const navigaNotifica = async (n) => {
    await segnaLetta(n.id);
    setShowNotifiche(false);
    if (n.tipo === 'workflow' && n.riferimento_id) {
      setView('todo');
      setNotificaApriCard(n.riferimento_id);
    } else if (n.tipo === 'commessa' && n.riferimento_id) {
      const allComm = clients.flatMap(c => c.commesse.map(co => ({ ...co, clientId: c.id })));
      const comm = allComm.find(co => co.id === n.riferimento_id);
      if (comm) {
        setView('planning');
        setPlanSubView('byProject');
        setTargetedProjectEdit({ clientId: comm.clientId, commessaId: n.riferimento_id });
        setShowProjectModal(true);
      }
    } else if (n.tipo === 'progetto' && n.riferimento_id) {
      const { data: prog } = await supabase.from('progetti').select('id, commessa_id').eq('id', n.riferimento_id).single();
      if (prog) {
        setProgettoAperto({ progettoId: prog.id, commessaId: prog.commessa_id });
        setView('progetti');
      }
    }
  };

  const segnaLetta = async (id) => {
    await supabase.from('notifiche').update({ letta: true }).eq('id', id);
    setNotifiche(prev => prev.map(n => n.id === id ? { ...n, letta: true } : n));
  };
  const segnaLetteTutte = async () => {
    if (!currentStaff) return;
    const myKey = `${currentStaff.cognome} ${currentStaff.nome}`;
    await supabase.from('notifiche').update({ letta: true }).eq('destinatario', myKey).eq('letta', false);
    setNotifiche(prev => prev.map(n => ({ ...n, letta: true })));
  };
  const nonLette = notifiche.filter(n => !n.letta).length;

  // Carica attività con data_rilascio per il Gantt
  useEffect(() => {
    const load = async () => {
      const { data: att } = await supabase
        .from('attivita')
        .select('id, titolo, data_rilascio, data_fine_lavori, colonna_id, priorita, commessa_id')
        .not('commessa_id', 'is', null)
        .not('colonna_id', 'is', null);
      if (!att || att.length === 0) return;
      setAttivitaRilascio(att);
      const { data: cols } = await supabase.from('workflow_colonne').select('id, nome, colore');
      const cm = {}; (cols || []).forEach(c => { cm[c.id] = { nome: c.nome, colore: c.colore || '#64748b' }; });
      setColonneRilascioMap(cm);
    };
    load();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setCurrentStaff(null);
    setIsAdmin(false);
    setStaffLoaded(false);
  };

  async function loadAllDataSilent() {
    try {
      const { data: staffData } = await supabase.from('staff').select('*').order('cognome');
      setStaff(staffData || []);
      const { data: cData } = await supabase.from('projects').select('*').order('nome_progetto');
      const { data: commData } = await supabase.from('commesse').select('*');
      const { data: tData } = await supabase.from('project_team').select('*');
      const { data: bolleData } = await supabase.from('bolle_lavoro').select('codice, commessa_id');
      if (cData) {
        setClients(cData.map((c) => ({
          ...c,
          commesse: (commData || [])
            .filter((co) => co.client_id === c.id)
            .map((co) => ({
              ...co,
              team: (tData || []).filter(t => t.commessa_id === co.id).map(t => t.staff_name),
              bolle: (bolleData || []).filter(b => b.commessa_id === co.id).map(b => b.codice),
            })),
        })));
      }
    } catch (e) { console.error('silent reload error:', e); }
  }

  async function loadAllData() {
    setLoading(true);
    try {
      const { data: confData } = await supabase.from('skills_settings').select('*');
      if (confData && confData.length > 0) {
        const newConf = { Teseo: [], Cassiopea: [], 'Business intelligence': [], 'Soft skills': [] };
        confData.forEach((c) => { if (newConf[c.category]) newConf[c.category].push(c.skill_name); });
        setSkillsConfig(newConf);
      }
      const { data: sData } = await supabase.from('skill_data').select('*').order('data_valutazione', { ascending: false });
      const m = {};
      if (sData) {
        sData.forEach((item) => {
          const compositeKey = `${item.staff_key}-${item.skill_key}`;
          if (!(compositeKey in m)) m[compositeKey] = item.voto;
        });
      }
      setMatrix(m);
      const { data: fData } = await supabase.from('skill_formazione').select('*');
      const tc = {};
      if (fData) fData.forEach(f => { tc[`${f.staff_key}-${f.skill_key}`] = true; });
      setTrainingCells(tc);
      const { data: staffData } = await supabase.from('staff').select('*').order('cognome');
      setStaff(staffData || []);
      const { data: cData } = await supabase.from('projects').select('*').order('nome_progetto');
      const { data: commData } = await supabase.from('commesse').select('*');
      const { data: tData } = await supabase.from('project_team').select('*');
      const { data: bolleData } = await supabase.from('bolle_lavoro').select('codice, commessa_id');
      if (cData) {
        setClients(cData.map((c) => ({
          ...c,
          commesse: (commData || [])
            .filter((co) => co.client_id === c.id)
            .map((co) => ({
              ...co,
              team: (tData || []).filter((t) => t.commessa_id === co.id).map((t) => t.staff_name),
              bolle: (bolleData || []).filter((b) => b.commessa_id === co.id).map((b) => b.codice),
            })),
        })));
      }
      const { data: aData } = await supabase.from('project_assignments').select('*');
      const ass = {};
      if (aData) aData.forEach((a) => { ass[`${a.commessa_id}-${a.staff_name}-${a.mese_anno}`] = a.gg_previsti; });
      setAssignments(ass);
      const { data: cgData } = await supabase
        .from('consuntivi_globali')
        .select('codice_bolla, anno_mese, ore_tecniche, codice_operatore');
      const cg = {};
      const cgOp = {};
      if (cgData) {
        cgData.forEach(r => {
          const keyBolla = `${r.codice_bolla}-${r.anno_mese}`;
          cg[keyBolla] = (cg[keyBolla] || 0) + (parseFloat(r.ore_tecniche) || 0);
          if (r.codice_operatore) {
            const keyOp = `${r.codice_bolla}-${r.anno_mese}-${String(r.codice_operatore).trim()}`;
            cgOp[keyOp] = (cgOp[keyOp] || 0) + (parseFloat(r.ore_tecniche) || 0);
          }
        });
      }
      setConsuntiviGlobali(cg);
      setConsuntiviGlobaliOp(cgOp);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const getGiorniSvolti = (commessa, monthLabel) => {
    if (!commessa.bolle || commessa.bolle.length === 0) return 0;
    const parts = monthLabel.split(' ');
    const mese = mesiIT[parts[0]];
    const anno = '20' + parts[1];
    if (!mese || !anno) return 0;
    const annoMese = `${anno}-${mese}`;
    return commessa.bolle.reduce((tot, codBolla) => {
      const key = `${codBolla}-${annoMese}`;
      return tot + ((consuntiviGlobali[key] || 0) / 8);
    }, 0);
  };

  const toggleSkill = async (person, skill) => {
    const sKey = staffKey(person);
    const compositeKey = `${sKey}-${skill}`;
    if (trainingMode) {
      const isActive = trainingCells[compositeKey];
      setTrainingCells(p => ({ ...p, [compositeKey]: !isActive }));
      if (isActive) {
        await supabase.from('skill_formazione').delete().eq('staff_key', sKey).eq('skill_key', skill);
      } else {
        await supabase.from('skill_formazione').upsert(
          { staff_key: sKey, skill_key: skill, data_inizio: new Date().toISOString().slice(0, 10) },
          { onConflict: 'staff_key,skill_key' }
        );
      }
      return;
    }
    const cur = matrix[compositeKey] || 0;
    const next = cur >= 4 ? 0 : cur + 1;
    const oldVal = matrix[compositeKey];
    setMatrix((p) => ({ ...p, [compositeKey]: next }));
    try {
      if (next === 0) return;
      const { error } = await supabase.from('skill_data').insert({
        staff_key: sKey, skill_key: skill, voto: next,
        data_valutazione: new Date().toISOString().slice(0, 10),
      });
      if (error) throw error;
    } catch (err) {
      console.error('Errore salvataggio:', err);
      alert('Errore DB: Impossibile salvare la skill.');
      setMatrix((p) => ({ ...p, [compositeKey]: oldVal }));
    }
  };

  const openCommessaEdit = (clientId, commessaId) => {
    setTargetedProjectEdit({ clientId, commessaId });
    setShowProjectModal(true);
  };

  const openNewCommessaForClient = (clientId) => {
    setTargetedProjectEdit({ clientId, commessaId: '' });
    setShowProjectModal(true);
  };

  const MESI_LABEL = { GEN:1, FEB:2, MAR:3, APR:4, MAG:5, GIU:6, LUG:7, AGO:8, SET:9, OTT:10, NOV:11, DIC:12 };
  const lastDayOfMonth = (monthKey) => {
    if (!monthKey) return null;
    if (monthKey.includes('-')) {
      const [y, m] = monthKey.split('-').map(Number);
      return new Date(y, m, 0).toISOString().slice(0, 10);
    }
    const parts = monthKey.trim().toUpperCase().split(/\s+/);
    if (parts.length < 2) return null;
    const mo = MESI_LABEL[parts[0]];
    const yr = parts[1].length === 2 ? 2000 + parseInt(parts[1]) : parseInt(parts[1]);
    if (!mo || !yr) return null;
    return new Date(yr, mo, 0).toISOString().slice(0, 10);
  };

  const checkAndExtendCommessa = async (commId, newEndDateStr) => {
    const allComm = visibleClients.flatMap(c => c.commesse || []);
    const comm = allComm.find(co => co.id === commId);
    if (!comm || !comm.attiva) return;
    const dataFine = comm.data_fine ? new Date(comm.data_fine) : null;
    if (!dataFine) return;
    const newEnd = new Date(newEndDateStr);
    if (newEnd <= dataFine) return;
    const nuovaDataStr = newEnd.toISOString().slice(0, 10);
    const nuovaDataFmt = nuovaDataStr.split('-').reverse().join('/');
    const attDataFmt = comm.data_fine.split('-').reverse().join('/');
    const ok = window.confirm(
      `⚠️ Attenzione: stai pianificando lavoro oltre la data di fine commessa (${attDataFmt}).\n\nVuoi aggiornare la data di fine commessa al ${nuovaDataFmt}?`
    );
    if (ok) {
      await supabase.from('commesse').update({ data_fine: nuovaDataStr }).eq('id', commId);
      await loadAllData();
    }
  };

  const updateGg = async (commId, staffName, month, value) => {
    const now = new Date();
    const currentYM = now.getFullYear() * 12 + now.getMonth();
    let monthYM = -1;
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [y, m2] = month.split('-').map(Number);
      monthYM = y * 12 + (m2 - 1);
    } else {
      const found = currentMonths.find(m2 => m2.label === month);
      if (found) monthYM = found.date.getFullYear() * 12 + found.date.getMonth();
    }
    if (monthYM >= 0 && monthYM < currentYM) {
      alert(`Non è possibile modificare la pianificazione per mesi precedenti a quello corrente.`);
      return;
    }
    const val = Math.max(0, parseFloat(value) || 0);
    const key = `${commId}-${staffName}-${month}`;
    const oldVal = assignments[key];
    setAssignments((prev) => ({ ...prev, [key]: val }));
    const { error } = await supabase.from('project_assignments').upsert({
      commessa_id: commId, staff_name: staffName, mese_anno: month, gg_previsti: val,
    }, { onConflict: 'commessa_id,staff_name,mese_anno' });
    if (error) {
      console.error('DETTAGLIO ERRORE SUPABASE:', JSON.stringify(error, null, 2));
      alert('Errore salvataggio ore.');
      setAssignments((prev) => ({ ...prev, [key]: oldVal }));
    } else if (val > 0) {
      await checkAndExtendCommessa(commId, lastDayOfMonth(month));
    }
  };

  const updateTimeFilter = (viewName, field, value) => {
    setTimeFilters((prev) => ({ ...prev, [viewName]: { ...prev[viewName], [field]: value } }));
  };

  const currentMonths = (() => {
    const activeFilters = timeFilters[planSubView] || timeFilters['byProject'];
    const months = [];
    const start = new Date(`${activeFilters.start}-01T00:00:00`);
    const horizon = parseInt(activeFilters.horizon) || 12;
    for (let i = 0; i < horizon; i++) {
      const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
      months.push({
        date: d,
        label: d.toLocaleString('it-IT', { month: 'short', year: '2-digit' }).toUpperCase().replace('.', ''),
        ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    return months;
  })();

  const renderGantt = () => {
    if (currentMonths.length === 0) return null;
    const startDate = currentMonths[0].date;
    const totalWidth = currentMonths.length * GANTT_COLUMN_WIDTH;
    const filteredGanttClients = visibleClients.filter((c) => {
      const matchClient = c.nome_progetto.toLowerCase().includes(filterClient.toLowerCase());
      const matchCommessa = c.commesse.some((co) => co.nome_commessa.toLowerCase().includes(filterClient.toLowerCase()));
      const hasActive = c.commesse.some((co) => co.attiva !== false);
      return (matchClient || matchCommessa) && (!showOnlyActiveGantt || hasActive);
    });

    const getPosition = (dateStr) => {
      if (!dateStr) return null;
      const d = new Date(dateStr);
      const diffMonths = (d.getFullYear() - startDate.getFullYear()) * 12 + (d.getMonth() - startDate.getMonth());
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const dayRatio = (d.getDate() - 1) / daysInMonth;
      return (diffMonths + dayRatio) * GANTT_COLUMN_WIDTH;
    };

    const rilasciPerCommessa = {};
    attivitaRilascio.forEach(a => {
      if (!rilasciPerCommessa[a.commessa_id]) rilasciPerCommessa[a.commessa_id] = [];
      rilasciPerCommessa[a.commessa_id].push(a);
    });

    const fmtDate = (str) => {
      if (!str) return '—';
      const [y, m, d] = str.split('-').map(Number);
      return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
    };

    return (
      <div className="gantt-wrapper animate-fade-in" onClick={() => setPopupRilascioGantt(null)}>
        <div className="gantt-scroll-container">
          <div className="gantt-header">
            <div className="gantt-label-col">Cliente / Commessa</div>
            <div className="gantt-timeline-header">
              {currentMonths.map((m) => <div key={m.label} className="gantt-month-box">{m.label}</div>)}
            </div>
          </div>
          <div className="gantt-body">
            {filteredGanttClients.map((c) => {
              const commesseToShow = c.commesse.filter((co) => showOnlyActiveGantt ? co.attiva !== false : true);
              if (commesseToShow.length === 0 && showOnlyActiveGantt) return null;
              const isExpanded = expandedItems[`gantt-${c.id}`];
              return (
                <React.Fragment key={c.id}>
                  <div className="gantt-row row-client">
                    <div className="gantt-label-col" onClick={() => setExpandedItems((p) => ({ ...p, [`gantt-${c.id}`]: !isExpanded }))} style={{ cursor: 'pointer' }}>
                      <span style={{ marginRight: '10px', width: '12px', display: 'inline-block' }}>{isExpanded ? '▼' : '▶'}</span>
                      <strong>{c.nome_progetto}</strong>
                      <button className="btn-add-inline" onClick={(e) => { e.stopPropagation(); openNewCommessaForClient(c.id); }}>+</button>
                    </div>
                    <div className="gantt-bar-area" style={{ width: totalWidth }}></div>
                  </div>
                  {isExpanded && commesseToShow.map((co) => {
                    const left = getPosition(co.data_inizio);
                    let right = co.data_fine ? getPosition(co.data_fine) : left !== null ? left + GANTT_COLUMN_WIDTH : null;
                    const width = right !== null ? right - left : 0;
                    const rilasciCommessa = rilasciPerCommessa[co.id] || [];
                    return (
                      <div className="gantt-row row-commessa" key={co.id}>
                        <div className="gantt-label-col">
                          <span className="clickable-commessa" onClick={() => openCommessaEdit(c.id, co.id)}>{co.nome_commessa}</span>
                        </div>
                        <div className="gantt-bar-area" style={{ width: totalWidth }}>
                          {left !== null && (
                            <div className="gantt-bar" style={{ left: `${left}px`, width: `${Math.max(15, width)}px`, background: co.attiva !== false ? '#2563eb' : '#94a3b8', opacity: co.attiva !== false ? 1 : 0.6 }} onClick={() => openCommessaEdit(c.id, co.id)}>
                              <span style={{ position: 'relative', zIndex: 20, paddingLeft: '8px', textShadow: '0 1px 2px rgba(0,0,0,0.4)', pointerEvents: 'none' }}>{co.nome_commessa}</span>
                              {currentMonths.map((m, idx) => {
                                const mLeft = idx * GANTT_COLUMN_WIDTH;
                                const mRight = mLeft + GANTT_COLUMN_WIDTH;
                                if (mRight > left && mLeft < left + width) {
                                  const totalDays = co.team.reduce((s, mem) => s + (assignments[`${co.id}-${mem}-${m.label}`] || 0), 0);
                                  return (
                                    <div key={m.label} className="gantt-month-marker" style={{ left: `${mLeft - left}px`, width: `${GANTT_COLUMN_WIDTH}px` }}>
                                      {totalDays > 0 ? <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 5px', borderRadius: '4px' }}>{totalDays}g</span> : co.attiva !== false ? <div className="gantt-dot-danger"></div> : null}
                                    </div>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          )}
                          {rilasciCommessa.map((att) => {
                            const dPos = getPosition(att.data_rilascio);
                            if (dPos === null) return null;
                            const stessaData = rilasciCommessa.filter(a => getPosition(a.data_rilascio) === dPos);
                            if (stessaData[0].id !== att.id) return null;
                            return (
                              <div key={att.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (stessaData.length === 1) {
                                    setCardSolaLettura(stessaData[0]);
                                  } else {
                                    setPopupRilascioGantt(
                                      popupRilascioGantt?.key === `${co.id}-${att.data_rilascio}`
                                        ? null
                                        : { key: `${co.id}-${att.data_rilascio}`, atts: stessaData, commessaNome: co.nome_commessa, clientNome: c.nome_progetto }
                                    );
                                  }
                                }}
                                style={{ position: 'absolute', left: `${dPos - 7}px`, top: '50%', transform: 'translateY(-50%)', zIndex: 15, cursor: 'pointer' }}
                                title={stessaData.map(a => a.titolo).join(', ')}>
                                <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block', filter: 'drop-shadow(0 1px 3px rgba(15,110,86,0.5))' }}>
                                  <polygon points="7,1 13,7 7,13 1,7" fill="#0F6E56" stroke="#fff" strokeWidth="1.5"/>
                                </svg>
                                {stessaData.length > 1 && (
                                  <div style={{ position: 'absolute', top: -5, right: -5, width: 11, height: 11, borderRadius: '50%', background: '#BA7517', color: '#fff', fontSize: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fff' }}>
                                    {stessaData.length}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {popupRilascioGantt && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.15)' }}
            onClick={() => setPopupRilascioGantt(null)}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', minWidth: 280, maxWidth: 380, overflow: 'hidden' }}>
              <div style={{ background: '#001d47', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>{popupRilascioGantt.clientNome} · {popupRilascioGantt.commessaNome}</div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff' }}>{popupRilascioGantt.atts.length} attività — {fmtDate(popupRilascioGantt.atts[0].data_rilascio)}</div>
                </div>
                <button onClick={() => setPopupRilascioGantt(null)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '14px', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {popupRilascioGantt.atts.map(att => {
                  const stato = colonneRilascioMap[att.colonna_id];
                  const pc = att.priorita === 'alta' ? { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' }
                           : att.priorita === 'bassa' ? { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' }
                           : { bg: '#fefce8', text: '#92400e', border: '#fcd34d' };
                  return (
                    <div key={att.id} onClick={() => { setCardSolaLettura(att); setPopupRilascioGantt(null); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                      <svg width="10" height="10" viewBox="0 0 14 14" style={{ flexShrink: 0 }}><polygon points="7,1 13,7 7,13 1,7" fill={stato?.colore || '#0F6E56'}/></svg>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0f172a' }}>{att.titolo}</span>
                      {att.priorita && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: 4, background: pc.bg, color: pc.text, border: `0.5px solid ${pc.border}`, fontWeight: 500 }}>{att.priorita}</span>}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const currentStaffKey = currentStaff ? `${currentStaff.cognome} ${currentStaff.nome}` : '';

  const visibleClients = isAdmin || !currentStaff
    ? clients
    : clients.map(c => ({
        ...c,
        commesse: (c.commesse || []).filter(co => {
          const team = co.team || [];
          return co.pm_commessa === currentStaffKey || team.includes(currentStaffKey);
        }),
      })).filter(c => c.commesse.length > 0);

  const visibleStaff = isAdmin || !currentStaff
    ? staff
    : staff.filter(s => staffKey(s) === currentStaffKey);

  const consulenzaStaff = visibleStaff.filter(s => ['PM', 'Project Manager', 'Consulente', 'Consulente Applicativo'].includes(s.ruolo));

  const byProjectClients = visibleClients
    .filter(c => {
      const q = filterClient.toLowerCase();
      const matchCliente = c.nome_progetto.toLowerCase().includes(q);
      const matchCommessa = c.commesse.some(co => co.nome_commessa.toLowerCase().includes(q));
      if (!matchCliente && !matchCommessa) return false;
      if (!showOnlyActiveProject) return true;
      return c.commesse.some(co => co.attiva !== false);
    })
    .map(c => ({
      ...c,
      commesse: c.commesse.filter(co => {
        const q = filterClient.toLowerCase();
        const matchCliente = c.nome_progetto.toLowerCase().includes(q);
        const matchCommessa = co.nome_commessa.toLowerCase().includes(q);
        if (!matchCliente && !matchCommessa) return false;
        return showOnlyActiveProject ? co.attiva !== false : true;
      }),
    }));

  if (!isLoggedIn) return (
    <>
      <style>{customStyles}</style>
      <LoginPage onLogin={(user) => { setIsLoggedIn(true); setCurrentUser(user); loadCurrentStaff(user); }} />
    </>
  );

  if (loading || (isLoggedIn && !staffLoaded)) return <LoadingOverlay />;

  return (
    <div className="container">
      <style>{customStyles}</style>

      <header style={{ background: '#fff', flexShrink: 0, boxShadow: '0 1px 0 #e2e8f0, 0 2px 12px rgba(0,84,166,0.06)' }}>
        <div style={{ height: '3px', background: 'linear-gradient(90deg, #0054a6 0%, #38bdf8 100%)' }} />
        <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', height: isMobile ? '52px' : '60px' }}>
          <div style={{ background: '#0054a6', padding: isMobile ? '0 14px' : '0 28px', display: 'flex', alignItems: 'center', minWidth: isMobile ? 'unset' : '220px', flexShrink: 0 }}>
            <img src="/Zucchetti-Centro-Sistemi-Spa.png" alt="Zucchetti Centro Sistemi"
              style={{ height: isMobile ? '26px' : '36px', width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0.95 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, paddingLeft: '8px' }}>
            {isMobile ? (
              <div style={{ display: 'flex', alignItems: 'center', flex: 1, padding: '0 8px' }}>
                <select value={view} onChange={e => { const val = e.target.value; setView(val); if (val === 'progetti') setProgettoAperto(null); }}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '14px', fontWeight: 600, color: '#0054a6', outline: 'none', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230054a6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                  {visibleTabs.map(tab => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
                </select>
              </div>
            ) : (
              visibleTabs.map(tab => (
                <button key={tab.key} onClick={() => { setView(tab.key); if (tab.key === 'progetti') setProgettoAperto(null); }}
                  style={{ padding: '0 20px', border: 'none', borderBottom: view === tab.key ? '2.5px solid #0054a6' : '2.5px solid transparent', background: 'transparent', color: view === tab.key ? '#0054a6' : '#64748b', fontWeight: view === tab.key ? 600 : 400, fontSize: '13px', cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap' }}>
                  {tab.label}
                </button>
              ))
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: isMobile ? '0 10px' : '0 20px', flexShrink: 0 }}>
            {currentStaff && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowNotifiche(v => !v)}
                  style={{ position: 'relative', background: 'none', border: 'none', borderRadius: '8px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'all 0.15s' }}
                  onMouseOver={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0054a6'; }}
                  onMouseOut={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#64748b'; }}
                  aria-label="Notifiche">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {nonLette > 0 && (
                    <span style={{ position: 'absolute', top: 3, right: 3, background: '#E24B4A', color: '#fff', fontSize: '9px', fontWeight: 600, minWidth: 15, height: 15, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff', padding: '0 3px', lineHeight: 1 }}>
                      {nonLette > 9 ? '9+' : nonLette}
                    </span>
                  )}
                </button>
                {showNotifiche && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 990 }} onClick={() => setShowNotifiche(false)} />
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 10px)', background: '#fff', borderRadius: '14px', border: '0.5px solid #e2e8f0', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', width: 348, maxHeight: 500, display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px 12px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>Notifiche</span>
                          {nonLette > 0 && (
                            <span style={{ fontSize: '10px', fontWeight: 600, color: '#185FA5', background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: '20px', padding: '1px 7px' }}>{nonLette} nuove</span>
                          )}
                        </div>
                        {nonLette > 0 && (
                          <button onClick={segnaLetteTutte} style={{ fontSize: '11px', color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Segna tutte lette</button>
                        )}
                      </div>
                      <div style={{ overflow: 'auto', flex: 1 }}>
                        {notifiche.length === 0 ? (
                          <div style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                            Nessuna notifica
                          </div>
                        ) : notifiche.map(n => {
                          const tc = n.tipo === 'workflow'
                            ? { bg: '#E1F5EE', color: '#0F6E56', tagBg: '#E1F5EE', tagColor: '#085041', label: 'Workflow',
                                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
                            : n.tipo === 'progetto'
                            ? { bg: '#fdf4ff', color: '#7c3aed', tagBg: '#fdf4ff', tagColor: '#6d28d9', label: 'Progetto',
                                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> }
                            : { bg: '#E6F1FB', color: '#185FA5', tagBg: '#E6F1FB', tagColor: '#0C447C', label: 'Commessa',
                                icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> };
                          const diff = Date.now() - new Date(n.created_at).getTime();
                          const min = Math.floor(diff / 60000);
                          const tempo = min < 1 ? 'adesso' : min < 60 ? min + ' min fa' : Math.floor(min/60) < 24 ? Math.floor(min/60) + ' ore fa' : Math.floor(min/1440) === 1 ? 'ieri' : Math.floor(min/1440) + ' giorni fa';
                          return (
                            <div key={n.id} onClick={() => navigaNotifica(n)}
                              style={{ padding: '12px 18px', borderBottom: '0.5px solid #f8fafc', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start', opacity: n.letta ? 0.55 : 1, transition: 'background 0.12s' }}
                              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                              <div style={{ width: 6, flexShrink: 0, marginTop: 7, display: 'flex', justifyContent: 'center' }}>
                                {!n.letta
                                  ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#185FA5', flexShrink: 0 }} />
                                  : <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid #e2e8f0', flexShrink: 0 }} />
                                }
                              </div>
                              <div style={{ width: 34, height: 34, borderRadius: '9px', background: tc.bg, color: tc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {tc.icon}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', color: '#0f172a', lineHeight: 1.55, fontWeight: n.letta ? 400 : 500 }}>{n.testo}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 5 }}>
                                  <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: tc.tagBg, color: tc.tagColor, fontWeight: 600, border: `0.5px solid ${tc.tagColor}33` }}>{tc.label}</span>
                                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{tempo}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {currentUser && (
              <div style={{ position: 'relative' }}>
                <div onClick={() => setShowUserMenu(p => !p)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '4px 6px', borderRadius: '8px', transition: 'background 0.15s' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #bfdbfe' }}>
                    {currentStaff?.avatar_url ? (
                      <img src={currentStaff.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: '#dbeafe', color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
                        {currentStaff ? `${(currentStaff.nome || '').slice(0, 1)}${(currentStaff.cognome || '').slice(0, 1)}`.toUpperCase() : (currentUser.email || '').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {!isMobile && (
                    <>
                      <span style={{ fontSize: '12px', color: '#475569', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {currentStaff ? `${currentStaff.nome} ${currentStaff.cognome}` : currentUser.email}
                      </span>
                      <span style={{ fontSize: '9px', color: '#94a3b8' }}>▼</span>
                    </>
                  )}
                </div>
                {showUserMenu && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowUserMenu(false)} />
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: '220px', zIndex: 999, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #f1f5f9', background: '#fafbfc' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                          {currentStaff ? `${currentStaff.nome} ${currentStaff.cognome}` : currentUser.email}
                        </div>
                        {currentStaff?.ruolo && <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>{currentStaff.ruolo}</div>}
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 2 }}>{currentUser.email}</div>
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s', fontSize: '13px', color: '#475569' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: '16px' }}>📷</span>
                        <span>{currentStaff?.avatar_url ? 'Cambia foto profilo' : 'Carica foto profilo'}</span>
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !currentStaff) return;
                          const ext = file.name.split('.').pop();
                          const path = `${currentStaff.id}.${ext}`;
                          const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
                          if (upErr) { alert('Errore upload: ' + upErr.message); return; }
                          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
                          const avatar_url = urlData.publicUrl + '?t=' + Date.now();
                          await supabase.from('staff').update({ avatar_url }).eq('id', currentStaff.id);
                          setCurrentStaff(p => ({ ...p, avatar_url }));
                          setShowUserMenu(false);
                        }} />
                      </label>
                      {currentStaff?.avatar_url && (
                        <div onClick={async () => {
                          await supabase.from('staff').update({ avatar_url: null }).eq('id', currentStaff.id);
                          setCurrentStaff(p => ({ ...p, avatar_url: null }));
                          setShowUserMenu(false);
                        }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', fontSize: '13px', color: '#dc2626', transition: 'background 0.15s' }}
                          onMouseOver={e => e.currentTarget.style.background = '#fef2f2'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          <span style={{ fontSize: '16px' }}>🗑</span>
                          <span>Rimuovi foto</span>
                        </div>
                      )}
                      <div onClick={() => { setShowThemeSelector(true); setShowUserMenu(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', fontSize: '13px', color: '#475569', transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: '16px' }}>🎨</span>
                        <span>Aspetto</span>
                      </div>
                      <div style={{ height: '0.5px', background: '#f1f5f9' }} />
                      <div onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', fontSize: '13px', color: '#475569', transition: 'background 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: '16px' }}>🚪</span>
                        <span>Esci</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── VISTE ── */}
      {view === 'skills' ? (
        <DesktopOnly label="Matrice Skills">
          <div className="view-content animate-fade-in">
            <div className="toolbar">
              <div className="toolbar-left">
                <button onClick={() => setView('kpi')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 8, border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', marginRight: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  Home
                </button>
                <button className="menu-trigger-inline" onClick={() => setShowSidebarSkills(true)}><HamburgerIcon /></button>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px', marginLeft: '8px' }}>
                  {[{ key: 'matrice', label: 'Matrice' }, { key: 'storico', label: 'Storico' }, { key: 'formazione', label: 'Formazione' }].map(t => (
                    <button key={t.key} onClick={() => setSkillsSubView(t.key)} style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer', background: skillsSubView === t.key ? '#fff' : 'transparent', color: skillsSubView === t.key ? '#0054a6' : '#64748b', fontWeight: skillsSubView === t.key ? 600 : 400, boxShadow: skillsSubView === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{t.label}</button>
                  ))}
                </div>
                {skillsSubView === 'matrice' && (
                  <div className="folder-tabs">
                    {SKILLS_FOLDERS.map((f) => <button key={f} className={activeFolder === f ? 'active' : ''} onClick={() => setActiveFolder(f)}>{f}</button>)}
                  </div>
                )}
              </div>
              <button onClick={() => setTrainingMode(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s', marginLeft: 'auto', ...(trainingMode ? { background: '#fef3c7', borderColor: '#f59e0b', color: '#b45309' } : { background: '#f1f5f9', borderColor: '#e2e8f0', color: '#64748b' }) }}>
                <span style={{ fontSize: '14px' }}>🎓</span>
                {trainingMode ? 'Esci da Formazione' : 'Modalità Formazione'}
              </button>
            </div>
            {skillsSubView === 'matrice' && (<>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '11px' }}>
                <span style={{ color: '#94a3b8', marginRight: 4 }}>Scala:</span>
                {[{ v: 1, label: 'Base', bg: '#fef9c3', text: '#854d0e' }, { v: 2, label: 'Operativo', bg: '#dcfce7', text: '#166534' }, { v: 3, label: 'Esperto', bg: '#22c55e', text: '#fff' }, { v: 4, label: 'Referente', bg: '#15803d', text: '#fff' }].map(({ v, label, bg, text }) => (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: 20, height: 20, borderRadius: '4px', background: bg, color: text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{v}</div>
                    <span style={{ color: '#475569' }}>{label}</span>
                  </div>
                ))}
                <span style={{ marginLeft: 'auto', color: '#94a3b8', fontStyle: 'italic' }}>Clicca una cella per aggiornare — ogni modifica è storicizzata</span>
              </div>
              {trainingMode && (
                <div style={{ background: '#fef3c7', borderBottom: '1px solid #fde68a', padding: '6px 24px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🎓</span>
                  <strong>Modalità Formazione attiva</strong> — clicca le celle per segnare le skill da monitorare. Il valore non cambia.
                </div>
              )}
              <div className="table-container">
                <table className="skills-table">
                  <thead>
                    <tr>
                      <th className="sticky-col">Risorsa</th>
                      {skillsConfig[activeFolder].map((s) => <th key={s} title={s}>{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((person) => (
                      <tr key={person.id || staffKey(person)}>
                        <td className="sticky-col" style={{ padding: '6px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                            <Avatar name={staffLabel(person)} avatarUrl={person.avatar_url} size={28} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <strong style={{ fontSize: '13px' }}>{staffLabel(person)}</strong>
                              <span style={{ fontSize: '10px', fontStyle: 'italic', fontWeight: 300, color: '#94a3b8' }}>{person.ruolo || 'Consulente'}</span>
                            </div>
                          </div>
                        </td>
                        {skillsConfig[activeFolder].map((skill) => {
                          const v = matrix[`${staffKey(person)}-${skill}`] || 0;
                          const key = `${staffKey(person)}-${skill}`;
                          const isTraining = trainingCells[key];
                          const SKILL_LABELS = { 0: '', 1: 'Base', 2: 'Operativo', 3: 'Esperto', 4: 'Referente' };
                          const bgBase = v === 0 ? '#fff' : v === 1 ? '#fef9c3' : v === 2 ? '#dcfce7' : v === 3 ? '#22c55e' : '#15803d';
                          const textBase = v >= 3 ? '#fff' : v === 2 ? '#166534' : v === 1 ? '#854d0e' : '#94a3b8';
                          return (
                            <td key={skill} onClick={() => toggleSkill(person, skill)} className="skill-cell"
                              title={trainingMode ? 'Clicca per segnare/rimuovere dalla formazione' : v > 0 ? `${SKILL_LABELS[v]} — clicca per aggiornare` : 'Clicca per impostare il livello'}
                              style={{ cursor: 'pointer', backgroundColor: isTraining ? '#fef08a' : bgBase, color: isTraining ? '#78350f' : textBase, outline: isTraining ? '2px dashed #f59e0b' : 'none', outlineOffset: '-2px', transition: 'all 0.15s', position: 'relative', fontWeight: v > 0 ? 600 : 400, fontSize: '12px' }}>
                              {v > 0 ? v : ''}
                              {isTraining && <span style={{ position: 'absolute', top: 1, right: 2, fontSize: '7px', color: '#b45309', lineHeight: 1 }}>▲</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>)}
            {skillsSubView === 'storico' && <SkillStorico staff={staff} skillsConfig={skillsConfig} />}
            {skillsSubView === 'formazione' && (
              <SkillFormazione staff={staff} skillsConfig={skillsConfig} trainingCells={trainingCells} matrix={matrix}
                onRemove={async (sKey, skill) => {
                  const compositeKey = `${sKey}-${skill}`;
                  setTrainingCells(p => { const n = { ...p }; delete n[compositeKey]; return n; });
                  await supabase.from('skill_formazione').delete().eq('staff_key', sKey).eq('skill_key', skill);
                }}
              />
            )}
          </div>
        </DesktopOnly>

      ) : view === 'kpi' ? (
        <KPIView staff={staff} matrix={matrix} clients={visibleClients} assignments={assignments}
          skillsConfig={skillsConfig} currentMonths={currentMonths} trainingCells={trainingCells}
          isAdmin={isAdmin}
          onOpenProgetto={(progettoId, commessaId) => { setProgettoAperto({ progettoId, commessaId }); setView('progetti'); }}
          onNuovaCommessa={() => setShowNuovaAttivitaWizard(true)}
          onNuovaCommessaDiretta={() => setShowProjectModalFromWizard(true)}
          onNavigate={(v) => { if (v === 'skills') setView('skills'); else if (v === 'manageStaff') setShowManageStaff(true); }}
          onGestisciClienti={() => setShowManageClientsModal(true)} />

      ) : view === 'homeUser' ? (
        <HomeUser currentStaff={currentStaff} staff={staff} matrix={matrix} clients={visibleClients}
          assignments={assignments} currentMonths={currentMonths} skillsConfig={skillsConfig} trainingCells={trainingCells} />

      ) : view === 'todo' ? (
        <TodoView staff={staff} clients={visibleClients} isAdmin={isAdmin} openCardId={notificaApriCard} onCardOpened={() => setNotificaApriCard(null)} />

      ) : view === 'novita' ? (
        <NovitaProdottoView staff={staff} clients={visibleClients} isAdmin={isAdmin} />

      ) : view === 'progetti' ? (
        progettoAperto ? (
          <ProgettoView progettoId={progettoAperto.progettoId} commessaId={progettoAperto.commessaId}
            clients={visibleClients} staff={staff} currentUser={currentUser} onBack={() => setProgettoAperto(null)} />
        ) : (
          <ProgettiList clients={visibleClients} staff={staff} currentUser={currentUser}
            onOpenProgetto={(progettoId, commessaId) => setProgettoAperto({ progettoId, commessaId })} />
        )

      ) : (
        <DesktopOnly label="Pianificazione">
          <div className="view-content">
            <div className="toolbar">
              <div className="toolbar-left">
                <button className="menu-trigger-inline" onClick={() => setShowSidebarPlan(true)}><HamburgerIcon /></button>
                <div className="sub-view-tabs">
                  <button className={planSubView === 'byProject' ? 'active' : ''} onClick={() => setPlanSubView('byProject')}>Clienti</button>
                  <button className={planSubView === 'gantt' ? 'active' : ''} onClick={() => setPlanSubView('gantt')}>Gantt</button>
                  <button className={planSubView === 'byResource' || planSubView === 'weekly' || planSubView === 'sviluppo' ? 'active' : ''} onClick={() => setPlanSubView('byResource')}>Risorse</button>

                </div>
                {(planSubView === 'byResource' || planSubView === 'weekly' || planSubView === 'sviluppo') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span onClick={() => setPlanSubView('byResource')}
                      style={{ color: (planSubView === 'byResource' || planSubView === 'weekly') ? '#185FA5' : '#94a3b8', fontWeight: (planSubView === 'byResource' || planSubView === 'weekly') ? 600 : 400, cursor: 'pointer', borderBottom: (planSubView === 'byResource' || planSubView === 'weekly') ? '1.5px solid #185FA5' : '1.5px solid transparent', paddingBottom: 1 }}>Consulenza</span>
                    <span style={{ color: '#cbd5e1' }}>/</span>
                    <span onClick={() => setPlanSubView('sviluppo')}
                      style={{ color: planSubView === 'sviluppo' ? '#185FA5' : '#94a3b8', fontWeight: planSubView === 'sviluppo' ? 600 : 400, cursor: 'pointer', borderBottom: planSubView === 'sviluppo' ? '1.5px solid #185FA5' : '1.5px solid transparent', paddingBottom: 1 }}>Sviluppo</span>
                  </div>
                )}
                <SearchLens
                  value={planSubView === 'sviluppo' ? filterSviluppo : planSubView === 'byResource' || planSubView === 'weekly' ? filterStaff : filterClient}
                  onChange={(v) => planSubView === 'sviluppo' ? setFilterSviluppo(v) : planSubView === 'byResource' || planSubView === 'weekly' ? setFilterStaff(v) : setFilterClient(v)} />
              </div>
            </div>

            {/* ── SUB-BAR contestuale ── */}
            {planSubView !== 'kpi' && planSubView !== 'sviluppo' && (
              <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minHeight: 38 }}>
                {(planSubView === 'byResource' || planSubView === 'weekly') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span onClick={() => setPlanSubView('byResource')}
                      style={{ color: planSubView === 'byResource' ? '#0F6E56' : '#94a3b8', fontWeight: planSubView === 'byResource' ? 600 : 400, cursor: 'pointer', borderBottom: planSubView === 'byResource' ? '1.5px solid #0F6E56' : '1.5px solid transparent', paddingBottom: 1 }}>Mensile</span>
                    <span style={{ color: '#cbd5e1' }}>/</span>
                    <span onClick={() => setPlanSubView('weekly')}
                      style={{ color: planSubView === 'weekly' ? '#0F6E56' : '#94a3b8', fontWeight: planSubView === 'weekly' ? 600 : 400, cursor: 'pointer', borderBottom: planSubView === 'weekly' ? '1.5px solid #0F6E56' : '1.5px solid transparent', paddingBottom: 1 }}>Settimanale</span>
                  </div>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                  {planSubView !== 'sviluppo' && (
                    <button
                      onClick={() => planSubView === 'gantt' ? setShowOnlyActiveGantt(v => !v) : planSubView === 'weekly' ? setShowOnlyActiveWeekly(v => !v) : planSubView === 'byResource' ? setShowOnlyActiveResource(v => !v) : setShowOnlyActiveProject(v => !v)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.2s', ...((planSubView === 'gantt' ? showOnlyActiveGantt : planSubView === 'weekly' ? showOnlyActiveWeekly : planSubView === 'byResource' ? showOnlyActiveResource : showOnlyActiveProject) ? { background: '#f0fdf4', borderColor: '#22c55e', color: '#16a34a' } : { background: '#fff', borderColor: '#e2e8f0', color: '#64748b' }) }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: (planSubView === 'gantt' ? showOnlyActiveGantt : planSubView === 'weekly' ? showOnlyActiveWeekly : planSubView === 'byResource' ? showOnlyActiveResource : showOnlyActiveProject) ? '#16a34a' : '#cbd5e1', display: 'block', flexShrink: 0 }} />
                      Solo attive
                    </button>
                  )}
                  {planSubView === 'byProject' && (
                    <button onClick={() => setShowSviluppoProject(v => !v)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', ...(showSviluppoProject ? { background: '#f0fdf4', borderColor: '#86efac', color: '#16a34a' } : { background: '#fff', borderColor: '#e2e8f0', color: '#94a3b8' }) }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: showSviluppoProject ? '#16a34a' : '#cbd5e1', display: 'block', flexShrink: 0 }} />
                      Sviluppo
                    </button>
                  )}
                  {(planSubView === 'byProject' || planSubView === 'gantt') && (() => {
                    const state = planSubView === 'byProject' ? expandAllByProject : expandAllGantt;
                    const setter = planSubView === 'byProject' ? setExpandAllByProject : setExpandAllGantt;
                    return [{ key: 'clients', label: 'Clienti' }, { key: 'commesse', label: 'Commesse' }].map(btn => {
                      const isActive = state[btn.key];
                      return (
                        <div key={btn.key} onClick={() => setter(prev => ({ ...prev, [btn.key]: !prev[btn.key] }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? '#0054a6' : '#94a3b8', cursor: 'pointer', padding: '4px 2px', borderBottom: isActive ? '1.5px solid #0054a6' : '1.5px solid transparent', transition: 'all 0.15s', userSelect: 'none' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isActive ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
                          {btn.label}
                        </div>
                      );
                    });
                  })()}
                  {(planSubView === 'weekly' || planSubView === 'byResource') && (() => {
                    const state = planSubView === 'weekly' ? expandAllWeekly : expandAllResource;
                    const setter = planSubView === 'weekly' ? setExpandAllWeekly : setExpandAllResource;
                    return [{ key: 'clients', label: 'Clienti' }, { key: 'commesse', label: 'Commesse' }].map(btn => {
                      const isActive = state[btn.key];
                      return (
                        <div key={btn.key} onClick={() => setter(prev => ({ ...prev, [btn.key]: !prev[btn.key] }))}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: isActive ? 500 : 400, color: isActive ? '#0054a6' : '#94a3b8', cursor: 'pointer', padding: '4px 2px', borderBottom: isActive ? '1.5px solid #0054a6' : '1.5px solid transparent', transition: 'all 0.15s', userSelect: 'none' }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isActive ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
                          {btn.label}
                        </div>
                      );
                    });
                  })()}
                  {planSubView !== 'sviluppo' && (() => {
                    const currentStart = (timeFilters[planSubView] || timeFilters['byProject']).start;
                    const [sy, sm] = currentStart.split('-').map(Number);
                    const mesiIt = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
                    const dispLabel = `${mesiIt[sm-1]} ${sy}`;
                    return (
                      <div style={{ position: 'relative' }}>
                        <div onClick={() => { setShowMonthPicker(v => !v); setPickerYear(sy); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: showMonthPicker ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: showMonthPicker ? '#0054a6' : '#64748b', userSelect: 'none' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          {dispLabel}
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>+12m</span>
                        </div>
                        {showMonthPicker && (
                          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', zIndex: 300, padding: '12px 14px', minWidth: 220 }}
                            onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <button onClick={() => setPickerYear(y => y-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b', padding: '2px 8px' }}>&#8249;</button>
                              <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{pickerYear}</span>
                              <button onClick={() => setPickerYear(y => y+1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b', padding: '2px 8px' }}>&#8250;</button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
                              {['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'].map((m, i) => {
                                const val = `${pickerYear}-${String(i+1).padStart(2,'0')}`;
                                const isSel = val === currentStart;
                                return (
                                  <div key={m} onClick={() => { updateTimeFilter(planSubView || 'byProject', 'start', val); updateTimeFilter(planSubView || 'byProject', 'horizon', 12); setShowMonthPicker(false); }}
                                    style={{ textAlign: 'center', padding: '7px 4px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: isSel ? 600 : 400, background: isSel ? '#0054a6' : 'transparent', color: isSel ? '#fff' : '#374151' }}
                                    onMouseOver={e => { if (!isSel) e.currentTarget.style.background = '#f1f5f9'; }}
                                    onMouseOut={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                                    {m}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {planSubView === 'kpi' ? (
              <KpiPianificazione staff={staff} clients={visibleClients} assignments={assignments} />
            ) : planSubView === 'sviluppo' ? (
              <SviluppoView staff={visibleStaff} clients={visibleClients} isAdmin={isAdmin} CardModal={CardModal} filterSearch={filterSviluppo} />
            ) : planSubView === 'gantt' ? renderGantt()
            : planSubView === 'weekly' ? (
              <WeeklyView staff={consulenzaStaff} clients={visibleClients} assignments={assignments} setAssignments={setAssignments}
                filterStaff={filterStaff} showOnlyActive={showOnlyActiveWeekly}
                expandClients={expandAllWeekly.clients} expandCommesse={expandAllWeekly.commesse} />
            ) : (
              <div className="table-container animate-fade-in">
                <table>
                  <thead>
                    <tr>
                      <th className="sticky-col">Anagrafica</th>
                      {currentMonths.map((m) => <th key={m.label}>{m.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {planSubView === 'byProject'
                      ? byProjectClients.map((c) => (
                          <React.Fragment key={c.id}>
                            <tr className="row-client">
                              <td className="sticky-col" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                onClick={() => setExpandedItems((p) => ({ ...p, [c.id]: !p[c.id] }))}>
                                <span style={{ marginRight: '8px', width: '12px', display: 'inline-block' }}>{expandedItems[c.id] ? '▼' : '▶'}</span>
                                <strong>{c.nome_progetto}</strong>
                                <button className="btn-add-inline" title="Nuova Commessa" onClick={(e) => { e.stopPropagation(); openNewCommessaForClient(c.id); }}>+</button>
                              </td>
                              {currentMonths.map((m) => {
                                const tot = c.commesse.flatMap(co => co.team.map(mem => parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0)).reduce((a, b) => a + b, 0);
                                return <td key={m.label} style={{ textAlign: 'center', padding: '6px 4px' }}><span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{tot || ''}</span></td>;
                              })}
                            </tr>
                            {(expandedItems[c.id] || expandAllByProject.clients || expandAllByProject.commesse) && c.commesse.map((co) => (
                              <React.Fragment key={co.id}>
                                <tr className="row-commessa">
                                  <td className="sticky-col indent-1" style={{ cursor: 'pointer' }} onClick={() => setExpandedItems((p) => ({ ...p, [co.id]: !p[co.id] }))}>
                                    <span style={{ marginRight: '8px', width: '12px', display: 'inline-block' }}>{expandedItems[co.id] ? '▼' : '▶'}</span>
                                    <span className="clickable-commessa" onClick={(e) => { e.stopPropagation(); openCommessaEdit(c.id, co.id); }}>{co.nome_commessa}</span>
                                    {co.attiva === false && <span style={{ marginLeft: 6, fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>chiusa</span>}
                                  </td>
                                  {currentMonths.map((m) => {
                                    const previsti = co.team.reduce((s, mem) => s + (parseFloat(assignments[`${co.id}-${mem}-${m.label}`]) || 0), 0);
                                    const svolti = parseFloat(getGiorniSvolti(co, m.label).toFixed(1));
                                    const pct = previsti > 0 ? Math.min(100, (svolti / previsti) * 100) : 0;
                                    const overBudget = svolti > previsti && previsti > 0;
                                    return (
                                      <td key={m.label} style={{ textAlign: 'center', padding: '4px' }}>
                                        {previsti > 0 || svolti > 0 ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>{previsti || ''}</span>
                                            <div style={{ width: '36px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                              <div style={{ width: `${overBudget ? 100 : pct}%`, height: '100%', background: overBudget ? '#E24B4A' : '#639922', borderRadius: '2px' }} />
                                            </div>
                                            {svolti > 0 && <span style={{ fontSize: '10px', color: overBudget ? '#E24B4A' : '#3B6D11', fontWeight: 600 }}>{svolti}</span>}
                                          </div>
                                        ) : ''}
                                      </td>
                                    );
                                  })}
                                </tr>
                                {(expandedItems[co.id] || expandAllByProject.commesse) && co.team.map((st) => {
                                  const stObj = staff.find(s => staffKey(s) === st);
                                  const codiceOpSt = String(stObj?.codice || '').trim();
                                  return (
                                    <tr key={`${co.id}-${st}`} className="row-staff">
                                      <td className="sticky-col indent-2">{st}</td>
                                      {currentMonths.map((m) => {
                                        const previsti = parseFloat(assignments[`${co.id}-${st}-${m.label}`]) || 0;
                                        const parts = m.label.split(' ');
                                        const meseNum = mesiIT[parts[0]];
                                        const annoNum = '20' + parts[1];
                                        const annoMese = meseNum && annoNum ? `${annoNum}-${meseNum}` : null;
                                        const svoltiSt = annoMese && codiceOpSt && (co.bolle || []).length > 0
                                          ? parseFloat(
                                              (co.bolle || []).reduce((tot, codBolla) => {
                                                const key = `${codBolla}-${annoMese}-${codiceOpSt}`;
                                                return tot + ((consuntiviGlobaliOp[key] || 0) / 8);
                                              }, 0).toFixed(1)
                                            )
                                          : 0;
                                        const pctSt = previsti > 0 ? Math.min(100, (svoltiSt / previsti) * 100) : 0;
                                        const overBudgetSt = svoltiSt > previsti && previsti > 0;
                                        const openPopup = () => {
                                          if (!annoMese || !codiceOpSt || (co.bolle || []).length === 0) return;
                                          setPopupConsuntivi({
                                            commessa: co,
                                            staffNome: st,
                                            codiceOperatore: codiceOpSt,
                                            annoMese,
                                            meseLabel: m.label,
                                            clienteNome: c.nome_progetto,
                                          });
                                        };
                                        return (
                                          <td key={m.label} style={{ textAlign: 'center', padding: '4px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                              <input type="number" step="0.5" min="0" className="cell-input"
                                                value={assignments[`${co.id}-${st}-${m.label}`] || ''}
                                                onChange={(e) => updateGg(co.id, st, m.label, e.target.value)}
                                                style={{ border: 'none', borderBottom: '1.5px solid transparent', background: 'transparent', outline: 'none', textAlign: 'center', width: 52, fontSize: 12, padding: '3px 0' }}
                                                onFocus={e => e.target.style.borderBottomColor = '#0d4d8a'}
                                                onBlur={e => e.target.style.borderBottomColor = 'transparent'} />
                                              {(previsti > 0 || svoltiSt > 0) && (
                                                <>
                                                  <div
                                                    onClick={svoltiSt > 0 ? openPopup : undefined}
                                                    title={svoltiSt > 0 ? 'Clicca per vedere i consuntivi' : undefined}
                                                    style={{ width: '36px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', cursor: svoltiSt > 0 ? 'pointer' : 'default' }}>
                                                    <div style={{ width: `${overBudgetSt ? 100 : pctSt}%`, height: '100%', background: overBudgetSt ? '#E24B4A' : '#639922', borderRadius: '2px' }} />
                                                  </div>
                                                  {svoltiSt > 0 && (
                                                    <span
                                                      onClick={openPopup}
                                                      title="Clicca per vedere i consuntivi dettagliati"
                                                      style={{ fontSize: '10px', color: overBudgetSt ? '#E24B4A' : '#3B6D11', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 2 }}>
                                                      {svoltiSt}
                                                    </span>
                                                  )}
                                                </>
                                              )}
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                                {(expandedItems[co.id] || expandAllByProject.commesse) && (() => {
                                  if (!showSviluppoProject) return null;
                                  const attComm = attivitaRilascio.filter(a => {
                                    if (a.commessa_id !== co.id) return false;
                                    const colInfo = colonneRilascioMap[a.colonna_id];
                                    if (!colInfo) return false;
                                    if (/complet|annull|done/i.test(colInfo.nome)) return false;
                                    return true;
                                  });
                                  if (attComm.length === 0) return null;
                                  return attComm.map(att => {
                                    const colInfo = colonneRilascioMap[att.colonna_id] || { nome: '', colore: '#64748b' };
                                    return (
                                      <tr key={`att-${att.id}`} style={{ background: '#fafbfc' }}>
                                        <td className="sticky-col indent-2" style={{ color: '#64748b', fontStyle: 'italic', fontSize: 11 }}>
                                          <div onClick={() => setCardSolaLettura(att)} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                                            onMouseOver={e => e.currentTarget.style.color = '#0054a6'}
                                            onMouseOut={e => e.currentTarget.style.color = '#64748b'}>
                                            <svg width="8" height="8" viewBox="0 0 10 10"><polygon points="5,0 10,5 5,10 0,5" fill={colInfo.colore}/></svg>
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140, textDecoration: 'underline dotted' }}>{att.titolo}</span>
                                          </div>
                                        </td>
                                        {currentMonths.map((m) => {
                                          const rilascio = att.data_fine_lavori || att.data_rilascio;
                                          const [mm, yy] = m.label.split(' ');
                                          const mKey = yy && mm ? `20${yy}-${mesiIT[mm]}` : null;
                                          const isRilascioMonth = mKey && rilascio && rilascio.slice(0,7) === mKey;
                                          return (
                                            <td key={m.label} style={{ textAlign: 'center', padding: '4px' }}>
                                              {isRilascioMonth && (
                                                <div title={`Rilascio: ${rilascio?.split('-').reverse().join('/')}\nColonna: ${colInfo.nome}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                  <svg width="14" height="14" viewBox="0 0 14 14">
                                                    <polygon points="7,0 14,7 7,14 0,7" fill={colInfo.colore} opacity="0.9"/>
                                                  </svg>
                                                </div>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  });
                                })()}
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))
                      : consulenzaStaff.filter((s) => staffLabel(s).toLowerCase().includes(filterStaff.toLowerCase())).map((sObj) => {
                          const sName = staffKey(sObj);
                          const isStaffOpen = expandAllResource.clients || expandAllResource.commesse || !!expandedItems[sName];
                          const isClientOpen = (id) => expandAllResource.clients || expandAllResource.commesse || !!expandedItems[`r-${sName}-${id}`];
                          const isCommOpen = (id) => {
                            if (!isClientOpen(id)) return false;
                            if (expandAllResource.commesse) return true;
                            return !!expandedItems[`rcomm-${sName}-${id}`];
                          };
                          const toggleClientR = (id, e) => {
                            e.stopPropagation();
                            if (!isClientOpen(id)) {
                              setExpandedItems((p) => ({ ...p, [`r-${sName}-${id}`]: true, [`rcomm-${sName}-${id}`]: true }));
                            } else if (isCommOpen(id)) {
                              setExpandedItems((p) => ({ ...p, [`rcomm-${sName}-${id}`]: false }));
                            } else {
                              setExpandedItems((p) => ({ ...p, [`rcomm-${sName}-${id}`]: true }));
                            }
                          };
                          const toggleCommR = (id, e) => { e.stopPropagation(); setExpandedItems((p) => ({ ...p, [`rcomm-${sName}-${id}`]: !isCommOpen(id) })); };

                          const clientGroups = visibleClients
                            .map(cl => ({ cl, commesse: cl.commesse.filter(cm => cm.team.includes(sName) && (!showOnlyActiveResource || cm.attiva !== false)) }))
                            .filter(g => g.commesse.length > 0);

                          return (
                            <React.Fragment key={sName}>
                              <tr className="row-client" onClick={() => setExpandedItems((p) => ({ ...p, [sName]: !isStaffOpen }))} style={{ cursor: 'pointer' }}>
                                <td className="sticky-col" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
                                  <Avatar name={sName} avatarUrl={sObj.avatar_url} size={30} />
                                  <strong>{staffLabel(sObj)}</strong>
                                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94a3b8' }}>{isStaffOpen ? '▼' : '▶'}</span>
                                </td>
                                {currentMonths.map((m) => {
                                  const assigned = clientGroups.flatMap(g => g.commesse).reduce((s, cm) => s + (parseFloat(assignments[`${cm.id}-${sName}-${m.label}`]) || 0), 0);
                                  const residuo = workingDays(m.label) - assigned;
                                  const color = residuo < 5 ? '#dc2626' : residuo <= 10 ? '#d97706' : '#94a3b8';
                                  return <td key={m.label} style={{ textAlign: 'center' }}><span style={{ fontSize: '12px', fontWeight: residuo < 5 || residuo <= 10 ? 700 : 400, color }}>{residuo}</span></td>;
                                })}
                              </tr>
                              {isStaffOpen && clientGroups.map(({ cl, commesse }) => (
                                <React.Fragment key={`${sName}-${cl.id}`}>
                                  <tr className="row-commessa" style={{ cursor: 'pointer' }} onClick={(e) => toggleClientR(cl.id, e)}>
                                    <td className="sticky-col indent-1" style={{ color: '#2563eb', fontWeight: 600 }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: 9, color: '#94a3b8', width: 10 }}>{isClientOpen(cl.id) ? '▼' : '▶'}</span>
                                        <span style={{ flex: 1 }}>{cl.nome_progetto}</span>
                                        {isClientOpen(cl.id) && (
                                          <span onClick={(e) => toggleCommR(cl.id, e)} style={{ fontSize: 9, color: isCommOpen(cl.id) ? '#2563eb' : '#94a3b8', padding: '2px 5px', borderRadius: '4px', background: isCommOpen(cl.id) ? '#eff6ff' : '#f1f5f9', cursor: 'pointer' }}>
                                            {isCommOpen(cl.id) ? '▴' : '▾'}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    {currentMonths.map((m) => (
                                      <td key={m.label} style={{ textAlign: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748b' }}>
                                          {commesse.reduce((s, cm) => s + (parseFloat(assignments[`${cm.id}-${sName}-${m.label}`]) || 0), 0) || ''}
                                        </span>
                                      </td>
                                    ))}
                                  </tr>
                                  {isClientOpen(cl.id) && isCommOpen(cl.id) && commesse.map((ra) => (
                                    <tr key={`${sName}-${ra.id}`} className="row-staff">
                                      <td className="sticky-col indent-2">{ra.nome_commessa}</td>
                                      {currentMonths.map((m) => {
                                        const previsti = parseFloat(assignments[`${ra.id}-${sName}-${m.label}`]) || 0;
                                        const codiceOp = String(sObj.codice || '').trim();
                                        const parts = m.label.split(' ');
                                        const meseNum = mesiIT[parts[0]];
                                        const annoNum = '20' + parts[1];
                                        const annoMese = meseNum && annoNum ? `${annoNum}-${meseNum}` : null;
                                        const svolti = annoMese && codiceOp && (ra.bolle || []).length > 0
                                          ? parseFloat(
                                              (ra.bolle || []).reduce((tot, codBolla) => {
                                                const key = `${codBolla}-${annoMese}-${codiceOp}`;
                                                return tot + ((consuntiviGlobaliOp[key] || 0) / 8);
                                              }, 0).toFixed(1)
                                            )
                                          : 0;
                                        const pct = previsti > 0 ? Math.min(100, (svolti / previsti) * 100) : 0;
                                        const overBudget = svolti > previsti && previsti > 0;
                                        return (
                                          <td key={m.label} style={{ textAlign: 'center', padding: '4px' }}>
                                            {previsti > 0 || svolti > 0 ? (
                                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                <input type="number" step="0.5" min="0"
                                                  value={assignments[`${ra.id}-${sName}-${m.label}`] || ''}
                                                  onChange={(e) => updateGg(ra.id, sName, m.label, e.target.value)}
                                                  style={{ border: 'none', borderBottom: '1.5px solid transparent', background: 'transparent', outline: 'none', textAlign: 'center', width: 44, fontSize: 12, padding: '3px 0' }}
                                                  onFocus={e => e.target.style.borderBottomColor = '#0d4d8a'}
                                                  onBlur={e => e.target.style.borderBottomColor = 'transparent'} />
                                                <div style={{ width: '36px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                                                  <div style={{ width: `${overBudget ? 100 : pct}%`, height: '100%', background: overBudget ? '#E24B4A' : '#639922', borderRadius: '2px' }} />
                                                </div>
                                                {/* ── Numero giorni svolti — cliccabile per popup consuntivi ── */}
                                                {svolti > 0 && (
                                                  <span
                                                    onClick={() => {
                                                      if (!annoMese || !codiceOp) return;
                                                      setPopupConsuntivi({
                                                        commessa: ra,
                                                        staffNome: sName,
                                                        codiceOperatore: codiceOp,
                                                        annoMese,
                                                        meseLabel: m.label,
                                                        clienteNome: cl.nome_progetto,
                                                      });
                                                    }}
                                                    title="Clicca per vedere i consuntivi dettagliati"
                                                    style={{
                                                      fontSize: '10px',
                                                      color: overBudget ? '#E24B4A' : '#3B6D11',
                                                      fontWeight: 600,
                                                      cursor: 'pointer',
                                                      textDecoration: 'underline dotted',
                                                      textUnderlineOffset: 2,
                                                    }}
                                                  >
                                                    {svolti}
                                                  </span>
                                                )}
                                              </div>
                                            ) : (
                                              <input type="number" step="0.5" min="0"
                                                value={assignments[`${ra.id}-${sName}-${m.label}`] || ''}
                                                onChange={(e) => updateGg(ra.id, sName, m.label, e.target.value)}
                                                style={{ border: 'none', borderBottom: '1.5px solid transparent', background: 'transparent', outline: 'none', textAlign: 'center', width: 44, fontSize: 12, padding: '3px 0' }}
                                                onFocus={e => e.target.style.borderBottomColor = '#0d4d8a'}
                                                onBlur={e => e.target.style.borderBottomColor = 'transparent'} />
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </React.Fragment>
                              ))}
                            </React.Fragment>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DesktopOnly>
      )}

      {/* ── SIDEBARS ── */}
      <div className={`sidebar-overlay ${showSidebarSkills ? 'active' : ''}`} onClick={() => setShowSidebarSkills(false)}>
        <div className="sidebar-content" onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-header">
            <h3>Impostazioni Skills</h3>
            <button className="btn-close-circle" onClick={() => setShowSidebarSkills(false)}>×</button>
          </div>
          <div className="sidebar-body">
            <button className="sidebar-item" onClick={() => { setShowManageSkills(true); setShowSidebarSkills(false); }}>🔧 Gestisci Voci Skill</button>
            <button className="sidebar-item" onClick={() => { setShowManageStaff(true); setShowSidebarSkills(false); }}>👥 Gestisci Risorse</button>
          </div>
        </div>
      </div>

      <div className={`sidebar-overlay ${showSidebarPlan ? 'active' : ''}`} onClick={() => setShowSidebarPlan(false)}>
        <div className="sidebar-content" onClick={(e) => e.stopPropagation()}>
          <div className="sidebar-header">
            <h3>Gestione Planning</h3>
            <button className="btn-close-circle" onClick={() => setShowSidebarPlan(false)}>×</button>
          </div>
          <div className="sidebar-body">
            <button className="sidebar-item" onClick={() => { setShowManageClientsModal(true); setShowSidebarPlan(false); }}>🛠️ Gestisci Anagrafica Clienti</button>
            <button className="sidebar-item" onClick={() => { setShowManageStaff(true); setShowSidebarPlan(false); }}>👥 Gestisci Risorse</button>
            {isAdmin && (
              <>
                <div style={{ height: '0.5px', background: '#f1f5f9', margin: '8px 0' }} />
                <button className="sidebar-item" onClick={() => { setPlanSubView('kpi'); setShowSidebarPlan(false); }}>📊 KPI Pianificazione</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {showMonthPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setShowMonthPicker(false)} />
      )}

      {showManageSkills && <ManageSkillsModal skillsConfig={skillsConfig} setSkillsConfig={setSkillsConfig} onClose={() => { setShowManageSkills(false); loadAllData(); }} />}
      {showManageStaff && <ManageStaffModal staff={staff} isAdmin={isAdmin} onClose={() => { setShowManageStaff(false); loadAllDataSilent(); }} />}
      {cardSolaLettura && (
        <CardSolaLettura card={cardSolaLettura} colonneMap={colonneRilascioMap} clients={visibleClients} onClose={() => setCardSolaLettura(null)} />
      )}

      {/* ── Popup consuntivi dettaglio ── */}
      {popupConsuntivi && (
        <PopupConsuntivi
          commessa={popupConsuntivi.commessa}
          staffNome={popupConsuntivi.staffNome}
          codiceOperatore={popupConsuntivi.codiceOperatore}
          annoMese={popupConsuntivi.annoMese}
          meseLabel={popupConsuntivi.meseLabel}
          clienteNome={popupConsuntivi.clienteNome}
          onClose={() => setPopupConsuntivi(null)}
        />
      )}

      {showNuovaAttivitaWizard && (
        <NuovaAttivitaWizard
          clients={visibleClients}
          onClose={() => setShowNuovaAttivitaWizard(false)}
          onNuovaCommessa={() => { setShowNuovaAttivitaWizard(false); setShowProjectModalFromWizard(true); }}
          onApriCommessa={(commessaId, clientId) => { setWizardTargetedEdit({ commessaId, clientId }); setShowNuovaAttivitaWizard(false); setShowWizardProjectModal(true); }}
        />
      )}
      {showWizardProjectModal && wizardTargetedEdit && (
        <ProjectModal staff={staff} clients={visibleClients} matrix={matrix}
          targetedEdit={wizardTargetedEdit}
          onClose={() => { setShowWizardProjectModal(false); setWizardTargetedEdit(null); loadAllDataSilent(); }}
          onOpenProgetto={(progettoId, commessaId) => { setProgettoAperto({ progettoId, commessaId }); setView('progetti'); setShowWizardProjectModal(false); setWizardTargetedEdit(null); }} />
      )}
      {showProjectModalFromWizard && (
        <ProjectModal staff={staff} clients={visibleClients} matrix={matrix}
          onClose={() => { setShowProjectModalFromWizard(false); loadAllDataSilent(); }}
          onOpenProgetto={(progettoId, commessaId) => { setProgettoAperto({ progettoId, commessaId }); setView('progetti'); setShowProjectModalFromWizard(false); }} />
      )}
      {showClientModal && <ClientModal staff={staff} matrix={matrix} onClose={() => { setShowClientModal(false); loadAllDataSilent(); }} />}
      {showManageClientsModal && (
        <ManageClientsModal clients={clients}
          onEdit={(c) => { const fresh = clients.find(x => x.id === c.id) || c; setSelectedClientEdit(fresh); setShowEditClientModal(true); setShowManageClientsModal(false); }}
          onClose={() => { setShowManageClientsModal(false); loadAllDataSilent(); }}
        />
      )}
      {showProjectModal && (
        <ProjectModal staff={staff} clients={clients} matrix={matrix} targetedEdit={targetedProjectEdit}
          onOpenProgetto={(progettoId, commessaId) => { setProgettoAperto({ progettoId, commessaId }); setView('progetti'); }}
          onClose={() => { setShowProjectModal(false); setTargetedProjectEdit(null); loadAllDataSilent(); }}
        />
      )}
      {showEditClientModal && selectedClientEdit && (
        <EditClientModal client={selectedClientEdit} staff={staff} matrix={matrix} clients={clients}
          onClose={async () => { await loadAllData(); setShowEditClientModal(false); setSelectedClientEdit(null); }}
        />
      )}
      {showImportExcelModal && <ImportExcelModal onClose={() => { setShowImportExcelModal(false); loadAllData(); }} />}
      {showGestioneDati && <GestioneDatiModal onClose={() => { setShowGestioneDati(false); loadAllData(); }} />}

      {/* Toast notifiche */}
      <style>{`@keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1500, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: '#001d47', color: '#fff', padding: '12px 18px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontSize: '13px', maxWidth: 320, display: 'flex', alignItems: 'flex-start', gap: '10px', animation: 'slideInRight 0.3s ease-out', pointerEvents: 'all' }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>🔔</span>
            <span style={{ lineHeight: 1.4 }}>{t.testo}</span>
          </div>
        ))}
      </div>

      {showThemeSelector && (
        <div className="modal-overlay" onClick={() => setShowThemeSelector(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}
            style={{ width: '760px', padding: 0, borderRadius: '16px', overflow: 'hidden' }}>
            <button className="btn-close-circle" onClick={() => setShowThemeSelector(false)}>×</button>
            <ThemeSelector />
          </div>
        </div>
      )}
    </div>
  );
}