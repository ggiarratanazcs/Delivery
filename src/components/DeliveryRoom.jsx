import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';

const CATEGORIE = [
  { key: 'problema',      label: 'Problema',       bg: '#FCEBEB', color: '#A32D2D', accent: '#E24B4A' },
  { key: 'idea',          label: 'Idea',            bg: '#EEEDFE', color: '#3C3489', accent: '#7F77DD' },
  { key: 'decisione',     label: 'Decisione',       bg: '#FAEEDA', color: '#633806', accent: '#BA7517' },
  { key: 'aggiornamento', label: 'Aggiornamento',   bg: '#E6F1FB', color: 'var(--brand-700)', accent: '#185FA5' },
];

const getCat = (key) => CATEGORIE.find(c => c.key === key) || CATEGORIE[3];

function getSettimanaIso(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function fmtSettimana(iso) {
  if (!iso) return '';
  const [year, w] = iso.split('-W');
  const jan4 = new Date(Number(year), 0, 4);
  const startOfWeek = new Date(jan4);
  startOfWeek.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (Number(w) - 1) * 7);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4);
  const fmt = (d) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  return `${fmt(startOfWeek)} – ${fmt(endOfWeek)} ${year}`;
}

function Initials({ name, size = 28 }) {
  const parts = (name || '').split(' ');
  const ini = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  const palettes = [
    ['#E6F1FB','#0C447C'], ['#EAF3DE','#27500A'], ['#FAEEDA','#633806'],
    ['#EEEDFE','#3C3489'], ['#FCEBEB','#791F1F'], ['#E1F5EE','#085041'],
  ];
  const [bg, fg] = palettes[(name?.charCodeAt(0) || 0) % palettes.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, flexShrink: 0 }}>
      {ini || '?'}
    </div>
  );
}

// ── Carta grande con flip se discussa ────────────────────────────
function Carta({ carta, index, onClick, landed }) {
  const cat = getCat(carta.categoria);
  const rotations = [-6, 4, -3, 5, -4, 3, -5, 6, -2, 4];
  const rot = rotations[index % rotations.length];

  return (
    <div
      onClick={() => onClick(carta)}
      style={{
        width: 160, height: 210,
        cursor: 'pointer', userSelect: 'none',
        perspective: 800,
        transform: `rotate(${rot}deg)`,
        transition: 'transform 0.18s ease',
        animation: landed ? 'cardFly 0.45s cubic-bezier(.2,.8,.3,1.2) both' : 'none',
        animationDelay: `${index * 0.06}s`,
      }}
      onMouseOver={e => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.08) translateY(-6px)'; e.currentTarget.style.zIndex = 30; }}
      onMouseOut={e => { e.currentTarget.style.transform = `rotate(${rot}deg)`; e.currentTarget.style.zIndex = index + 1; }}>
      <div style={{
        width: '100%', height: '100%',
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: carta.discusso ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform 0.5s ease',
      }}>
        {/* Fronte */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          background: 'var(--color-surface)', border: `2px solid ${cat.accent}`, borderRadius: 14,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}>
          <div style={{ background: cat.bg, padding: '10px 12px 8px', borderBottom: `2px solid ${cat.accent}` }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{cat.label}</span>
          </div>
          <div style={{ flex: 1, padding: '12px 12px 10px' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)', lineHeight: 1.45 }}>{carta.testo}</div>
          </div>
          <div style={{ padding: '8px 12px', borderTop: `1px solid ${cat.bg}`, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--gray-50)' }}>
            <Initials name={carta.autore} size={20} />
            <span style={{ fontSize: 11, color: 'var(--gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{carta.autore?.split(' ')[0]}</span>
          </div>
        </div>
        {/* Retro — discussa */}
        <div style={{
          position: 'absolute', inset: 0,
          backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: 'var(--gray-900)', border: '2px solid #334155', borderRadius: 14,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Discussa</span>
          <span style={{ fontSize: 10, color: 'var(--gray-500)', textAlign: 'center', padding: '0 16px', lineHeight: 1.4 }}>{carta.testo}</span>
        </div>
      </div>
    </div>
  );
}

// ── Modal nuova carta ─────────────────────────────────────────────
export function NuovaCartaModal({ autore, settimana, onSave, onClose }) {
  const [testo, setTesto] = useState('');
  const [categoria, setCategoria] = useState('aggiornamento');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);
  useEffect(() => { setTimeout(() => ref.current?.focus(), 80); }, []);

  const save = async () => {
    if (!testo.trim() || saving) return;
    setSaving(true);
    const { data, error } = await supabase.from('delivery_agenda').insert({
      testo: testo.trim(), categoria, autore,
      settimana_iso: settimana, discusso: false, ordine: Date.now(),
    }).select().single();
    setSaving(false);
    if (!error && data) onSave(data);
  };

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 20, width: '100%', maxWidth: 440, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
      <div style={{ background: 'var(--brand-800)', padding: '18px 22px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Lancia una carta</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>La tua carta volerà sul tavolo</div>
      </div>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Tipo */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Tipo</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIE.map(c => (
              <button key={c.key}
                type="button"
                onClick={() => setCategoria(c.key)}
                style={{ fontSize: 12, padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, border: `2px solid ${categoria === c.key ? c.accent : 'transparent'}`, background: c.bg, color: c.color, opacity: categoria === c.key ? 1 : 0.45, transition: 'all .12s', fontFamily: 'inherit' }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {/* Testo */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Argomento</div>
          <textarea ref={ref} value={testo} onChange={e => setTesto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); if (e.key === 'Escape') onClose(); }}
            placeholder="Scrivi l'argomento da portare in riunione..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', color: 'var(--gray-950)', background: 'var(--gray-50)', lineHeight: 1.5, boxSizing: 'border-box' }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Initials name={autore} size={22} />
          <span>Firmata da <strong>{autore}</strong></span>
        </div>
      </div>
      <div style={{ padding: '12px 22px', borderTop: '0.5px solid var(--gray-100)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-500)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Annulla</button>
        <button onClick={save} disabled={!testo.trim() || saving}
          style={{ padding: '8px 22px', borderRadius: 10, border: 'none', background: testo.trim() ? '#001d47' : '#e2e8f0', color: testo.trim() ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 600, cursor: testo.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
          {saving ? 'Lancio...' : 'Lancia'}
        </button>
      </div>
    </div>
  );
}

// ── Modal dettaglio carta ─────────────────────────────────────────
export function CartaDetailModal({ carta, onToggle, onDelete, onClose, isAdmin }) {
  const cat = getCat(carta.categoria);
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
      {/* Header colorato */}
      <div style={{ background: cat.bg, borderBottom: `3px solid ${cat.accent}`, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, textTransform: 'uppercase', letterSpacing: '.07em' }}>{cat.label}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cat.color, fontSize: 20, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-950)', marginTop: 10, lineHeight: 1.5 }}>{carta.testo}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <Initials name={carta.autore} size={24} />
          <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>{carta.autore}</span>
        </div>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)' }}>
        <button onClick={() => { onToggle(carta); onClose(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: `1.5px solid ${carta.discusso ? '#86efac' : '#e2e8f0'}`, background: carta.discusso ? '#f0fdf4' : '#f8fafc', color: carta.discusso ? '#15803d' : '#475569', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
          {carta.discusso ? (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Discussa</>
          ) : (
            <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 8 12 12 14 14"/></svg> Segna come discussa</>
          )}
        </button>
        {isAdmin && (
          <button onClick={() => { onDelete(carta.id); onClose(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', padding: '8px', borderRadius: 8, fontSize: 13 }}
            onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--gray-400)'}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Modal archivia ────────────────────────────────────────────────
export function ArchiviaModal({ settimana, carte, onSave, onClose }) {
  const [noteText, setNoteText] = useState('');
  const [saving, setSaving] = useState(false);
  const discusse = carte.filter(c => c.discusso);
  const decisioni = carte.filter(c => c.discusso && c.categoria === 'decisione');

  const save = async () => {
    setSaving(true);
    await supabase.from('delivery_riunioni').insert({
      settimana_iso: settimana,
      data: new Date().toISOString().slice(0, 10),
      agenda_snapshot: carte,
      note: noteText.trim() || null,
    });
    setSaving(false);
    onSave();
  };

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 20, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
      <div style={{ background: 'var(--brand-800)', padding: '18px 22px' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Archivia riunione</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{fmtSettimana(settimana)}</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 14 }}>
          {[{ val: carte.length, lbl: 'Carte' }, { val: discusse.length, lbl: 'Discusse' }, { val: decisioni.length, lbl: 'Decisioni', gold: true }].map(k => (
            <div key={k.lbl} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: k.gold ? '#FAC775' : '#fff' }}>{k.val}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{k.lbl}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '18px 22px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Note riunione</div>
        <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
          placeholder="Decisioni prese, azioni da fare, note..."
          rows={4}
          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--gray-200)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', color: 'var(--gray-950)', background: 'var(--gray-50)', lineHeight: 1.5, boxSizing: 'border-box' }} />
      </div>
      <div style={{ padding: '12px 22px', borderTop: '0.5px solid var(--gray-100)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 10, border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-500)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Annulla</button>
        <button onClick={save} disabled={saving}
          style={{ padding: '8px 22px', borderRadius: 10, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Archivio...' : 'Archivia'}
        </button>
      </div>
    </div>
  );
}

// ── Scaletta riunione ─────────────────────────────────────────────
function Scaletta({ settimana, isAdmin }) {
  const [punti, setPunti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editTesto, setEditTesto] = useState('');
  const [addMode, setAddMode] = useState(false);
  const [newTitolo, setNewTitolo] = useState('');
  const [newDurata, setNewDurata] = useState(5);

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    loadScaletta();
  }, [settimana]);

  const loadScaletta = async () => {
    setLoading(true);
    // Prima verifica se esiste già (evita duplicati da StrictMode double-invoke)
    const { data: existing } = await supabase
      .from('delivery_scaletta_settimana')
      .select('*').eq('settimana_iso', settimana).order('ordine');

    if (existing && existing.length > 0) {
      setPunti(existing);
    } else {
      // Copia dalla default — con upsert per sicurezza
      const { data: def } = await supabase
        .from('delivery_scaletta_default').select('*').order('ordine');
      if (def && def.length > 0) {
        // Controlla ancora una volta prima di inserire (race condition)
        const { data: check } = await supabase
          .from('delivery_scaletta_settimana')
          .select('id').eq('settimana_iso', settimana).limit(1);
        if (!check || check.length === 0) {
          const records = def.map(d => ({
            settimana_iso: settimana, ordine: d.ordine,
            titolo: d.titolo, durata_min: d.durata_min, completato: false,
          }));
          const { data: inserted } = await supabase
            .from('delivery_scaletta_settimana').insert(records).select();
          setPunti(inserted || []);
        } else {
          // Nel frattempo qualcun altro ha già inserito, ricarica
          const { data: fresh } = await supabase
            .from('delivery_scaletta_settimana')
            .select('*').eq('settimana_iso', settimana).order('ordine');
          setPunti(fresh || []);
        }
      }
    }
    setLoading(false);
  };

  const toggle = async (p) => {
    await supabase.from('delivery_scaletta_settimana').update({ completato: !p.completato }).eq('id', p.id);
    setPunti(prev => prev.map(x => x.id === p.id ? { ...x, completato: !p.completato } : x));
  };

  const saveEdit = async (p) => {
    if (!editTesto.trim()) return;
    await supabase.from('delivery_scaletta_settimana').update({ titolo: editTesto.trim() }).eq('id', p.id);
    setPunti(prev => prev.map(x => x.id === p.id ? { ...x, titolo: editTesto.trim() } : x));
    setEditingId(null);
  };

  const deletePunto = async (id) => {
    await supabase.from('delivery_scaletta_settimana').delete().eq('id', id);
    setPunti(prev => prev.filter(x => x.id !== id));
  };

  const addPunto = async () => {
    if (!newTitolo.trim()) return;
    const maxOrdine = punti.length > 0 ? Math.max(...punti.map(p => p.ordine)) : 0;
    const { data } = await supabase.from('delivery_scaletta_settimana').insert({
      settimana_iso: settimana, ordine: maxOrdine + 10,
      titolo: newTitolo.trim(), durata_min: newDurata, completato: false,
    }).select().single();
    if (data) setPunti(prev => [...prev, data]);
    setNewTitolo(''); setNewDurata(5); setAddMode(false);
  };

  const totMinuti = punti.reduce((s, p) => s + (p.durata_min || 0), 0);
  const completati = punti.filter(p => p.completato).length;

  return (
    <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-950)' }}>Scaletta</div>
          <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 1 }}>{totMinuti} min · {completati}/{punti.length}</div>
        </div>
        {isAdmin && (
          <button onClick={() => setAddMode(v => !v)}
            style={{ background: 'none', border: '0.5px solid var(--gray-200)', borderRadius: 6, cursor: 'pointer', padding: '3px 7px', fontSize: 12, color: 'var(--gray-500)' }}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} />
          </button>
        )}
      </div>

      {/* Barra progresso */}
      <div style={{ height: 3, background: 'var(--gray-200)', borderRadius: 2, marginBottom: 12 }}>
        <div style={{ width: `${punti.length > 0 ? Math.round((completati / punti.length) * 100) : 0}%`, height: '100%', background: 'var(--brand-800)', borderRadius: 2, transition: 'width 0.3s' }} />
      </div>

      {/* Lista punti */}
      {loading ? (
        <div style={{ fontSize: 12, color: 'var(--gray-400)', padding: '8px 0' }}>Caricamento...</div>
      ) : punti.map((p, i) => (
        <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: '0.5px solid var(--gray-100)', opacity: p.completato ? 0.5 : 1 }}>
          {/* Numero / check */}
          <div onClick={() => toggle(p)}
            style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${p.completato ? 'var(--brand-800)' : 'var(--gray-200)'}`, background: p.completato ? 'var(--brand-800)' : 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 1 }}>
            {p.completato
              ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-400)' }}>{i + 1}</span>
            }
          </div>

          {/* Testo */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editingId === p.id ? (
              <input value={editTesto} onChange={e => setEditTesto(e.target.value)}
                onBlur={() => saveEdit(p)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(p); if (e.key === 'Escape') setEditingId(null); }}
                autoFocus
                style={{ width: '100%', fontSize: 12, border: '1px solid #185FA5', borderRadius: 4, padding: '1px 5px', outline: 'none', fontFamily: 'inherit' }} />
            ) : (
              <div style={{ fontSize: 12, color: p.completato ? 'var(--gray-400)' : 'var(--gray-950)', textDecoration: p.completato ? 'line-through' : 'none', lineHeight: 1.4, cursor: isAdmin ? 'text' : 'default' }}
                onDoubleClick={() => { if (isAdmin) { setEditingId(p.id); setEditTesto(p.titolo); } }}>
                {p.titolo}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>{p.durata_min} min</div>
          </div>

          {/* Elimina (admin) */}
          {isAdmin && (
            <button onClick={() => deletePunto(p.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e2e8f0', padding: '2px', fontSize: 11, flexShrink: 0, marginTop: 2 }}
              onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
              onMouseOut={e => e.currentTarget.style.color = '#e2e8f0'}>
              <i className="ti ti-x" style={{ fontSize: 11 }} />
            </button>
          )}
        </div>
      ))}

      {/* Form aggiungi */}
      {addMode && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input value={newTitolo} onChange={e => setNewTitolo(e.target.value)}
            placeholder="Punto da aggiungere..."
            onKeyDown={e => { if (e.key === 'Enter') addPunto(); if (e.key === 'Escape') setAddMode(false); }}
            autoFocus
            style={{ fontSize: 12, border: '1px solid var(--gray-200)', borderRadius: 6, padding: '5px 8px', outline: 'none', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="number" value={newDurata} onChange={e => setNewDurata(Number(e.target.value))}
              min={1} max={60} style={{ width: 52, fontSize: 12, border: '1px solid var(--gray-200)', borderRadius: 6, padding: '4px 6px', outline: 'none', fontFamily: 'inherit' }} />
            <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>min</span>
            <button onClick={addPunto}
              style={{ flex: 1, fontSize: 11, padding: '4px 0', borderRadius: 6, border: 'none', background: 'var(--brand-800)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              Aggiungi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── KPI Drawer ────────────────────────────────────────────────────
function KpiDrawer({ tipo, data, onClose }) {
  const titles = {
    ritardi: 'Sviluppi in ritardo',
    sovra: 'Risorse sovra-allocate',
    sviluppi: 'Sviluppi senza data di rilascio',
    inAttesa: 'In attesa da più di 7 giorni',
  };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,18,41,0.45)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: 380, height: '100%', background: 'var(--color-surface)', boxShadow: '-8px 0 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.2s ease' }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
        <div style={{ background: 'var(--brand-800)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{titles[tipo]}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{data.length} elementi</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', padding: '5px 9px', fontSize: 16 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>Nessun elemento</div>}
          {tipo === 'ritardi' && data.map((t, i) => {
            const oggi = new Date(); oggi.setHours(0,0,0,0);
            const prev = new Date(t.data_rilascio);
            const gg = Math.round((oggi - prev) / 86400000);
            return (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '0.5px solid #fecaca', borderLeft: '3px solid #E24B4A', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--brand-700)', fontWeight: 600, marginBottom: 4 }}>{t.clienteNome} · {t.commessaNome}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)', marginBottom: 4 }}>{t.titolo}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#dc2626', background: '#fef2f2', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>-{gg}gg</span>
                  {t.colonna?.nome && <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{t.colonna.nome}</span>}
                  {t.assegnata_a && <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{t.assegnata_a}</span>}
                </div>
              </div>
            );
          })}
          {tipo === 'sovra' && data.map((r, i) => (
            <div key={i} style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '0.5px solid #fde68a', borderLeft: '3px solid #BA7517', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Initials name={r.nome} size={32} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>{r.nome}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>{r.giorni.toFixed(1)} gg allocati nel mese</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#854F0B', background: '#FAEEDA', borderRadius: 20, padding: '2px 10px' }}>{Math.round((r.giorni / 20) * 100)}%</span>
            </div>
          ))}
          {tipo === 'sviluppi' && data.map((a, i) => (
            <div key={i} style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '0.5px solid var(--gray-200)', borderLeft: '3px solid var(--brand-700)', borderRadius: 10 }}>
              <div style={{ fontSize: 10, color: 'var(--brand-700)', fontWeight: 600, marginBottom: 4 }}>{a.clienteNome} · {a.commessaNome}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)', marginBottom: 4 }}>{a.titolo}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {a.priorita && <span style={{ fontSize: 11, color: 'var(--gray-500)', background: 'var(--gray-100)', borderRadius: 20, padding: '1px 8px' }}>{a.priorita}</span>}
                {a.assegnata_a && <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{a.assegnata_a}</span>}
              </div>
            </div>
          ))}
          {tipo === 'inAttesa' && data.map((a, i) => {
            const giorni = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000);
            return (
              <div key={i} style={{ padding: '10px 12px', background: 'var(--color-surface)', border: '0.5px solid var(--gray-200)', borderLeft: '3px solid #BA7517', borderRadius: 10 }}>
                <div style={{ fontSize: 10, color: 'var(--brand-700)', fontWeight: 600, marginBottom: 4 }}>{a.clienteNome} · {a.commessaNome}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)', marginBottom: 6 }}>{a.titolo}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#854F0B', background: '#FAEEDA', borderRadius: 20, padding: '1px 8px', fontWeight: 600 }}>{giorni}gg in attesa</span>
                  {a.colonna?.nome && <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{a.colonna.nome}</span>}
                  {a.assegnata_a && <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{a.assegnata_a}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── KPI live ──────────────────────────────────────────────────────
function KpiLive() {
  const [kpi, setKpi] = useState({ ritardi: 0, sovraAllocati: 0, sviluppiSenzaData: 0, inAttesa: 0, efficacia: null });
  const [detailData, setDetailData] = useState(null); // { tipo, data }
  const [rawData, setRawData] = useState({ ritardi: [], sovra: [], sviluppi: [], inAttesa: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const sette = new Date(); sette.setDate(sette.getDate() - 7);
      const setteGiorniFA = sette.toISOString().slice(0, 10);
      const meseCorrente = today.slice(0, 7);

      // 1. Sviluppi workflow in ritardo (data_rilascio < oggi, non completate/annullate)
      const { data: colonne } = await supabase.from('workflow_colonne').select('id, nome');
      const colCompleteIds = (colonne || [])
        .filter(c => /complet|annullat|done/i.test(c.nome))
        .map(c => c.id);
      const colNuovaReq = (colonne || []).filter(c => /nuova.*rich|nuova richiesta/i.test(c.nome)).map(c => c.id);
      const colRaccolta = (colonne || []).filter(c => /raccolta.*req/i.test(c.nome)).map(c => c.id);
      const colPrimeTwo = [...colNuovaReq, ...colRaccolta];

      const [
        { data: sviluppiRitardi },
        { data: sviluppiSenzaData },
        { data: inAttesa },
        { data: assignments },
        { data: consuntivi },
      ] = await Promise.all([
        // Sviluppi in ritardo: data_rilascio < oggi, non in colonne complete
        supabase.from('attivita')
          .select('id, titolo, priorita, assegnata_a, data_rilascio, commessa:commessa_id(nome_commessa, client_id), colonna:colonna_id(nome)')
          .not('data_rilascio', 'is', null)
          .lt('data_rilascio', today)
          .not('colonna_id', 'is', null)
          .order('data_rilascio'),
        // Sviluppi senza data rilascio
        supabase.from('attivita')
          .select('id, titolo, priorita, assegnata_a, commessa:commessa_id(nome_commessa, client_id), colonna:colonna_id(nome)')
          .is('data_rilascio', null)
          .not('colonna_id', 'is', null)
          .order('created_at', { ascending: false }),
        // In attesa da >7gg nelle prime due colonne
        colPrimeTwo.length > 0
          ? supabase.from('attivita')
              .select('id, titolo, priorita, assegnata_a, created_at, commessa:commessa_id(nome_commessa, client_id), colonna:colonna_id(nome)')
              .in('colonna_id', colPrimeTwo)
              .lt('created_at', setteGiorniFA)
              .order('created_at')
          : Promise.resolve({ data: [] }),
        supabase.from('project_assignments').select('staff_name, gg_previsti').like('mese_anno', meseCorrente + '%'),
        supabase.from('consuntivi_globali').select('ore_tecniche, ore_pagamento').like('anno_mese', meseCorrente),
      ]);

      // Carica mappa clienti
      const { data: progetti } = await supabase.from('projects').select('id, nome_progetto');
      const clientiMap = {};
      (progetti || []).forEach(p => { clientiMap[p.id] = p.nome_progetto; });

      const arricchisci = (arr) => (arr || []).map(a => ({
        ...a,
        clienteNome: a.commessa?.client_id ? (clientiMap[a.commessa.client_id] || '—') : '—',
        commessaNome: a.commessa?.nome_commessa || '—',
      }));

      // Filtra sviluppi in ritardo escludendo colonne complete
      const ritardiFiltered = arricchisci(sviluppiRitardi || [])
        .filter(a => !colCompleteIds.includes(a.colonna_id) && !/complet|annullat|done/i.test(a.colonna?.nome || ''));

      const perRisorsa = {};
      (assignments || []).forEach(a => { perRisorsa[a.staff_name] = (perRisorsa[a.staff_name] || 0) + (parseFloat(a.gg_previsti) || 0); });
      const sovraList = Object.entries(perRisorsa).filter(([, v]) => v > 20).map(([n, g]) => ({ nome: n, giorni: g })).sort((a, b) => b.giorni - a.giorni);
      const totTec = (consuntivi || []).reduce((s, r) => s + (parseFloat(r.ore_tecniche) || 0), 0);
      const totPag = (consuntivi || []).reduce((s, r) => s + (parseFloat(r.ore_pagamento) || 0), 0);
      const eff = totTec > 0 ? Math.round((totPag / totTec) * 100) : null;

      setKpi({
        ritardi: ritardiFiltered.length,
        sovraAllocati: sovraList.length,
        sviluppiSenzaData: arricchisci(sviluppiSenzaData || []).filter(a => !colCompleteIds.includes(a.colonna_id)).length,
        inAttesa: (inAttesa || []).length,
        efficacia: eff,
      });
      setRawData({
        ritardi: ritardiFiltered,
        sovra: sovraList,
        sviluppi: arricchisci(sviluppiSenzaData || []).filter(a => !colCompleteIds.includes(a.colonna_id)),
        inAttesa: arricchisci(inAttesa || []),
      });
      setLoading(false);
    };
    load();
  }, []);

  const list = [
    { key: 'ritardi',  label: 'Sviluppi in ritardo',    value: kpi.ritardi,  icon: 'ti-clock-exclamation', bad: kpi.ritardi > 0, clickable: true },
    { key: 'inAttesa', label: 'In attesa >7gg',          value: kpi.inAttesa, icon: 'ti-hourglass', bad: (kpi.inAttesa || 0) > 0, clickable: true },
    { key: 'sovra',    label: 'Risorse sovra-allocate',  value: kpi.sovraAllocati, icon: 'ti-user-exclamation', bad: kpi.sovraAllocati > 0, clickable: true },
    { key: 'sviluppi', label: 'Sviluppi senza data',     value: kpi.sviluppiSenzaData, icon: 'ti-calendar-off', bad: kpi.sviluppiSenzaData > 5, clickable: true },
    { key: 'eff',      label: 'Efficacia mese',          value: kpi.efficacia !== null ? `${kpi.efficacia}%` : '—', icon: 'ti-chart-line', bad: kpi.efficacia !== null && kpi.efficacia < 60, clickable: false },
  ];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {list.map(k => (
          <div key={k.label}
            onClick={() => k.clickable && !loading && setDetailData({ tipo: k.key, data: rawData[k.key] || [] })}
            style={{ background: 'var(--gray-50)', borderRadius: 10, padding: '12px 14px', border: `1px solid ${k.bad ? '#fecaca' : '#e2e8f0'}`, cursor: k.clickable ? 'pointer' : 'default', transition: 'all .12s' }}
            onMouseOver={e => { if (k.clickable) { e.currentTarget.style.background = '#f0f7ff'; e.currentTarget.style.borderColor = '#bfdbfe'; } }}
            onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = k.bad ? '#fecaca' : '#e2e8f0'; }}>
            {loading ? <div style={{ height: 36, background: 'var(--gray-200)', borderRadius: 6 }} /> : (
              <>
                <div style={{ fontSize: 22, fontWeight: 600, color: k.bad ? '#dc2626' : '#0f172a', lineHeight: 1.1, marginBottom: 4 }}>{k.value}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <i className={`ti ${k.icon}`} aria-hidden="true" style={{ fontSize: 12 }} />{k.label}
                  {k.clickable && <i className="ti ti-chevron-right" aria-hidden="true" style={{ fontSize: 10, marginLeft: 'auto', color: 'var(--gray-400)' }} />}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {detailData && <KpiDrawer tipo={detailData.tipo} data={detailData.data} onClose={() => setDetailData(null)} />}
    </>
  );
}

// ── Storico ───────────────────────────────────────────────────────
function StoricoRiunioni() {
  const [riunioni, setRiunioni] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('delivery_riunioni').select('*').order('data', { ascending: false }).limit(20)
      .then(({ data }) => { setRiunioni(data || []); setLoading(false); });
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>Caricamento...</div>;

  if (!riunioni.length) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)' }}>
      <i className="ti ti-archive" style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.3 }} />
      <div style={{ fontSize: 13, fontWeight: 500 }}>Nessuna riunione archiviata</div>
    </div>
  );

  if (selected) {
    const disc = (selected.agenda_snapshot || []).filter(c => c.discusso);
    const nonDisc = (selected.agenda_snapshot || []).filter(c => !c.discusso);
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-500)', fontSize: 13, padding: '0 0 16px', fontFamily: 'inherit' }}>
          <i className="ti ti-arrow-left" style={{ fontSize: 14 }} /> Storico
        </button>
        <div style={{ background: 'var(--brand-800)', borderRadius: 14, padding: '18px 22px', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Settimana {selected.settimana_iso?.split('-W')[1]}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{fmtSettimana(selected.settimana_iso)}</div>
          {selected.note && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 12, lineHeight: 1.6, borderTop: '0.5px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>{selected.note}</div>}
        </div>
        {disc.map((c, i) => {
          const cat = getCat(c.categoria);
          return (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 12px', border: '0.5px solid var(--gray-200)', borderRadius: 10, background: 'var(--color-surface)', marginBottom: 6 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 2, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
              <div style={{ flex: 1 }}><span style={{ fontSize: 11, fontWeight: 600, color: cat.color, background: cat.bg, padding: '1px 8px', borderRadius: 20, marginRight: 6 }}>{cat.label}</span><span style={{ fontSize: 13, color: 'var(--gray-950)' }}>{c.testo}</span></div>
              <Initials name={c.autore} size={20} />
            </div>
          );
        })}
        {nonDisc.length > 0 && <div style={{ fontSize: 11, color: 'var(--gray-400)', margin: '12px 0 8px' }}>Non discusse ({nonDisc.length})</div>}
        {nonDisc.map((c, i) => {
          const cat = getCat(c.categoria);
          return (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 12px', border: '0.5px solid var(--gray-100)', borderRadius: 10, background: 'var(--gray-50)', marginBottom: 6, opacity: 0.6 }}>
              <div style={{ flex: 1 }}><span style={{ fontSize: 11, fontWeight: 600, color: cat.color, background: cat.bg, padding: '1px 8px', borderRadius: 20, marginRight: 6 }}>{cat.label}</span><span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{c.testo}</span></div>
              <Initials name={c.autore} size={20} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {riunioni.map(r => {
        const carte = r.agenda_snapshot || [];
        const disc = carte.filter(c => c.discusso).length;
        const dec = carte.filter(c => c.categoria === 'decisione' && c.discusso).length;
        return (
          <div key={r.id} onClick={() => setSelected(r)}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--color-surface)', border: '0.5px solid var(--gray-200)', borderRadius: 12, cursor: 'pointer' }}
            onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.background = '#fff'}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-calendar-event" style={{ fontSize: 18, color: 'var(--brand-700)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)' }}>Settimana {r.settimana_iso?.split('-W')[1]} — {fmtSettimana(r.settimana_iso)}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>{disc} punti discussi{dec > 0 ? ` · ${dec} decisioni` : ''}</div>
            </div>
            <i className="ti ti-chevron-right" style={{ fontSize: 14, color: 'var(--gray-400)' }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export function DeliveryRoom({ currentStaff, staff, isAdmin, onModal }) {
  const [activeTab, setActiveTab] = useState('riunione');
  const [vista, setVista] = useState('tavolo');
  const [carte, setCarte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [landed, setLanded] = useState(false);
  const settimana = getSettimanaIso();
  const autore = currentStaff ? `${currentStaff.cognome} ${currentStaff.nome}` : 'Utente';

  const carteInitRef = useRef(false);
  useEffect(() => {
    if (carteInitRef.current) return;
    carteInitRef.current = true;
    loadCarte();
  }, []);

  const loadCarte = async () => {
    const { data } = await supabase.from('delivery_agenda').select('*').eq('settimana_iso', settimana).order('ordine');
    setCarte(data || []);
    setLoading(false);
    setLanded(true);
  };

  const toggleDiscusso = async (carta) => {
    const nuovoValore = !carta.discusso;
    await supabase.from('delivery_agenda').update({ discusso: nuovoValore }).eq('id', carta.id);
    setCarte(prev => prev.map(c => c.id === carta.id ? { ...c, discusso: nuovoValore } : c));
  };

  const deleteCarta = async (id) => {
    if (!window.confirm('Rimuovere questa carta?')) return;
    await supabase.from('delivery_agenda').delete().eq('id', id);
    setCarte(prev => prev.filter(c => c.id !== id));
  };

  const onSaveNuova = (data) => {
    setCarte(prev => [...prev, data]);
    onModal && onModal(null);
    setLanded(false);
    setTimeout(() => setLanded(true), 50);
  };

  const onArchivia = () => {
    onModal && onModal(null);
    loadCarte();
  };

  const nonDiscusse = carte.filter(c => !c.discusso);
  const discusse = carte.filter(c => c.discusso);

  // Posizioni sparse sul tavolo
  const cols = 4;
  const getPos = (i) => ({
    left: 20 + (i % cols) * 175,
    top: 12 + Math.floor(i / cols) * 215,
  });

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--gray-100)' }}>
      <style>{`
        @keyframes cardFly {
          0%  { opacity:0; transform: rotate(0deg) translateY(-120px) scale(0.6); }
          60% { opacity:1; }
          80% { transform: rotate(var(--card-rot, -3deg)) translateY(8px) scale(1.04); }
          100%{ transform: rotate(var(--card-rot, -3deg)) translateY(0) scale(1); }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--gray-950)' }}>Delivery Room</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Settimana {settimana.split('-W')[1]} · {fmtSettimana(settimana)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {activeTab === 'riunione' && (
              <button onClick={() => onModal && onModal('archivia', { settimana, carte, onSave: onArchivia })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20, border: '0.5px solid var(--gray-200)', background: 'var(--color-surface)', color: 'var(--gray-500)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                <i className="ti ti-archive" style={{ fontSize: 13 }} /> Archivia riunione
              </button>
            )}
          </div>
        </div>

        {/* Nav tab */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
          {[{ key: 'riunione', label: 'Riunione' }, { key: 'storico', label: 'Storico' }].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ padding: '8px 20px', border: 'none', borderBottom: activeTab === t.key ? '2.5px solid #001d47' : '2.5px solid transparent', background: 'transparent', color: activeTab === t.key ? 'var(--brand-800)' : 'var(--gray-500)', fontWeight: activeTab === t.key ? 600 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', marginBottom: -1 }}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'riunione' && (
          <>
            <KpiLive />

            {/* Layout principale: scaletta sinistra + tavolo centro */}
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

            {/* Scaletta sinistra */}
            <div style={{ width: 240, flexShrink: 0, background: 'var(--color-surface)', borderRadius: 14, border: '0.5px solid var(--gray-200)', padding: '16px 14px' }}>
              <Scaletta settimana={settimana} isAdmin={isAdmin} />
            </div>

            {/* Tavolo + lista */}
            <div style={{ flex: 1, minWidth: 0 }}>

            {/* Toggle vista + lancia */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 6, background: 'var(--gray-200)', borderRadius: 20, padding: 3 }}>
                {[{ key: 'tavolo', icon: 'ti-cards', label: 'Tavolo' }, { key: 'lista', icon: 'ti-list', label: 'Lista' }].map(v => (
                  <button key={v.key} onClick={() => setVista(v.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 20, border: 'none', background: vista === v.key ? 'var(--color-surface)' : 'transparent', color: vista === v.key ? 'var(--gray-950)' : 'var(--gray-500)', fontSize: 12, fontWeight: vista === v.key ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s' }}>
                    <i className={`ti ${v.icon}`} style={{ fontSize: 13 }} /> {v.label}
                  </button>
                ))}
              </div>
              <button onClick={() => onModal && onModal('nuova', { autore, settimana, onSave: onSaveNuova })}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', borderRadius: 20, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <i className="ti ti-plus" style={{ fontSize: 13 }} /> Lancia una carta
              </button>
            </div>

            {/* Tavolo */}
            {vista === 'tavolo' && (
              <div style={{ background: 'var(--gray-900)', borderRadius: 20, padding: '20px 20px 28px' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 18 }}>
                  {carte.length} carte sul tavolo
                </div>
                {loading ? (
                  <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: 13 }}>Caricamento...</div>
                ) : carte.length === 0 ? (
                  <div style={{ height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>Il tavolo è vuoto</div>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>Lancia la prima carta per questa settimana</div>
                  </div>
                ) : (
                  <div style={{ position: 'relative', height: Math.max(220, Math.ceil(carte.length / cols) * 215 + 20) }}>
                    {carte.map((c, i) => {
                      const pos = getPos(i);
                      return (
                        <div key={c.id} style={{ position: 'absolute', left: pos.left, top: pos.top, zIndex: i + 1 }}>
                          <Carta carta={c} index={i} onClick={(carta) => onModal && onModal('detail', { carta, onToggle: toggleDiscusso, onDelete: deleteCarta })} landed={landed} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Lista */}
            {vista === 'lista' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {carte.length === 0 && !loading && (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>Nessuna carta per questa settimana</div>
                )}
                {nonDiscusse.map(c => {
                  const cat = getCat(c.categoria);
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--color-surface)', border: '0.5px solid var(--gray-200)', borderRadius: 12, cursor: 'pointer' }}>
                      <div onClick={() => toggleDiscusso(c)}
                        style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid #e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--color-surface)' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: cat.bg, color: cat.color, flexShrink: 0 }}>{cat.label}</span>
                      <div style={{ flex: 1, fontSize: 13, color: 'var(--gray-950)' }} onClick={() => onModal && onModal('detail', c)}>{c.testo}</div>
                      <Initials name={c.autore} size={26} />
                    </div>
                  );
                })}
                {discusse.length > 0 && (
                  <>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', padding: '8px 0 4px', textAlign: 'center' }}>— discusse —</div>
                    {discusse.map(c => {
                      const cat = getCat(c.categoria);
                      return (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: 'var(--gray-50)', border: '0.5px solid var(--gray-100)', borderRadius: 12, opacity: 0.65, cursor: 'pointer' }}>
                          <div onClick={() => toggleDiscusso(c)}
                            style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid #86efac', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f0fdf4' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: cat.bg, color: cat.color, flexShrink: 0 }}>{cat.label}</span>
                          <div style={{ flex: 1, fontSize: 13, color: 'var(--gray-500)', textDecoration: 'line-through' }}>{c.testo}</div>
                          <Initials name={c.autore} size={26} />
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
            </div> {/* fine tavolo+lista */}
            </div> {/* fine layout principale */}
          </>
        )}

        {activeTab === 'storico' && <StoricoRiunioni />}
      </div>
    </div>
  );
}
