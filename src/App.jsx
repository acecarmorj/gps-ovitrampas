import React, { useState, useEffect, useRef } from 'react';
import { useAppPath } from './lib/routing';
import { Header } from './components/Header';
import { GuiaScreen } from './features/menu/GuiaScreen';
import { InstalarArmadilhaScreen } from './features/campo/InstalarArmadilhaScreen';
import { PainelAcompanhamentoScreen } from './features/acompanhamento/PainelAcompanhamentoScreen';
import { LaboratorioScreen } from './features/laboratorio/LaboratorioScreen';
import { PainelAdminSimples as PainelAdminScreen } from './features/admin/PainelAdminSimples';
import { CenarioIdealScreen } from './features/planejamento/CenarioIdealScreen';
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
import { iniciarMonitoramentoOutrosAgentes } from './lib/agentLiveTracking';
import { GpsGatekeeperModal } from './components/GpsGatekeeperModal';

export function App() {
  const { path, navigate } = useAppPath();
  const [armadilhas, setArmadilhas] = useState([]);
  const [quotaAviso, setQuotaAviso] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaAviso(true);
    window.addEventListener('ovitrampas_quota_exceeded', handleQuota);
    return () => window.removeEventListener('ovitrampas_quota_exceeded', handleQuota);
  }, []);
  const [armadilhaParaLab, setArmadilhaParaLab] = useState(null);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('ovitrampa_muted') === 'true');
  const [syncInfo, setSyncInfo] = useState(getStatusSincronizacao);
  const [outrosAgentes, setOutrosAgentes] = useState([]);
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

  // Monitoramento em tempo real de múltiplos agentes em campo (Carmo-RJ).
  // userPos muda de objeto a cada tick de GPS (varias vezes por segundo); se o
  // efeito dependesse de [userPos], o loop de heartbeat reiniciava a cada tick
  // em vez de manter o ciclo de 7s. A ref guarda a posicao mais recente sem
  // recriar o monitoramento.
  const userPosRef = useRef(userPos);
  userPosRef.current = userPos;

  useEffect(() => {
    const unsubscribe = iniciarMonitoramentoOutrosAgentes(
      () => userPosRef.current,
      (lista) => setOutrosAgentes(lista)
    );
    return () => unsubscribe();
  }, []);

  // GPS Inteligente e Econômico (apenas quando necessário e sem concorrência)
  useEffect(() => {
    // Na tela /campo, a própria tela gerencia o rastreamento entomológico com máxima precisão.
    // Em telas sem mapa (como /laboratorio e /guia), desliga o sensor para poupar bateria.
    const precisaGpsNoRoot = path === '/mapa' || path === '/admin' || path === '/planejamento' || path === '/cenario-ideal';
    if (!precisaGpsNoRoot || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy)
        });
      },
      (err) => console.warn('Falha watchPosition:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [path]);

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
    if (path === '/planejamento' || path === '/cenario-ideal') return 'planejamento';
    return 'guia';
  };

  const chaveModulo = getChaveModulo();

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden bg-[#F1F2F5] text-slate-900 font-sans">
      {/* GPS obrigatorio so na tela de cadastro em campo, onde a coordenada
          precisa ser real pra nao gravar a posicao errada. As demais telas
          (mapa, laboratorio, admin) so exibem/consultam dado ja existente,
          nao precisam travar o uso exigindo GPS. */}
      {chaveModulo === 'campo' && (
        <GpsGatekeeperModal onGpsAutorizado={(pos) => setUserPos(pos)} />
      )}
      
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

      {quotaAviso && (
        <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between z-40 shadow-md">
          <span>⚠️ Armazenamento local do navegador cheio! Libere espaço no aparelho para continuar salvando.</span>
          <button onClick={() => setQuotaAviso(false)} className="underline ml-2 hover:text-rose-200">Fechar</button>
        </div>
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
            onPosicaoAtualizada={(pos) => setUserPos(pos)}
          />
        )}

        {chaveModulo === 'mapa' && (
          <PainelAcompanhamentoScreen
            armadilhas={armadilhas}
            userPos={userPos}
            outrosAgentes={outrosAgentes}
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
            outrosAgentes={outrosAgentes}
            onAtualizarArmadilhas={() => recarregarArmadilhas()}
          />
        )}

        {(chaveModulo === 'planejamento' || chaveModulo === 'cenario-ideal') && (
          <CenarioIdealScreen
            armadilhas={armadilhas}
            onVoltar={() => navigate('/guia')}
          />
        )}
      </main>
    </div>
  );
}
