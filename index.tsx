
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar o app.");
}

const showError = (message: any) => {
  const errorMsg = message instanceof Error ? message.message : String(message);
  
  // Ignora erros de ResizeObserver que são comuns e inofensivos
  if (errorMsg.includes('ResizeObserver loop')) return;

  rootElement.innerHTML = `
    <div style="padding: 40px; color: #9B111E; font-family: sans-serif; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background-color: #fcfcfc;">
      <h1 style="font-weight: 900; font-size: 2rem; margin-bottom: 10px;">Ops! Erro no Sistema.</h1>
      <p style="color: #666; max-width: 500px;">Ocorreu uma falha inesperada. Se o erro persistir, verifique a configuração da <strong>VITE_API_KEY</strong> na Vercel e se um novo 'Redeploy' foi feito.</p>
      <div style="background: #f8f8f8; padding: 20px; border-radius: 15px; margin-top: 30px; font-size: 13px; text-align: left; border: 1px solid #eee; font-family: monospace; color: #444; max-width: 80%; overflow: auto;">
        <code>${errorMsg}</code>
      </div>
      <button onclick="window.location.reload()" style="margin-top: 30px; padding: 12px 24px; background: #9B111E; color: white; border: none; border-radius: 10px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;">Recarregar Sistema</button>
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
      <App />
    </React.StrictMode>
  );
} catch (error: any) {
  console.error("Erro ao renderizar:", error);
  showError(error);
}
