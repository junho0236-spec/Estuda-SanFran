
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './src/index.css';

// Force rebuild for Vercel deployment to resolve CSS and AnkiStats errors
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar o app.");
}

// Suprime avisos de defaultProps do Recharts que são comuns no React 18.3+
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
    return;
  }
  originalError(...args);
};

const showError = (message: unknown) => {
  const errorMsg = message instanceof Error ? message.message : String(message);

  // Ignora erros de ResizeObserver que são comuns e inofensivos
  if (errorMsg.includes('ResizeObserver loop')) return;

  // Ignora erro de timeout do LockManager do Supabase (comum em iframes/previews)
  if (errorMsg.includes('LockManager lock') && errorMsg.includes('timed out')) {
    console.warn('Supabase LockManager timeout ignorado:', errorMsg);
    return;
  }

  console.error('Falha global na aplicação:', message);

  rootElement.innerHTML = `
    <div style="padding: 40px; color: #9B111E; font-family: sans-serif; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background-color: #fcfcfc;">
      <h1 style="font-weight: 900; font-size: 2rem; margin-bottom: 10px;">Ops! Erro no Sistema.</h1>
      <button type="button" onclick="window.location.reload()" style="margin-top: 30px; padding: 12px 24px; background: #9B111E; color: white; border: none; border-radius: 10px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;">Recarregar sistema</button>
    </div>
  `;
};

// Captura erros globais síncronos
window.onerror = (message) => {
  showError(message);
};

// Captura erros globais assíncronos (Promises)
window.addEventListener('unhandledrejection', (event) => {
  showError(event.reason);
});

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
} catch (error: any) {
  console.error("Erro ao renderizar:", error);
  showError(error);
}
