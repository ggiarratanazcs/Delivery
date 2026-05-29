import React, { useState, useEffect } from 'react';
import { CardModal } from './CardModal.jsx';
import { supabase } from '../supabase.js';
import { PRIORITA_COLORS, COL_COLORS } from '../constants.js';
import { staffKey, staffLabel, getAvatarColor, getInitials } from '../utils.js';
import { MultiPillFilter } from './MultiPillFilter.jsx';
import { HamburgerIcon } from './HamburgerIcon.jsx';
import { useIsMobile } from './DesktopOnly.jsx';
import { OrdiniRichiesteView } from './OrdiniRichiesteView.jsx';


// ─────────────────────────────────────────────
// Helper: invia notifiche quando una card cambia colonna
// ─────────────────────────────────────────────
async function inviaNotificheTransizione(card, nuovaColonna, allStaff) {
  // Carica config notifiche per la colonna di destinazione
  const { data: cfg } = await supabase
    .from('workflow_notifiche_config')
    .select('*')
    .eq('colonna_id', nuovaColonna.id)
    .single();

  if (!cfg) return;

  const destinatari = new Set();
  const testo = `Card "${card.titolo}" è entrata in "${nuovaColonna.nome}"`;

  // Notifica analista del team
  if (cfg.notifica_analista && card.team_sviluppo) {
    const analista = allStaff.find(s =>
      s.ruolo === 'Analista' && s.team_prodotto === card.team_sviluppo
    );
    if (analista) destinatari.add(`${analista.cognome} ${analista.nome}`);
  }

  // Notifica PM della commessa
  if (cfg.notifica_pm) {
    let pmCommessa = card.commessa?.pm_commessa || null;

    // Se la commessa non è joinata nell'oggetto card, la ricarico dal DB
    if (!pmCommessa && card.commessa_id) {
      const { data: comm } = await supabase
        .from('commesse')
        .select('pm_commessa')
        .eq('id', card.commessa_id)
        .single();
      pmCommessa = comm?.pm_commessa || null;
    }

    if (pmCommessa) destinatari.add(pmCommessa);
  }

  if (destinatari.size === 0) return;

  await supabase.from('notifiche').insert(
    [...destinatari].map(dest => ({
      destinatario: dest,
      testo,
      tipo: 'workflow',
      riferimento_id: card.id,
    }))
  );
}

// Dropdown minimal per la modale vista
function VistaDropdown({ options, value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  const label = options.find(o => o.value === value)?.label ?? 'Tutti';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? 'var(--brand-700)' : 'var(--gray-200)'}`, padding: '4px 0 8px', cursor: 'pointer', minHeight: 30 }}>
        <span style={{ fontSize: 12, color: value ? 'var(--gray-900)' : 'var(--gray-400)' }}>{label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '0.5px solid var(--gray-200)', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,18,41,0.1)', zIndex: 500, overflow: 'hidden' }}>
          {options.map((o, i) => (
            <div key={i} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', background: o.value === value ? 'var(--brand-50)' : '#fff', color: o.value === value ? 'var(--brand-800)' : 'var(--gray-900)', fontWeight: o.value === value ? 500 : 400 }}
              onMouseOver={e => { if (o.value !== value) e.currentTarget.style.background = 'var(--gray-50)'; }}
              onMouseOut={e => { if (o.value !== value) e.currentTarget.style.background = '#fff'; }}>{o.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SearchLens collassabile per TodoView ─────────────────────────────────────
function SearchLensTodo({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => { if (open && ref.current) ref.current.focus(); }, [open]);
  React.useEffect(() => { if (value) setOpen(true); }, [value]);
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: open ? 'var(--gray-50)' : 'transparent', border: open ? '1px solid var(--gray-200)' : '1px solid transparent', borderRadius: 20, padding: open ? '4px 10px 4px 8px' : '4px', transition: 'all 0.2s', cursor: 'pointer' }}
        onClick={() => !open && setOpen(true)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke={open ? 'var(--brand-700)' : 'var(--gray-400)'} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}
          onClick={e => { if (open) { e.stopPropagation(); setOpen(false); onChange(''); } }}>
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
        </svg>
        {open && (
          <input ref={ref} type="text" value={value} onChange={e => onChange(e.target.value)}
            placeholder="Titolo, PM, cliente, assegnatario..."
            onBlur={() => { if (!value) setOpen(false); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, width: 200, color: 'var(--gray-950)', fontFamily: 'inherit' }} />
        )}
        {open && value && (
          <span onClick={e => { e.stopPropagation(); onChange(''); }}
            style={{ cursor: 'pointer', color: 'var(--gray-400)', fontSize: 14, lineHeight: 1 }}>×</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// WORKFLOW STATS MODAL
// ─────────────────────────────────────────────
function WorkflowStats({ attivita, colonne, onClose }) {

  // ── Legge le CSS variables del portale al momento del render ──
  // Se il tema cambia, la modale riflette i colori aggiornati.
  const cssVar = (name, fallback) => {
    if (typeof document === 'undefined') return fallback;
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  };

  const brandNavy  = cssVar('--brand-800', 'var(--brand-800)');
  const brandBlue  = cssVar('--brand-700', 'var(--brand-700)');
  const brandMid   = cssVar('--brand-600', 'var(--brand-600)');
  const grayBorder = cssVar('--gray-200',  'var(--gray-200)');
  const grayBg     = cssVar('--gray-50',   'var(--gray-50)');
  const textMain   = cssVar('--text-primary', 'var(--gray-950)');
  const textMuted  = cssVar('--text-muted',   'var(--gray-500)');

  // ── Palette stati — usa variabili brand dove possibile ──
  const C = {
    nonIniziato: '#c4b5fd',   // viola chiaro (neutro, sempre leggibile)
    inCorso:     brandBlue,   // blu brand
    inRitardo:   '#ef4444',   // rosso semantico, invariante
    completate:  '#10b981',   // verde semantico, invariante
  };

  // ── Classifica ogni card per "stato" in base al nome colonna ──
  const statoOf = (card) => {
    const col = colonne.find(c => c.id === card.colonna_id);
    if (!col) return 'nonIniziato';
    const n = col.nome.toLowerCase();
    if (/complet|chiusa|done|chiuso|rilasci/i.test(n))     return 'completate';
    if (/corso|lavoraz|progress|svilupp|analisi/i.test(n)) return 'inCorso';
    if (/ritardo|scadut|bloccat|sospeso/i.test(n))         return 'inRitardo';
    return 'nonIniziato';
  };

  // ── Dati aggregati ──
  const byStato = { nonIniziato: 0, inCorso: 0, inRitardo: 0, completate: 0 };
  attivita.forEach(a => { byStato[statoOf(a)]++; });
  const totale    = attivita.length;
  const rimanenti = totale - byStato.completate;

  const prioritaList = ['urgente', 'alta', 'media', 'bassa'];
  const byPriorita = {};
  prioritaList.forEach(p => { byPriorita[p] = { nonIniziato: 0, inCorso: 0, inRitardo: 0, completate: 0 }; });
  attivita.forEach(a => {
    const p = (a.priorita || 'media').toLowerCase();
    const k = prioritaList.includes(p) ? p : 'media';
    byPriorita[k][statoOf(a)]++;
  });

  const byColonna = colonne.map(col => {
    const cards  = attivita.filter(a => a.colonna_id === col.id);
    const counts = { nonIniziato: 0, inCorso: 0, inRitardo: 0, completate: 0 };
    cards.forEach(a => { counts[statoOf(a)]++; });
    return { nome: col.nome, colore: col.colore, total: cards.length, counts };
  }).filter(c => c.total > 0);

  const assMap = {};
  attivita.forEach(a => {
    const chi = a.assegnatario || a.assegnata_a || 'Non assegnato';
    if (!assMap[chi]) assMap[chi] = { nonIniziato: 0, inCorso: 0, inRitardo: 0, completate: 0 };
    assMap[chi][statoOf(a)]++;
  });
  const byAssegnatario = Object.entries(assMap)
    .map(([nome, counts]) => ({ nome, total: Object.values(counts).reduce((s, v) => s + v, 0), counts }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // ────────────────────────────────────────────
  // DONUT — archi SVG con path, testo HTML sopra
  // ────────────────────────────────────────────
  const DonutChart = ({ data }) => {
    const SIZE   = 160;
    const CX     = SIZE / 2;
    const CY     = SIZE / 2;
    const R      = 54;
    const THICK  = 20;
    const ri     = R - THICK / 2;  // raggio interno effettivo dell'anello

    const total = Object.values(data).reduce((s, v) => s + v, 0);

    // Coordinate punto sul cerchio
    const pt = (angle) => ({
      x: CX + ri * Math.cos(angle),
      y: CY + ri * Math.sin(angle),
    });

    // Path arco SVG
    const arc = (startAngle, endAngle, color, key) => {
      const span = endAngle - startAngle;
      if (span <= 0) return null;
      // Piccolo gap visivo tra segmenti
      const GAP   = total > 1 ? 0.04 : 0;
      const s     = startAngle + GAP / 2;
      const e     = endAngle   - GAP / 2;
      const large = (e - s) > Math.PI ? 1 : 0;
      const p1    = pt(s);
      const p2    = pt(e);
      const d     = `M ${p1.x} ${p1.y} A ${ri} ${ri} 0 ${large} 1 ${p2.x} ${p2.y}`;
      return (
        <path key={key} d={d} fill="none"
          stroke={color} strokeWidth={THICK}
          strokeLinecap="round" />
      );
    };

    if (total === 0) {
      return (
        <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE}>
            <circle cx={CX} cy={CY} r={ri} fill="none" stroke={grayBorder} strokeWidth={THICK} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: textMain, lineHeight: 1, fontFamily: "'IBM Plex Sans',sans-serif" }}>0</span>
            <span style={{ fontSize: 10, color: textMuted, fontFamily: "'IBM Plex Sans',sans-serif" }}>attività</span>
          </div>
        </div>
      );
    }

    // Angoli cumulativi — partendo da -π/2 (cima)
    const START = -Math.PI / 2;
    const archi = [];
    let angle   = START;
    const order = ['nonIniziato', 'inCorso', 'inRitardo', 'completate'];
    order.forEach(k => {
      if (!data[k]) return;
      const span = (data[k] / total) * 2 * Math.PI;
      archi.push(arc(angle, angle + span, C[k], k));
      angle += span;
    });

    return (
      <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} style={{ display: 'block' }}>
          {/* Traccia di sfondo */}
          <circle cx={CX} cy={CY} r={ri} fill="none" stroke={grayBorder} strokeWidth={THICK} />
          {archi}
        </svg>
        {/* Testo centrale — HTML puro, nessun transform SVG */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', gap: 1,
        }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: textMain, lineHeight: 1, fontFamily: "'IBM Plex Sans',sans-serif" }}>
            {rimanenti}
          </span>
          <span style={{ fontSize: 10, color: textMuted, fontFamily: "'IBM Plex Sans',sans-serif", textAlign: 'center', lineHeight: 1.3 }}>
            Attività<br />rimanenti
          </span>
        </div>
      </div>
    );
  };

  // ────────────────────────────────────────────
  // STACKED BAR
  // ────────────────────────────────────────────
  const StackedBar = ({ items, maxVal, barW = 44, barH = 140, gap = 28 }) => {
    const PAD_L = 28;  // spazio etichette asse y
    const PAD_B = 24;  // spazio etichette asse x
    const W     = PAD_L + items.length * (barW + gap) + gap;
    const H     = barH + PAD_B;
    const order = ['completate', 'inCorso', 'inRitardo', 'nonIniziato']; // bottom→top

    return (
      <svg width={W} height={H} style={{ overflow: 'visible', display: 'block' }}>
        {/* Linee guida orizzontali */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y   = barH - f * barH;
          const val = Math.round(f * maxVal);
          return (
            <g key={f}>
              <line x1={PAD_L} y1={y} x2={W} y2={y} stroke={grayBorder} strokeWidth={1} strokeDasharray={f === 0 ? 'none' : '3 3'} />
              <text x={PAD_L - 4} y={y + 4} textAnchor="end" fontSize={9} fill={textMuted}
                fontFamily="'IBM Plex Mono',monospace">{val}</text>
            </g>
          );
        })}

        {items.map((item, i) => {
          const x     = PAD_L + gap / 2 + i * (barW + gap);
          const total = Object.values(item.counts).reduce((s, v) => s + v, 0);

          // Costruisce segmenti dal basso
          let yBottom = barH;
          const segs  = order.map(k => {
            const h = maxVal > 0 ? (item.counts[k] / maxVal) * barH : 0;
            const y = yBottom - h;
            yBottom  = y;
            return { k, h, y };
          }).filter(s => s.h > 0.5);

          // Arrotondamento: solo il segmento più in alto ha bordo top arrotondato
          const topIdx = segs.length - 1;

          return (
            <g key={item.nome}>
              {segs.map((s, si) => {
                const isTop    = si === topIdx;
                const rx       = isTop ? 4 : 0;
                // Trucco: rect con rx arrotonda tutti e 4 gli angoli; per arrotondare
                // solo il top usiamo un rect + un rect di copertura sul fondo.
                return (
                  <g key={s.k}>
                    <rect x={x} y={s.y} width={barW} height={s.h + (isTop ? 0 : 1)}
                      fill={C[s.k]} rx={rx} ry={rx}>
                      <title>{['nonIniziato','inCorso','inRitardo','completate'].find(z => z === s.k)}: {item.counts[s.k]}</title>
                    </rect>
                    {/* Copre angoli inferiori del rect arrotondato */}
                    {isTop && s.h > 6 && (
                      <rect x={x} y={s.y + rx} width={barW} height={Math.max(0, s.h - rx)} fill={C[s.k]} />
                    )}
                  </g>
                );
              })}

              {/* Etichetta X */}
              <text x={x + barW / 2} y={barH + 16} textAnchor="middle"
                fontSize={10} fill={textMuted} fontFamily="'IBM Plex Sans',sans-serif">
                {item.nome.length > 9 ? item.nome.slice(0, 8) + '…' : item.nome}
              </text>

              {/* Totale sopra la barra */}
              {total > 0 && segs.length > 0 && (
                <text x={x + barW / 2} y={segs[segs.length - 1].y - 5}
                  textAnchor="middle" fontSize={9} fontWeight={600} fill={textMuted}
                  fontFamily="'IBM Plex Mono',monospace">{total}</text>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  const maxPrio = Math.max(...prioritaList.map(p => Object.values(byPriorita[p]).reduce((s, v) => s + v, 0)), 1);
  const maxCol  = Math.max(...byColonna.map(c => c.total), 1);
  const maxAss  = Math.max(...byAssegnatario.map(a => a.total), 1);

  // ── UI primitives ──
  const Legend = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', marginTop: 14, paddingTop: 12, borderTop: `1px solid ${grayBorder}` }}>
      {[['nonIniziato','Non Iniziato'],['inCorso','In Corso'],['inRitardo','In Ritardo'],['completate','Completate']].map(([k, lbl]) => (
        <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: textMuted, fontFamily: "'IBM Plex Sans',sans-serif" }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: C[k], flexShrink: 0 }} />
          {lbl}
        </div>
      ))}
    </div>
  );

  const StatCard = ({ title, children }) => (
    <div style={{
      background: '#fff',
      border: `1px solid ${grayBorder}`,
      borderRadius: 12,
      padding: '18px 20px',
      boxShadow: '0 1px 4px rgba(0,29,71,0.05)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16, fontFamily: "'IBM Plex Sans',sans-serif" }}>
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: grayBg,
          borderRadius: 16,
          width: '94vw', maxWidth: 1100,
          maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,29,71,0.20)',
          overflow: 'hidden',
          fontFamily: "'IBM Plex Sans',sans-serif",
        }}>

        {/* ── Header ── */}
        <div style={{ background: brandNavy, padding: '14px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>Statistiche workflow</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>{totale} attività totali</span>
          </div>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 7, color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: 18, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, transition: 'background 0.15s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>×</button>
        </div>

        {/* ── Corpo ── */}
        <div style={{ overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Riga 1: Stato (donut) + Priorità + Bucket */}
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 14 }}>

            {/* STATO */}
            <StatCard title="Stato">
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, padding: '8px 0' }}>
                <DonutChart data={byStato} />
              </div>
              <Legend />
            </StatCard>

            {/* PRIORITÀ */}
            <StatCard title="Priorità">
              <div style={{ overflowX: 'auto' }}>
                <StackedBar
                  maxVal={maxPrio} barW={48} barH={140} gap={32}
                  items={prioritaList.map(p => ({
                    nome: p.charAt(0).toUpperCase() + p.slice(1),
                    counts: byPriorita[p],
                  }))}
                />
              </div>
              <Legend />
            </StatCard>

            {/* BUCKET */}
            <StatCard title="Bucket">
              <div style={{ overflowX: 'auto' }}>
                <StackedBar
                  maxVal={maxCol} barW={44} barH={140} gap={24}
                  items={byColonna}
                />
              </div>
              <Legend />
            </StatCard>
          </div>

          {/* Riga 2: Membri */}
          <StatCard title="Membri">
            <div style={{ overflowX: 'auto' }}>
              <StackedBar
                maxVal={maxAss} barW={52} barH={130} gap={28}
                items={byAssegnatario}
              />
            </div>
            <Legend />
          </StatCard>

        </div>
      </div>
    </div>
  );
}

export function TodoView({ staff, clients, openCardId, onCardOpened, isAdmin = false }) {
  const [workflows, setWorkflows] = useState([]);
  const [colonne, setColonne] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showWfModal, setShowWfModal] = useState(false);
  const [showColModal, setShowColModal] = useState(false);
  const [showWfEditor, setShowWfEditor] = useState(false);
  const [showSidebarTodo, setShowSidebarTodo] = useState(false);
  const [transizioni, setTransizioni] = useState([]);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [targetColId, setTargetColId] = useState(null);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'lista'
  const [showStats, setShowStats] = useState(false);
  const [showCreaVista, setShowCreaVista] = useState(false);
  const [viste, setViste] = useState([]); // viste salvate per questo workflow
  const [vistaAttiva, setVistaAttiva] = useState(null); // id vista attiva
  const [nuovaVista, setNuovaVista] = useState({ nome: '', colonne: [], teamSviluppo: '', assegnatario: '', priorita: '' });
  const [teamProdottoList, setTeamProdottoList] = useState([]);

  const [dragCard, setDragCard] = useState(null);
  const [agingConfigMap, setAgingConfigMap] = useState({});
  const [searchTodo, setSearchTodo] = useState(''); // { colonna_id: { aging_attivo, soglia_gialla, soglia_rossa } }
  const [dragOver, setDragOver] = useState(null);

  const isMobile = useIsMobile();

  useEffect(() => { loadTodo(); }, []);

  // Apre automaticamente la card quando navigaNotifica la richiede
  useEffect(() => {
    if (!openCardId || !attivita.length) return;
    const card = attivita.find(a => a.id === openCardId);
    if (!card) return;
    // Seleziona il workflow corretto
    if (card.workflow_id && card.workflow_id !== selectedWorkflow) {
      setSelectedWorkflow(card.workflow_id);
    }
    setEditCard(card);
    setTargetColId(card.colonna_id);
    setShowCardModal(true);
    onCardOpened && onCardOpened();
  }, [openCardId, attivita]);


  // Carica team prodotto per filtri vista
  useEffect(() => {
    supabase.from('config_team_prodotto').select('nome').order('ordine').then(({ data }) => setTeamProdottoList((data || []).map(t => t.nome)));
  }, []);

  // Carica viste salvate da localStorage quando cambia workflow
  useEffect(() => {
    if (!selectedWorkflow) { setViste([]); setVistaAttiva(null); return; }
    try {
      const saved = JSON.parse(localStorage.getItem(`wf_viste_${selectedWorkflow}`) || '[]');
      setViste(saved);
    } catch { setViste([]); }
    setVistaAttiva(null);
  }, [selectedWorkflow]);

  const salvaViste = (nuovaLista) => {
    setViste(nuovaLista);
    localStorage.setItem(`wf_viste_${selectedWorkflow}`, JSON.stringify(nuovaLista));
  };

  const loadTodoSilent = async () => {
    const { data: wf } = await supabase.from('workflows').select('*').order('ordine');
    const { data: col } = await supabase.from('workflow_colonne').select('*').order('ordine');
    const { data: att } = await supabase.from('attivita').select('*, commessa:commessa_id(id, nome_commessa, client_id, pm_commessa), bolla:bolla_id(id, codice, descrizione)').order('ordine');
    const { data: trans } = await supabase.from('workflow_transizioni').select('*');
    if (wf) setWorkflows(wf);
    if (col) setColonne(col);
    if (att) setAttivita(att);
    if (trans) setTransizioni(trans);
  };

  const loadTodo = async () => {
    setLoading(true);
    const { data: wf } = await supabase.from('workflows').select('*').order('ordine');
    const { data: col } = await supabase.from('workflow_colonne').select('*').order('ordine');
    const { data: att } = await supabase.from('attivita').select('*, commessa:commessa_id(id, nome_commessa, client_id, pm_commessa), bolla:bolla_id(id, codice, descrizione)').order('ordine');
    const { data: trans } = await supabase.from('workflow_transizioni').select('*');
    setWorkflows(wf || []);
    setColonne(col || []);
    setAttivita(att || []);
    setTransizioni(trans || []);
    if (wf && wf.length > 0 && !selectedWorkflow) setSelectedWorkflow(wf[0].id);
    // Carica aging config per tutte le colonne
    if (col && col.length > 0) {
      const { data: agData } = await supabase.from('workflow_aging_config').select('*').in('colonna_id', col.map(c => c.id));
      const agMap = {};
      (agData || []).forEach(r => { agMap[r.colonna_id] = r; });
      setAgingConfigMap(agMap);
    }
    setLoading(false);
  };

  const isColCompletata = (nome) => /complet|done|chiusa|rilasci/i.test(nome || '');
  const isColAnnullata  = (nome) => /annull|cancel/i.test(nome || '');

  const isTransizioneConsentita = (daColId, aColId) => {
    if (!daColId) return true;
    if (daColId === aColId) return false;
    return transizioni.some(t => t.da_colonna_id === daColId && t.a_colonna_id === aColId);
  };

  const currentColonne = colonne.filter(c => c.workflow_id === selectedWorkflow);
  const colonnaCompletateId = currentColonne.find(c => isColCompletata(c.nome))?.id || null;
  const colonnaAnnullateId  = currentColonne.find(c => isColAnnullata(c.nome))?.id || null;
  const currentAttivita = attivita.filter(a => a.workflow_id === selectedWorkflow);
  const currentWorkflow = workflows.find(w => w.id === selectedWorkflow);
  const currentTipo = (() => {
    if (!currentWorkflow) return 'sviluppo';
    if (/prevendita/i.test(currentWorkflow.nome || '')) return 'prevendita';
    if (/ordini.*richieste|richieste.*ordini/i.test(currentWorkflow.nome || '')) return 'ordini_richieste';
    return 'sviluppo';
  })();

  const creaVista = () => {
    if (!nuovaVista.nome.trim()) return;
    const nuova = { id: Date.now().toString(), ...nuovaVista, colonne: nuovaVista.colonne.length ? nuovaVista.colonne : currentColonne.map(c => c.id) };
    salvaViste([...viste, nuova]);
    setVistaAttiva(nuova.id);
    setShowCreaVista(false);
    setNuovaVista({ nome: '', colonne: [], teamSviluppo: '', assegnatario: '', pm: '' });
  };

  const eliminaVista = (id) => {
    const nuova = viste.filter(v => v.id !== id);
    salvaViste(nuova);
    if (vistaAttiva === id) setVistaAttiva(null);
  };

  // Colonne e attività filtrate dalla vista attiva
  const vistaCorrente = viste.find(v => v.id === vistaAttiva) || null;
  const colonneVista = vistaCorrente && vistaCorrente.colonne.length
    ? currentColonne.filter(c => vistaCorrente.colonne.includes(c.id))
    : currentColonne;
  const attivitaVista = vistaCorrente
    ? currentAttivita.filter(a => {
        if (vistaCorrente.teamSviluppo && a.team_sviluppo !== vistaCorrente.teamSviluppo) return false;
        if (vistaCorrente.assegnatario && a.assegnata_a !== vistaCorrente.assegnatario && a.assegnatario !== vistaCorrente.assegnatario && !(a.assegnatari || []).includes(vistaCorrente.assegnatario)) return false;
        if (vistaCorrente.pm && a.pm !== vistaCorrente.pm) return false;
        if (vistaCorrente.salesAccount && a.sales_account !== vistaCorrente.salesAccount) return false;
        return true;
      })
    : currentAttivita;

  // Filtro ricerca full-text
  const attivitaFiltrate = searchTodo.trim()
    ? attivitaVista.filter(a => {
        const q = searchTodo.toLowerCase();
        return (
          (a.titolo || '').toLowerCase().includes(q) ||
          (a.descrizione || '').toLowerCase().includes(q) ||
          (a.pm || '').toLowerCase().includes(q) ||
          (a.assegnata_a || '').toLowerCase().includes(q) ||
          (a.assegnatario || '').toLowerCase().includes(q) ||
          (a.cliente_id && (clients || []).find(c => c.id === a.cliente_id)?.nome_progetto?.toLowerCase().includes(q))
        );
      })
    : attivitaVista;

  const onDragStart = (card) => setDragCard(card);

  const onDragEnd = () => {
    setDragCard(null);
    setDragOver(null);
  };

  const onDragOver = (e, colId) => {
    if (dragCard && !isTransizioneConsentita(dragCard.colonna_id, colId)) return;
    e.preventDefault();
    setDragOver(colId);
  };

  const onDrop = async (e, colId) => {
    e.preventDefault();
    if (!dragCard || dragCard.colonna_id === colId) { setDragCard(null); setDragOver(null); return; }
    if (!isTransizioneConsentita(dragCard.colonna_id, colId)) {
      const fromCol = currentColonne.find(c => c.id === dragCard.colonna_id);
      const toCol = currentColonne.find(c => c.id === colId);
      alert(`Transizione non consentita: "${fromCol?.nome || '—'}" → "${toCol?.nome || '—'}"\n\nConfigura le transizioni nell'editor del workflow.`);
      setDragCard(null); setDragOver(null); return;
    }
    const nuovaColonna = currentColonne.find(c => c.id === colId);
    const updated = { ...dragCard, colonna_id: colId };
    setAttivita(prev => prev.map(a => a.id === dragCard.id ? updated : a));
    await supabase.from('attivita').update({ colonna_id: colId, colonna_entered_at: new Date().toISOString() }).eq('id', dragCard.id);
    // Invia notifiche configurate per questa colonna
    if (nuovaColonna) await inviaNotificheTransizione(dragCard, nuovaColonna, staff);
    setDragCard(null); setDragOver(null);
  };

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>
      Caricamento...
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--gray-50)' }}>
      <style>{`@keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }`}</style>

      {/* ── TOOLBAR ── */}
      <div style={{
        background: '#fff', borderBottom: '1px solid var(--gray-200)',
        padding: isMobile ? '10px 12px' : '10px 24px',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
      }}>
        <button className="menu-trigger-inline" onClick={() => setShowSidebarTodo(true)}>
          <HamburgerIcon />
        </button>



        {isMobile ? (
          <select
            value={selectedWorkflow || ''}
            onChange={e => setSelectedWorkflow(e.target.value || null)}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              border: '1.5px solid var(--gray-200)', background: 'var(--gray-50)',
              fontSize: '14px', fontWeight: 600, color: 'var(--brand-700)',
              outline: 'none', appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%230054a6' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
            }}
          >
            <option value="">Seleziona workflow...</option>
            {workflows.map(wf => (
              <option key={wf.id} value={wf.id}>{wf.nome}</option>
            ))}
          </select>
        ) : (
          <div style={{ display: 'flex', background: 'var(--gray-100)', padding: '3px', borderRadius: '10px', gap: '2px' }}>
            {workflows.map(wf => (
              <button key={wf.id} onClick={() => setSelectedWorkflow(wf.id)}
                style={{
                  padding: '5px 14px', borderRadius: '7px', border: 'none', fontSize: '12px',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: selectedWorkflow === wf.id ? '#fff' : 'transparent',
                  color: selectedWorkflow === wf.id ? 'var(--brand-700)' : 'var(--gray-500)',
                  fontWeight: selectedWorkflow === wf.id ? 600 : 400,
                  boxShadow: selectedWorkflow === wf.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >{wf.nome}</button>
            ))}
          </div>
        )}

        {/* Lente ricerca — accanto ai workflow */}
        <SearchLensTodo value={searchTodo} onChange={setSearchTodo} />
        {searchTodo && (
          <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>
            {attivitaFiltrate.length} risultat{attivitaFiltrate.length === 1 ? 'o' : 'i'}
          </span>
        )}

        {/* Pill viste attive */}
        {selectedWorkflow && viste.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {viste.map(v => (
              <div key={v.id}
                onClick={() => setVistaAttiva(vistaAttiva === v.id ? null : v.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: 20, border: `1px solid ${vistaAttiva === v.id ? 'var(--brand-800)' : 'var(--gray-200)'}`, background: vistaAttiva === v.id ? 'var(--brand-800)' : 'var(--gray-50)', cursor: 'pointer', fontSize: 11, fontWeight: 500, color: vistaAttiva === v.id ? '#fff' : 'var(--gray-500)', transition: 'all 0.15s' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {v.nome}
                <span onClick={e => { e.stopPropagation(); eliminaVista(v.id); }} style={{ marginLeft: 2, opacity: 0.6, cursor: 'pointer', fontSize: 13, lineHeight: 1 }}>×</span>
              </div>
            ))}
          </div>
        )}

        {selectedWorkflow && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentTipo !== 'ordini_richieste' && (
              <button onClick={() => setShowCreaVista(true)} title="Crea visualizzazione"
                style={{ height: 32, padding: '0 12px', borderRadius: 8, border: '0.5px solid var(--gray-200)', cursor: 'pointer', background: showCreaVista ? 'var(--brand-50)' : 'transparent', color: showCreaVista ? 'var(--brand-700)' : 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
                Crea vista
              </button>
            )}
            {currentTipo !== 'ordini_richieste' && <div style={{ width: 1, height: 20, background: 'var(--gray-200)' }} />}
            {currentTipo !== 'ordini_richieste' && (
              <button onClick={() => setViewMode('kanban')} title="Vista Kanban"
                style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid var(--gray-200)', cursor: 'pointer', background: viewMode === 'kanban' ? 'var(--brand-50)' : 'transparent', color: viewMode === 'kanban' ? 'var(--brand-700)' : 'var(--gray-400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
              </button>
            )}
            {currentTipo !== 'ordini_richieste' && (
              <button onClick={() => setViewMode('lista')} title="Vista Lista"
                style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid var(--gray-200)', cursor: 'pointer', background: viewMode === 'lista' ? 'var(--brand-50)' : 'transparent', color: viewMode === 'lista' ? 'var(--brand-700)' : 'var(--gray-400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            )}
            <button onClick={() => setShowStats(true)} title="Statistiche workflow"
              style={{ width: 32, height: 32, borderRadius: 8, border: '0.5px solid var(--gray-200)', cursor: 'pointer', background: showStats ? 'var(--brand-50)' : 'transparent', color: showStats ? 'var(--brand-700)' : 'var(--gray-400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="12" width="4" height="9"/><rect x="10" y="7" width="4" height="14"/><rect x="17" y="3" width="4" height="18"/>
              </svg>
            </button>
            <button
              onClick={() => { const primaCol = currentColonne.find(c => /nuova|richiesta|new/i.test(c.nome)) || currentColonne[0]; setEditCard(null); setTargetColId(primaCol?.id || null); setShowCardModal(true); }}
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: isMobile ? '7px 12px' : '7px 18px', borderRadius: '20px', border: '1px solid #bfdbfe', background: 'var(--brand-50)', color: 'var(--brand-700)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background = '#dbeafe'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--brand-50)'}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
              {!isMobile && ' Nuova attività'}
            </button>
          </div>
        )}
      </div>

      {/* ── SIDEBAR ── */}
      <div className={`sidebar-overlay ${showSidebarTodo ? 'active' : ''}`} onClick={() => setShowSidebarTodo(false)}>
        <div className="sidebar-content" onClick={e => e.stopPropagation()}>
          <div className="sidebar-header">
            <h3>Gestione To Do</h3>
            <button className="btn-close-circle" onClick={() => setShowSidebarTodo(false)}>×</button>
          </div>
          <div className="sidebar-body">
            <button className="sidebar-item" onClick={() => { setShowWfModal(true); setShowSidebarTodo(false); }}>
              ➕ Nuovo workflow
            </button>
            {selectedWorkflow && (
              <>
                <button className="sidebar-item" onClick={() => { setShowWfEditor(true); setShowSidebarTodo(false); }}>
                  ⚙️ Configura workflow
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── LISTA VIEW ── */}
      {selectedWorkflow && viewMode === 'lista' && (() => {
        const tutteLeCard = colonneVista.flatMap(col =>
          attivitaVista.filter(a => a.colonna_id === col.id).map(a => ({ ...a, _col: col }))
        );
        const pColor = p => p === 'alta' ? { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' } : p === 'bassa' ? { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' } : { bg: '#fefce8', text: '#92400e', border: '#fcd34d' };
        return (
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
            {tutteLeCard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-400)', fontSize: 13, fontStyle: 'italic' }}>Nessuna attività in questo workflow</div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid var(--gray-200)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)' }}>
                      {['Attività', 'Colonna', 'Priorità', 'Assegnatario', 'Cliente', 'Data richiesta', 'Stima ore'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tutteLeCard.map(card => {
                      const col = card._col;
                      const pc = pColor(card.priorita);
                      const cli = clients.find(c => c.id === card.cliente_id);
                      return (
                        <tr key={card.id} onClick={() => { setEditCard(card); setTargetColId(card.colonna_id); setShowCardModal(true); }}
                          style={{ borderBottom: '0.5px solid var(--gray-100)', cursor: 'pointer', transition: 'background 0.1s' }}
                          onMouseOver={e => e.currentTarget.style.background = 'var(--gray-50)'}
                          onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                          <td style={{ padding: '10px 14px', borderLeft: `3px solid ${col.colore}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {card.novita_prodotto && <svg width="11" height="11" viewBox="0 0 24 24" fill="#FAC775" stroke="#FAC775" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>{card.titolo}</span>
                            </div>
                            {card.rif_pratica && <div style={{ fontSize: 10, color: 'var(--gray-400)', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{card.rif_pratica}</div>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: col.colore + '1a', color: col.colore, border: `1px solid ${col.colore}44`, fontWeight: 500 }}>{col.nome}</span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:pc.text }}><span style={{ width:6, height:6, borderRadius:'50%', background:pc.bar, flexShrink:0, display:'inline-block' }} />{card.priorita||'media'}</span>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--gray-500)' }}>{card.assegnatario || card.assegnata_a || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--gray-500)' }}>{cli?.nome_progetto || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--gray-500)', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>
                            {card.data_richiesta ? new Date(card.data_richiesta + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--gray-500)', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{card.stima_ore ? `${card.stima_ore}h` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── BOARD KANBAN ── */}
      {!selectedWorkflow ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: '14px' }}>
          Crea o seleziona un workflow per iniziare
        </div>
      ) : currentTipo === 'ordini_richieste' ? (
        <OrdiniRichiesteView
          colonne={currentColonne}
          attivita={currentAttivita}
          staff={staff}
          clients={clients}
          transizioni={transizioni}
          workflowId={selectedWorkflow}
          isAdmin={isAdmin}
          searchQuery={searchTodo}
          onRefresh={loadTodoSilent}
          onOpenCard={(card) => { setEditCard(card); setTargetColId(card.colonna_id); setShowCardModal(true); }}
        />
      ) : viewMode === 'kanban' ? (
        <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px 12px' : '24px', background: 'var(--gray-50)', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', gap: isMobile ? '12px' : '20px', alignItems: 'flex-start', minWidth: 'max-content' }}>

            {colonneVista.map(col => {
              const cards = attivitaFiltrate.filter(a => a.colonna_id === col.id).sort((a, b) => a.ordine - b.ordine);
              const isDragTarget = dragOver === col.id;
              const isDragBlocked = dragCard && dragCard.colonna_id !== col.id && !isTransizioneConsentita(dragCard.colonna_id, col.id);

              return (
                <div key={col.id}
                  onDragOver={(e) => onDragOver(e, col.id)}
                  onDrop={(e) => onDrop(e, col.id)}
                  style={{
                    minWidth: isMobile ? '200px' : '230px',
                    maxWidth: isMobile ? '200px' : '230px',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                    opacity: isDragBlocked ? 0.35 : 1, transition: 'opacity 0.15s',
                  }}>

                  {/* Header colonna */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    paddingBottom: '10px',
                    borderBottom: `2px solid ${isDragBlocked ? 'var(--gray-200)' : isDragTarget ? '#3b82f6' : col.colore}`,
                    transition: 'border-color 0.15s',
                  }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>{col.nome}</span>
                    <span style={{ fontSize: '11px', color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '1px 8px', borderRadius: '20px', fontWeight: 500 }}>{cards.length}</span>
                    <button onClick={() => { setEditCard(null); setTargetColId(col.id); setShowCardModal(true); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: '18px', lineHeight: 1, padding: '0 2px' }} title="Aggiungi attività">+</button>
                  </div>

                  {/* Cards */}
                  {cards.map(card => {
                    const staffObj = staff.find(s => staffKey(s) === card.assegnata_a);
                    const clientObj = clients.find(c => c.id === card.cliente_id);
                    const ac = staffObj ? getAvatarColor(staffLabel(staffObj)) : null;
                    const pCol = PRIORITA_COLORS[card.priorita] || PRIORITA_COLORS.media;
                    const isCompletata = isColCompletata(col.nome);
                    const isAnnullata  = isColAnnullata(col.nome);
                    const canComplete  = colonnaCompletateId && colonnaCompletateId !== col.id && isTransizioneConsentita(col.id, colonnaCompletateId);
                    const canAnnulla   = colonnaAnnullateId  && colonnaAnnullateId  !== col.id && isTransizioneConsentita(col.id, colonnaAnnullateId);
                    const cardOpacity  = (isCompletata || isAnnullata) ? 0.45 : dragCard?.id === card.id ? 0.4 : 1;
                    return (
                      <div key={card.id}
                        draggable
                        onDragStart={() => onDragStart(card)}
                        onDragEnd={onDragEnd}
                        onClick={() => { setEditCard(card); setTargetColId(card.colonna_id); setShowCardModal(true); }}
                        style={{
                          background: '#fff', borderRadius: '10px', padding: '12px 14px',
                          border: '0.5px solid var(--gray-200)', borderLeft: `3px solid ${col.colore}`,
                          cursor: 'grab',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)',
                          transition: 'box-shadow 0.15s, transform 0.12s',
                          opacity: cardOpacity,
                        }}
                        onMouseOver={e => { if (!isCompletata && !isAnnullata) { e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                        onMouseOut={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--gray-950)', margin: '0 0 6px', lineHeight: 1.4, textDecoration: isAnnullata ? 'line-through' : 'none' }}>{card.titolo}</p>
                        {card.avanzamento > 0 && card.avanzamento < 100 && (() => {
                          const pct = card.avanzamento;
                          const barCol = pct <= 50 ? '#60a5fa' : '#4ade80';
                          return (
                            <div style={{ marginBottom: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                <span style={{ fontSize: 9, fontWeight: 600, color: barCol, letterSpacing: '.04em' }}>{pct}%</span>
                              </div>
                              <div style={{ height: 3, background: 'var(--gray-100)', borderRadius: 2 }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: barCol, borderRadius: 2, transition: 'width 0.4s ease' }} />
                              </div>
                            </div>
                          );
                        })()}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:500, color:pCol.text }}><span style={{ width:6, height:6, borderRadius:'50%', background:pCol.bar, flexShrink:0, display:'inline-block' }} />{card.priorita}</span>
                          {clientObj && (
                            <span style={{ fontSize: '10px', color: 'var(--gray-500)', background: 'var(--gray-50)', border: '0.5px solid var(--gray-200)', borderRadius: '4px', padding: '2px 6px', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {clientObj.nome_progetto}
                            </span>
                          )}
                          {card.scadenza && (
                            <span style={{ fontSize: '10px', color: new Date(card.scadenza) < new Date() ? '#dc2626' : 'var(--gray-400)', marginLeft: 'auto' }}>
                              {new Date(card.scadenza).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                            </span>
                          )}
                          {ac && (
                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 600, flexShrink: 0, marginLeft: card.scadenza ? '0' : 'auto', border: `0.5px solid ${ac.text}33` }} title={staffLabel(staffObj)}>
                              {getInitials(staffLabel(staffObj))}
                            </div>
                          )}
                          {(() => {
                            const agCfg = agingConfigMap[col.id];
                            if (!agCfg?.aging_attivo) return null;
                            // usa colonna_entered_at se disponibile, altrimenti created_at come fallback
                            const entryDate = card.colonna_entered_at || card.created_at;
                            if (!entryDate) return null;
                            const giorni = Math.floor((Date.now() - new Date(entryDate).getTime()) / 86400000);
                            const sogGialla = agCfg.soglia_gialla ?? 3;
                            const sogRossa = agCfg.soglia_rossa ?? 7;
                            const agColor = giorni >= sogRossa ? '#ef4444' : giorni >= sogGialla ? '#f59e0b' : '#22c55e';
                            const agBg = giorni >= sogRossa ? '#fef2f2' : giorni >= sogGialla ? '#fefce8' : '#f0fdf4';
                            const agBorder = giorni >= sogRossa ? '#fca5a5' : giorni >= sogGialla ? '#fde68a' : '#86efac';
                            return (
                              <div title={`In questa colonna da ${giorni} giorn${giorni === 1 ? 'o' : 'i'}`}
                                style={{ marginLeft: !ac ? 'auto' : '2px', flexShrink: 0, display: 'flex', alignItems: 'center', cursor: 'default' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={agColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="13" r="7"/>
                                  <polyline points="12 10 12 13 14 15"/>
                                  <path d="M5 3 2 6M22 6l-3-3"/>
                                </svg>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })}

                  {cards.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--gray-200)', fontSize: '12px', padding: '24px 0', fontStyle: 'italic', border: '1px dashed var(--gray-200)', borderRadius: '10px' }}>
                      nessuna attività
                    </div>
                  )}
                </div>
              );
            })}

            {currentColonne.length === 0 && (
              <div style={{ minWidth: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--gray-200)', borderRadius: '12px', padding: '40px 20px', color: 'var(--gray-400)', fontSize: '13px', cursor: 'pointer' }}
                onClick={() => setShowColModal(true)}>
                + Aggiungi colonna
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ── MODALE CREA VISTA ── */}
      {showCreaVista && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,18,41,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowCreaVista(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 12px 40px rgba(0,18,41,0.16)' }}>

            {/* Header */}
            <div style={{ background: 'var(--brand-800)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Workflow</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Crea visualizzazione</div>
              </div>
              <button onClick={() => setShowCreaVista(false)} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#fff', fontSize: 16 }}>×</button>
            </div>

            <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Nome */}
              <div>
                <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Nome visualizzazione</div>
                <input value={nuovaVista.nome} onChange={e => setNuovaVista(p => ({ ...p, nome: e.target.value }))}
                  placeholder="es. Team Documenti, Solo alta priorità..." autoFocus
                  style={{ width: '100%', border: 'none', borderBottom: '1.5px solid var(--gray-200)', borderRadius: 0, background: 'transparent', padding: '4px 0 8px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              {/* Colonne visibili */}
              <div>
                <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                  Colonne visibili <span style={{ color: 'var(--gray-200)', fontWeight: 400 }}>— lascia vuoto per mostrare tutte</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {currentColonne.map(col => {
                    const sel = nuovaVista.colonne.includes(col.id);
                    return (
                      <div key={col.id} onClick={() => setNuovaVista(p => ({ ...p, colonne: sel ? p.colonne.filter(id => id !== col.id) : [...p.colonne, col.id] }))}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, border: `1px solid ${sel ? col.colore : 'var(--gray-200)'}`, background: sel ? col.colore + '1a' : 'var(--gray-50)', cursor: 'pointer', fontSize: 11, fontWeight: sel ? 500 : 400, color: sel ? col.colore : 'var(--gray-500)', transition: 'all 0.12s' }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.colore, flexShrink: 0 }} />
                        {col.nome}
                        {sel && <span style={{ fontSize: 12, lineHeight: 1 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Filtri — cambiano in base al tipo workflow */}
              <div style={{ display: 'grid', gridTemplateColumns: currentTipo === 'prevendita' ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, overflow: 'visible' }}>
                {currentTipo === 'prevendita' ? (<>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Sales Account</div>
                    <VistaDropdown options={[{ value: '', label: 'Tutti' }, ...[...new Set(currentAttivita.map(a => a.sales_account).filter(Boolean))].sort().map(n => ({ value: n, label: n }))]} value={nuovaVista.salesAccount || ''} onChange={v => setNuovaVista(p => ({ ...p, salesAccount: v }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Assegnatario</div>
                    <VistaDropdown options={[{ value: '', label: 'Tutti' }, ...[...new Set(currentAttivita.flatMap(a => a.assegnatari || []).filter(Boolean))].sort().map(n => ({ value: n, label: n }))]} value={nuovaVista.assegnatario} onChange={v => setNuovaVista(p => ({ ...p, assegnatario: v }))} />
                  </div>
                </>) : (<>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Team sviluppo</div>
                    <VistaDropdown options={[{ value: '', label: 'Tutti' }, ...teamProdottoList.map(t => ({ value: t, label: t }))]} value={nuovaVista.teamSviluppo} onChange={v => setNuovaVista(p => ({ ...p, teamSviluppo: v }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Assegnatario</div>
                    <VistaDropdown options={[{ value: '', label: 'Tutti' }, ...[...new Set(currentAttivita.map(a => a.assegnatario || a.assegnata_a).filter(Boolean))].sort().map(n => ({ value: n, label: n }))]} value={nuovaVista.assegnatario} onChange={v => setNuovaVista(p => ({ ...p, assegnatario: v }))} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>PM</div>
                    <VistaDropdown options={[{ value: '', label: 'Tutti' }, ...[...new Set(currentAttivita.map(a => a.pm).filter(Boolean))].sort().map(n => ({ value: n, label: n }))]} value={nuovaVista.pm || ''} onChange={v => setNuovaVista(p => ({ ...p, pm: v }))} />
                  </div>
                </>)}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '0.5px solid var(--gray-100)', marginTop: 20 }}>
              <button onClick={() => setShowCreaVista(false)}
                style={{ padding: '7px 16px', borderRadius: 8, border: '0.5px solid var(--gray-200)', background: 'transparent', color: 'var(--gray-500)', fontSize: 12, cursor: 'pointer' }}>Annulla</button>
              <button onClick={creaVista} disabled={!nuovaVista.nome.trim()}
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: nuovaVista.nome.trim() ? 'var(--brand-800)' : 'var(--gray-200)', color: nuovaVista.nome.trim() ? '#fff' : 'var(--gray-400)', fontSize: 12, fontWeight: 500, cursor: nuovaVista.nome.trim() ? 'pointer' : 'default' }}>
                Salva visualizzazione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALI */}
      {showWfEditor && selectedWorkflow && (
        <WfEditorModal
          workflowId={selectedWorkflow}
          workflowNome={workflows.find(w => w.id === selectedWorkflow)?.nome}
          diSistema={workflows.find(w => w.id === selectedWorkflow)?.di_sistema || false}
          onClose={() => { setShowWfEditor(false); loadTodo(); }}
          onDelete={async () => {
            setShowWfEditor(false);
            setSelectedWorkflow(null);
            loadTodo();
          }}
        />
      )}
      {showWfModal && <WfModal onClose={() => { setShowWfModal(false); loadTodo(); }} />}
      {showColModal && selectedWorkflow && <ColModal workflowId={selectedWorkflow} onClose={() => { setShowColModal(false); loadTodo(); }} />}
      {showCardModal && (
        <CardModal
          card={editCard} colonne={currentColonne} defaultColId={targetColId}
          workflowId={selectedWorkflow} staff={staff} clients={clients} transizioni={transizioni} isAdmin={isAdmin}
          tipo={currentTipo}
          onClose={() => { setShowCardModal(false); setEditCard(null); loadTodoSilent(); }}
          onDelete={async () => {
            if (editCard) await supabase.from('attivita').delete().eq('id', editCard.id);
            setShowCardModal(false); setEditCard(null); loadTodoSilent();
          }}
        />
      )}

      {/* ── STATISTICHE WORKFLOW ── */}
      {showStats && selectedWorkflow && (
        <WorkflowStats
          attivita={currentAttivita}
          colonne={currentColonne}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// WORKFLOW EDITOR MODAL
// ─────────────────────────────────────────────
export function WfEditorModal({ workflowId, workflowNome, diSistema = false, onClose, onDelete }) {
  const [colonne, setColonne] = useState([]);
  const [transizioni, setTransizioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newColNome, setNewColNome] = useState('');
  const [newColColore, setNewColColore] = useState('var(--gray-500)');
  const [editingCol, setEditingCol] = useState(null);
  const [dragCol, setDragCol] = useState(null);
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState(workflowNome || '');
  const [editingNome, setEditingNome] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphZoom, setGraphZoom] = useState(100);
  const [deletingWf, setDeletingWf] = useState(false);
  const [notificheConfig, setNotificheConfig] = useState({}); // { colonna_id: { id, notifica_analista, notifica_pm } }
  const [agingConfig, setAgingConfig] = useState({}); // { colonna_id: { id, aging_attivo, soglia_gialla, soglia_rossa } }

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: cols } = await supabase.from('workflow_colonne').select('*').eq('workflow_id', workflowId).order('ordine');
    const { data: trans } = await supabase.from('workflow_transizioni').select('*').eq('workflow_id', workflowId);
    setColonne(cols || []);
    setTransizioni(trans || []);
    if (cols && cols.length > 0) {
      const { data: nc } = await supabase.from('workflow_notifiche_config').select('*').in('colonna_id', cols.map(c => c.id));
      const map = {};
      (nc || []).forEach(r => { map[r.colonna_id] = r; });
      setNotificheConfig(map);
      const { data: ac } = await supabase.from('workflow_aging_config').select('*').in('colonna_id', cols.map(c => c.id));
      const agMap = {};
      (ac || []).forEach(r => { agMap[r.colonna_id] = r; });
      setAgingConfig(agMap);
    }
    setLoading(false);
  };

  const saveNome = async () => {
    if (!nome.trim()) return;
    await supabase.from('workflows').update({ nome: nome.trim() }).eq('id', workflowId);
    setEditingNome(false);
  };

  const handleDeleteWorkflow = async () => {
    if (!window.confirm(`Eliminare il workflow "${nome || workflowNome}"?\n\nSaranno eliminati anche tutte le colonne, le attività e le transizioni associate. Questa operazione non è reversibile.`)) return;
    setDeletingWf(true);
    try {
      await supabase.from('attivita').delete().eq('workflow_id', workflowId);
      await supabase.from('workflow_transizioni').delete().eq('workflow_id', workflowId);
      await supabase.from('workflow_colonne').delete().eq('workflow_id', workflowId);
      await supabase.from('workflows').delete().eq('id', workflowId);
      onDelete && onDelete();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'eliminazione del workflow.');
      setDeletingWf(false);
    }
  };

  const addColonna = async () => {
    if (!newColNome.trim()) return;
    setSaving(true);
    const nextOrdine = colonne.length > 0 ? Math.max(...colonne.map(c => c.ordine)) + 1 : 0;
    await supabase.from('workflow_colonne').insert({ workflow_id: workflowId, nome: newColNome.trim(), colore: newColColore, ordine: nextOrdine });
    setNewColNome(''); setNewColColore('var(--gray-500)');
    await loadData(); setSaving(false);
  };

  const saveColonna = async (col) => {
    await supabase.from('workflow_colonne').update({ nome: col.nome, colore: col.colore }).eq('id', col.id);
    setEditingCol(null); await loadData();
  };

  const deleteColonna = async (id) => {
    if (!window.confirm('Eliminare la colonna?')) return;
    await supabase.from('workflow_colonne').delete().eq('id', id);
    await loadData();
  };

  const toggleTransizione = async (daId, aId) => {
    if (daId === aId) return;
    const exists = transizioni.find(t => t.da_colonna_id === daId && t.a_colonna_id === aId);
    if (exists) await supabase.from('workflow_transizioni').delete().eq('id', exists.id);
    else await supabase.from('workflow_transizioni').insert({ workflow_id: workflowId, da_colonna_id: daId, a_colonna_id: aId });
    await loadData();
  };

  const hasTransizione = (daId, aId) => transizioni.some(t => t.da_colonna_id === daId && t.a_colonna_id === aId);

  const toggleNotifica = async (colonnaId, campo) => {
    const existing = notificheConfig[colonnaId];
    const newVal = !(existing?.[campo] || false);
    if (existing) {
      await supabase.from('workflow_notifiche_config').update({ [campo]: newVal }).eq('id', existing.id);
      setNotificheConfig(prev => ({ ...prev, [colonnaId]: { ...prev[colonnaId], [campo]: newVal } }));
    } else {
      const { data } = await supabase.from('workflow_notifiche_config')
        .insert({ colonna_id: colonnaId, notifica_analista: campo === 'notifica_analista' ? newVal : false, notifica_pm: campo === 'notifica_pm' ? newVal : false })
        .select().single();
      if (data) setNotificheConfig(prev => ({ ...prev, [colonnaId]: data }));
    }
  };

  const toggleAging = async (colonnaId, campo, valore) => {
    const existing = agingConfig[colonnaId];
    if (existing) {
      await supabase.from('workflow_aging_config').update({ [campo]: valore }).eq('id', existing.id);
      setAgingConfig(prev => ({ ...prev, [colonnaId]: { ...prev[colonnaId], [campo]: valore } }));
    } else {
      const defaults = { colonna_id: colonnaId, aging_attivo: false, soglia_gialla: 3, soglia_rossa: 7 };
      const payload = { ...defaults, [campo]: valore };
      const { data } = await supabase.from('workflow_aging_config').insert(payload).select().single();
      if (data) setAgingConfig(prev => ({ ...prev, [colonnaId]: data }));
    }
  };

  const onDragColStart = (col) => setDragCol(col);
  const onDropCol = async (targetCol) => {
    if (!dragCol || dragCol.id === targetCol.id) { setDragCol(null); return; }
    const reordered = [...colonne];
    const fromIdx = reordered.findIndex(c => c.id === dragCol.id);
    const toIdx = reordered.findIndex(c => c.id === targetCol.id);
    reordered.splice(fromIdx, 1); reordered.splice(toIdx, 0, dragCol);
    await Promise.all(reordered.map((c, i) => supabase.from('workflow_colonne').update({ ordine: i }).eq('id', c.id)));
    setDragCol(null); await loadData();
  };

  const renderGraph = () => {
    const N = colonne.length;
    if (N === 0) return <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>Nessuno stato configurato</div>;

    // Layout verticale: una colonna centrale, nodi distanziati
    const NODE_W = 200, NODE_H = 64, V_GAP = 80;
    const SVG_W = NODE_W + 400; // spazio per frecce laterali
    const CENTER_X = SVG_W / 2 - NODE_W / 2;
    const SVG_H = N * NODE_H + (N - 1) * V_GAP + 80;

    const nodePos = (idx) => ({
      x: CENTER_X,
      y: 40 + idx * (NODE_H + V_GAP),
    });

    // Bucket frecce per lato per evitare sovrapposizioni
    const rightBuckets = {}; // fromIdx -> array of toIdx (forward)
    const leftBuckets = {};  // fromIdx -> array of toIdx (backward)

    transizioni.forEach(t => {
      const fi = colonne.findIndex(c => c.id === t.da_colonna_id);
      const ti = colonne.findIndex(c => c.id === t.a_colonna_id);
      if (fi === -1 || ti === -1) return;
      if (ti > fi) {
        if (!rightBuckets[fi]) rightBuckets[fi] = [];
        rightBuckets[fi].push(ti);
      } else {
        if (!leftBuckets[fi]) leftBuckets[fi] = [];
        leftBuckets[fi].push(ti);
      }
    });

    const arrows = [];
    transizioni.forEach(t => {
      const fromIdx = colonne.findIndex(c => c.id === t.da_colonna_id);
      const toIdx   = colonne.findIndex(c => c.id === t.a_colonna_id);
      if (fromIdx === -1 || toIdx === -1) return;

      const from = nodePos(fromIdx);
      const to   = nodePos(toIdx);
      const col  = colonne[fromIdx];

      const isForward = toIdx > fromIdx;
      const isNext    = toIdx === fromIdx + 1;

      if (isNext) {
        // Freccia diretta centro-centro
        const x1 = from.x + NODE_W / 2;
        const y1 = from.y + NODE_H;
        const x2 = to.x + NODE_W / 2;
        const y2 = to.y;
        arrows.push({ key: t.id, d: `M ${x1} ${y1} L ${x2} ${y2}`, colore: col.colore, daId: col.id });
      } else if (isForward) {
        // Freccia in avanti sul lato destro — offset proporzionale al gap
        const span = toIdx - fromIdx;
        const offsetX = CENTER_X + NODE_W + 20 + span * 14;
        const y1 = from.y + NODE_H / 2;
        const y2 = to.y + NODE_H / 2;
        const d = `M ${from.x + NODE_W} ${y1} C ${offsetX} ${y1}, ${offsetX} ${y2}, ${to.x + NODE_W} ${y2}`;
        arrows.push({ key: t.id, d, colore: col.colore, daId: col.id });
      } else {
        // Freccia indietro sul lato sinistro
        const span = fromIdx - toIdx;
        const offsetX = CENTER_X - 20 - span * 14;
        const y1 = from.y + NODE_H / 2;
        const y2 = to.y + NODE_H / 2;
        const d = `M ${from.x} ${y1} C ${offsetX} ${y1}, ${offsetX} ${y2}, ${to.x} ${y2}`;
        arrows.push({ key: t.id, d, colore: col.colore, daId: col.id });
      }
    });

    return (
      <svg width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          {colonne.map(col => (
            <marker key={col.id} id={`arr-${col.id}`} viewBox="0 0 12 12" refX="10" refY="6" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M2 2L10 6L2 10" fill="none" stroke={col.colore} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          ))}
        </defs>
        {arrows.map(a => (
          <path key={a.key} d={a.d} fill="none" stroke={a.colore} strokeWidth="1.8" strokeOpacity="0.7" markerEnd={`url(#arr-${a.daId})`} />
        ))}
        {colonne.map((col, idx) => {
          const { x, y } = nodePos(idx);
          return (
            <g key={col.id}>
              <rect x={x} y={y} width={NODE_W} height={NODE_H} rx="12" fill="#fff" stroke={col.colore} strokeWidth="2" filter="url(#shadow)" />
              {/* Barra colore sinistra */}
              <rect x={x} y={y + 12} width={5} height={NODE_H - 24} rx="3" fill={col.colore} />
              {/* Numero */}
              <text x={x + 18} y={y + 20} fontSize="10" fill={col.colore} fontWeight="700" fontFamily="IBM Plex Sans, sans-serif" opacity="0.9">#{idx + 1}</text>
              {/* Nome */}
              <text x={x + 18} y={y + 40} fontSize="14" fontWeight="600" fill="var(--gray-950)" fontFamily="IBM Plex Sans, sans-serif">
                {col.nome.length > 20 ? col.nome.slice(0, 19) + '…' : col.nome}
              </text>
              {/* Connettore uscita (basso per next, destra per skip) */}
              <circle cx={x + NODE_W / 2} cy={y + NODE_H} r="4" fill={col.colore} opacity="0.8" />
              {/* Connettore entrata */}
              <circle cx={x + NODE_W / 2} cy={y} r="4" fill="#fff" stroke={col.colore} strokeWidth="1.5" />
            </g>
          );
        })}
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.08" />
          </filter>
        </defs>
      </svg>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '820px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 64px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden',
      }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>

        <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid var(--gray-200)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '52px' }}>
          <div style={{ flex: 1 }}>
            {editingNome ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input value={nome} onChange={e => setNome(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveNome(); if (e.key === 'Escape') setEditingNome(false); }}
                  autoFocus style={{ fontSize: '16px', fontWeight: 700, border: 'none', borderBottom: '2px solid var(--brand-700)', borderRadius: 0, outline: 'none', padding: '2px 4px', width: '220px' }} />
                <button onClick={saveNome} style={{ background: 'var(--brand-700)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px' }}>Salva</button>
                <button onClick={() => { setNome(workflowNome); setEditingNome(false); }} style={{ background: 'none', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', color: 'var(--gray-500)' }}>Annulla</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setEditingNome(true)}>
                <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gray-950)' }}>{nome || workflowNome}</span>
                <span style={{ fontSize: '12px', color: 'var(--gray-400)' }}>✏️</span>
              </div>
            )}
            <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: 2 }}>Editor workflow</div>
          </div>

          <button onClick={() => setShowGraph(true)} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', borderRadius: '20px', border: '1px solid var(--gray-200)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', background: 'var(--gray-50)', color: 'var(--gray-500)' }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--brand-50)'; e.currentTarget.style.borderColor = '#bfdbfe'; e.currentTarget.style.color = 'var(--brand-700)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.color = 'var(--gray-500)'; }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="2" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="7" cy="2" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="12" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <circle cx="7" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M3.5 7h2M8.5 7h2M7 3.5v2M7 8.5v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            Visualizza grafico
          </button>
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {showGraph && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }} onClick={() => setShowGraph(false)}>
              <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 40px 80px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--gray-200)', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gray-950)' }}>Grafico del workflow</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: 2 }}>{colonne.length} stati · {transizioni.length} transizioni</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button onClick={() => setGraphZoom(v => Math.max(20, v - 10))} style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--gray-200)', background: 'var(--gray-50)', cursor: 'pointer', fontSize: 16, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 12, color: 'var(--gray-500)', minWidth: 36, textAlign: 'center', fontWeight: 500 }}>{graphZoom}%</span>
                    <button onClick={() => setGraphZoom(v => Math.min(150, v + 10))} style={{ width: 28, height: 28, borderRadius: 6, border: '0.5px solid var(--gray-200)', background: 'var(--gray-50)', cursor: 'pointer', fontSize: 16, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    <button onClick={() => setGraphZoom(100)} style={{ padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--gray-200)', background: 'var(--gray-50)', cursor: 'pointer', fontSize: 11, color: 'var(--gray-400)' }}>Reset</button>
                    <div style={{ width: 1, height: 20, background: 'var(--gray-200)', margin: '0 4px' }} />
                    <button onClick={() => { setShowGraph(false); setGraphZoom(100); }} style={{ background: 'none', border: 'none', fontSize: '22px', color: 'var(--gray-400)', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }}>×</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', padding: '40px 80px', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <div style={{ transform: `scale(${graphZoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}>
                    {renderGraph()}
                  </div>
                </div>
                {colonne.length > 0 && (
                  <div style={{ padding: '14px 28px', borderTop: '1px solid var(--gray-100)', display: 'flex', gap: '20px', flexWrap: 'wrap', flexShrink: 0, background: 'var(--gray-50)' }}>
                    {colonne.map((col, i) => (
                      <div key={col.id} style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.colore }} />
                        <span style={{ fontSize: '11px', color: 'var(--gray-500)' }}><span style={{ fontWeight: 600, color: 'var(--gray-400)', marginRight: 4 }}>#{i + 1}</span>{col.nome}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STATI ── */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
              Stati <span style={{ color: 'var(--gray-400)', fontWeight: 400, marginLeft: 8 }}>trascina per riordinare</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {loading ? <div style={{ color: 'var(--gray-400)', fontSize: '13px' }}>Caricamento...</div> :
                colonne.map(col => (
                  <div key={col.id} draggable
                    onDragStart={() => onDragColStart(col)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => onDropCol(col)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: dragCol?.id === col.id ? 'var(--brand-50)' : 'var(--gray-50)', borderRadius: '10px', border: '1px solid var(--gray-200)', cursor: 'grab' }}>
                    <span style={{ color: 'var(--gray-200)', fontSize: '16px', cursor: 'grab' }}>⠿</span>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: editingCol?.id === col.id ? editingCol.colore : col.colore, flexShrink: 0 }} />
                    {editingCol?.id === col.id ? (
                      <>
                        <input value={editingCol.nome} onChange={e => setEditingCol({ ...editingCol, nome: e.target.value })}
                          style={{ flex: 1, fontSize: '13px', padding: '4px 8px', border: '1px solid #bfdbfe', borderRadius: '6px' }}
                          onKeyDown={e => e.key === 'Enter' && saveColonna(editingCol)} autoFocus />
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {COL_COLORS.map(c => <div key={c} onClick={() => setEditingCol({ ...editingCol, colore: c })} style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: editingCol.colore === c ? '2px solid var(--gray-950)' : '1px solid transparent' }} />)}
                        </div>
                        <button onClick={() => saveColonna(editingCol)} style={{ background: 'var(--brand-700)', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>✓</button>
                        <button onClick={() => setEditingCol(null)} style={{ background: 'none', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', color: 'var(--gray-500)' }}>✕</button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: 'var(--gray-950)' }}>{col.nome}</span>
                        <span style={{ fontSize: '11px', color: 'var(--gray-400)' }}>#{col.ordine + 1}</span>
                        {/* Toggle Analista — solo workflow di sistema */}
                        {!diSistema && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div onClick={() => toggleNotifica(col.id, 'notifica_analista')}
                            style={{ width: 28, height: 16, borderRadius: '20px', background: notificheConfig[col.id]?.notifica_analista ? '#7c3aed' : 'var(--gray-200)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                            <div style={{ position: 'absolute', top: 2, left: notificheConfig[col.id]?.notifica_analista ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: notificheConfig[col.id]?.notifica_analista ? '#7c3aed' : 'var(--gray-400)', fontWeight: 500, minWidth: 40 }}>Analista</span>
                        </div>}
                        {/* Toggle PM — solo workflow di sistema */}
                        {!diSistema && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div onClick={() => toggleNotifica(col.id, 'notifica_pm')}
                            style={{ width: 28, height: 16, borderRadius: '20px', background: notificheConfig[col.id]?.notifica_pm ? 'var(--brand-700)' : 'var(--gray-200)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                            <div style={{ position: 'absolute', top: 2, left: notificheConfig[col.id]?.notifica_pm ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: notificheConfig[col.id]?.notifica_pm ? 'var(--brand-700)' : 'var(--gray-400)', fontWeight: 500, minWidth: 16 }}>PM</span>
                        </div>}
                        {/* Toggle Aging */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div onClick={() => toggleAging(col.id, 'aging_attivo', !(agingConfig[col.id]?.aging_attivo || false))}
                            style={{ width: 28, height: 16, borderRadius: '20px', background: agingConfig[col.id]?.aging_attivo ? '#f59e0b' : 'var(--gray-200)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}>
                            <div style={{ position: 'absolute', top: 2, left: agingConfig[col.id]?.aging_attivo ? 14 : 2, width: 12, height: 12, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
                          </div>
                          <span style={{ fontSize: '10px', color: agingConfig[col.id]?.aging_attivo ? '#b45309' : 'var(--gray-400)', fontWeight: 500, minWidth: 30 }}>Aging</span>
                          {agingConfig[col.id]?.aging_attivo && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 2 }}>
                              <span style={{ fontSize: '9px', color: '#eab308' }}>🟡</span>
                              <input type="number" min="1" max="999" value={agingConfig[col.id]?.soglia_gialla ?? 3}
                                onChange={e => toggleAging(col.id, 'soglia_gialla', parseInt(e.target.value) || 3)}
                                style={{ width: 36, fontSize: '11px', border: '1px solid #fde68a', borderRadius: '4px', padding: '1px 4px', textAlign: 'center', background: '#fefce8', color: '#92400e' }} />
                              <span style={{ fontSize: '9px', color: '#ef4444' }}>🔴</span>
                              <input type="number" min="1" max="999" value={agingConfig[col.id]?.soglia_rossa ?? 7}
                                onChange={e => toggleAging(col.id, 'soglia_rossa', parseInt(e.target.value) || 7)}
                                style={{ width: 36, fontSize: '11px', border: '1px solid #fca5a5', borderRadius: '4px', padding: '1px 4px', textAlign: 'center', background: '#fef2f2', color: '#dc2626' }} />
                              <span style={{ fontSize: '9px', color: 'var(--gray-400)' }}>gg</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => setEditingCol({ id: col.id, nome: col.nome, colore: col.colore })} style={{ background: 'none', border: '1px solid var(--gray-200)', borderRadius: '6px', padding: '4px 9px', cursor: 'pointer', fontSize: '12px', color: 'var(--gray-500)' }}>✏️</button>
                        <button onClick={() => deleteColonna(col.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--gray-400)' }}>🗑️</button>
                      </>
                    )}
                  </div>
                ))
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--gray-50)', borderRadius: '10px', border: '1px dashed var(--gray-200)' }}>
              <input placeholder="Nuovo stato..." value={newColNome} onChange={e => setNewColNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addColonna()}
                style={{ flex: 1, fontSize: '13px', border: 'none', background: 'transparent', outline: 'none' }} />
              <div style={{ display: 'flex', gap: '4px' }}>
                {COL_COLORS.map(c => <div key={c} onClick={() => setNewColColore(c)} style={{ width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer', border: newColColore === c ? '2px solid var(--gray-950)' : '1px solid transparent' }} />)}
              </div>
              <button onClick={addColonna} disabled={saving} style={{ background: 'var(--brand-700)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>+ Aggiungi</button>
            </div>
          </div>

          {/* ── TRANSIZIONI ── */}
          {colonne.length > 1 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>Transizioni consentite</div>
              <div style={{ fontSize: '11px', color: 'var(--gray-400)', marginBottom: '14px' }}>Clicca su una cella per abilitare/disabilitare. ✓ = transizione permessa.</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'separate', borderSpacing: 4, fontSize: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--gray-400)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Da ↓ / A →</th>
                      {colonne.map(col => (
                        <th key={col.id} style={{ padding: '6px 10px', textAlign: 'center', minWidth: 90 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: col.colore }} />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gray-950)' }}>{col.nome}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {colonne.map(rowCol => (
                      <tr key={rowCol.id}>
                        <td style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: rowCol.colore }} />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gray-950)' }}>{rowCol.nome}</span>
                          </div>
                        </td>
                        {colonne.map(colCol => {
                          const isSelf = rowCol.id === colCol.id;
                          const active = !isSelf && hasTransizione(rowCol.id, colCol.id);
                          return (
                            <td key={colCol.id} onClick={() => !isSelf && toggleTransizione(rowCol.id, colCol.id)}
                              style={{ textAlign: 'center', padding: '6px', background: isSelf ? 'var(--gray-100)' : active ? '#f0fdf4' : '#fff', border: `1px solid ${isSelf ? 'var(--gray-200)' : active ? '#bbf7d0' : 'var(--gray-200)'}`, borderRadius: '8px', cursor: isSelf ? 'default' : 'pointer', transition: 'all 0.15s', minWidth: 80 }}>
                              {isSelf ? <span style={{ color: 'var(--gray-200)', fontSize: '14px' }}>—</span>
                                : active ? <span style={{ color: '#16a34a', fontSize: '16px', fontWeight: 700 }}>✓</span>
                                : <span style={{ color: 'var(--gray-200)', fontSize: '16px' }}>○</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer con elimina workflow */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {diSistema ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--gray-400)', fontStyle: 'italic' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              Workflow di sistema — non eliminabile
            </div>
          ) : (
          <button
            onClick={handleDeleteWorkflow}
            disabled={deletingWf}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, transition: 'all 0.15s', opacity: deletingWf ? 0.6 : 1 }}
            onMouseOver={e => { if (!deletingWf) e.currentTarget.style.background = '#fef2f2'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'none'; }}
          >
            🗑 {deletingWf ? 'Eliminazione...' : 'Elimina workflow'}
          </button>
          )}
          <button className="btn-save" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    </div>
  );
}



export function WfModal({ onClose }) {
  const [nome, setNome] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '340px' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}><h3>Nuovo workflow</h3></div>
        <div className="form-group">
          <label>Nome workflow</label>
          <input placeholder="es. Delivery, Sviluppo..." value={nome} onChange={e => setNome(e.target.value)} autoFocus />
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={async () => {
            if (!nome.trim()) return;
            await supabase.from('workflows').insert({ nome: nome.trim() });
            onClose();
          }}>Salva</button>
        </div>
      </div>
    </div>
  );
}

export function ColModal({ workflowId, onClose }) {
  const [nome, setNome] = useState('');
  const [colore, setColore] = useState('var(--gray-500)');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '340px' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}><h3>Nuova colonna</h3></div>
        <div className="form-group">
          <label>Nome colonna</label>
          <input placeholder="es. Da fare, In corso, Fatto..." value={nome} onChange={e => setNome(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label>Colore</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {COL_COLORS.map(c => (
              <div key={c} onClick={() => setColore(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', border: colore === c ? '3px solid var(--gray-950)' : '2px solid transparent', boxSizing: 'border-box', transition: 'all 0.15s' }} />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>Annulla</button>
          <button className="btn-save" onClick={async () => {
            if (!nome.trim()) return;
            const { data: existing } = await supabase.from('workflow_colonne').select('ordine').eq('workflow_id', workflowId).order('ordine', { ascending: false }).limit(1);
            const nextOrdine = existing && existing.length > 0 ? existing[0].ordine + 1 : 0;
            await supabase.from('workflow_colonne').insert({ workflow_id: workflowId, nome: nome.trim(), colore, ordine: nextOrdine });
            onClose();
          }}>Salva</button>
        </div>
      </div>
    </div>
  );
}