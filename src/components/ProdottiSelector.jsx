import React from 'react';
import { PRODOTTI_CATALOGO, CATEGORIA_COLORS } from '../constants.js';

// ─── Selezione prodotti per categoria (edit mode) ───
export function ProdottiSelector({ prodotti, onChange }) {
  const categorie = ['ERP', 'CRM', 'BI', 'Verticali'];
  const toggle = (id) =>
    onChange(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {categorie.map(cat => {
        const col = CATEGORIA_COLORS[cat];
        const prodsCat = PRODOTTI_CATALOGO.filter(p => p.categoria === cat);
        return (
          <div key={cat}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              marginBottom: '8px', paddingBottom: '6px',
              borderBottom: `2px solid ${col.badge}`,
            }}>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: col.badge, color: col.badgeText, letterSpacing: '0.06em' }}>
                {cat}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                {prodsCat.filter(p => prodotti.includes(p.id)).length}/{prodsCat.length} selezionati
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {prodsCat.map(prod => {
                const on = prodotti.includes(prod.id);
                return (
                  <div
                    key={prod.id}
                    onClick={() => toggle(prod.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      border: `1px solid ${on ? col.border : '#e2e8f0'}`,
                      background: on ? col.bg : '#f8fafc',
                      transition: 'all 0.15s', userSelect: 'none',
                    }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: '4px', flexShrink: 0,
                      border: `2px solid ${on ? col.text : '#cbd5e1'}`,
                      background: on ? col.text : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {on && <span style={{ color: '#fff', fontSize: '10px', lineHeight: 1, fontWeight: 700 }}>✓</span>}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: on ? 600 : 400, color: on ? col.text : '#475569' }}>
                      {prod.id}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Visualizzazione prodotti per categoria (read-only) ───
export function ProdottiBadges({ prodotti }) {
  if (!prodotti || prodotti.length === 0) return null;
  const categorie = ['ERP', 'CRM', 'BI', 'Verticali'];

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      {categorie.map(cat => {
        const col = CATEGORIA_COLORS[cat];
        const items = (prodotti || []).filter(id => {
          const p = PRODOTTI_CATALOGO.find(x => x.id === id);
          return p?.categoria === cat;
        });
        if (items.length === 0) return null;
        return items.map(id => (
          <div key={id} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 12px', borderRadius: '8px',
            background: col.bg, border: `1px solid ${col.border}`,
          }}>
            <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '20px', background: col.badge, color: col.badgeText, letterSpacing: '0.04em' }}>
              {cat}
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: col.text }}>{id}</span>
          </div>
        ));
      })}
    </div>
  );
}