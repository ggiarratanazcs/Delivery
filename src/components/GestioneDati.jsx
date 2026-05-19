import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import * as XLSX from 'xlsx';

export function GestioneDatiModal({ onClose }) {
  const [tab, setTab] = useState('clienti');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '760px',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 64px rgba(0,0,0,0.2)', position: 'relative', overflow: 'hidden',
      }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>

        {/* Header */}
        <div style={{ padding: '22px 28px 0', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>
            Gestione Dati
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {[
              { key: 'clienti', label: '🏢 Import Clienti' },
              { key: 'bolle', label: '📋 Import Bolle' },
              { key: 'consuntivi', label: '📊 Import Consuntivi' },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '8px 18px', border: 'none', borderBottom: tab === t.key ? '2.5px solid #0054a6' : '2.5px solid transparent',
                background: 'transparent', color: tab === t.key ? '#0054a6' : '#64748b',
                fontWeight: tab === t.key ? 600 : 400, fontSize: '13px', cursor: 'pointer',
                transition: 'all 0.15s', marginBottom: '-1px',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Contenuto tab */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          {tab === 'clienti' && <TabClienti />}
          {tab === 'bolle' && <TabBolle />}
          {tab === 'consuntivi' && <TabConsuntivi />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB CLIENTI
// ─────────────────────────────────────────────
function TabClienti() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImporting(true);
      setResult(null);
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const rows = data.slice(1).filter(r => r.length >= 2 && r[1]);
        const records = rows.map(row => ({
          codice_cliente: row[0] ? String(row[0]).trim().replace(/\D/g, '').slice(0, 8) : null,
          nome_progetto: String(row[1] || '').trim(),
          pm_name: row[2] ? String(row[2]).trim() : null,
        })).filter(r => r.nome_progetto);

        let importati = 0;
        const chunkSize = 500;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const { error } = await supabase.from('projects').upsert(chunk, {
            onConflict: 'codice_cliente',
            ignoreDuplicates: true,
          });
          if (error) { setResult({ error: error.message }); return; }
          importati += chunk.length;
          setProgress(`${importati} di ${records.length}...`);
        }
        setResult({ ok: true, count: records.length });
      } finally {
        setImporting(false);
        setProgress('');
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <FormatoFile cols={[
        { col: 'A', nome: 'Codice gestionale', fmt: '8 cifre' },
        { col: 'B', nome: 'Cliente', fmt: 'ragione sociale' },
        { col: 'C', nome: 'PM', fmt: 'opzionale' },
      ]} nota="Incrementale — i clienti già presenti vengono ignorati" />
      <ImportButton importing={importing} progress={progress} onChange={handleFile} />
      {result && <Risultato result={result} entita="clienti" />}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB BOLLE
// ─────────────────────────────────────────────
function TabBolle() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImporting(true);
      setResult(null);
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const rows = data.slice(1).filter(r => r[0]);

        // Carica tutti i progetti per fare lookup codice_cliente → progetto_id
        const { data: projects } = await supabase.from('projects').select('id, codice_cliente');
        const projectMap = {};
        (projects || []).forEach(p => { if (p.codice_cliente) projectMap[p.codice_cliente] = p.id; });

        const records = rows.map(row => {
          const codice = String(row[0] || '').trim();
          const descrizione = String(row[1] || '').trim();
          const codiceCliente = String(row[2] || '').trim().replace(/\D/g, '').slice(0, 8);
          const orePreviste = parseFloat(String(row[3] || '0').replace(',', '.')) || 0;
          const progettoId = projectMap[codiceCliente] || null;
          return {
            codice,
            descrizione: descrizione || null,
            codice_cliente: codiceCliente || null,
            ore_previste: orePreviste,
            giorni_disponibili: orePreviste / 8,
            progetto_id: progettoId,
          };
        }).filter(r => r.codice);

        let importati = 0;
        const chunkSize = 500;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const { error } = await supabase.from('bolle_lavoro').upsert(chunk, {
            onConflict: 'codice',
            ignoreDuplicates: false,
          });
          if (error) { setResult({ error: error.message }); return; }
          importati += chunk.length;
          setProgress(`${importati} di ${records.length}...`);
        }
        setResult({ ok: true, count: records.length });
      } finally {
        setImporting(false);
        setProgress('');
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <FormatoFile cols={[
        { col: 'A', nome: 'Codice bolla', fmt: '5 cifre' },
        { col: 'B', nome: 'Descrizione', fmt: 'testo libero' },
        { col: 'C', nome: 'Codice cliente', fmt: '8 cifre' },
        { col: 'D', nome: 'Ore previste', fmt: 'numero (es. 40)' },
      ]} nota="Incrementale — le bolle esistenti vengono aggiornate" />
      <ImportButton importing={importing} progress={progress} onChange={handleFile} />
      {result && <Risultato result={result} entita="bolle" />}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB CONSUNTIVI
// Formato Excel atteso (riga 1 = intestazione, dati da riga 2):
//   A: data_attivita   → DD-MM-YYYY o DD/MM/YYYY o serial Excel
//   B: codice_cliente  → codice gestionale cliente
//   C: codice_operatore→ 3 cifre numeriche (es. "042")
//   D: note_attivita   → testo libero
//   E: ore_tecniche    → numero decimale
//   F: ore_pagamento   → numero decimale
//   G: codice_bolla    → codice bolla esistente (opzionale)
// ─────────────────────────────────────────────
function TabConsuntivi() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [errori, setErrori] = useState([]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImporting(true);
      setResult(null);
      setWarnings([]);
      setErrori([]);

      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
        // Salta riga intestazione
        const rows = data.slice(1);

        // ── Carica lookup tables in parallelo ──────────────────────────────
        const [
          { data: staffList },
          { data: bolleList },
        ] = await Promise.all([
          supabase.from('staff').select('id, codice, nome, cognome'),
          supabase.from('bolle_lavoro').select('codice'),
        ]);

        // codice operatore (3 cifre, normalizzato lowercase) → { id, staffKey }
        const staffByCodice = {};
        (staffList || []).forEach(s => {
          if (s.codice) {
            staffByCodice[String(s.codice).trim().toLowerCase()] = {
              id: s.id,
              staffKey: `${s.cognome} ${s.nome}`,
            };
          }
        });

        // set codici bolla validi
        const bolleValide = new Set((bolleList || []).map(b => String(b.codice).trim()));

        // ── Parsing righe ──────────────────────────────────────────────────
        const records = [];
        const warn = [];
        const errs = [];

        rows.forEach((row, idx) => {
          const rigaNum = idx + 2; // +2 perché slice(1) e 1-indexed

          const [dataRaw, codClienteRaw, codOperatoreRaw, noteRaw, oreTecRaw, orePagRaw, codBollaRaw] = row;

          // Salta righe vuote
          if (!dataRaw && !codOperatoreRaw && !oreTecRaw) return;

          // ── Parsing data ────────────────────────────────────────────────
          let dataAttivita = null;
          if (typeof dataRaw === 'number') {
            // Serial date Excel
            const parsed = XLSX.SSF.parse_date_code(dataRaw);
            if (parsed) {
              dataAttivita = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
            }
          } else {
            const s = String(dataRaw).trim();
            const parts = s.split(/[-/]/);
            if (parts.length === 3) {
              // Assume DD-MM-YYYY o DD/MM/YYYY
              const [d, m, y] = parts;
              dataAttivita = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
          }

          if (!dataAttivita) {
            errs.push(`Riga ${rigaNum}: data non valida → "${dataRaw}"`);
            return;
          }

          // anno_mese nel formato "YYYY-MM" — servirà per collegare alla pianificazione
          const annoMese = dataAttivita.substring(0, 7);

          // ── Lookup operatore ────────────────────────────────────────────
          const codOp = String(codOperatoreRaw).trim().toLowerCase();
          const staffMatch = staffByCodice[codOp];

          let staffId = null;
          if (!staffMatch) {
            warn.push(`Riga ${rigaNum}: operatore "${codOperatoreRaw}" non trovato in staff — salvato come testo`);
          } else {
            staffId = staffMatch.id;
          }

          // ── Validazione bolla ────────────────────────────────────────────
          // La bolla è opzionale; se presente deve esistere in bolle_lavoro
          let codBollaFinale = null;
          if (codBollaRaw && String(codBollaRaw).trim() !== '') {
            const cb = String(codBollaRaw).trim();
            if (!bolleValide.has(cb)) {
              // Errore bloccante per la riga: bolla inesistente
              errs.push(`Riga ${rigaNum}: bolla "${cb}" non trovata in bolle_lavoro — riga ignorata`);
              return;
            }
            codBollaFinale = cb;
          }

          // ── Ore (supporta sia punto che virgola come separatore decimale) ─
          const oreTec = parseFloat(String(oreTecRaw).replace(',', '.')) || 0;
          const orePag = parseFloat(String(orePagRaw).replace(',', '.')) || 0;

          records.push({
            data_attivita:    dataAttivita,
            codice_cliente:   String(codClienteRaw).trim(),
            codice_operatore: String(codOperatoreRaw).trim(), // salva il codice originale
            note_attivita:    String(noteRaw).trim() || null,
            ore_tecniche:     oreTec,
            ore_pagamento:    orePag,
            codice_bolla:     codBollaFinale,
            anno_mese:        annoMese,
            staff_id:         staffId,  // null se operatore non trovato
          });
        });

        // ── Inserimento bulk in consuntivi_globali ─────────────────────────
        // Usa upsert su (codice_operatore, codice_bolla, anno_mese) come chiave
        // per evitare duplicati su reimport dello stesso file
        let importati = 0;
        const chunkSize = 500;

        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const { error } = await supabase.from('consuntivi_globali').upsert(chunk, {
            onConflict: 'codice_operatore,codice_bolla,anno_mese',
            ignoreDuplicates: false, // aggiorna se il record esiste già
          });
          if (error) {
            setResult({ error: error.message });
            setErrori(errs.slice(0, 10));
            setWarnings(warn.slice(0, 10));
            return;
          }
          importati += chunk.length;
          setProgress(`${importati} di ${records.length}...`);
        }

        setWarnings(warn.slice(0, 10));
        setErrori(errs.slice(0, 10));
        setResult({
          ok: true,
          count: records.length,
          warned: warn.length,
          errored: errs.length,
        });
      } finally {
        setImporting(false);
        setProgress('');
        e.target.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <FormatoFile cols={[
        { col: 'A', nome: 'Data attività', fmt: 'GG-MM-AAAA o GG/MM/AAAA' },
        { col: 'B', nome: 'Codice cliente', fmt: '8 cifre' },
        { col: 'C', nome: 'Codice operatore', fmt: '3 cifre (es. 042)' },
        { col: 'D', nome: 'Note attività', fmt: 'testo libero' },
        { col: 'E', nome: 'Ore tecniche', fmt: 'numero (es. 8,5)' },
        { col: 'F', nome: 'Ore pagamento', fmt: 'numero (es. 8,5)' },
        { col: 'G', nome: 'Codice bolla', fmt: 'opzionale — deve esistere' },
      ]} nota="Incrementale — i record esistenti (stesso operatore + bolla + mese) vengono aggiornati" />

      <ImportButton importing={importing} progress={progress} onChange={handleFile} />

      {result && <Risultato result={result} entita="consuntivi" />}

      {/* Errori bloccanti (righe ignorate) */}
      {errori.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>
            ❌ {result?.errored || errori.length} righe ignorate (errore bloccante)
          </div>
          {errori.map((w, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#dc2626', marginBottom: '3px' }}>{w}</div>
          ))}
          {result?.errored > 10 && (
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic' }}>
              ...e altri {result.errored - 10} errori
            </div>
          )}
        </div>
      )}

      {/* Warning (righe importate ma con avvisi) */}
      {warnings.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '8px' }}>
            ⚠ {result?.warned || warnings.length} righe importate con avviso
          </div>
          {warnings.map((w, i) => (
            <div key={i} style={{ fontSize: '11px', color: '#92400e', marginBottom: '3px' }}>{w}</div>
          ))}
          {result?.warned > 10 && (
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px', fontStyle: 'italic' }}>
              ...e altri {result.warned - 10} avvisi
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPONENTI CONDIVISI
// ─────────────────────────────────────────────
function FormatoFile({ cols, nota }) {
  return (
    <div style={{ background: '#1e3a5f', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
        Struttura file Excel
      </div>
      {cols.map(r => (
        <div key={r.col} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: '5px', padding: '2px 7px', fontFamily: 'monospace', flexShrink: 0, minWidth: 22, textAlign: 'center' }}>{r.col}</span>
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#fff', flex: 1 }}>{r.nome}</span>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>{r.fmt}</span>
        </div>
      ))}
      {nota && (
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '10px', color: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🔄</span> {nota}
        </div>
      )}
    </div>
  );
}

function ImportButton({ importing, progress, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      {importing ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#0054a6', fontWeight: 600, marginBottom: 6 }}>
            Importazione in corso...
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{progress}</div>
          <div style={{ marginTop: 10, width: 200, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#0054a6', borderRadius: 2, animation: 'pulse 1.5s ease-in-out infinite' }} />
          </div>
        </div>
      ) : (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 28px', borderRadius: '20px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseOver={e => e.currentTarget.style.background = '#dbeafe'}
          onMouseOut={e => e.currentTarget.style.background = '#eff6ff'}>
          ⬆ Scegli file Excel
          <input type="file" accept=".xlsx,.xls" onChange={onChange} style={{ display: 'none' }} />
        </label>
      )}
    </div>
  );
}

function Risultato({ result, entita }) {
  if (result.error) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>❌</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626' }}>Errore importazione</div>
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 2 }}>{result.error}</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontSize: '16px' }}>✅</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>
          Importazione completata — {result.count} {entita} elaborati
        </div>
        {result.warned > 0 && (
          <div style={{ fontSize: '11px', color: '#92400e', marginTop: 2 }}>
            {result.warned} righe importate con avviso (operatore non riconosciuto)
          </div>
        )}
        {result.errored > 0 && (
          <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 2 }}>
            {result.errored} righe ignorate per errore (bolla non valida o data errata)
          </div>
        )}
      </div>
    </div>
  );
}