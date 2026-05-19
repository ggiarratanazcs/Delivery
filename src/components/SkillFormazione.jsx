import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { getAvatarColor, getInitials, getAvatarUrl } from '../utils.js';
import { Avatar } from './Avatar.jsx';

const SKILL_LABELS = { 1: 'Base', 2: 'Operativo', 3: 'Esperto', 4: 'Referente' };
const BADGE_STYLE = {
  1: { bg: '#fef9c3', text: '#854d0e' },
  2: { bg: '#dcfce7', text: '#166534' },
  3: { bg: '#22c55e', text: '#fff' },
  4: { bg: '#15803d', text: '#fff' },
};

export function SkillFormazione({ staff = [], skillsConfig, trainingCells, matrix, onRemove }) {
  const [formazioni, setFormazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStaff, setFilterStaff] = useState('');

  const FOLDERS = Object.keys(skillsConfig || {});

  useEffect(() => {
    supabase.from('skill_formazione').select('*')
      .order('data_inizio', { ascending: false })
      .then(({ data }) => { setFormazioni(data || []); setLoading(false); });
  }, [trainingCells]);

  const findFolder = (sk) => FOLDERS.find(f => (skillsConfig[f] || []).includes(sk)) || '—';
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: '2-digit' }) : '';

  const filtered = filterStaff ? formazioni.filter(f => f.staff_key === filterStaff) : formazioni;
  const staffOptions = [...new Set(formazioni.map(f => f.staff_key))].sort();
  const tdS = { padding: '9px 12px', fontSize: '12px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' };

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: '#f8fafc' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
            {filtered.length} skill in formazione{!filterStaff && ` · ${staffOptions.length} risorse`}
          </span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select value={filterStaff} onChange={e => setFilterStaff(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px', color: filterStaff ? '#0f172a' : '#94a3b8', background: '#f8fafc' }}>
            <option value="">Tutte le risorse</option>
            {staffOptions.map(sk => <option key={sk} value={sk}>{sk}</option>)}
          </select>
          {filterStaff && (
            <button onClick={() => setFilterStaff('')}
              style={{ padding: '4px 9px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '11px', cursor: 'pointer' }}>✕</button>
          )}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Caricamento...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div style={{ fontSize: '28px', marginBottom: '10px' }}>🎓</div>
          <div style={{ fontSize: '14px', fontWeight: 500 }}>Nessuna formazione in corso</div>
          <div style={{ fontSize: '12px', marginTop: 4 }}>Attiva la Modalità Formazione nella tab Matrice e clicca le celle</div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                {['Risorsa', 'Prodotto', 'Skill', 'Livello attuale', 'In formazione dal', ''].map((h, i) => (
                  <th key={i} style={{ padding: '10px 12px', textAlign: i >= 3 ? 'center' : 'left', fontSize: '11px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', borderRight: i < 5 ? '1px solid #e2e8f0' : 'none' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => {
                const compKey = `${f.staff_key}-${f.skill_key}`;
                const voto = matrix[compKey] || 0;
                const bs = voto > 0 ? BADGE_STYLE[voto] : null;
                const ac = getAvatarColor(f.staff_key);
                return (
                  <tr key={f.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafbfc' }}
                    onMouseOver={e => e.currentTarget.style.background = '#fffbeb'}
                    onMouseOut={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafbfc'}>
                    <td style={{ ...tdS, borderRight: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar name={f.staff_key} avatarUrl={getAvatarUrl(f.staff_key, staff)} size={24} />
                        <span style={{ fontWeight: 500, color: '#0f172a' }}>{f.staff_key}</span>
                      </div>
                    </td>
                    <td style={{ ...tdS, color: '#64748b', borderRight: '1px solid #f1f5f9' }}>{findFolder(f.skill_key)}</td>
                    <td style={{ ...tdS, fontWeight: 500, color: '#0f172a', borderRight: '1px solid #f1f5f9' }}>{f.skill_key}</td>
                    <td style={{ ...tdS, textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                      {bs ? <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: bs.bg, color: bs.text, fontWeight: 600 }}>{voto} — {SKILL_LABELS[voto]}</span>
                           : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td style={{ ...tdS, textAlign: 'center', color: '#64748b', borderRight: '1px solid #f1f5f9' }}>{fmtDate(f.data_inizio)}</td>
                    <td style={{ ...tdS, textAlign: 'center' }}>
                      <button onClick={() => onRemove(f.staff_key, f.skill_key)}
                        style={{ padding: '3px 10px', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }}>
                        Rimuovi
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}