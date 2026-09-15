import React, { useState, useEffect } from 'react';
import {
  MapPin, CheckCircle2, RefreshCw,
  X, Check, User
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
  const [numeroPalheta, setNumeroPalheta] = useState('P-01');
  const [salvando, setSalvando] = useState(false);
  const [sucessoMsg, setSucessoMsg] = useState(null);

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

  const [gpsStatus, setGpsStatus] = useState('buscando');

  // Captura do GPS (funciona 100% offline, sem necessidade de internet)
  const capturarLocalizacao = () => {
    setGpsStatus('buscando');
    if (!navigator.geolocation) {
      setGpsStatus('erro');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
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
            accuracy: Math.round(accuracy),
            isExact: det.isExactPolygon
          });
          setGpsStatus('pronto');
        } catch (e) {
          setGpsStatus('pronto');
        }
      },
      (err) => {
        console.warn('Falha GPS:', err);
        setGpsStatus('erro');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
    );
  };

  useEffect(() => {
    capturarLocalizacao();
  }, []);

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

    setSalvando(true);
    try {
      const nova = await cadastrarArmadilha({
        moradorNome: nomeMorador.trim(),
        numero: numeroArmadilha.trim(),
        palheta: numeroPalheta.trim() || 'P-01',
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
      setSucessoMsg(`OV-${nova.numero} de ${nova.moradorNome} registrada! Situação: ${situacao.titulo} (Recolher até ${situacao.dataPrevistaFormatada || '5 dias'}).`);

      // Limpar campos para o próximo registro
      setNomeMorador('');
      setNumeroArmadilha('');
      setNumeroPalheta('P-01');

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

      {/* 2. BOTÃO GPS NO TOPO */}
      <header className="absolute top-2.5 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="bg-white/90 backdrop-blur-md text-slate-900 px-3.5 py-1.5 rounded-full border border-slate-200/80 shadow-md flex items-center gap-1.5 text-xs font-black pointer-events-auto">
          <span>🪤 GPS Ovitrampa Carmo</span>
        </div>

        <button
          type="button"
          onClick={capturarLocalizacao}
          className="bg-white/90 backdrop-blur-md text-slate-800 px-3 py-1.5 rounded-full border border-slate-200/80 shadow-md flex items-center gap-1.5 text-[11px] font-black pointer-events-auto active:scale-95 transition-transform"
          title="Recarregar GPS"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${gpsStatus === 'buscando' ? 'animate-spin' : ''}`} />
          <span>{localizacao.accuracy ? `±${localizacao.accuracy}m` : 'Buscando GPS...'}</span>
        </button>
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
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-black text-slate-900 truncate leading-tight">
                {localizacao.rua} {localizacao.numero ? `Nº ${localizacao.numero}` : ''}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                {localizacao.microarea} • <span className="text-emerald-700 font-extrabold">{localizacao.quarteirao}</span> <span className="text-slate-400 font-normal">(GPS Oficial)</span>
              </p>
            </div>
            <button
              type="button"
              onClick={capturarLocalizacao}
              className="text-slate-400 hover:text-emerald-600 p-1 transition-colors"
              title="Atualizar endereço"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${gpsStatus === 'buscando' ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>

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

            {/* 2. NÚMERO DA OV + NÚMERO DA PALHETA */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                  Nº da OV *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 01, 14, 25"
                  value={numeroArmadilha}
                  onChange={(e) => setNumeroArmadilha(e.target.value)}
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
                  placeholder="Ex: P-01"
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
