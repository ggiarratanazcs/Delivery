import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { RUOLI as RUOLI_DEFAULT, RUOLO_COLORS } from '../constants.js';
import { getAvatarColor, getInitials, staffKey, staffLabel } from '../utils.js';

// Ruoli che possono avere un team di prodotto
const RUOLI_CON_TEAM = ['Programmatore', 'Analista'];

// ─────────────────────────────────────────────
// ManageStaffModal — lista + tab Ruoli + tab Team
// ─────────────────────────────────────────────
export function ManageStaffModal({ staff, onClose, isAdmin, initialEditTarget = null, initialShowNew = false }) {
  const [search, setSearch] = useState('');
  const [editTarget, setEditTarget] = useState(initialEditTarget);
  const [showNew, setShowNew] = useState(initialShowNew);
  const [activeTab, setActiveTab] = useState('risorse'); // 'risorse' | 'ruoli' | 'team'

  // Config ruoli
  const [ruoliConfig, setRuoliConfig] = useState([]);
  const [newRuolo, setNewRuolo] = useState('');
  const [savingRuolo, setSavingRuolo] = useState(false);

  // Config team
  const [teamConfig, setTeamConfig] = useState([]);
  const [newTeam, setNewTeam] = useState('');
  const [savingTeam, setSavingTeam] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data: r } = await supabase.from('config_ruoli').select('*').order('ordine');
    setRuoliConfig(r || []);
    const { data: t } = await supabase.from('config_team_prodotto').select('*').order('ordine');
    setTeamConfig(t || []);
  };

  const addRuolo = async () => {
    if (!newRuolo.trim() || savingRuolo) return;
    setSavingRuolo(true);
    const nextOrdine = ruoliConfig.length;
    await supabase.from('config_ruoli').insert({ nome: newRuolo.trim(), ordine: nextOrdine });
    setNewRuolo('');
    await loadConfig();
    setSavingRuolo(false);
  };

  const deleteRuolo = async (id) => {
    if (!window.confirm('Eliminare questo ruolo?')) return;
    await supabase.from('config_ruoli').delete().eq('id', id);
    await loadConfig();
  };

  const addTeam = async () => {
    if (!newTeam.trim() || savingTeam) return;
    setSavingTeam(true);
    const nextOrdine = teamConfig.length;
    await supabase.from('config_team_prodotto').insert({ nome: newTeam.trim(), ordine: nextOrdine });
    setNewTeam('');
    await loadConfig();
    setSavingTeam(false);
  };

  const deleteTeam = async (id) => {
    if (!window.confirm('Eliminare questo team?')) return;
    await supabase.from('config_team_prodotto').delete().eq('id', id);
    await loadConfig();
  };

  const filtered = (staff || []).filter(s =>
    staffLabel(s).toLowerCase().includes(search.toLowerCase()) ||
    (s.codice || '').includes(search)
  );

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare collaboratore?')) return;
    await supabase.from('staff').delete().eq('id', id);
    onClose();
  };

  if (editTarget !== null || showNew) {
    const fromConfig = initialEditTarget !== null || initialShowNew;
    // Aspetta che i ruoli siano caricati prima di mostrare il form
    if (ruoliConfig.length === 0) return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>Caricamento…</div>
        </div>
      </div>
    );
    return (
      <StaffFormModal
        staff={editTarget}
        isAdmin={isAdmin}
        ruoliConfig={ruoliConfig}
        teamConfig={teamConfig}
        onClose={() => { setEditTarget(null); setShowNew(false); onClose(); }}
        onBack={fromConfig ? () => { setEditTarget(null); setShowNew(false); onClose(); } : () => { setEditTarget(null); setShowNew(false); }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '520px', maxWidth: '600px', minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
        <button className="btn-close-circle" onClick={onClose}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <h3>Gestione Risorse</h3>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '2px', marginBottom: '16px' }}>
          {[
            { key: 'risorse', label: '👥 Risorse' },
            { key: 'ruoli', label: '🏷️ Ruoli' },
            { key: 'team', label: '🛠️ Team sviluppo' },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{ flex: 1, padding: '7px 12px', borderRadius: '7px', border: 'none', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s', background: activeTab === t.key ? '#fff' : 'transparent', color: activeTab === t.key ? '#0054a6' : '#64748b', fontWeight: activeTab === t.key ? 600 : 400, boxShadow: activeTab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB RISORSE ── */}
        {activeTab === 'risorse' && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '7px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 10px' }}>
                <svg width="13" height="13" viewBox="0 0 15 15" fill="none">
                  <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
                  <path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <input type="text" placeholder="Cerca risorsa o codice..." value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', flex: 1, color: '#0f172a' }} />
                {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>}
              </div>
              <button onClick={() => setShowNew(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#0054a6', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                + Nuova risorsa
              </button>
            </div>
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px', fontSize: '13px' }}>Nessuna risorsa trovata</div>
              )}
              {filtered.map(s => {
                const ac = getAvatarColor(staffLabel(s));
                const ruoloColors = RUOLO_COLORS[s.ruolo] || RUOLO_COLORS.Consulente;
                return (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, border: `1px solid ${ac.text}22` }}>
                      {getInitials(staffLabel(s))}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', cursor: 'pointer' }} onClick={() => setEditTarget(s)}>
                        {staffLabel(s)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                        {s.ruolo && (
                          <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: ruoloColors.bg, color: ruoloColors.text, border: `0.5px solid ${ruoloColors.border}`, fontWeight: 500 }}>{s.ruolo}</span>
                        )}
                        {s.team_prodotto && (
                          <span style={{ fontSize: '10px', padding: '1px 7px', borderRadius: '20px', background: '#fdf4ff', color: '#7c3aed', border: '0.5px solid #e9d5ff', fontWeight: 500 }}>🛠️ {s.team_prodotto}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#94a3b8', flexShrink: 0 }}>🗑️</button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── TAB RUOLI ── */}
        {activeTab === 'ruoli' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Ruoli disponibili per le risorse. I ruoli "Analista" e "Programmatore" abilitano il campo Team sviluppo.
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input placeholder="Nome ruolo..." value={newRuolo} onChange={e => setNewRuolo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addRuolo()}
                style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              <button onClick={addRuolo} disabled={savingRuolo || !newRuolo.trim()}
                style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#0054a6', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: !newRuolo.trim() ? 0.5 : 1 }}>
                + Aggiungi
              </button>
            </div>
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ruoliConfig.map(r => {
                const rc = RUOLO_COLORS[r.nome] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
                const hasTeam = RUOLI_CON_TEAM.includes(r.nome);
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', background: '#f8fafc', border: '0.5px solid #e2e8f0' }}>
                    <span style={{ fontSize: '12px', padding: '2px 10px', borderRadius: '20px', background: rc.bg, color: rc.text, border: `0.5px solid ${rc.border}`, fontWeight: 600 }}>{r.nome}</span>
                    {hasTeam && <span style={{ fontSize: '10px', color: '#7c3aed', background: '#fdf4ff', border: '0.5px solid #e9d5ff', borderRadius: '20px', padding: '1px 7px' }}>🛠️ con team</span>}
                    <button onClick={() => deleteRuolo(r.id)}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '13px', transition: 'color 0.15s' }}
                      onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                      onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}>🗑</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB TEAM SVILUPPO ── */}
        {activeTab === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
              Team di prodotto assegnabili alle risorse con ruolo Analista o Programmatore.
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input placeholder="Nome team..." value={newTeam} onChange={e => setNewTeam(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTeam()}
                style={{ flex: 1, padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
              <button onClick={addTeam} disabled={savingTeam || !newTeam.trim()}
                style={{ padding: '7px 16px', borderRadius: '8px', border: 'none', background: '#0054a6', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', opacity: !newTeam.trim() ? 0.5 : 1 }}>
                + Aggiungi
              </button>
            </div>
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {teamConfig.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', background: '#f8fafc', border: '0.5px solid #e2e8f0' }}>
                  <span style={{ fontSize: '12px', color: '#7c3aed', fontWeight: 600 }}>🛠️ {t.nome}</span>
                  <button onClick={() => deleteTeam(t.id)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', fontSize: '13px', transition: 'color 0.15s' }}
                    onMouseOver={e => e.currentTarget.style.color = '#dc2626'}
                    onMouseOut={e => e.currentTarget.style.color = '#cbd5e1'}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// StaffFormModal — scheda risorsa con team prodotto
// ─────────────────────────────────────────────
export function StaffFormModal({ staff: s, onClose, onBack, isAdmin, ruoliConfig: ruoliProp, teamConfig: teamProp }) {
  const isEdit = !!s;
  const [codice, setCodice] = useState(s?.codice || '');
  const [nome, setNome] = useState(s?.nome || '');
  const [cognome, setCognome] = useState(s?.cognome || '');
  const [ruolo, setRuolo] = useState(s?.ruolo || 'Consulente');
  const [email, setEmail] = useState(s?.email || '');
  const [genere, setGenere] = useState(s?.genere || 'M');
  const [staffIsAdmin, setStaffIsAdmin] = useState(s?.is_admin || false);
  const [teamProdotto, setTeamProdotto] = useState(s?.team_prodotto || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Carica config se non passata come prop (quando aperto standalone)
  const [ruoliConfig, setRuoliConfig] = useState(ruoliProp || []);
  const [teamConfig, setTeamConfig] = useState(teamProp || []);

  useEffect(() => {
    if (!ruoliProp || !teamProp) {
      supabase.from('config_ruoli').select('*').order('ordine').then(({ data }) => setRuoliConfig(data || []));
      supabase.from('config_team_prodotto').select('*').order('ordine').then(({ data }) => setTeamConfig(data || []));
    }
  }, []);

  // Se il ruolo cambia e non supporta team, resetta il team
  useEffect(() => {
    if (!RUOLI_CON_TEAM.includes(ruolo)) setTeamProdotto('');
  }, [ruolo]);

  const ruoliList = ruoliConfig.length > 0 ? ruoliConfig.map(r => r.nome) : RUOLI_DEFAULT;
  const showTeam = RUOLI_CON_TEAM.includes(ruolo);

  const handleSave = async () => {
    if (!codice.trim() || !nome.trim() || !cognome.trim()) {
      setError('Compila tutti i campi obbligatori.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      codice: codice.trim().padStart(3, '0'),
      nome: nome.trim(),
      cognome: cognome.trim(),
      ruolo,
      email: email.trim() || null,
      is_admin: staffIsAdmin,
      genere,
      team_prodotto: showTeam && teamProdotto ? teamProdotto : null,
    };
    if (isEdit) {
      await supabase.from('staff').update(payload).eq('id', s.id);
    } else {
      const { error: err } = await supabase.from('staff').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }
    setSaving(false);
    onClose();
  };

  const rc = RUOLO_COLORS[ruolo] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
  const displayName = (nome || 'Nome') + ' ' + (cognome || 'Cognome');
  const avatarColor = nome ? getAvatarColor(displayName) : { bg: '#f1f5f9', text: '#64748b' };

  return (
    <div className="modal-overlay" onClick={onBack}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ position: 'relative', minWidth: '420px' }}>
        <button className="btn-close-circle" onClick={onBack}>×</button>
        <div className="modal-header" style={{ paddingRight: '44px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, border: `1px solid ${avatarColor.text}22` }}>
              {nome && cognome ? getInitials(displayName) : '?'}
            </div>
            <div>
              <h3 style={{ margin: 0 }}>{isEdit ? staffLabel(s) : 'Nuova risorsa'}</h3>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>{isEdit ? 'Modifica dati' : 'Inserisci i dati'}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Codice <span style={{ color: '#94a3b8', fontWeight: 400 }}>(numerico, es. 042)</span></label>
            <input placeholder="001" value={codice} maxLength={3}
              onChange={e => setCodice(e.target.value.replace(/\D/g, ''))}
              style={{ width: '100px' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nome</label>
              <input placeholder="Mario" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Cognome</label>
              <input placeholder="Rossi" value={cognome} onChange={e => setCognome(e.target.value)} />
            </div>
          </div>

          {/* Ruolo */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Ruolo</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ruoliList.map(r => {
                const rc2 = RUOLO_COLORS[r] || { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' };
                const active = ruolo === r;
                return (
                  <div key={r} onClick={() => setRuolo(r)} style={{
                    padding: '7px 16px', borderRadius: '20px', cursor: 'pointer',
                    border: `1px solid ${active ? rc2.border : '#e2e8f0'}`,
                    background: active ? rc2.bg : '#f8fafc',
                    color: active ? rc2.text : '#64748b',
                    fontSize: '13px', fontWeight: active ? 700 : 400,
                    transition: 'all 0.15s', userSelect: 'none',
                  }}>
                    {r}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team prodotto — visibile solo per Analista/Programmatore */}
          {showTeam && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛠️ Team sviluppo
                <span style={{ fontSize: '10px', color: '#7c3aed', background: '#fdf4ff', border: '0.5px solid #e9d5ff', borderRadius: '20px', padding: '1px 7px', fontWeight: 500 }}>{ruolo}</span>
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <div onClick={() => setTeamProdotto('')}
                  style={{ padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', border: `1px solid ${!teamProdotto ? '#e9d5ff' : '#e2e8f0'}`, background: !teamProdotto ? '#fdf4ff' : '#f8fafc', color: !teamProdotto ? '#7c3aed' : '#64748b', fontSize: '12px', fontWeight: !teamProdotto ? 700 : 400, transition: 'all 0.15s', userSelect: 'none' }}>
                  — nessuno —
                </div>
                {teamConfig.map(t => {
                  const active = teamProdotto === t.nome;
                  return (
                    <div key={t.id} onClick={() => setTeamProdotto(t.nome)}
                      style={{ padding: '6px 14px', borderRadius: '20px', cursor: 'pointer', border: `1px solid ${active ? '#e9d5ff' : '#e2e8f0'}`, background: active ? '#fdf4ff' : '#f8fafc', color: active ? '#7c3aed' : '#64748b', fontSize: '12px', fontWeight: active ? 700 : 400, transition: 'all 0.15s', userSelect: 'none' }}>
                      {t.nome}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Email</label>
            <input type="email" placeholder="mario.rossi@zcscompany.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          {/* Genere */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Genere</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[{ val: 'M', label: '♂ Uomo' }, { val: 'F', label: '♀ Donna' }].map(({ val, label }) => (
                <div key={val} onClick={() => setGenere(val)}
                  style={{ padding: '7px 20px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: genere === val ? 600 : 400, userSelect: 'none', transition: 'all 0.15s',
                    border: `1px solid ${genere === val ? (val === 'F' ? '#fbcfe8' : '#bfdbfe') : '#e2e8f0'}`,
                    background: genere === val ? (val === 'F' ? '#fdf2f8' : '#eff6ff') : '#f8fafc',
                    color: genere === val ? (val === 'F' ? '#9d174d' : '#1e40af') : '#64748b',
                  }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
          {isAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: staffIsAdmin ? '#fef9c3' : '#f8fafc', borderRadius: '10px', border: `1px solid ${staffIsAdmin ? '#fde68a' : '#e2e8f0'}`, transition: 'all 0.15s', cursor: 'pointer' }}
              onClick={() => setStaffIsAdmin(v => !v)}>
              <div style={{ width: 36, height: 20, borderRadius: '20px', background: staffIsAdmin ? '#f59e0b' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 2, left: staffIsAdmin ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: staffIsAdmin ? '#92400e' : '#475569' }}>
                  {staffIsAdmin ? 'Amministratore' : 'Utente standard'}
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {staffIsAdmin ? 'Accesso completo a tutte le sezioni' : 'Accesso a Pianificazione e Progetti'}
                </div>
              </div>
            </div>
          )}

          {/* Anteprima */}
          {nome && cognome && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: avatarColor.bg, borderRadius: '10px', border: `1px solid ${avatarColor.text}22` }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: avatarColor.bg, color: avatarColor.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, flexShrink: 0, border: `1px solid ${avatarColor.text}33` }}>
                {getInitials(displayName)}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: avatarColor.text }}>{displayName}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: rc.text, fontStyle: 'italic' }}>{ruolo} {codice ? `· ${codice.padStart(3, '0')}` : ''}</span>
                  {showTeam && teamProdotto && (
                    <span style={{ fontSize: '10px', color: '#7c3aed', background: '#fdf4ff', border: '0.5px solid #e9d5ff', borderRadius: '20px', padding: '1px 7px' }}>🛠️ {teamProdotto}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: '#dc2626', fontSize: '12px', padding: '6px 10px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca' }}>{error}</div>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: '24px' }}>
          <button className="btn-cancel" onClick={onBack}>Annulla</button>
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
        </div>
      </div>
    </div>
  );
}