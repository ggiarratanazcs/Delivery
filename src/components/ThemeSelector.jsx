import React, { useState, useEffect } from 'react';

// ─── RIPRISTINO TEMA IMMEDIATO (prima che React monti) ────────────────────────
// Evita il flash di tema sbagliato al refresh
;(() => {
  const savedId = localStorage.getItem("zcs-theme");
  if (savedId && savedId !== "default") {
    const theme = [
      { id: "slate",     vars: { "--brand-900": "#1c1917","--brand-800": "#292524","--brand-700": "#44403c","--brand-600": "#78716c","--brand-500": "#a8a29e","--brand-100": "#f5f5f4","--brand-50": "#fafaf9","--gray-950": "#0c0a09","--gray-900": "#1c1917","--gray-700": "#44403c","--gray-500": "#78716c","--gray-400": "#a8a29e","--gray-200": "#e7e5e4","--gray-100": "#f5f5f4","--gray-50": "#fafaf9","--color-surface": "#fefefe" }, preview: { bg: "#f7f6f3", text: "#1c1917" } },
      { id: "forest",    vars: { "--brand-900": "#052e16","--brand-800": "#14532d","--brand-700": "#166534","--brand-600": "#15803d","--brand-500": "#22c55e","--brand-100": "#dcfce7","--brand-50": "#f0fdf4","--gray-950": "#052e16","--gray-900": "#14532d","--gray-700": "#2d4a38","--gray-500": "#4a7c59","--gray-400": "#7fb89a","--gray-200": "#c8e6d4","--gray-100": "#e8f5ec","--gray-50": "#f0f7f3","--color-surface": "#f9fdf9" }, preview: { bg: "#f0f7f3", text: "#052e16" } },
      { id: "midnight",  vars: { "--brand-900": "#bfdbfe","--brand-800": "#93c5fd","--brand-700": "#60a5fa","--brand-600": "#3b82f6","--brand-500": "#2563eb","--brand-100": "#1e3a5f","--brand-50": "#172035","--gray-950": "#f1f5f9","--gray-900": "#e2e8f0","--gray-700": "#cbd5e1","--gray-500": "#94a3b8","--gray-400": "#64748b","--gray-200": "#2a3148","--gray-100": "#1e2538","--gray-50": "#161a27","--color-surface": "#1c2030" }, preview: { bg: "#111318", text: "#cbd5e1" } },
    ].find(t => t.id === savedId);
    if (theme) {
      const root = document.documentElement;
      Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
      document.documentElement.setAttribute('data-theme', savedId);
      if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
          document.body.style.backgroundColor = theme.preview.bg;
          document.body.style.color = theme.preview.text;
        });
      }
    }
  }
})();

// ─── DEFINIZIONE TEMI ────────────────────────────────────────────────────────
// Ogni tema sovrascrive i token --brand-* e --gray-* già presenti in style.css.
// Non serve aggiungere NULLA al CSS: questi token esistono già tutti.
const THEMES = [
  {
    id: "default",
    label: "Classico ZCS",
    description: "Navy e grigio freddo — lo stile attuale del portale",
    dark: false,
    preview: {
      bg: "#f8fafc",
      card: "#ffffff",
      sidebar: "#ffffff",
      primary: "#001d47",
      accent: "#1a6ab5",
      text: "#1e293b",
      border: "#e2e8f0",
      muted: "#94a3b8",
    },
    vars: {
      "--brand-900": "#001229",
      "--brand-800": "#001d47",
      "--brand-700": "#0d4d8a",
      "--brand-600": "#1a6ab5",
      "--brand-500": "#2e85d4",
      "--brand-100": "#ddeeff",
      "--brand-50":  "#f0f7ff",
      "--gray-950":  "#0f172a",
      "--gray-900":  "#1e293b",
      "--gray-700":  "#334155",
      "--gray-500":  "#64748b",
      "--gray-400":  "#94a3b8",
      "--gray-200":  "#e2e8f0",
      "--gray-100":  "#f1f5f9",
      "--gray-50":   "#f8fafc",
      "--color-surface": "#ffffff",
    },
  },
  {
    id: "slate",
    label: "Slate Professionale",
    description: "Toni caldi sabbia — sobrio come uno studio legale",
    dark: false,
    preview: {
      bg: "#f7f6f3",
      card: "#faf9f7",
      sidebar: "#faf9f7",
      primary: "#292524",
      accent: "#78716c",
      text: "#1c1917",
      border: "#e7e5e4",
      muted: "#a8a29e",
    },
    vars: {
      "--brand-900": "#1c1917",
      "--brand-800": "#292524",
      "--brand-700": "#44403c",
      "--brand-600": "#78716c",
      "--brand-500": "#a8a29e",
      "--brand-100": "#f5f5f4",
      "--brand-50":  "#fafaf9",
      "--gray-950":  "#0c0a09",
      "--gray-900":  "#1c1917",
      "--gray-700":  "#44403c",
      "--gray-500":  "#78716c",
      "--gray-400":  "#a8a29e",
      "--gray-200":  "#e7e5e4",
      "--gray-100":  "#f5f5f4",
      "--gray-50":   "#fafaf9",
      "--color-surface": "#fefefe",
    },
  },
  {
    id: "forest",
    label: "Verde Operativo",
    description: "Verde bosco e menta — fresco e concentrato",
    dark: false,
    preview: {
      bg: "#f0f7f3",
      card: "#ffffff",
      sidebar: "#ffffff",
      primary: "#1a3a2a",
      accent: "#2d7a55",
      text: "#1a2e20",
      border: "#c8e6d4",
      muted: "#7fb89a",
    },
    vars: {
      "--brand-900": "#0d2018",
      "--brand-800": "#1a3a2a",
      "--brand-700": "#2d6a4f",
      "--brand-600": "#40916c",
      "--brand-500": "#52b788",
      "--brand-100": "#d8f3dc",
      "--brand-50":  "#f0faf2",
      "--gray-950":  "#0a1f12",
      "--gray-900":  "#1a2e20",
      "--gray-700":  "#2d4a38",
      "--gray-500":  "#4a7c59",
      "--gray-400":  "#7fb89a",
      "--gray-200":  "#c8e6d4",
      "--gray-100":  "#e8f5ec",
      "--gray-50":   "#f0f7f3",
      "--color-surface": "#f9fdf9",
    },
  },
  {
    id: "midnight",
    label: "Notte Operativa",
    description: "Grafite scuro e blu ghiaccio — elegante, riposante",
    dark: true,
    preview: {
      bg: "#111318",
      card: "#1c2030",
      sidebar: "#161a27",
      primary: "#e2e8f0",
      accent: "#60a5fa",
      text: "#cbd5e1",
      border: "#2a3148",
      muted: "#475569",
    },
    vars: {
      "--brand-900": "#bfdbfe",
      "--brand-800": "#93c5fd",
      "--brand-700": "#60a5fa",
      "--brand-600": "#3b82f6",
      "--brand-500": "#2563eb",
      "--brand-100": "#1e3a5f",
      "--brand-50":  "#172035",
      "--gray-950":  "#f1f5f9",
      "--gray-900":  "#e2e8f0",
      "--gray-700":  "#cbd5e1",
      "--gray-500":  "#94a3b8",
      "--gray-400":  "#64748b",
      "--gray-200":  "#2a3148",
      "--gray-100":  "#1e2538",
      "--gray-50":   "#161a27",
      "--color-surface": "#1c2030",
    },
  },
];

// ─── APPLICA TEMA AL DOM ──────────────────────────────────────────────────────
function applyTheme(theme) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });
  if (theme.vars['--color-surface']) {
    root.style.setProperty('--color-surface', theme.vars['--color-surface']);
  }
  document.body.style.backgroundColor = theme.preview.bg;
  document.body.style.color = theme.preview.text;
  root.setAttribute('data-theme', theme.id);
  localStorage.setItem("zcs-theme", theme.id);

  // Inietta/aggiorna un foglio di stile dinamico per il tema notte
  let dynStyle = document.getElementById('zcs-theme-dynamic');
  if (!dynStyle) {
    dynStyle = document.createElement('style');
    dynStyle.id = 'zcs-theme-dynamic';
    document.head.appendChild(dynStyle);
  }

  if (theme.id === 'midnight') {
    dynStyle.textContent = `
      /* Forza sfondo scuro su elementi con style inline bianchi */
      [data-theme="midnight"] * {
        --white-override: #1c2030;
        --lightgray-override: #161a27;
      }
      /* Tutti i tag con background bianco inline */
      [data-theme="midnight"] [style*="background: #fff"] { background: #1c2030 !important; }
      [data-theme="midnight"] [style*="background:#fff"] { background: #1c2030 !important; }
      [data-theme="midnight"] [style*="background: white"] { background: #1c2030 !important; }
      [data-theme="midnight"] [style*="background: #ffffff"] { background: #1c2030 !important; }
      [data-theme="midnight"] [style*="background: #f8fafc"] { background: #111318 !important; }
      [data-theme="midnight"] [style*="background: #f1f5f9"] { background: #161a27 !important; }
      [data-theme="midnight"] [style*="background: #f0f7ff"] { background: #172035 !important; }
      [data-theme="midnight"] [style*="background: #f0f7f3"] { background: #0d1f14 !important; }
      [data-theme="midnight"] [style*="backgroundColor: #fff"] { background-color: #1c2030 !important; }
      [data-theme="midnight"] [style*="backgroundColor: white"] { background-color: #1c2030 !important; }

      /* Testi scuri */
      [data-theme="midnight"] [style*="color: #0f172a"] { color: #e2e8f0 !important; }
      [data-theme="midnight"] [style*="color: #1e293b"] { color: #cbd5e1 !important; }
      [data-theme="midnight"] [style*="color: #334155"] { color: #94a3b8 !important; }
      [data-theme="midnight"] [style*="color: #475569"] { color: #94a3b8 !important; }
      [data-theme="midnight"] [style*="color: #64748b"] { color: #64748b !important; }
      [data-theme="midnight"] [style*="color: #001d47"] { color: #93c5fd !important; }
      [data-theme="midnight"] [style*="color: rgb(15, 23, 42)"] { color: #e2e8f0 !important; }
      [data-theme="midnight"] [style*="color: rgb(30, 41, 59)"] { color: #cbd5e1 !important; }

      /* Bordi */
      [data-theme="midnight"] [style*="border: 1px solid #e2e8f0"] { border-color: #2a3148 !important; }
      [data-theme="midnight"] [style*="border: 0.5px solid #e2e8f0"] { border-color: #2a3148 !important; }
      [data-theme="midnight"] [style*="border-bottom: 1px solid #e2e8f0"] { border-bottom-color: #2a3148 !important; }
      [data-theme="midnight"] [style*="border-right: 1px solid #e2e8f0"] { border-right-color: #2a3148 !important; }
      [data-theme="midnight"] [style*="border: 1px solid #f1f5f9"] { border-color: #1e2538 !important; }
      [data-theme="midnight"] [style*="border-bottom: 1px solid #f1f5f9"] { border-bottom-color: #1e2538 !important; }

      /* Header nav */
      [data-theme="midnight"] header { background: #161a27 !important; }

      /* Dropdown / popup flottanti */
      [data-theme="midnight"] [style*="position: fixed"][style*="background: #fff"],
      [data-theme="midnight"] [style*="position: fixed"][style*="background: white"],
      [data-theme="midnight"] [style*="position: absolute"][style*="background: #fff"],
      [data-theme="midnight"] [style*="position: absolute"][style*="background: white"] {
        background: #1c2030 !important;
        border-color: #2a3148 !important;
      }

      /* Table rows */
      [data-theme="midnight"] tbody tr { background: #1c2030 !important; }
      [data-theme="midnight"] tbody tr:nth-child(even) { background: #1e2538 !important; }
      [data-theme="midnight"] thead tr, [data-theme="midnight"] th { background: #161a27 !important; color: #64748b !important; }
      [data-theme="midnight"] td { border-color: #2a3148 !important; color: #cbd5e1 !important; }

      /* Modal .modal-content */
      [data-theme="midnight"] .modal-content { background: #1c2030 !important; color: #e2e8f0 !important; }

      /* Toolbar */
      [data-theme="midnight"] .toolbar { background: #1c2030 !important; border-color: #2a3148 !important; }

      /* Input */
      [data-theme="midnight"] input, [data-theme="midnight"] select, [data-theme="midnight"] textarea {
        background-color: transparent !important;
        color: #e2e8f0 !important;
        border-color: #2a3148 !important;
      }
      [data-theme="midnight"] input[type="date"] { color-scheme: dark; }

      /* Select options */
      [data-theme="midnight"] select option { background: #1c2030 !important; color: #e2e8f0 !important; }

      /* Badge chiari su sfondo chiaro */
      [data-theme="midnight"] [style*="background: #f0fdf4"] { background: #052e16 !important; }
      [data-theme="midnight"] [style*="background: #fef9c3"] { background: #1f1500 !important; }
      [data-theme="midnight"] [style*="background: #fef2f2"] { background: #1f0000 !important; }
      [data-theme="midnight"] [style*="background: #fffbeb"] { background: #1a1000 !important; }
      [data-theme="midnight"] [style*="background: #e6f1fb"] { background: #0f2744 !important; }
      [data-theme="midnight"] [style*="background: #eff6ff"] { background: #0f2744 !important; }
      [data-theme="midnight"] [style*="background: #eaf3de"] { background: #0a1f0a !important; }
      [data-theme="midnight"] [style*="background: #faeeda"] { background: #1f1000 !important; }
      [data-theme="midnight"] [style*="background: #e1f5ee"] { background: #041510 !important; }

      /* Scrollbar */
      [data-theme="midnight"] ::-webkit-scrollbar { width: 6px; height: 6px; }
      [data-theme="midnight"] ::-webkit-scrollbar-track { background: #111318; }
      [data-theme="midnight"] ::-webkit-scrollbar-thumb { background: #2a3148; border-radius: 3px; }
      [data-theme="midnight"] ::-webkit-scrollbar-thumb:hover { background: #3b4566; }

      /* Sticky columns nelle tabelle */
      [data-theme="midnight"] .sticky-col { background: #1c2030 !important; border-color: #2a3148 !important; }
      [data-theme="midnight"] .sticky-col-2 { background: #1c2030 !important; }

      /* Sidebar */
      [data-theme="midnight"] .sidebar-content { background: #161a27 !important; border-color: #2a3148 !important; }

      /* View content background */
      [data-theme="midnight"] .view-content { background: #111318 !important; }
      [data-theme="midnight"] .table-container { background: #111318 !important; }
    `;
  } else {
    dynStyle.textContent = '';
  }
}

// ─── MINI MOCKUP ─────────────────────────────────────────────────────────────
function ThemeMockup({ p }) {
  return (
    <div style={{
      borderRadius: "7px",
      overflow: "hidden",
      border: `1px solid ${p.border}`,
      background: p.bg,
      height: "88px",
      display: "flex",
      flexShrink: 0,
    }}>
      {/* Sidebar */}
      <div style={{
        width: "30%",
        background: p.sidebar,
        borderRight: `1px solid ${p.border}`,
        display: "flex",
        flexDirection: "column",
        padding: "6px 5px",
        gap: "4px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px", marginBottom: "2px" }}>
          <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: p.primary, flexShrink: 0 }} />
          <div style={{ height: "3px", borderRadius: "2px", background: p.primary, width: "55%", opacity: 0.7 }} />
        </div>
        {[70, 50, 60, 40].map((w, i) => (
          <div key={i} style={{
            height: "5px", borderRadius: "3px", width: `${w}%`,
            background: i === 0 ? p.accent : p.muted,
            opacity: i === 0 ? 1 : 0.4,
          }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "6px", display: "flex", flexDirection: "column", gap: "5px" }}>
        <div style={{
          background: p.card, borderRadius: "3px", height: "10px",
          display: "flex", alignItems: "center", paddingLeft: "5px", gap: "3px",
          border: `1px solid ${p.border}`,
        }}>
          <div style={{ width: "16px", height: "4px", borderRadius: "2px", background: p.accent }} />
          <div style={{ width: "24px", height: "4px", borderRadius: "2px", background: p.muted, opacity: 0.35 }} />
        </div>
        <div style={{ display: "flex", gap: "4px" }}>
          {[p.accent, p.primary, p.muted].map((c, i) => (
            <div key={i} style={{
              flex: 1, background: p.card, borderRadius: "3px", padding: "3px",
              border: `1px solid ${p.border}`, display: "flex", flexDirection: "column", gap: "2px",
            }}>
              <div style={{ height: "3px", borderRadius: "1px", background: c, opacity: i === 2 ? 0.35 : 0.8, width: "50%" }} />
              <div style={{ height: "5px", borderRadius: "1px", background: c, opacity: i === 2 ? 0.2 : 0.55, width: "80%" }} />
            </div>
          ))}
        </div>
        <div style={{
          background: p.card, borderRadius: "3px", padding: "3px 5px",
          border: `1px solid ${p.border}`, display: "flex", alignItems: "center", gap: "4px", flex: 1,
        }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: p.accent, flexShrink: 0 }} />
          <div style={{ flex: 1, height: "3px", borderRadius: "2px", background: p.muted, opacity: 0.3 }} />
          <div style={{
            background: p.accent + "28", color: p.accent,
            padding: "1px 4px", borderRadius: "2px", fontSize: "5px", fontWeight: 700, lineHeight: 1.6,
          }}>IN</div>
        </div>
      </div>
    </div>
  );
}

// ─── THEME CARD ───────────────────────────────────────────────────────────────
function ThemeCard({ theme, isActive, onClick }) {
  const p = theme.preview;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "12px",
        borderRadius: "var(--radius-md)",
        border: isActive
          ? `2px solid ${p.accent}`
          : `2px solid ${hovered ? p.border : "transparent"}`,
        background: isActive
          ? (theme.dark ? p.card : p.bg)
          : hovered
            ? (theme.dark ? "#1e2538" : p.bg + "cc")
            : "var(--gray-100)",
        boxShadow: isActive ? `0 0 0 3px ${p.accent}28` : "none",
        transition: "all 0.18s ease",
        outline: "none",
        flex: "1 1 140px",
        minWidth: 0,
      }}
    >
      <ThemeMockup p={p} />

      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <span style={{
            fontSize: "12px", fontWeight: 600,
            color: theme.dark ? p.text : p.primary,
            letterSpacing: "-0.01em",
          }}>
            {theme.label}
          </span>
          {isActive && (
            <span style={{
              fontSize: "9px", fontWeight: 700,
              background: p.accent, color: "#fff",
              padding: "1px 6px", borderRadius: "20px",
              letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              Attivo
            </span>
          )}
        </div>
        <span style={{ fontSize: "11px", color: p.muted, lineHeight: 1.4 }}>
          {theme.description}
        </span>
      </div>

      {/* Palette dots */}
      <div style={{ display: "flex", gap: "5px" }}>
        {[p.primary, p.accent, p.card, p.bg, p.border].map((c, i) => (
          <div key={i} style={{
            width: "13px", height: "13px", borderRadius: "50%",
            background: c,
            border: `1.5px solid ${theme.dark ? p.border : "rgba(0,0,0,0.1)"}`,
            flexShrink: 0,
          }} />
        ))}
      </div>
    </button>
  );
}

// ─── ANTEPRIMA LIVE ───────────────────────────────────────────────────────────
// Usa var() del DOM — si aggiorna in tempo reale senza re-render
function LivePreview({ themeName }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{
        margin: 0, fontSize: "11px", fontWeight: 600,
        color: "var(--gray-400)", letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        Anteprima live — {themeName}
      </p>

      {/* Tab bar stile portale */}
      <div style={{
        background: "var(--gray-50)", border: "1px solid var(--gray-200)",
        borderRadius: "var(--radius-md)", padding: "8px 14px",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{
          background: "var(--brand-800)", borderRadius: "var(--radius-sm)",
          padding: "4px 10px", fontSize: "11px", fontWeight: 600, color: "#fff",
          transition: "background 0.35s",
        }}>
          Pianificazione
        </div>
        {["Risorse", "Clienti", "Gantt"].map((t) => (
          <span key={t} style={{ fontSize: "12px", color: "var(--gray-500)", fontWeight: 500 }}>{t}</span>
        ))}
      </div>

      {/* KPI */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {[
          { label: "Risorse attive",  val: "12",  color: "var(--brand-800)" },
          { label: "Commesse aperte", val: "8",   color: "var(--brand-600)" },
          { label: "Margine medio",   val: "34%", color: "var(--gray-700)" },
        ].map((kpi) => (
          <div key={kpi.label} style={{
            flex: "1 1 100px",
            background: "var(--gray-50)", border: "1px solid var(--gray-200)",
            borderRadius: "var(--radius-md)", padding: "12px 14px", transition: "all 0.35s",
          }}>
            <div style={{
              fontSize: "20px", fontWeight: 700, color: kpi.color,
              fontFamily: "'IBM Plex Mono', monospace", transition: "color 0.35s", lineHeight: 1.2,
            }}>
              {kpi.val}
            </div>
            <div style={{ fontSize: "11px", color: "var(--gray-500)", marginTop: "3px" }}>
              {kpi.label}
            </div>
          </div>
        ))}
      </div>

      {/* Riga tabella */}
      <div style={{
        background: "var(--gray-50)", border: "1px solid var(--gray-200)",
        borderRadius: "var(--radius-md)", padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        transition: "all 0.35s",
      }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--gray-900)", transition: "color 0.35s" }}>
            Cliente Esempio Srl
          </div>
          <div style={{ fontSize: "11px", color: "var(--gray-400)", marginTop: "2px" }}>
            Commessa #2024-007 · PM: Rossi Mario
          </div>
        </div>
        <span style={{
          fontSize: "11px", fontWeight: 600,
          background: "var(--brand-100)", color: "var(--brand-700)",
          padding: "3px 10px", borderRadius: "20px", transition: "all 0.35s",
        }}>
          In corso
        </span>
      </div>

      {/* Badge skill */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {[
          { label: "Teseo",     color: "var(--brand-800)", bg: "var(--brand-100)" },
          { label: "Cassiopea", color: "var(--brand-700)", bg: "var(--brand-50)"  },
          { label: "BI",        color: "var(--gray-700)",  bg: "var(--gray-100)"  },
        ].map((badge) => (
          <span key={badge.label} style={{
            fontSize: "11px", fontWeight: 600,
            background: badge.bg, color: badge.color,
            padding: "3px 10px", borderRadius: "20px",
            border: "1px solid var(--gray-200)", transition: "all 0.35s",
          }}>
            {badge.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPALE ────────────────────────────────────────────────────
export default function ThemeSelector() {
  const [activeId, setActiveId] = useState(() => {
    return localStorage.getItem("zcs-theme") || "default";
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = THEMES.find((t) => t.id === activeId) || THEMES[0];
    applyTheme(stored);
  }, []);

  function handleSelect(theme) {
    if (theme.id === activeId) return;
    setActiveId(theme.id);
    applyTheme(theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  const activeTheme = THEMES.find((t) => t.id === activeId) || THEMES[0];

  return (
    <div style={{
      padding: "28px 24px",
      display: "flex",
      flexDirection: "column",
      gap: "20px",
      maxWidth: "720px",
      margin: "0 auto",
    }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "32px", height: "32px",
          borderRadius: "var(--radius-sm)",
          background: "var(--brand-800)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "background 0.35s",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M2 12h3m14 0h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--gray-900)" }}>
            Aspetto del portale
          </div>
          <div style={{ fontSize: "11px", color: "var(--gray-400)", marginTop: "1px" }}>
            La scelta viene salvata nel browser
          </div>
        </div>
      </div>

      {/* Selettore palette */}
      <div style={{
        background: "var(--gray-50)", border: "1px solid var(--gray-200)",
        borderRadius: "var(--radius-lg)", padding: "18px",
        display: "flex", flexDirection: "column", gap: "14px",
      }}>
        <span style={{
          fontSize: "11px", fontWeight: 600, color: "var(--gray-400)",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          Scegli la palette
        </span>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {THEMES.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              isActive={activeId === theme.id}
              onClick={() => handleSelect(theme)}
            />
          ))}
        </div>
      </div>

      {/* Toast */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "6px", fontSize: "12px", color: "var(--brand-600)",
        fontWeight: 500, height: "18px",
        opacity: saved ? 1 : 0,
        transform: saved ? "translateY(0)" : "translateY(4px)",
        transition: "opacity 0.25s, transform 0.25s",
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Tema applicato
      </div>
    </div>
  );
}