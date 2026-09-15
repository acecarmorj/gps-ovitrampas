import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
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
  const [abaAtual, setAbaAtual] = useState('campo'); // 'campo' | 'mapa' | 'laboratorio'
  const [armadilhas, setArmadilhas] = useState([]);
  const [armadilhaParaLab, setArmadilhaParaLab] = useState(null);
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('ovitrampa_muted') === 'true');
  const [syncInfo, setSyncInfo] = useState(getStatusSincronizacao);
  const [userPos, setUserPos] = useState({
    latitude: -21.9339,
    longitude: -42.6089
  });

  // Inicializa a persistência do banco e o monitoramento em segundo plano
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

  // GPS Contínuo do Agente
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

  const handleIrParaLaboratorio = (armadilha) => {
    setArmadilhaParaLab(armadilha);
    setAbaAtual('laboratorio');
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden bg-slate-950 font-sans">
      <Header
        abaAtual={abaAtual}
        onMudarAba={(novaAba) => {
          setAbaAtual(novaAba);
          if (novaAba !== 'laboratorio') {
            setArmadilhaParaLab(null);
          }
        }}
        totalArmadilhas={armadilhas.length}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        syncInfo={syncInfo}
        onForcarSync={async () => {
          await tentarSincronizarEmSegundoPlano();
          await sincronizarDadosDoServidor();
          recarregarArmadilhas();
        }}
      />

      <main className="flex-1 relative w-full h-full overflow-hidden">
        {abaAtual === 'campo' && (
          <InstalarArmadilhaScreen
            armadilhas={armadilhas}
            onArmadilhaCadastrada={() => recarregarArmadilhas()}
            onVerMapaGeral={() => setAbaAtual('mapa')}
          />
        )}

        {abaAtual === 'mapa' && (
          <PainelAcompanhamentoScreen
            armadilhas={armadilhas}
            userPos={userPos}
            onExcluirArmadilha={() => recarregarArmadilhas()}
            onIrParaLaboratorio={handleIrParaLaboratorio}
          />
        )}

        {abaAtual === 'laboratorio' && (
          <LaboratorioScreen
            armadilhas={armadilhas}
            armadilhaPreSelecionada={armadilhaParaLab}
            onLeituraConcluida={() => recarregarArmadilhas()}
          />
        )}

        {abaAtual === 'admin' && (
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
