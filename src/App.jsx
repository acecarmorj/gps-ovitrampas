import React, { useState, useEffect } from 'react';
import { useAppPath } from './lib/routing';
import { Header } from './components/Header';
import { GuiaScreen } from './features/menu/GuiaScreen';
import { InstalarArmadilhaScreen } from './features/campo/InstalarArmadilhaScreen';
import { PainelAcompanhamentoScreen } from './features/acompanhamento/PainelAcompanhamentoScreen';
import { LaboratorioScreen } from './features/laboratorio/LaboratorioScreen';
import { PainelAdminScreen } from './features/admin/PainelAdminScreen';
import {
  getArmadilhas,
  onStorageUpdate,
  iniciarMonitoramentoConectividade,
  onSyncStatusChange,
  getStatusSincronizacao,
  tentarSincronizarEmSegundoPlano,
  sincronizarDadosDoServidor
} from './lib/storage';
import { setMuted } from './lib/soundAlert';

export function App() {
  const { path, navigate } = useAppPath();
  const [armadilhas, setArmadilhas] = useState([]);
  const [armadilhaParaLab, setArmadilhaParaLab] = useState(null);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('ovitrampa_muted') === 'true');
  const [syncInfo, setSyncInfo] = useState(getStatusSincronizacao);
  const [userPos, setUserPos] = useState({
    latitude: -21.9339,
    longitude: -42.6089
  });

  // Inicializa persistência e sincronização em segundo plano
  useEffect(() => {
    iniciarMonitoramentoConectividade();

    const unsubscribeSync = onSyncStatusChange((novoStatus) => {
      setSyncInfo(novoStatus);
    });

    return () => unsubscribeSync();
  }, []);

  // Carrega armadilhas e escuta atualizações locais
  const recarregarArmadilhas = () => {
    setArmadilhas(getArmadilhas());
  };

  useEffect(() => {
    recarregarArmadilhas();
    const unsubscribe = onStorageUpdate(() => {
      recarregarArmadilhas();
    });
    return () => unsubscribe();
  }, []);

  // GPS Contínuo do Agente em Campo
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
      },
      (err) => console.warn('Falha watchPosition:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Controle de Som Mudo
  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('ovitrampa_muted', String(next));
      setMuted(next);
      return next;
    });
  };

  const handleForcarSync = async () => {
    await tentarSincronizarEmSegundoPlano();
    await sincronizarDadosDoServidor();
    recarregarArmadilhas();
  };

  const handleIrParaLaboratorio = (armadilha) => {
    setArmadilhaParaLab(armadilha);
    navigate('/laboratorio');
  };

  // Mapeia caminho atual para a chave de aba do Header
  const getChaveModulo = () => {
    if (path === '/campo') return 'campo';
    if (path === '/mapa') return 'mapa';
    if (path === '/laboratorio') return 'laboratorio';
    if (path === '/admin') return 'admin';
    return 'guia';
  };

  const chaveModulo = getChaveModulo();

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden bg-slate-950 font-sans">
      
      {/* O Guia possui seu próprio cabeçalho completo. Nas telas internas, exibe o Header com botão < Guia */}
      {chaveModulo !== 'guia' && (
        <Header
          abaAtual={chaveModulo}
          onMudarAba={(destino) => {
            if (destino === 'guia') {
              setArmadilhaParaLab(null);
              navigate('/guia');
            } else {
              navigate(`/${destino}`);
            }
          }}
          totalArmadilhas={armadilhas.length}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          syncInfo={syncInfo}
          onForcarSync={handleForcarSync}
        />
      )}

      <main className="flex-1 relative w-full h-full overflow-hidden">
        {chaveModulo === 'guia' && (
          <GuiaScreen
            onNavegar={(rota) => navigate(rota)}
            totalArmadilhas={armadilhas.length}
            syncInfo={syncInfo}
            onForcarSync={handleForcarSync}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
          />
        )}

        {chaveModulo === 'campo' && (
          <InstalarArmadilhaScreen
            armadilhas={armadilhas}
            onArmadilhaCadastrada={() => recarregarArmadilhas()}
            onVerMapaGeral={() => navigate('/mapa')}
          />
        )}

        {chaveModulo === 'mapa' && (
          <PainelAcompanhamentoScreen
            armadilhas={armadilhas}
            userPos={userPos}
            onExcluirArmadilha={() => recarregarArmadilhas()}
            onIrParaLaboratorio={handleIrParaLaboratorio}
          />
        )}

        {chaveModulo === 'laboratorio' && (
          <LaboratorioScreen
            armadilhas={armadilhas}
            armadilhaPreSelecionada={armadilhaParaLab}
            onLeituraConcluida={() => recarregarArmadilhas()}
          />
        )}

        {chaveModulo === 'admin' && (
          <PainelAdminScreen
            armadilhas={armadilhas}
            userPos={userPos}
            onAtualizarArmadilhas={() => recarregarArmadilhas()}
          />
        )}
      </main>
    </div>
  );
}
