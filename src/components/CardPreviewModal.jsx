import React from 'react';
import { PRIORITA_COLORS } from '../constants.js';

const fmtDate = (d) => {
  if (!d) return null;
  const [y, m, g] = d.split('-');
  return `${g}/${m}/${y}`;
};

function Row({ label, children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '130px 1fr',
      alignItems: 'flex-start',
      gap: '8px',
      padding: '10px 0',
      borderBottom: '0.5px solid #f1f5f9',
    }}>
      <span style={{
        fontSize: '11px', fontWeight: 600, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: 2,
      }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.4 }}>
        {children}
      </span>
    </div>
  );
}

export function CardPreviewModal({ card, colonnaNome, onClose }) {
  if (!card) return null;

  const pc = card.priorita ? (PRIORITA_COLORS[card.priorita] || null) : null;
  const risorsa = card.assegnata || card.assegnata_a || null;
  const bollaCodice = card.bolla?.codice || card.bolla_codice || null;
  const hasPiano = card.team_sviluppo || risorsa || card.data_inizio_lavori || card.data_fine_lavori || card.data_rilascio;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,18,41,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '20px',
          width: '100%', maxWidth: '480px',
          boxShadow: '0 24px 64px rgba(0,18,41,0.18)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ background: '#001d47', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginBottom: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Richiesta sviluppo</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {card.titolo || '—'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {card.novita_prodotto && <span style={{ fontSize: 16, color: '#fbbf24' }}>★</span>}
            {colonnaNome && (
              <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                {colonnaNome}
              </span>
            )}
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '4px 20px 8px' }}>

          {/* Priorità */}
          {card.priorita && (
            <Row label="Priorità">
              <span style={{ display: 'inline-block', fontSize: '12px', fontWeight: 600, padding: '2px 10px', borderRadius: '20px', background: pc?.bg || '#fefce8', color: pc?.text || '#92400e', border: `1px solid ${pc?.border || '#fcd34d'}`, textTransform: 'capitalize' }}>
                {card.priorita.charAt(0).toUpperCase() + card.priorita.slice(1)}
              </span>
            </Row>
          )}

          {/* Data richiesta */}
          {card.data_richiesta && (
            <Row label="Data richiesta">
              <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '13px', color: '#185FA5', fontWeight: 600 }}>
                {fmtDate(card.data_richiesta)}
              </span>
            </Row>
          )}

          {/* Sezione Pianificazione */}
          {hasPiano && (
            <div style={{ padding: '10px 0', borderBottom: '0.5px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', width: 130, flexShrink: 0 }}>Pianificazione</span>
                <span style={{ fontSize: '11px', fontWeight: 600, background: '#E1F5EE', color: '#085041', border: '0.5px solid #9FE1CB', padding: '2px 8px', borderRadius: 6 }}>
                  📅 Pianificate
                </span>
              </div>

              {(card.team_sviluppo || risorsa) && (
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <span />
                  {card.team_sviluppo && (
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '7px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Team sviluppo</div>
                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{card.team_sviluppo}</div>
                    </div>
                  )}
                  {risorsa && (
                    <div style={{ background: '#f8fafc', borderRadius: 8, padding: '7px 10px' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risorsa</div>
                      <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{risorsa}</div>
                    </div>
                  )}
                </div>
              )}

              {(card.data_fine_lavori || card.data_rilascio) && (
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8 }}>
                  <span />
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '7px 10px' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data rilascio prevista</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', color: '#0F6E56', fontWeight: 600 }}>
                        {fmtDate(card.data_fine_lavori || card.data_rilascio)}
                      </span>
                      {(() => {
                        const rilascio = card.data_fine_lavori || card.data_rilascio;
                        if (!rilascio || !card.data_richiesta) return null;
                        const diff = Math.round((new Date(rilascio) - new Date(card.data_richiesta)) / 86400000);
                        if (diff <= 0) return null;
                        return (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', background: '#fef2f2', border: '0.5px solid #fecaca', borderRadius: 5, padding: '2px 7px', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            ⚠ +{diff}gg
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bolla + Rif. Pratica */}
          {(bollaCodice || card.rif_pratica) && (
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 1fr', gap: 8, padding: '10px 0', borderBottom: '0.5px solid #f1f5f9', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', paddingTop: 2 }}>Bolla / Rif.</span>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bolla</div>
                {bollaCodice
                  ? <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '12px', fontWeight: 600, background: '#E1F5EE', color: '#0F6E56', border: '0.5px solid #9FE1CB', borderRadius: 5, padding: '2px 8px' }}>{bollaCodice}</span>
                  : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rif. Pratica</div>
                {card.rif_pratica
                  ? <span style={{ fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: '12px', color: '#475569' }}>{card.rif_pratica}</span>
                  : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic', marginRight: 'auto' }}>Sola visualizzazione</span>
          <button onClick={onClose} style={{ background: '#001d47', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}