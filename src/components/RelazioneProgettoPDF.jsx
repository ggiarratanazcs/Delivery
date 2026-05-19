import React, { useState } from 'react';

// ─────────────────────────────────────────────────────────────
// Carica jsPDF da CDN (UMD global window.jspdf)
// ─────────────────────────────────────────────────────────────
function loadJsPDF() {
  return new Promise((resolve) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => resolve(window.jspdf.jsPDF);
    document.head.appendChild(s);
  });
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmt = (str) => {
  if (!str) return '—';
  const [y, m, d] = str.split('-').map(Number);
  return `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`;
};

const fmtN = (n, dec = 1) =>
  (Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec))
    .toFixed(dec).replace('.', ',');

const MESI_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

// ─────────────────────────────────────────────────────────────
// Generatore PDF
// ─────────────────────────────────────────────────────────────
async function generaPDF({
  commessa, tasks, isReparto,
  oreTecCons, orePagCons, giorniDispCons, giorniSvoltiCons, giorniResiduiCons,
  oreTecSvil, orePagSvil, giorniDispSvil, giorniSvoltiSvil, giorniResiduiSvil,
  bolleConsulenza, bolleSviluppo,
  reparti,
}) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210;
  const ML = 14;
  const MR = 14;
  const CW = W - ML - MR;
  let Y = 0;

  const navy = [0, 29, 71];
  const white = [255, 255, 255];
  const gray1 = [248, 250, 252];
  const gray2 = [226, 232, 240];
  const blue = [24, 95, 165];
  const green = [15, 110, 86];
  const red = [220, 38, 38];
  const text1 = [15, 23, 42];
  const text2 = [100, 116, 139];

  const addPage = () => { doc.addPage(); Y = 0; };

  const checkY = (needed) => { if (Y + needed > 270) addPage(); };

  // ── HEADER ──────────────────────────────────────────────────
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 38, 'F');

  // Logo placeholder ZCS
  doc.setFillColor(255, 255, 255, 0.15);
  doc.setDrawColor(...white);
  doc.setLineWidth(0.3);
  doc.roundedRect(W - 50, 5, 36, 28, 2, 2, 'S');
  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('ZUCCHETTI', W - 32, 15, { align: 'center' });
  doc.text('CENTRO SISTEMI', W - 32, 20, { align: 'center' });
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('S.p.A.', W - 32, 25, { align: 'center' });

  doc.setTextColor(...white);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('RELAZIONE DI AVANZAMENTO PROGETTO', ML, 11);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titolo = `${commessa?.nome_commessa || 'Progetto'} — ${commessa?.clientName || ''}`;
  doc.text(titolo, ML, 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 220);
  doc.text(`Generata il ${new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'long', year:'numeric' })}`, ML, 30);

  Y = 44;

  // ── DATI GENERALI ────────────────────────────────────────────
  doc.setFillColor(...gray1);
  doc.rect(0, Y, W, 14, 'F');
  doc.setTextColor(...text2);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  const cols3 = [ML, ML + CW/3, ML + (CW/3)*2];
  const labels = ['Project Manager', 'Periodo', 'Stato commessa'];
  const vals = [
    commessa?.pm_commessa || '—',
    `${fmt(commessa?.data_inizio)} → ${fmt(commessa?.data_fine)}`,
    commessa?.attiva !== false ? 'Attiva' : 'Chiusa',
  ];
  labels.forEach((l, i) => {
    doc.text(l.toUpperCase(), cols3[i], Y + 4);
    doc.setTextColor(...text1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(vals[i], cols3[i], Y + 10);
    doc.setTextColor(...text2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
  });

  Y += 20;

  // ── SEZIONE 1: AVANZAMENTO ───────────────────────────────────
  checkY(50);
  doc.setTextColor(...navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('1. AVANZAMENTO ATTIVITÀ', ML, Y);
  doc.setDrawColor(...navy);
  doc.setLineWidth(0.5);
  doc.line(ML, Y + 1.5, ML + CW, Y + 1.5);
  Y += 6;

  const taskList = tasks.filter(t => !isReparto(t));
  const totale = taskList.length;
  const chiuse = taskList.filter(t => t.stato === 'Chiusa').length;
  const inCorso = taskList.filter(t => t.stato === 'In Corso').length;
  const inRitardo = taskList.filter(t => {
    if (t.stato === 'Chiusa') return false;
    if (!t.previsto) return false;
    const [y, m, d] = t.previsto.split('-').map(Number);
    return new Date(y, m-1, d) < new Date();
  }).length;
  const perc = totale > 0 ? Math.round((chiuse / totale) * 100) : 0;

  const kpiW = CW / 4 - 2;
  const kpiData = [
    { label: 'Totale', val: totale, bg: [245,247,250], fg: navy },
    { label: 'Chiuse', val: chiuse, bg: [240,253,244], fg: green },
    { label: 'In corso', val: inCorso, bg: [239,246,255], fg: blue },
    { label: 'In ritardo', val: inRitardo, bg: [254,242,242], fg: red },
  ];

  kpiData.forEach((k, i) => {
    const x = ML + i * (kpiW + 2.5);
    doc.setFillColor(...k.bg);
    doc.roundedRect(x, Y, kpiW, 20, 2, 2, 'F');
    doc.setTextColor(...k.fg);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(k.val), x + kpiW/2, Y + 11, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(k.label, x + kpiW/2, Y + 17, { align: 'center' });
  });

  Y += 24;

  // Barra progresso
  doc.setFillColor(...gray2);
  doc.roundedRect(ML, Y, CW, 5, 1, 1, 'F');
  doc.setFillColor(...navy);
  doc.roundedRect(ML, Y, CW * perc / 100, 5, 1, 1, 'F');
  doc.setTextColor(...text2);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${perc}% completato`, ML + CW, Y + 3.5, { align: 'right' });

  Y += 12;

  // ── SEZIONE 2: KPI CONSULENZA E SVILUPPO ────────────────────
  checkY(50);
  doc.setTextColor(...navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('2. KPI CONSULENZA E SVILUPPO', ML, Y);
  doc.setDrawColor(...navy);
  doc.setLineWidth(0.5);
  doc.line(ML, Y + 1.5, ML + CW, Y + 1.5);
  Y += 6;

  const kpiBox = (x, w, label, accent, giorniDisp, giorniSvolti, giorniResidui, oreTec, orePag) => {
    doc.setFillColor(...gray1);
    doc.roundedRect(x, Y, w, 36, 2, 2, 'F');
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, Y, w, 36, 2, 2, 'S');

    // Dot + label
    doc.setFillColor(...accent);
    doc.circle(x + 4, Y + 5, 1.5, 'F');
    doc.setTextColor(...accent);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(label, x + 8, Y + 6.5);

    // Rows
    const rows = [
      ['Giorni disponibili', giorniDisp > 0 ? fmtN(giorniDisp) : '—'],
      ['Giorni svolti', fmtN(giorniSvolti)],
      ['Giorni residui', fmtN(Math.max(0, giorniResidui))],
      ['Efficacia', oreTec > 0 ? `${fmtN(orePag / oreTec * 100)}%` : '—'],
    ];

    rows.forEach((r, i) => {
      doc.setTextColor(...text2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(r[0], x + 4, Y + 14 + i * 6);
      doc.setTextColor(...text1);
      doc.setFont('helvetica', 'bold');
      doc.text(r[1], x + w - 4, Y + 14 + i * 6, { align: 'right' });
    });
  };

  const halfW = (CW - 4) / 2;
  kpiBox(ML, halfW, 'Consulenza', blue, giorniDispCons, giorniSvoltiCons, giorniResiduiCons, oreTecCons, orePagCons);
  kpiBox(ML + halfW + 4, halfW, 'Sviluppo', green, giorniDispSvil, giorniSvoltiSvil, giorniResiduiSvil, oreTecSvil, orePagSvil);

  Y += 42;

  // ── SEZIONE 3: GANTT ─────────────────────────────────────────
  checkY(60);
  doc.setTextColor(...navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('3. GANTT DI PROGETTO', ML, Y);
  doc.setDrawColor(...navy);
  doc.setLineWidth(0.5);
  doc.line(ML, Y + 1.5, ML + CW, Y + 1.5);
  Y += 6;

  // Intestazione mesi
  const labelW = 42;
  const ganttW = CW - labelW;
  const monthW = ganttW / 12;

  doc.setFillColor(...gray1);
  doc.rect(ML, Y, CW, 7, 'F');
  doc.setTextColor(...text2);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  MESI_IT.forEach((m, i) => {
    doc.text(m, ML + labelW + i * monthW + monthW / 2, Y + 4.5, { align: 'center' });
  });

  Y += 7;

  // Calcola range date commessa
  const startDate = commessa?.data_inizio ? new Date(commessa.data_inizio) : new Date(new Date().getFullYear(), 0, 1);
  const endDate = commessa?.data_fine ? new Date(commessa.data_fine) : new Date(new Date().getFullYear(), 11, 31);
  const startYear = startDate.getFullYear();

  const dateToGanttX = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const monthsFromStart = (d.getFullYear() - startYear) * 12 + d.getMonth();
    const ratio = (d.getDate() - 1) / new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return ML + labelW + Math.min(12, Math.max(0, monthsFromStart + ratio)) * monthW;
  };

  // Righe reparti
  reparti.forEach((rep, ri) => {
    checkY(10);
    const repTasks = tasks.filter(t => !isReparto(t) && t.reparto === rep);
    if (repTasks.length === 0) return;

    // Reparto header
    doc.setFillColor(...gray1);
    doc.rect(ML, Y, CW, 6, 'F');
    doc.setTextColor(...navy);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(rep, ML + 2, Y + 4);
    Y += 6;

    // Calcola range reparto
    const dates = repTasks.flatMap(t => [t.previsto, t.collaudo].filter(Boolean));
    if (dates.length === 0) return;
    const minD = dates.reduce((a, b) => a < b ? a : b);
    const maxD = dates.reduce((a, b) => a > b ? a : b);
    const x1 = dateToGanttX(minD);
    const x2 = dateToGanttX(maxD) || x1;

    if (x1 !== null) {
      // Barra
      const isSviluppo = rep.toLowerCase().includes('sviluppo');
      const barColor = isSviluppo ? green : navy;
      doc.setFillColor(...barColor);
      doc.roundedRect(x1, Y + 1, Math.max(2, x2 - x1), 5, 1, 1, 'F');

      // Label reparto sulla riga
      doc.setTextColor(...text2);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(rep, ML + 2, Y + 4.5);
    }

    Y += 8;
  });

  // Linea oggi
  const oggiX = dateToGanttX(new Date().toISOString().slice(0,10));
  if (oggiX && oggiX > ML + labelW && oggiX < ML + CW) {
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([1, 1], 0);
    // draw from start of gantt section — approximate
    doc.line(oggiX, Y - reparti.length * 8 - 7, oggiX, Y);
    doc.setLineDashPattern([], 0);
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(6);
    doc.text('Oggi', oggiX, Y + 3, { align: 'center' });
    Y += 6;
  }

  Y += 6;

  // ── SEZIONE 4: DETTAGLIO ATTIVITÀ ────────────────────────────
  checkY(20);
  doc.setTextColor(...navy);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('4. DETTAGLIO ATTIVITÀ PER REPARTO', ML, Y);
  doc.setDrawColor(...navy);
  doc.setLineWidth(0.5);
  doc.line(ML, Y + 1.5, ML + CW, Y + 1.5);
  Y += 6;

  // Intestazione tabella
  const colW = [CW * 0.45, CW * 0.2, CW * 0.17, CW * 0.18];
  const colX = [ML, ML + colW[0], ML + colW[0] + colW[1], ML + colW[0] + colW[1] + colW[2]];

  doc.setFillColor(...gray1);
  doc.rect(ML, Y, CW, 7, 'F');
  doc.setTextColor(...text2);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  ['Attività', 'Stato', 'Previsto', 'Collaudo'].forEach((h, i) => {
    doc.text(h, colX[i] + 2, Y + 4.5);
  });
  Y += 7;

  const statoColor = (s) => {
    if (s === 'Chiusa') return [39, 80, 10];
    if (s === 'In Corso') return [12, 68, 124];
    if (s === 'Da collaudare') return [133, 79, 11];
    return text2;
  };
  const statoBg = (s) => {
    if (s === 'Chiusa') return [240, 253, 244];
    if (s === 'In Corso') return [239, 246, 255];
    if (s === 'Da collaudare') return [250, 238, 218];
    return gray1;
  };

  reparti.forEach((rep) => {
    const repTasks = tasks.filter(t => !isReparto(t) && t.reparto === rep);
    if (repTasks.length === 0) return;

    checkY(10);
    doc.setFillColor(230, 241, 251);
    doc.rect(ML, Y, CW, 6, 'F');
    doc.setTextColor(...blue);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(rep, ML + 2, Y + 4);
    Y += 6;

    repTasks.forEach((task, ti) => {
      checkY(7);
      if (ti % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(250, 251, 252);
      }
      doc.rect(ML, Y, CW, 7, 'F');

      // Attività
      doc.setTextColor(...text1);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      const attLabel = doc.splitTextToSize(task.attivita || '—', colW[0] - 4);
      doc.text(attLabel[0], colX[0] + 2, Y + 4.5);

      // Stato badge
      const sg = statoBg(task.stato);
      const sc = statoColor(task.stato);
      doc.setFillColor(...sg);
      doc.roundedRect(colX[1] + 1, Y + 1.5, colW[1] - 2, 4, 1, 1, 'F');
      doc.setTextColor(...sc);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(task.stato || '—', colX[1] + colW[1] / 2, Y + 4.5, { align: 'center' });

      // Date
      doc.setTextColor(...text2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(fmt(task.previsto), colX[2] + 2, Y + 4.5);
      doc.text(fmt(task.collaudo), colX[3] + 2, Y + 4.5);

      // Riga separatore
      doc.setDrawColor(...gray2);
      doc.setLineWidth(0.2);
      doc.line(ML, Y + 7, ML + CW, Y + 7);

      Y += 7;
    });

    Y += 2;
  });

  // ── FOOTER SU OGNI PAGINA ────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...gray1);
    doc.rect(0, 285, W, 12, 'F');
    doc.setDrawColor(...gray2);
    doc.setLineWidth(0.3);
    doc.line(0, 285, W, 285);
    doc.setTextColor(...text2);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.text('Zucchetti Centro Sistemi S.p.A. — Documento riservato ad uso interno', ML, 290);
    doc.text(`Pagina ${p} di ${totalPages}`, W - MR, 290, { align: 'right' });
  }

  // ── DOWNLOAD ────────────────────────────────────────────────
  const nomeFile = `Relazione_${(commessa?.nome_commessa || 'Progetto').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(nomeFile);
}

// ─────────────────────────────────────────────────────────────
// Componente pulsante
// ─────────────────────────────────────────────────────────────
export function RelazioneProgettoPDF({
  commessa, tasks, isReparto, reparti,
  oreTecCons = 0, orePagCons = 0, giorniDispCons = 0, giorniSvoltiCons = 0, giorniResiduiCons = 0,
  oreTecSvil = 0, orePagSvil = 0, giorniDispSvil = 0, giorniSvoltiSvil = 0, giorniResiduiSvil = 0,
  bolleConsulenza = [], bolleSviluppo = [],
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await generaPDF({
        commessa, tasks, isReparto, reparti,
        oreTecCons, orePagCons, giorniDispCons, giorniSvoltiCons, giorniResiduiCons,
        oreTecSvil, orePagSvil, giorniDispSvil, giorniSvoltiSvil, giorniResiduiSvil,
        bolleConsulenza, bolleSviluppo,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      title="Esporta relazione PDF"
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '6px 14px', borderRadius: '20px',
        border: '1px solid #bfdbfe',
        background: loading ? '#f1f5f9' : '#eff6ff',
        color: loading ? '#94a3b8' : '#0054a6',
        fontSize: '12px', fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="12" y1="18" x2="12" y2="12"/>
        <polyline points="9 15 12 18 15 15"/>
      </svg>
      {loading ? 'Generazione...' : 'Esporta PDF'}
    </button>
  );
}