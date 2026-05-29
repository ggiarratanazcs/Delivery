// ─────────────────────────────────────────────
// OrdiniRichiesteView — layout split per workflow "Ordini e Richieste"
// ─────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';
import { getAvatarColor, getInitials, staffKey, staffLabel } from '../utils.js';
import { DatePicker } from './DatePicker.jsx';
import { ProjectModal } from './ClientModals.jsx';

// ── Dropdown stile portale (position:absolute, funziona dentro modali) ──
function PortaleSelect({ value, onChange, options, placeholder = 'Seleziona...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const filtered = options.filter(o => !search || o.label.toLowerCase().includes(search.toLowerCase()));
  const sel = options.find(o => o.value === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1.5px solid ${open ? 'var(--brand-700,#185FA5)' : '#e2e8f0'}`, padding: '6px 0 8px', cursor: 'pointer', minHeight: 34, background: 'transparent', transition: 'border-color .15s' }}>
        <span style={{ fontSize: 13, color: sel ? '#1e293b' : '#94a3b8', fontStyle: sel ? 'normal' : 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sel?.label || placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 9999, background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,18,41,0.14)', maxHeight: 240, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '6px 8px', borderBottom: '0.5px solid #f1f5f9', flexShrink: 0 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca..." autoFocus
              style={{ width: '100%', padding: '5px 8px', fontSize: 12, border: '0.5px solid #e2e8f0', borderRadius: 6, outline: 'none', background: '#f8fafc', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <div onClick={() => { onChange(''); setOpen(false); setSearch(''); }}
              style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', color: '#94a3b8', fontStyle: 'italic', background: !value ? '#eff6ff' : '#fff' }}
              onMouseOver={e => { if (value) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseOut={e => { if (value) e.currentTarget.style.background = '#fff'; }}>{placeholder}</div>
            {filtered.map((o, i) => (
              <div key={i} onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', background: o.value === value ? '#eff6ff' : '#fff', color: o.value === value ? 'var(--brand-800,#001d47)' : '#1e293b', fontWeight: o.value === value ? 500 : 400 }}
                onMouseOver={e => { if (o.value !== value) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseOut={e => { if (o.value !== value) e.currentTarget.style.background = '#fff'; }}>{o.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Modale scheda ordine workflow ─────────────────────────────
function OrdineWorkflowModal({ ordine, clients, onSave, onClose }) {
  const [clienteId, setClienteId] = useState(ordine?.cliente_id || '');
  const [codiceDoc, setCodiceDoc] = useState(ordine?.codice_documento || '');
  const [numeroOrd, setNumeroOrd] = useState(ordine?.numero_ordine || '');
  const [dataOrd, setDataOrd] = useState(ordine?.data_ordine || '');
  const [importo, setImporto] = useState(ordine?.importo || '');
  const [bolleIds, setBolleIds] = useState(ordine?.bolle_ids || []);
  const [note, setNote] = useState(ordine?.note || '');
  const [bolleDisp, setBolleDisp] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clienteId) { setBolleDisp([]); return; }
    const client = clients.find(c => c.id === clienteId);
    const progettiIds = (client?.commesse || []).map(co => co.id).filter(Boolean);
    const queries = [];
    if (client?.codice_cliente)
      queries.push(supabase.from('bolle_lavoro').select('id, codice, descrizione, giorni_disponibili, ordine_id').eq('codice_cliente', client.codice_cliente));
    if (progettiIds.length > 0)
      queries.push(supabase.from('bolle_lavoro').select('id, codice, descrizione, giorni_disponibili, ordine_id').in('progetto_id', progettiIds));
    if (!queries.length) return;
    Promise.all(queries).then(results => {
      const map = {};
      results.flatMap(r => r.data || []).forEach(b => { map[b.id] = b; });
      setBolleDisp(Object.values(map));
    });
  }, [clienteId]);

  // FIX 1: bolle libere = senza ordine_id oppure già selezionate in questo ordine
  const bolleLibere = bolleDisp.filter(b => !b.ordine_id || bolleIds.includes(b.id));

  const toggleBolla = (id) => setBolleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!clienteId || !numeroOrd.trim()) return;
    setSaving(true);
    const payload = {
      cliente_id: clienteId,
      codice_documento: codiceDoc.trim().toUpperCase() || null,
      numero_ordine: numeroOrd.trim(),
      data_ordine: dataOrd || null,
      importo: parseFloat(String(importo).replace(',', '.')) || 0,
      bolle_ids: bolleIds,
      note: note.trim() || null,
    };
    if (ordine?.id) {
      await supabase.from('ordini_workflow').update(payload).eq('id', ordine.id);
      onSave({ ...ordine, ...payload });
    } else {
      const { data } = await supabase.from('ordini_workflow').insert({ ...payload, stato: 'da_assegnare' }).select().single();
      if (data) onSave(data);
    }
    setSaving(false);
    onClose();
  };

  const clienteOptions = clients.map(c => ({ value: c.id, label: c.nome_progetto }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,18,41,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ background: 'var(--brand-800,#001d47)', padding: '16px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{ordine?.id ? 'Modifica ordine' : 'Nuovo ordine'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Workflow Ordini e Richieste</div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', padding: '4px 9px', fontSize: 18 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Cliente */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Cliente *</div>
              <PortaleSelect value={clienteId} onChange={v => { setClienteId(v); setBolleIds([]); }} options={clienteOptions} placeholder="— seleziona cliente —" />
            </div>

            {/* Codice doc + Numero */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Codice documento</div>
                <input value={codiceDoc} onChange={e => setCodiceDoc(e.target.value)} placeholder="es. SWOCA"
                  style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #e2e8f0', background: 'transparent', padding: '4px 0 8px', fontSize: 13, outline: 'none', fontFamily: 'inherit', textTransform: 'uppercase', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Numero ordine *</div>
                <input value={numeroOrd} onChange={e => setNumeroOrd(e.target.value)} placeholder="es. 42"
                  style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #e2e8f0', background: 'transparent', padding: '4px 0 8px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Data ordine</div>
                <DatePicker value={dataOrd} onChange={setDataOrd} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Importo €</div>
                <input value={importo} onChange={e => setImporto(e.target.value)} placeholder="es. 15000"
                  style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #e2e8f0', background: 'transparent', padding: '4px 0 8px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>

            {/* Bolle — solo libere (fix 1) */}
            {clienteId && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Bolle associate</div>
                {bolleLibere.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>Nessuna bolla libera per questo cliente</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {bolleLibere.map(b => {
                      const sel = bolleIds.includes(b.id);
                      return (
                        <div key={b.id} onClick={() => toggleBolla(b.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, border: `1px solid ${sel ? '#185FA5' : '#e2e8f0'}`, background: sel ? '#eff6ff' : '#f8fafc', cursor: 'pointer', fontSize: 12, fontWeight: sel ? 600 : 400, color: sel ? '#0054a6' : '#64748b', transition: 'all 0.12s' }}>
                          <span style={{ fontFamily: 'monospace' }}>{b.codice}</span>
                          {b.giorni_disponibili > 0 && <span style={{ opacity: 0.55, fontSize: 11 }}>{b.giorni_disponibili}g</span>}
                          {sel && <span style={{ fontSize: 10, marginLeft: 2 }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
                {bolleDisp.length > bolleLibere.length && (
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, fontStyle: 'italic' }}>
                    {bolleDisp.length - bolleLibere.length} boll{bolleDisp.length - bolleLibere.length === 1 ? 'a già associata' : 'e già associate'} ad altri ordini
                  </div>
                )}
              </div>
            )}

            {/* Note */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Note</div>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Note aggiuntive..."
                style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '0.5px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 8, border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Annulla</button>
          <button onClick={handleSave} disabled={!clienteId || !numeroOrd.trim() || saving}
            style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: clienteId && numeroOrd.trim() ? 'var(--brand-800,#001d47)' : '#cbd5e1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: clienteId && numeroOrd.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modale card attività promemoria ───────────────────────────
function CardPromemoriaModal({ card, colonne, staff, clients, workflowId, colonnaAssegnateId, colonnaCompletateId, colonnaAnnullateId, onSave, onClose, onDelete }) {
  const [titolo, setTitolo] = useState(card?.titolo || '');
  const [descrizione, setDescrizione] = useState(card?.descrizione || '');
  const [clienteId, setClienteId] = useState(card?.cliente_id || '');
  const [colonnaId, setColonnaId] = useState(card?.colonna_id || colonne[0]?.id || '');
  const [priorita, setPriorita] = useState(card?.priorita || 'media');
  const [rifPratica, setRifPratica] = useState(card?.rif_pratica || '');
  const [assegnatario, setAssegnatario] = useState(card?.assegnata_a || '');
  const [bollaId, setBollaId] = useState(card?.bolla_id || '');
  const [bolleDisp, setBolleDisp] = useState([]);
  const [saving, setSaving] = useState(false);

  // Carica bolle per il cliente selezionato
  useEffect(() => {
    if (!clienteId) { setBolleDisp([]); return; }
    const client = clients.find(c => c.id === clienteId);
    const progettiIds = (client?.commesse || []).map(co => co.id).filter(Boolean);
    const queries = [];
    if (client?.codice_cliente)
      queries.push(supabase.from('bolle_lavoro').select('id, codice, descrizione').eq('codice_cliente', client.codice_cliente));
    if (progettiIds.length > 0)
      queries.push(supabase.from('bolle_lavoro').select('id, codice, descrizione').in('progetto_id', progettiIds));
    if (!queries.length) return;
    Promise.all(queries).then(results => {
      const map = {};
      results.flatMap(r => r.data || []).forEach(b => { map[b.id] = b; });
      setBolleDisp(Object.values(map));
    });
  }, [clienteId]);

  // FIX 4: determinare se mostrare pulsanti Completa/Annulla
  const colCorrente = colonne.find(c => c.id === colonnaId);
  const isDaAssegnare = colCorrente && /da.assegn/i.test(colCorrente.nome);
  const isAssegnata = colCorrente && /assegnate/i.test(colCorrente.nome) && !/da.assegn/i.test(colCorrente.nome);
  const canComplete = (isDaAssegnare || isAssegnata) && colonnaCompletateId;
  const canAnnulla = (isDaAssegnare || isAssegnata) && colonnaAnnullateId;

  // Auto-switch to ASSEGNATE when assigning
  const handleAssegnatario = (val) => {
    setAssegnatario(val);
    if (val && colonnaAssegnateId && colonnaId !== colonnaAssegnateId && !isAssegnata) {
      setColonnaId(colonnaAssegnateId);
    }
  };

  const handleSave = async (overrideColId) => {
    if (!titolo.trim()) return;
    setSaving(true);
    const targetCol = overrideColId || colonnaId;
    const payload = {
      titolo: titolo.trim(),
      descrizione: descrizione.trim() || null,
      cliente_id: clienteId || null,
      colonna_id: targetCol,
      priorita,
      rif_pratica: rifPratica.trim() || null,
      assegnata_a: assegnatario || null,
      bolla_id: bollaId || null,
      workflow_id: workflowId,
    };
    if (card?.id) {
      await supabase.from('attivita').update(payload).eq('id', card.id);
      onSave({ ...card, ...payload });
    } else {
      const { data } = await supabase.from('attivita').insert(payload).select().single();
      if (data) onSave(data);
    }
    setSaving(false);
    onClose();
  };

  const pColors = { alta: '#dc2626', media: '#92400e', bassa: '#16a34a' };
  const pBg = { alta: '#fef2f2', media: '#fefce8', bassa: '#f0fdf4' };
  const pBorder = { alta: '#fca5a5', media: '#fcd34d', bassa: '#86efac' };

  const clienteOptions = clients.map(c => ({ value: c.id, label: c.nome_progetto }));
  const staffOptions = staff.map(s => ({ value: `${s.cognome} ${s.nome}`, label: `${s.cognome} ${s.nome}` }));
  const colonnaOptions = colonne.map(c => ({ value: c.id, label: c.nome }));
  const bollaOptions = bolleDisp.map(b => ({ value: b.id, label: `${b.codice}${b.descrizione ? ' — ' + b.descrizione : ''}` }));

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,18,41,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header con azioni FIX 4 */}
        <div style={{ background: 'var(--brand-800,#001d47)', padding: '14px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{card?.id ? 'Modifica attività' : 'Nuova attività'}</div>
            {colCorrente && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>{colCorrente.nome}</div>}
          </div>
          {/* Pulsanti Completa / Annulla — stile identico agli altri workflow */}
          {canComplete && card?.id && (
            <button onClick={() => handleSave(colonnaCompletateId)} title="Completa"
              style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #16a34a', background: 'rgba(22,163,74,0.08)', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}
              onMouseOver={e => { e.currentTarget.style.background = '#16a34a'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(22,163,74,0.08)'; e.currentTarget.style.color = '#16a34a'; }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          )}
          {canAnnulla && card?.id && (
            <button onClick={() => handleSave(colonnaAnnullateId)} title="Annulla"
              style={{ width: 28, height: 28, borderRadius: '50%', border: '1.5px solid #dc2626', background: 'rgba(220,38,38,0.08)', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}
              onMouseOver={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.08)'; e.currentTarget.style.color = '#dc2626'; }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          )}
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 7, color: '#fff', cursor: 'pointer', padding: '4px 9px', fontSize: 18, flexShrink: 0 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Titolo */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Titolo *</div>
            <input value={titolo} onChange={e => setTitolo(e.target.value)} placeholder="Titolo attività..." autoFocus
              style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #e2e8f0', background: 'transparent', padding: '4px 0 8px', fontSize: 14, fontWeight: 500, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {/* Descrizione */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Descrizione</div>
            <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} placeholder="Descrizione o note..."
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', minHeight: 70, boxSizing: 'border-box' }} />
          </div>

          {/* Cliente + Colonna */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Cliente</div>
              <PortaleSelect value={clienteId} onChange={v => { setClienteId(v); setBollaId(''); }} options={clienteOptions} placeholder="— nessuno —" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Colonna</div>
              <PortaleSelect value={colonnaId} onChange={setColonnaId} options={colonnaOptions} placeholder="— seleziona —" />
            </div>
          </div>

          {/* Priorità */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Priorità</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['bassa', 'media', 'alta'].map(p => {
                const sel = priorita === p;
                return (
                  <div key={p} onClick={() => setPriorita(p)}
                    style={{ flex: 1, textAlign: 'center', padding: '7px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: sel ? 600 : 400,
                      border: `1px solid ${sel ? pBorder[p] : '#e2e8f0'}`,
                      background: sel ? pBg[p] : 'transparent',
                      color: sel ? pColors[p] : '#94a3b8', transition: 'all 0.12s' }}>{p}</div>
                );
              })}
            </div>
          </div>

          {/* Rif pratica + Assegnatario */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Rif. pratica</div>
              <input value={rifPratica} onChange={e => setRifPratica(e.target.value)} placeholder="es. PR.26.12345"
                style={{ width: '100%', border: 'none', borderBottom: '1.5px solid #e2e8f0', background: 'transparent', padding: '4px 0 8px', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                Assegnatario
                {assegnatario && colonnaAssegnateId && <span style={{ marginLeft: 5, fontSize: 9, color: '#16a34a', fontWeight: 400 }}>→ va in Assegnate</span>}
              </div>
              <PortaleSelect value={assegnatario} onChange={handleAssegnatario} options={staffOptions} placeholder="— nessuno —" />
            </div>
          </div>

          {/* FIX 3: Campo bolla */}
          {clienteId && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#475569', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Bolla collegata</div>
              <PortaleSelect
                value={bollaId}
                onChange={setBollaId}
                options={bollaOptions}
                placeholder="— nessuna bolla —"
              />
            </div>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '0.5px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
          {card?.id ? (
            <button onClick={() => onDelete(card.id)} style={{ padding: '7px 14px', borderRadius: 8, border: '0.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Elimina</button>
          ) : <div />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 8, border: '0.5px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Annulla</button>
            <button onClick={() => handleSave()} disabled={!titolo.trim() || saving}
              style={{ padding: '7px 20px', borderRadius: 8, border: 'none', background: titolo.trim() ? 'var(--brand-800,#001d47)' : '#cbd5e1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: titolo.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vista principale Ordini e Richieste ───────────────────────
export function OrdiniRichiesteView({ colonne, attivita, staff, clients, transizioni, workflowId, isAdmin, searchQuery = '', onRefresh, onOpenCard }) {
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrdineModal, setShowOrdineModal] = useState(false);
  const [editOrdine, setEditOrdine] = useState(null);
  const [selectedOrdine, setSelectedOrdine] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [targetColId, setTargetColId] = useState(null);
  const [dragOrdineId, setDragOrdineId] = useState(null);
  const [dragOverCommessa, setDragOverCommessa] = useState(null);
  // FIX 2: dati ordine trascinato su nuova commessa
  const [nuovaCommessaData, setNuovaCommessaData] = useState(null);
  const [savingAssegna, setSavingAssegna] = useState(false);

  const colSinistra = colonne.filter(c => !/^ordini/i.test(c.nome));

  // Filtro ricerca — attività per titolo/descrizione/cliente/assegnatario; ordini per cliente/numero
  const q = searchQuery.trim().toLowerCase();
  const attivitaFiltrate = q
    ? attivita.filter(a => {
        const cli = clients.find(c => c.id === a.cliente_id);
        return (
          (a.titolo || '').toLowerCase().includes(q) ||
          (a.descrizione || '').toLowerCase().includes(q) ||
          (a.assegnata_a || '').toLowerCase().includes(q) ||
          (a.rif_pratica || '').toLowerCase().includes(q) ||
          (cli?.nome_progetto || '').toLowerCase().includes(q)
        );
      })
    : attivita;
  const ordiniVisibili = q
    ? ordini.filter(ord => {
        const cli = clients.find(c => c.id === ord.cliente_id);
        return (
          (ord.numero_ordine || '').toLowerCase().includes(q) ||
          (ord.codice_documento || '').toLowerCase().includes(q) ||
          (cli?.nome_progetto || '').toLowerCase().includes(q)
        );
      })
    : ordini;
  const colonnaAssegnateId = colonne.find(c => /^assegnate$/i.test(c.nome))?.id || null;
  const colonnaCompletateId = colonne.find(c => /complet/i.test(c.nome))?.id || null;
  const colonnaAnnullateId = colonne.find(c => /annullat/i.test(c.nome))?.id || null;

  const clienteOrdineSelezionato = selectedOrdine ? clients.find(c => c.id === selectedOrdine.cliente_id) : null;
  const commesseAperte = clienteOrdineSelezionato
    ? (clienteOrdineSelezionato.commesse || []).filter(co => co.attiva !== false)
    : [];

  useEffect(() => { loadOrdini(); }, []);

  const loadOrdini = async () => {
    setLoading(true);
    const { data } = await supabase.from('ordini_workflow').select('*').eq('stato', 'da_assegnare').order('created_at', { ascending: false });
    setOrdini(data || []);
    setLoading(false);
  };

  const handleSaveOrdine = (saved) => {
    setOrdini(prev => {
      const exists = prev.find(o => o.id === saved.id);
      return exists ? prev.map(o => o.id === saved.id ? saved : o) : [saved, ...prev];
    });
    if (selectedOrdine?.id === saved.id) setSelectedOrdine(saved);
  };

  const handleDeleteOrdine = async (id) => {
    if (!window.confirm('Eliminare questo ordine?')) return;
    await supabase.from('ordini_workflow').delete().eq('id', id);
    setOrdini(prev => prev.filter(o => o.id !== id));
    if (selectedOrdine?.id === id) setSelectedOrdine(null);
  };

  const handleSaveCard = () => { onRefresh(); };
  const handleDeleteCard = async (id) => {
    await supabase.from('attivita').delete().eq('id', id);
    onRefresh();
    setShowCardModal(false);
  };

  const handleDropOnCommessa = async (commessaId) => {
    if (!dragOrdineId || savingAssegna) return;
    setSavingAssegna(true);
    const ordine = ordini.find(o => o.id === dragOrdineId);
    if (!ordine) { setSavingAssegna(false); return; }
    const { data: newOrd } = await supabase.from('ordini_cliente').insert({
      commessa_id: commessaId,
      codice: ordine.codice_documento || 'ORD',
      numero: ordine.numero_ordine,
      data: ordine.data_ordine || null,
      importo: ordine.importo || 0,
    }).select().single();
    if (newOrd) {
      await supabase.from('ordini_workflow').update({ stato: 'assegnato', commessa_id: commessaId }).eq('id', dragOrdineId);
      if (ordine.bolle_ids?.length > 0) {
        await supabase.from('bolle_lavoro').update({ ordine_id: newOrd.id }).in('id', ordine.bolle_ids);
        // Aggiunge le bolle alla commessa in commessa_bolle
        await supabase.from('commessa_bolle').insert(
          ordine.bolle_ids.map(bid => ({ commessa_id: commessaId, bolla_id: bid, tipo: 'consulenza' }))
        );
      }
      setOrdini(prev => prev.filter(o => o.id !== dragOrdineId));
      if (selectedOrdine?.id === dragOrdineId) setSelectedOrdine(null);
    }
    setDragOrdineId(null);
    setDragOverCommessa(null);
    setSavingAssegna(false);
  };

  // FIX 2: Drag su nuova commessa — passa i dati ordine alla ProjectModal
  const handleDropOnNuovaCommessa = () => {
    if (!dragOrdineId) return;
    const ordine = ordini.find(o => o.id === dragOrdineId);
    if (!ordine?.cliente_id) return;
    setNuovaCommessaData({ ordine, clienteId: ordine.cliente_id });
    setDragOrdineId(null);
    setDragOverCommessa(null);
  };

  const fmtE = n => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  const fmtD = iso => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

  const pBg = { alta: '#fef2f2', media: '#fefce8', bassa: '#f0fdf4' };
  const pText = { alta: '#dc2626', media: '#92400e', bassa: '#16a34a' };
  const pBorder = { alta: '#fca5a5', media: '#fcd34d', bassa: '#86efac' };

  const ColHeader = ({ col, count }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: `2px solid ${col.colore}`, marginBottom: 8, flexShrink: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.08em', flex: 1 }}>{col.nome}</span>
      <span style={{ fontSize: 11, color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>{count}</span>
      <button onClick={() => { setEditCard(null); setTargetColId(col.id); setShowCardModal(true); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>+</button>
    </div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--gray-50)' }}>

      {/* ── SINISTRA: Attività promemoria ── */}
      <div style={{ flex: 1, display: 'flex', gap: 16, padding: 20, overflowX: 'auto', borderRight: '1px solid var(--gray-200)', minWidth: 0 }}>
        {colSinistra.map(col => {
          const cards = attivitaFiltrate.filter(a => a.colonna_id === col.id).sort((a, b) => (a.ordine || 0) - (b.ordine || 0));
          const isCompletata = /complet/i.test(col.nome);
          const isAnnullata = /annullat/i.test(col.nome);
          return (
            <div key={col.id} style={{ minWidth: 220, maxWidth: 230, flex: '0 0 220px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <ColHeader col={col} count={cards.length} />
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cards.map(card => {
                  const cli = clients.find(c => c.id === card.cliente_id);
                  const ass = staff.find(s => staffKey(s) === card.assegnata_a);
                  const ac = ass ? getAvatarColor(staffLabel(ass)) : null;
                  return (
                    <div key={card.id}
                      onClick={() => { setEditCard(card); setTargetColId(col.id); setShowCardModal(true); }}
                      style={{ background: '#fff', borderRadius: 10, padding: '10px 12px', border: '0.5px solid var(--gray-200)', borderLeft: `3px solid ${col.colore}`, cursor: 'pointer', opacity: (isCompletata || isAnnullata) ? 0.5 : 1, transition: 'all .12s' }}
                      onMouseOver={e => { if (!isCompletata && !isAnnullata) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
                      onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)', marginBottom: 5, lineHeight: 1.3 }}>{card.titolo}</div>
                      {card.descrizione && <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{card.descrizione}</div>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: pBg[card.priorita] || pBg.media, color: pText[card.priorita] || pText.media, border: `0.5px solid ${pBorder[card.priorita] || pBorder.media}`, fontWeight: 500 }}>{card.priorita || 'media'}</span>
                        {cli && <span style={{ fontSize: 10, color: 'var(--gray-500)', background: 'var(--gray-50)', border: '0.5px solid var(--gray-200)', borderRadius: 4, padding: '1px 5px', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cli.nome_progetto}</span>}
                        {card.rif_pratica && <span style={{ fontSize: 10, color: '#0054a6', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 4, padding: '1px 5px', fontFamily: 'monospace' }}>{card.rif_pratica}</span>}
                        {ac && <div style={{ width: 18, height: 18, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, marginLeft: 'auto', flexShrink: 0 }} title={staffLabel(ass)}>{getInitials(staffLabel(ass))}</div>}
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--gray-200)', fontSize: 12, padding: '20px 0', fontStyle: 'italic', border: '1px dashed var(--gray-200)', borderRadius: 10 }}>nessuna attività</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESTRA: Ordini da assegnare ── */}
      <div style={{ width: selectedOrdine ? 620 : 300, display: 'flex', flexShrink: 0, transition: 'width 0.25s', overflow: 'hidden' }}>

        {/* Colonna ordini */}
        <div style={{ width: 286, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: 20, borderRight: selectedOrdine ? '1px solid var(--gray-200)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '2px solid #001d47', marginBottom: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '.08em', flex: 1 }}>Ordini da assegnare</span>
            <span style={{ fontSize: 11, color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>{ordiniVisibili.length}</span>
            <button onClick={() => { setEditOrdine(null); setShowOrdineModal(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>+</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loading && <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 12, padding: 20 }}>Caricamento...</div>}
            {!loading && ordiniVisibili.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--gray-200)', fontSize: 12, padding: '20px 0', fontStyle: 'italic', border: '1px dashed var(--gray-200)', borderRadius: 10 }}>
                {q ? 'nessun risultato' : 'nessun ordine'}
              </div>
            )}
            {ordiniVisibili.map(ord => {
              const cli = clients.find(c => c.id === ord.cliente_id);
              const isSel = selectedOrdine?.id === ord.id;
              return (
                <div key={ord.id}
                  draggable
                  onDragStart={() => { setDragOrdineId(ord.id); setSelectedOrdine(ord); }}
                  onDragEnd={() => setDragOrdineId(null)}
                  onClick={() => setSelectedOrdine(isSel ? null : ord)}
                  style={{ background: isSel ? '#eff6ff' : '#fff', borderRadius: 10, padding: '10px 12px', border: `0.5px solid ${isSel ? '#bfdbfe' : 'var(--gray-200)'}`, borderLeft: '3px solid #001d47', cursor: 'grab', transition: 'all .12s', opacity: dragOrdineId === ord.id ? 0.4 : 1 }}
                  onMouseOver={e => { if (!isSel) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
                  onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#001d47', fontFamily: 'monospace' }}>
                        {ord.codice_documento && <span>{ord.codice_documento} </span>}{ord.numero_ordine}
                      </div>
                      {cli && <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 1 }}>{cli.nome_progetto}</div>}
                    </div>
                    {ord.importo > 0 && <div style={{ fontSize: 12, fontWeight: 600, color: '#001d47', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtE(ord.importo)}</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {ord.data_ordine && <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{fmtD(ord.data_ordine)}</span>}
                    {(ord.bolle_ids || []).length > 0 && <span style={{ fontSize: 10, color: '#0054a6', background: '#eff6ff', border: '0.5px solid #bfdbfe', borderRadius: 4, padding: '1px 5px' }}>{ord.bolle_ids.length} boll{ord.bolle_ids.length === 1 ? 'a' : 'e'}</span>}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                      <button onClick={e => { e.stopPropagation(); setEditOrdine(ord); setShowOrdineModal(true); }}
                        style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', padding: '3px 6px', borderRadius: 5, fontSize: 11, lineHeight: 1 }}
                        onMouseOver={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#185FA5'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}>
                        <i className="ti ti-edit" style={{ fontSize: 11 }} />
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleDeleteOrdine(ord.id); }}
                        style={{ background: '#fef2f2', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '3px 6px', borderRadius: 5, fontSize: 11, lineHeight: 1 }}
                        onMouseOver={e => { e.currentTarget.style.background = '#dc2626'; e.currentTarget.style.color = '#fff'; }}
                        onMouseOut={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; }}>
                        <i className="ti ti-trash" style={{ fontSize: 11 }} />
                      </button>
                    </div>
                  </div>
                  {ord.note && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 5, borderTop: '0.5px solid var(--gray-100)', paddingTop: 5 }}>{ord.note}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel commesse */}
        {selectedOrdine && (
          <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', padding: 20, background: '#fafbfc', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#001d47', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clienteOrdineSelezionato?.nome_progetto || '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Trascina su una commessa</div>
              </div>
              <button onClick={() => setSelectedOrdine(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 16, flexShrink: 0 }}>×</button>
            </div>

            {/* Nuova commessa drop target */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOverCommessa('nuova'); }}
              onDragLeave={() => setDragOverCommessa(null)}
              onDrop={e => { e.preventDefault(); handleDropOnNuovaCommessa(); }}
              onClick={() => { setNuovaCommessaData({ ordine: selectedOrdine, clienteId: selectedOrdine.cliente_id }); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: `2px dashed ${dragOverCommessa === 'nuova' ? '#185FA5' : '#bfdbfe'}`, background: dragOverCommessa === 'nuova' ? '#eff6ff' : '#fff', cursor: 'pointer', marginBottom: 12, transition: 'all .15s', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#185FA5" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#185FA5' }}>Nuova commessa</span>
            </div>

            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, flexShrink: 0 }}>
              Commesse aperte ({commesseAperte.length})
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {commesseAperte.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--gray-400)', fontStyle: 'italic', textAlign: 'center', padding: '16px 0' }}>Nessuna commessa attiva</div>
              )}
              {commesseAperte.map(co => {
                const isOver = dragOverCommessa === co.id;
                return (
                  <div key={co.id}
                    onDragOver={e => { e.preventDefault(); setDragOverCommessa(co.id); }}
                    onDragLeave={() => setDragOverCommessa(null)}
                    onDrop={e => { e.preventDefault(); handleDropOnCommessa(co.id); }}
                    style={{ padding: '10px 14px', borderRadius: 10, border: `1.5px solid ${isOver ? '#185FA5' : 'var(--gray-200)'}`, background: isOver ? '#eff6ff' : '#fff', transition: 'all .12s', cursor: 'copy' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-950)', flex: 1 }}>{co.nome_commessa}</span>
                      {savingAssegna && dragOverCommessa === co.id && <span style={{ fontSize: 11, color: '#185FA5' }}>...</span>}
                    </div>
                    {co.pm_commessa && <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2, marginLeft: 14 }}>{co.pm_commessa}</div>}
                    {isOver && <div style={{ fontSize: 11, color: '#185FA5', marginTop: 4, fontWeight: 500 }}>Rilascia per assegnare</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modali */}
      {showOrdineModal && (
        <OrdineWorkflowModal ordine={editOrdine} clients={clients} onSave={handleSaveOrdine}
          onClose={() => { setShowOrdineModal(false); setEditOrdine(null); }} />
      )}
      {showCardModal && (
        <CardPromemoriaModal
          card={editCard} colonne={colSinistra} staff={staff} clients={clients}
          workflowId={workflowId}
          colonnaAssegnateId={colonnaAssegnateId}
          colonnaCompletateId={colonnaCompletateId}
          colonnaAnnullateId={colonnaAnnullateId}
          onSave={handleSaveCard}
          onClose={() => { setShowCardModal(false); setEditCard(null); }}
          onDelete={handleDeleteCard}
        />
      )}
      {/* FIX 2: ProjectModal con ordine precaricato */}
      {nuovaCommessaData && (
        <ProjectModal
          staff={staff}
          clients={clients}
          matrix={[]}
          targetedEdit={{ clientId: nuovaCommessaData.clienteId, commessaId: '', prefillOrdine: nuovaCommessaData.ordine }}
          onClose={async () => {
            // Segna ordine come assegnato se la commessa è stata creata
            setNuovaCommessaData(null);
            loadOrdini();
          }}
        />
      )}
    </div>
  );
}