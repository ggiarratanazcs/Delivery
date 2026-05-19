import React, { useState } from 'react';
import { supabase } from '../supabase.js';

export function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Inserisci email e password.');
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setError('Credenziali non valide. Riprova.');
      setLoading(false);
    } else {
      onLogin(data.user);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '13px 16px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '12px',
    color: '#fff',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '11px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: '7px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/sfondologin.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,10,30,0.45)' }} />

      <div className="login-card" style={{
        position: 'relative', zIndex: 10,
        background: 'rgba(255,255,255,0.10)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        border: '1px solid rgba(255,255,255,0.22)',
        borderRadius: '28px',
        padding: '52px 44px 44px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <img
          src="/Zucchetti-Centro-Sistemi-Spa.png"
          alt="Zucchetti Centro Sistemi"
          style={{ height: '38px', width: 'auto', marginBottom: '18px', filter: 'brightness(0) invert(1)', opacity: 0.85 }}
        />

        <h1 style={{
          fontSize: '30px', fontWeight: '900', color: '#ffffff',
          letterSpacing: '0.06em', textAlign: 'center', marginBottom: '4px',
          textShadow: '0 2px 16px rgba(0,0,0,0.4)', lineHeight: 1.1,
        }}>
          PORTALE DELIVERY
        </h1>

        <div style={{
          width: '48px', height: '3px',
          background: 'linear-gradient(90deg, #38bdf8, #0054a6)',
          borderRadius: '2px', margin: '16px auto 36px',
        }} />

        <div style={{ width: '100%', marginBottom: '18px' }}>
          <label style={labelStyle}>Email</label>
          <input
            className="login-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="nome@zcscompany.com"
            style={inputStyle}
          />
        </div>

        <div style={{ width: '100%', marginBottom: '28px' }}>
          <label style={labelStyle}>Password</label>
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            color: '#fca5a5', fontSize: '13px', marginBottom: '16px',
            textAlign: 'center', background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', padding: '8px 14px', width: '100%',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '15px',
            background: loading
              ? 'rgba(255,255,255,0.2)'
              : 'linear-gradient(135deg, #0054a6 0%, #38bdf8 100%)',
            border: 'none', borderRadius: '14px', color: '#fff',
            fontWeight: '800', fontSize: '15px', letterSpacing: '0.08em',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 6px 24px rgba(0,84,166,0.45)',
            transition: 'all 0.2s', textTransform: 'uppercase',
          }}
        >
          {loading ? 'Accesso in corso...' : 'Accedi →'}
        </button>

        <div style={{
          marginTop: '28px', fontSize: '11px',
          color: 'rgba(255,255,255,0.35)',
          textAlign: 'center', letterSpacing: '0.04em',
        }}>
          Accesso riservato al personale ZCS
        </div>
      </div>
    </div>
  );
}