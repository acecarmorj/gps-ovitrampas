import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppPath } from './lib/routing';
import { Header } from './components/Header';
import { GuiaScreen } from './features/menu/GuiaScreen';
import { InstalarArmadilhaScreen } from './features/campo/InstalarArmadilhaScreen';
import { PainelAcompanhamentoScreen } from './features/acompanhamento/PainelAcompanhamentoScreen';
import { LaboratorioScreen } from './features/laboratorio/LaboratorioScreen';
import { PainelAdminSimples as PainelAdminScreen } from './features/admin/PainelAdminSimples';
import { PainelMapaCalorInterativo } from './features/mapa/PainelMapaCalorInterativo';
import { PortalPublicoScreen } from './features/publico/PortalPublicoScreen';
import { PainelDemoScreen } from './features/demo/PainelDemoScreen';
import { PlanoAcaoAgentesScreen } from './features/plano/PlanoAcaoAgentesScreen';
import { AcaoAgenteScreen } from './features/acao/AcaoAgenteScreen';
import {
  getArmadilhas,
  getLeituras,
  onStorageUpdate,
  iniciarMonitoramentoConectividade,
  onSyncStatusChange,
  getStatusSincronizacao,
  tentarSincronizarEmSegundoPlano,
  sincronizarDadosDoServidor,
  sincronizarLeiturasDoServidor
} from './lib/storage';
import {
  CICLO_AMBAS,
  CICLO_ID_ATUAL,
  CICLO_ID_ANTERIOR,
  getCampanhaAtiva,
  setCampanhaAtiva,
  adaptarArmadilhasParaCiclo
} from './lib/ciclosOvitrampas';
import { setMuted } from './lib/soundAlert';
import { iniciarMonitoramentoOutrosAgentes } from './lib/agentLiveTracking';
import { GpsGatekeeperModal } from './components/GpsGatekeeperModal';
import { AvisoAcessoEquipe } from './components/AcessoEquipe';

export function App() {
  const { path, navigate } = useAppPath();
  const [armadilhas, setArmadilhas] = useState(() => getArmadilhas());
  const [leituras, setLeituras] = useState(() => getLeituras());
  const [cicloAtivo, setCicloAtivo] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ovitrampa_ciclo_ativo') || CICLO_AMBAS;
    }
    return CICLO_AMBAS;
  });
  const [campanhaAtiva, setCampanhaAtivaState] = useState(() => {
    if (typeof window !== 'undefined' && (window.location.pathname.includes('/demo') || window.location.pathname.includes('/apresentacao'))) {
      return CICLO_ID_ANTERIOR;
    }
    return getCampanhaAtiva();
  });

  const handleMudarCiclo = (novoCiclo) => {
    setCicloAtivo(novoCiclo);
    try {
      localStorage.setItem('ovitrampa_ciclo_ativo', novoCiclo);
    } catch (_) {}
  };

  const handleMudarCampanha = (novaCampanha) => {
    setCampanhaAtivaState(novaCampanha);
    setCampanhaAtiva(novaCampanha);
  };

  useEffect(() => {
    const handleCampanha = (e) => {
      if (e.detail) setCampanhaAtivaState(e.detail);
    };
    window.addEventListener('ovitrampa_campanha_alterada', handleCampanha);
    return () => window.removeEventListener('ovitrampa_campanha_alterada', handleCampanha);
  }, []);

  const [quotaAviso, setQuotaAviso] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaAviso(true);
    window.addEventListener('ovitrampas_quota_exceeded', handleQuota);
    return () => window.removeEventListener('ovitrampas_quota_exceeded', handleQuota);
  }, []);
  const [armadilhaParaLab, setArmadilhaParaLab] = useState(null);
  const [armadilhaSelecionadaMapa, setArmadilhaSelecionadaMapa] = useState(null);
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

  // Carrega armadilhas e leituras, e escuta atualizações locais
  const recarregarDados = () => {
    setArmadilhas(getArmadilhas());
    setLeituras(getLeituras());
  };

  useEffect(() => {
    recarregarDados();

    // Sincroniza em segundo plano com o servidor Cloudflare D1
    sincronizarDadosDoServidor().then(() => recarregarDados()).catch(() => {});
    sincronizarLeiturasDoServidor().then(() => recarregarDados()).catch(() => {});

    const unsubscribe = onStorageUpdate(() => {
      recarregarDados();
    });
    return () => unsubscribe();
  }, []);

  // Armadilhas adaptadas conforme o ciclo semanal (Palheta A, Palheta B, ou Ambas A + B)
  // E conforme a campanha selecionada (Novo Ciclo 2026/2027 vs Ciclo Anterior 2025/2026)
  const armadilhasAdaptadas = useMemo(() => {
    return adaptarArmadilhasParaCiclo(armadilhas, leituras, cicloAtivo, campanhaAtiva);
  }, [armadilhas, leituras, cicloAtivo, campanhaAtiva]);

  // Versão 100% anonimizada para demonstrações públicas e apresentações em grupo (Modo Demo)
  const armadilhasDemo = useMemo(() => {
    return armadilhasAdaptadas.map((a) => ({
      ...a,
      moradorNome: 'XXX',
      morador_nome: 'XXX',
      responsavel: 'XXX',
      rua: 'Rua XXXXXXXXX',
      numeroImovel: 'XXX',
      numero_imovel: 'XXX'
    }));
  }, [armadilhasAdaptadas]);

  const armadilhasBrutasDemo = useMemo(() => {
    return armadilhas.map((a) => ({
      ...a,
      moradorNome: 'XXX',
      morador_nome: 'XXX',
      responsavel: 'XXX',
      rua: 'Rua XXXXXXXXX',
      numeroImovel: 'XXX',
      numero_imovel: 'XXX'
    }));
  }, [armadilhas]);

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
    const precisaGpsNoRoot = path === '/mapa' || path === '/admin' || path === '/calor';
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
    recarregarDados();
  };

  const handleIrParaLaboratorio = (armadilha) => {
    setArmadilhaParaLab(armadilha);
    navigate('/laboratorio');
  };

  const isDemo = path === '/demo' || (typeof window !== 'undefined' && (window.location.search.includes('demo=1') || window.location.search.includes('demo=true')));

  // Mapeia caminho atual para a chave de aba do Header
  const getChaveModulo = () => {
    if (isDemo || path === '/demo') return 'demo';
    if (path === '/campo') return 'campo';
    if (path === '/mapa') return 'mapa';
    if (path === '/laboratorio') return 'laboratorio';
    if (path === '/admin') return 'admin';
    if (path === '/calor' || path === '/mapa-calor' || path === '/planejamento' || path === '/cenario-ideal') return 'calor';
    if (path === '/publico' || path === '/transparencia') return 'publico';
    if (path === '/plano' || path === '/plano-de-acao' || path === '/acao' || path === '/bloqueio' || path === '/larissa' || path === '/vistoria') return 'acao';
    return 'guia';
  };

  const chaveModulo = getChaveModulo();

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden bg-[#F1F2F5] text-slate-900 font-sans">
      {import.meta.env.VITE_MODO_TREINAMENTO === '1' && (
        <div className="bg-black text-white text-center text-[11px] font-black tracking-wide py-1.5 shrink-0 z-50">
          MODO TREINAMENTO - os dados daqui sao de teste e nao valem
        </div>
      )}
      {/* GPS obrigatorio so na tela de cadastro em campo, onde a coordenada
          precisa ser real pra nao gravar a posicao errada. As demais telas
          (mapa, laboratorio, admin) so exibem/consultam dado ja existente,
          nao precisam travar o uso exigindo GPS. */}
      {chaveModulo === 'campo' && (
        <GpsGatekeeperModal onGpsAutorizado={(pos) => setUserPos(pos)} />
      )}
      
      {/* O Guia, o Portal Público, Modo Demonstração e Modo Ação possuem cabeçalhos próprios. Nas telas internas, exibe o Header do agente */}
      {chaveModulo !== 'guia' && chaveModulo !== 'publico' && chaveModulo !== 'demo' && chaveModulo !== 'acao' && (
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
          cicloAtivo={cicloAtivo}
          onMudarCiclo={handleMudarCiclo}
          campanhaAtiva={campanhaAtiva}
          onMudarCampanha={handleMudarCampanha}
        />
      )}

      {(chaveModulo === 'laboratorio' || chaveModulo === 'admin' || chaveModulo === 'campo') && <AvisoAcessoEquipe />}

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
            campanhaAtiva={campanhaAtiva}
            onMudarCampanha={handleMudarCampanha}
          />
        )}

        {chaveModulo === 'campo' && (
          <InstalarArmadilhaScreen
            armadilhas={armadilhas}
            outrosAgentes={outrosAgentes}
            onArmadilhaCadastrada={() => recarregarDados()}
            onVerMapaGeral={() => navigate('/mapa')}
            onPosicaoAtualizada={(pos) => setUserPos(pos)}
            onSelecionarArmadilha={(arm) => {
              setArmadilhaSelecionadaMapa(arm);
              navigate('/mapa');
            }}
            campanhaAtiva={campanhaAtiva}
            onMudarCampanha={handleMudarCampanha}
          />
        )}

        {chaveModulo === 'mapa' && (
          <PainelAcompanhamentoScreen
            armadilhas={armadilhasAdaptadas}
            armadilhasBrutas={armadilhas}
            todasLeituras={leituras}
            cicloAtivo={cicloAtivo}
            onMudarCiclo={handleMudarCiclo}
            campanhaAtiva={campanhaAtiva}
            onMudarCampanha={handleMudarCampanha}
            userPos={userPos}
            outrosAgentes={outrosAgentes}
            onExcluirArmadilha={() => recarregarDados()}
            onIrParaLaboratorio={handleIrParaLaboratorio}
            armadilhaInicial={armadilhaSelecionadaMapa}
          />
        )}

        {chaveModulo === 'laboratorio' && (
          <LaboratorioScreen
            armadilhas={armadilhas}
            armadilhaPreSelecionada={armadilhaParaLab}
            onLeituraConcluida={() => recarregarDados()}
            campanhaAtiva={campanhaAtiva}
            onMudarCampanha={handleMudarCampanha}
          />
        )}

        {chaveModulo === 'demo' && (
          <PainelDemoScreen
            armadilhasDemo={armadilhasDemo}
            armadilhasBrutasDemo={armadilhasBrutasDemo}
            todasLeituras={leituras}
            cicloAtivo={cicloAtivo}
            onMudarCiclo={handleMudarCiclo}
            campanhaAtiva={campanhaAtiva}
            onMudarCampanha={handleMudarCampanha}
            userPos={userPos}
            outrosAgentes={outrosAgentes}
          />
        )}

        {chaveModulo === 'admin' && (
          <PainelAdminScreen
            armadilhas={armadilhasAdaptadas}
            armadilhasBrutas={armadilhas}
            todasLeituras={leituras}
            cicloAtivo={cicloAtivo}
            onMudarCiclo={handleMudarCiclo}
            campanhaAtiva={campanhaAtiva}
            onMudarCampanha={handleMudarCampanha}
            userPos={userPos}
            outrosAgentes={outrosAgentes}
            onAtualizarArmadilhas={() => recarregarDados()}
          />
        )}

        {chaveModulo === 'calor' && (
          <PainelMapaCalorInterativo
            armadilhas={armadilhasAdaptadas}
            armadilhasBrutas={armadilhas}
            todasLeituras={leituras}
            cicloAtivo={cicloAtivo}
            onMudarCiclo={handleMudarCiclo}
            campanhaAtiva={campanhaAtiva}
            onMudarCampanha={handleMudarCampanha}
            userPos={userPos}
            onVoltar={() => navigate('/guia')}
            onAbrirLab={() => navigate('/laboratorio')}
          />
        )}

        {chaveModulo === 'publico' && (
          <PortalPublicoScreen
            armadilhas={armadilhasAdaptadas}
            todasLeituras={leituras}
            campanhaAtiva={campanhaAtiva}
            onMudarCampanha={handleMudarCampanha}
            onVoltar={() => navigate('/guia')}
          />
        )}

        {(chaveModulo === 'acao' || chaveModulo === 'plano') && (
          <AcaoAgenteScreen
            armadilhas={armadilhasAdaptadas}
            userPos={userPos}
            onVoltar={() => navigate('/guia')}
          />
        )}
      </main>
    </div>
  );
}
