import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, CheckCircle2, RefreshCw,
  X, Check, User, AlertCircle
} from 'lucide-react';
import { resolveAddressFromGps } from '../../lib/geoDetection';
import { MapaGrandeOvitrampa } from '../../maps/MapaGrandeOvitrampa';
import { playSuccessSound } from '../../lib/soundAlert';
import { cadastrarArmadilha } from '../../lib/storage';
import { calcularSituacaoArmadilha } from '../../lib/situacaoOvitrampa';

export function InstalarArmadilhaScreen({
  armadilhas = [],
  onArmadilhaCadastrada
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

  // Sincronização automática entre Ovitrampa e Palheta (Ex: 01 -> OV-01 e PL-01)
  const handleNumeroArmadilhaChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setNumeroArmadilha('');
      setNumeroPalheta('');
      return;
    }

    // Extrai o núcleo digitado removendo prefixo OV- se houver
    let core = val.toUpperCase().replace(/^OV[-_ ]*/i, '');
    if (!core) {
      setNumeroArmadilha('');
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

    if (!numeroArmadilha.trim()) {
      alert('Digite o número da OV.');
      return;
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
      </header>

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
      <div className="absolute left-0 right-0 bottom-0 z-30 p-2.5 sm:p-4 max-w-md mx-auto w-full pointer-events-none">
        <div className="bg-white/92 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-900/15 border border-white/80 p-3.5 sm:p-4 space-y-3 pointer-events-auto text-slate-800">
          
          {/* ENDEREÇO E QUARTEIRÃO DETECTADOS 100% PELO GPS */}
          <div className="flex items-center gap-2.5 bg-emerald-50/85 backdrop-blur-xs px-3.5 py-2.5 rounded-2xl border border-emerald-200/80 shadow-xs">
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
