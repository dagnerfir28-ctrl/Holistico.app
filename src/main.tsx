import { createRoot } from 'react-dom/client';
import './styles/app.css';
import { App } from './App';
import { TARGET } from './config/env';

const raiz = document.getElementById('root');
if (raiz) createRoot(raiz).render(<App />);

// Aplicación instalable (PWA) solo en el hosting propio: la vista previa de claude.ai no admite service workers.
if (TARGET === 'web' && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => undefined);
  });
}
