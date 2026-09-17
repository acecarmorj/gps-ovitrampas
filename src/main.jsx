import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Sem isso o app "offline-first" nao consegue nem abrir sem internet: o
// agente fecha o navegador numa area sem sinal, o proximo carregamento pede
// o index.html/JS pra rede e cai na tela padrao de erro do navegador.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Checa atualizações periodicamente
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nova versão instalada! Recarrega automaticamente para aplicar novo bundle
              window.location.reload();
            }
          });
        }
      });
    }).catch(() => {});
  });
}
