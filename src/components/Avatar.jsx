import React from 'react';
import { getAvatarColor, getInitials } from '../utils.js';

/**
 * Avatar — mostra foto profilo se disponibile, altrimenti iniziali colorate
 * Props:
 *   name: string — "Cognome Nome" usato per colore/iniziali
 *   avatarUrl: string|null — URL foto profilo
 *   size: number — diametro in px (default 26)
 *   fontSize: number — font size iniziali (default auto)
 *   style: object — stili aggiuntivi
 */
export function Avatar({ name = '', avatarUrl, size = 26, fontSize, style = {} }) {
  const ac = getAvatarColor(name || '?');
  const initials = getInitials(name || '?');
  const fs = fontSize || Math.round(size * 0.38);

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      overflow: 'hidden',
      flexShrink: 0,
      border: `1px solid ${avatarUrl ? '#e2e8f0' : ac.text + '33'}`,
      background: ac.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...style,
    }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={initials}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
        />
      ) : null}
      <span style={{
        display: avatarUrl ? 'none' : 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        fontSize: fs,
        fontWeight: 700,
        color: ac.text,
        letterSpacing: '0.02em',
      }}>
        {initials}
      </span>
    </div>
  );
}