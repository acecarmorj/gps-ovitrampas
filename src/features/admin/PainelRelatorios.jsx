import React, { useMemo, useState } from 'react';
import { FileText, Satellite, Download, ClipboardList, Flame, BarChart3, Users, EyeOff, Eye } from 'lucide-react';
import { gerarRelatorioPdfEntomologico } from '../../lib/pdfRelatorioEntomologico';
import { gerarRelatorioPdfOperacional } from '../../lib/pdfRelatorioConsolidado';
import { calcularSituacaoArmadilha, classificarRiscoOvos } from '../../lib/situacaoOvitrampa';

const lida = (a) => a.status === 'analisada' && a.ultimosOvos != null;
const ovosDe = (a) => Number(a.ultimosOvos) || 0;
const bairroDe = (a) => (a.bairro || a.microarea || 'Sem bairro').trim();

// IPO = % de ovitrampas lidas que tem ovos. IDO = media de ovos por
// ovitrampa positiva. Mesma formula da secao 90 do conversa.txt.
function indicesDe(lista) {
  const lidas = lista.filter(lida);
  const positivas = lidas.filter((a) => ovosDe(a) > 0);
  const totalOvos = lidas.reduce((soma, a) => soma + ovosDe(a), 0);
  return {
    armadilhas: lista.length,
    lidas: lidas.length,
    positivas: positivas.length,
    totalOvos,
    ipo: lidas.length ? (positivas.length / lidas.length) * 100 : null,
    ido: positivas.length ? totalOvos / positivas.length : null
  };
}

function baixarCsv(nome, colunas, linhas) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const conteudo =
    '﻿' + [colunas.map(esc).join(';'), ...linhas.map((l) => l.map(esc).join(';'))].join('\r\n');
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nome}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const fmt = (n, casas = 1) => (n == null ? '-' : n.toFixed(casas).replace('.', ','));

export function PainelRelatorios({ armadilhas = [], onAbrirPainelCompleto }) {
  const [bairro, setBairro] = useState('todos');
  const [situacao, setSituacao] = useState('todas');
  const [ocultarMorador, setOcultarMorador] = useState(true);
  const [aviso, setAviso] = useState(null);

  const bairros = useMemo(
    () => [...new Set(armadilhas.map(bairroDe))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [armadilhas]
  );

  const filtradas = useMemo(
    () =>
      armadilhas.filter((a) => {
        if (bairro !== 'todos' && bairroDe(a) !== bairro) return false;
        if (situacao === 'lidas' && !lida(a)) return false;
        if (situacao === 'positivas' && !(lida(a) && ovosDe(a) > 0)) return false;
        if (situacao === 'campo' && lida(a)) return false;
        return true;
      }),
    [armadilhas, bairro, situacao]
  );

  const geral = useMemo(() => indicesDe(filtradas), [filtradas]);

  const porBairro = useMemo(() => {
    const grupos = new Map();
    filtradas.forEach((a) => {
      const chave = bairroDe(a);
      if (!grupos.has(chave)) grupos.set(chave, []);
      grupos.get(chave).push(a);
    });
    return [...grupos.entries()]
      .map(([nome, lista]) => ({ nome, ...indicesDe(lista) }))
      .sort((a, b) => b.totalOvos - a.totalOvos);
  }, [filtradas]);

  const filtroTexto = [
    bairro !== 'todos' ? bairro : 'Todos os bairros',
    { todas: 'Todas as armadilhas', lidas: 'Somente lidas', positivas: 'Somente positivas', campo: 'Em campo' }[situacao]
  ].join(' • ');

  const morador = (a) => (ocultarMorador ? '' : a.moradorNome || '');
  const endereco = (a) => (ocultarMorador ? '' : [a.rua, a.numeroImovel].filter(Boolean).join(', '));

  const avisar = (texto) => {
    setAviso(texto);
    setTimeout(() => setAviso(null), 4000);
  };

  const gerarPdf = (gerador, nomeArquivo) => async () => {
    try {
      avisar('Gerando PDF, aguarde...');
      await gerador(filtradas, { filtroDescricao: filtroTexto, nomeArquivo });
      avisar('PDF baixado.');
    } catch (err) {
      console.error(err);
      avisar('Não foi possível gerar o PDF. Tente de novo.');
    }
  };

  const planilhaGeral = () =>
    baixarCsv(
      'ovitrampas_dados',
      ['Nº', 'Palheta', 'Bairro', 'Quarteirão', 'Morador', 'Endereço', 'Situação', 'Ovos', 'Risco', 'Instalada em', 'Última leitura'],
      filtradas.map((a) => [
        a.numero,
        a.palheta,
        bairroDe(a),
        a.quarteirao,
        morador(a),
        endereco(a),
        lida(a) ? (ovosDe(a) > 0 ? 'Positiva' : 'Negativa') : 'Em campo',
        lida(a) ? ovosDe(a) : '',
        lida(a) ? classificarRiscoOvos(ovosDe(a)).nivel : '',
        a.instaladaEm ? new Date(a.instaladaEm).toLocaleDateString('pt-BR') : '',
        a.ultimaLeituraEm ? new Date(a.ultimaLeituraEm).toLocaleDateString('pt-BR') : ''
      ])
    );

  const planilhaIndices = () =>
    baixarCsv(
      'indices_ipo_ido',
      ['Bairro', 'Armadilhas', 'Lidas', 'Positivas', 'Total de ovos', 'IPO (%)', 'IDO (ovos/positiva)'],
      [...porBairro, { nome: 'TOTAL', ...geral }].map((b) => [
        b.nome,
        b.armadilhas,
        b.lidas,
        b.positivas,
        b.totalOvos,
        fmt(b.ipo),
        fmt(b.ido)
      ])
    );

  const planilhaFocos = () => {
    const focos = filtradas.filter((a) => lida(a) && ovosDe(a) > 50).sort((a, b) => ovosDe(b) - ovosDe(a));
    if (!focos.length) return avisar('Nenhuma armadilha com mais de 50 ovos neste filtro.');
    baixarCsv(
      'focos_alto_e_critico',
      ['Nº', 'Bairro', 'Quarteirão', 'Morador', 'Endereço', 'Ovos', 'Risco', 'Latitude', 'Longitude'],
      focos.map((a) => [
        a.numero,
        bairroDe(a),
        a.quarteirao,
        morador(a),
        endereco(a),
        ovosDe(a),
        classificarRiscoOvos(ovosDe(a)).nivel,
        a.latitude,
        a.longitude
      ])
    );
  };

  const planilhaPendencias = () => {
    const pendentes = filtradas
      .filter((a) => !lida(a))
      .map((a) => ({ a, s: calcularSituacaoArmadilha(a) }))
      .filter(({ s }) => s.fase === 'atrasada' || s.fase === 'hoje' || s.fase === 'vespera');
    if (!pendentes.length) return avisar('Nenhuma pendência neste filtro.');
    baixarCsv(
      'pendencias_de_campo',
      ['Nº', 'Bairro', 'Quarteirão', 'Morador', 'Endereço', 'Situação'],
      pendentes.map(({ a, s }) => [a.numero, bairroDe(a), a.quarteirao, morador(a), endereco(a), s.titulo])
    );
  };

  const cartoes = [
    {
      icone: Satellite,
      titulo: 'Relatório Entomológico (PDF)',
      texto: 'Oficial de 6 páginas: KPIs, tabela por bairro e mapas de calor em satélite.',
      acao: gerarPdf(gerarRelatorioPdfEntomologico, 'RELATORIO_EPIDEMIOLOGICO_MAPA_CALOR_CARMO.pdf'),
      botao: 'Gerar PDF',
      destaque: true
    },
    {
      icone: FileText,
      titulo: 'Relatório Operacional (PDF)',
      texto: 'Para a coordenação de campo: troca de palhetas, espaçamento e orientações aos agentes.',
      acao: gerarPdf(gerarRelatorioPdfOperacional, 'RELATORIO_CONSOLIDADO_OPERACIONAL_CARMO.pdf'),
      botao: 'Gerar PDF',
      destaque: true
    },
    { icone: BarChart3, titulo: 'Índices IPO e IDO', texto: 'Positividade e média de ovos, por bairro e total.', acao: planilhaIndices, botao: 'Baixar planilha' },
    { icone: Flame, titulo: 'Focos Alto e Crítico', texto: 'Armadilhas com mais de 50 ovos, para bloqueio.', acao: planilhaFocos, botao: 'Baixar planilha' },
    { icone: ClipboardList, titulo: 'Pendências de campo', texto: 'Trocas atrasadas, de hoje e de amanhã.', acao: planilhaPendencias, botao: 'Baixar planilha' },
    { icone: Download, titulo: 'Todos os dados (Excel)', texto: 'Uma linha por armadilha, para análise própria.', acao: planilhaGeral, botao: 'Baixar planilha' }
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900">Relatórios</h1>
            <p className="text-xs text-slate-500">
              Escolha o filtro e o relatório. Nome e endereço dos moradores ficam ocultos nas planilhas por padrão.
            </p>
          </div>
          <button
            type="button"
            onClick={onAbrirPainelCompleto}
            className="text-xs font-bold text-slate-600 underline underline-offset-2 whitespace-nowrap"
          >
            Painel completo (mapa e edição)
          </button>
        </header>

        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            ['Armadilhas', geral.armadilhas],
            ['Lidas', geral.lidas],
            ['Positivas', geral.positivas],
            ['Total de ovos', geral.totalOvos]
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="bg-white border border-slate-200 rounded-2xl py-3">
              <div className="text-2xl font-black text-slate-900">{valor}</div>
              <div className="text-[11px] font-bold text-slate-500">{rotulo}</div>
            </div>
          ))}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center gap-3">
          <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
            Bairro
            <select
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-medium bg-white"
            >
              <option value="todos">Todos</option>
              {bairros.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600 flex items-center gap-2">
            Situação
            <select
              value={situacao}
              onChange={(e) => setSituacao(e.target.value)}
              className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm font-medium bg-white"
            >
              <option value="todas">Todas</option>
              <option value="lidas">Lidas</option>
              <option value="positivas">Positivas</option>
              <option value="campo">Em campo</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => setOcultarMorador((v) => !v)}
            className={`ml-auto text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1.5 border ${
              ocultarMorador
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-800'
            }`}
          >
            {ocultarMorador ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {ocultarMorador ? 'Planilhas sem nome/endereço' : 'Planilhas com nome/endereço'}
          </button>
        </section>

        <section className="grid sm:grid-cols-2 gap-3">
          {cartoes.map(({ icone: Icone, titulo, texto, acao, botao, destaque }) => (
            <div
              key={titulo}
              className={`rounded-2xl border p-4 flex flex-col gap-3 ${
                destaque ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Icone className={`w-6 h-6 shrink-0 ${destaque ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <div>
                  <div className="text-sm font-black">{titulo}</div>
                  <div className={`text-xs ${destaque ? 'text-slate-300' : 'text-slate-500'}`}>{texto}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={acao}
                className="self-start bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl"
              >
                {botao}
              </button>
            </div>
          ))}
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-3 overflow-x-auto">
          <div className="flex items-center gap-2 mb-2 text-sm font-black text-slate-900">
            <Users className="w-4 h-4 text-emerald-600" /> Por bairro
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-1 pr-2">Bairro</th>
                <th className="pr-2">Arm.</th>
                <th className="pr-2">Lidas</th>
                <th className="pr-2">Pos.</th>
                <th className="pr-2">Ovos</th>
                <th className="pr-2">IPO %</th>
                <th>IDO</th>
              </tr>
            </thead>
            <tbody>
              {porBairro.map((b) => (
                <tr key={b.nome} className="border-t border-slate-100">
                  <td className="py-1 pr-2 font-bold text-slate-800">{b.nome}</td>
                  <td className="pr-2">{b.armadilhas}</td>
                  <td className="pr-2">{b.lidas}</td>
                  <td className="pr-2">{b.positivas}</td>
                  <td className="pr-2">{b.totalOvos}</td>
                  <td className="pr-2">{fmt(b.ipo)}</td>
                  <td>{fmt(b.ido)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 font-black">
                <td className="py-1 pr-2">TOTAL</td>
                <td className="pr-2">{geral.armadilhas}</td>
                <td className="pr-2">{geral.lidas}</td>
                <td className="pr-2">{geral.positivas}</td>
                <td className="pr-2">{geral.totalOvos}</td>
                <td className="pr-2">{fmt(geral.ipo)}</td>
                <td>{fmt(geral.ido)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-2">
            IPO = % de armadilhas lidas com ovos. IDO = média de ovos por armadilha positiva.
          </p>
        </section>
      </div>

      {aviso && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xl z-50">
          {aviso}
        </div>
      )}
    </div>
  );
}
