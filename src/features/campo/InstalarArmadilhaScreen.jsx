import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, CheckCircle2, RefreshCw,
  X, AlertCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { resolveAddressFromGps } from '../../lib/geoDetection';
import { MapaGrandeOvitrampa } from '../../maps/MapaGrandeOvitrampa';
import { findNearbyTraps } from '../../lib/geoDistance';
import { BussolaOrientacao } from '../../maps/BussolaOrientacao';
import { PainelAcaoCampo } from './PainelAcaoCampo';
import { Compass } from 'lucide-react';

export function InstalarArmadilhaScreen({
  armadilhas = [],
  outrosAgentes = [],
  onArmadilhaCadastrada,
  onVerMapaGeral,
  onSelecionarArmadilha,
  onPosicaoAtualizada
}) {
  // Tela unica do agente de campo: instalar, trocar palheta e recolher.
  // A decisao de qual acao mostrar fica em PainelAcaoCampo.
  const [sucessoMsg, setSucessoMsg] = useState(null);
  const [numeroArmadilhaSelecionada, setNumeroArmadilhaSelecionada] = useState(null);
  // No celular o painel cobre quase todo o mapa; recolher deixa o agente ver
  // as armadilhas e as linhas de distância antes de escolher o ponto.
  const [painelAberto, setPainelAberto] = useState(true);
  const [mostrarBussolaFlutuante, setMostrarBussolaFlutuante] = useState(false);
  const [mostrarRotulos, setMostrarRotulos] = useState(false);

  // Localização e endereço capturados automaticamente pelo GPS de Carmo
  const [localizacao, setLocalizacao] = useState({
    rua: 'Detectando logradouro...',
    numero: '',
    bairro: 'Carmo',
    microarea: 'Centro',
    quarteirao: 'Q-01',
    latitude: -21.9339,
    longitude: -42.6089,
    accuracy: null,
    isExact: false
  });

  // Assistente de espaçamento (Regra de 300m a 400m entre armadilhas)
  // Memoizado com resolução de ~2 metros para poupar CPU e bateria em repouso
  const vizinhasProximas = React.useMemo(() => {
    return findNearbyTraps(localizacao, armadilhas, 3);
  }, [
    Math.round((localizacao?.latitude || 0) * 50000),
    Math.round((localizacao?.longitude || 0) * 50000),
    armadilhas
  ]);
  const vizinhaMaisProxima = vizinhasProximas.length > 0 ? vizinhasProximas[0] : null;

  const [gpsStatus, setGpsStatus] = useState('buscando'); // 'buscando' | 'pronto' | 'erro'
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');
  const lastGeocodedRef = useRef({ lat: 0, lng: 0, acc: 999, time: 0 });
  const bestAccuracyRef = useRef(Infinity);
  const watchIdRef = useRef(null);

  // Cálculo da distância geodésica em metros
  const calcDistMeters = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Processa leituras contínuas dos satélites GNSS
  const processarNovaPosicao = async (pos, forcarGeocoding = false) => {
    const { latitude, longitude, accuracy } = pos.coords;
    const roundedAcc = Math.round(accuracy);

    if (roundedAcc < bestAccuracyRef.current) {
      bestAccuracyRef.current = roundedAcc;
    }

    const dist = calcDistMeters(
      lastGeocodedRef.current.lat,
      lastGeocodedRef.current.lng,
      latitude,
      longitude
    );

    // Comunica a posição unificada para o restante do app
    onPosicaoAtualizada?.({
      latitude,
      longitude,
      accuracy: roundedAcc
    });

    // Throttling de repouso: se o agente está parado (deslocamento < 1.5m) e a precisão não variou,
    // não re-renderiza o componente nem o mapa para poupar bateria e evitar aquecimento
    const estaParado = !forcarGeocoding && lastGeocodedRef.current.lat !== 0 && dist < 1.5 && Math.abs(roundedAcc - (localizacao.accuracy || 0)) < 3;
    if (estaParado) {
      return;
    }

    // Re-resolve endereço e quarteirão oficial quando:
    // 1. Forçado pelo usuário
    // 2. Primeira inicialização (lat = 0)
    // 3. O agente caminhou mais de 5 metros
    // 4. A precisão do GPS melhorou significativamente (ex: de >20m para <=12m)
    const precisaoMelhorouMuito = lastGeocodedRef.current.acc > 20 && roundedAcc <= 12;
    const deveGeocodificar = forcarGeocoding || lastGeocodedRef.current.lat === 0 || dist > 5 || precisaoMelhorouMuito;

    if (deveGeocodificar) {
      lastGeocodedRef.current = { lat: latitude, lng: longitude, acc: roundedAcc, time: Date.now() };
      try {
        const det = await resolveAddressFromGps(latitude, longitude);
        setLocalizacao({
          rua: det.rua || 'Rua Principal',
          numero: det.numero || '',
          bairro: det.bairro || det.microarea || 'Centro',
          microarea: det.microarea || 'Centro',
          quarteirao: det.quarteirao || 'Q-01',
          latitude,
          longitude,
          accuracy: roundedAcc,
          isExact: det.isExactPolygon
        });
        setGpsStatus('pronto');
        setGpsErrorMsg('');
      } catch (e) {
        setLocalizacao((prev) => ({
          ...prev,
          latitude,
          longitude,
          accuracy: roundedAcc
        }));
        setGpsStatus('pronto');
      }
    } else {
      // Atualiza coordenadas em tempo real no mapa e halo de precisão
      setLocalizacao((prev) => ({
        ...prev,
        latitude,
        longitude,
        accuracy: roundedAcc
      }));
      setGpsStatus('pronto');
    }
  };

  // Monitoramento contínuo de satélites com enableHighAccuracy forçado e sem cache
  const iniciarMonitoramentoGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('erro');
      setGpsErrorMsg('Geolocalização não suportada no aparelho.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setGpsStatus('buscando');

    const options = {
      enableHighAccuracy: true, // Força chip GNSS / Satélites de alta precisão
      maximumAge: 0,            // PROIBIDO cache: sempre leitura fresca do hardware
      timeout: 20000            // Tempo suficiente para estabilizar conexão com múltiplos satélites
    };

    // 1. Tenta fix inicial imediato
    navigator.geolocation.getCurrentPosition(
      (pos) => processarNovaPosicao(pos, true),
      (err) => console.warn('Aguardando satélites GNSS...', err),
      options
    );

    // 2. Rastreamento contínuo de alta precisão em tempo real
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        processarNovaPosicao(pos, false);
      },
      (err) => {
        console.warn('GPS watch warning:', err);
        if (err.code === 1) {
          setGpsStatus('erro');
          setGpsErrorMsg('Permissão de GPS negada. Ative a localização no navegador.');
        } else if (err.code === 2) {
          setGpsStatus('erro');
          setGpsErrorMsg('Sinal de satélites fraco. Fique sob céu aberto.');
        } else if (err.code === 3) {
          console.log('Buscando sinal de satélites...');
        }
      },
      options
    );

    watchIdRef.current = id;
  };

  useEffect(() => {
    iniciarMonitoramentoGps();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const handleForcarRecalibracao = () => {
    lastGeocodedRef.current = { lat: 0, lng: 0, acc: 999, time: 0 };
    iniciarMonitoramentoGps();
  };

  const handleConcluido = (mensagem) => {
    setSucessoMsg(mensagem);
    onArmadilhaCadastrada?.();
    setTimeout(() => setSucessoMsg(null), 6000);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-clip font-sans select-none">
      {/* 1. MAPA GRANDE EM TELA CHEIA */}
      <div className="absolute inset-0 z-0">
        <MapaGrandeOvitrampa
          userPos={localizacao}
          microarea={localizacao.microarea}
          quarteirao={localizacao.quarteirao}
          armadilhas={armadilhas}
          onSelectArmadilha={(arm) => {
            if (arm?.numero) {
              setNumeroArmadilhaSelecionada(arm.numero);
              setPainelAberto(true);
            } else if (onSelecionarArmadilha) {
              onSelecionarArmadilha(arm);
            }
          }}
          controlTop={56}
          showLabels={mostrarRotulos}
          onToggleLabels={() => setMostrarRotulos(!mostrarRotulos)}
          showDistances={true}
          outrosAgentes={outrosAgentes}
        />
      </div>

      {/* 2. BARRA SUPERIOR DE ALTA PRECISÃO GPS */}
      <header className="absolute top-2.5 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
        <div className="hidden sm:flex bg-white/92 backdrop-blur-md text-slate-900 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-md items-center gap-1.5 text-xs font-black pointer-events-auto shrink-0">
          <span>🪤 GPS Ovitrampa Carmo</span>
        </div>

        {/* Indicador de Precisão dos Satélites em Tempo Real */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {localizacao.accuracy !== null ? (
            <div
              className={`backdrop-blur-md px-3 py-1.5 rounded-full border shadow-md flex items-center gap-1.5 text-[11px] font-black transition-all ${
 localizacao.accuracy <= 10
 ? 'bg-white border-slate-300 text-black'
 : localizacao.accuracy <= 25
 ? 'bg-white border-slate-300 text-black'
 : 'bg-white border-slate-300 text-black'
 }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
 localizacao.accuracy <= 10
 ? 'bg-black animate-pulse'
 : localizacao.accuracy <= 25
 ? 'bg-black'
 : 'bg-black animate-ping'
 }`}
              />
              <span>
                {localizacao.accuracy <= 10
                  ? `🎯 Alta Precisão (±${localizacao.accuracy}m)`
                  : localizacao.accuracy <= 25
                  ? `📡 Bom (±${localizacao.accuracy}m)`
                  : `🛰️ Calibrando (±${localizacao.accuracy}m)`}
              </span>
            </div>
          ) : gpsStatus === 'erro' ? (
            <div className="bg-rose-50/95 backdrop-blur-md border border-rose-300 text-rose-800 px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 text-[11px] font-black">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Sem Sinal GPS</span>
            </div>
          ) : (
            <div className="bg-white/92 backdrop-blur-md border border-slate-200 text-slate-700 px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 text-[11px] font-black">
              <RefreshCw className="w-3.5 h-3.5 text-slate-700 animate-spin" />
              <span>Buscando Satélites...</span>
            </div>
          )}

          {/* Botão de Recalibrar Satélites GNSS */}
          <button
            type="button"
            onClick={handleForcarRecalibracao}
            className="bg-white/92 hover:bg-white active:scale-90 backdrop-blur-md text-slate-700 hover:text-black w-8 h-8 rounded-full border border-slate-200/90 shadow-md flex items-center justify-center transition-all shrink-0"
            title="Recalibrar sinal de satélites agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-700 ${gpsStatus === 'buscando' ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Botão de Bússola e Rumo Tático */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setMostrarBussolaFlutuante((v) => !v)}
            className={`backdrop-blur-md px-3 py-1.5 rounded-full border shadow-md flex items-center gap-1.5 text-xs font-black transition-all ${
 mostrarBussolaFlutuante
 ? 'bg-black text-white border-slate-300'
 : 'bg-white/92 text-slate-800 border-slate-200/90 hover:bg-white'
 }`}
            title="Abrir bússola e orientação cardeal"
          >
            <Compass className={`w-3.5 h-3.5 ${mostrarBussolaFlutuante ? 'text-white' : 'text-slate-700'}`} />
            <span>Bússola</span>
          </button>
        </div>
      </header>

      {/* MODAL / CARD FLUTUANTE DE BÚSSOLA NO MAPA */}
      {mostrarBussolaFlutuante && (
        <div className="absolute top-14 left-3 right-3 z-30 max-w-sm mx-auto pointer-events-auto animate-in fade-in">
          <BussolaOrientacao
            userPos={localizacao}
            armadilhas={armadilhas}
            onFechar={() => setMostrarBussolaFlutuante(false)}
          />
        </div>
      )}

      {/* 3. ALERTA DE SUCESSO */}
      {sucessoMsg && (
        <div className="absolute top-14 left-3 right-3 z-40 max-w-sm mx-auto bg-black text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span className="flex-1">{sucessoMsg}</span>
          <button onClick={() => setSucessoMsg(null)} className="p-1 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. PAINEL FLUTUANTE SUAVE / CLARO SEMITRANSPARENTE (ESTILO MOTOJÁ) */}
      {/* Recolhível: no celular ele cobre quase todo o mapa, então o agente
          pode ocultar para enxergar as armadilhas e as linhas de distância. */}
      <div className="absolute left-0 right-0 bottom-0 z-30 p-2.5 sm:p-4 max-w-md mx-auto w-full pointer-events-none">

        {!painelAberto && (
          <button
            type="button"
            onClick={() => setPainelAberto(true)}
            className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/15 border border-white/80 px-4 py-3 pointer-events-auto text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <div className="w-9 h-9 rounded-2xl bg-black flex items-center justify-center shrink-0 shadow-md">
              <ChevronUp className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 leading-tight">
                Ações de campo
              </p>
              <p className="text-[11px] text-slate-600 truncate leading-tight mt-0.5">
                {localizacao.rua} • <span className="text-black font-extrabold">{localizacao.quarteirao}</span>
              </p>
            </div>
            {vizinhaMaisProxima && (
              <span
                className="text-[10px] font-black px-2 py-1 rounded-lg border shrink-0"
                style={{
                  backgroundColor: vizinhaMaisProxima.corFundo,
                  borderColor: vizinhaMaisProxima.corBorda,
                  color: vizinhaMaisProxima.cor
                }}
              >
                {vizinhaMaisProxima.distancia} m
              </span>
            )}
          </button>
        )}

        <div
          className={`bg-white/98 sm:bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/20 border border-slate-300 p-3.5 sm:p-4 space-y-3 pointer-events-auto text-slate-900 max-h-[82dvh] overflow-y-auto ${
 painelAberto ? '' : 'hidden'
 }`}
        >
          {/* Alça para ocultar o painel e liberar o mapa */}
          <button
            type="button"
            onClick={() => setPainelAberto(false)}
            className="w-full flex items-center justify-center gap-1.5 -mt-1 pb-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
          >
            <ChevronDown className="w-4 h-4" />
            <span>Ocultar e ver o mapa</span>
          </button>

          {/* ENDEREÇO E QUARTEIRÃO DETECTADOS 100% PELO GPS */}
          <div className="flex items-center gap-2.5 bg-white px-3.5 py-2.5 rounded-2xl border border-slate-300 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight">
                {localizacao.rua} {localizacao.numero ? `Nº ${localizacao.numero}` : ''}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[11px] text-slate-600 font-medium">
                  {localizacao.microarea} • <span className="text-black font-extrabold">{localizacao.quarteirao}</span>
                </span>
                {localizacao.accuracy !== null && (
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border ${
 localizacao.accuracy <= 10
 ? 'bg-slate-100 text-black border-slate-300'
 : localizacao.accuracy <= 25
 ? 'bg-slate-100 text-black border-slate-300'
 : 'bg-slate-100 text-black border-slate-300'
 }`}>
                    {localizacao.accuracy <= 10 ? '🎯 ' : '📡 '}±{localizacao.accuracy}m
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleForcarRecalibracao}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Recalibrar endereço e quarteirão com satélites"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${gpsStatus === 'buscando' ? 'animate-spin text-slate-700' : ''}`} />
            </button>
          </div>

          {/* Dica amigável se a precisão estiver em calibração (> 25 metros) */}
          {localizacao.accuracy !== null && localizacao.accuracy > 25 && (
            <div className="flex items-center gap-1.5 text-[11px] text-black bg-white px-3 py-1.5 rounded-xl border border-slate-300">
              <span className="shrink-0 text-xs">🛰️</span>
              <span className="leading-tight">
                Calibrando satélites (±{localizacao.accuracy}m). Sob céu aberto atinge precisão máxima (≤ 10m).
              </span>
            </div>
          )}

          {/* Alerta se o GPS estiver com erro ou sem sinal */}
          {gpsErrorMsg && (
            <div className="flex items-center gap-1.5 text-[11px] text-rose-800 bg-rose-50 px-3 py-2 rounded-xl border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="leading-tight font-semibold">{gpsErrorMsg}</span>
            </div>
          )}


          <PainelAcaoCampo
            armadilhas={armadilhas}
            localizacao={localizacao}
            vizinhasProximas={vizinhasProximas}
            gpsErrorMsg={gpsErrorMsg}
            numeroPredefinido={numeroArmadilhaSelecionada}
            onConcluido={(msg) => {
              setNumeroArmadilhaSelecionada(null);
              handleConcluido(msg);
            }}
          />

        </div>
      </div>
    </div>
  );
}
