
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
    <div style="padding: 20px; color: #9B111E; font-family: sans-serif; text-align: center;">
      <h1 style="font-weight: 900;">Ops! Algo deu errado no carregamento.</h1>
      <p style="color: #666;">Isso geralmente acontece por falta de configuração na Vercel ou no Supabase.</p>
      <div style="background: #f8f8f8; padding: 15px; border-radius: 10px; margin-top: 20px; font-size: 12px; text-align: left; display: inline-block;">
        <code>${message}</code>
      </div>
      <p style="margin-top: 20px; font-size: 14px;">Verifique se a <b>API_KEY</b> foi adicionada corretamente nas configurações da Vercel.</p>
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
