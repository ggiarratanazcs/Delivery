import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabase.js';

// ─────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────
const TIPI_NODO = [
  { key: 'testo',           label: 'Testo libero',    color: '#475569', bg: '#f8fafc', border: '#cbd5e1', icon: 'T', accent: '#64748b' },
  { key: 'documento',       label: 'Documento',       color: '#0054a6', bg: '#f0f6ff', border: '#93c5fd', icon: 'D', accent: '#185FA5' },
  { key: 'magazzino',       label: 'Magazzino',       color: '#92400e', bg: '#fef9f0', border: '#fbbf24', icon: 'M', accent: '#b45309' },
  { key: 'procedura',       label: 'Procedura',       color: '#3730a3', bg: '#f5f3ff', border: '#a5b4fc', icon: 'P', accent: '#4338ca' },
  { key: 'interfacciamento',label: 'Interfacciamento',color: '#065f46', bg: '#f0fdf9', border: '#6ee7b7', icon: 'I', accent: '#0F6E56' },
];

// Forme disponibili per tipo
const FORME_PER_TIPO = {
  testo:            [{ key: 'rettangolo', label: 'Rettangolo' }, { key: 'quadrato', label: 'Quadrato' }],
  documento:        [{ key: 'rettangolo', label: 'Rettangolo' }, { key: 'quadrato', label: 'Quadrato' }],
  magazzino:        [{ key: 'magazzino',  label: 'Magazzino'  }],
  procedura:        [{ key: 'rombo',      label: 'Rombo'      }],
  interfacciamento: [{ key: 'cerchio',    label: 'Cerchio'    }],
};


const PALETTE = [
  '#001d47','#0054a6','#185FA5','#0369a1','#0F6E56',
  '#065f46','#3730a3','#4338ca','#475569','#334155',
  '#92400e','#be123c','#9a3412','#374151','#1e293b',
];

const getTipo = (key) => TIPI_NODO.find(t => t.key === key) || TIPI_NODO[0];

const FORME = [
  { key: 'rettangolo', label: 'Rettangolo' },
  { key: 'quadrato',   label: 'Quadrato'   },
  { key: 'rombo',      label: 'Rombo'      },
  { key: 'cerchio',    label: 'Cerchio'    },
  { key: 'magazzino',  label: 'Magazzino'  },
];
const NODE_W = 200;
const NODE_H_BASE = 72;

// ─────────────────────────────────────────────
// NODO SVG
// ─────────────────────────────────────────────
function Nodo({ nodo, selected, nodoHover, connectingFrom, onSelect, onDragStart, onConnectStart, onConnectEnd, connecting, onHover, handleConnectClick, editMode, onContextMenuNodo, showValidati }) {
  const tipo = getTipo(nodo.tipo);
  const forma = nodo.forma || 'rettangolo';
  const titolo = nodo.dati?.titolo || nodo.dati?.codice || 'Nodo';
  const testo = nodo.dati?.testo || nodo.dati?.descrizione || '';
  const causali = nodo.tipo === 'documento'
    ? [nodo.dati?.causale_magazzino].filter(Boolean).join(' · ')
    : '';
  const extra = (testo ? 18 : 0) + (causali ? 14 : 0);
  const h = forma === 'cerchio'
    ? Math.max(NODE_W, NODE_H_BASE + extra)  // cerchio: lato = max(W,H)
    : NODE_H_BASE + extra;
  const r = forma === 'cerchio' ? h / 2 : 0;
  const col = nodo.colore || tipo.color;
  const headerH = 32;

  return (
    <g
      transform={`translate(${nodo.x}, ${nodo.y}) scale(${nodo.scala || 1})`}
      style={{ cursor: connectingFrom ? 'crosshair' : (editMode ? 'grab' : 'pointer') }}
      onMouseDown={e => {
        if (connectingFrom) return;
        if (!editMode) return; // in lettura non bloccare il click
        e.stopPropagation();
        onDragStart(e, nodo.id);
      }}
      onClick={e => {
        e.stopPropagation();
        if (connectingFrom) {
          // click sul corpo del nodo in modalità connessione = connetti
          handleConnectClick(e, nodo.id);
        } else {
          onSelect(nodo.id);
        }
      }}
      onMouseEnter={() => onHover(nodo.id)}
      onMouseLeave={() => onHover(null)}
      onContextMenu={e => {
        e.preventDefault();
        e.stopPropagation();
        if (!editMode) return;
        const rect = e.currentTarget.closest('svg').getBoundingClientRect();
        onContextMenuNodo && onContextMenuNodo({ x: e.clientX - rect.left, y: e.clientY - rect.top, targetId: nodo.id, targetTipo: 'nodo', nodoX: nodo.x, nodoY: nodo.y, nodoH: h, nodoW: forma === 'cerchio' ? h : NODE_W });
      }}
    >
      {/* === RETTANGOLO / QUADRATO === */}
      {(forma === 'rettangolo' || forma === 'quadrato') && (() => {
        const rW = forma === 'quadrato' ? h : NODE_W;
        const isTesto = nodo.tipo === 'testo';
        return <>
        <rect x={3} y={3} width={rW} height={h} rx={10} fill="rgba(0,0,0,0.15)" />
        <rect x={0} y={0} width={rW} height={h} rx={10} fill={tipo.bg}
          stroke={selected ? '#2563eb' : tipo.border}
          strokeWidth={selected ? 2.5 : 1.5}
          strokeDasharray={isTesto ? '6,3' : 'none'} />
        <rect x={0} y={0} width={rW} height={headerH} rx={10} fill={col} opacity={0.92} />
        <rect x={0} y={headerH - 8} width={rW} height={8} fill={col} opacity={0.92} />
        <foreignObject x={8} y={6} width={rW - (nodo.dati?.pdf_flag ? 36 : 16)} height={22}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'IBM Plex Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '22px' }}>
            {titolo || 'Senza titolo'}
          </div>
        </foreignObject>
        {/* Badge VALIDATO in alto a destra — visibile solo se showValidati */}
        {showValidati && nodo.dati?.validato && (
          <g>
            <circle cx={rW - (nodo.dati?.pdf_flag ? 48 : 26)} cy={16} r={11} fill="#16a34a" />
            <svg x={rW - (nodo.dati?.pdf_flag ? 57 : 35)} y={7} width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </g>
        )}
        {/* Badge PDF in alto a destra */}
        {nodo.dati?.pdf_flag && (
          <g>
            <rect x={rW - 26} y={5} width={20} height={20} rx={5} fill="#f97316" />
            <svg x={rW - 24} y={7} width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </g>
        )}
        {testo && <foreignObject x={8} y={headerH + 4} width={rW - 16} height={18}><div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 10, color: '#64748b', fontFamily: 'IBM Plex Sans, sans-serif', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{testo}</div></foreignObject>}
        {causali && <foreignObject x={8} y={headerH + (testo ? 22 : 4)} width={rW - 16} height={14}><div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 9, color: col, fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{causali}</div></foreignObject>}
        {nodo.tipo === 'documento' && (nodo.dati?.segno_quantita || nodo.dati?.segno_valore) && (() => {
          const sq = nodo.dati?.segno_quantita; const sv = nodo.dati?.segno_valore;
          const badges = [sq && { label: `Q${sq}`, color: sq === '+' ? '#15803d' : '#dc2626', bg: sq === '+' ? '#dcfce7' : '#fee2e2' }, sv && { label: `V${sv}`, color: sv === '+' ? '#15803d' : '#dc2626', bg: sv === '+' ? '#dcfce7' : '#fee2e2' }].filter(Boolean);
          return badges.map((b, i) => (
            <g key={b.label}>
              <rect x={rW - 28 - i * 30} y={h - 16} width={24} height={13} rx={4} fill={b.bg} />
              <text x={rW - 16 - i * 30} y={h - 6} textAnchor="middle" fontSize={9} fontWeight="700" fill={b.color} fontFamily="IBM Plex Mono, monospace">{b.label}</text>
            </g>
          ));
        })()}
      </>;})()}

      {/* === ROMBO === */}
      {forma === 'rombo' && (() => {
        const cx = NODE_W / 2, cy = h / 2;
        const pts = `${cx},0 ${NODE_W},${cy} ${cx},${h} 0,${cy}`;
        const clipId = `clip-rombo-${nodo.id}`;
        // Zona sicura interna al rombo: rettangolo inscritto = larghezza 60%, centrato
        const innerW = NODE_W * 0.58;
        const innerH = h * 0.55;
        const innerX = (NODE_W - innerW) / 2;
        const innerY = (h - innerH) / 2;
        // Una riga titolo + eventuale riga descrizione breve
        const hasTesto = !!testo;
        const titoloY = hasTesto ? cy - 10 : cy + 5;
        return <>
          <defs>
            <clipPath id={clipId}>
              <polygon points={pts} />
            </clipPath>
          </defs>
          <polygon points={`${cx+3},3 ${NODE_W+3},${cy+3} ${cx+3},${h+3} 3,${cy+3}`} fill="rgba(0,0,0,0.15)" />
          <polygon points={pts} fill={tipo.bg}
            stroke={showValidati && nodo.dati?.validato ? '#4ade80' : selected ? '#2563eb' : tipo.border}
            strokeWidth={showValidati && nodo.dati?.validato ? 2.5 : selected ? 2.5 : 1.5}
            filter={showValidati && nodo.dati?.validato ? 'drop-shadow(0 0 6px rgba(74,222,128,0.5))' : 'none'}
          />
          <g clipPath={`url(#${clipId})`}>
            <foreignObject x={innerX} y={titoloY - 12} width={innerW} height={hasTesto ? 22 : 24}>
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 11, fontWeight: 700, color: col, fontFamily: 'IBM Plex Sans, sans-serif', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '22px' }}>
                {titolo || 'Senza titolo'}
              </div>
            </foreignObject>
            {hasTesto && (
              <foreignObject x={innerX} y={titoloY + 12} width={innerW} height={18}>
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Sans, sans-serif', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', lineHeight: '18px' }}>
                  {testo}
                </div>
              </foreignObject>
            )}
          </g>
        </>;
      })()}

      {/* === CERCHIO === */}
      {forma === 'cerchio' && (() => {
        const cx = h / 2, cy = h / 2;
        return <>
          <circle cx={cx + 3} cy={cy + 3} r={cx} fill="rgba(0,0,0,0.15)" />
          <circle cx={cx} cy={cy} r={cx} fill={tipo.bg}
            stroke={showValidati && nodo.dati?.validato ? '#4ade80' : selected ? '#2563eb' : tipo.border}
            strokeWidth={showValidati && nodo.dati?.validato ? 2.5 : selected ? 2.5 : 1.5}
            filter={showValidati && nodo.dati?.validato ? 'drop-shadow(0 0 6px rgba(74,222,128,0.5))' : 'none'}
          />
          <circle cx={cx} cy={cy} r={cx} fill={col} opacity={0.15} />
          <foreignObject x={8} y={cy - 22} width={h - 16} height={44}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 12, fontWeight: 700, color: col, fontFamily: 'IBM Plex Sans, sans-serif', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '18px', paddingTop: testo ? 0 : 4 }}>
              {titolo || 'Senza titolo'}
            </div>
            {testo && <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 9, color: '#64748b', fontFamily: 'IBM Plex Sans, sans-serif', textAlign: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', marginTop: 2 }}>{testo}</div>}
            {nodo.tipo === 'interfacciamento' && (nodo.dati?.flussi?.length > 0) && (
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 9, color: col, fontFamily: 'IBM Plex Mono, monospace', textAlign: 'center', marginTop: 3, fontWeight: 600 }}>
                {nodo.dati.flussi.length} flusso{nodo.dati.flussi.length > 1 ? 'i' : ''}
              </div>
            )}
          </foreignObject>
        </>;
      })()}

      {/* === MAGAZZINO (capannone) === */}
      {forma === 'magazzino' && (() => {
        const W = NODE_W, H = h;
        const roofH = 22; // altezza del tetto triangolare
        // Corpo
        const bodyY = roofH;
        const bodyH = H - roofH;
        // Tetto: triangolo con base = W, vertice centrato in alto
        const roofPts = `0,${roofH} ${W/2},0 ${W},${roofH}`;
        return <>
          {/* Ombra */}
          <rect x={3} y={roofH+3} width={W} height={bodyH} fill="rgba(0,0,0,0.15)" />
          <polygon points={`3,${roofH+3} ${W/2+3},3 ${W+3},${roofH+3}`} fill="rgba(0,0,0,0.08)" />
          {/* Corpo edificio */}
          <rect x={0} y={bodyY} width={W} height={bodyH} rx={0}
            fill={tipo.bg} stroke={selected ? '#2563eb' : tipo.border} strokeWidth={selected ? 2.5 : 1.5} />
          {/* Tetto */}
          <polygon points={roofPts}
            fill={col} stroke={selected ? '#2563eb' : col} strokeWidth={selected ? 2.5 : 1.5} />
          {/* Porta magazzino */}
          <rect x={W/2 - 10} y={bodyY + bodyH - 20} width={20} height={20}
            fill={col} opacity={0.25} rx={2} />
          <rect x={W/2 - 10} y={bodyY + bodyH - 20} width={20} height={20}
            fill="none" stroke={col} strokeWidth={1} rx={2} />
          <line x1={W/2} y1={bodyY + bodyH - 20} x2={W/2} y2={bodyY + bodyH}
            stroke={col} strokeWidth={1} />
          {/* Titolo */}
          <foreignObject x={6} y={bodyY + 6} width={W - 12} height={20}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 11, fontWeight: 700, color: col, fontFamily: 'IBM Plex Sans, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: '20px' }}>
              {titolo || 'Magazzino'}
            </div>
          </foreignObject>
          {/* Codice */}
          {nodo.dati?.codice && (
            <foreignObject x={6} y={bodyY + 26} width={W - 12} height={14}>
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 9, color: '#92400e', fontFamily: 'IBM Plex Mono, monospace', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {nodo.dati.codice}
              </div>
            </foreignObject>
          )}
        </>;
      })()}

      {/* Handle connessione — visibili su hover */}
      {editMode && (nodoHover === nodo.id || connectingFrom) && (() => {
        const W = forma === 'cerchio' ? h : NODE_W;
        const isTarget = connectingFrom && connectingFrom !== nodo.id;
        const anchors = [
          { cx: W/2, cy: 0,   pos: 'top'    },
          { cx: W,   cy: h/2, pos: 'right'  },
          { cx: W/2, cy: h,   pos: 'bottom' },
          { cx: 0,   cy: h/2, pos: 'left'   },
        ];
        return anchors.map(({ cx: ax, cy: ay, pos }) => (
          <circle key={pos} cx={ax} cy={ay}
            r={isTarget ? 11 : 8}
            fill={isTarget ? '#22c55e' : col}
            stroke="#fff" strokeWidth={2.5}
            style={{
              cursor: 'crosshair',
              filter: isTarget ? 'drop-shadow(0 0 8px #22c55e)' : 'none',
            }}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              handleConnectClick(e, nodo.id);
            }}
          />
        ));
      })()}
    </g>
  );
}

// ─────────────────────────────────────────────
// PANNELLO MODIFICA NODO
// ─────────────────────────────────────────────
function PannelloNodo({ nodo, onUpdate, onDelete, onClose }) {
  const tipo = getTipo(nodo.tipo);
  const [dati, setDati] = useState(nodo.dati || {});
  const [colore, setColore] = useState(nodo.colore || tipo.color);
  const [forma, setForma] = useState(nodo.forma || 'rettangolo');
  const upd = (k, v) => setDati(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    onUpdate(nodo.id, { dati, colore, forma });
    onClose();
  };

  const campi = nodo.tipo === 'testo'
    ? [
        { key: 'titolo', label: 'Titolo', rows: 1 },
        { key: 'testo',  label: 'Testo',  rows: 4 },
      ]
    : nodo.tipo === 'magazzino'
    ? [
        { key: 'titolo',      label: 'Nome magazzino', rows: 1 },
        { key: 'codice',      label: 'Codice',         rows: 1 },
        { key: 'descrizione', label: 'Note',            rows: 2 },
      ]
    : nodo.tipo === 'procedura'
    ? [
        { key: 'titolo',      label: 'Titolo',      rows: 1 },
        { key: 'descrizione', label: 'Descrizione', rows: 3 },
      ]
    : nodo.tipo === 'interfacciamento'
    ? [
        { key: 'titolo',       label: 'Titolo',       rows: 1 },
        { key: 'descrizione',  label: 'Descrizione',  rows: 2 },
        { key: 'tecnologia',   label: 'Tecnologia',   rows: 1 },
      ]
    : [
        { key: 'codice',            label: 'Codice documento',  rows: 1 },
        { key: 'descrizione',       label: 'Descrizione',       rows: 2 },
        { key: 'causale_magazzino', label: 'Causale magazzino', rows: 1 },
      ]; // pdf_flag, quantità, valore gestiti separatamente

  return (
    <div style={{ position: 'absolute', top: 12, right: 12, width: 270, background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,18,41,0.18)', border: '1px solid #e2e8f0', zIndex: 100, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100% - 24px)' }}
      onClick={e => e.stopPropagation()}>
      {/* Header fisso */}
      <div style={{ background: colore, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderRadius: '14px 14px 0 0' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{tipo.label}</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, width: 24, height: 24, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
      </div>
      {/* Body scrollabile */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
      {/* Campi */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {campi.map(c => (
          <div key={c.key}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4 }}>{c.label}</label>
            {c.rows === 1
              ? <input value={dati[c.key] || ''} onChange={e => upd(c.key, e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = tipo.color}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              : <textarea value={dati[c.key] || ''} onChange={e => upd(c.key, e.target.value)} rows={c.rows}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: 7, border: '1.5px solid #e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.5 }}
                  onFocus={e => e.target.style.borderColor = tipo.color}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
            }
          </div>
        ))}
      </div>
      {/* Quantità e Valore — solo per nodi documento, multi-selezione */}
      {nodo.tipo === 'documento' && (
        <div style={{ padding: '0 14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[{ key: 'segno_quantita', label: 'Quantità' }, { key: 'segno_valore', label: 'Valore' }].map(({ key, label }) => {
            const arr = Array.isArray(dati[key]) ? dati[key] : (dati[key] ? [dati[key]] : []);
            const toggle = (val) => {
              const next = arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
              upd(key, next.length === 0 ? null : next.length === 1 ? next[0] : next);
            };
            return (
              <div key={key}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>{label}</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ val: '+', label: '+', bg: '#f0fdf4', border: '#86efac', color: '#15803d', bgA: '#dcfce7' },
                    { val: '-', label: '−', bg: '#fef2f2', border: '#fca5a5', color: '#dc2626', bgA: '#fee2e2' },
                  ].map(opt => {
                    const sel = arr.includes(opt.val);
                    return (
                      <button key={opt.val} onClick={() => toggle(opt.val)}
                        style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: `1.5px solid ${sel ? opt.border : '#e2e8f0'}`, background: sel ? opt.bgA : opt.bg, color: sel ? opt.color : '#94a3b8', fontSize: 20, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, boxShadow: sel ? `0 0 0 1px ${opt.border}` : 'none' }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Flag PDF — solo per nodi documento, in fondo */}
      {nodo.tipo === 'documento' && (
        <div style={{ padding: '0 14px 10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: dati.pdf_flag ? '#fff7ed' : '#f8fafc', border: `1.5px solid ${dati.pdf_flag ? '#f97316' : '#e2e8f0'}`, transition: 'all 0.15s' }}>
            <input type="checkbox" checked={!!dati.pdf_flag} onChange={e => upd('pdf_flag', e.target.checked)}
              style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 600, color: dati.pdf_flag ? '#f97316' : '#64748b' }}>Stampa da attenzionare</span>
            </div>
          </label>
        </div>
      )}

      {/* Flussi Da → A — solo per interfacciamento */}
      {nodo.tipo === 'interfacciamento' && (() => {
        const flussi = dati.flussi || [];
        const updFlussi = (newArr) => upd('flussi', newArr);
        return (
          <div style={{ padding: '0 14px 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Flussi</label>
              <button onClick={() => updFlussi([...flussi, { da: '', a: '' }])}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: `1px solid ${colore}`, background: colore + '15', color: colore, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Aggiungi flusso
              </button>
            </div>
            {flussi.length === 0 && (
              <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>Nessun flusso — usa + per aggiungere</div>
            )}
            {flussi.map((fl, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '8px 10px', borderRadius: 9, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[{ k: 'da', label: 'Da', placeholder: 'Sistema sorgente…' }, { k: 'a', label: 'A', placeholder: 'Sistema destinazione…' }].map(({ k, label, placeholder }) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, color: colore, textTransform: 'uppercase', letterSpacing: '0.05em', width: 14, flexShrink: 0 }}>{label}</span>
                      <input value={fl[k] || ''} onChange={e => {
                          const next = flussi.map((f, j) => j === i ? { ...f, [k]: e.target.value } : f);
                          updFlussi(next);
                        }}
                        placeholder={placeholder}
                        style={{ flex: 1, padding: '4px 7px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                        onFocus={e => e.target.style.borderColor = colore}
                        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', width: 14, flexShrink: 0, paddingTop: 5 }}>N</span>
                    <textarea value={fl.nota || ''} onChange={e => {
                        const next = flussi.map((f, j) => j === i ? { ...f, nota: e.target.value } : f);
                        updFlussi(next);
                      }}
                      placeholder="Nota descrittiva…"
                      rows={2}
                      style={{ flex: 1, padding: '4px 7px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 10, fontFamily: 'inherit', outline: 'none', background: '#fff', resize: 'none', lineHeight: 1.4, color: '#64748b' }}
                      onFocus={e => e.target.style.borderColor = colore}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>
                <button onClick={() => updFlussi(flussi.filter((_, j) => j !== i))}
                  style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>×</button>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Forma — solo quelle disponibili per il tipo */}
      {(() => {
        const formeDisp = FORME_PER_TIPO[nodo.tipo] || FORME_PER_TIPO['testo'];
        if (formeDisp.length <= 1) return null; // forma fissa, non mostrare selector
        return (
          <div style={{ padding: '0 14px 10px' }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Forma</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {formeDisp.map(f => (
                <button key={f.key} onClick={() => setForma(f.key)}
                  style={{ flex: 1, padding: '6px 4px', borderRadius: 7, border: `1.5px solid ${forma === f.key ? colore : '#e2e8f0'}`, background: forma === f.key ? colore + '18' : '#fff', color: forma === f.key ? colore : '#64748b', fontSize: 11, fontWeight: forma === f.key ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  {f.key === 'rettangolo' && <svg width="18" height="12" viewBox="0 0 18 12"><rect x="1" y="1" width="16" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>}
                  {f.key === 'quadrato'   && <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3,1.5"/></svg>}
                  {f.key === 'rombo'      && <svg width="16" height="16" viewBox="0 0 16 16"><polygon points="8,1 15,8 8,15 1,8" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>}
                  {f.key === 'cerchio'    && <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg>}
                  {f.key === 'magazzino'  && <svg width="18" height="14" viewBox="0 0 18 14"><polygon points="1,6 9,1 17,6" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="6" width="16" height="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><rect x="7" y="9" width="4" height="4" fill="none" stroke="currentColor" strokeWidth="1"/></svg>}
                  <span style={{ fontSize: 9 }}>{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Dimensione nodo */}
      <div style={{ padding: '0 14px 10px' }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Dimensione</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {[{ step: -0.15, icon: '−' }, { step: +0.15, icon: '+' }].map(({ step, icon }) => (
            <button key={icon} onClick={() => {
                const cur = forma === forma ? (nodo.scala || 1) : 1; // usa valore corrente
                // Aggiorna direttamente senza passare per handleSave
                const next = Math.max(0.4, Math.min(2.5, (nodo.scala || 1) + step));
                onUpdate(nodo.id, { scala: Math.round(next * 100) / 100 });
              }}
              style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#334155', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', transition: 'all 0.12s', flexShrink: 0 }}
              onMouseOver={e => { e.currentTarget.style.borderColor = colore; e.currentTarget.style.color = colore; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#334155'; }}>
              {icon}
            </button>
          ))}
          <div style={{ flex: 1, position: 'relative', height: 4, background: '#e2e8f0', borderRadius: 2 }}>
            <div style={{ position: 'absolute', left: 0, top: 0, height: 4, borderRadius: 2, background: colore, width: `${((nodo.scala || 1) - 0.4) / (2.5 - 0.4) * 100}%`, transition: 'width 0.15s' }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', minWidth: 36, textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace' }}>{Math.round((nodo.scala || 1) * 100)}%</span>
          {(nodo.scala || 1) !== 1 && (
            <button onClick={() => onUpdate(nodo.id, { scala: 1 })}
              title="Ripristina dimensione originale"
              style={{ fontSize: 9, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, fontFamily: 'inherit' }}>
              reset
            </button>
          )}
        </div>
      </div>

      {/* Color picker */}
      <div style={{ padding: '0 14px 10px' }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>Colore nodo</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PALETTE.map(c => (
            <button key={c} onClick={() => setColore(c)}
              style={{ width: 22, height: 22, borderRadius: 6, background: c, border: colore === c ? '3px solid #fff' : '2px solid transparent', boxShadow: colore === c ? `0 0 0 2px ${c}` : 'none', cursor: 'pointer', transition: 'all 0.1s', outline: 'none' }} />
          ))}
          {/* Custom color */}
          <label title="Colore personalizzato" style={{ width: 22, height: 22, borderRadius: 6, border: '2px dashed #cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>+</span>
            <input type="color" value={colore} onChange={e => setColore(e.target.value)}
              style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
          </label>
        </div>
      </div>

      </div>{/* fine body scrollabile */}
      {/* Footer fisso */}
      <div style={{ padding: '8px 14px 12px', display: 'flex', gap: 8, borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
        <button onClick={() => onDelete(nodo.id)} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#fee2e2', color: '#dc2626', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Elimina</button>
        <button onClick={handleSave} style={{ flex: 1, padding: '6px 12px', borderRadius: 7, border: 'none', background: colore, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Salva</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// CANVAS MAPPA
// ─────────────────────────────────────────────
function Canvas({ mappaId, readOnly = false }) {
  const svgRef = useRef(null);

  // ── Export PNG ──────────────────────────────────────────────
  const [exporting, setExporting] = React.useState(false);
  const exportPng = async () => {
    if (!svgRef.current || exporting) return;
    setExporting(true);
    try {
      if (nodi.length === 0) { setExporting(false); return; }
      const PADDING = 60;
      const xs = nodi.map(n => n.x); const ys = nodi.map(n => n.y);
      const minX = Math.min(...xs) - PADDING;
      const minY = Math.min(...ys) - PADDING;
      const maxX = Math.max(...xs) + 260;
      const maxY = Math.max(...ys) + 140;
      const W = maxX - minX;
      const H = maxY - minY;

      const clone = svgRef.current.cloneNode(true);
      clone.setAttribute('width', W);
      clone.setAttribute('height', H);
      clone.setAttribute('viewBox', `${minX} ${minY} ${W} ${H}`);

      // Sostituisci foreignObject con <text> SVG nativo — evita tainted canvas
      clone.querySelectorAll('foreignObject').forEach(fo => {
        const x = parseFloat(fo.getAttribute('x') || 0);
        const y = parseFloat(fo.getAttribute('y') || 0);
        const w = parseFloat(fo.getAttribute('width') || 160);
        const innerDiv = fo.querySelector('div');
        const txt = innerDiv ? innerDiv.textContent.trim() : '';
        if (!txt) { fo.remove(); return; }
        const fSize = innerDiv?.style?.fontSize || '12px';
        const fWeight = innerDiv?.style?.fontWeight || '400';
        const color = innerDiv?.style?.color || '#1e293b';
        const isCenter = innerDiv?.style?.textAlign === 'center';
        const textX = isCenter ? x + w / 2 : x + 4;
        const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textEl.setAttribute('x', textX);
        textEl.setAttribute('y', y + parseFloat(fSize) + 2);
        textEl.setAttribute('font-size', fSize);
        textEl.setAttribute('font-weight', fWeight);
        textEl.setAttribute('fill', color);
        textEl.setAttribute('font-family', 'Arial, sans-serif');
        textEl.setAttribute('text-anchor', isCenter ? 'middle' : 'start');
        const maxChars = Math.floor(w / (parseFloat(fSize) * 0.6));
        textEl.textContent = txt.length > maxChars ? txt.slice(0, maxChars - 1) + '\u2026' : txt;
        fo.parentNode.replaceChild(textEl, fo);
      });

      const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      style.textContent = 'text { font-family: Arial, Helvetica, sans-serif; }';
      clone.insertBefore(style, clone.firstChild);

      // Usa data URI base64 invece di blob URL — evita CORS tainted canvas
      const svgData = new XMLSerializer().serializeToString(clone);
      const svgB64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = W * scale; canvas.height = H * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        canvas.toBlob(blob => {
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'mappa-' + Date.now() + '.png';
          a.click();
          URL.revokeObjectURL(a.href);
          setExporting(false);
        }, 'image/png');
      };
      img.onerror = () => setExporting(false);
      img.src = svgB64;
    } catch(e) { console.error('Export PNG:', e); setExporting(false); }
  };

  const [nodi, setNodi] = useState([]);
  const [connessioni, setConnessioni] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(null); // { id, startX, startY, origX, origY }
  const [panning, setPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [connecting, setConnecting] = useState(null); // { fromId, mouseX, mouseY }
  const [connectingFrom, setConnectingFrom] = useState(null); // click mode
  const [nodoHover, setNodoHover] = useState(null); // hover
  const [editNodo, setEditNodo] = useState(null);
  const [viewNodo, setViewNodo] = useState(null); // lettura in readOnly
  const [infoItems, setInfoItems] = useState([]);
  const [infoAperta, setInfoAperta] = useState(null);
  const [infoEdit, setInfoEdit] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, targetId, targetTipo }
  const [fullscreen, setFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showValidati, setShowValidati] = useState(false); // modalità modifica — off di default
  const saveTimer = useRef(null);

  // ── Load ──
  useEffect(() => {
    if (!mappaId) return;
    const load = async () => {
      const [{ data: n }, { data: c }, { data: info }] = await Promise.all([
        supabase.from('progetto_mappa_nodi').select('*').eq('mappa_id', mappaId),
        supabase.from('progetto_mappa_connessioni').select('*').eq('mappa_id', mappaId),
        supabase.from('progetto_mappa_info').select('*').eq('mappa_id', mappaId),
      ]);
      setNodi(n || []);
      setConnessioni(c || []);
      setInfoItems(info || []);
    };
    load();
  }, [mappaId]);

  // ── Auto-save ──
  const scheduleSave = useCallback((nodiToSave, connToSave) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // Upsert nodi
      if (nodiToSave.length > 0) {
        await supabase.from('progetto_mappa_nodi').upsert(nodiToSave);
      }
    }, 800);
  }, []);

  // ── Aggiunge nodo ──
  const addNodo = async (tipo) => {
    const cx = (300 - pan.x) / zoom + Math.random() * 60;
    const cy = (200 - pan.y) / zoom + Math.random() * 60;
    const defaultFormaMap = { magazzino: 'magazzino', procedura: 'rombo', interfacciamento: 'cerchio' };
    const defaultForma = defaultFormaMap[tipo] || 'rettangolo';
    const { data } = await supabase.from('progetto_mappa_nodi').insert({
      mappa_id: mappaId, tipo, x: cx, y: cy, dati: {}, colore: getTipo(tipo).color, forma: defaultForma,
    }).select().single();
    if (data) { setNodi(p => [...p, data]); setEditNodo(data); }
  };

  // ── Aggiorna nodo ──
  const updateNodo = useCallback(async (id, changes) => {
    await supabase.from('progetto_mappa_nodi').update(changes).eq('id', id);
    setNodi(p => p.map(n => n.id === id ? { ...n, ...changes } : n));
  }, []);

  // ── Elimina nodo ──
  const deleteNodo = async (id) => {
    await supabase.from('progetto_mappa_nodi').delete().eq('id', id);
    await supabase.from('progetto_mappa_connessioni').delete().or(`from_id.eq.${id},to_id.eq.${id}`);
    setNodi(p => p.filter(n => n.id !== id));
    setConnessioni(p => p.filter(c => c.from_id !== id && c.to_id !== id));
    setSelected(null); setEditNodo(null);
  };

  // ── Mouse events ──
  const toCanvas = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom };
  };

  const onMouseDown = (e) => {
    if (viewNodo) { setViewNodo(null); return; }
    if (contextMenu) { setContextMenu(null); return; }
    if (connectingFrom) {
      setConnectingFrom(null); setConnecting(null); return;
    }
    if (editMode) setSelected(null);
    setEditNodo(null);
    setPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const onDragStart = (e, id) => {
    const n = nodi.find(n => n.id === id);
    if (!n) return;
    const rect = svgRef.current.getBoundingClientRect();
    setDragging({ id, startMouseX: e.clientX, startMouseY: e.clientY, origX: n.x, origY: n.y });
    setPanning(false);
  };

  const onMouseMove = (e) => {
    if (connectingFrom) {
      const rect = svgRef.current.getBoundingClientRect();
      setConnecting(p => p ? { ...p, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top } : p);
    }
    if (connecting && !connectingFrom) {
      const rect = svgRef.current.getBoundingClientRect();
      setConnecting(p => ({ ...p, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top }));
      return;
    }
    if (dragging) {
      const dx = (e.clientX - dragging.startMouseX) / zoom;
      const dy = (e.clientY - dragging.startMouseY) / zoom;
      const newX = dragging.origX + dx;
      const newY = dragging.origY + dy;
      setNodi(p => p.map(n => n.id === dragging.id ? { ...n, x: newX, y: newY } : n));
      return;
    }
    if (panning && panStart) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  // ESC per uscire da fullscreen
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setFullscreen(false); setConnecting(null); setConnectingFrom(null); setContextMenu(null); setInfoAperta(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onMouseUp = async (e) => {
    if (dragging) {
      const n = nodi.find(n => n.id === dragging.id);
      if (n) await supabase.from('progetto_mappa_nodi').update({ x: n.x, y: n.y }).eq('id', n.id);
      setDragging(null);
    }
    if (panning) { setPanning(false); setPanStart(null); }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.min(3, Math.max(0.2, z * factor)));
  };

  // ── Connessioni ──
  // ── Click mode: 1° click su handle → seleziona sorgente, 2° click su nodo → crea connessione ──
  const handleConnectClick = (e, fromId) => {
    e.stopPropagation();
    if (connectingFrom) {
      // Secondo click — crea connessione
      if (connectingFrom !== fromId) {
        createConnessione(connectingFrom, fromId);
      }
      setConnectingFrom(null);
      setConnecting(null);
    } else {
      // Primo click — seleziona sorgente
      setConnectingFrom(fromId);
      const rect = svgRef.current.getBoundingClientRect();
      const n = nodi.find(x => x.id === fromId);
      if (n) {
        const px = (n.x + NODE_W / 2) * zoom + pan.x;
        const py = (n.y + 0) * zoom + pan.y;
        setConnecting({ fromId, mouseX: px, mouseY: py });
      }
    }
  };

  const createConnessione = async (fromId, toId) => {
    const exists = connessioni.some(c => c.from_id === fromId && c.to_id === toId);
    if (!exists) {
      const { data } = await supabase.from('progetto_mappa_connessioni').insert({
        mappa_id: mappaId, from_id: fromId, to_id: toId, label: '',
      }).select().single();
      if (data) setConnessioni(p => [...p, data]);
    }
  };

  // Kept for legacy drag compatibility
  const onConnectStart = (e, fromId, fromPos) => { handleConnectClick(e, fromId); };
  const onConnectEnd = (toId) => {
    if (connectingFrom && connectingFrom !== toId) {
      createConnessione(connectingFrom, toId);
      setConnectingFrom(null);
      setConnecting(null);
    }
  };

  const deleteConnessione = async (id) => {
    await supabase.from('progetto_mappa_connessioni').delete().eq('id', id);
    setConnessioni(p => p.filter(c => c.id !== id));
  };

  const addInfo = async (x, y, targetId, tipo) => {
    const { data } = await supabase.from('progetto_mappa_info').insert({
      mappa_id: mappaId, x, y, target_id: targetId, target_tipo: tipo, testo: '',
    }).select().single();
    if (data) { setInfoItems(p => [...p, data]); setInfoEdit({ id: data.id, testo: '' }); }
  };

  const saveInfo = async (id, testo) => {
    await supabase.from('progetto_mappa_info').update({ testo }).eq('id', id);
    setInfoItems(p => p.map(i => i.id === id ? { ...i, testo } : i));
    setInfoEdit(null);
  };

  const deleteInfo = async (id) => {
    await supabase.from('progetto_mappa_info').delete().eq('id', id);
    setInfoItems(p => p.filter(i => i.id !== id));
    setInfoAperta(null);
  };

  const toggleValidato = async (targetId, targetTipo) => {
    if (targetTipo === 'nodo') {
      const nodo = nodi.find(n => n.id === targetId);
      if (!nodo) return;
      const newVal = !nodo.dati?.validato;
      await supabase.from('progetto_mappa_nodi').update({ dati: { ...nodo.dati, validato: newVal } }).eq('id', targetId);
      setNodi(p => p.map(n => n.id === targetId ? { ...n, dati: { ...n.dati, validato: newVal } } : n));
    } else if (targetTipo === 'conn') {
      const conn = connessioni.find(c => c.id === targetId);
      if (!conn) return;
      const newVal = !conn.validato;
      await supabase.from('progetto_mappa_connessioni').update({ validato: newVal }).eq('id', targetId);
      setConnessioni(p => p.map(c => c.id === targetId ? { ...c, validato: newVal } : c));
    }
  };

  // ── Calcola path connessione (curva di Bezier) ──
  const nodeAnchors = (n) => {
    const extra = ((n.dati?.testo || n.dati?.descrizione) ? 18 : 0) + (n.dati?.causale_magazzino ? 14 : 0);
    const h = n.forma === 'cerchio' ? Math.max(NODE_W, NODE_H_BASE + extra) : NODE_H_BASE + extra;
    const W = n.forma === 'cerchio' ? h : NODE_W;
    const s = n.scala || 1;
    return {
      top:    { x: n.x + (W / 2) * s,   y: n.y },
      right:  { x: n.x + W * s,          y: n.y + (h / 2) * s },
      bottom: { x: n.x + (W / 2) * s,   y: n.y + h * s },
      left:   { x: n.x,                  y: n.y + (h / 2) * s },
    };
  };

  const bestAnchors = (from, to) => {
    const fa = nodeAnchors(from);
    const ta = nodeAnchors(to);
    let best = { d: Infinity, fp: 'right', tp: 'left' };
    for (const fp of ['top','right','bottom','left']) {
      for (const tp of ['top','right','bottom','left']) {
        const dx = fa[fp].x - ta[tp].x, dy = fa[fp].y - ta[tp].y;
        const d = dx*dx + dy*dy;
        if (d < best.d) best = { d, fp, tp };
      }
    }
    return { from: fa[best.fp], to: ta[best.tp], fp: best.fp, tp: best.tp };
  };

  const connPath = (c) => {
    const from = nodi.find(n => n.id === c.from_id);
    const to = nodi.find(n => n.id === c.to_id);
    if (!from || !to) return null;
    const { from: p1, to: p2, fp, tp } = bestAnchors(from, to);
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const curve = Math.max(dist * 0.5, 60);
    const cx1 = fp === 'right' ? p1.x + curve : fp === 'left' ? p1.x - curve : p1.x;
    const cy1 = fp === 'bottom' ? p1.y + curve : fp === 'top' ? p1.y - curve : p1.y;
    const cx2 = tp === 'left' ? p2.x - curve : tp === 'right' ? p2.x + curve : p2.x;
    const cy2 = tp === 'top' ? p2.y - curve : tp === 'bottom' ? p2.y + curve : p2.y;
    return `M ${p1.x} ${p1.y} C ${cx1} ${cy1} ${cx2} ${cy2} ${p2.x} ${p2.y}`;
  };

  // ── Linea connessione in corso ──
  const connectingPath = () => {
    if (!connecting) return null;
    const from = nodi.find(n => n.id === connecting.fromId);
    if (!from) return null;
    const fromH = NODE_H_BASE + ((from.dati?.testo || from.dati?.descrizione) ? 20 : 0) + (from.dati?.causale_magazzino ? 16 : 0);
    const x1 = (from.x + NODE_W) * zoom + pan.x, y1 = (from.y + fromH / 2) * zoom + pan.y;
    const dist = Math.abs(connecting.mouseX - x1);
    const curve = Math.max(dist * 0.6, 60);
    return `M ${x1} ${y1} C ${x1 + curve} ${y1} ${connecting.mouseX - curve} ${connecting.mouseY} ${connecting.mouseX} ${connecting.mouseY}`;
  };

  return (
    <div style={{ position: fullscreen ? 'fixed' : 'relative', inset: fullscreen ? 0 : 'auto', width: fullscreen ? '100vw' : '100%', height: fullscreen ? '100vh' : '100%', background: '#0f172a', borderRadius: fullscreen ? 0 : 12, overflow: 'hidden', zIndex: fullscreen ? 9999 : 'auto' }}>
      {/* Toolbar nodi — solo in editMode */}
      {editMode && (
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexDirection: 'column', gap: 4, zIndex: 50 }}>
          {TIPI_NODO.map(t => (
            <button key={t.key} onClick={() => addNodo(t.key)}
              title={`Aggiungi ${t.label}`}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 8px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.bg, color: t.color, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'IBM Plex Sans, sans-serif', boxShadow: '0 1px 4px rgba(0,0,0,0.18)', transition: 'all 0.15s', letterSpacing: '0.01em' }}
              onMouseOver={e => { e.currentTarget.style.background = t.color; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = t.color; }}
              onMouseOut={e => { e.currentTarget.style.background = t.bg; e.currentTarget.style.color = t.color; e.currentTarget.style.borderColor = t.border; }}>
              <span style={{ width: 20, height: 20, borderRadius: 5, background: t.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0, letterSpacing: 0 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}

          {/* Hint tasto destro */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '3px 0' }} />
          <div style={{ padding: '3px 6px', display: 'flex', alignItems: 'flex-start', gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontSize: 8, color: '#475569', lineHeight: 1.4, fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Tasto destro → <strong style={{ color: '#60a5fa' }}>Info</strong> / <strong style={{ color: '#4ade80' }}>Valida</strong>
            </span>
          </div>
        </div>
      )}

      {/* Toolbar zoom */}
      <div style={{ position: 'absolute', bottom: 14, left: 12, display: 'flex', gap: 4, zIndex: 50 }}>
        {[
          { label: '+', action: () => setZoom(z => Math.min(3, z * 1.2)) },
          { label: '−', action: () => setZoom(z => Math.max(0.2, z * 0.8)) },
          { label: '⊙', action: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
        ].map(b => (
          <button key={b.label} onClick={b.action}
            style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
            {b.label}
          </button>
        ))}
        <span style={{ fontSize: 10, color: '#475569', alignSelf: 'center', marginLeft: 4, fontFamily: 'IBM Plex Mono, monospace' }}>{Math.round(zoom * 100)}%</span>
        {/* Toggle modifica — nascosto in readOnly */}
        {!readOnly && <button onClick={() => { setEditMode(m => !m); if (!editMode) { setConnectingFrom(null); setConnecting(null); setEditNodo(null); } }}
          title={editMode ? 'Disattiva modifica' : 'Attiva modifica'}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', height: 30, borderRadius: 8, border: `1px solid ${editMode ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'}`, background: editMode ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', color: editMode ? '#4ade80' : '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 4 }}>
          {editMode
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
          {editMode ? 'Modifica' : 'Lettura'}
        </button>}

        {/* Toggle mostra validati */}
        <button onClick={() => setShowValidati(v => !v)}
          title={showValidati ? 'Nascondi validazioni' : 'Mostra processi validati'}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', height: 30, borderRadius: 8, border: `1px solid ${showValidati ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.1)'}`, background: showValidati ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)', color: showValidati ? '#4ade80' : '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          Validati
        </button>
        {/* Fullscreen toggle */}
        <button onClick={() => setFullscreen(f => !f)} title={fullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}>
          {fullscreen
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
          }
        </button>
        {/* Export PNG */}
        <button onClick={exportPng} disabled={exporting} title="Esporta mappa come PNG"
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px', height: 30, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: exporting ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.08)', color: exporting ? '#4ade80' : '#94a3b8', fontSize: 11, fontWeight: 600, cursor: exporting ? 'wait' : 'pointer', fontFamily: 'inherit', marginLeft: 4, transition: 'all 0.2s', opacity: exporting ? 0.7 : 1 }}>
          {exporting
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          }
          {exporting ? 'Esportando...' : 'PNG'}
        </button>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width="100%" height="100%"
        style={{ cursor: panning && !dragging ? 'grab' : 'default' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onWheel={onWheel}

      >
        {/* Griglia di punti */}
        <defs>
          <pattern id="dots" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)} width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.8} fill="rgba(255,255,255,0.06)" />
          </pattern>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#4A90D9" opacity="0.7" />
          </marker>
          <marker id="arrow-green" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="#4ade80" opacity="0.9" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Connessioni */}
          {connessioni.map(c => {
            const path = connPath(c);
            if (!path) return null;
            return (
              <g key={c.id}>
                {/* Area click invisibile */}
                <path d={path} fill="none" stroke="transparent" strokeWidth={12} style={{ cursor: 'pointer' }} onClick={() => deleteConnessione(c.id)} />
                <path d={path} fill="none" stroke={showValidati && c.validato ? "#4ade80" : "#4A90D9"} strokeWidth={showValidati && c.validato ? 2.5 : 1.8} strokeDasharray="0" opacity={0.85} markerEnd={showValidati && c.validato ? "url(#arrow-green)" : "url(#arrow)"}
                  onContextMenu={e => {
                    e.preventDefault(); e.stopPropagation();
                    if (!editMode) return;
                    const rect = e.currentTarget.closest('svg').getBoundingClientRect();
                    setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, targetId: c.id, targetTipo: 'conn' });
                  }}
                />
              </g>
            );
          })}

          {/* Nodi */}
          {nodi.map(n => (
            <Nodo key={n.id} nodo={n}
              selected={selected === n.id}
              nodoHover={nodoHover}
              connectingFrom={connectingFrom}
              connecting={!!connecting}
              onSelect={id => { if (!editMode || readOnly) { setViewNodo(nodi.find(x => x.id === id)); } else if (!connectingFrom) { setSelected(id); setEditNodo(nodi.find(x => x.id === id)); } }}
              onDragStart={editMode ? onDragStart : () => {}}
              onConnectStart={onConnectStart}
              onConnectEnd={onConnectEnd}
              onHover={setNodoHover}
              handleConnectClick={editMode ? handleConnectClick : () => {}}
              editMode={editMode}
              onContextMenuNodo={setContextMenu}
              showValidati={showValidati}
            />
          ))}

          {/* Info items — icone professionali */}
          {infoItems.map(info => {
            const isOpen = infoAperta === info.id;
            const popupW = 200;
            const lineH = 18;
            const lines = (info.testo || '').split('\n');
            // Stima righe per wrap (popupW-20 px / ~7px per char)
            const totalLines = lines.reduce((acc, l) => acc + Math.max(1, Math.ceil(l.length / 26)), 0);
            const popupH = Math.max(70, totalLines * lineH + 44);
            return (
              <g key={info.id} transform={`translate(${info.x}, ${info.y})`}>
                {/* Badge info — cerchio con "i" stile professionale */}
                <g style={{ cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setInfoAperta(isOpen ? null : info.id); }}
                  onMouseDown={editMode ? e => { e.stopPropagation(); onDragStart(e, '__info__' + info.id); } : undefined}>
                    {/* Ombra */}
                  <circle cx={1} cy={2} r={13} fill="rgba(0,0,0,0.25)" />
                  {/* Sfondo cerchio */}
                  <circle cx={0} cy={0} r={13}
                    fill={isOpen ? '#3b82f6' : '#1e40af'}
                    stroke={isOpen ? '#93c5fd' : 'rgba(255,255,255,0.3)'}
                    strokeWidth={1.5}
                  />
                  {/* Lettera i */}
                  <text x={0} y={-3} textAnchor="middle" fill="rgba(255,255,255,0.5)"
                    fontSize={7} fontWeight="700" fontFamily="IBM Plex Sans, sans-serif"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>•</text>
                  <text x={0} y={6} textAnchor="middle" fill="#fff"
                    fontSize={11} fontWeight="700" fontFamily="Georgia, serif"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>i</text>
                </g>

                {/* Popup info aperto */}
                {isOpen && (
                  <g transform={`translate(18, -${popupH / 2})`}>
                    {/* Ombra popup */}
                    <rect x={2} y={2} width={popupW} height={popupH} rx={10} fill="rgba(0,0,0,0.3)" />
                    {/* Corpo popup */}
                    <rect x={0} y={0} width={popupW} height={popupH} rx={10}
                      fill="#1e293b" stroke="#3b82f6" strokeWidth={1.5} />
                    {/* Header popup */}
                    <rect x={0} y={0} width={popupW} height={26} rx={10} fill="#1e40af" />
                    <rect x={0} y={16} width={popupW} height={10} fill="#1e40af" />
                    {/* Icona info nell'header */}
                    <circle cx={14} cy={13} r={8} fill="rgba(255,255,255,0.15)" />
                    <text x={14} y={10} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={5} fontWeight="700" style={{ userSelect: 'none' }}>•</text>
                    <text x={14} y={17} textAnchor="middle" fill="#fff" fontSize={9} fontWeight="700" fontFamily="Georgia, serif" style={{ userSelect: 'none' }}>i</text>
                    <text x={28} y={17} fill="rgba(255,255,255,0.8)" fontSize={10} fontWeight="600" fontFamily="IBM Plex Sans, sans-serif" style={{ userSelect: 'none' }}>Nota informativa</text>
                    {/* Bottoni edit/delete */}
                    {editMode && (
                      <>
                        <g style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setInfoEdit({ id: info.id, testo: info.testo || '' }); }}>
                          <rect x={popupW - 44} y={6} width={16} height={14} rx={4} fill="rgba(255,255,255,0.15)" />
                          <svg x={popupW - 43} y={8} width={14} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </g>
                        <g style={{ cursor: 'pointer' }} onClick={e => { e.stopPropagation(); deleteInfo(info.id); }}>
                          <rect x={popupW - 24} y={6} width={16} height={14} rx={4} fill="rgba(220,38,38,0.3)" />
                          <text x={popupW - 16} y={17} textAnchor="middle" fill="#fca5a5" fontSize={12} fontWeight="700" style={{ userSelect: 'none' }}>×</text>
                        </g>
                      </>
                    )}
                    {/* Testo */}
                    <foreignObject x={10} y={32} width={popupW - 20} height={popupH - 36}>
                      <div xmlns="http://www.w3.org/1999/xhtml" style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'IBM Plex Sans, sans-serif', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {info.testo || <span style={{ color: '#475569', fontStyle: 'italic' }}>Nessun testo — clicca ✎ per modificare</span>}
                      </div>
                    </foreignObject>
                  </g>
                )}
              </g>
            );
          })}
        </g>

        {/* Linea connessione in corso */}
        {connecting && (
          <path d={connectingPath()} fill="none" stroke="#4A90D9" strokeWidth={2} strokeDasharray="6,3" opacity={0.8} />
        )}

        {/* Hint vuoto */}
        {nodi.length === 0 && (
          <text x="50%" y="50%" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize={14} fontFamily="IBM Plex Sans, sans-serif">
            Aggiungi un nodo dalla toolbar a sinistra
          </text>
        )}
      </svg>

      {/* Context menu tasto destro */}
      {contextMenu && editMode && (
        <div style={{ position: 'absolute', left: contextMenu.x, top: contextMenu.y, background: '#1e293b', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', overflow: 'hidden', zIndex: 300, minWidth: 180, border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 6px' }}>
              {contextMenu.targetTipo === 'conn' ? 'Connessione' : 'Nodo'}
            </div>
          </div>
          <div onClick={() => {
            const x = contextMenu.targetTipo === 'nodo'
              ? contextMenu.nodoX + (contextMenu.nodoW || NODE_W) - 16
              : (contextMenu.x - pan.x) / zoom;
            const y = contextMenu.targetTipo === 'nodo'
              ? contextMenu.nodoY + (contextMenu.nodoH || NODE_H_BASE) - 16
              : (contextMenu.y - pan.y) / zoom;
            addInfo(x, y, contextMenu.targetId, contextMenu.targetTipo);
            setContextMenu(null);
          }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', color: '#e2e8f0', fontSize: 13 }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{ fontWeight: 500 }}>Aggiungi nota Info</span>
          </div>
          <div onClick={() => {
            toggleValidato(contextMenu.targetId, contextMenu.targetTipo);
            setContextMenu(null);
          }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', color: '#e2e8f0', fontSize: 13 }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span style={{ fontWeight: 500 }}>Valida processo</span>
          </div>
        </div>
      )}

      {/* Popup editing info */}
      {infoEdit && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 14, padding: 0, width: 320, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', overflow: 'hidden', zIndex: 200 }}
          onClick={e => e.stopPropagation()}>
          <div style={{ background: '#2563eb', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Nota informativa</span>
            <button onClick={() => setInfoEdit(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, width: 24, height: 24, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          </div>
          <div style={{ padding: 16 }}>
            <textarea
              value={infoEdit.testo}
              onChange={e => setInfoEdit(p => ({ ...p, testo: e.target.value }))}
              placeholder="Scrivi la nota informativa…"
              rows={4} autoFocus
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #bfdbfe', fontSize: 12, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setInfoEdit(null)} style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Annulla</button>
              <button onClick={() => saveInfo(infoEdit.id, infoEdit.testo)} style={{ flex: 2, padding: '7px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* Pannello modifica nodo */}
      {editNodo && editMode && (
        <PannelloNodo
          nodo={editNodo}
          onUpdate={(id, changes) => { updateNodo(id, changes); setEditNodo(p => ({ ...p, ...changes })); }}
          onDelete={deleteNodo}
          onClose={() => setEditNodo(null)}
        />
      )}

      {/* Pannello sola lettura — readOnly */}
      {viewNodo && (!editMode || readOnly) && (() => {
        const tipo = getTipo(viewNodo.tipo);
        const col = viewNodo.colore || tipo.color;
        const d = viewNodo.dati || {};
        const rows = [
          d.titolo && { label: 'Titolo', val: d.titolo },
          d.codice && { label: 'Codice', val: d.codice },
          d.descrizione && { label: 'Descrizione', val: d.descrizione },
          d.tecnologia && { label: 'Tecnologia', val: d.tecnologia },
          d.testo && { label: 'Testo', val: d.testo },
          d.causale_magazzino && { label: 'Causale magazzino', val: d.causale_magazzino },
        ].filter(Boolean);
        const sq = Array.isArray(d.segno_quantita) ? d.segno_quantita : (d.segno_quantita ? [d.segno_quantita] : []);
        const sv = Array.isArray(d.segno_valore) ? d.segno_valore : (d.segno_valore ? [d.segno_valore] : []);
        return (
          <div style={{ position: 'absolute', top: 12, right: 12, width: 260, background: '#fff', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,18,41,0.22)', border: '1px solid #e2e8f0', zIndex: 100, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100% - 24px)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ background: col, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderRadius: '14px 14px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0 }}>{tipo.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{tipo.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.titolo || d.codice || '—'}</div>
                </div>
              </div>
              <button onClick={() => setViewNodo(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, width: 24, height: 24, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 8 }}>×</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rows.map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.val}</div>
                </div>
              ))}
              {viewNodo.tipo === 'interfacciamento' && (d.flussi || []).length > 0 && (
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Flussi</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(d.flussi || []).map((fl, i) => (
                      <div key={i} style={{ padding: '7px 10px', borderRadius: 8, background: '#f0fdf9', border: '1px solid #6ee7b7' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, color: '#065f46', fontWeight: 600, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fl.da || '—'}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0F6E56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                          <span style={{ fontSize: 11, color: '#065f46', fontWeight: 600, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>{fl.a || '—'}</span>
                        </div>
                        {fl.nota && <div style={{ fontSize: 10, color: '#475569', marginTop: 4, lineHeight: 1.4, fontStyle: 'italic' }}>{fl.nota}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewNodo.tipo === 'documento' && (sq.length > 0 || sv.length > 0) && (
                <div style={{ display: 'flex', gap: 8 }}>
                  {[{ label: 'Quantità', arr: sq, color: { '+': '#15803d', '-': '#dc2626' }, bg: { '+': '#dcfce7', '-': '#fee2e2' } },
                    { label: 'Valore',   arr: sv, color: { '+': '#15803d', '-': '#dc2626' }, bg: { '+': '#dcfce7', '-': '#fee2e2' } }
                  ].map(f => f.arr.length > 0 && (
                    <div key={f.label} style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{f.label}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {f.arr.map(v => (
                          <span key={v} style={{ padding: '3px 10px', borderRadius: 6, background: f.bg[v] || '#f1f5f9', color: f.color[v] || '#64748b', fontSize: 14, fontWeight: 700 }}>{v}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {viewNodo.tipo === 'documento' && d.pdf_flag && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span style={{ fontSize: 11, color: '#c2410c', fontWeight: 600 }}>Stampa da attenzionare</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Hint connessione */}
      {connecting && (
        <div style={{ position: 'absolute', bottom: 14, right: 14, background: 'rgba(74,144,217,0.9)', borderRadius: 8, padding: '6px 12px', fontSize: 11, color: '#fff', fontFamily: 'IBM Plex Sans, sans-serif' }}>
          Clicca su un altro nodo per collegare · Esc per annullare
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// VISTA PRINCIPALE MAPPA
// ─────────────────────────────────────────────
export function MappaView({ progettoId, readOnly = false }) {
  const [mappe, setMappe] = useState([]);
  const [mappaAttiva, setMappaAttiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingNome, setEditingNome] = useState(null);
  const [nomeEdit, setNomeEdit] = useState('');
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, mappaId }

  const loadMappe = async () => {
    setLoading(true);
    const { data } = await supabase.from('progetto_mappe').select('*').eq('progetto_id', progettoId).order('created_at');
    setMappe(data || []);
    if (data && data.length > 0 && !mappaAttiva) setMappaAttiva(data[0].id);
    setLoading(false);
  };

  useEffect(() => { loadMappe(); }, [progettoId]);

  const addMappa = async () => {
    const { data } = await supabase.from('progetto_mappe').insert({ progetto_id: progettoId, nome: `Mappa ${mappe.length + 1}` }).select().single();
    if (data) { setMappe(p => [...p, data]); setMappaAttiva(data.id); }
  };

  const deleteMappa = async (id) => {
    if (!window.confirm('Eliminare questa mappa e tutti i suoi nodi?')) return;
    await supabase.from('progetto_mappe').delete().eq('id', id);
    const rest = mappe.filter(m => m.id !== id);
    setMappe(rest);
    setMappaAttiva(rest.length > 0 ? rest[0].id : null);
  };

  const saveNome = async (id) => {
    await supabase.from('progetto_mappe').update({ nome: nomeEdit }).eq('id', id);
    setMappe(p => p.map(m => m.id === id ? { ...m, nome: nomeEdit } : m));
    setEditingNome(null);
  };

  const duplicaMappa = async (id) => {
    setCtxMenu(null);
    const original = mappe.find(m => m.id === id);
    if (!original) return;
    // Crea nuova mappa
    const { data: newMappa } = await supabase.from('progetto_mappe')
      .insert({ progetto_id: progettoId, nome: `${original.nome} (copia)` }).select().single();
    if (!newMappa) return;
    // Copia nodi
    const { data: nodi } = await supabase.from('progetto_mappa_nodi').select('*').eq('mappa_id', id);
    const idMap = {};
    if (nodi && nodi.length > 0) {
      for (const n of nodi) {
        const { id: _id, mappa_id: _mid, created_at: _ca, ...rest } = n;
        const { data: newN } = await supabase.from('progetto_mappa_nodi').insert({ ...rest, mappa_id: newMappa.id }).select().single();
        if (newN) idMap[n.id] = newN.id;
      }
    }
    // Copia connessioni (aggiornando from_id/to_id)
    const { data: conns } = await supabase.from('progetto_mappa_connessioni').select('*').eq('mappa_id', id);
    if (conns && conns.length > 0) {
      const newConns = conns.map(c => {
        const { id: _id, mappa_id: _mid, created_at: _ca, ...rest } = c;
        return { ...rest, mappa_id: newMappa.id, from_id: idMap[c.from_id] || c.from_id, to_id: idMap[c.to_id] || c.to_id };
      });
      await supabase.from('progetto_mappa_connessioni').insert(newConns);
    }
    // Copia info
    const { data: info } = await supabase.from('progetto_mappa_info').select('*').eq('mappa_id', id);
    if (info && info.length > 0) {
      const newInfo = info.map(i => { const { id: _id, mappa_id: _mid, created_at: _ca, ...rest } = i; return { ...rest, mappa_id: newMappa.id }; });
      await supabase.from('progetto_mappa_info').insert(newInfo);
    }
    setMappe(p => [...p, newMappa]);
    setMappaAttiva(newMappa.id);
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: '#94a3b8', fontSize: 13 }}>Caricamento mappe…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', minHeight: 500, gap: 0 }}>
      {/* Tab mappe */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '1px solid #e2e8f0', paddingLeft: 4, background: '#fff', flexShrink: 0, overflowX: 'auto' }}>
        {mappe.map(m => (
          <div key={m.id}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', cursor: 'pointer', borderBottom: m.id === mappaAttiva ? '2.5px solid var(--brand-800)' : '2.5px solid transparent', color: m.id === mappaAttiva ? 'var(--brand-800)' : '#64748b', fontWeight: m.id === mappaAttiva ? 700 : 400, fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', whiteSpace: 'nowrap', transition: 'all 0.15s', userSelect: 'none' }}
            onClick={() => { setMappaAttiva(m.id); setCtxMenu(null); }}
            onContextMenu={e => { if (readOnly) return; e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, mappaId: m.id }); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/></svg>
            {editingNome === m.id
              ? <input value={nomeEdit} onChange={e => setNomeEdit(e.target.value)} autoFocus
                  onBlur={() => saveNome(m.id)} onKeyDown={e => e.key === 'Enter' && saveNome(m.id)}
                  style={{ border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', width: 120, background: 'transparent', color: 'var(--brand-800)', fontWeight: 700 }} />
              : <span onDoubleClick={() => { if (!readOnly) { setEditingNome(m.id); setNomeEdit(m.nome); } }}>{m.nome}</span>
            }
            {m.id === mappaAttiva && !readOnly && (
              <button onClick={e => { e.stopPropagation(); deleteMappa(m.id); }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 14, cursor: 'pointer', padding: '0 2px', lineHeight: 1, marginLeft: 2 }}
                onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>×</button>
            )}
          </div>
        ))}
        {!readOnly && <button onClick={addMappa}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', border: 'none', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
          onMouseOver={e => e.currentTarget.style.color = 'var(--brand-800)'}
          onMouseOut={e => e.currentTarget.style.color = '#64748b'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuova mappa
        </button>}
      </div>

      {/* Context menu duplica */}
      {ctxMenu && (
        <div style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, background: '#1e293b', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.35)', zIndex: 9999, overflow: 'hidden', minWidth: 160, border: '1px solid rgba(255,255,255,0.08)' }}
          onClick={e => e.stopPropagation()}>
          <div onClick={() => duplicaMappa(ctxMenu.mappaId)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', color: '#e2e8f0', fontSize: 13 }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Duplica mappa
          </div>
        </div>
      )}
      {ctxMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setCtxMenu(null)} />}

      {/* Canvas */}
      <div style={{ flex: 1, padding: 16, background: '#f8fafc' }}>
        {mappe.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: '#94a3b8' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="12" y1="7" x2="5" y2="17"/><line x1="12" y1="7" x2="19" y2="17"/></svg>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>Nessuna mappa</div>
            <div style={{ fontSize: 13, color: '#94a3b8' }}>Crea la prima mappa concettuale per questo progetto</div>
            {!readOnly && <button onClick={addMappa}
              style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Nuova mappa
            </button>}
          </div>
        ) : mappaAttiva ? (
          <div style={{ height: '100%', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            <Canvas key={mappaAttiva} mappaId={mappaAttiva} readOnly={readOnly} />
          </div>
        ) : null}
      </div>
    </div>
  );
}