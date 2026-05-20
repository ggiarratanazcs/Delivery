import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { staffKey, staffLabel } from '../utils.js';
import { CardModal } from './CardModal.jsx';
import { PRIORITA_COLORS } from '../constants.js';


const MESI_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function getMonths(n = 6, startYear, startMonth) {
  const months = [];
  const now = new Date();
  const sy = startYear || now.getFullYear();
  const sm = startMonth ? startMonth - 1 : now.getMonth();
  for (let i = 0; i < n; i++) {
    const d = new Date(sy, sm + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const label = `${MESI_IT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
    const wd = workingDaysInMonth(d.getFullYear(), d.getMonth());
    months.push({ key, label, wd });
  }
  return months;
}

function workingDaysInMonth(year, month, fromToday = false) {
  const today = new Date();
  today.setHours(0,0,0,0);
  let count = 0;
  const days = new Date(year, month + 1, 0).getDate();
  // fromToday: partiamo da domani (oggi non è pianificabile)
  const startDay = (fromToday && year === today.getFullYear() && month === today.getMonth())
    ? today.getDate() + 1
    : 1;
  for (let d = startDay; d <= days; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

function addWorkingDays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

function firstWorkingDay(year, month) {
  const d = new Date(year, month, 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d;
}

function fmtDate(d) {
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function toIso(d) {
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function calcDateLavori(monthKey, hours, fineLavoriNelMese, wdNelMese, usedDaysNelMese, notBefore) {
  const [y, mo] = monthKey.split('-').map(Number);
  let inizio;
  if (fineLavoriNelMese) {
    inizio = addWorkingDays(new Date(fineLavoriNelMese), 1);
    if (inizio.getMonth() + 1 !== mo || inizio.getFullYear() !== y) {
      inizio = firstWorkingDay(y, mo - 1);
    }
  } else {
    inizio = firstWorkingDay(y, mo - 1);
  }
  // Non iniziare prima di notBefore (es. domani se siamo nel mese corrente)
  if (notBefore) {
    const nb = new Date(notBefore);
    nb.setHours(0, 0, 0, 0);
    if (inizio < nb) {
      // Avanza al primo giorno lavorativo >= notBefore
      inizio = new Date(nb);
      while (inizio.getDay() === 0 || inizio.getDay() === 6) inizio.setDate(inizio.getDate() + 1);
    }
  }
  let giorniRimanenti = Math.max(1, Math.ceil(hours / 8));
  let cursor = new Date(inizio);
  let fine = new Date(inizio);
  while (giorniRimanenti > 0) {
    if (giorniRimanenti > 1) cursor = addWorkingDays(cursor, 1);
    fine = new Date(cursor);
    giorniRimanenti--;
  }
  return { inizio, fine };
}

function capacityColor(used, total) {
  if (total === 0) return '#639922';
  const pct = used / total;
  if (pct < 0.5) return '#639922';
  if (pct < 0.8) return '#BA7517';
  return '#E24B4A';
}

export function SviluppoView({ staff, clients = [], isAdmin = false, filterSearch = '' }) {
  const [reorderInfo, setReorderInfo] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [teamDropOpen, setTeamDropOpen] = useState(false);
  const [sviluppoPickerOpen, setSviluppoPickerOpen] = useState(false);
  const now0 = new Date();
  const [sviluppoStartMonth, setSviluppoStartMonth] = useState(now0.getMonth() + 1);
  const [sviluppoStartYear, setSviluppoStartYear] = useState(now0.getFullYear());
  const [sviluppoPickerYear, setSviluppoPickerYear] = useState(now0.getFullYear());

  const MONTHS = getMonths(6, sviluppoStartYear, sviluppoStartMonth);

  const [backlog, setBacklog] = useState([]);
  const [assigned, setAssigned] = useState({});
  const [assignedCards, setAssignedCards] = useState({});
  const [teamConfig, setTeamConfig] = useState([]);
  const [activeTeam, setActiveTeam] = useState('tutti');
  const [simulation, setSimulation] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragItem, setDragItem] = useState(null);
  const [colonnaPianificate, setColonnaPianificate] = useState(null);
  const [colonnaBacklog, setColonnaBacklog] = useState(null);
  const [toast, setToast] = useState(null);
  const [reschedulePreview, setReschedulePreview] = useState(null);
  const [clientiMap, setClientiMap] = useState({});
  const [selectedCard, setSelectedCard] = useState(null);
  const [workflowColonne, setWorkflowColonne] = useState([]);
  const [transizioni, setTransizioni] = useState([]);

  useEffect(() => { loadData(); }, []);

  // ── Scrive un evento nel log attività ──────────────────────
  const writeLog = async (attivitaId, tipo, descrizione, extra = {}) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData?.user?.email || '';
      const { data: staffData } = await supabase
        .from('staff').select('nome, cognome').eq('email', email).single();
      const utente = staffData ? `${staffData.cognome} ${staffData.nome}` : email;
      await supabase.from('attivita_log').insert({
        attivita_id: attivitaId, tipo, descrizione, utente, ...extra,
      });
    } catch (e) {
      console.error('writeLog error:', e);
    }
  };

  const loadData = async () => {
    const { data: teams } = await supabase.from('config_team_prodotto').select('*').order('ordine');
    setTeamConfig(teams || []);

    const { data: colonne } = await supabase.from('workflow_colonne').select('id, nome, workflow_id').order('ordine');
    setWorkflowColonne(colonne || []);
    const colBacklog = (colonne || []).find(c => c.nome.toLowerCase().includes('backlog da pianificare'));
    const colPianif = (colonne || []).find(c => c.nome.toLowerCase() === 'pianificate');
    const colComplete = (colonne || []).filter(c => c.nome.toLowerCase().includes('complet') || c.nome.toLowerCase().includes('annullat'));
    const colCompleteIds = colComplete.map(c => c.id);
    setColonnaBacklog(colBacklog || null);
    setColonnaPianificate(colPianif || null);

    const { data: trans } = await supabase.from('workflow_transizioni').select('*');
    setTransizioni(trans || []);

    if (colBacklog) {
      const { data: atts } = await supabase
        .from('attivita')
        .select('id, titolo, priorita, stima_ore, data_rilascio, data_richiesta, team_sviluppo, assegnata_a, commessa_id, bolla_id, commessa:commessa_id(nome_commessa, pm_commessa, client_id), bolla:bolla_id(codice, descrizione)')
        .eq('colonna_id', colBacklog.id);
      setBacklog(atts || []);
    }

    const { data: progetti } = await supabase.from('projects').select('id, nome_progetto');
    const cm = {};
    (progetti || []).forEach(p => { cm[p.id] = p.nome_progetto; });
    setClientiMap(cm);

    let attQuery = supabase
      .from('attivita')
      .select('id, titolo, stima_ore, data_rilascio, data_inizio_lavori, data_fine_lavori, assegnata_a, colonna_id, priorita, ordine, team_sviluppo, commessa_id, commessa:commessa_id(nome_commessa), bolla:bolla_id(codice, descrizione), colonna:colonna_id(nome)')
      .not('assegnata_a', 'is', null);
    const { data: allAtts } = await attQuery;
    const colCompleteIdsSet = new Set(colCompleteIds);

    const wdInMonth = (dateStart, dateEnd, monthKey) => {
      const [y, m] = monthKey.split('-').map(Number);
      const mStart = new Date(y, m - 1, 1);
      const mEnd = new Date(y, m, 0);
      const from = dateStart > mStart ? dateStart : mStart;
      const to = dateEnd < mEnd ? dateEnd : mEnd;
      let count = 0;
      const d = new Date(from);
      while (d <= to) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) count++;
        d.setDate(d.getDate() + 1);
      }
      return count;
    };

    const assignedMap = {};
    const cardsMap = {};
    (allAtts || []).forEach(a => {
      const resId = a.assegnata_a;
      const dr = a.data_fine_lavori || a.data_rilascio;
      if (!dr || !a.stima_ore) return;
      const isCompleted = colCompleteIdsSet.has(a.colonna_id) || !!(a.colonna?.nome && /complet|annullat|done/i.test(a.colonna.nome));
      const monthKey = dr.slice(0, 7);
      if (!assignedMap[resId]) assignedMap[resId] = {};

      if (!isCompleted) {
        if (a.data_inizio_lavori && a.data_fine_lavori) {
          const start = new Date(a.data_inizio_lavori);
          const end = new Date(a.data_fine_lavori);
          const inizioKey = a.data_inizio_lavori.slice(0, 7);
          const fineKey = a.data_fine_lavori.slice(0, 7);
          const [iy, im] = inizioKey.split('-').map(Number);
          const [fy, fm] = fineKey.split('-').map(Number);
          let totalWd = 0;
          let cy = iy, cm2 = im;
          while (cy < fy || (cy === fy && cm2 <= fm)) {
            const ck = `${cy}-${String(cm2).padStart(2,'0')}`;
            totalWd += wdInMonth(start, end, ck);
            cm2++; if (cm2 > 12) { cm2 = 1; cy++; }
          }
          if (totalWd > 0) {
            cy = iy; cm2 = im;
            while (cy < fy || (cy === fy && cm2 <= fm)) {
              const ck = `${cy}-${String(cm2).padStart(2,'0')}`;
              const wdInM = wdInMonth(start, end, ck);
              const oreInM = (parseFloat(a.stima_ore) * wdInM) / totalWd;
              assignedMap[resId][ck] = (assignedMap[resId][ck] || 0) + oreInM;
              cm2++; if (cm2 > 12) { cm2 = 1; cy++; }
            }
          }
        } else {
          assignedMap[resId][monthKey] = (assignedMap[resId][monthKey] || 0) + (parseFloat(a.stima_ore) || 0);
        }
      }

      if (!cardsMap[resId]) cardsMap[resId] = {};
      const inizioKey = a.data_inizio_lavori ? a.data_inizio_lavori.slice(0, 7) : monthKey;
      const fineKey = (a.data_fine_lavori || a.data_rilascio).slice(0, 7);
      const [iy, im] = inizioKey.split('-').map(Number);
      const [fy, fm] = fineKey.split('-').map(Number);
      let cy = iy, cm = im;
      while (cy < fy || (cy === fy && cm <= fm)) {
        const ck = `${cy}-${String(cm).padStart(2,'0')}`;
        if (!cardsMap[resId][ck]) cardsMap[resId][ck] = [];
        const isFirst = ck === inizioKey;
        const isLast = ck === fineKey;
        cardsMap[resId][ck].push({
          attId: a.id, title: a.titolo, hours: a.stima_ore,
          colonna: a.colonna?.nome, priorita: a.priorita,
          dataFine: a.data_fine_lavori || a.data_rilascio,
          dataInizio: a.data_inizio_lavori,
          isFirst, isLast, isCross: inizioKey !== fineKey,
          ordine: a.ordine ?? 9999,
          isCompleted: colCompleteIdsSet.has(a.colonna_id) || !!(a.colonna?.nome && /complet|annullat|done/i.test(a.colonna.nome)),
          raw: a
        });
        cm++; if (cm > 12) { cm = 1; cy++; }
      }
    });
    setAssigned(assignedMap);
    setAssignedCards(cardsMap);
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleConfirm = async () => {
    if (!simulation) return;
    setSaving(true);
    try {
      const updates = {
        assegnata_a: simulation.resId,
        data_inizio_lavori: simulation.inizioIso,
        data_fine_lavori: simulation.fineIso,
        data_rilascio: simulation.fineIso,
      };
      if (colonnaPianificate) updates.colonna_id = colonnaPianificate.id;
      await supabase.from('attivita').update(updates).eq('id', simulation.attId);

      // ── Log pianificazione ──────────────────────────────────
      const logDesc = simulation.isReplan
        ? `Ripianificata: ${simulation.inizio} → ${simulation.release} (risorsa: ${simulation.resId})`
        : `Pianificata: ${simulation.inizio} → ${simulation.release} (risorsa: ${simulation.resId})`;
      await writeLog(simulation.attId, 'pianificazione', logDesc);

      const savedResId = simulation.resId;

      // Notifica all'assegnatario e agli osservatori
      const testoNotifica = simulation.isReplan
        ? `"${simulation.title}": pianificazione aggiornata — dal ${simulation.inizio} al ${simulation.release}`
        : `"${simulation.title}": pianificata — dal ${simulation.inizio} al ${simulation.release}`;
      const destinatari = new Set();
      if (simulation.resId) destinatari.add(simulation.resId);
      const { data: ossList } = await supabase.from('attivita_osservatori').select('staff_key').eq('attivita_id', simulation.attId);
      (ossList || []).forEach(o => destinatari.add(o.staff_key));
      if (destinatari.size > 0) {
        await supabase.from('notifiche').insert(
          [...destinatari].map(dest => ({
            destinatario: dest,
            testo: testoNotifica,
            tipo: 'workflow',
            riferimento_id: simulation.attId,
          }))
        );
      }

      showToast(`Pianificato — inizio ${simulation.inizio} · fine ${simulation.release}`);
      setSimulation(null);
      await loadData();
      const { data: attRisorsa } = await supabase
        .from('attivita')
        .select('id, titolo, stima_ore, data_inizio_lavori, data_fine_lavori, assegnata_a')
        .eq('assegnata_a', savedResId)
        .not('data_inizio_lavori', 'is', null)
        .not('data_fine_lavori', 'is', null)
        .not('colonna_id', 'in', `(${workflowColonne.filter(c => /complet|annullat|done/i.test(c.nome)).map(c => c.id).join(',') || '0'})`);
      if (attRisorsa && attRisorsa.length >= 2) {
        const changes = calcRescheduling(savedResId, attRisorsa);
        if (changes.length > 0) setReschedulePreview({ resId: savedResId, changes });
      }
    } catch (err) {
      showToast('Errore nel salvataggio', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = (resId, monthKey) => {
    if (!dragItem) return;
    const cardsInMonth = ((assignedCards[resId] || {})[monthKey] || [])
      .filter(c => c.attId !== dragItem.id && !c.isCompleted);
    const lastFine = cardsInMonth
      .map(c => c.dataFine ? new Date(c.dataFine) : null)
      .filter(Boolean)
      .sort((a, b) => b - a)[0] || null;
    const mObj = getMonths(12).find(m => m.key === monthKey);
    const wdNelMese = mObj ? mObj.wd : 21;
    const usedDays = Math.round(((assigned[resId] || {})[monthKey] || 0) / 8);
    // notBefore: se il mese trascinato è il mese corrente, non iniziare prima di domani
    const today0 = new Date(); today0.setHours(0,0,0,0);
    const tomorrow = new Date(today0); tomorrow.setDate(tomorrow.getDate() + 1);
    const [mkY, mkM] = monthKey.split('-').map(Number);
    const isCurrentMonth = mkY === today0.getFullYear() && mkM === today0.getMonth() + 1;
    const notBefore = isCurrentMonth ? tomorrow : null;
    const { inizio, fine } = calcDateLavori(monthKey, dragItem.stima_ore || 8, lastFine, wdNelMese, usedDays, notBefore);
    setSimulation({
      attId: dragItem.id, resId, monthKey,
      title: dragItem.titolo,
      hours: dragItem.stima_ore || 8,
      release: fmtDate(fine),
      inizio: fmtDate(inizio),
      inizioIso: toIso(inizio),
      fineIso: toIso(fine),
      isReplan: !!dragItem._fromCell,
    });
    setDragItem(null);
  };

  const reorderAndReschedule = async (resKey, draggedId, targetId, position) => {
    const { data: allAtts } = await supabase
      .from('attivita').select('id, titolo, stima_ore, data_inizio_lavori, data_fine_lavori, ordine')
      .eq('assegnata_a', resKey).not('data_inizio_lavori', 'is', null)
      .not('colonna_id', 'in', `(${workflowColonne.filter(c => /complet|annullat|done/i.test(c.nome)).map(c => c.id).join(',') || '0'})`)
      .order('data_inizio_lavori', { ascending: true });
    if (!allAtts || allAtts.length < 2) return;
    let list = allAtts.filter(a => a.id !== draggedId);
    const targetIdx = list.findIndex(a => a.id === targetId);
    const dragged = allAtts.find(a => a.id === draggedId);
    if (!dragged || targetIdx < 0) return;
    list.splice(position === 'before' ? targetIdx : targetIdx + 1, 0, dragged);
    const startDate = new Date(allAtts[0].data_inizio_lavori);
    let prevFine = null;
    const updates = list.map((a, i) => {
      const giorni = Math.max(1, Math.ceil((parseFloat(a.stima_ore)||8)/8));
      const nuovoInizio = i === 0 ? new Date(startDate) : addWorkingDays(prevFine, 1);
      const nuovaFine = giorni > 1 ? addWorkingDays(new Date(nuovoInizio), giorni-1) : new Date(nuovoInizio);
      prevFine = nuovaFine;
      return {
        id: a.id,
        titolo: a.titolo,
        ordine: (i+1)*10,
        data_inizio_lavori: toIso(nuovoInizio),
        data_fine_lavori: toIso(nuovaFine),
        data_rilascio: toIso(nuovaFine),
      };
    });
    setSaving(true);
    try {
      await Promise.all(updates.map(u =>
        supabase.from('attivita').update({
          ordine: u.ordine,
          data_inizio_lavori: u.data_inizio_lavori,
          data_fine_lavori: u.data_fine_lavori,
          data_rilascio: u.data_rilascio,
        }).eq('id', u.id)
      ));

      // ── Log riordinamento per ogni attività spostata ────────
      await Promise.all(updates.map(u =>
        writeLog(u.id, 'pianificazione',
          `Riordinamento: ${u.data_inizio_lavori.split('-').reverse().join('/')} → ${u.data_fine_lavori.split('-').reverse().join('/')}`)
      ));

      showToast('Riordinamento applicato');
      await loadData();
    } catch(e) {
      showToast('Errore', 'error');
    } finally {
      setSaving(false);
      setReorderInfo(null);
    }
  };

  const calcRescheduling = (resId, allAtts) => {
    const attivitaRisorsa = allAtts
      .filter(a => a.assegnata_a === resId && a.data_inizio_lavori && a.data_fine_lavori)
      .sort((a, b) => new Date(a.data_inizio_lavori) - new Date(b.data_inizio_lavori));
    if (attivitaRisorsa.length < 2) return [];
    const changes = [];
    let prevFine = new Date(attivitaRisorsa[0].data_fine_lavori);
    for (let i = 1; i < attivitaRisorsa.length; i++) {
      const att = attivitaRisorsa[i];
      const giorni = Math.max(1, Math.ceil((parseFloat(att.stima_ore) || 8) / 8));
      const nuovoInizio = addWorkingDays(prevFine, 1);
      const nuovaFine = addWorkingDays(new Date(nuovoInizio), giorni - 1);
      const newInizioStr = toIso(nuovoInizio);
      const newFineStr = toIso(nuovaFine);
      if (newInizioStr !== att.data_inizio_lavori || newFineStr !== att.data_fine_lavori) {
        changes.push({ att, oldInizio: att.data_inizio_lavori, oldFine: att.data_fine_lavori, newInizio: newInizioStr, newFine: newFineStr });
      }
      prevFine = nuovaFine;
    }
    return changes;
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulePreview) return;
    setSaving(true);
    try {
      await Promise.all(reschedulePreview.changes.map(c =>
        supabase.from('attivita').update({
          data_inizio_lavori: c.newInizio,
          data_fine_lavori: c.newFine,
          data_rilascio: c.newFine,
        }).eq('id', c.att.id)
      ));

      // ── Log rischeduling per ogni attività aggiornata ───────
      await Promise.all(reschedulePreview.changes.map(c =>
        writeLog(c.att.id, 'pianificazione',
          `Rischedulato: ${c.newInizio.split('-').reverse().join('/')} → ${c.newFine.split('-').reverse().join('/')} (era: ${c.oldInizio.split('-').reverse().join('/')} → ${c.oldFine.split('-').reverse().join('/')})`)
      ));

      showToast(`Rischeduling applicato — ${reschedulePreview.changes.length} attività aggiornate`);
      setReschedulePreview(null);
      await loadData();
    } catch (err) {
      showToast('Errore nel rischeduling', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDropBacklog = async () => {
    if (!dragItem?._fromCell) return;
    if (!window.confirm(`Riportare "${dragItem.titolo}" nel backlog da pianificare?`)) return;
    const savedResId = dragItem.assegnata_a;
    const updates = { assegnata_a: null, data_inizio_lavori: null, data_fine_lavori: null, data_rilascio: null };
    if (colonnaBacklog) updates.colonna_id = colonnaBacklog.id;
    await supabase.from('attivita').update(updates).eq('id', dragItem.id);

    // ── Log rimozione dalla pianificazione ──────────────────
    await writeLog(dragItem.id, 'pianificazione', `Rimossa dalla pianificazione — riportata in backlog`);

    setDragItem(null);
    showToast(`"${dragItem.titolo}" riportato in backlog`);
    await loadData();
    if (savedResId) {
      const { data: attRisorsa } = await supabase
        .from('attivita').select('id, titolo, stima_ore, data_inizio_lavori, data_fine_lavori, assegnata_a')
        .eq('assegnata_a', savedResId).not('data_inizio_lavori', 'is', null).not('data_fine_lavori', 'is', null)
        .not('colonna_id', 'in', `(${workflowColonne.filter(c => /complet|annullat|done/i.test(c.nome)).map(c => c.id).join(',') || '0'})`);
      if (attRisorsa && attRisorsa.length >= 2) {
        const changes = calcRescheduling(savedResId, attRisorsa);
        if (changes.length > 0) setReschedulePreview({ resId: savedResId, changes });
      }
    }
  };

  const PRIO_ORDER = { 'alta': 0, 'media': 1, 'bassa': 2 };
  const q = filterSearch.trim().toLowerCase();

  const filteredStaff = staff
    .filter(s => (s.ruolo === 'Programmatore' || s.ruolo === 'Analista') && (activeTeam === 'tutti' || s.team_prodotto === activeTeam))
    .sort((a, b) => {
      if (a.ruolo === 'Analista' && b.ruolo !== 'Analista') return -1;
      if (b.ruolo === 'Analista' && a.ruolo !== 'Analista') return 1;
      return `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`);
    });

  const filteredBacklog = backlog
    .filter(a => {
      if (activeTeam !== 'tutti' && a.team_sviluppo !== activeTeam) return false;
      if (!q) return true;
      const clienteNome = a.commessa?.client_id ? (clientiMap[a.commessa.client_id] || '') : '';
      return (
        (a.titolo || '').toLowerCase().includes(q) ||
        clienteNome.toLowerCase().includes(q) ||
        (a.commessa?.nome_commessa || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (PRIO_ORDER[a.priorita] ?? 1) - (PRIO_ORDER[b.priorita] ?? 1));

  const pClass = (p) => {
    if (p === 'alta') return { bg: '#FCEBEB', color: '#A32D2D' };
    if (p === 'media') return { bg: '#FAEEDA', color: '#633806' };
    return { bg: '#EAF3DE', color: '#27500A' };
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc' }}>

      {/* Toolbar principale */}
      <div style={{ background: '#fff', borderBottom: '0.5px solid #e2e8f0', padding: '8px 16px', display: 'flex', alignItems: 'center', flexShrink: 0, minHeight: 44 }}>
        {simulation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#0F6E56', background: '#E1F5EE', border: '0.5px solid #9FE1CB', borderRadius: '20px', padding: '4px 12px', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Simulazione attiva — conferma o annulla
          </div>
        )}
      </div>

      {/* Sub-bar filtri */}
      <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Flag completate */}
          <button onClick={() => setShowCompleted(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', ...(showCompleted ? { background: '#f1f5f9', borderColor: '#94a3b8', color: '#475569' } : { background: '#fff', borderColor: '#e2e8f0', color: '#94a3b8' }) }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: showCompleted ? '#475569' : '#cbd5e1', display: 'block', flexShrink: 0 }} />
            Completate/Annullate
          </button>
          {/* Dropdown team */}
          <div style={{ position: 'relative' }}>
            <div onClick={() => setTeamDropOpen(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: '20px', border: '1px solid', fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s', ...(activeTeam !== 'tutti' ? { background: '#f0f4ff', borderColor: '#c7d2fe', color: '#3730a3' } : { background: '#fff', borderColor: '#e2e8f0', color: '#475569' }) }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              {activeTeam === 'tutti' ? 'Tutti i team' : activeTeam}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: teamDropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {teamDropOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', zIndex: 300, minWidth: 180, overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}>
                {['tutti', ...teamConfig.map(t => t.nome)].map(t => (
                  <div key={t} onClick={() => { setActiveTeam(t); setSimulation(null); setTeamDropOpen(false); }}
                    style={{ padding: '9px 14px', fontSize: 12, cursor: 'pointer', background: activeTeam === t ? '#eff6ff' : '#fff', color: activeTeam === t ? '#0054a6' : '#374151', fontWeight: activeTeam === t ? 500 : 400 }}
                    onMouseOver={e => { if (activeTeam !== t) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseOut={e => { if (activeTeam !== t) e.currentTarget.style.background = '#fff'; }}>
                    {t === 'tutti' ? 'Tutti i team' : t}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Filtro data */}
          {(() => {
            const now = new Date();
            const defStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
            const [sy, sm] = defStart.split('-').map(Number);
            const mesiIt = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
            return (
              <div style={{ position: 'relative' }}>
                <div onClick={() => setSviluppoPickerOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: sviluppoPickerOpen ? '#eff6ff' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: sviluppoPickerOpen ? '#0054a6' : '#64748b', userSelect: 'none' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {mesiIt[(sviluppoStartMonth||sm)-1]} {sviluppoStartYear||sy}
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>+6m</span>
                </div>
                {sviluppoPickerOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', zIndex: 300, padding: '12px 14px', minWidth: 220 }}
                    onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <button onClick={() => setSviluppoPickerYear(y => y-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b', padding: '2px 8px' }}>&#8249;</button>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{sviluppoPickerYear||(sy)}</span>
                      <button onClick={() => setSviluppoPickerYear(y => y+1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#64748b', padding: '2px 8px' }}>&#8250;</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
                      {mesiIt.map((m, i) => {
                        const isSel = (sviluppoStartMonth||sm) === i+1 && (sviluppoStartYear||sy) === (sviluppoPickerYear||sy);
                        return (
                          <div key={m} onClick={() => { setSviluppoStartMonth(i+1); setSviluppoStartYear(sviluppoPickerYear||sy); setSviluppoPickerOpen(false); }}
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
      {teamDropOpen && <div style={{ position: 'fixed', inset: 0, zIndex: 299 }} onClick={() => setTeamDropOpen(false)} />}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Backlog */}
        <div
          style={{ width: 210, flexShrink: 0, background: '#fff', borderRight: '0.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'background 0.15s' }}
          onDragOver={e => { if (dragItem?._fromCell) { e.preventDefault(); e.currentTarget.style.background = '#fef9c3'; }}}
          onDragLeave={e => { e.currentTarget.style.background = '#fff'; }}
          onDrop={e => { e.currentTarget.style.background = '#fff'; handleDropBacklog(); }}>
          <div style={{ padding: '10px 12px', fontSize: '11px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '0.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span>Da pianificare</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {dragItem?._fromCell && <span style={{ fontSize: '9px', color: '#854d0e', background: '#fef9c3', border: '0.5px solid #fde68a', borderRadius: '4px', padding: '1px 5px' }}>↩ rilascia qui</span>}
              <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: '#f1f5f9', color: '#64748b' }}>{filteredBacklog.length}</span>
            </div>
          </div>
          <div style={{ overflow: 'auto', flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {filteredBacklog.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                {colonnaBacklog ? 'Nessuna attività da pianificare' : 'Colonna "Backlog da pianificare" non trovata nel workflow'}
              </div>
            )}
            {filteredBacklog.map(a => {
              const pc = pClass(a.priorita);
              const isSimulating = simulation?.attId === a.id;
              return (
                <div key={a.id}
                  draggable={!isSimulating}
                  onDragStart={() => { if (!isSimulating) setDragItem(a); }}
                  onDragEnd={() => setDragItem(null)}
                  onClick={async () => {
                    const { data: fresh } = await supabase.from('attivita').select('*, commessa:commessa_id(nome_commessa, pm_commessa, client_id), bolla:bolla_id(codice, descrizione)').eq('id', a.id).single();
                    setSelectedCard(fresh || a);
                  }}
                  style={{ background: isSimulating ? '#f0fdf8' : '#fff', border: `0.5px solid ${isSimulating ? '#9FE1CB' : '#e2e8f0'}`, borderRadius: '8px', padding: '9px 10px', cursor: 'pointer', opacity: dragItem?.id === a.id ? 0.4 : 1, transition: 'all 0.12s' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#9FE1CB'; e.currentTarget.style.background = isSimulating ? '#f0fdf8' : '#f8fffe'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = isSimulating ? '#9FE1CB' : '#e2e8f0'; e.currentTarget.style.background = isSimulating ? '#f0fdf8' : '#fff'; }}>
                  <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a', marginBottom: 6, lineHeight: 1.35 }}>{a.titolo}</div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    {a.priorita && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 500, background: pc.bg, color: pc.color }}>{a.priorita}</span>}
                    {a.stima_ore && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', background: '#E6F1FB', color: '#0C447C', fontFamily: 'monospace', fontWeight: 500 }}>{a.stima_ore}h</span>}
                  </div>
                  {(() => {
                    const clienteNome = a.commessa?.client_id ? (clientiMap[a.commessa.client_id] || null) : null;
                    if (!clienteNome) return null;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        <span style={{ fontSize: '10px', color: '#185FA5', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clienteNome}</span>
                      </div>
                    );
                  })()}
                  {a.data_richiesta && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      <span style={{ fontSize: '10px', color: '#94a3b8' }}>{a.data_richiesta.split('-').reverse().join('/')}</span>
                    </div>
                  )}
                  {isSimulating && <div style={{ marginTop: 5, fontSize: '10px', color: '#0F6E56', fontStyle: 'italic' }}>In simulazione...</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Board */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header mesi */}
          <div style={{ background: '#fff', borderBottom: '0.5px solid #e2e8f0', display: 'flex', flexShrink: 0, overflow: 'hidden' }}>
            <div style={{ width: 140, flexShrink: 0, borderRight: '0.5px solid #e2e8f0', padding: '10px 12px', fontSize: '11px', fontWeight: 500, color: '#64748b' }}>Risorsa</div>
            {MONTHS.map(m => {
              const usedHours = filteredStaff.reduce((s, r) => s + ((assigned[staffKey(r)] || {})[m.key] || 0), 0);
              const simExtra = (simulation && simulation.monthKey === m.key) ? (simulation.hours || 0) : 0;
              const usedDays = Math.round((usedHours + simExtra) / 8);
              const [my, mm] = m.key.split('-').map(Number);
              const effectiveWd = workingDaysInMonth(my, mm - 1, true);
              const today = new Date(); today.setHours(0,0,0,0);
              const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
              const passedWd = m.key === todayKey ? workingDaysInMonth(my, mm-1) - effectiveWd : 0;
              const totalDays = filteredStaff.length * effectiveWd || effectiveWd;
              const usedDaysAdjusted = Math.max(0, usedDays - passedWd * filteredStaff.length);
              const free = Math.max(0, totalDays - usedDaysAdjusted);
              const pct = totalDays > 0 ? Math.min(1, usedDaysAdjusted / totalDays) : 0;
              const col = capacityColor(usedDays, totalDays);
              return (
                <div key={m.key} style={{ flex: 1, minWidth: 100, borderRight: '0.5px solid #e2e8f0', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ fontSize: '10px', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: '16px', fontWeight: 500, color: '#0f172a' }}>{free}</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>gg liberi</span>
                  </div>
                  <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2 }}>
                    <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: col, borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Righe risorse */}
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredStaff.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>Nessuna risorsa trovata</div>
            )}
            {filteredStaff.map(s => {
              const rKey = staffKey(s);
              const initials = `${(s.nome||'').slice(0,1)}${(s.cognome||'').slice(0,1)}`.toUpperCase();
              return (
                <div key={rKey} style={{ display: 'flex', borderBottom: '0.5px solid #f1f5f9' }}>
                  {/* Label risorsa */}
                  <div style={{ width: 140, flexShrink: 0, borderRight: '0.5px solid #e2e8f0', padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fff' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#E6F1FB', color: '#0C447C', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 500, flexShrink: 0, overflow: 'hidden' }}>
                      {s.avatar_url ? <img src={s.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a', lineHeight: 1.3 }}>{s.nome} {s.cognome}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>{s.ruolo}</div>
                    </div>
                  </div>
                  {/* Celle mesi */}
                  {MONTHS.map(m => {
                    const cards = ((assignedCards[rKey] || {})[m.key] || [])
                      .filter(c => showCompleted || !c.isCompleted)
                      .filter(c => {
                        if (!q) return true;
                        const clienteNome = c.raw?.commessa?.client_id ? (clientiMap[c.raw.commessa.client_id] || '') : '';
                        return (
                          (c.title || '').toLowerCase().includes(q) ||
                          clienteNome.toLowerCase().includes(q) ||
                          (c.raw?.commessa?.nome_commessa || '').toLowerCase().includes(q)
                        );
                      })
                      .slice().sort((a, b) => { const da = a.dataInizio||''; const db = b.dataInizio||''; if (da && db && da !== db) return da.localeCompare(db); return (a.ordine??9999)-(b.ordine??9999); });
                    const isSimCell = simulation?.resId === rKey && simulation?.monthKey === m.key;
                    return (
                      <div key={m.key}
                        style={{ flex: 1, minWidth: 100, borderRight: '0.5px solid #f1f5f9', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 72, background: isSimCell ? '#f0fdf8' : 'transparent', transition: 'background 0.15s' }}
                        onDragOver={e => {
                          if (!dragItem) return;
                          e.preventDefault();
                          const isReorder = dragItem?._fromCell && dragItem?.data_inizio_lavori;
                          if (!isReorder) e.currentTarget.style.background = '#E1F5EE';
                        }}
                        onDragLeave={e => { e.currentTarget.style.background = isSimCell ? '#f0fdf8' : 'transparent'; setReorderInfo(null); }}
                        onDrop={e => {
                          e.preventDefault();
                          e.currentTarget.style.background = isSimCell ? '#f0fdf8' : 'transparent';
                          const isReorder = dragItem?._fromCell && dragItem?.data_inizio_lavori && reorderInfo?.targetId;
                          if (isReorder) {
                            reorderAndReschedule(rKey, dragItem.id, reorderInfo.targetId, reorderInfo.position);
                          } else {
                            handleDrop(rKey, m.key);
                          }
                          setReorderInfo(null);
                        }}>
                        {cards.map((c, i) => {
                          const pc = c.priorita === 'alta' ? '#E24B4A' : c.priorita === 'media' ? '#BA7517' : '#639922';
                          const isTarget = reorderInfo?.targetId === c.attId && reorderInfo?.resKey === rKey;
                          return (
                            <div key={i} style={{ position: 'relative' }}>
                              {isTarget && reorderInfo.position === 'before' && (
                                <div style={{ height: 2, background: '#0054a6', borderRadius: 1, marginBottom: 2 }} />
                              )}
                              <div
                                draggable
                                onDragStart={e => { e.stopPropagation(); setDragItem({ ...c.raw, _fromCell: true }); setReorderInfo(null); }}
                                onDragEnd={() => { setDragItem(null); setReorderInfo(null); }}
                                onDragOver={e => {
                                  if (dragItem?._fromCell && dragItem?.data_inizio_lavori && dragItem?.id !== c.raw?.id && dragItem?.assegnata_a === rKey) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                                    setReorderInfo({ targetId: c.attId, resKey: rKey, position: pos });
                                  }
                                }}
                                onClick={async () => {
                                  if (!c.raw) return;
                                  const { data: fresh } = await supabase.from('attivita').select('*, commessa:commessa_id(nome_commessa, pm_commessa, client_id), bolla:bolla_id(codice, descrizione)').eq('id', c.raw.id).single();
                                  setSelectedCard(fresh || c.raw);
                                }}
                                style={{ background: c.isCompleted ? '#f8fafc' : c.isCross ? '#fdf4ff' : '#fff', border: `0.5px solid ${c.isCompleted ? '#e2e8f0' : c.isCross ? '#e9d5ff' : '#e2e8f0'}`, borderLeft: `2px solid ${c.isCompleted ? '#94a3b8' : pc}`, borderRadius: c.isCross ? (c.isFirst ? '6px 0 0 6px' : c.isLast ? '0 6px 6px 0' : '0') : '6px', padding: '5px 7px', cursor: c.isCompleted ? 'default' : 'grab', transition: 'all 0.12s', position: 'relative', opacity: c.isCompleted ? 0.55 : dragItem?.id === c.raw?.id ? 0.4 : 1 }}
                                onMouseOver={e => { e.currentTarget.style.background = '#f0f4ff'; }}
                                onMouseOut={e => { e.currentTarget.style.background = c.isCross ? '#fdf4ff' : '#fff'; }}>
                                {c.isCross && <div style={{ position: 'absolute', top: 3, right: 5, fontSize: '8px', color: '#7c3aed', fontWeight: 600 }}>{c.isFirst ? '→' : c.isLast ? '←' : '↔'}</div>}
                                {(c.isFirst || !c.isCross) && <div style={{ fontSize: '11px', fontWeight: 500, color: c.isCompleted ? '#94a3b8' : '#0f172a', lineHeight: 1.3, marginBottom: 3, paddingRight: c.isCross ? 12 : 0, textDecoration: c.isCompleted ? 'line-through' : 'none' }}>{c.title}{c.isCompleted && <span style={{ marginLeft: 4, fontSize: 9, background: '#e2e8f0', color: '#64748b', borderRadius: 3, padding: '1px 4px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>{c.colonna || 'chiusa'}</span>}</div>}
                                {c.isCross && !c.isFirst && <div style={{ fontSize: '10px', color: '#7c3aed', fontStyle: 'italic', marginBottom: 3 }}>&#8617; {c.title}</div>}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>{c.hours}h</span>
                                  {c.isFirst && c.dataInizio && <span style={{ fontSize: '10px', color: '#475569' }}>dal {c.dataInizio.split('-').reverse().slice(0,2).join('/')}</span>}
                                  {c.isLast && c.dataFine && <span style={{ fontSize: '10px', color: c.isCross ? '#7c3aed' : '#185FA5', fontWeight: 500 }}>al {c.dataFine.split('-').reverse().slice(0,2).join('/')}</span>}
                                </div>
                              </div>
                              {isTarget && reorderInfo.position === 'after' && (
                                <div style={{ height: 2, background: '#0054a6', borderRadius: 1, marginTop: 2 }} />
                              )}
                            </div>
                          );
                        })}
                        {isSimCell && (
                          <div style={{ background: '#fff', border: '1.5px dashed #1D9E75', borderRadius: '8px', padding: '7px 8px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 500, color: '#085041', marginBottom: 3, lineHeight: 1.3, display: 'flex', alignItems: 'center', gap: 4 }}>
                              {simulation.isReplan && <span style={{ fontSize: '9px', background: '#fef9c3', color: '#854d0e', borderRadius: '3px', padding: '1px 4px', fontWeight: 600 }}>↻</span>}
                              {simulation.title}
                            </div>
                            <div style={{ fontSize: '10px', color: '#0F6E56', fontFamily: 'monospace', marginBottom: 4 }}>{simulation.hours}h stimate</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 6 }}>
                              <div style={{ fontSize: '10px', color: '#475569', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                Inizio: {simulation.inizio}
                              </div>
                              <div style={{ fontSize: '10px', color: '#0F6E56', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                Fine: {simulation.release}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button onClick={handleConfirm} disabled={saving} style={{ flex: 1, fontSize: '10px', padding: '3px 0', borderRadius: '5px', border: '0.5px solid #9FE1CB', background: '#E1F5EE', color: '#085041', cursor: 'pointer', fontWeight: 500 }}>
                                {saving ? '...' : 'Conferma'}
                              </button>
                              <button onClick={() => setSimulation(null)} style={{ flex: 1, fontSize: '10px', padding: '3px 0', borderRadius: '5px', border: '0.5px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer' }}>
                                Annulla
                              </button>
                            </div>
                          </div>
                        )}
                        {cards.length === 0 && !isSimCell && (
                          <div style={{ flex: 1, border: '1px dashed #e2e8f0', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>
                            <span style={{ fontSize: '10px', color: '#cbd5e1' }}>trascina qui</span>
                          </div>
                        )}
                        {(() => {
                          const simH = isSimCell ? (simulation.hours || 0) : 0;
                          const usedH = ((assigned[rKey] || {})[m.key] || 0) + simH;
                          const usedDays = Math.round(usedH / 8);
                          const todayNow = new Date(); todayNow.setHours(0,0,0,0);
                          const todayKeyNow = `${todayNow.getFullYear()}-${String(todayNow.getMonth()+1).padStart(2,'0')}`;
                          const [myCel, mmCel] = m.key.split('-').map(Number);
                          const availableWd = workingDaysInMonth(myCel, mmCel-1, true);
                          const passedWdCell = m.key === todayKeyNow ? workingDaysInMonth(myCel, mmCel-1) - availableWd : 0;
                          const usedDaysAdj = Math.max(0, usedDays - passedWdCell);
                          const freeDays = Math.max(0, availableWd - usedDaysAdj);
                          const pct = availableWd > 0 ? Math.min(1, usedDaysAdj / availableWd) : 0;
                          const col = capacityColor(usedDaysAdj, availableWd);
                          return (
                            <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                <span style={{ fontSize: '9px', color: '#94a3b8' }}>{freeDays}gg</span>
                                <span style={{ fontSize: '9px', color: col, fontWeight: 500 }}>{Math.round(pct * 100)}%</span>
                              </div>
                              <div style={{ height: 3, background: '#e2e8f0', borderRadius: 2 }}>
                                <div style={{ width: `${Math.round(pct * 100)}%`, height: '100%', background: col, borderRadius: 2, transition: 'width 0.3s' }} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CardModal — passa isAdmin per abilitare la stellina */}
      {selectedCard && (() => {
        const cardConColonna = {
          ...selectedCard,
          colonna_id: selectedCard.colonna_id || colonnaBacklog?.id,
          workflow_id: selectedCard.workflow_id || colonnaBacklog?.workflow_id,
        };
        return (
          <CardModal
            card={cardConColonna}
            colonne={workflowColonne}
            defaultColId={cardConColonna.colonna_id}
            workflowId={cardConColonna.workflow_id}
            staff={[]}
            clients={clients}
            transizioni={transizioni}
            isAdmin={isAdmin}
            onClose={async () => {
              const card = selectedCard;
              setSelectedCard(null);
              await loadData();
              if (card?.assegnata_a && card?.data_fine_lavori) {
                const { data: updated } = await supabase.from('attivita')
                  .select('id, colonna:colonna_id(nome), data_fine_lavori')
                  .eq('id', card.id).single();
                const isComplete = updated?.colonna?.nome &&
                  /complet|annullat|done/i.test(updated.colonna.nome);
                if (isComplete) {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const nuovoStartIso = toIso(addWorkingDays(today, 1));
                  const { data: attRisorsa } = await supabase
                    .from('attivita').select('id, titolo, stima_ore, data_inizio_lavori, data_fine_lavori, assegnata_a')
                    .eq('assegnata_a', card.assegnata_a)
                    .not('data_inizio_lavori', 'is', null)
                    .gt('data_inizio_lavori', card.data_fine_lavori)
                    .not('colonna_id', 'in', `(${(workflowColonne.filter(c => /complet|annullat|done/i.test(c.nome)).map(c => c.id).join(',') || '0')})`);
                  if (attRisorsa && attRisorsa.length > 0) {
                    const changes = calcRescheduling(card.assegnata_a, [
                      { id: card.id, assegnata_a: card.assegnata_a, data_inizio_lavori: card.data_inizio_lavori, data_fine_lavori: toIso(today), stima_ore: card.stima_ore },
                      ...attRisorsa
                    ]);
                    if (changes.length > 0) setReschedulePreview({ resId: card.assegnata_a, changes });
                  }
                }
              }
            }}
            onDelete={async () => {
              await supabase.from('attivita').delete().eq('id', selectedCard.id);
              setSelectedCard(null);
              loadData();
            }}
          />
        );
      })()}

      {/* Modal rescheduling */}
      {reschedulePreview && (
        <div className="modal-overlay" onClick={() => setReschedulePreview(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: '#001d47', padding: '18px 22px' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Rischeduling a cascata</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{reschedulePreview.changes.length} {reschedulePreview.changes.length === 1 ? 'attività si sposta' : 'attività si spostano'} per riempire il vuoto</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>Le attività successive vengono riportate indietro partendo dal primo spazio libero</div>
            </div>
            <div style={{ padding: '16px 22px', maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {reschedulePreview.changes.map((c, i) => (
                <div key={c.att.id} style={{ border: '0.5px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '8px 12px', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', flexShrink: 0 }}>#{i + 1}</span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a', flex: 1 }}>{c.att.titolo}</span>
                    {c.att.stima_ore && <span style={{ fontSize: '10px', color: '#0C447C', background: '#E6F1FB', border: '0.5px solid #B5D4F4', borderRadius: '4px', padding: '1px 6px', fontFamily: 'monospace' }}>{c.att.stima_ore}h</span>}
                  </div>
                  <div style={{ padding: '8px 12px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                    <div style={{ background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: '6px', padding: '5px 8px' }}>
                      <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Prima</div>
                      <div style={{ fontSize: '11px', color: '#7f1d1d', fontFamily: 'monospace' }}>{c.oldInizio.split('-').reverse().join('/')} → {c.oldFine.split('-').reverse().join('/')}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    <div style={{ background: '#f0fdf4', border: '0.5px solid #bbf7d0', borderRadius: '6px', padding: '5px 8px' }}>
                      <div style={{ fontSize: '9px', color: '#16a34a', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Dopo</div>
                      <div style={{ fontSize: '11px', color: '#14532d', fontFamily: 'monospace' }}>{c.newInizio.split('-').reverse().join('/')} → {c.newFine.split('-').reverse().join('/')}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '0.5px solid #e2e8f0', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setReschedulePreview(null)} style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: '13px', cursor: 'pointer' }}>Lascia com'è</button>
              <button onClick={handleConfirmReschedule} disabled={saving} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#001d47', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Aggiornamento...' : 'Conferma rischeduling'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'absolute', bottom: 20, right: 20, background: '#001d47', color: '#fff', padding: '10px 16px', borderRadius: '10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 100 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={toast.type === 'error' ? '#f87171' : '#5DCAA5'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {toast.type === 'error' ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <polyline points="20 6 9 17 4 12"/>}
          </svg>
          {toast.msg}
        </div>
      )}
    </div>
  );
}