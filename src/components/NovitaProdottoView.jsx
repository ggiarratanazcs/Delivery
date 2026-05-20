import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { CardPreviewModal } from './CardPreviewModal.jsx';

// ── SearchLens — icona lente che espande un input ─────────────
function SearchLens({ value, onChange }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (open && ref.current) ref.current.focus();
  }, [open]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: open ? '#f8fafc' : 'transparent',
        border: open ? '1px solid #e2e8f0' : '1px solid transparent',
        borderRadius: 20, padding: open ? '4px 10px 4px 8px' : '4px',
        transition: 'all 0.2s', cursor: 'pointer',
      }} onClick={() => !open && setOpen(true)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke={open ? '#0054a6' : '#94a3b8'} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}
          onClick={e => { if (open) { e.stopPropagation(); setOpen(false); onChange(''); } }}>
          <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
        </svg>
        {open && (
          <input ref={ref} type="text" value={value} onChange={e => onChange(e.target.value)}
            placeholder="Cerca..."
            onBlur={() => { if (!value) setOpen(false); }}
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, width: 180, color: '#0f172a', fontFamily: 'inherit' }} />
        )}
        {open && value && (
          <span onClick={e => { e.stopPropagation(); onChange(''); }}
            style={{ cursor: 'pointer', color: '#94a3b8', fontSize: 14, lineHeight: 1 }}>×</span>
        )}
      </div>
    </div>
  );
}

// ── Vista principale Novità di Prodotto ───────────────────────
export function NovitaProdottoView({ staff, clients, isAdmin }) {
  const [attivita, setAttivita] = useState([]);
  const [colonne, setColonne] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [search, setSearch] = useState('');
  const [sezione, setSezione] = useState('corso'); // 'corso' | 'conclusi'

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
          {att.rif_pratica && <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', marginTop: 2, marginLeft: 19 }}>{att.rif_pratica}</div>}
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
        <td style={{ padding: '11px 16px', color: '#64748b', fontFamily: 'inherit', fontVariantNumeric: 'tabular-nums', fontSize: 11 }}>{fmtDate(att.data_richiesta)}</td>
      </tr>
    );
  };

  const theadStyle = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div style={{ flex: 1, overflow: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>

      {/* Toolbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

        {/* Titolo */}
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

        {/* Lente di ricerca — stile coerente con le altre sezioni */}
        <SearchLens value={search} onChange={setSearch} />

        {/* Contatore risultati — solo quando la ricerca è attiva */}
        {search.trim() && (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {filtered.length} risultat{filtered.length === 1 ? 'o' : 'i'}
          </span>
        )}
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