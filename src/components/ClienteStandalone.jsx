import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';
import { ProgettoView } from './ProgettiView.jsx';

// ── Spinner ──
function Spinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#001d47', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#94a3b8' }}>Caricamento…</div>
    </div>
  );
}

// ── Errore ──
function Errore({ msg }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center', fontFamily: 'IBM Plex Sans, sans-serif' }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Link non valido</div>
      <div style={{ fontSize: 14, color: '#64748b', maxWidth: 380 }}>{msg}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Zucchetti Centro Sistemi</div>
    </div>
  );
}

// ── Componente principale ──
export function ClienteStandalone({ token }) {
  const [stato, setStato] = useState('loading');
  const [errMsg, setErrMsg] = useState('');
  const [linkData, setLinkData] = useState(null);
  const [progetto, setProgetto] = useState(null);
  const [commessa, setCommessa] = useState(null);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [subView, setSubView] = useState(null);

  const SEZIONI_LABEL = {
    home: 'Home',
    dettaglio: 'Dettaglio Attività',
    gantt: 'Gantt',
    avanzamento: 'Avanzamento',
    mappe: 'Mappe',
  };

  useEffect(() => {
    const load = async () => {
      // 1. Verifica token
      const { data: ld } = await supabase
        .from('progetto_link_cliente').select('*')
        .eq('token', token).eq('attivo', true).single();

      if (!ld) { setErrMsg('Questo link non esiste o è stato revocato.'); setStato('errore'); return; }
      if (ld.scadenza && new Date(ld.scadenza) < new Date()) {
        setErrMsg('Questo link è scaduto. Contatta il tuo referente ZCS.');
        setStato('errore'); return;
      }

      // 2. Carica progetto
      const { data: prog } = await supabase.from('progetti').select('*').eq('id', ld.progetto_id).single();
      if (!prog) { setErrMsg('Progetto non trovato.'); setStato('errore'); return; }

      // 3. Carica commessa con cliente e team
      const { data: comm } = await supabase.from('commesse')
        .select('*, client:client_id(nome_progetto)').eq('id', prog.commessa_id).single();
      // Carica team della commessa
      const { data: teamData } = await supabase.from('project_team')
        .select('staff_name').eq('commessa_id', prog.commessa_id);
      const teamNames = (teamData || []).map(t => t.staff_name);

      // 4. Carica staff e clients (servono alle viste interne)
      const [{ data: st }, { data: cl }] = await Promise.all([
        supabase.from('staff').select('*'),
        supabase.from('projects').select('*, commesse(*, project_team(staff_name))'),
      ]);

      setLinkData(ld);
      setProgetto(prog);
      setCommessa(comm ? { ...comm, clientName: comm.client?.nome_progetto, team: teamNames } : null);
      const clEnriched = (cl || []).map(c => ({
        ...c,
        commesse: (c.commesse || []).map(co => ({
          ...co,
          team: (co.project_team || []).map(t => t.staff_name),
        })),
      }));
      setStaff(st || []);
      setClients(clEnriched);
      setSubView(ld.sezioni[0] || 'home');
      document.title = 'ZCS | Delivery Hub';
      setStato('ok');
    };
    load();
  }, [token]);

  if (stato === 'loading') return <Spinner />;
  if (stato === 'errore') return <Errore msg={errMsg} />;

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '';

  // Sezioni abilitate dal link
  const sezioni = linkData.sezioni;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'IBM Plex Sans, sans-serif', background: '#f8fafc' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header ZCS */}
      <div style={{ background: '#001d47', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/Zucchetti-Centro-Sistemi-Spa.png" alt="Zucchetti Centro Sistemi" style={{ height: 28, filter: 'brightness(0) invert(1)' }} onError={e => e.target.style.display = 'none'} />
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.2)' }} />
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{commessa?.clientName}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{commessa?.nome_commessa || 'Progetto'}</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textAlign: 'right', lineHeight: 1.6 }}>
          Sola visualizzazione
          {linkData?.scadenza && <><br />Valido fino al {new Date(linkData.scadenza).toLocaleDateString('it-IT')}</>}
        </div>
      </div>

      {/* Tab bar */}
      {sezioni.length > 1 && (
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
          {sezioni.map(s => (
            <button key={s} onClick={() => setSubView(s)}
              style={{ padding: '12px 18px', border: 'none', borderBottom: subView === s ? '2.5px solid #001d47' : '2.5px solid transparent', background: 'transparent', color: subView === s ? '#001d47' : '#64748b', fontWeight: subView === s ? 700 : 400, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {SEZIONI_LABEL[s] || s}
            </button>
          ))}
        </div>
      )}

      {/* Contenuto — ProgettoView reale in sola lettura */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ProgettoView
          progettoId={progetto.id}
          commessaId={progetto.commessa_id}
          clients={clients}
          staff={staff}
          currentUser={null}
          isAdmin={false}
          isClienteView={true}
          chiuso={true}
          clienteSezioni={sezioni}
          clienteSubView={subView}
          onClienteSubViewChange={setSubView}
          onBack={null}
        />
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: 11, color: '#94a3b8', background: '#fff', flexShrink: 0 }}>
        Zucchetti Centro Sistemi — Portale Delivery · Documento riservato al destinatario
      </div>
    </div>
  );
}