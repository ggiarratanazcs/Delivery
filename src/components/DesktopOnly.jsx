import React from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    () => window.innerWidth < 768
  );

  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return isMobile;
}

export function DesktopOnly({ children, label = 'questa sezione' }) {
  const isMobile = useIsMobile();

  if (!isMobile) return children;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '48px 32px',
      textAlign: 'center',
      flex: 1,
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        background: '#eff6ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
      }}>
        🖥️
      </div>
      <div>
        <div style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#0f172a',
          marginBottom: '8px',
        }}>
          Disponibile solo su desktop
        </div>
        <div style={{
          fontSize: '13px',
          color: '#64748b',
          lineHeight: 1.5,
          maxWidth: '280px',
        }}>
          {label === 'questa sezione'
            ? 'Questa sezione è ottimizzata per schermi più grandi.'
            : `La sezione "${label}" è ottimizzata per schermi più grandi.`}
          <br />
          Aprila da un computer per accedere a tutte le funzionalità.
        </div>
      </div>
      <div style={{
        marginTop: '8px',
        padding: '8px 20px',
        background: '#f1f5f9',
        borderRadius: '20px',
        fontSize: '11px',
        color: '#94a3b8',
        letterSpacing: '0.02em',
      }}>
        Schermo rilevato: {window.innerWidth}px — minimo richiesto: 768px
      </div>
    </div>
  );
}