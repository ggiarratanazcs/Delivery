import React, { useState, useEffect, useRef } from 'react';

const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const GIORNI_SETTIMANA = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

export function DatePicker({ value, onChange, placeholder = 'gg/mm/aaaa', disabled = false }) {
  const [open, setOpen] = useState(false);
  const today = new Date(); today.setHours(0,0,0,0);
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [viewYear, setViewYear] = useState((parsed || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((parsed || today).getMonth());
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()); }
  }, [value]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Dom
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1); // Lun=0
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const displayValue = parsed
    ? `${String(parsed.getDate()).padStart(2,'0')}/${String(parsed.getMonth()+1).padStart(2,'0')}/${parsed.getFullYear()}`
    : '';

  const selectDay = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    onChange(iso);
    setOpen(false);
  };

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Campo trigger */}
      <div onClick={() => !disabled && setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? '#0d4d8a' : '#e2e8f0'}`, padding: '6px 2px 8px', cursor: disabled ? 'default' : 'pointer', background: 'transparent', transition: 'border-color 0.18s', minHeight: 34 }}>
        <span style={{ fontSize: '13px', color: displayValue ? '#1e293b' : '#94a3b8', fontStyle: displayValue ? 'normal' : 'italic', flex: 1 }}>
          {displayValue || placeholder}
        </span>
        {!disabled && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        )}
        {displayValue && !disabled && (
          <svg onClick={e => { e.stopPropagation(); onChange(''); }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 4, cursor: 'pointer' }}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        )}
      </div>

      {/* Calendario */}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 400, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', padding: '14px 14px 10px', width: 252, userSelect: 'none' }}>

          {/* Header mese/anno */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, color: '#64748b', fontSize: 16, lineHeight: 1 }}>‹</button>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{MESI[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, color: '#64748b', fontSize: 16, lineHeight: 1 }}>›</button>
          </div>

          {/* Intestazione giorni */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {GIORNI_SETTIMANA.map(g => (
              <div key={g} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#94a3b8', padding: '2px 0' }}>{g}</div>
            ))}
          </div>

          {/* Griglia giorni */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const thisDate = new Date(viewYear, viewMonth, day);
              const isSelected = parsed && thisDate.getTime() === parsed.getTime();
              const isToday = thisDate.getTime() === today.getTime();
              return (
                <div key={i} onClick={() => selectDay(day)}
                  style={{
                    textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: '12px', cursor: 'pointer',
                    background: isSelected ? '#001d47' : isToday ? '#eff6ff' : 'transparent',
                    color: isSelected ? '#fff' : isToday ? '#0d4d8a' : '#1e293b',
                    fontWeight: isSelected || isToday ? 600 : 400,
                    border: isToday && !isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = isToday ? '#eff6ff' : 'transparent'; }}>
                  {day}
                </div>
              );
            })}
          </div>

          {/* Footer: Oggi */}
          <div style={{ borderTop: '0.5px solid #f1f5f9', marginTop: 10, paddingTop: 8, textAlign: 'center' }}>
            <button onClick={() => { const t = today; const iso = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`; onChange(iso); setOpen(false); }}
              style={{ background: 'none', border: 'none', fontSize: '12px', color: '#0d4d8a', cursor: 'pointer', fontWeight: 500, padding: '2px 8px', borderRadius: 6 }}>
              Oggi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}