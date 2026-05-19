import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { staffKey, staffLabel, getAvatarColor, getInitials } from '../utils.js';

const SKILL_LABELS = { 1: 'Base', 2: 'Operativo', 3: 'Esperto', 4: 'Referente' };
const BADGE_STYLE = {
  1: { bg: '#fef9c3', text: '#854d0e' },
  2: { bg: '#dcfce7', text: '#166534' },
  3: { bg: '#22c55e', text: '#fff' },
  4: { bg: '#15803d', text: '#fff' },
};

export function SkillStorico({ staff, skillsConfig }) {
  const [selectedStaff, setSelectedStaff] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const FOLDERS = Object.keys(skillsConfig || {});

  useEffect(() => {
    if (!selectedStaff) { setHistory([]); return; }
    setLoading(true);
    supabase
      .from('skill_data')
      .select('*')
      .eq('staff_key', selectedStaff)
      .order('data_valutazione', { ascending: true })
      .then(({ data }) => {
        setHistory(data || []);
        setLoading(false);
      });
  }, [selectedStaff]);

  // Raggruppa per skill_key → array di valutazioni cronologiche
  const grouped = {};
  history.forEach(r => {
    if (!grouped[r.skill_key]) grouped[r.skill_key] = [];
    grouped[r.skill_key].push(r);
  });

  // Filtra per folder e ricerca
  const allSkillsInFolder = filterFolder
    ? (skillsConfig[filterFolder] || [])
    : FOLDERS.flatMap(f => skillsConfig[f] || []);

  const skillKeys = Object.keys(grouped)
    .filter(sk => {
      if (filterFolder && !allSkillsInFolder.includes(sk)) return false;
      if (search && !sk.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => a.localeCompare(b));

  const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const selectedObj = staff.find(s => staffKey(s) === selectedStaff);
  const ac = selectedObj ? getAvatarColor(staffLabel(selectedObj)) : null;

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#f8fafc' }}>

      {/* Toolbar — filtri compatti a destra */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        {/* Info risorsa selezionata — sinistra */}
        {selectedStaff && ac ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: ac.bg, color: ac.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700 }}>
              {getInitials(selectedStaff)}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 500, color: '#0f172a' }}>{selectedStaff}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>· {skillKeys.length} skill</span>
          </div>
        ) : <div />}

        {/* Filtri — destra */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={selectedStaff}
            onChange={e => { setSelectedStaff(e.target.value); setFilterFolder(''); setSearch(''); }}
            style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', color: selectedStaff ? '#0f172a' : '#94a3b8', background: '#f8fafc' }}
          >
            <option value="">— seleziona risorsa —</option>
            {[...staff].sort((a, b) => staffLabel(a).localeCompare(staffLabel(b))).map(s => (
              <option key={s.id} value={staffKey(s)}>{staffLabel(s)}</option>
            ))}
          </select>

          {selectedStaff && (<>
            <select
              value={filterFolder}
              onChange={e => setFilterFolder(e.target.value)}
              style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', color: '#475569', background: '#f8fafc' }}
            >
              <option value="">Tutti i prodotti</option>
              {FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
              <svg width="11" height="11" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M10 10l3 3" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input type="text" placeholder="Cerca skill..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '11px', color: '#0f172a', width: 90 }} />
            </div>

            {(filterFolder || search) && (
              <button onClick={() => { setFilterFolder(''); setSearch(''); }}
                style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '11px', cursor: 'pointer' }}>✕</button>
            )}
          </>)}
        </div>
      </div>

      {/* Stato vuoto */}
      {!selectedStaff && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Seleziona una risorsa</div>
          <div style={{ fontSize: '12px', marginTop: 4 }}>per visualizzare lo storico delle valutazioni</div>
        </div>
      )}

      {/* Loading */}
      {selectedStaff && loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Caricamento...</div>
      )}

      {/* Nessun dato */}
      {selectedStaff && !loading && skillKeys.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: '13px' }}>
          Nessuna valutazione trovata per questa risorsa
        </div>
      )}

      {/* Timeline */}
      {selectedStaff && !loading && skillKeys.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #e2e8f0', padding: '20px 24px', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          {/* Header colonne folder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {FOLDERS.filter(f => !filterFolder || f === filterFolder).map(folder => {
              const folderSkills = skillKeys.filter(sk => (skillsConfig[folder] || []).includes(sk));
              if (folderSkills.length === 0) return null;
              return (
                <div key={folder} style={{ marginBottom: '24px' }}>
                  {/* Folder header */}
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#0054a6', textTransform: 'uppercase', letterSpacing: '0.07em', paddingBottom: '8px', borderBottom: '2px solid #eff6ff', marginBottom: '16px' }}>
                    {folder}
                  </div>

                  {/* Righe skill */}
                  {folderSkills.map(sk => {
                    const vals = grouped[sk] || [];
                    const last = vals[vals.length - 1];
                    return (
                      <div key={sk} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', alignItems: 'center', gap: '16px', marginBottom: '14px', minHeight: '36px' }}>
                        {/* Label skill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>{sk}</span>
                        </div>

                        {/* Timeline orizzontale */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
                          {/* Linea base */}
                          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: '#e2e8f0', transform: 'translateY(-50%)' }} />

                          {/* Badge valutazioni */}
                          <div style={{ display: 'flex', gap: '32px', alignItems: 'center', position: 'relative', zIndex: 1 }}>
                            {vals.map((r, i) => {
                              const bs = BADGE_STYLE[r.voto] || { bg: '#f1f5f9', text: '#475569' };
                              const prev = vals[i - 1];
                              const delta = prev ? r.voto - prev.voto : null;
                              return (
                                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                  {/* Delta */}
                                  <div style={{ height: '14px', display: 'flex', alignItems: 'center' }}>
                                    {delta !== null && delta !== 0 && (
                                      <span style={{ fontSize: '10px', color: delta > 0 ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                                        {delta > 0 ? `+${delta} ↑` : `${delta} ↓`}
                                      </span>
                                    )}
                                  </div>
                                  {/* Badge voto */}
                                  <div style={{ width: 28, height: 28, borderRadius: '6px', background: bs.bg, color: bs.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, border: `1px solid ${bs.bg === '#fff' ? '#e2e8f0' : 'transparent'}` }}>
                                    {r.voto}
                                  </div>
                                  {/* Data */}
                                  <div style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                    {fmtDate(r.data_valutazione)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}