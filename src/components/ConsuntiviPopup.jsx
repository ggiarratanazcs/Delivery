import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

/**
 * PopupConsuntivi
 *
 * Mostra le righe di dettaglio dei consuntivi per una combinazione
 * risorsa / commessa / mese, recuperandole dalla tabella consuntivi_globali.
 *
 * Props:
 *   commessa        — oggetto commessa (con .nome_commessa, .bolle)
 *   staffNome       — "Cognome Nome" della risorsa
 *   codiceOperatore — sObj.codice (string)
 *   annoMese        — "YYYY-MM"
 *   mesiLabel       — label visiva del mese es. "MAG 25"
 *   clienteNome     — nome del cliente
 *   onClose         — callback chiusura
 */
export function PopupConsuntivi({ commessa, staffNome, codiceOperatore, annoMese, meseLabel, clienteNome, onClose }) {
  const [righe, setRighe] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!commessa?.bolle?.length || !codiceOperatore || !annoMese) {
      setLoading(false);
      return;
    }

    const fetchRighe = async () => {
      setLoading(true);
      // Recupera tutte le righe per le bolle della commessa nel mese indicato,
      // senza filtrare codice_operatore nel DB (potrebbe essere int o string).
      // Il filtro per operatore viene applicato in JS dopo.
      const { data, error } = await supabase
        .from('consuntivi_globali')
        .select('note_attivita, ore_tecniche, ore_pagamento, codice_bolla, codice_operatore, anno_mese')
        .in('codice_bolla', commessa.bolle)
        .eq('anno_mese', annoMese)
        .order('codice_bolla', { ascending: true });

      if (error) {
        console.error('ConsuntiviPopup query error:', error);
        setRighe([]);
        setLoading(false);
        return;
      }

      // Confronto flessibile: normalizza entrambi i valori a stringa trimmed
      const opNorm = String(codiceOperatore).trim();
      const filtered = (data || []).filter(r =>
        String(r.codice_operatore ?? '').trim() === opNorm
      );

      setRighe(filtered);
      setLoading(false);
    };

    fetchRighe();
  }, [commessa, codiceOperatore, annoMese]);

  const fmtData = d => {
    if (!d) return '—';
    // Supporta sia "YYYY-MM-DD" che "DD/MM/YYYY"
    if (d.includes('-')) {
      const [y, m, g] = d.split('-');
      return `${g}/${m}/${y}`;
    }
    return d;
  };

  const totOre = righe.reduce((s, r) => s + (parseFloat(r.ore_tecniche) || 0), 0);
  const totGiorni = (totOre / 8).toFixed(1);
  const totPagamento = righe.reduce((s, r) => s + (parseFloat(r.ore_pagamento) || 0), 0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,18,41,0.35)', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 560,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'hidden',
        }}
      >
        {/* Header navy */}
        <div style={{ background: '#001d47', padding: '14px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
                {clienteNome && `${clienteNome} · `}{commessa.nome_commessa}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{staffNome}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>
                Consuntivi — {meseLabel}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 16, flexShrink: 0 }}
            >×</button>
          </div>

          {/* Totali sintetici nell'header */}
          {!loading && righe.length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{totGiorni}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>giorni</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{totOre.toFixed(1)}h</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ore tecniche</div>
              </div>
              {totPagamento > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#FAC775', fontFamily: 'monospace' }}>{totPagamento.toFixed(1)}h</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ore pagamento</div>
                </div>
              )}
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{righe.length}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>righe</div>
              </div>
            </div>
          )}
        </div>

        {/* Body — lista righe */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
              Caricamento...
            </div>
          )}

          {!loading && righe.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 10px' }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Nessun consuntivo</div>
              <div style={{ fontSize: 12, color: '#cbd5e1' }}>Nessuna riga trovata per questo periodo</div>
            </div>
          )}

          {!loading && righe.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Intestazione colonne */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '72px 1fr 52px 28px',
                gap: 10, padding: '4px 10px',
                fontSize: 10, fontWeight: 600, color: '#94a3b8',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <div>Bolla</div>
                <div>Note attività</div>
                <div style={{ textAlign: 'right' }}>Ore</div>
                <div style={{ textAlign: 'center' }}>€</div>
              </div>

              {righe.map((r, i) => {
                const aPagamento = (parseFloat(r.ore_pagamento) || 0) > 0;
                return (
                  <div
                    key={i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '72px 1fr 52px 28px',
                      gap: 10,
                      padding: '9px 10px',
                      borderRadius: 10,
                      background: i % 2 === 0 ? '#f8fafc' : '#fff',
                      border: '0.5px solid #f1f5f9',
                      alignItems: 'center',
                    }}
                  >
                    {/* Data */}
                    <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', fontWeight: 500 }}>
                      {r.codice_bolla || '—'}
                    </div>

                    {/* Note attività */}
                    <div style={{ fontSize: 12, color: '#0f172a', lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {r.note_attivita || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>—</span>}
                    </div>

                    {/* Ore tecniche */}
                    <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#0054a6', fontFamily: 'monospace' }}>
                      {parseFloat(r.ore_tecniche || 0).toFixed(1)}h
                    </div>

                    {/* Simbolo € — pieno se a pagamento, barrato se no */}
                    <div style={{ textAlign: 'center' }}>
                      {aPagamento ? (
                        <span title="Ore a pagamento" style={{ fontSize: 13, color: '#16a34a', fontWeight: 700 }}>€</span>
                      ) : (
                        <span title="Ore non a pagamento" style={{ fontSize: 13, color: '#94a3b8', position: 'relative', display: 'inline-block' }}>
                          <span style={{ textDecoration: 'line-through', textDecorationColor: '#94a3b8' }}>€</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '0.5px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{ padding: '7px 20px', borderRadius: 10, border: '0.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}