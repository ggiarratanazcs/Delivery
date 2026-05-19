// ─────────────────────────────────────────────
// constants.js
// Tutte le costanti dell'applicazione ZCS Portal
// ─────────────────────────────────────────────

// ── Skills ──────────────────────────────────
export const SKILLS_FOLDERS = [
  'Teseo',
  'Cassiopea',
  'Business intelligence',
  'Soft skills',
];

export const DEFAULT_SKILLS = {
  Teseo: [
    'Contabilità', 'Documenti', 'Cespiti', 'Analitica CDC', 'Bilancio',
    'Edifact', 'Lotti/Matricole', 'Distinta Base', 'Produzione', 'Taglie colori',
    'Produzione Fashion', 'WMS', 'Milk', 'Oil', 'Wine', 'TA Web', 'Retail',
    'E-Commerce', 'Cont. Commesse', 'Vis Commesse', 'Intersocietario', 'Budget',
    'Import Paghe', 'Preventivi', 'Tentata Vendita', 'InfoVision', 'Doc Finance',
    'Self Planning', 'CONAI', 'Libro Soci e Prestito Soc.', 'SQL',
    'Passaggio Dati', 'Gestione Progetto',
  ],
  Cassiopea: ['Skill Test 1', 'Skill Test 2'],
  'Business intelligence': ['PowerBI', 'SQL Server'],
  'Soft skills': ['Problem Solving', 'Leadership'],
};

// ── Prodotti catalogo ────────────────────────
export const PRODOTTI_CATALOGO = [
  { id: 'Teseo 6',    categoria: 'ERP' },
  { id: 'Teseo 7',    categoria: 'ERP' },
  { id: 'Teseo Plus', categoria: 'ERP' },
  { id: 'Cassiopea',  categoria: 'CRM' },
  { id: 'InfoVision', categoria: 'BI'  },
  { id: 'Milk',       categoria: 'Verticali' },
  { id: 'Oil',        categoria: 'Verticali' },
  { id: 'Bakery',     categoria: 'Verticali' },
  { id: 'Wine',       categoria: 'Verticali' },
  { id: 'Fashion',    categoria: 'Verticali' },
  { id: 'Green',      categoria: 'Verticali' },
];

export const CATEGORIA_COLORS = {
  ERP:       { bg: '#eff6ff', border: '#B5D4F4', text: '#0C447C', badge: '#dbeafe', badgeText: '#185FA5' },
  CRM:       { bg: '#f0fdf4', border: '#C0DD97', text: '#27500A', badge: '#dcfce7', badgeText: '#3B6D11' },
  BI:        { bg: '#fef3c7', border: '#FAC775', text: '#633806', badge: '#fde68a', badgeText: '#854F0B' },
  Verticali: { bg: '#fdf2f8', border: '#F4C0D1', text: '#72243E', badge: '#fce7f3', badgeText: '#993556' },
};

// ── Staff / Ruoli ────────────────────────────
export const RUOLI = ['Consulente', 'PM', 'Programmatore', 'Analista'];

export const RUOLO_COLORS = {
  PM:            { bg: '#eff6ff', border: '#B5D4F4', text: '#0C447C' },
  Consulente:    { bg: '#f0fdf4', border: '#C0DD97', text: '#27500A' },
  Programmatore: { bg: '#fef3c7', border: '#FAC775', text: '#633806' },
  Analista:      { bg: '#fdf2f8', border: '#F4C0D1', text: '#72243E' },
};

// ── Workflow / Kanban ────────────────────────
export const COL_COLORS = [
  '#64748b', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
];

export const PRIORITA_COLORS = {
  alta:  { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', dot: '#dc2626' },
  media: { bg: '#fef9c3', border: '#fde68a', text: '#b45309', dot: '#f59e0b' },
  bassa: { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', dot: '#22c55e' },
};

// ── Progetti / Task ──────────────────────────
export const REPARTI_STANDARD = [
  'DATI GENERALI',
  'COMMERCIALE',
  'ACQUISTI',
  'CONTABILITÀ',
  'MAGAZZINO',
];

export const STATI_TASK = [
  'Da Iniziare',
  'Da approfondire',
  'In Corso',
  'Da collaudare',
  'Chiusa',
];

export const STATO_COLORS = {
  'Da Iniziare':     { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' },
  'Da approfondire': { bg: '#fef9c3', text: '#854d0e', border: '#fde68a' },
  'In Corso':        { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  'Da collaudare':   { bg: '#ffedd5', text: '#9a3412', border: '#fed7aa' },
  'Chiusa':          { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
};

export const STATI_COLORS_BAR = {
  'Da Iniziare':     '#94a3b8',
  'Da approfondire': '#f59e0b',
  'In Corso':        '#3b82f6',
  'Da collaudare':   '#f97316',
  'Chiusa':          '#22c55e',
};

export const IN_CARICO_OPTIONS = ['ZCS', 'CLIENTE', 'ZCS/CLIENTE'];

// ── Gantt pianificazione ─────────────────────
export const GANTT_COLUMN_WIDTH = 150;