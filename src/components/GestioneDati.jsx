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
export function TabClienti() {
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
// ─────────────────────────────────────────────
// TAB BOLLE
// A=codice bolla, B=descrizione, C=codice cliente, D=ore previste
// E=codice documento ordine (opz), F=numero documento (opz),
// G=data documento GG/MM/AAAA (opz), H=importo ordine (opz)
// Se E+F presenti → crea ordine e collega bolla
// ─────────────────────────────────────────────
export function TabBolle() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const parseData = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'number') {
      const p = XLSX.SSF.parse_date_code(raw);
      if (p) return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;
      return null;
    }
    const parts = String(raw).trim().split(/[-/]/);
    if (parts.length === 3) { const [d,m,y] = parts; return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`; }
    return null;
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImporting(true); setResult(null); setWarnings([]);
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
        const rows = data.slice(1).filter(r => r[0]);

        const { data: projects } = await supabase.from('projects').select('id, codice_cliente');
        const projectMap = {};
        (projects || []).forEach(p => { if (p.codice_cliente) projectMap[p.codice_cliente] = p.id; });

        // Tutte le commesse (per ricerca ordini su qualsiasi commessa del cliente)
        const { data: commesse } = await supabase.from('commesse').select('id, client_id');
        // Prima commessa attiva per cliente (fallback creazione ordine)
        const { data: commesseAttive } = await supabase.from('commesse').select('id, client_id').eq('attiva', true);
        const commessaByProject = {};
        (commesseAttive||[]).forEach(co => { if (!commessaByProject[co.client_id]) commessaByProject[co.client_id] = co.id; });

        const bolleRecords = [];
        const ordiniDaCreare = [];
        const warn = [];

        rows.forEach((row, idx) => {
          const rigaNum = idx + 2;
          const codice = String(row[0] || '').trim();
          if (!codice) return;
          const codiceCliente = String(row[2] || '').trim().replace(/\D/g, '').slice(0, 8);
          const orePreviste = parseFloat(String(row[3] || '0').replace(',', '.')) || 0;
          const progettoId = projectMap[codiceCliente] || null;
          const bollaIdx = bolleRecords.length;
          bolleRecords.push({
            codice,
            descrizione: String(row[1] || '').trim() || null,
            codice_cliente: codiceCliente || null,
            ore_previste: orePreviste,
            giorni_disponibili: orePreviste / 8,
            progetto_id: progettoId,
          });
          const codDoc = String(row[4] || '').trim().toUpperCase();
          const numDoc = String(row[5] || '').trim();
          if (codDoc && numDoc) {
            if (!progettoId) warn.push(`Riga ${rigaNum}: cliente "${codiceCliente}" non trovato — ordine non creato`);
            else ordiniDaCreare.push({ bollaIdx, clienteProjectId: progettoId, codDoc, numDoc, dataDoc: parseData(row[6]), importo: parseFloat(String(row[7]||'0').replace(',','.'))||0 });
          }
        });

        // Upsert bolle
        const bolleUpserted = {};
        const chunkSize = 500;
        let importati = 0;
        for (let i = 0; i < bolleRecords.length; i += chunkSize) {
          const { data: up, error } = await supabase.from('bolle_lavoro').upsert(bolleRecords.slice(i, i+chunkSize), { onConflict: 'codice', ignoreDuplicates: false }).select('id, codice');
          if (error) { setResult({ error: error.message }); return; }
          (up||[]).forEach(b => { bolleUpserted[b.codice] = b.id; });
          importati += bolleRecords.slice(i, i+chunkSize).length;
          setProgress(`Bolle: ${importati}/${bolleRecords.length}`);
        }
        // Ricarica per avere tutti gli id
        const { data: bolleDB } = await supabase.from('bolle_lavoro').select('id, codice').in('codice', bolleRecords.map(b=>b.codice));
        (bolleDB||[]).forEach(b => { bolleUpserted[b.codice] = b.id; });

        // Collega bolle agli ordini — logica:
        // 1. Cerca in ordini_cliente su tutte le commesse del cliente → aggancia lì
        // 2. Se non trovato, cerca in ordini_workflow (da assegnare) → aggancia lì
        // 3. Se non trovato da nessuna parte → crea in ordini_workflow come da_assegnare
        let ordiniCreati = 0;
        for (const ord of ordiniDaCreare) {
          const bollaId = bolleUpserted[bolleRecords[ord.bollaIdx].codice];
          if (!bollaId) continue;

          let ordineId = null;
          let commessaId = null;
          let trovato = false;

          // 1. Cerca su tutte le commesse del cliente in ordini_cliente
          const tutteLeCommesse = (commesse||[]).filter(co => co.client_id === ord.clienteProjectId).map(co => co.id);
          if (tutteLeCommesse.length > 0) {
            const { data: ex } = await supabase.from('ordini_cliente')
              .select('id, commessa_id')
              .in('commessa_id', tutteLeCommesse)
              .eq('codice', ord.codDoc)
              .eq('numero', ord.numDoc)
              .limit(1);
            if (ex && ex.length > 0) {
              ordineId = ex[0].id;
              commessaId = ex[0].commessa_id;
              trovato = true;
            }
          }

          // 2. Cerca in ordini_workflow (da assegnare o assegnato)
          if (!trovato) {
            const { data: ow } = await supabase.from('ordini_workflow')
              .select('id')
              .eq('cliente_id', ord.clienteProjectId)
              .eq('codice_documento', ord.codDoc)
              .eq('numero_ordine', ord.numDoc)
              .limit(1);
            if (ow && ow.length > 0) {
              // Aggiorna bolle_ids sull'ordine_workflow
              const owRow = ow[0];
              const { data: owFull } = await supabase.from('ordini_workflow').select('bolle_ids').eq('id', owRow.id).single();
              const bolleIds = [...new Set([...(owFull?.bolle_ids || []), bollaId])];
              await supabase.from('ordini_workflow').update({ bolle_ids: bolleIds }).eq('id', owRow.id);
              await supabase.from('bolle_lavoro').update({ ordine_id: null }).eq('id', bollaId); // nessun ordini_cliente ancora
              trovato = true;
            }
          }

          // 3. Non trovato da nessuna parte → crea in ordini_workflow come da_assegnare
          if (!trovato) {
            const { data: newOw } = await supabase.from('ordini_workflow').insert({
              cliente_id: ord.clienteProjectId,
              codice_documento: ord.codDoc,
              numero_ordine: ord.numDoc,
              data_ordine: ord.dataDoc || null,
              importo: ord.importo || 0,
              bolle_ids: [bollaId],
              stato: 'da_assegnare',
            }).select('id').single();
            if (newOw) ordiniCreati++;
            trovato = true;
          }

          // Se trovato in ordini_cliente, collega bolla all'ordine e alla commessa
          if (ordineId) {
            await supabase.from('bolle_lavoro').update({ ordine_id: ordineId }).eq('id', bollaId);
          }
          if (commessaId && bollaId) {
            await supabase.from('commessa_bolle').upsert(
              { commessa_id: commessaId, bolla_id: bollaId, tipo: 'consulenza' },
              { onConflict: 'commessa_id,bolla_id', ignoreDuplicates: true }
            );
          }
        }

        setWarnings(warn.slice(0,10));
        setResult({ ok: true, count: bolleRecords.length, ordini: ordiniCreati, warned: warn.length });
      } finally { setImporting(false); setProgress(''); e.target.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <FormatoFile cols={[
        { col: 'A', nome: 'Codice bolla', fmt: 'es. 88018' },
        { col: 'B', nome: 'Descrizione', fmt: 'testo libero' },
        { col: 'C', nome: 'Codice cliente', fmt: '8 cifre' },
        { col: 'D', nome: 'Ore previste', fmt: 'numero (es. 40)' },
        { col: 'E', nome: 'Codice documento ordine', fmt: 'opzionale (es. SWOCA)' },
        { col: 'F', nome: 'Numero documento', fmt: 'opzionale (es. 42)' },
        { col: 'G', nome: 'Data documento', fmt: 'opzionale GG/MM/AAAA' },
        { col: 'H', nome: 'Importo ordine €', fmt: 'opzionale (es. 15000)' },
      ]} nota="Se E+F presenti: crea l'ordine collegato. Bolle esistenti aggiornate." />
      <ImportButton importing={importing} progress={progress} onChange={handleFile} />
      {result && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
              {result.count} bolle elaborate{result.ordini > 0 ? ` · ${result.ordini} ordini creati` : ''}
            </div>
            {result.warned > 0 && <div style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>{result.warned} avvisi</div>}
          </div>
        </div>
      )}
      {warnings.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>⚠ Avvisi</div>
          {warnings.map((w,i) => <div key={i} style={{ fontSize: 11, color: '#92400e', marginBottom: 3 }}>{w}</div>)}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// TAB ORDINI
// A=codice cliente (8 cifre), B=codice documento, C=numero documento,
// D=data documento GG/MM/AAAA, E=importo €
// Inserisce sulla prima commessa attiva del cliente
// ─────────────────────────────────────────────
export function TabOrdini() {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState(null);
  const [errori, setErrori] = useState([]);

  const parseData = (raw) => {
    if (!raw) return null;
    if (typeof raw === 'number') {
      const p = XLSX.SSF.parse_date_code(raw);
      if (p) return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;
      return null;
    }
    const parts = String(raw).trim().split(/[-/]/);
    if (parts.length === 3) { const [d,m,y] = parts; return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`; }
    return null;
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setImporting(true); setResult(null); setErrori([]);
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
        const rows = data.slice(1).filter(r => String(r[0]||'').trim());

        // Lookup codice_cliente → project
        const { data: projects } = await supabase.from('projects').select('id, codice_cliente, nome_progetto');
        const projectMap = {};
        (projects||[]).forEach(p => { if (p.codice_cliente) projectMap[p.codice_cliente.trim()] = p; });

        // Tutte le commesse per ricerca in ordini_cliente
        const { data: tutteCommesse } = await supabase.from('commesse').select('id, client_id');
        const commesseByProject = {};
        (tutteCommesse||[]).forEach(co => {
          if (!commesseByProject[co.client_id]) commesseByProject[co.client_id] = [];
          commesseByProject[co.client_id].push(co.id);
        });

        const errs = [];
        let inseriti = 0, aggiornatiCommessa = 0, aggiornatiWorkflow = 0;

        for (let idx = 0; idx < rows.length; idx++) {
          const row = rows[idx];
          const rigaNum = idx + 2;
          setProgress(`Riga ${rigaNum} di ${rows.length}...`);

          const codiceCliente = String(row[0]||'').trim().replace(/\D/g,'').slice(0,8);
          const codDoc  = String(row[1]||'').trim().toUpperCase();
          const numDoc  = String(row[2]||'').trim();
          const dataDoc = parseData(row[3]);
          const importo = parseFloat(String(row[4]||'0').replace(',','.'))||0;

          if (!codiceCliente) { errs.push(`Riga ${rigaNum}: codice cliente mancante`); continue; }
          if (!numDoc)        { errs.push(`Riga ${rigaNum}: numero documento mancante`); continue; }

          const project = projectMap[codiceCliente];
          if (!project) { errs.push(`Riga ${rigaNum}: cliente "${codiceCliente}" non trovato`); continue; }

          // 1. Cerca in ordini_cliente su tutte le commesse del cliente
          const commIds = commesseByProject[project.id] || [];
          let trovato = false;
          if (commIds.length > 0) {
            const { data: exComm } = await supabase.from('ordini_cliente')
              .select('id').in('commessa_id', commIds).eq('numero', numDoc).limit(1);
            if (exComm && exComm.length > 0) {
              await supabase.from('ordini_cliente').update({
                codice: codDoc || null,
                data: dataDoc || null,
                importo: importo || 0,
              }).eq('id', exComm[0].id);
              aggiornatiCommessa++;
              trovato = true;
            }
          }
          if (trovato) continue;

          // 2. Cerca in ordini_workflow
          const { data: exWf } = await supabase.from('ordini_workflow')
            .select('id').eq('cliente_id', project.id).eq('numero_ordine', numDoc).limit(1);
          if (exWf && exWf.length > 0) {
            await supabase.from('ordini_workflow').update({
              codice_documento: codDoc || null,
              data_ordine: dataDoc || null,
              importo: importo || 0,
            }).eq('id', exWf[0].id);
            aggiornatiWorkflow++;
          } else {
            // 3. Non trovato → crea in ordini_workflow come da_assegnare
            const { error } = await supabase.from('ordini_workflow').insert({
              cliente_id: project.id,
              codice_documento: codDoc || null,
              numero_ordine: numDoc,
              data_ordine: dataDoc || null,
              importo: importo || 0,
              stato: 'da_assegnare',
              bolle_ids: [],
            });
            if (error) { errs.push(`Riga ${rigaNum}: ${error.message}`); continue; }
            inseriti++;
          }
        }

        setErrori(errs.slice(0,10));
        setResult({ ok: true, inseriti, aggiornati: aggiornatiCommessa + aggiornatiWorkflow, aggiornatiCommessa, errored: errs.length });
      } finally { setImporting(false); setProgress(''); e.target.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <FormatoFile cols={[
        { col: 'A', nome: 'Codice cliente', fmt: '8 cifre (codice gestionale)' },
        { col: 'B', nome: 'Codice documento', fmt: 'es. SWOCA (opzionale)' },
        { col: 'C', nome: 'Numero documento', fmt: 'es. 42' },
        { col: 'D', nome: 'Data documento', fmt: 'GG/MM/AAAA (opzionale)' },
        { col: 'E', nome: 'Importo €', fmt: 'numero (es. 15000)' },
      ]} nota="Gli ordini vengono messi in 'Da assegnare' nel workflow Ordini e Richieste. Già presenti: aggiornati." />
      <ImportButton importing={importing} progress={progress} onChange={handleFile} />
      {result && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
              {result.inseriti} ordini aggiunti al workflow
              {result.aggiornatiCommessa > 0 && ` · ${result.aggiornatiCommessa} aggiornati in commessa`}
              {(result.aggiornati - (result.aggiornatiCommessa||0)) > 0 && ` · ${result.aggiornati - (result.aggiornatiCommessa||0)} aggiornati nel workflow`}
            </div>
            {result.errored > 0 && <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>{result.errored} errori</div>}
          </div>
        </div>
      )}
      {errori.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6 }}>❌ Errori</div>
          {errori.map((w,i) => <div key={i} style={{ fontSize: 11, color: '#dc2626', marginBottom: 3 }}>{w}</div>)}
        </div>
      )}
    </div>
  );
}

export function TabConsuntivi() {
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