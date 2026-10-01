import React, { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  adaptarArmadilhasParaCiclo,
  calcularMetricasCiclo,
  CICLO_SEMANA_1,
  CICLO_SEMANA_2
} from '../../lib/ciclosOvitrampas';
import { FAIXAS_RISCO, faixaDeOvos, temLeitura, agruparPorPoligono, montarRotulosOvos, mesclarCiclos } from '../../lib/mapaPoligonos';
import { gerarPdfMapaCalor } from '../../lib/pdfMapaCalor';
import { gerarRelatorioSesRjLimpo } from '../../lib/pdfRelatorioSesRjLimpo';
import { gerarRelatorioEntomologicoLimpo } from '../../lib/pdfRelatorioEntomologicoLimpo';
import { temAcessoEquipe } from '../../lib/acessoEquipe';

/**
 * Central de relatorios: preto no branco; cor so nas faixas de risco (azul, verde, amarelo, laranja, vermelho).
 */
export function CentralRelatorios({ armadilhas = [], armadilhasBrutas = [], todasLeituras = [], fundoMapa, onMudarFundoMapa }) {
  const base = armadilhasBrutas && armadilhasBrutas.length > 0 ? armadilhasBrutas : armadilhas;
  const [ocupado, setOcupado] = useState(null);

  const ciclos = useMemo(() => {
    const A = adaptarArmadilhasParaCiclo(base, todasLeituras, CICLO_SEMANA_1);
    const B = adaptarArmadilhasParaCiclo(base, todasLeituras, CICLO_SEMANA_2);
    return { A, B, mA: calcularMetricasCiclo(A), mB: calcularMetricasCiclo(B) };
  }, [base, todasLeituras]);

  const executar = async (chave, fn) => {
    try {
      setOcupado(chave);
      await fn();
    } catch (e) {
      console.error(e);
      alert('Não foi possível gerar este relatório. Tente novamente.');
    } finally {
      setOcupado(null);
    }
  };

  // Sempre os tres: Ciclo A, Ciclo B e Ambas, num unico arquivo
  const mapaPdf = () =>
    executar('mapa', () => {
      const AB = mesclarCiclos(ciclos.A, ciclos.B);
      return gerarPdfMapaCalor({
        secoes: [
          { armadilhas: ciclos.A, grupos: agruparPorPoligono(ciclos.A), metricas: ciclos.mA, ciclo: 'A' },
          { armadilhas: ciclos.B, grupos: agruparPorPoligono(ciclos.B), metricas: ciclos.mB, ciclo: 'B' },
          { armadilhas: AB, grupos: agruparPorPoligono(AB), metricas: calcularMetricasCiclo(AB), ciclo: 'Ambas' }
        ],
        territorioLabel: 'Todo o município',
        fundo: fundoMapa,
        estilo: 'nevoeiro',
        rotulos: montarRotulosOvos(ciclos.A, ciclos.B)
      });
    });

  const contagemFaixas = (lista) =>
    FAIXAS_RISCO.map((f) => ({ ...f, n: lista.filter((a) => faixaDeOvos(a.ultimosOvos).id === f.id && (f.id !== 'sem_leitura' ? temLeitura(a) : !temLeitura(a))).length }));

  const botao = (chave, rotulo, onClick) => (
    <button
      type="button"
      onClick={onClick}
      disabled={ocupado !== null}
      className="px-3 py-1.5 text-xs font-bold rounded-lg border border-black bg-white text-black hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1.5"
    >
      <Download size={13} />
      {ocupado === chave ? 'Gerando...' : rotulo}
    </button>
  );

  const bloco = (titulo, descricao, acoes, aviso) => (
    <div className="border border-slate-300 rounded-xl bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-black text-black">{titulo}</div>
        <div className="text-xs text-slate-600 mt-0.5">{descricao}</div>
        {aviso && <div className="text-[11px] font-semibold text-black mt-1">{aviso}</div>}
      </div>
      <div className="flex flex-wrap gap-2">{acoes}</div>
    </div>
  );

  const linhaCiclo = (nome, m, lista) => (
    <div className="border border-slate-300 rounded-xl bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-black text-black">{nome}</div>
        <div className="text-xs text-slate-600">
          {m.totalLidas} de {m.total} palhetas lidas
          {m.totalLidas < m.total ? ' (parcial)' : ' (completo)'}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        {[
          ['Ovos', m.totalOvos],
          ['IPO', `${m.ipo.toFixed(1).replace('.', ',')}%`],
          ['IDO', m.ido.toFixed(1).replace('.', ',')]
        ].map(([t, v]) => (
          <div key={t}>
            <div className="text-[10px] font-bold uppercase text-slate-500">{t}</div>
            <div className="text-lg font-black text-black">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {contagemFaixas(lista).map((f) => (
          <span key={f.id} className="flex items-center gap-1 text-[11px] text-slate-700">
            <i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: f.cor }} />
            {f.label}: <b className="text-black">{f.n}</b>
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto w-full p-3 sm:p-5 flex flex-col gap-4 text-black">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-black leading-tight">Relatórios</h1>
          <p className="text-xs text-slate-600">PDF em A4, preto no branco; a cor aparece só nos mapas, gráficos e faixas de risco.</p>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold">
          <span className="text-slate-600 mr-1">Mapas dos PDFs:</span>
          {[['vetorial', 'Mapa'], ['satelite', 'Satélite']].map(([k, r]) => (
            <button
              key={k}
              type="button"
              onClick={() => onMudarFundoMapa && onMudarFundoMapa(k)}
              className={`px-3 py-1.5 rounded-lg border ${fundoMapa === k ? 'bg-black text-white border-black' : 'bg-white text-slate-700 border-slate-300'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {linhaCiclo('Ciclo A', ciclos.mA, ciclos.A)}
        {linhaCiclo('Ciclo B', ciclos.mB, ciclos.B)}
      </div>

      {bloco(
        'Relatório técnico SES-RJ',
        'Documento oficial para a Secretaria de Estado de Saúde: indicadores, gráficos de Ciclo A, B e Ambas, mapas de calor da cidade e dos distritos e inventário anônimo.',
        botao('ses', 'Baixar PDF', () =>
          executar('ses', () => gerarRelatorioSesRjLimpo(base, todasLeituras, { fundo: fundoMapa }))
        ),
        'Anônimo: sem nomes de moradores nem endereços.'
      )}

      {bloco(
        'Mapa de calor por quarteirão',
        'Mapa do município com quarteirões coloridos, ampliação da sede, mapa de calor em nevoeiro e tabela das armadilhas.',
        botao('mapa', 'Baixar PDF (A, B e Ambas)', mapaPdf),
        'Uso interno.'
      )}

      {bloco(
        'Relatório de resultados (consolidado)',
        'Mesmo conteúdo do relatório SES-RJ (indicadores, gráficos de Ciclo A, B e Ambas e mapas de calor da cidade e dos distritos), com as armadilhas identificadas por OV-NN.',
        botao('consolidado', 'Baixar PDF', () =>
          executar('consolidado', () => gerarRelatorioSesRjLimpo(base, todasLeituras, { fundo: fundoMapa, variante: 'resultados' }))
        ),
        'Uso interno.'
      )}

      {bloco(
        'Relatório entomológico detalhado',
        'Uma linha por armadilha: morador e endereço (com o acesso da equipe), palheta e ovos de A e de B, situação.',
        botao('entomologico', 'Baixar PDF', () =>
          executar('entomologico', () => gerarRelatorioEntomologicoLimpo(base, todasLeituras))
        ),
        temAcessoEquipe()
          ? 'Uso interno: contém nome e endereço de moradores. Não enviar para fora.'
          : 'Uso interno. Sem o "Acesso da equipe" (tela inicial), nomes e endereços saem em branco.'
      )}
    </div>
  );
}
