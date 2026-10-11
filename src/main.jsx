import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { getThemeChoice, applyTheme } from './utils/theme';

// Check for a new deployed version every time the app opens, and whenever it
// finds one, activate it immediately and reload once so you always see the
// latest version -- no manual hard-refresh needed.
registerSW({ immediate: true });

if ('serviceWorker' in navigator) {
  let hasReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hasReloaded) return;
    hasReloaded = true;
    window.location.reload();
  });
}

// If the person's on "Auto", keep the theme in sync if the system's light/
// dark setting changes while the app is open (same as Health Tracker).
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (getThemeChoice() === '') applyTheme('');
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
