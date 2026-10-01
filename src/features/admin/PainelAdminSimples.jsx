import React, { useState } from 'react';
import { Flame, FileText, Settings, Download, ShieldCheck } from 'lucide-react';
import { PainelMapaCalorInterativo } from '../mapa/PainelMapaCalorInterativo';
import { PainelRelatorios } from './PainelRelatorios';
import { PainelAdminScreen } from './PainelAdminScreen';
import { gerarRelatorioSesRjLimpo } from '../../lib/pdfRelatorioSesRjLimpo';
import { gerarRelatorioPdfConsolidadoUnico } from '../../lib/pdfRelatorioConsolidadoUnico';

/**
 * Painel Administrativo Simplificado & Clean
 * Foco estrito no que importa conforme diretriz do usuário:
 * 1. Mapas de Calor e Ovos por Armadilha (por semana e território)
 * 2. Tabela com tudo anotado detalhadamente
 * 3. Central de Relatórios Oficiais (SES-RJ e Consolidado)
 * 4. Tema claro, minimalista e limpo
 */
export function PainelAdminSimples(props) {
  // Aba padrão agora é 'mapas' (o mapa de calor e ovos por armadilha com tabela por semana)
  const [aba, setAba] = useState('mapas'); // 'mapas' | 'relatorios' | 'gestao'
  const [baixando, setBaixando] = useState(false);
  const [fundoMapa, setFundoMapa] = useState('satelite'); // fundo dos mapas (tela e PDFs)

  const handleBaixarSesRj = async () => {
    try {
      setBaixando(true);
      await gerarRelatorioSesRjLimpo(
        props.armadilhasBrutas && props.armadilhasBrutas.length > 0 ? props.armadilhasBrutas : props.armadilhas,
        props.todasLeituras,
        { fundo: fundoMapa }
      );
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar relatório SES-RJ.');
    } finally {
      setBaixando(false);
    }
  };

  const handleBaixarConsolidado = async () => {
    try {
      setBaixando(true);
      await gerarRelatorioPdfConsolidadoUnico(
        props.armadilhasBrutas && props.armadilhasBrutas.length > 0 ? props.armadilhasBrutas : props.armadilhas,
        props.todasLeituras,
        { filtroDescricao: 'Vigilância Entomológica de Carmo/RJ • Palhetas A, B e Consolidado • 56 Ovitrampas' }
      );
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar relatório consolidado.');
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f8fafc] text-slate-800 font-sans select-none overflow-hidden">
      
      {/* BARRA SUPERIOR DE NAVEGAÇÃO MINIMALISTA & CLEAN */}
      <nav className="bg-white border-b border-slate-200 px-4 py-2 shrink-0 flex items-center justify-between gap-3 flex-wrap z-40">
        
        {/* Abas Principais */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setAba('mapas')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              aba === 'mapas'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Flame className="w-4 h-4 text-emerald-600" />
            <span>Mapas de Calor & Tabela</span>
          </button>

          <button
            type="button"
            onClick={() => setAba('relatorios')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              aba === 'relatorios'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Relatórios em PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setAba('gestao')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              aba === 'gestao'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span>Gestão Cadastral</span>
          </button>
        </div>

        {/* Atalhos Rápidos para Download dos Relatórios Oficiais */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
            <span>Mapas:</span>
            {[['vetorial', 'Mapa'], ['satelite', 'Satélite']].map(([k, r]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFundoMapa(k)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                  fundoMapa === k ? 'bg-black text-white border-black' : 'bg-white text-slate-700 border-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleBaixarSesRj}
            disabled={baixando}
            className="px-3 py-1.5 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Baixar Relatório Técnico SES-RJ (PDF)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Relatório SES-RJ (PDF)</span>
          </button>

          <button
            type="button"
            onClick={handleBaixarConsolidado}
            disabled={baixando}
            className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Baixar Relatório de Resultados Consolidado (10 Páginas)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Relatório Consolidado (PDF)</span>
          </button>
        </div>

      </nav>

      {/* CONTEÚDO DA ABA SELECIONADA */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {aba === 'mapas' && (
          <PainelMapaCalorInterativo
            {...props}
            fundoMapa={fundoMapa}
            onMudarFundoMapa={setFundoMapa}
            onAbrirLab={() => setAba('relatorios')}
          />
        )}

        {aba === 'relatorios' && (
          <PainelRelatorios
            {...props}
            onAbrirPainelCompleto={() => setAba('gestao')}
          />
        )}

        {aba === 'gestao' && (
          <PainelAdminScreen {...props} />
        )}
      </div>

    </div>
  );
}
