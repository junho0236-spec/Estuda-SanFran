
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Não foi possível encontrar o elemento root para montar o app.");
}

// Captura erros globais para evitar a "tela branca" sem explicação
window.onerror = (message) => {
  rootElement.innerHTML = `
    <div style="padding: 40px; color: #9B111E; font-family: sans-serif; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh;">
      <h1 style="font-weight: 900; font-size: 2rem; margin-bottom: 10px;">Ops! Algo deu errado.</h1>
      <p style="color: #666; max-width: 500px;">O sistema encontrou um erro inesperado durante o processamento da sua sessão acadêmica.</p>
      <div style="background: #f8f8f8; padding: 20px; border-radius: 15px; margin-top: 30px; font-size: 13px; text-align: left; border: 1px solid #eee; font-family: monospace; color: #444;">
        <code>${message}</code>
      </div>
      <button onclick="window.location.reload()" style="margin-top: 30px; padding: 12px 24px; background: #9B111E; color: white; border: none; border-radius: 10px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;">Recarregar Sistema</button>
    </div>
  `;
};

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error: any) {
  console.error("Erro ao renderizar:", error);
}
