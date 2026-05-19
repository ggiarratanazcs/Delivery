import React, { useState, useRef, useEffect } from 'react';

export function MultiPillFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (opt) => {
    onChange(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
  };

  const active = selected.length > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        padding: '4px 10px', borderRadius: '20px', border: '1px solid',
        fontSize: '11px', fontWeight: active ? 600 : 400,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
        whiteSpace: 'nowrap',
        background: active ? '#eff6ff' : '#f8fafc',
        borderColor: active ? '#bfdbfe' : '#e2e8f0',
        color: active ? '#0054a6' : '#475569',
      }}>
        {label}
        {active && (
          <span style={{
            background: '#0054a6', color: '#fff', borderRadius: '20px',
            fontSize: '10px', padding: '1px 6px', fontWeight: 700,
          }}>
            {selected.length}
          </span>
        )}
        <span style={{ fontSize: '9px', opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 100,
          background: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160,
          padding: '6px 0', overflow: 'hidden',
        }}>
          {options.map(opt => {
            const on = selected.includes(opt);
            return (
              <div
                key={opt}
                onClick={() => toggle(opt)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '7px 12px', cursor: 'pointer', fontSize: '12px',
                  color: on ? '#0054a6' : '#475569',
                  background: on ? '#f0f7ff' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseOver={e => { if (!on) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseOut={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '3px',
                  border: `1.5px solid ${on ? '#0054a6' : '#cbd5e1'}`,
                  background: on ? '#0054a6' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {on && <span style={{ color: '#fff', fontSize: '9px', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                {opt}
              </div>
            );
          })}
          {selected.length > 0 && (
            <div
              onClick={() => onChange([])}
              style={{
                padding: '6px 12px', borderTop: '1px solid #f1f5f9',
                fontSize: '11px', color: '#dc2626', cursor: 'pointer', textAlign: 'center',
              }}
            >
              Cancella selezione
            </div>
          )}
        </div>
      )}
    </div>
  );
}