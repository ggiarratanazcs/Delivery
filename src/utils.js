// ─────────────────────────────────────────────
// utils.js
// Funzioni di utilità dell'applicazione ZCS Portal
// ─────────────────────────────────────────────

// ── Giorni lavorativi ────────────────────────

function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getItalianHolidays(year) {
  const easter = getEasterDate(year);
  const pasquetta = new Date(easter);
  pasquetta.setDate(easter.getDate() + 1);
  const fmt = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return new Set([
    `${year}-01-01`,
    `${year}-01-06`,
    fmt(easter),
    fmt(pasquetta),
    `${year}-04-25`,
    `${year}-05-01`,
    `${year}-06-02`,
    `${year}-08-15`,
    `${year}-11-01`,
    `${year}-12-08`,
    `${year}-12-25`,
    `${year}-12-26`,
  ]);
}

function getWorkingDaysInMonth(year, month) {
  const holidays = getItalianHolidays(year);
  const holidaysPrev = getItalianHolidays(year - 1);
  const holidaysNext = getItalianHolidays(year + 1);
  const allHolidays = new Set([...holidays, ...holidaysPrev, ...holidaysNext]);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (allHolidays.has(key)) continue;
    count++;
  }
  return count;
}

const _wdCache = {};
export function workingDays(monthLabel) {
  if (_wdCache[monthLabel]) return _wdCache[monthLabel];
  try {
    const months = {
      GEN: 0, FEB: 1, MAR: 2, APR: 3, MAG: 4, GIU: 5,
      LUG: 6, AGO: 7, SET: 8, OTT: 9, NOV: 10, DIC: 11,
    };
    const parts = monthLabel.trim().split(/\s+/);
    const m = months[parts[0]];
    const y = 2000 + parseInt(parts[1]);
    if (m === undefined || isNaN(y)) return 20;
    const result = getWorkingDaysInMonth(y, m);
    _wdCache[monthLabel] = result;
    return result;
  } catch {
    return 20;
  }
}

export const getDefaultStartDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

// ── Settimane ────────────────────────────────

export function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export function getWeekRange(weekKey) {
  const [year, w] = weekKey.split('-W');
  const simple = new Date(parseInt(year), 0, 1 + (parseInt(w) - 1) * 7);
  const dow = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - (dow <= 4 ? dow - 1 : dow - 8));
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (d) => d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
  return `${fmt(monday)} – ${fmt(friday)}`;
}

// ── Avatar ───────────────────────────────────

const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#cffafe', text: '#155e75' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#f1f5f9', text: '#334155' },
];

export function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function getAvatarUrl(name, staffArray) {
  if (!name || !staffArray) return null;
  const s = staffArray.find(s => staffKey(s) === name || staffLabel(s) === name);
  return s?.avatar_url || null;
}

export function staffKey(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return `${s.cognome} ${s.nome}`;
}

export function staffLabel(s) {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return `${s.cognome} ${s.nome}`;
}