import React, { useState, useEffect } from 'react';
import { Navigation, AlertTriangle, XCircle, RefreshCw, CheckCircle2, ShieldAlert, Power } from 'lucide-react';

export function GpsGatekeeperModal({ onGpsAutorizado }) {
  // status: 'verificando' | 'solicitando' | 'autorizado' | 'negado' | 'encerrado'
  const [status, setStatus] = useState('verificando');
  const [mensagemErro, setMensagemErro] = useState('');

  const solicitarPermissaoGps = () => {
    if (!navigator.geolocation) {
      setStatus('negado');
      setMensagemErro('Seu dispositivo ou navegador não possui suporte a GPS/Geolocalização.');
      return;
    }

    setStatus('solicitando');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStatus('autorizado');
        if (onGpsAutorizado) {
          onGpsAutorizado({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy)
          });
        }
      },
      (err) => {
        console.warn('Permissão de GPS não concedida:', err);
        setStatus('negado');
        if (err.code === 1) {
          setMensagemErro('Você não autorizou a localização. O GPS é obrigatório para registrar as armadilhas no município de Carmo-RJ.');
        } else if (err.code === 2) {
          setMensagemErro('Não foi possível obter sinal de satélite. Verifique se o GPS está ativado nas configurações do aparelho.');
        } else {
          setMensagemErro('Tempo limite esgotado ao buscar sinal de GPS. Tente novamente.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            solicitarPermissaoGps();
          } else if (permissionStatus.state === 'denied') {
            setStatus('negado');
            setMensagemErro('Acesso ao GPS está bloqueado nas configurações do navegador.');
          } else {
            solicitarPermissaoGps();
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              solicitarPermissaoGps();
            } else if (permissionStatus.state === 'denied') {
              setStatus('negado');
              setMensagemErro('Acesso ao GPS foi revogado pelo usuário.');
            }
          };
        })
        .catch(() => {
          solicitarPermissaoGps();
        });
    } else {
      solicitarPermissaoGps();
    }
  }, []);

  const handleFecharApp = () => {
    try {
      window.close();
    } catch (e) {
      console.warn('window.close falhou:', e);
    }
    setStatus('encerrado');
  };

  // Se autorizado, não bloqueia
  if (status === 'autorizado') {
    return null;
  }

  // Tela de encerramento do app
  if (status === 'encerrado') {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-950 flex items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-5 shadow-2xl animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400 border border-slate-700">
            <Power className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black tracking-tight text-slate-100">
              Aplicativo Encerrado
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              O sistema Ovitrampas Carmo-RJ foi finalizado porque o acesso ao GPS não foi autorizado.
            </p>
          </div>
          <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-slate-300">
            Você já pode fechar esta aba ou janela com segurança.
          </div>
          <button
            type="button"
            onClick={() => {
              setStatus('verificando');
              solicitarPermissaoGps();
            }}
            className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reiniciar e Autorizar GPS
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Cabeçalho */}
        <div className="text-center space-y-3">
          <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center shadow-inner ${
            status === 'negado'
              ? 'bg-rose-100 text-rose-600 border border-rose-200'
              : 'bg-blue-50 text-blue-600 border border-blue-200 animate-pulse'
          }`}>
            {status === 'negado' ? (
              <ShieldAlert className="w-8 h-8" />
            ) : (
              <Navigation className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              Vigilância Ambiental • Carmo-RJ
            </span>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {status === 'negado' ? 'Acesso ao GPS Bloqueado' : 'Autorização de GPS Obrigatória'}
            </h2>
          </div>
        </div>

        {/* Mensagem e Instrução */}
        {status === 'negado' ? (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-black text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Aviso de Conformidade Técnica</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                {mensagemErro || 'O acesso à localização de alta precisão foi recusado.'}
              </p>
              <p className="text-[11px] text-rose-700/90 leading-relaxed font-medium">
                Por determinação do Ministério da Saúde, o aplicativo de ovitrampas <strong>não pode operar sem coordenadas geográficas certificadas</strong>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">Como autorizar:</p>
              <p>Clique no ícone de configurações / cadeado 🔒 na barra de endereços do seu navegador e mude a <strong>Localização</strong> para <strong>Permitir</strong>.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs space-y-2">
              <p className="font-bold text-blue-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Certificação de Armadilhas em Campo
              </p>
              <p className="text-[12px] text-blue-800 leading-relaxed">
                Para certificar as coordenadas das armadilhas em Carmo-RJ e garantir a precisão de satélite, o app exige a permissão do sensor GPS.
              </p>
            </div>
            <p className="text-center text-xs text-slate-500 italic">
              Clique em <strong>"Permitir"</strong> quando a janela do navegador solicitar.
            </p>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={solicitarPermissaoGps}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 active:scale-95 ${
              status === 'negado'
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${status === 'solicitando' ? 'animate-spin' : ''}`} />
            <span>{status === 'negado' ? 'Tentar Autorizar Novamente' : 'Autorizar GPS Agora'}</span>
          </button>

          <button
            type="button"
            onClick={handleFecharApp}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-black text-xs transition-colors flex items-center justify-center gap-2 active:scale-95"
            title="Fechar o aplicativo caso não queira autorizar o GPS"
          >
            <XCircle className="w-4 h-4" />
            <span>Fechar Aplicativo</span>
          </button>
        </div>

      </div>
    </div>
  );
}
