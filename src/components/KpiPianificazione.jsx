import React, { useState, useMemo } from 'react';
import { staffKey, staffLabel, workingDays } from '../utils.js';

const mesiIT = { GEN:'01', FEB:'02', MAR:'03', APR:'04', MAG:'05', GIU:'06', LUG:'07', AGO:'08', SET:'09', OTT:'10', NOV:'11', DIC:'12' };

export function KpiPianificazione({ staff, clients, assignments }) {

  const oggi = new Date();

  // 12 mesi da oggi
  const mesi = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(oggi.getFullYear(), oggi.getMonth() + i, 1);
      const label = d.toLocaleString('it-IT', { month: 'short', year: '2-digit' }).toUpperCase().replace('.', '');
      result.push({
        date: d,
        label,
        ym: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    return result;
  }, []);

  // Consulenti (PM + Consulenti)
  const consulenti = useMemo(() =>
    staff.filter(s => ['PM', 'Project Manager', 'Consulente', 'Consulente Applicativo'].includes(s.ruolo)),
  [staff]);

  // Per ogni mese: giorni lavorativi, giorni assegnati totali, residuo medio
  const kpiMensili = useMemo(() => {
    return mesi.map(m => {
      const ggLav = workingDays(m.label);
      const totaleCapacity = ggLav * consulenti.length;

      // Giorni assegnati in quel mese (tutti i consulenti, tutte le commesse)
      let totaleAssegnati = 0;
      clients.forEach(c => {
        c.commesse.forEach(co => {
          co.team.forEach(mem => {
            totaleAssegnati += parseFloat(assignments[`${co.id}-${mem}-${m.label}`] || 0);
          });
        });
      });

      const utilizzo = totaleCapacity > 0 ? Math.round((totaleAssegnati / totaleCapacity) * 100) : 0;
      const residuo = totaleCapacity - totaleAssegnati;

      return { ...m, ggLav, totaleCapacity, totaleAssegnati, utilizzo, residuo };
    });
  }, [mesi, consulenti, clients, assignments]);

  // Per ogni consulente: giorni assegnati per mese
  const kpiPerRisorsa = useMemo(() => {
    return consulenti.map(s => {
      const sName = staffKey(s);
      const mesiData = mesi.map(m => {
        const ggLav = workingDays(m.label);
        const assegnati = clients.reduce((tot, c) =>
          tot + c.commesse.reduce((t2, co) =>
            t2 + (co.team.includes(sName) ? parseFloat(assignments[`${co.id}-${sName}-${m.label}`] || 0) : 0)
          , 0)
        , 0);
        const residuo = ggLav - assegnati;
        const pct = ggLav > 0 ? Math.min(100, Math.round((assegnati / ggLav) * 100)) : 0;
        return { ...m, ggLav, assegnati, residuo, pct };
      });
      return { s, sName, mesiData };
    });
  }, [consulenti, mesi, clients, assignments]);

  const colore = (pct) => {
    if (pct >= 90) return { bg: '#fef2f2', bar: '#E24B4A', text: '#dc2626' };
    if (pct >= 70) return { bg: '#fefce8', bar: '#f59e0b', text: '#92400e' };
    return { bg: '#f0fdf4', bar: '#639922', text: '#3B6D11' };
  };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Riepilogo mensile ── */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#001d47', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Utilizzo team per mese
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
          {kpiMensili.map(m => {
            const c = colore(m.utilizzo);
            return (
              <div key={m.label} style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: c.text, fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums' }}>{m.utilizzo}%</div>
                <div style={{ width: '100%', height: 4, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${m.utilizzo}%`, height: '100%', background: c.bar, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>
                  {m.totaleAssegnati.toFixed(1)}g / {m.totaleCapacity}g
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Dettaglio per risorsa ── */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#001d47', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Occupazione per risorsa
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 160, position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>Risorsa</th>
                {mesi.map(m => (
                  <th key={m.label} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 72 }}>{m.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpiPerRisorsa.map(({ s, sName, mesiData }) => (
                <tr key={sName} style={{ borderBottom: '0.5px solid #f1f5f9' }}
                  onMouseOver={e => e.currentTarget.style.background = '#fafbff'}
                  onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                  <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 500, color: '#0f172a', position: 'sticky', left: 0, background: 'inherit', zIndex: 1 }}>
                    {staffLabel(s)}
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>{s.ruolo}</div>
                  </td>
                  {mesiData.map(md => {
                    const c = colore(md.pct);
                    return (
                      <td key={md.label} style={{ padding: '8px 6px', textAlign: 'center' }}>
                        {md.assegnati > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: c.text }}>{md.assegnati}g</span>
                            <div style={{ width: 36, height: 3, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ width: `${md.pct}%`, height: '100%', background: c.bar, borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 9, color: '#94a3b8' }}>{md.pct}%</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 10, color: '#e2e8f0' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}