import React, { useState, useEffect, useRef } from 'react';

export function SelectDropdown({ options = [], value, onChange, placeholder = 'Scegli...', disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o =>
    !search || (o.label ?? o).toString().toLowerCase().includes(search.toLowerCase())
  );
  const selectedLabel = options.find(o => (o.value ?? o) === value)?.label ?? value ?? '';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => !disabled && setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? '#0d4d8a' : '#e2e8f0'}`, padding: '6px 2px 8px', cursor: disabled ? 'default' : 'pointer', background: 'transparent', transition: 'border-color 0.18s', minHeight: 34 }}>
        <span style={{ fontSize: '13px', color: selectedLabel ? '#1e293b' : '#94a3b8', fontStyle: selectedLabel ? 'normal' : 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedLabel || placeholder}
        </span>
        {!disabled && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', zIndex: 300, overflow: 'hidden' }}>
          <div style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9' }}>
            <div style={{ position: 'relative' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input value={search} onChange={e => { e.stopPropagation(); setSearch(e.target.value); }}
                onClick={e => e.stopPropagation()} placeholder="Cerca..." autoFocus
                style={{ width: '100%', padding: '5px 8px 5px 26px', fontSize: '12px', border: '0.5px solid #e2e8f0', borderRadius: 6, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '10px 12px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Nessun risultato</div>
            )}
            {filtered.map((o, i) => {
              const val = o.value ?? o;
              const label = o.label ?? o;
              const isSelected = val === value;
              return (
                <div key={i} onClick={() => { onChange(val); setOpen(false); setSearch(''); }}
                  style={{ padding: '9px 14px', fontSize: '13px', cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff', color: isSelected ? '#001d47' : '#1e293b', fontWeight: isSelected ? 500 : 400, borderBottom: '0.5px solid #f8fafc', transition: 'background 0.1s' }}
                  onMouseOver={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseOut={e => { if (!isSelected) e.currentTarget.style.background = '#fff'; }}>
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}