import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement);

const token = new URLSearchParams(window.location.search).get('token');

if (token) {
  // Vista pubblica cliente — non monta App, non richiede login
  import('./components/ClienteStandalone.jsx').then(({ ClienteStandalone }) => {
    root.render(React.createElement(ClienteStandalone, { token }));
  });
} else {
  // Portale normale
  import('./App').then(({ default: App }) => {
    root.render(
      React.createElement(StrictMode, null,
        React.createElement(App)
      )
    );
  });
}