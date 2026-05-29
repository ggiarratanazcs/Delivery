import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DatePicker } from './DatePicker.jsx';
import { RaccoltaSemplificata } from './RaccoltaSemplificata.jsx';

// ─────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────
const SISTEMI = ['Teseo7', 'Cassiopea', 'InfoVision'];

const STATI = [
  { val: '1', label: 'Prima Stesura' },
  { val: '2', label: 'In Revisione' },
  { val: '3', label: 'Versione Definitiva' },
];

const STEPS = ['Intestazione', 'Contesto', 'Funzionalità', 'Considerazioni', 'Sintesi'];

const EMPTY_FUNZIONALITA = () => ({
  id: Date.now() + Math.random(),
  nome: '',
  trigger: '',
  attore: '',
  azioni: '',
  frequenza: '',
  vincoli: '',
  rischi: '',
});

// ─────────────────────────────────────────────
// TOOLTIP INFO — piccolo ℹ non invasivo
// ─────────────────────────────────────────────
function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={() => setShow(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#94a3b8', display: 'flex', alignItems: 'center', lineHeight: 1 }}
        title="Info">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </button>
      {show && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 9999,
          background: 'var(--brand-800)', color: '#fff', fontSize: 11, lineHeight: 1.5,
          padding: '8px 12px', borderRadius: 8, width: 220,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)', marginTop: 4,
          whiteSpace: 'normal'
        }}>
          {text}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
// CLIENTE DROPDOWN — cerca tra i clienti del portale
// ─────────────────────────────────────────────
function ClienteDropdown({ value, onChange, clients }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) setTimeout(() => searchRef.current?.focus(), 30);
  }, [open]);

  const filtered = (clients || []).filter(c =>
    !search || c.nome_progetto.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${open ? '#2563eb' : '#e2e8f0'}`, background: '#f8fafc', cursor: 'pointer', minHeight: 38, transition: 'border-color 0.15s' }}>
        <span style={{ fontSize: 13, color: value ? '#0f172a' : '#94a3b8', fontStyle: value ? 'normal' : 'italic' }}>
          {value || 'Seleziona cliente…'}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {open && (
        <div style={{
          position: 'fixed', background: '#fff', border: '1px solid #e2e8f0',
          borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', zIndex: 9999,
          overflow: 'hidden', width: 'inherit', minWidth: 260,
        }}
        ref={el => {
          if (el && ref.current) {
            const r = ref.current.getBoundingClientRect();
            el.style.top = (r.bottom + 4) + 'px';
            el.style.left = r.left + 'px';
            el.style.width = r.width + 'px';
          }
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
            <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca cliente…"
              style={{ width: '100%', padding: '5px 8px', fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 6, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              style={{ padding: '8px 14px', fontSize: 13, cursor: 'pointer', color: '#94a3b8', fontStyle: 'italic' }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              — Nessuno —
            </div>
            {filtered.map(c => {
              const sel = value === c.nome_progetto;
              return (
                <div key={c.id} onClick={() => { onChange(c.nome_progetto); setOpen(false); setSearch(''); }}
                  style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', background: sel ? '#eff6ff' : 'transparent', color: sel ? '#2563eb' : '#0f172a', fontWeight: sel ? 600 : 400 }}
                  onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseOut={e => { if (!sel) e.currentTarget.style.background = sel ? '#eff6ff' : 'transparent'; }}>
                  {c.nome_progetto}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '10px 14px', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nessun cliente trovato</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// FIELD LABEL con tooltip opzionale
// ─────────────────────────────────────────────
function FieldLabel({ children, info }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {children}
      </label>
      {info && <InfoTooltip text={info} />}
    </div>
  );
}

// ─────────────────────────────────────────────
// CAMPO TESTO CON STATO LOCALE (fix bug focus)
// ─────────────────────────────────────────────
function FieldText({ label, info, value, onChange, placeholder, mono, rows }) {
  const [local, setLocal] = useState(value || '');
  useEffect(() => { setLocal(value || ''); }, [value]);

  const style = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a',
    outline: 'none', background: '#f8fafc', boxSizing: 'border-box',
    fontFamily: mono ? 'IBM Plex Mono, monospace' : 'IBM Plex Sans, sans-serif',
    transition: 'border-color 0.15s', resize: rows ? 'vertical' : undefined,
  };

  return (
    <div>
      {label && <FieldLabel info={info}>{label}</FieldLabel>}
      {rows ? (
        <textarea
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={e => onChange(e.target.value)}
          placeholder={placeholder || ''}
          rows={rows}
          style={{ ...style, lineHeight: 1.5 }}
          onFocus={e => e.target.style.borderColor = '#2563eb'}
        />
      ) : (
        <input
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={e => onChange(e.target.value)}
          placeholder={placeholder || ''}
          style={style}
          onFocus={e => e.target.style.borderColor = '#2563eb'}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────
function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 72 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: done ? 'var(--brand-800)' : active ? '#2563eb' : '#e2e8f0',
                color: (done || active) ? '#fff' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                boxShadow: active ? '0 0 0 4px #bfdbfe' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color: active ? 'var(--brand-800)' : done ? '#64748b' : '#94a3b8', whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? 'var(--brand-800)' : '#e2e8f0', marginBottom: 16, transition: 'background 0.2s' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 1 — INTESTAZIONE
// ─────────────────────────────────────────────
function StepIntestazione({ data, onChange, clients }) {
  const upd = (k, v) => onChange({ ...data, [k]: v });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Cliente + Sistema */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <div>
          <FieldLabel>Cliente *</FieldLabel>
          <ClienteDropdown
            value={data.cliente || ''}
            onChange={v => upd('cliente', v)}
            clients={clients}
          />
        </div>
        <div>
          <FieldLabel>Sistema *</FieldLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {SISTEMI.map(s => (
              <button key={s} onClick={() => upd('sistema', s)}
                style={{ padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${data.sistema === s ? 'var(--brand-800)' : '#e2e8f0'}`, background: data.sistema === s ? 'var(--brand-800)' : '#fff', color: data.sistema === s ? '#fff' : '#374151', fontSize: 13, fontWeight: data.sistema === s ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', textAlign: 'left' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Titolo documento */}
      <FieldText
        label="Titolo documento *"
        value={data.titolo} onChange={v => upd('titolo', v)} placeholder="es. Nuovo campo DB Tipo Componente" />



      {/* Versione + Data + Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <FieldText label="Versione" value={data.versione} onChange={v => upd('versione', v)} placeholder="es. 1.0" mono />
        <div>
          <FieldLabel>Data</FieldLabel>
          <div style={{ position: 'relative', zIndex: 500 }}>
            <DatePicker value={data.data || ''} onChange={v => upd('data', v)} />
          </div>
        </div>
        <FieldText label="Area" value={data.area} onChange={v => upd('area', v)} placeholder="es. DB, UI, Produzione" />
      </div>

      {/* Stato */}
      <div>
        <FieldLabel>Stato documento</FieldLabel>
        <div style={{ display: 'flex', gap: 8 }}>
          {STATI.map(s => (
            <button key={s.val} onClick={() => upd('stato', s.val)}
              style={{ flex: 1, padding: '9px 8px', borderRadius: 8, border: `1.5px solid ${data.stato === s.val ? 'var(--brand-800)' : '#e2e8f0'}`, background: data.stato === s.val ? 'var(--brand-800)' : '#fff', color: data.stato === s.val ? '#fff' : '#374151', fontSize: 12, fontWeight: data.stato === s.val ? 700 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 2 — CONTESTO & ATTORI
// ─────────────────────────────────────────────
function StepContesto({ data, onChange, readOnly }) {
  const upd = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
      {readOnly && <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'not-allowed' }} />}
      <FieldText label="Scopo e Contesto *" rows={5}
        info="Descrivi l'obiettivo del requisito: cosa si vuole realizzare e perché, in quale processo aziendale si inserisce. Evita dettagli tecnici qui — quelli vanno nelle funzionalità."
        value={data.scopo} onChange={v => upd('scopo', v)}
        placeholder="Es. Realizzazione di un campo aggiuntivo in DB che identifica il tipo componente nella lista dei materiali…" />

      <FieldText label="Attori principali" rows={3}
        info="Chi interagisce direttamente con la funzionalità. Specifica nome e ruolo (es. 'Personale produzione — inserimento e gestione distinte base')."
        value={data.attoriPrincipali} onChange={v => upd('attoriPrincipali', v)}
        placeholder="Es. Personale che gestisce le distinte base" />

      <FieldText label="Attori secondari" rows={2}
        info="Chi è coinvolto indirettamente o riceve output dalla funzionalità (es. responsabile di magazzino che legge i dati)."
        value={data.attoriSecondari} onChange={v => upd('attoriSecondari', v)}
        placeholder="Es. Addetti amministrativi, Responsabile produzione" />
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 3 — FUNZIONALITÀ
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// STEP 3 — FUNZIONALITÀ (Layout sidebar sinistra + form destra)
// ─────────────────────────────────────────────
const CAMPI_FUNZ = [
  { key: 'trigger', label: 'Condizione di partenza / Trigger', rows: 2,
    info: "Quale evento o condizione avvia questa funzionalità?",
    placeholder: 'Es. Apertura maschera distinta base con tipo componente attivato' },
  { key: 'attore', label: 'Attore', rows: 1,
    info: "Chi esegue questa specifica funzionalità.",
    placeholder: "Es. Operatori addetti all'inserimento DB" },
  { key: 'azioni', label: 'Sequenza principale delle azioni', rows: 5,
    info: "Descrivi passo per passo le azioni che l'utente compie e come il sistema risponde.",
    placeholder: "Es. 1. L'utente apre la distinta base\n2. Il sistema mostra il campo\n3. L'utente seleziona il valore dal menu a tendina\n4. Il sistema propone il legame di default" },
  { key: 'frequenza', label: 'Frequenza / Obiettivo di prestazione', rows: 2,
    info: "Con quale frequenza viene usata? Ci sono requisiti di performance?",
    placeholder: 'Es. Operazione occasionale, nessun requisito di prestazione specifico' },
  { key: 'vincoli', label: 'Vincoli / Regole di business', rows: 3,
    info: "Quali regole devono essere rispettate? Validazioni, unicità, condizioni obbligatorie.",
    placeholder: 'Es. Un tipo componente deve essere impostato una sola volta' },
  { key: 'rischi', label: 'Problemi / Rischi', rows: 2,
    info: "Eventuali criticità tecniche, incompatibilità con dati esistenti.",
    placeholder: 'Es. Ndc' },
];

function StepFunzionalita({ funzionalita, setFunzionalita, readOnly }) {
  const [attiva, setAttiva] = useState(null);

  const add = () => {
    const nf = EMPTY_FUNZIONALITA();
    setFunzionalita(prev => [...prev, nf]);
    setAttiva(nf.id);
  };
  const remove = (id) => {
    setFunzionalita(prev => {
      const next = prev.filter(f => f.id !== id);
      if (attiva === id) setAttiva(next.length > 0 ? next[next.length - 1].id : null);
      return next;
    });
  };
  const update = (id, updated) => setFunzionalita(prev => prev.map(f => f.id === id ? updated : f));

  const funzAttiva = funzionalita.find(f => f.id === attiva);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Layout due colonne */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', height: 390 }}>

        {/* SIDEBAR — lista funzionalità */}
        <div style={{ borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
          {/* Bottone aggiungi */}
          <button onClick={add}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', border: 'none', borderBottom: '1px solid #e2e8f0', background: '#fff', color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Aggiungi
          </button>

          {/* Lista */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {funzionalita.length === 0 && (
              <div style={{ padding: '16px 12px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.5 }}>
                Nessuna funzionalità.<br/>Clicca Aggiungi.
              </div>
            )}
            {funzionalita.map((f, i) => {
              const sel = f.id === attiva;
              const compilati = CAMPI_FUNZ.filter(c => f[c.key]?.trim()).length;
              return (
                <div key={f.id}
                  onClick={() => setAttiva(f.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #e2e8f0', background: sel ? '#eff6ff' : 'transparent', borderRight: sel ? '3px solid #2563eb' : '3px solid transparent', transition: 'all 0.12s' }}
                  onMouseOver={e => { if (!sel) e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseOut={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: sel ? '#2563eb' : '#e2e8f0', color: sel ? '#fff' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: sel ? 700 : 500, color: sel ? 'var(--brand-800)' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {f.nome || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Senza titolo</span>}
                    </div>
                    {compilati > 0 && (
                      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>{compilati}/{CAMPI_FUNZ.length} campi</div>
                    )}
                  </div>
                  <button onClick={e => { e.stopPropagation(); remove(f.id); }}
                    style={{ padding: '2px 5px', borderRadius: 4, border: 'none', background: 'transparent', color: '#cbd5e1', fontSize: 13, cursor: 'pointer', lineHeight: 1, flexShrink: 0 }}
                    onMouseOver={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = '#fee2e2'; }}
                    onMouseOut={e => { e.currentTarget.style.color = '#cbd5e1'; e.currentTarget.style.background = 'transparent'; }}>
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* FORM DESTRA */}
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {!funzAttiva ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13, fontStyle: 'italic', padding: 24, textAlign: 'center' }}>
              {funzionalita.length === 0
                ? 'Aggiungi una funzionalità dalla sidebar per iniziare'
                : 'Seleziona una funzionalità dalla sidebar'}
            </div>
          ) : (
            <>
              {/* Header funzionalità attiva */}
              <div style={{ padding: '10px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', flexShrink: 0, position: 'sticky', top: 0, zIndex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', letterSpacing: '0.04em' }}>
                  FUNZIONALITÀ {funzionalita.findIndex(f => f.id === attiva) + 1}
                </div>
              </div>

              {/* Campi */}
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <FieldText label="Titolo *"
                  value={funzAttiva.nome}
                  onChange={v => update(attiva, { ...funzAttiva, nome: v })}
                  placeholder="Es. Tabella Tipi Componenti" />
                {CAMPI_FUNZ.map(c => (
                  <FieldText key={c.key}
                    label={c.label} info={c.info} rows={c.rows}
                    value={funzAttiva[c.key]}
                    onChange={v => update(attiva, { ...funzAttiva, [c.key]: v })}
                    placeholder={c.placeholder} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 4 — CONSIDERAZIONI FINALI
// ─────────────────────────────────────────────
function StepConsiderazioni({ data, onChange, readOnly }) {
  const upd = (k, v) => onChange({ ...data, [k]: v });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, position: 'relative' }}>
      {readOnly && <div style={{ position: 'absolute', inset: 0, zIndex: 10, cursor: 'not-allowed' }} />}
      <FieldText label="Proposta implementativa" rows={4}
        info="Indicazioni su come realizzare tecnicamente il requisito: tabelle da creare, modifiche a maschere esistenti, interfacce con altri moduli. Può rimanere vuoto se non ci sono indicazioni specifiche."
        value={data.proposta} onChange={v => upd('proposta', v)}
        placeholder="Es. Nulla da segnalare rispetto a quanto indicato nei punti precedenti — oppure descrivi approccio tecnico suggerito" />

      <FieldText label="Criteri di accettazione" rows={3}
        info="Quando si considera il requisito soddisfatto? Eventuali test da superare, date di consegna richieste, condizioni di collaudo."
        value={data.criteri} onChange={v => upd('criteri', v)}
        placeholder="Es. La funzionalità è accettata quando… / Data di consegna richiesta: …" />



      <FieldText label="Note aggiuntive" rows={2}
        info="Qualsiasi altra informazione rilevante non coperta dalle sezioni precedenti."
        value={data.note} onChange={v => upd('note', v)}
        placeholder="Note libere…" />
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP 5 — SINTESI
// ─────────────────────────────────────────────
function StepSintesi({ intestazione, contesto, funzionalita, considerazioni }) {
  const codice = [
    intestazione.cliente?.trim().replace(/\s+/g, '') || 'CLIENTE',
    intestazione.sistema || 'SISTEMA',
    intestazione.titolo?.trim().replace(/\s+/g, '') || 'TITOLO',
  ].join('.');

  const statoLabel = STATI.find(s => s.val === intestazione.stato)?.label || '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header navy */}
      <div style={{ background: 'var(--brand-800)', borderRadius: 10, padding: '14px 18px', color: '#fff' }}>
        <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 3, fontFamily: 'IBM Plex Mono, monospace' }}>{codice}</div>
        <div style={{ fontSize: 17, fontWeight: 800 }}>{intestazione.titolo || '—'}</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 3 }}>
          {intestazione.sistema || '—'} · {intestazione.area || '—'} · v{intestazione.versione || '—'} · {statoLabel}
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Cliente', val: intestazione.cliente || '—' },
          { label: 'Funzionalità', val: funzionalita.length },
          { label: 'Stato', val: statoLabel },
        ].map(({ label, val }) => (
          <div key={label} style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Scopo */}
      {contesto.scopo && (
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Scopo</div>
          <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{contesto.scopo.slice(0, 200)}{contesto.scopo.length > 200 ? '…' : ''}</div>
        </div>
      )}

      {/* Lista funzionalità */}
      {funzionalita.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Funzionalità</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {funzionalita.map((f, i) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--brand-800)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: '#0f172a', fontWeight: 500 }}>{f.nome || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Senza nome</span>}</span>
                {f.attore && <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto' }}>{f.attore}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// EXPORT DOCX — genera il Word con docx-js via API
// ─────────────────────────────────────────────
async function exportDocx({ intestazione, contesto, funzionalita, considerazioni }) {
  // Carica logo ZCS come base64
  let logoBase64 = null;
  let logoType = 'png';
  try {
    const res = await fetch('/Zucchetti-Centro-Sistemi.png');
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      logoBase64 = btoa(binary);
    }
  } catch (e) { console.warn('Logo non trovato:', e); }

  const codice = [
    intestazione.cliente?.trim().replace(/\s+/g, '') || 'CLIENTE',
    intestazione.sistema || 'SISTEMA',
    intestazione.titolo?.trim().replace(/\s+/g, '') || 'TITOLO',
  ].join('.');

  const statoLabel = STATI.find(s => s.val === intestazione.stato)?.label || '';
  const dataFmt = intestazione.data ? new Date(intestazione.data).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT');

  // Scriviamo il JS per il server-side docx generation
  const script = `
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
        ShadingType, VerticalAlign, ImageRun, PageNumber, LevelFormat,
        TabStopType, TabStopPosition } = require('docx');
const fs = require('fs');

${logoBase64 ? `const logoData = Buffer.from('${logoBase64}', 'base64');` : 'const logoData = null;'}

const NAVY = '001d47';
const LIGHT = 'e8f0fe';
const BORDER_GRAY = { style: '${BorderStyle.SINGLE}', size: 1, color: 'CCCCCC' };
const NO_BORDER = { style: '${BorderStyle.NONE}', size: 0, color: 'FFFFFF' };
const borders = { top: BORDER_GRAY, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY };
const noBorders = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

const cell = (text, opts = {}) => new TableCell({
  borders: opts.noBorder ? noBorders : borders,
  width: { size: opts.width || 4680, type: '${WidthType.DXA}' },
  shading: opts.shading ? { fill: opts.shading, type: '${ShadingType.CLEAR}' } : undefined,
  margins: { top: 80, bottom: 80, left: 140, right: 140 },
  verticalAlign: '${VerticalAlign.CENTER}',
  children: [new Paragraph({
    children: [new TextRun({ text: String(text || '—'), bold: opts.bold || false, color: opts.color || '000000', font: 'Arial', size: opts.size || 20 })],
    alignment: opts.align || '${AlignmentType.LEFT}',
  })]
});

const h = (text, level) => new Paragraph({
  heading: level,
  children: [new TextRun({ text, font: 'Arial', color: level === '${HeadingLevel.HEADING_1}' ? NAVY : '001d47', bold: true })],
  spacing: { before: 240, after: 120 },
});

const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text: String(text || ''), font: 'Arial', size: 20, color: opts.color || '1e293b', bold: opts.bold || false, italics: opts.italic || false })],
  spacing: { before: 60, after: 60 },
  alignment: opts.align || '${AlignmentType.LEFT}',
});

const multilineP = (text) => {
  if (!text) return [p('—')];
  return text.split('\\n').map(line => p(line.trim()));
};

const divider = () => new Paragraph({
  border: { bottom: { style: '${BorderStyle.SINGLE}', size: 6, color: 'e2e8f0', space: 1 } },
  spacing: { before: 120, after: 120 },
  children: [],
});

// Header con logo
const headerChildren = logoData
  ? [new Paragraph({
      children: [new ImageRun({ data: logoData, transformation: { width: 140, height: 40 }, type: 'png' })],
      alignment: '${AlignmentType.LEFT}',
    })]
  : [p('ZCS — Zucchetti Centro Sistemi', { bold: true, color: NAVY })];

// Footer con numero pagina
const footerPara = new Paragraph({
  children: [
    new TextRun({ text: '${codice} — v${intestazione.versione || '1.0'} — ${dataFmt}   |   Pag. ', font: 'Arial', size: 18, color: '64748b' }),
    new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '64748b' }),
    new TextRun({ text: ' di ', font: 'Arial', size: 18, color: '64748b' }),
    new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: '64748b' }),
  ],
  alignment: '${AlignmentType.RIGHT}',
});

// Tabella intestazione documento
const metaTable = new Table({
  width: { size: 9026, type: '${WidthType.DXA}' },
  columnWidths: [2256, 2257, 2256, 2257],
  rows: [
    new TableRow({ children: [
      cell('Versione', { width: 2256, shading: LIGHT, bold: true }),
      cell('${intestazione.versione || '1.0'}', { width: 2257 }),
      cell('Data', { width: 2256, shading: LIGHT, bold: true }),
      cell('${dataFmt}', { width: 2257 }),
    ]}),
    new TableRow({ children: [
      cell('Area', { width: 2256, shading: LIGHT, bold: true }),
      cell('${intestazione.area || ''}', { width: 2257 }),
      cell('Sistema', { width: 2256, shading: LIGHT, bold: true }),
      cell('${intestazione.sistema || ''}', { width: 2257 }),
    ]}),
    new TableRow({ children: [
      cell('Stato', { width: 2256, shading: LIGHT, bold: true }),
      cell('${intestazione.stato || ''} — ${statoLabel}', { width: 2257 }),
      cell('Cliente', { width: 2256, shading: LIGHT, bold: true }),
      cell('${intestazione.cliente || ''}', { width: 2257 }),
    ]}),
  ],
});

// Funzionalità
const funzBlocks = [];
${funzionalita.map((f, i) => `
funzBlocks.push(
  h('3.2.${i + 1} ${f.nome || `Funzionalità ${i + 1}`}', '${HeadingLevel.HEADING_2}'),
  p('Nome identificativo: ${f.nome || ''}'),
);
if ('${f.trigger}') { funzBlocks.push(p('Condizione di partenza:', { bold: true }), ...multilineP('${(f.trigger || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')); }
if ('${f.attore}') { funzBlocks.push(p('Attore: ${(f.attore || '').replace(/'/g, "\\'")}', { bold: false })); }
if ('${f.azioni}') { funzBlocks.push(p('Sequenza principale delle azioni:', { bold: true }), ...multilineP('${(f.azioni || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')); }
if ('${f.frequenza}') { funzBlocks.push(p('Frequenza / Obiettivo di prestazione:', { bold: true }), ...multilineP('${(f.frequenza || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')); }
if ('${f.vincoli}') { funzBlocks.push(p('Vincoli / Regole di business:', { bold: true }), ...multilineP('${(f.vincoli || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')); }
if ('${f.rischi}') { funzBlocks.push(p('Problemi / Rischi:', { bold: true }), ...multilineP('${(f.rischi || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')); }
funzBlocks.push(divider());
`).join('')}

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: '0d4d8a' },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
    headers: { default: new Header({ children: [...headerChildren, new Paragraph({ border: { bottom: { style: '${BorderStyle.SINGLE}', size: 4, color: '001d47', space: 1 } }, spacing: { after: 60 }, children: [] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ border: { top: { style: '${BorderStyle.SINGLE}', size: 2, color: 'e2e8f0', space: 1 } }, spacing: { before: 80 }, children: [] }), footerPara] }) },
    children: [
      // Titolo documento
      new Paragraph({ children: [new TextRun({ text: 'SPECIFICA DEI REQUISITI', font: 'Arial', size: 20, color: '64748b', bold: true })], spacing: { before: 0, after: 80 } }),
      new Paragraph({ heading: '${HeadingLevel.HEADING_1}', children: [new TextRun({ text: '${(intestazione.titolo || '').replace(/'/g, "\\'")}', font: 'Arial', size: 36, bold: true, color: NAVY })] }),
      new Paragraph({ children: [new TextRun({ text: '${codice}', font: 'Arial', size: 18, color: '64748b', italics: true })], spacing: { before: 0, after: 240 } }),
      metaTable,
      new Paragraph({ children: [], spacing: { before: 240 } }),
      divider(),

      // 1. Scopo e Contesto
      h('1. Scopo e Contesto', '${HeadingLevel.HEADING_1}'),
      ...multilineP('${(contesto.scopo || 'Nulla da segnalare.').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'),

      // 2. Attori
      h('2. Attori', '${HeadingLevel.HEADING_1}'),
      p('Attori principali:', { bold: true }),
      ...multilineP('${(contesto.attoriPrincipali || '—').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'),
      p('Attori secondari:', { bold: true }),
      ...multilineP('${(contesto.attoriSecondari || '—').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'),

      // 3. Requisiti
      h('3. Requisiti', '${HeadingLevel.HEADING_1}'),
      h('3.1 Informazioni Generali', '${HeadingLevel.HEADING_2}'),
      p('Precondizioni di attivazione:', { bold: true }),
      p('${(contesto.scopo || '').split('.')[0]?.replace(/'/g, "\\'") || 'Nulla da segnalare'}'),
      p('Attori principali:', { bold: true }),
      ...multilineP('${(contesto.attoriPrincipali || '—').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'),

      h('3.2 Funzionalità', '${HeadingLevel.HEADING_2}'),
      ...funzBlocks,

      // 4. Considerazioni finali
      h('4. Considerazioni finali', '${HeadingLevel.HEADING_1}'),
      h('4.1 Proposta implementativa', '${HeadingLevel.HEADING_2}'),
      ...multilineP('${(considerazioni.proposta || 'Nulla da segnalare rispetto a quanto indicato nei punti precedenti.').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'),
      h('4.2 Criteri di accettazione', '${HeadingLevel.HEADING_2}'),
      ...multilineP('${(considerazioni.criteri || 'Nulla da segnalare.').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'),
      h('4.3 Priorità', '${HeadingLevel.HEADING_2}'),
      p('${considerazioni.priorita || '—'}'),
      ...(considerazioni.note ? [h('Note aggiuntive', '${HeadingLevel.HEADING_2}'), ...multilineP('${(considerazioni.note || '').replace(/'/g, "\\'").replace(/\n/g, '\\n')}')] : []),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/tmp/sdr_output.docx', buf);
  console.log('OK');
});
`;

  // Esegui via Anthropic API (Claude genera il file)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: `Run this Node.js script and confirm it works:\n\`\`\`javascript\n${script}\n\`\`\`` }]
      })
    });
  } catch (e) {}

  // Fallback: usa SheetJS-style approccio diretto in browser con docx CDN
  // Scriviamo il file direttamente usando la libreria docx via CDN
  return new Promise((resolve, reject) => {
    const scriptEl = document.createElement('script');
    scriptEl.src = 'https://unpkg.com/docx@9.6.1/build/index.js';
    scriptEl.onload = async () => {
      try {
        const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
          Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
          ShadingType, VerticalAlign, ImageRun, PageNumber } = window.docx;

        const NAVY = '001d47';
        const LIGHT_BG = 'e8f0fe';

        const borderDef = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
        const cellBorders = { top: borderDef, bottom: borderDef, left: borderDef, right: borderDef };

        const mkCell = (text, opts = {}) => new TableCell({
          borders: cellBorders,
          width: { size: opts.w || 2256, type: WidthType.DXA },
          shading: opts.shade ? { fill: LIGHT_BG, type: ShadingType.CLEAR } : undefined,
          margins: { top: 80, bottom: 80, left: 140, right: 140 },
          verticalAlign: VerticalAlign.CENTER,
          children: [new Paragraph({ children: [new TextRun({ text: String(text || '—'), font: 'Arial', size: 20, bold: opts.bold, color: opts.color || '1e293b' })] })]
        });

        const mkH = (text, level) => new Paragraph({
          heading: level,
          children: [new TextRun({ text, font: 'Arial', bold: true })],
          spacing: { before: 300, after: 140 }
        });

        const mkP = (text, opts = {}) => new Paragraph({
          children: [new TextRun({ text: String(text || ''), font: 'Arial', size: 20, bold: opts.bold, italics: opts.italic, color: opts.color || '1e293b' })],
          spacing: { before: 60, after: 60 }
        });

        const mkMulti = (text) => (text || '—').split('\n').map(l => mkP(l.trim()));

        const mkDivider = () => new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e2e8f0', space: 1 } },
          spacing: { before: 160, after: 160 }, children: []
        });

        // Logo
        let logoRun = null;
        if (logoBase64) {
          const logoBytes = Uint8Array.from(atob(logoBase64), c => c.charCodeAt(0));
          logoRun = new ImageRun({ data: logoBytes.buffer, transformation: { width: 150, height: 43 }, type: 'png' });
        }

        // Tabella meta
        const metaTable = new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2256, 2257, 2256, 2257],
          rows: [
            new TableRow({ children: [mkCell('Versione', { w: 2256, shade: true, bold: true }), mkCell(intestazione.versione || '1.0', { w: 2257 }), mkCell('Data', { w: 2256, shade: true, bold: true }), mkCell(dataFmt, { w: 2257 })] }),
            new TableRow({ children: [mkCell('Area', { w: 2256, shade: true, bold: true }), mkCell(intestazione.area || '', { w: 2257 }), mkCell('Sistema', { w: 2256, shade: true, bold: true }), mkCell(intestazione.sistema || '', { w: 2257 })] }),
            new TableRow({ children: [mkCell('Stato', { w: 2256, shade: true, bold: true }), mkCell(`${intestazione.stato || '1'} — ${statoLabel}`, { w: 2257 }), mkCell('Cliente', { w: 2256, shade: true, bold: true }), mkCell(intestazione.cliente || '', { w: 2257 })] }),
          ]
        });

        // Funzionalità blocks
        const funzBlocks = [];
        funzionalita.forEach((f, i) => {
          funzBlocks.push(mkH(`3.2.${i + 1} ${f.nome || `Funzionalità ${i + 1}`}`, HeadingLevel.HEADING_2));
          funzBlocks.push(mkP(`Nome identificativo: ${f.nome || ''}`));
          if (f.trigger) { funzBlocks.push(mkP('Condizione di partenza:', { bold: true })); funzBlocks.push(...mkMulti(f.trigger)); }
          if (f.attore) { funzBlocks.push(mkP(`Attore: ${f.attore}`)); }
          if (f.azioni) { funzBlocks.push(mkP('Sequenza principale delle azioni:', { bold: true })); funzBlocks.push(...mkMulti(f.azioni)); }
          if (f.frequenza) { funzBlocks.push(mkP('Frequenza / Obiettivo di prestazione:', { bold: true })); funzBlocks.push(...mkMulti(f.frequenza)); }
          if (f.vincoli) { funzBlocks.push(mkP('Vincoli / Regole di business:', { bold: true })); funzBlocks.push(...mkMulti(f.vincoli)); }
          if (f.rischi) { funzBlocks.push(mkP('Problemi / Rischi:', { bold: true })); funzBlocks.push(...mkMulti(f.rischi)); }
          if (i < funzionalita.length - 1) funzBlocks.push(mkDivider());
        });

        const doc = new Document({
          styles: {
            default: { document: { run: { font: 'Arial', size: 20 } } },
            paragraphStyles: [
              { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                run: { size: 32, bold: true, font: 'Arial', color: NAVY },
                paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
              { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
                run: { size: 24, bold: true, font: 'Arial', color: '0d4d8a' },
                paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
            ]
          },
          sections: [{
            properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } } },
            headers: { default: new Header({ children: [
              new Paragraph({ children: logoRun ? [logoRun] : [new TextRun({ text: 'ZCS — Zucchetti Centro Sistemi', font: 'Arial', size: 20, bold: true, color: NAVY })] }),
              new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY, space: 1 } }, spacing: { after: 80 }, children: [] })
            ]})},
            footers: { default: new Footer({ children: [
              new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'e2e8f0', space: 1 } }, spacing: { before: 80 }, children: [] }),
              new Paragraph({ alignment: AlignmentType.RIGHT, children: [
                new TextRun({ text: `${codice} — v${intestazione.versione || '1.0'} — ${dataFmt}   |   Pag. `, font: 'Arial', size: 18, color: '64748b' }),
                new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '64748b' }),
                new TextRun({ text: ' di ', font: 'Arial', size: 18, color: '64748b' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: '64748b' }),
              ]})
            ]})},
            children: [
              new Paragraph({ children: [new TextRun({ text: 'SPECIFICA DEI REQUISITI', font: 'Arial', size: 20, color: '64748b', bold: true })], spacing: { before: 0, after: 80 } }),
              mkH(intestazione.titolo || 'Specifica dei Requisiti', HeadingLevel.HEADING_1),
              new Paragraph({ children: [new TextRun({ text: codice, font: 'Arial', size: 18, color: '64748b', italics: true })], spacing: { before: 0, after: 240 } }),
              metaTable,
              new Paragraph({ children: [], spacing: { before: 200 } }),
              mkDivider(),
              mkH('1. Scopo e Contesto', HeadingLevel.HEADING_1),
              ...mkMulti(contesto.scopo || 'Nulla da segnalare.'),
              mkH('2. Attori', HeadingLevel.HEADING_1),
              mkP('Attori principali:', { bold: true }), ...mkMulti(contesto.attoriPrincipali),
              mkP('Attori secondari:', { bold: true }), ...mkMulti(contesto.attoriSecondari),
              mkH('3. Requisiti', HeadingLevel.HEADING_1),
              mkH('3.1 Informazioni Generali', HeadingLevel.HEADING_2),
              mkP('Precondizioni di attivazione:', { bold: true }),
              mkP('Nulla da segnalare'),
              mkP('Attori principali:', { bold: true }), ...mkMulti(contesto.attoriPrincipali),
              mkH('3.2 Funzionalità', HeadingLevel.HEADING_2),
              ...(funzBlocks.length > 0 ? funzBlocks : [mkP('Nessuna funzionalità inserita.')]),
              mkH('4. Considerazioni finali', HeadingLevel.HEADING_1),
              mkH('4.1 Proposta implementativa', HeadingLevel.HEADING_2),
              ...mkMulti(considerazioni.proposta || 'Nulla da segnalare.'),
              mkH('4.2 Criteri di accettazione', HeadingLevel.HEADING_2),
              ...mkMulti(considerazioni.criteri || 'Nulla da segnalare.'),
              mkH('4.3 Priorità', HeadingLevel.HEADING_2),
              mkP(considerazioni.priorita || '—'),
              ...(considerazioni.note ? [mkH('Note aggiuntive', HeadingLevel.HEADING_2), ...mkMulti(considerazioni.note)] : []),
            ]
          }]
        });

        const buffer = await Packer.toBuffer(doc);
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${codice}.docx`;
        a.click();
        URL.revokeObjectURL(url);
        resolve();
      } catch (err) { reject(err); }
    };
    scriptEl.onerror = reject;
    if (!window.docx) {
      document.head.appendChild(scriptEl);
    } else {
      scriptEl.onload();
    }
  });
}

// ─────────────────────────────────────────────
// EXPORT PDF — finestra di stampa con HTML fedele
// ─────────────────────────────────────────────
function exportPDF({ intestazione, contesto, funzionalita, considerazioni }) {
  const codice = [
    intestazione.cliente?.trim().replace(/\s+/g, '') || 'CLIENTE',
    intestazione.sistema || 'SISTEMA',
    intestazione.titolo?.trim().replace(/\s+/g, '') || 'TITOLO',
  ].join('.');
  const statoLabel = STATI.find(s => s.val === intestazione.stato)?.label || '';
  const dataFmt = intestazione.data ? new Date(intestazione.data).toLocaleDateString('it-IT') : new Date().toLocaleDateString('it-IT');

  const txt = (t) => (t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');

  const funzHtml = funzionalita.map((f, i) => `
    <h3>3.2.${i + 1} ${txt(f.nome || `Funzionalità ${i + 1}`)}</h3>
    ${f.trigger ? `<p><strong>Condizione di partenza:</strong><br>${txt(f.trigger)}</p>` : ''}
    ${f.attore ? `<p><strong>Attore:</strong> ${txt(f.attore)}</p>` : ''}
    ${f.azioni ? `<p><strong>Sequenza principale delle azioni:</strong><br>${txt(f.azioni)}</p>` : ''}
    ${f.frequenza ? `<p><strong>Frequenza / Obiettivo di prestazione:</strong><br>${txt(f.frequenza)}</p>` : ''}
    ${f.vincoli ? `<p><strong>Vincoli / Regole di business:</strong><br>${txt(f.vincoli)}</p>` : ''}
    ${f.rischi ? `<p><strong>Problemi / Rischi:</strong><br>${txt(f.rischi)}</p>` : ''}
    <hr class="light">
  `).join('');

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8">
<title>${codice}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'IBM Plex Sans', Arial, sans-serif; font-size: 10pt; color: #1e293b; padding: 18mm 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6mm; padding-bottom: 4mm; border-bottom: 2px solid #001d47; }
  .header .logo-text { font-size: 13pt; font-weight: 700; color: #001d47; }
  .doc-code { font-family: 'IBM Plex Mono', monospace; font-size: 8pt; color: #64748b; }
  h1 { font-size: 18pt; font-weight: 700; color: #001d47; margin: 4mm 0 2mm; }
  h2 { font-size: 13pt; font-weight: 700; color: #001d47; margin: 6mm 0 2mm; border-bottom: 1px solid #e2e8f0; padding-bottom: 1mm; }
  h3 { font-size: 11pt; font-weight: 700; color: #0d4d8a; margin: 4mm 0 2mm; }
  p { font-size: 10pt; line-height: 1.6; margin-bottom: 2mm; }
  table { width: 100%; border-collapse: collapse; margin: 4mm 0; font-size: 9pt; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 8px; }
  th { background: #e8f0fe; font-weight: 700; color: #001d47; }
  .tag { display: inline-block; background: #eff6ff; color: #1d4ed8; border-radius: 4px; padding: 1px 6px; font-size: 8pt; font-weight: 600; }
  .hr { border: none; border-top: 1px solid #e2e8f0; margin: 3mm 0; }
  hr.light { border: none; border-top: 1px solid #e2e8f0; margin: 4mm 0; }
  .footer { position: fixed; bottom: 10mm; left: 20mm; right: 20mm; font-size: 8pt; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 2mm; }
  @media print { .footer { display: flex; } }
</style></head><body>
<div class="header">
  <div><div class="logo-text">ZCS — Zucchetti Centro Sistemi</div><div class="doc-code">${txt(codice)}</div></div>
  <div style="text-align:right"><span class="tag">SPECIFICA DEI REQUISITI</span></div>
</div>
<h1>${txt(intestazione.titolo || 'Specifica dei Requisiti')}</h1>
<table>
  <tr><th>Versione</th><td>${txt(intestazione.versione || '1.0')}</td><th>Data</th><td>${txt(dataFmt)}</td></tr>
  <tr><th>Area</th><td>${txt(intestazione.area || '')}</td><th>Sistema</th><td>${txt(intestazione.sistema || '')}</td></tr>
  <tr><th>Stato</th><td>${txt(intestazione.stato || '')} — ${txt(statoLabel)}</td><th>Cliente</th><td>${txt(intestazione.cliente || '')}</td></tr>
</table>
<hr class="hr">
<h2>1. Scopo e Contesto</h2><p>${txt(contesto.scopo || 'Nulla da segnalare.')}</p>
<h2>2. Attori</h2>
<p><strong>Attori principali:</strong> ${txt(contesto.attoriPrincipali || '—')}</p>
<p><strong>Attori secondari:</strong> ${txt(contesto.attoriSecondari || '—')}</p>
<h2>3. Requisiti</h2>
<h3>3.1 Informazioni Generali</h3>
<p><strong>Precondizioni di attivazione:</strong> Nulla da segnalare</p>
<p><strong>Attori principali:</strong> ${txt(contesto.attoriPrincipali || '—')}</p>
<h3>3.2 Funzionalità</h3>
${funzHtml || '<p>Nessuna funzionalità inserita.</p>'}
<h2>4. Considerazioni finali</h2>
<h3>4.1 Proposta implementativa</h3><p>${txt(considerazioni.proposta || 'Nulla da segnalare.')}</p>
<h3>4.2 Criteri di accettazione</h3><p>${txt(considerazioni.criteri || 'Nulla da segnalare.')}</p>

${considerazioni.note ? `<h3>Note aggiuntive</h3><p>${txt(considerazioni.note)}</p>` : ''}
<div class="footer"><span>${txt(codice)} — v${txt(intestazione.versione || '1.0')}</span><span>${txt(dataFmt)}</span></div>
</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}

// ─────────────────────────────────────────────
// MODALE PRINCIPALE
// ─────────────────────────────────────────────
export function RaccoltaRequisitiModal({ onClose, staff, clients, preData, initialData, readOnly: readOnlyProp = false, cardId: cardIdProp = null, currentUser = null }) {
  const [readOnly, setReadOnly] = useState(readOnlyProp);
  const [modalita, setModalita] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(cardIdProp);
  // removed duplicate: setModalita] = useState(null); // null = scelta | 'dettagliata' | 'semplificata'
  const [step, setStep] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [intestazione, setIntestazione] = useState(() =>
    initialData?.intestazione || {
      data: new Date().toISOString().slice(0, 10),
      versione: '1.0',
      stato: '1',
      cliente: preData?.cliente || '',
      titolo: preData?.titolo || '',
    }
  );
  const [contesto, setContesto] = useState(initialData?.contesto || {});
  const [funzionalita, setFunzionalita] = useState(initialData?.funzionalita || []);
  const [considerazioni, setConsiderazioni] = useState(initialData?.considerazioni || {});
  const [exporting, setExporting] = useState(false);

  const handleOverlayClick = () => { if (readOnly) { onClose(); } else { setShowExitConfirm(true); } };

  // ── Scelta modalità ────────────────────────────────────────────
  if (modalita === null) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640, boxShadow: '0 32px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
          <div style={{ background: 'var(--brand-800)', padding: '28px 32px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Raccolta Requisiti</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Scegli la modalità di compilazione</div>
          </div>

          <div style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Semplificata */}
            <div onClick={() => setModalita('semplificata')}
              style={{ border: '2px solid #bfdbfe', borderRadius: 16, padding: '24px 20px', cursor: 'pointer', background: '#fff', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', overflow: 'hidden' }}
              onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = 'var(--brand-700)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}>
              {/* Banner beta */}
              <div style={{ position: 'absolute', top: 12, right: -20, background: '#f59e0b', color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 28px', transform: 'rotate(35deg)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                Beta
              </div>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--brand-800)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/yoda.png" alt="Yoda" width={36} height={36} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-800)', marginBottom: 6 }}>Guidata con Yoda</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>Yoda ti fa le domande giuste. Rispondi e il documento si costruisce automaticamente.</div>
              </div>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Funzionalità in versione di test
              </div>
            </div>

            {/* Dettagliata */}
            <div onClick={() => setModalita('dettagliata')}
              style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 20px', cursor: 'pointer', background: '#fff', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 14 }}
              onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Dettagliata</div>
                <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>Compilazione guidata passo per passo con tutti i campi strutturati. Massimo controllo.</div>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Raccolta requisiti completa
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Modalità semplificata ───────────────────────────────────────
  if (modalita === 'semplificata') {
    return <RaccoltaSemplificata onClose={onClose} clients={clients} cardId={selectedCardId} createdBy={currentUser?.nome ? (currentUser.cognome + ' ' + currentUser.nome) : ''} />;
  }


    const canNext = () => {
    if (step === 0) return intestazione.cliente?.trim() && intestazione.sistema && intestazione.titolo?.trim();
    if (step === 1) return contesto.scopo?.trim();
    if (step === 2) return true; // funzionalità opzionale per avanzare
    return true;
  };

  const handleSaveAndExportDocx = async () => {
    // Salva il documento collegato se siamo in contesto card
    if (preData !== undefined) {
      const datiSalvati = { intestazione, contesto, funzionalita, considerazioni,
        titolo: intestazione.titolo || 'Raccolta Requisiti' };
      onClose(datiSalvati);
      return;
    }
  };

  const handleExportDocx = async () => {
    setExporting(true);
    try { await exportDocx({ intestazione, contesto, funzionalita, considerazioni }); }
    catch (e) { console.error('Export DOCX error:', e); alert('Errore durante la generazione del documento Word.'); }
    finally { setExporting(false); }
  };

  const handleExportPDF = () => {
    exportPDF({ intestazione, contesto, funzionalita, considerazioni });
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      {showExitConfirm && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,18,41,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: 400, maxWidth: '90vw', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ background: 'var(--brand-800)', padding: '18px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Uscire dalla Raccolta Requisiti?</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>Il documento non è stato esportato e andrà perso.</div>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowExitConfirm(false)}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Continua a compilare
              </button>
              <button onClick={onClose}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Esci e perdi i dati
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="modal-content" onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '820px', maxWidth: '96vw', minHeight: '580px', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>

        <button className="btn-close-circle" onClick={() => readOnly ? onClose() : setShowExitConfirm(true)}>×</button>

        <div className="modal-header" style={{ paddingRight: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
              <polyline points="9 9 10 10 12 8"/>
            </svg>
            {readOnly ? (intestazione.titolo || 'Raccolta Requisiti') : 'Nuova Raccolta Requisiti'}
          </h3>
          {readOnly && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 20, padding: '3px 10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 44 }}>
              Sola lettura
            </span>
          )}
        </div>

        <StepIndicator current={step} />

        <div style={{ flex: 1, overflowY: step === 0 ? 'visible' : 'auto', overflow: step === 0 ? 'visible' : undefined, paddingRight: 2 }}>
          {step === 0 && <StepIntestazione data={intestazione} onChange={setIntestazione} clients={clients} />}
          {step === 1 && <StepContesto data={contesto} onChange={readOnly ? () => {} : setContesto} readOnly={readOnly} />}
          {step === 2 && <StepFunzionalita funzionalita={funzionalita} setFunzionalita={readOnly ? () => {} : setFunzionalita} readOnly={readOnly} />}
          {step === 3 && <StepConsiderazioni data={considerazioni} onChange={readOnly ? () => {} : setConsiderazioni} readOnly={readOnly} />}
          {step === 4 && (
            <>
              <StepSintesi intestazione={intestazione} contesto={contesto} funzionalita={funzionalita} considerazioni={considerazioni} />
              {preData !== undefined && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Clicca <strong>Salva documento</strong> per archiviarlo nella scheda attività.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
          <button onClick={() => step === 0 ? (readOnly ? onClose() : setShowExitConfirm(true)) : setStep(s => s - 1)}
            style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {step === 0 ? (readOnly ? 'Chiudi' : 'Annulla') : '← Indietro'}
          </button>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Modalità SOLA LETTURA — Modifica + export sempre visibili */}
            {readOnly && (
              <>
                <button onClick={handleExportDocx} disabled={exporting}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 13, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: exporting ? 0.7 : 1 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                  {exporting ? '…' : 'Word'}
                </button>
                <button onClick={handleExportPDF}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 14px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  PDF
                </button>
                <button onClick={() => setReadOnly(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Modifica
                </button>
                {step < 4 && (
                  <button onClick={() => setStep(s => s + 1)}
                    style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Avanti →
                  </button>
                )}
              </>
            )}

            {/* Modalità EDIT */}
            {!readOnly && step === 4 && (
              <>
                {preData !== undefined && (
                  <button onClick={() => {
                    const datiSalvati = { intestazione, contesto, funzionalita, considerazioni, titolo: intestazione.titolo || 'Raccolta Requisiti' };
                    onClose(datiSalvati);
                  }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--brand-800)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Salva documento
                  </button>
                )}
                <button onClick={handleExportDocx} disabled={exporting}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 13, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: exporting ? 0.7 : 1 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                  {exporting ? 'Generazione…' : 'Word'}
                </button>
                <button onClick={handleExportPDF}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff5f5', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  PDF
                </button>
              </>
            )}
            {!readOnly && step < 4 && (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: canNext() ? 'var(--brand-800)' : '#e2e8f0', color: canNext() ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 600, cursor: canNext() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                Avanti →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}