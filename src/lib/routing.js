import { useState, useEffect } from 'react';

/**
 * Normaliza caminhos URL para as rotas canônicas do sistema
 * Igual ao padrão de rotas do MOTOJA
 */
export function normalizePath(pathname) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';

  // Rota canônica do Guia / Hub Principal
  if (clean === '/' || clean === '' || clean === '/guia' || clean === '/menu' || clean === '/inicio') {
    return '/guia';
  }

  // Módulo de Campo (Instalar Armadilha)
  if (clean === '/campo' || clean === '/instalar' || clean === '/agente') {
    return '/campo';
  }

  // Módulo de Mapa / Acompanhamento
  if (clean === '/mapa' || clean === '/acompanhamento' || clean === '/rotas') {
    return '/mapa';
  }

  // Módulo de Laboratório (Leitura de Ovos)
  if (clean === '/laboratorio' || clean === '/lab' || clean === '/ovos') {
    return '/laboratorio';
  }

  // Painel de Coordenação / Administrador
  if (clean === '/admin' || clean === '/administrador' || clean === '/painel') {
    return '/admin';
  }

  // Rota desconhecida volta ao Guia
  return '/guia';
}

/**
 * Hook para sincronizar navegação com a barra de endereços do navegador (SPA)
 */
export function useAppPath() {
  const [path, setPath] = useState(() => {
    if (typeof window === 'undefined') return '/guia';
    const next = normalizePath(window.location.pathname);
    const current = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    if (next !== current && window.history?.replaceState) {
      window.history.replaceState({}, '', next + window.location.search + window.location.hash);
    }
    return next;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onPop = () => {
      const next = normalizePath(window.location.pathname);
      const current = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
      if (next !== current && window.history?.replaceState) {
        window.history.replaceState({}, '', next + window.location.search + window.location.hash);
      }
      setPath(next);
    };

    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to) => {
    const next = normalizePath(to);
    if (typeof window !== 'undefined' && window.history?.pushState) {
      if (next !== path) {
        window.history.pushState({}, '', next);
      }
    }
    setPath(next);
  };

  return { path, navigate };
}
