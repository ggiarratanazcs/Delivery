import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { CardPreviewModal } from './CardPreviewModal.jsx';

// ── DatePicker inline (stesso di CardModal) ───────────────────
const MESI = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const GG = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];
function DatePicker({ value, onChange, placeholder = 'gg/mm/aaaa', disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const today = new Date(); today.setHours(0,0,0,0);
  const parsed = value ? new Date(value + 'T00:00:00') : null;
  const [vy, setVy] = React.useState((parsed || today).getFullYear());
  const [vm, setVm] = React.useState((parsed || today).getMonth());
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  React.useEffect(() => { if (parsed) { setVy(parsed.getFullYear()); setVm(parsed.getMonth()); } }, [value]);
  const fd = new Date(vy, vm, 1).getDay(); const off = fd === 0 ? 6 : fd - 1;
  const dim = new Date(vy, vm + 1, 0).getDate();
  const disp = parsed ? `${String(parsed.getDate()).padStart(2,'0')}/${String(parsed.getMonth()+1).padStart(2,'0')}/${parsed.getFullYear()}` : '';
  const sel = day => { const d = new Date(vy, vm, day); onChange(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); setOpen(false); };
  const cells = [...Array(off).fill(null), ...Array.from({length: dim}, (_,i) => i+1)];
  while (cells.length % 7 !== 0) cells.push(null);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => !disabled && setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? '#0d4d8a' : '#e2e8f0'}`, padding: '6px 2px 8px', cursor: disabled ? 'default' : 'pointer', minHeight: 34 }}>
        <span style={{ fontSize: '13px', color: disp ? '#1e293b' : '#94a3b8', fontStyle: disp ? 'normal' : 'italic', flex: 1 }}>{disp || placeholder}</span>
        {!disabled && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        {disp && !disabled && <svg onClick={e => { e.stopPropagation(); onChange(''); }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, cursor: 'pointer' }}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 400, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,18,41,0.12)', padding: '14px 14px 10px', width: 252, userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button onClick={() => { if (vm === 0) { setVm(11); setVy(y => y-1); } else setVm(m => m-1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: '#64748b', fontSize: 16 }}>‹</button>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#0f172a' }}>{MESI[vm]} {vy}</span>
            <button onClick={() => { if (vm === 11) { setVm(0); setVy(y => y+1); } else setVm(m => m+1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', color: '#64748b', fontSize: 16 }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
            {GG.map(g => <div key={g} style={{ textAlign: 'center', fontSize: '10px', fontWeight: 600, color: '#94a3b8' }}>{g}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const td = new Date(vy, vm, day); const isSel = parsed && td.getTime() === parsed.getTime(); const isT = td.getTime() === today.getTime();
              return <div key={i} onClick={() => sel(day)} style={{ textAlign: 'center', padding: '5px 0', borderRadius: 6, fontSize: '12px', cursor: 'pointer', background: isSel ? '#001d47' : isT ? '#eff6ff' : 'transparent', color: isSel ? '#fff' : isT ? '#0d4d8a' : '#1e293b', fontWeight: isSel || isT ? 600 : 400, border: isT && !isSel ? '1px solid #bfdbfe' : '1px solid transparent' }} onMouseOver={e => { if (!isSel) e.currentTarget.style.background = '#f1f5f9'; }} onMouseOut={e => { if (!isSel) e.currentTarget.style.background = isT ? '#eff6ff' : 'transparent'; }}>{day}</div>;
            })}
          </div>
          <div style={{ borderTop: '0.5px solid #f1f5f9', marginTop: 10, paddingTop: 8, textAlign: 'center' }}>
            <button onClick={() => { const t = today; onChange(`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`); setOpen(false); }} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#0d4d8a', cursor: 'pointer', fontWeight: 500 }}>Oggi</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Scheda attività sola lettura ──────────────────────────────
// ── Vista principale Novità di Prodotto ───────────────────────
export function NovitaProdottoView({ staff, clients, isAdmin }) {
  const [attivita, setAttivita] = useState([]);
  const [colonne, setColonne] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [search, setSearch] = useState('');
  const [sezione, setSezione] = useState('corso'); // 'corso' | 'conclusi'

  // Colonne "concluse" — quelle che contengono "complet" o "chius" o "rilasci" nel nome
  const isColonnaConclusa = col => col && /complet|chius|rilasci|done|annull/i.test(col.nome);

  useEffect(() => {
    Promise.all([
      supabase.from('attivita')
        .select('*, commessa:commessa_id(id, nome_commessa, client_id), colonna:colonna_id(id, nome, colore, workflow_id)')
        .eq('novita_prodotto', true)
        .order('created_at', { ascending: false }),
      supabase.from('workflow_colonne').select('*'),
    ]).then(([{ data: att }, { data: cols }]) => {
      setAttivita(att || []);
      setColonne(cols || []);
      setLoading(false);
    });
  }, []);

  const getColonna = att => colonne.find(c => c.id === att.colonna_id);
  const getCliente = att => clients.find(c => c.id === att.commessa?.client_id);
  const pColor = p => p === 'alta' ? { bg: '#fef2f2', text: '#dc2626', border: '#fca5a5' } : p === 'bassa' ? { bg: '#f0fdf4', text: '#16a34a', border: '#86efac' } : { bg: '#fefce8', text: '#92400e', border: '#fcd34d' };
  const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  // Filtra per sezione e ricerca
  const filtered = attivita.filter(att => {
    const col = getColonna(att);
    const conclusa = isColonnaConclusa(col);
    if (sezione === 'corso' && conclusa) return false;
    if (sezione === 'conclusi' && !conclusa) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const cli = getCliente(att);
    return (
      att.titolo?.toLowerCase().includes(q) ||
      att.rif_pratica?.toLowerCase().includes(q) ||
      att.assegnatario?.toLowerCase().includes(q) ||
      cli?.nome_progetto?.toLowerCase().includes(q) ||
      col?.nome?.toLowerCase().includes(q)
    );
  });

  const inCorso = attivita.filter(att => !isColonnaConclusa(getColonna(att))).length;
  const conclusi = attivita.filter(att => isColonnaConclusa(getColonna(att))).length;

  const TableRow = ({ att }) => {
    const col = getColonna(att);
    const cli = getCliente(att);
    const pc = pColor(att.priorita);
    const colColor = col?.colore || '#64748b';
    return (
      <tr onClick={() => setSelectedCard(att)}
        style={{ borderBottom: '0.5px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.12s' }}
        onMouseOver={e => e.currentTarget.style.background = '#fffbeb'}
        onMouseOut={e => e.currentTarget.style.background = '#fff'}>
        <td style={{ padding: '11px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#FAC775" stroke="#FAC775" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span style={{ fontWeight: 500, color: '#0f172a', fontSize: 13 }}>{att.titolo}</span>
          </div>
          {att.rif_pratica && <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2, marginLeft: 19 }}>{att.rif_pratica}</div>}
        </td>
        <td style={{ padding: '11px 16px', color: '#475569', fontSize: 12 }}>{cli?.nome_progetto || '—'}</td>
        <td style={{ padding: '11px 16px' }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: pc.bg, color: pc.text, border: `1px solid ${pc.border}`, fontWeight: 500, textTransform: 'capitalize' }}>{att.priorita || 'media'}</span>
        </td>
        <td style={{ padding: '11px 16px' }}>
          {col ? <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: colColor + '1a', color: colColor, border: `1px solid ${colColor}44`, fontWeight: 500 }}>{col.nome}</span>
               : <span style={{ color: '#94a3b8' }}>—</span>}
        </td>
        <td style={{ padding: '11px 16px', color: '#475569', fontSize: 12 }}>{att.assegnatario || '—'}</td>
        <td style={{ padding: '11px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 11 }}>{fmtDate(att.data_richiesta)}</td>
      </tr>
    );
  };

  const theadStyle = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#FAC775" stroke="#FAC775" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#001d47' }}>Novità di Prodotto</span>
        </div>

        {/* Tab in corso / conclusi */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 10, gap: 2 }}>
          <button onClick={() => setSezione('corso')}
            style={{ padding: '5px 14px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: sezione === 'corso' ? 600 : 400, cursor: 'pointer', background: sezione === 'corso' ? '#fff' : 'transparent', color: sezione === 'corso' ? '#001d47' : '#64748b', boxShadow: sezione === 'corso' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            In corso
            {inCorso > 0 && <span style={{ marginLeft: 6, background: sezione === 'corso' ? '#001d47' : '#94a3b8', color: '#fff', borderRadius: 20, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{inCorso}</span>}
          </button>
          <button onClick={() => setSezione('conclusi')}
            style={{ padding: '5px 14px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: sezione === 'conclusi' ? 600 : 400, cursor: 'pointer', background: sezione === 'conclusi' ? '#fff' : 'transparent', color: sezione === 'conclusi' ? '#001d47' : '#64748b', boxShadow: sezione === 'conclusi' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
            Conclusi
            {conclusi > 0 && <span style={{ marginLeft: 6, background: sezione === 'conclusi' ? '#001d47' : '#94a3b8', color: '#fff', borderRadius: 20, fontSize: 10, padding: '1px 6px', fontWeight: 700 }}>{conclusi}</span>}
          </button>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: 10, background: '#f8fafc', flex: 1, maxWidth: 320 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca titolo, cliente, rif. pratica..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#0f172a', width: '100%', fontFamily: 'inherit' }} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>}
        </div>

        <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
          {filtered.length} risultat{filtered.length === 1 ? 'o' : 'i'}
        </span>
      </div>

      {/* Contenuto */}
      <div style={{ padding: '20px 24px', flex: 1 }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>Caricamento...</div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94a3b8', background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 10px', display: 'block' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              {search ? 'Nessun risultato' : sezione === 'conclusi' ? 'Nessuno sviluppo concluso' : 'Nessuna attività in corso'}
            </div>
            <div style={{ fontSize: 12, color: '#cbd5e1' }}>
              {!search && sezione === 'corso' && 'Contrassegna un\'attività con ★ nel workflow per vederla qui'}
            </div>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={theadStyle}>Attività</th>
                  <th style={theadStyle}>Cliente</th>
                  <th style={theadStyle}>Priorità</th>
                  <th style={theadStyle}>Stato workflow</th>
                  <th style={theadStyle}>Assegnatario</th>
                  <th style={theadStyle}>Data richiesta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(att => <TableRow key={att.id} att={att} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCard && (
        <CardPreviewModal
          card={selectedCard}
          colonnaNome={colonne.find(c => c.id === selectedCard.colonna_id)?.nome}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}