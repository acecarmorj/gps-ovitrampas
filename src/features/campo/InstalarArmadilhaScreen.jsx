import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, CheckCircle2, RefreshCw,
  X, Check, User, AlertCircle,
  ChevronDown, ChevronUp, Ruler, Tag
} from 'lucide-react';
import { resolveAddressFromGps } from '../../lib/geoDetection';
import { MapaGrandeOvitrampa } from '../../maps/MapaGrandeOvitrampa';
import { playSuccessSound } from '../../lib/soundAlert';
import { cadastrarArmadilha } from '../../lib/storage';
import { calcularSituacaoArmadilha } from '../../lib/situacaoOvitrampa';
import { findNearbyTraps } from '../../lib/geoDistance';
import { BussolaOrientacao } from '../../maps/BussolaOrientacao';
import { calculateNavigationGuidance } from '../../lib/geoBearing';
import { Compass } from 'lucide-react';

export function InstalarArmadilhaScreen({
  armadilhas = [],
  onArmadilhaCadastrada,
  onVerMapaGeral,
  onPosicaoAtualizada
}) {
  // Campos ultra simplificados:
  // 1. Nome do Morador
  // 2. Número da OV
  // 3. Número da Palheta
  // Endereço, Microárea e Quarteirão são 100% automáticos pelo GPS!
  const [nomeMorador, setNomeMorador] = useState('');
  const [numeroArmadilha, setNumeroArmadilha] = useState('');
  const [numeroPalheta, setNumeroPalheta] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState(null);
  // No celular o painel cobre quase todo o mapa; recolher deixa o agente ver
  // as armadilhas e as linhas de distância antes de escolher o ponto.
  const [painelAberto, setPainelAberto] = useState(true);
  const [mostrarBussolaFlutuante, setMostrarBussolaFlutuante] = useState(false);
  const [mostrarRotulos, setMostrarRotulos] = useState(true);

  // Sincronização automática entre Ovitrampa e Palheta (Ex: 01 -> OV-01 e PL-01)
  const handleNumeroArmadilhaChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setNumeroArmadilha('');
      setNumeroPalheta('');
      return;
    }

    // Extrai o núcleo digitado removendo prefixo OV- se houver
    const core = val.replace(/^OV[-_ ]*/i, '').trim();
    if (!core) {
      setNumeroArmadilha(val);
      setNumeroPalheta('');
      return;
    }

    const ov = `OV-${core}`;
    const pl = `PL-${core}`;
    setNumeroArmadilha(ov);
    setNumeroPalheta(pl);
  };

  const handleNumeroArmadilhaBlur = () => {
    if (!numeroArmadilha) return;
    const core = numeroArmadilha.replace(/^OV[-_ ]*/i, '').trim();
    // Se digitou apenas 1 dígito (ex: 1 até 9), formata para dois dígitos (ex: 01 até 09)
    if (/^\d$/.test(core)) {
      const pad = core.padStart(2, '0');
      setNumeroArmadilha(`OV-${pad}`);
      setNumeroPalheta(`PL-${pad}`);
    }
  };

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

  // Salvar registro (100% offline em IndexedDB + LocalStorage)
  const handleRegistrar = async (e) => {
    e.preventDefault();

    if (!nomeMorador.trim()) {
      alert('Informe o nome do morador.');
      return;
    }

    // Valida o NUCLEO do numero (sem o prefixo OV-), nao o texto cru: digitar
    // so um espaco produz "OV- ", que passa no .trim() mas normaliza pra
    // string vazia - a armadilha era gravada sem numero e ficava invisivel
    // pro laboratorio.
    const numeroNucleo = numeroArmadilha.replace(/^OV[-_ ]*/i, '').trim();
    if (!numeroNucleo) {
      alert('Digite o número da OV.');
      return;
    }

    // Nunca deixa salvar com a posicao padrao (centro fixo de Carmo) que o
    // componente usa antes do primeiro fix de GPS - sem isso, GPS negado ou
    // sem sinal grava a armadilha no lugar errado, sem nenhum aviso, e o erro
    // so aparece dias depois olhando o mapa.
    if (localizacao.accuracy == null) {
      alert(
        gpsErrorMsg
          ? `Não é possível salvar sem a localização real do GPS.\n\n${gpsErrorMsg}\n\nAtive a permissão de localização e tente novamente.`
          : 'Aguardando o primeiro sinal de GPS. Espere a barra parar de "Buscando Satélites..." antes de salvar, para não gravar uma posição errada.'
      );
      return;
    }

    // Numero duplicado: dois agentes (ou o mesmo, duas vezes) podem cadastrar
    // a mesma OV em locais diferentes sem nenhum aviso hoje - a leitura de
    // laboratorio depois vai pra armadilha errada (a primeira da lista).
    const numeroJaExiste = armadilhas.some(
      (a) => a.numero && a.numero.toLowerCase() === numeroNucleo.toLowerCase()
    );
    if (numeroJaExiste) {
      const prosseguirDuplicado = window.confirm(
        `⚠️ JÁ EXISTE UMA OV-${numeroNucleo} CADASTRADA.\n\nSalvar mesmo assim vai deixar dois registros com o mesmo número, e a leitura do laboratório pode ir pra armadilha errada.\n\nConfirme se não é engano antes de continuar. Deseja salvar assim mesmo?`
      );
      if (!prosseguirDuplicado) {
        return;
      }
    }

    // Validação entomológica de espaçamento de 300m entre armadilhas
    const guiaNavegacao = calculateNavigationGuidance(localizacao, armadilhas);
    if (guiaNavegacao.status === 'afastar') {
      const prosseguirEspacamento = window.confirm(
        `⚠️ ATENÇÃO - ESPAÇAMENTO INFERIOR A 300M:\n\n${guiaNavegacao.orientacao}\n${guiaNavegacao.acao}\n\nA norma do Ministério da Saúde preconiza espaçamento de 300m a 400m.\nDeseja instalar neste ponto mesmo assim?`
      );
      if (!prosseguirEspacamento) {
        return;
      }
    }

    // Se a precisão do GPS estiver muito fraca (> 35 metros), avisa o agente
    if (localizacao.accuracy && localizacao.accuracy > 35) {
      const prosseguir = window.confirm(
        `Atenção: O GPS ainda está buscando satélites (precisão atual: ±${localizacao.accuracy}m).\n\nPara garantir a localização e quarteirão exatos, recomendamos aguardar alguns segundos sob céu aberto até atingir menos de 15m.\n\nDeseja salvar com a precisão atual mesmo assim?`
      );
      if (!prosseguir) {
        return;
      }
    }

    setSalvando(true);
    try {
      const nova = await cadastrarArmadilha({
        moradorNome: nomeMorador.trim(),
        numero: numeroArmadilha.trim(),
        palheta: numeroPalheta.trim() || 'PL-01',
        rua: localizacao.rua,
        numeroImovel: localizacao.numero,
        bairro: localizacao.bairro,
        microarea: localizacao.microarea,
        quarteirao: localizacao.quarteirao,
        latitude: localizacao.latitude,
        longitude: localizacao.longitude,
        precisaoGps: localizacao.accuracy,
        fotoDataUrl: null
      });

      playSuccessSound();
      const situacao = calcularSituacaoArmadilha(nova);
      setSucessoMsg(`${nova.numero} (${nova.palheta}) de ${nova.moradorNome} registrada com sucesso!`);

      // Limpar campos para o próximo registro
      setNomeMorador('');
      setNumeroArmadilha('');
      setNumeroPalheta('');

      if (onArmadilhaCadastrada) {
        onArmadilhaCadastrada(nova);
      }

      setTimeout(() => {
        setSucessoMsg(null);
      }, 4500);
    } catch (err) {
      alert('Erro ao gravar os dados.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden font-sans select-none">
      {/* 1. MAPA GRANDE EM TELA CHEIA */}
      <div className="absolute inset-0 z-0">
        <MapaGrandeOvitrampa
          userPos={localizacao}
          microarea={localizacao.microarea}
          quarteirao={localizacao.quarteirao}
          armadilhas={armadilhas}
          controlTop={56}
          showLabels={mostrarRotulos}
          onToggleLabels={() => setMostrarRotulos(!mostrarRotulos)}
        />
      </div>

      {/* 2. BARRA SUPERIOR DE ALTA PRECISÃO GPS */}
      <header className="absolute top-2.5 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
        <div className="bg-white/92 backdrop-blur-md text-slate-900 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-md flex items-center gap-1.5 text-xs font-black pointer-events-auto shrink-0">
          <span>🪤 GPS Ovitrampa Carmo</span>
        </div>

        {/* Indicador de Precisão dos Satélites em Tempo Real */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {localizacao.accuracy !== null ? (
            <div
              className={`backdrop-blur-md px-3 py-1.5 rounded-full border shadow-md flex items-center gap-1.5 text-[11px] font-black transition-all ${
                localizacao.accuracy <= 10
                  ? 'bg-emerald-50/95 border-emerald-300 text-emerald-800'
                  : localizacao.accuracy <= 25
                  ? 'bg-sky-50/95 border-sky-300 text-sky-800'
                  : 'bg-amber-50/95 border-amber-300 text-amber-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  localizacao.accuracy <= 10
                    ? 'bg-emerald-500 animate-pulse'
                    : localizacao.accuracy <= 25
                    ? 'bg-sky-500'
                    : 'bg-amber-500 animate-ping'
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
              <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>Buscando Satélites...</span>
            </div>
          )}

          {/* Botão de Recalibrar Satélites GNSS */}
          <button
            type="button"
            onClick={handleForcarRecalibracao}
            className="bg-white/92 hover:bg-white active:scale-90 backdrop-blur-md text-slate-700 hover:text-emerald-700 w-8 h-8 rounded-full border border-slate-200/90 shadow-md flex items-center justify-center transition-all shrink-0"
            title="Recalibrar sinal de satélites agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${gpsStatus === 'buscando' ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Botão de Bússola e Rumo Tático */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setMostrarBussolaFlutuante((v) => !v)}
            className={`backdrop-blur-md px-3 py-1.5 rounded-full border shadow-md flex items-center gap-1.5 text-xs font-black transition-all ${
              mostrarBussolaFlutuante
                ? 'bg-sky-600 text-white border-sky-400'
                : 'bg-white/92 text-slate-800 border-slate-200/90 hover:bg-white'
            }`}
            title="Abrir bússola e orientação cardeal"
          >
            <Compass className={`w-3.5 h-3.5 ${mostrarBussolaFlutuante ? 'text-white' : 'text-sky-600'}`} />
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
        <div className="absolute top-14 left-3 right-3 z-40 max-w-sm mx-auto bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span className="flex-1">{sucessoMsg}</span>
          <button onClick={() => setSucessoMsg(null)} className="p-1 text-emerald-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4. PAINEL FLUTUANTE SUAVE / CLARO SEMITRANSPARENTE (ESTILO MOTOJÁ) */}
      {/* Recolhível: no celular ele cobre quase todo o mapa, então o agente
          pode ocultar para enxergar as armadilhas e as linhas de distância. */}
      <div className="absolute left-0 right-0 bottom-0 z-30 p-2.5 sm:p-4 max-w-md mx-auto w-full pointer-events-none">
        {!painelAberto && (
          <div className="mb-2 pointer-events-auto">
            <BussolaOrientacao
              userPos={localizacao}
              armadilhas={armadilhas}
              compacto={true}
            />
          </div>
        )}
        {!painelAberto && (
          <button
            type="button"
            onClick={() => setPainelAberto(true)}
            className="w-full bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/15 border border-white/80 px-4 py-3 pointer-events-auto text-left flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-md">
              <ChevronUp className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 leading-tight">
                Instalar Ovitrampa aqui
              </p>
              <p className="text-[11px] text-slate-600 truncate leading-tight mt-0.5">
                {localizacao.rua} • <span className="text-emerald-700 font-extrabold">{localizacao.quarteirao}</span>
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
          <div className="flex items-center gap-2.5 bg-emerald-50 px-3.5 py-2.5 rounded-2xl border border-emerald-300 shadow-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/90 border border-emerald-200 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight">
                {localizacao.rua} {localizacao.numero ? `Nº ${localizacao.numero}` : ''}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[11px] text-slate-600 font-medium">
                  {localizacao.microarea} • <span className="text-emerald-700 font-extrabold">{localizacao.quarteirao}</span>
                </span>
                {localizacao.accuracy !== null && (
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-md border ${
                    localizacao.accuracy <= 10
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : localizacao.accuracy <= 25
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}>
                    {localizacao.accuracy <= 10 ? '🎯 ' : '📡 '}±{localizacao.accuracy}m
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleForcarRecalibracao}
              className="text-slate-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-100/50 transition-colors"
              title="Recalibrar endereço e quarteirão com satélites"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${gpsStatus === 'buscando' ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

          {/* Dica amigável se a precisão estiver em calibração (> 25 metros) */}
          {localizacao.accuracy !== null && localizacao.accuracy > 25 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50/90 px-3 py-1.5 rounded-xl border border-amber-200">
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

          {/* BÚSSOLA E GUIA CARDEAL DE DESLOCAMENTO (NORTE / SUL / LESTE / OESTE) */}
          <BussolaOrientacao
            userPos={localizacao}
            armadilhas={armadilhas}
          />

          {/* ASSISTENTE DE GEORREFERENCIAMENTO: DISTÂNCIA DAS OVs MAIS PRÓXIMAS (REGRA 300M - 400M) */}
          {vizinhasProximas && vizinhasProximas.length > 0 ? (
            <div className="bg-white/95 rounded-2xl border border-slate-200/90 p-3 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                <span className="font-black text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <span>📏</span>
                  <span>Distância das OVs Mais Próximas</span>
                </span>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  Meta: 300m a 400m
                </span>
              </div>

              {/* Lista das até 3 OVs vizinhas mais próximas */}
              <div className="space-y-1.5">
                {vizinhasProximas.map((viz, idx) => (
                  <div
                    key={viz.armadilha.id || idx}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition-colors ${
                      viz.status === 'ideal'
                        ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900'
                        : viz.status === 'proxima'
                        ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                        : 'bg-rose-50/70 border-rose-200/80 text-rose-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs shrink-0">
                        {viz.status === 'ideal' ? '🟢' : viz.status === 'proxima' ? '🟡' : '🔴'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-extrabold text-[11px] truncate leading-tight">
                          OV-{viz.armadilha.numero} <span className="font-normal text-[10px] text-slate-600">({viz.armadilha.moradorNome || 'Morador'})</span>
                        </p>
                        <p className="text-[9px] opacity-80 leading-none mt-0.5">
                          {viz.status === 'ideal'
                            ? 'Espaçamento ideal'
                            : viz.status === 'proxima'
                            ? 'Abaixo de 300m (muito próxima)'
                            : 'Acima de 400m (ampla)'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0 border ${
                        viz.status === 'ideal'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : viz.status === 'proxima'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}
                    >
                      {viz.distancia} m
                    </span>
                  </div>
                ))}
              </div>

              {/* Status do Ponto de Instalação */}
              {vizinhasProximas[0] && (
                <div className="pt-1 text-[10px] font-bold text-center">
                  {vizinhasProximas[0].status === 'ideal' ? (
                    <span className="text-emerald-700">✅ Ponto excelente! Atende à regra de 300m a 400m da vizinha mais próxima.</span>
                  ) : vizinhasProximas[0].status === 'proxima' ? (
                    <span className="text-amber-700">⚠️ Atenção: Apenas {vizinhasProximas[0].distancia}m da OV-{vizinhasProximas[0].armadilha.numero}. Se possível, afaste-se um pouco para cobrir 300m+.</span>
                  ) : (
                    <span className="text-rose-700">⚠️ Espaçamento amplo: {vizinhasProximas[0].distancia}m da vizinha mais próxima.</span>
                  )}
                </div>
              )}
            </div>
          ) : armadilhas.length > 0 ? (
            <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-center gap-2">
              <span>📍</span>
              <span>Calculando distância para as armadilhas cadastradas...</span>
            </div>
          ) : null}

          {/* FORMULÁRIO RÁPIDO DO AGENTE: MORADOR + Nº DA OV + PALHETA */}
          <form onSubmit={handleRegistrar} className="space-y-2.5">
            
            {/* 1. NOME DO MORADOR */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nome do Morador *</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Dona Maria / Seu José"
                value={nomeMorador}
                onChange={(e) => setNomeMorador(e.target.value)}
                className="w-full bg-white/95 border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 shadow-xs focus:outline-none transition-all"
                autoFocus
              />
            </div>

            {/* 2. NÚMERO DA OV + NÚMERO DA PALHETA (SINCRONIZADOS AUTOMATICAMENTE) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Nº da OV *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 01"
                  value={numeroArmadilha}
                  onChange={handleNumeroArmadilhaChange}
                  onBlur={handleNumeroArmadilhaBlur}
                  className="w-full bg-emerald-50/70 border-2 border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl px-3 py-2.5 text-sm font-black text-emerald-800 text-center placeholder:text-slate-400 shadow-xs focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Palheta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PL-01"
                  value={numeroPalheta}
                  onChange={(e) => setNumeroPalheta(e.target.value)}
                  className="w-full bg-white/95 border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl px-3 py-2.5 text-sm font-black text-slate-800 text-center placeholder:text-slate-400 shadow-xs focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* BOTÃO SALVAR (1 TOQUE) */}
            <button
              type="submit"
              disabled={salvando}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 text-white py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-700/25 flex items-center justify-center gap-2 transition-all mt-1"
            >
              {salvando ? (
                <span>Salvando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SALVAR OVITRAMPA</span>
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
