import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

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
      const { data, error } = await supabase
        .from('consuntivi_globali')
        .select('note_attivita, ore_tecniche, ore_pagamento, codice_bolla, codice_operatore, anno_mese')
        .in('codice_bolla', commessa.bolle)
        .eq('anno_mese', annoMese)
        .order('codice_bolla', { ascending: true });

      if (error) { setRighe([]); setLoading(false); return; }

      const opNorm = String(codiceOperatore).trim();
      const filtered = (data || []).filter(r => String(r.codice_operatore ?? '').trim() === opNorm);
      setRighe(filtered);
      setLoading(false);
    };
    fetchRighe();
  }, [commessa, codiceOperatore, annoMese]);

  const totOre    = righe.reduce((s, r) => s + (parseFloat(r.ore_tecniche)  || 0), 0);
  const totPag    = righe.reduce((s, r) => s + (parseFloat(r.ore_pagamento) || 0), 0);
  const totGiorni = (totOre / 8).toFixed(1);
  const totGiorniPag = (totPag / 8).toFixed(1);
  const efficacia = totOre > 0 ? Math.round((totPag / totOre) * 100) : 0;

  const efficaciaColor = efficacia >= 80 ? 'var(--color-success, #16a34a)'
    : efficacia >= 50 ? 'var(--color-warning, #d97706)'
    : 'var(--color-danger, #dc2626)';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,18,41,0.35)', padding: 20 }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--bg-surface, #fff)',
        borderRadius: 20, width: '100%', maxWidth: 520,
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'hidden',
      }}>

        {/* Header navy */}
        <div style={{ background: 'var(--brand-800, #001d47)', padding: '16px 20px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Breadcrumb cliente · commessa */}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {clienteNome && `${clienteNome} · `}{commessa.nome_commessa}
              </div>
              {/* Nome risorsa */}
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{staffNome}</div>
              {/* Mese */}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>Consuntivi — {meseLabel}</div>
            </div>
            <button onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 16, flexShrink: 0 }}>
              ×
            </button>
          </div>

          {/* KPI — solo se ci sono righe */}
          {!loading && righe.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {/* Giorni totali */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{totGiorni}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Giorni totali</div>
              </div>
              {/* Giorni a pagamento */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: totPag > 0 ? '#FAC775' : 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{totGiorniPag}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Giorni pag.</div>
              </div>
              {/* Efficacia */}
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: efficacia > 0 ? '#fff' : 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{efficacia}%</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>Efficacia</div>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted, #94a3b8)', fontSize: 13 }}>Caricamento...</div>
          )}

          {!loading && righe.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted, #94a3b8)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--border-color, #e2e8f0)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', margin: '0 auto 10px' }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>Nessun consuntivo</div>
              <div style={{ fontSize: 12 }}>Nessuna riga trovata per questo periodo</div>
            </div>
          )}

          {!loading && righe.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {/* Intestazione */}
              <div style={{ display: 'grid', gridTemplateColumns: '64px 1fr 52px 32px', gap: 10, padding: '2px 10px', fontSize: 10, fontWeight: 600, color: 'var(--text-muted, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <div>Bolla</div>
                <div>Attività</div>
                <div style={{ textAlign: 'right' }}>Ore</div>
                <div style={{ textAlign: 'center' }}>Pag.</div>
              </div>

              {righe.map((r, i) => {
                const orePag = parseFloat(r.ore_pagamento) || 0;
                const aPagamento = orePag > 0;
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '64px 1fr 52px 32px',
                    gap: 10, padding: '9px 10px', borderRadius: 10,
                    background: i % 2 === 0 ? 'var(--bg-subtle, #f8fafc)' : 'var(--bg-surface, #fff)',
                    border: '0.5px solid var(--border-subtle, #f1f5f9)',
                    alignItems: 'center',
                  }}>
                    {/* Bolla */}
                    <div style={{ fontSize: 11, color: 'var(--text-secondary, #64748b)', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
                      {r.codice_bolla || '—'}
                    </div>

                    {/* Note attività */}
                    <div style={{ fontSize: 12, color: 'var(--text-primary, #0f172a)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {r.note_attivita || <span style={{ color: 'var(--text-disabled, #cbd5e1)', fontStyle: 'italic' }}>—</span>}
                    </div>

                    {/* Ore tecniche */}
                    <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--brand-700, #0054a6)', fontVariantNumeric: 'tabular-nums' }}>
                      {parseFloat(r.ore_tecniche || 0).toFixed(1)}h
                    </div>

                    {/* Colonna pagamento — € pieno o barrato */}
                    <div style={{ textAlign: 'center' }}>
                      {aPagamento ? (
                        <span title={`${orePag.toFixed(1)}h a pagamento`}
                          style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>€</span>
                      ) : (
                        <span title="Non fatturabile"
                          style={{ fontSize: 14, color: 'var(--text-muted, #94a3b8)', display: 'inline-block', position: 'relative' }}>
                          <span style={{ textDecoration: 'line-through', textDecorationColor: 'var(--text-muted, #94a3b8)', textDecorationThickness: '1.5px' }}>€</span>
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
        <div style={{ padding: '10px 16px', borderTop: '0.5px solid var(--border-subtle, #f1f5f9)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ padding: '7px 20px', borderRadius: 10, border: '0.5px solid var(--border-color, #e2e8f0)', background: 'var(--bg-subtle, #f8fafc)', color: 'var(--text-secondary, #475569)', fontSize: 13, cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}