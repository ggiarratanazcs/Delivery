import React, { useState, useMemo, useEffect } from 'react';

// ── Dati finti ────────────────────────────────────────────────────
const BOLLE_MOCK = [
  { id: 'B001', codice: '89876', cliente: 'Savini S.r.l.',    commessa: 'ERP Teseo',
    giorni: 10, importo_ordine: 6000,
    ordine: 'SWOCA 42 14/03/2026', fattura: 'CPFCN 18 10/04/2026', data_fattura: '2026-04-10' },
  { id: 'B002', codice: '89512', cliente: 'Carpineto S.p.A.', commessa: 'Cassiopea CRM',
    giorni: 5, importo_ordine: 2500,
    ordine: 'SWOCA 38 01/02/2026', fattura: 'CPFCN 12 15/03/2026', data_fattura: '2026-03-15' },
  { id: 'B003', codice: '89234', cliente: 'Rossi & Co.',      commessa: 'InfoBusiness BI',
    giorni: 8, importo_ordine: 4800,
    ordine: 'SWOCA 31 10/01/2026', fattura: 'CPFCN 05 01/02/2026', data_fattura: '2026-02-01' },
  { id: 'B004', codice: '90011', cliente: 'Savini S.r.l.',    commessa: 'ERP Teseo',
    giorni: 6, importo_ordine: 3600,
    ordine: 'SWOCA 47 15/04/2026', fattura: 'CPFCN 22 02/05/2026', data_fattura: '2026-05-02' },
  // Ordine presente, fattura NON ancora emessa
  { id: 'B005', codice: '90234', cliente: 'Bianchi Industrie', commessa: 'Teseo Plus',
    giorni: 4, importo_ordine: 2400,
    ordine: 'SWOCA 51 05/05/2026', fattura: null, data_fattura: null },
  // Nessun ordine, nessuna fattura — attività erogate senza documento
  { id: 'B006', codice: '90445', cliente: 'Verdi S.r.l.',     commessa: 'Smarty Cloud',
    giorni: 3, importo_ordine: 0,
    ordine: null, fattura: null, data_fattura: null },
];

const CONSUNTIVI_MOCK = [
  // B001 — regolare
  { bolla: '89876', operatore: 'Giarratana Gabriele', data: '2026-04-10', ore: 8 },
  { bolla: '89876', operatore: 'Giarratana Gabriele', data: '2026-04-11', ore: 8 },
  { bolla: '89876', operatore: 'Antognelli Matteo',   data: '2026-04-14', ore: 4 },
  { bolla: '89876', operatore: 'Giarratana Gabriele', data: '2026-04-15', ore: 8 },
  { bolla: '89876', operatore: 'Antognelli Matteo',   data: '2026-04-22', ore: 8 },
  { bolla: '89876', operatore: 'Giarratana Gabriele', data: '2026-05-05', ore: 8 },
  { bolla: '89876', operatore: 'Antognelli Matteo',   data: '2026-05-06', ore: 8 },
  { bolla: '89876', operatore: 'Giarratana Gabriele', data: '2026-05-12', ore: 4 },
  // B002 — regolare
  { bolla: '89512', operatore: 'Alves Rebehy',        data: '2026-03-15', ore: 8 },
  { bolla: '89512', operatore: 'Alves Rebehy',        data: '2026-03-16', ore: 8 },
  { bolla: '89512', operatore: 'Giarratana Gabriele', data: '2026-03-22', ore: 4 },
  { bolla: '89512', operatore: 'Alves Rebehy',        data: '2026-04-03', ore: 8 },
  { bolla: '89512', operatore: 'Alves Rebehy',        data: '2026-04-04', ore: 8 },
  // B003 — regolare
  { bolla: '89234', operatore: 'Artini Daniele',      data: '2026-02-01', ore: 8 },
  { bolla: '89234', operatore: 'Artini Daniele',      data: '2026-02-03', ore: 8 },
  { bolla: '89234', operatore: 'Artini Daniele',      data: '2026-02-10', ore: 8 },
  { bolla: '89234', operatore: 'Giarratana Gabriele', data: '2026-02-15', ore: 4 },
  { bolla: '89234', operatore: 'Artini Daniele',      data: '2026-03-03', ore: 8 },
  { bolla: '89234', operatore: 'Artini Daniele',      data: '2026-03-10', ore: 8 },
  { bolla: '89234', operatore: 'Artini Daniele',      data: '2026-04-07', ore: 4 },
  // B004 — regolare
  { bolla: '90011', operatore: 'Giarratana Gabriele', data: '2026-05-02', ore: 8 },
  { bolla: '90011', operatore: 'Giarratana Gabriele', data: '2026-05-05', ore: 8 },
  { bolla: '90011', operatore: 'Antognelli Matteo',   data: '2026-05-07', ore: 4 },
  // B005 — ordine sì, fattura NO
  { bolla: '90234', operatore: 'Alves Rebehy',        data: '2026-05-08', ore: 8 },
  { bolla: '90234', operatore: 'Alves Rebehy',        data: '2026-05-09', ore: 4 },
  // B006 — nessun documento
  { bolla: '90445', operatore: 'Artini Daniele',      data: '2026-05-13', ore: 8 },
  { bolla: '90445', operatore: 'Giarratana Gabriele', data: '2026-05-14', ore: 4 },
];

const MESI_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

function fmt(iso) {
  if (!iso) return '—';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function fmtEuro(n) {
  if (!n && n !== 0) return '—';
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);
}
function diffGiorni(iso1, iso2) {
  return Math.round((new Date(iso2) - new Date(iso1)) / 86400000);
}
function diffMesi(iso1, iso2) {
  const d1 = new Date(iso1), d2 = new Date(iso2);
  return (d2.getFullYear()-d1.getFullYear())*12 + (d2.getMonth()-d1.getMonth());
}
function calcolaCompetenza(bolla, consuntivi) {
  const hasFattura = !!bolla.data_fattura;
  const vgOra = bolla.importo_ordine > 0 ? (bolla.importo_ordine / bolla.giorni) / 8 : 0;
  const righe = consuntivi.filter(c => c.bolla === bolla.codice);
  const totOre = righe.reduce((s,r) => s + r.ore, 0);
  const totValore = totOre * vgOra;
  const scostamento = bolla.importo_ordine - totValore;
  const pct = bolla.importo_ordine > 0 ? Math.min(100, Math.round((totValore/bolla.importo_ordine)*100)) : null;
  const perMese = {};
  righe.forEach(r => {
    const mk = r.data.slice(0,7);
    if (!perMese[mk]) perMese[mk] = { ore:0, valore:0 };
    perMese[mk].ore += r.ore;
    perMese[mk].valore += r.ore * vgOra;
  });
  let cum = 0;
  const mesiConCumulo = Object.keys(perMese).sort().map(mk => {
    cum += perMese[mk].valore;
    return { mk, ...perMese[mk], cumValore: cum, scostamento: bolla.importo_ordine - cum };
  });
  return { vgOra, totOre, totValore, scostamento, pct, mesiConCumulo, righe, hasFattura };
}

// ── Stato documento ───────────────────────────────────────────────
function DocBadge({ ordine, fattura }) {
  if (!ordine && !fattura) return <span style={{ fontSize:10, fontWeight:600, color:'#dc2626', background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:20, padding:'2px 8px' }}>Nessun documento</span>;
  if (ordine && !fattura)  return <span style={{ fontSize:10, fontWeight:600, color:'#d97706', background:'#fffbeb', border:'0.5px solid #fde68a', borderRadius:20, padding:'2px 8px' }}>Solo ordine</span>;
  return <span style={{ fontSize:10, fontWeight:600, color:'#16a34a', background:'#f0fdf4', border:'0.5px solid #bbf7d0', borderRadius:20, padding:'2px 8px' }}>Fatturata</span>;
}

function scostColor(gg) {
  if (gg < 0) return { color:'#185FA5', bg:'#eff6ff' };
  if (gg <= 30) return { color:'#16a34a', bg:'#f0fdf4' };
  if (gg <= 90) return { color:'#d97706', bg:'#fffbeb' };
  return { color:'#dc2626', bg:'#fef2f2' };
}

// ── KPI ───────────────────────────────────────────────────────────
function KpiStrip({ righe, bolle }) {
  // Calcola da righe filtrate
  const bolleIds = [...new Set(righe.map(r => r.bolla_cod))];
  const bolleFiltrate = bolle.filter(b => bolleIds.includes(b.codice));

  const totFatturato = bolleFiltrate.filter(b => b.data_fattura).reduce((s,b) => s + b.importo_ordine, 0);
  const totErogato   = bolleFiltrate.filter(b => b.data_fattura).reduce((s,b) => s + calcolaCompetenza(b, CONSUNTIVI_MOCK).totValore, 0);
  const daErogareEuro = Math.max(0, totFatturato - totErogato);
  const daErogareGg   = bolleFiltrate.filter(b => b.data_fattura).reduce((s,b) => {
    const comp = calcolaCompetenza(b, CONSUNTIVI_MOCK);
    return s + Math.max(0, b.giorni - comp.totOre/8);
  }, 0);

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
      {[
        { label:'Totale fatturato',      val: fmtEuro(totFatturato),              color:'#0f172a', bg:'#fff',    border:'#e2e8f0' },
        { label:'Da erogare (€)',        val: fmtEuro(daErogareEuro),             color: daErogareEuro>0?'#16a34a':'#0f172a', bg: daErogareEuro>0?'#f0fdf4':'#fff', border: daErogareEuro>0?'#bbf7d0':'#e2e8f0' },
        { label:'Da erogare (giorni)',   val: `${daErogareGg.toFixed(1)} gg`,     color:'#854F0B', bg:'#fffbeb', border:'#fde68a' },
      ].map(k => (
        <div key={k.label} style={{ background:k.bg, border:`1px solid ${k.border}`, borderRadius:12, padding:'14px 18px' }}>
          <div style={{ fontSize:22, fontWeight:600, color:k.color, fontVariantNumeric:'tabular-nums', marginBottom:4 }}>{k.val}</div>
          <div style={{ fontSize:11, color:'#64748b' }}>{k.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Tab Commesse ──────────────────────────────────────────────────
function TabCommesse({ bolle, onSelectBolla }) {
  return (
    <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:14, overflow:'hidden' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
            {['Bolla','Cliente · Commessa','Stato doc.','Ordine','Fattura','Gg','Val/gg','Fatturato','Erogato','Scostamento','Avanz.',''].map(h=>(
              <th key={h} style={{ padding:'10px 11px', textAlign:['Gg','Val/gg','Fatturato','Erogato','Scostamento','Avanz.'].includes(h)?'right':'left', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', whiteSpace:'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bolle.map((b,i) => {
            const comp = calcolaCompetenza(b, CONSUNTIVI_MOCK);
            const barColor = comp.pct===null?'#e2e8f0' : comp.pct>=100?'#16a34a' : comp.pct>=60?'#d97706' : '#185FA5';
            const vgDay = b.importo_ordine>0 ? b.importo_ordine/b.giorni : null;
            return (
              <tr key={b.id} onClick={()=>onSelectBolla(b)}
                style={{ borderBottom:'0.5px solid #f1f5f9', cursor:'pointer' }}
                onMouseOver={e=>e.currentTarget.style.background='#f8fafc'}
                onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'11px 11px', fontWeight:700, color:'#001d47', fontFamily:'monospace' }}>{b.codice}</td>
                <td style={{ padding:'11px 11px' }}>
                  <div style={{ fontSize:13, fontWeight:500, color:'#0f172a' }}>{b.cliente}</div>
                  <div style={{ fontSize:11, color:'#94a3b8' }}>{b.commessa}</div>
                </td>
                <td style={{ padding:'11px 11px' }}><DocBadge ordine={b.ordine} fattura={b.fattura} /></td>
                <td style={{ padding:'11px 11px', fontSize:11, color: b.ordine?'#0f172a':'#cbd5e1', whiteSpace:'nowrap' }}>{b.ordine||'—'}</td>
                <td style={{ padding:'11px 11px', fontSize:11, color: b.fattura?'#475569':'#cbd5e1', whiteSpace:'nowrap' }}>
                  <div>{b.fattura||'—'}</div>
                  {b.data_fattura && <div style={{ fontSize:10, color:'#94a3b8' }}>{fmt(b.data_fattura)}</div>}
                </td>
                <td style={{ padding:'11px 11px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums' }}>{b.giorni}</td>
                <td style={{ padding:'11px 11px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums' }}>{vgDay?fmtEuro(vgDay):'—'}</td>
                <td style={{ padding:'11px 11px', textAlign:'right', fontWeight:500, color: b.importo_ordine?'#0f172a':'#cbd5e1', fontVariantNumeric:'tabular-nums' }}>{b.importo_ordine?fmtEuro(b.importo_ordine):'—'}</td>
                <td style={{ padding:'11px 11px', textAlign:'right', fontWeight:500, color:'#185FA5', fontVariantNumeric:'tabular-nums' }}>{b.importo_ordine?fmtEuro(comp.totValore):`${comp.totOre}h`}</td>
                <td style={{ padding:'11px 11px', textAlign:'right', fontWeight:600, fontVariantNumeric:'tabular-nums', color: comp.scostamento>0?'#16a34a':'#dc2626' }}>
                  {b.importo_ordine ? (comp.scostamento>0?'+':'')+fmtEuro(comp.scostamento) : '—'}
                </td>
                <td style={{ padding:'11px 11px', textAlign:'right' }}>
                  {comp.pct!==null ? (
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                      <span style={{ fontSize:11, fontWeight:700, color:barColor }}>{comp.pct}%</span>
                      <div style={{ width:52, height:4, background:'#e2e8f0', borderRadius:2 }}>
                        <div style={{ width:`${comp.pct}%`, height:'100%', background:barColor, borderRadius:2 }} />
                      </div>
                    </div>
                  ) : <span style={{ fontSize:11, color:'#cbd5e1' }}>—</span>}
                </td>
                <td style={{ padding:'11px 11px' }}><i className="ti ti-chevron-right" style={{ fontSize:13, color:'#cbd5e1' }} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab Dettaglio ─────────────────────────────────────────────────
function TabDettaglio({ bolle, onRigheChange }) {
  const [filterBolla,   setFilterBolla]   = useState('');
  const [filterOrdine,  setFilterOrdine]  = useState('');
  const [filterFattura, setFilterFattura] = useState('');

  const bolleList   = bolle.map(b=>b.codice);
  const ordiniList  = [...new Set(bolle.map(b=>b.ordine).filter(Boolean))];
  const fattureList = [...new Set(bolle.map(b=>b.fattura).filter(Boolean))];

  const righe = useMemo(() => {
    const result = [];
    bolle.forEach(b => {
      if (filterBolla   && b.codice  !== filterBolla)   return;
      if (filterOrdine  && b.ordine  !== filterOrdine)   return;
      if (filterFattura && b.fattura !== filterFattura)  return;
      const vgOra = b.importo_ordine>0 ? (b.importo_ordine/b.giorni)/8 : null;
      CONSUNTIVI_MOCK.filter(c=>c.bolla===b.codice).forEach(c => {
        const scostGiorni = b.data_fattura ? diffGiorni(b.data_fattura, c.data) : null;
        const scostMesi   = b.data_fattura ? diffMesi(b.data_fattura, c.data)   : null;
        result.push({ ...c, bolla_cod:b.codice, ordine:b.ordine, fattura:b.fattura, data_fattura:b.data_fattura,
          importo_bolla:b.importo_ordine, valore: vgOra ? c.ore*vgOra : null, scostGiorni, scostMesi });
      });
    });
    return result.sort((a,b)=>a.data.localeCompare(b.data));
  }, [bolle, filterBolla, filterOrdine, filterFattura]);

  // Notifica parent per aggiornare KPI
  useEffect(() => { onRigheChange(righe); }, [righe]);

  const totOre    = righe.reduce((s,r)=>s+r.ore, 0);
  const totValore = righe.reduce((s,r)=>s+(r.valore||0), 0);

  const selStyle = { padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:12, outline:'none', fontFamily:'inherit', background:'#fff', color:'#0f172a' };

  return (
    <div>
      {/* Filtri */}
      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filterBolla} onChange={e=>setFilterBolla(e.target.value)} style={selStyle}>
          <option value=''>Tutte le bolle</option>
          {bolleList.map(b=><option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filterOrdine} onChange={e=>setFilterOrdine(e.target.value)} style={selStyle}>
          <option value=''>Tutti gli ordini</option>
          {ordiniList.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
        <select value={filterFattura} onChange={e=>setFilterFattura(e.target.value)} style={selStyle}>
          <option value=''>Tutte le fatture</option>
          {fattureList.map(f=><option key={f} value={f}>{f}</option>)}
        </select>
        {(filterBolla||filterOrdine||filterFattura) && (
          <button onClick={()=>{setFilterBolla('');setFilterOrdine('');setFilterFattura('');}}
            style={{ fontSize:12, padding:'5px 12px', borderRadius:8, border:'0.5px solid #e2e8f0', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>
            Reset filtri
          </button>
        )}
        <div style={{ marginLeft:'auto', display:'flex', gap:16, alignItems:'center' }}>
          <span style={{ fontSize:12, color:'#64748b' }}>Righe: <strong>{righe.length}</strong></span>
          <span style={{ fontSize:12, color:'#64748b' }}>Ore: <strong>{totOre}h</strong></span>
          {totValore>0 && <span style={{ fontSize:12, color:'#185FA5', fontWeight:600 }}>Valore: <strong>{fmtEuro(totValore)}</strong></span>}
        </div>
      </div>

      <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:14, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                {['Operatore','Data att.','Bolla','Ordine','Fattura','Data fatt.','Ore','Valore','Valore bolla','Scost. (gg)','Scost. (mesi)'].map(h=>(
                  <th key={h} style={{ padding:'9px 10px', textAlign:['Ore','Valore','Valore bolla','Scost. (gg)','Scost. (mesi)'].includes(h)?'right':'left', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.04em', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {righe.map((r,i)=>{
                const sc = r.scostGiorni!==null ? scostColor(r.scostGiorni) : null;
                return (
                  <tr key={i} style={{ borderBottom:'0.5px solid #f1f5f9' }}
                    onMouseOver={e=>e.currentTarget.style.background='#f8fafc'}
                    onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'8px 10px', color:'#0f172a', fontWeight:500, whiteSpace:'nowrap' }}>{r.operatore}</td>
                    <td style={{ padding:'8px 10px', color:'#475569', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{fmt(r.data)}</td>
                    <td style={{ padding:'8px 10px', color:'#001d47', fontWeight:700, fontFamily:'monospace' }}>{r.bolla_cod}</td>
                    <td style={{ padding:'8px 10px', fontSize:11, color:r.ordine?'#0f172a':'#cbd5e1', whiteSpace:'nowrap' }}>{r.ordine||'—'}</td>
                    <td style={{ padding:'8px 10px', fontSize:11, color:r.fattura?'#475569':'#cbd5e1', whiteSpace:'nowrap' }}>{r.fattura||'—'}</td>
                    <td style={{ padding:'8px 10px', color:'#64748b', whiteSpace:'nowrap', fontVariantNumeric:'tabular-nums' }}>{fmt(r.data_fattura)}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums' }}>{r.ore}h</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:600, color:r.valore?'#185FA5':'#cbd5e1', fontVariantNumeric:'tabular-nums' }}>{r.valore?fmtEuro(r.valore):'—'}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right', color:r.importo_bolla?'#0f172a':'#cbd5e1', fontVariantNumeric:'tabular-nums' }}>{r.importo_bolla?fmtEuro(r.importo_bolla):'—'}</td>
                    <td style={{ padding:'8px 10px', textAlign:'right' }}>
                      {sc ? <span style={{ fontSize:11, fontWeight:600, color:sc.color, background:sc.bg, borderRadius:20, padding:'2px 8px', whiteSpace:'nowrap' }}>{r.scostGiorni>=0?'+':''}{r.scostGiorni}gg</span>
                           : <span style={{ fontSize:11, color:'#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ padding:'8px 10px', textAlign:'right' }}>
                      {sc ? <span style={{ fontSize:11, fontWeight:600, color:sc.color, background:sc.bg, borderRadius:20, padding:'2px 8px' }}>{r.scostMesi>=0?'+':''}{r.scostMesi}m</span>
                           : <span style={{ fontSize:11, color:'#cbd5e1' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background:'#f8fafc', borderTop:'1px solid #e2e8f0' }}>
                <td colSpan={6} style={{ padding:'8px 10px', fontSize:11, fontWeight:600, color:'#64748b' }}>Totale ({righe.length} righe)</td>
                <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:700, color:'#0f172a', fontVariantNumeric:'tabular-nums' }}>{totOre}h</td>
                <td style={{ padding:'8px 10px', textAlign:'right', fontWeight:700, color:'#185FA5', fontVariantNumeric:'tabular-nums' }}>{totValore>0?fmtEuro(totValore):'—'}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, marginTop:10, flexWrap:'wrap', alignItems:'center' }}>
        <span style={{ fontSize:11, color:'#64748b' }}>Scostamento:</span>
        {[{label:'Ante fattura',color:'#185FA5',bg:'#eff6ff'},{label:'0-30gg',color:'#16a34a',bg:'#f0fdf4'},{label:'31-90gg',color:'#d97706',bg:'#fffbeb'},{label:'>90gg',color:'#dc2626',bg:'#fef2f2'}].map(l=>(
          <span key={l.label} style={{ fontSize:11, fontWeight:600, color:l.color, background:l.bg, borderRadius:20, padding:'2px 10px' }}>{l.label}</span>
        ))}
      </div>
    </div>
  );
}

// ── Modale dettaglio bolla ─────────────────────────────────────────
function BollaDetail({ bolla, onClose }) {
  const comp = useMemo(()=>calcolaCompetenza(bolla, CONSUNTIVI_MOCK),[bolla]);
  const [showRighe, setShowRighe] = useState(false);
  const barColor = comp.pct===null?'#94a3b8':comp.pct>=100?'#16a34a':comp.pct>=60?'#d97706':'#185FA5';

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9900, background:'rgba(0,18,41,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:720, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.2)' }}>
        <div style={{ background:'#001d47', padding:'18px 24px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:4 }}>{bolla.cliente} · {bolla.commessa}</div>
              <div style={{ fontSize:17, fontWeight:700, color:'#fff', fontFamily:'monospace' }}>{bolla.codice}</div>
              <div style={{ display:'flex', gap:14, marginTop:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:12, color: bolla.ordine?'rgba(255,255,255,0.65)':'rgba(255,255,255,0.3)' }}>📋 {bolla.ordine||'Ordine non presente'}</span>
                <span style={{ fontSize:12, color: bolla.fattura?'rgba(255,255,255,0.65)':'rgba(255,255,255,0.3)' }}>🧾 {bolla.fattura||'Fattura non emessa'}{bolla.data_fattura&&` · ${fmt(bolla.data_fattura)}`}</span>
                {bolla.importo_ordine>0 && <span style={{ fontSize:12, color:'rgba(255,255,255,0.55)' }}>{bolla.giorni}gg · {fmtEuro(bolla.importo_ordine/bolla.giorni)}/gg</span>}
              </div>
            </div>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.12)', border:'none', borderRadius:8, color:'#fff', cursor:'pointer', padding:'6px 10px', fontSize:18 }}>×</button>
          </div>
          {bolla.importo_ordine>0 && (
            <>
              <div style={{ display:'flex', gap:10, marginTop:14 }}>
                {[{label:'Fatturato',val:fmtEuro(bolla.importo_ordine),color:'#fff'},{label:'Erogato',val:fmtEuro(comp.totValore),color:'#FAC775'},{label:'Da erogare',val:fmtEuro(comp.scostamento),color:comp.scostamento>0?'#86efac':'#fca5a5'},{label:'Avanzamento',val:`${comp.pct}%`,color:'#fff'}].map(k=>(
                  <div key={k.label} style={{ flex:1, background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'8px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:15, fontWeight:700, color:k.color, fontVariantNumeric:'tabular-nums' }}>{k.val}</div>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'.06em', marginTop:2 }}>{k.label}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, height:5, background:'rgba(255,255,255,0.15)', borderRadius:3 }}>
                <div style={{ width:`${comp.pct}%`, height:'100%', background:barColor, borderRadius:3 }} />
              </div>
            </>
          )}
          {!bolla.importo_ordine && (
            <div style={{ marginTop:12, padding:'8px 12px', background:'rgba(255,255,255,0.08)', borderRadius:10 }}>
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.6)' }}>Attività erogate senza documento collegato — {comp.totOre}h totali</span>
            </div>
          )}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {comp.mesiConCumulo.length > 0 && bolla.importo_ordine > 0 && (
            <>
              <div style={{ fontSize:12, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Competenza per mese</div>
              <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:20, fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#f8fafc' }}>
                    {['Mese','Ore','Giorni','Valore periodo','Cumulativo','Da erogare'].map(h=>(
                      <th key={h} style={{ padding:'8px 12px', textAlign:h==='Mese'?'left':'right', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comp.mesiConCumulo.map((m,i)=>{
                    const [y,mo]=m.mk.split('-');
                    const isLast=i===comp.mesiConCumulo.length-1;
                    return (
                      <tr key={m.mk} style={{ borderBottom:'0.5px solid #f1f5f9', background:isLast?'#f0fdf4':'transparent' }}>
                        <td style={{ padding:'10px 12px', fontWeight:500, color:'#0f172a' }}>{MESI_IT[Number(mo)-1]} {y.slice(2)}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums' }}>{m.ore}h</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums' }}>{(m.ore/8).toFixed(1)}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:500, color:'#0f172a', fontVariantNumeric:'tabular-nums' }}>{fmtEuro(m.valore)}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:600, color:'#185FA5', fontVariantNumeric:'tabular-nums' }}>{fmtEuro(m.cumValore)}</td>
                        <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:600, fontVariantNumeric:'tabular-nums', color:m.scostamento>0?'#16a34a':'#dc2626' }}>{fmtEuro(m.scostamento)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}

          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, cursor:'pointer' }} onClick={()=>setShowRighe(v=>!v)}>
            <div style={{ fontSize:12, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em' }}>Righe consuntivo ({comp.righe.length})</div>
            <i className={`ti ti-chevron-${showRighe?'up':'down'}`} style={{ fontSize:13, color:'#94a3b8' }} />
          </div>
          {showRighe && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ background:'#f8fafc' }}>
                  {['Data','Operatore','Ore','Valore'].map(h=>(
                    <th key={h} style={{ padding:'7px 10px', textAlign:h==='Data'||h==='Operatore'?'left':'right', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comp.righe.sort((a,b)=>a.data.localeCompare(b.data)).map((r,i)=>(
                  <tr key={i} style={{ borderBottom:'0.5px solid #f8fafc' }}>
                    <td style={{ padding:'7px 10px', color:'#475569', fontVariantNumeric:'tabular-nums' }}>{fmt(r.data)}</td>
                    <td style={{ padding:'7px 10px', color:'#0f172a' }}>{r.operatore}</td>
                    <td style={{ padding:'7px 10px', textAlign:'right', color:'#475569', fontVariantNumeric:'tabular-nums' }}>{r.ore}h</td>
                    <td style={{ padding:'7px 10px', textAlign:'right', color:comp.vgOra?'#185FA5':'#cbd5e1', fontWeight:500, fontVariantNumeric:'tabular-nums' }}>{comp.vgOra?fmtEuro(r.ore*comp.vgOra):'—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vista principale ───────────────────────────────────────────────


// ── SVG Bar Chart nativo (no dipendenze esterne) ──────────────────
function SvgBarChart({ data, hasNessunDoc }) {
  const [tooltip, setTooltip] = useState(null);
  const fe = (v) => new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR', minimumFractionDigits:0 }).format(v);

  const W = 760, H = 260, padL = 56, padR = 16, padT = 12, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const keys = ['fatturato','ordine','consuntivo', ...(hasNessunDoc ? ['nessunDoc'] : [])];
  const colors = { fatturato:'#001d47', ordine:'#185FA5', consuntivo:'#FAC775', nessunDoc:'#e2e8f0' };

  const maxVal = Math.max(...data.flatMap(d => keys.map(k => d[k] || 0)), 1);
  const niceMax = Math.ceil(maxVal / 1000) * 1000;
  const nTicks = 4;
  const ticks = Array.from({ length: nTicks + 1 }, (_, i) => Math.round((niceMax / nTicks) * i));

  const groupW = chartW / data.length;
  const barPad = groupW * 0.15;
  const barW = Math.min(32, (groupW - barPad * 2) / keys.length - 2);

  return (
    <div style={{ position:'relative', width:'100%', overflowX:'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', fontFamily:'inherit' }}>
        {/* Grid lines */}
        {ticks.map(t => {
          const y = padT + chartH - (t / niceMax) * chartH;
          return (
            <g key={t}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                {t >= 1000 ? `€${t/1000}k` : `€${t}`}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, gi) => {
          const gx = padL + gi * groupW;
          return (
            <g key={d.label}>
              {keys.map((k, ki) => {
                const val = d[k] || 0;
                if (val === 0) return null;
                const bh = (val / niceMax) * chartH;
                const x = gx + barPad + ki * (barW + 2);
                const y = padT + chartH - bh;
                return (
                  <rect key={k} x={x} y={y} width={barW} height={bh}
                    fill={colors[k]} rx="3"
                    style={{ cursor:'pointer', opacity: tooltip?.gi===gi && tooltip?.k===k ? 0.8 : 1 }}
                    onMouseEnter={(e) => setTooltip({ gi, k, val, label: d.label, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)} />
                );
              })}
              {/* X label */}
              <text x={gx + groupW / 2} y={H - padB + 16} textAnchor="middle" fontSize="11" fill="#94a3b8">{d.label}</text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div style={{ position:'fixed', top: tooltip.y - 60, left: tooltip.x + 10, background:'#fff', border:'1px solid #e2e8f0', borderRadius:8, padding:'8px 12px', fontSize:12, pointerEvents:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)', zIndex:100 }}>
          <div style={{ fontWeight:700, color:'#0f172a', marginBottom:4 }}>{tooltip.label}</div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ width:10, height:10, borderRadius:2, background:colors[tooltip.k], display:'inline-block' }} />
            <span style={{ color:'#475569' }}>{tooltip.k}:</span>
            <span style={{ fontWeight:600 }}>{fe(tooltip.val)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab Grafici ───────────────────────────────────────────────────
const CHART_COLORS = {
  fattura:    '#001d47',
  ordine:     '#185FA5',
  consuntivo: '#FAC775',
  nessuno:    '#e2e8f0',
};

function TabGrafici({ bolle }) {
  const [filterBolla,   setFilterBolla]   = useState('');
  const [filterOrdine,  setFilterOrdine]  = useState('');
  const [filterFattura, setFilterFattura] = useState('');
  const MESI_G = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
  const fe = (v) => new Intl.NumberFormat('it-IT', { style:'currency', currency:'EUR', minimumFractionDigits:0 }).format(v);

  const bolleList   = bolle.map(b => b.codice);
  const ordiniList  = [...new Set(bolle.map(b => b.ordine).filter(Boolean))];
  const fattureList = [...new Set(bolle.map(b => b.fattura).filter(Boolean))];

  const bolleFiltrate = useMemo(() => bolle.filter(b => {
    if (filterBolla   && b.codice  !== filterBolla)   return false;
    if (filterOrdine  && b.ordine  !== filterOrdine)   return false;
    if (filterFattura && b.fattura !== filterFattura)  return false;
    return true;
  }), [bolle, filterBolla, filterOrdine, filterFattura]);

  const chartData = useMemo(() => {
    const mesiMap = {};
    const add = (mk, key, val) => {
      if (!mesiMap[mk]) mesiMap[mk] = { mese:mk, fatturato:0, ordine:0, consuntivo:0, nessunDoc:0 };
      mesiMap[mk][key] = (mesiMap[mk][key]||0) + val;
    };
    bolleFiltrate.forEach(b => {
      const vgOra = b.importo_ordine > 0 ? (b.importo_ordine / b.giorni) / 8 : 0;
      if (b.data_fattura && b.importo_ordine > 0) add(b.data_fattura.slice(0,7), 'fatturato', b.importo_ordine);
      if (b.ordine && b.importo_ordine > 0) {
        const parts = b.ordine.split(' ');
        const dp = parts[parts.length-1];
        const segs = dp.split('/');
        if (segs.length === 3) add(`${segs[2]}-${segs[1]}`, 'ordine', b.importo_ordine);
      }
      CONSUNTIVI_MOCK.filter(c => c.bolla === b.codice).forEach(c => {
        if (vgOra > 0) add(c.data.slice(0,7), 'consuntivo', c.ore * vgOra);
        else add(c.data.slice(0,7), 'nessunDoc', c.ore);
      });
    });
    return Object.keys(mesiMap).sort().map(mk => {
      const [y, mo] = mk.split('-');
      return { ...mesiMap[mk], label: `${MESI_G[Number(mo)-1]} ${y.slice(2)}` };
    });
  }, [bolleFiltrate]);

  const hasNessunDoc = bolleFiltrate.some(b => !b.importo_ordine);
  const sel = { padding:'6px 10px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:12, outline:'none', fontFamily:'inherit', background:'#fff', color:'#0f172a' };
  const fmtS = (v) => v >= 1000 ? `€${(v/1000).toFixed(1)}k` : `€${Math.round(v)}`;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        <select value={filterBolla}   onChange={e=>setFilterBolla(e.target.value)}   style={sel}><option value=''>Tutte le bolle</option>{bolleList.map(b=><option key={b} value={b}>{b}</option>)}</select>
        <select value={filterOrdine}  onChange={e=>setFilterOrdine(e.target.value)}  style={sel}><option value=''>Tutti gli ordini</option>{ordiniList.map(o=><option key={o} value={o}>{o}</option>)}</select>
        <select value={filterFattura} onChange={e=>setFilterFattura(e.target.value)} style={sel}><option value=''>Tutte le fatture</option>{fattureList.map(f=><option key={f} value={f}>{f}</option>)}</select>
        {(filterBolla||filterOrdine||filterFattura) && <button onClick={()=>{setFilterBolla('');setFilterOrdine('');setFilterFattura('');}} style={{ fontSize:12, padding:'5px 12px', borderRadius:8, border:'0.5px solid #e2e8f0', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>Reset</button>}
      </div>

      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
        {[{c:CHART_COLORS.fattura,l:'Fatturato'},{c:CHART_COLORS.ordine,l:'Ordine'},{c:CHART_COLORS.consuntivo,l:'Erogato competenza'}, ...(hasNessunDoc?[{c:CHART_COLORS.nessuno,l:'Senza doc.'}]:[])].map(x=>(
          <div key={x.l} style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:12, height:12, borderRadius:2, background:x.c, flexShrink:0 }} />
            <span style={{ fontSize:12, color:'#475569' }}>{x.l}</span>
          </div>
        ))}
      </div>

      <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:14, padding:'20px 16px 12px' }}>
        <div style={{ fontSize:12, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:16 }}>Valore per mese</div>
        {chartData.length === 0
          ? <div style={{ height:240, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:13 }}>Nessun dato</div>
          : <SvgBarChart data={chartData} hasNessunDoc={hasNessunDoc} />
        }
      </div>

      <div style={{ background:'#fff', border:'0.5px solid #e2e8f0', borderRadius:14, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead><tr style={{ background:'#f8fafc' }}>
            {['Mese','Fatturato','Ordine','Erogato','Scostamento'].map(h=>(
              <th key={h} style={{ padding:'8px 14px', textAlign:h==='Mese'?'left':'right', fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.05em', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {chartData.map((row,i) => {
              const sc = (row.fatturato||0) - (row.consuntivo||0);
              return (
                <tr key={i} style={{ borderBottom:'0.5px solid #f1f5f9' }}
                  onMouseOver={e=>e.currentTarget.style.background='#f8fafc'}
                  onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'8px 14px', fontWeight:500, color:'#0f172a' }}>{row.label}</td>
                  <td style={{ padding:'8px 14px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:row.fatturato?'#001d47':'#cbd5e1', fontWeight:row.fatturato?600:400 }}>{row.fatturato?fe(row.fatturato):'—'}</td>
                  <td style={{ padding:'8px 14px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:row.ordine?'#185FA5':'#cbd5e1', fontWeight:row.ordine?600:400 }}>{row.ordine?fe(row.ordine):'—'}</td>
                  <td style={{ padding:'8px 14px', textAlign:'right', fontVariantNumeric:'tabular-nums', color:row.consuntivo?'#854F0B':'#cbd5e1', fontWeight:row.consuntivo?600:400 }}>{row.consuntivo?fe(row.consuntivo):'—'}</td>
                  <td style={{ padding:'8px 14px', textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600, color:!row.fatturato?'#cbd5e1':sc>0?'#16a34a':sc<0?'#dc2626':'#475569' }}>{row.fatturato?(sc>=0?'+':'')+fe(sc):'—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CompetenzaView({ currentStaff }) {
  const [activeTab, setActiveTab]           = useState('commesse');
  const [filterCliente, setFilterCliente]   = useState('');
  const [selectedBolla, setSelectedBolla]   = useState(null);
  const [righeDettaglio, setRigheDettaglio] = useState([]);

  const email  = currentStaff?.email || '';
  const codice = String(currentStaff?.codice || '');
  const isAuthorized = email === 'g.giarratana@zcscompany.com' || codice === '845';

  const clienti       = useMemo(() => [...new Set(BOLLE_MOCK.map(b => b.cliente))], []);
  const bolleFiltrate = useMemo(() => BOLLE_MOCK.filter(b => !filterCliente || b.cliente === filterCliente), [filterCliente]);

  const kpiRighe = useMemo(() => {
    if (activeTab === 'dettaglio') return righeDettaglio;
    const result = [];
    bolleFiltrate.forEach(b => { CONSUNTIVI_MOCK.filter(c => c.bolla === b.codice).forEach(c => result.push({ ...c, bolla_cod: b.codice })); });
    return result;
  }, [activeTab, righeDettaglio, bolleFiltrate]);

  if (!isAuthorized) return null;

  return (
    <div style={{ flex:1, overflow:'auto', background:'#f1f5f9' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'24px 24px' }}>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <div style={{ fontSize:20, fontWeight:600, color:'#0f172a' }}>Piano Fatturazione</div>
          <span style={{ fontSize:11, fontWeight:600, color:'#854F0B', background:'#FAEEDA', border:'0.5px solid #FDE68A', borderRadius:20, padding:'2px 10px' }}>Demo — dati finti</span>
        </div>
        <div style={{ fontSize:13, color:'#64748b', marginBottom:20 }}>Scostamento tra fatturato e valore erogato per competenza.</div>

        <KpiStrip righe={kpiRighe} bolle={BOLLE_MOCK} />

        {/* Filtro cliente */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          {['', ...clienti].map(c=>(
            <button key={c||'__all'} onClick={()=>setFilterCliente(c)}
              style={{ fontSize:12, padding:'4px 14px', borderRadius:20, border:`1.5px solid ${filterCliente===c?'#001d47':'#e2e8f0'}`, background:filterCliente===c?'#001d47':'#fff', color:filterCliente===c?'#fff':'#475569', cursor:'pointer', fontFamily:'inherit' }}>
              {c||'Tutti'}
            </button>
          ))}
        </div>

        {/* Tab nav */}
        <div style={{ display:'flex', borderBottom:'1px solid #e2e8f0', marginBottom:16 }}>
          {[{key:'commesse',label:'Commesse'},{key:'dettaglio',label:'Dettaglio consuntivi'},{key:'grafici',label:'Grafici'}].map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key)}
              style={{ padding:'8px 20px', border:'none', borderBottom:activeTab===t.key?'2.5px solid #001d47':'2.5px solid transparent', background:'transparent', color:activeTab===t.key?'#001d47':'#64748b', fontWeight:activeTab===t.key?600:400, fontSize:13, cursor:'pointer', fontFamily:'inherit', marginBottom:-1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab==='commesse' && <TabCommesse bolle={bolleFiltrate} onSelectBolla={setSelectedBolla} />}
        {activeTab==='dettaglio' && <TabDettaglio bolle={bolleFiltrate} onRigheChange={setRigheDettaglio} />}
        {activeTab==='grafici' && <TabGrafici bolle={bolleFiltrate} />}

        <div style={{ marginTop:12, fontSize:11, color:'#94a3b8', textAlign:'center', fontStyle:'italic' }}>
          Dati dimostrativi — la versione definitiva leggerà da Supabase
        </div>
      </div>

      {selectedBolla && <BollaDetail bolla={selectedBolla} onClose={()=>setSelectedBolla(null)} />}
    </div>
  );
}