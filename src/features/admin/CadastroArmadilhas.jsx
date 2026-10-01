import React, { useMemo, useState } from 'react';
import { Search, Download, Pencil, X } from 'lucide-react';
import { atualizarArmadilha } from '../../lib/storage';
import { adaptarArmadilhasParaCiclo, CICLO_SEMANA_1, CICLO_SEMANA_2 } from '../../lib/ciclosOvitrampas';
import { faixaDeOvos, temLeitura } from '../../lib/mapaPoligonos';
import { temAcessoEquipe } from '../../lib/acessoEquipe';

/**
 * Cadastro das armadilhas (preto no branco): busca, filtros, edicao e exportacao.
 * Nome do morador, rua e numero do imovel so aparecem para a equipe (chave em "Acesso da equipe").
 * Nao existe botao de apagar: o banco e oficial.
 */
const STATUS_TEXTO = { instalada: 'Em campo', recolhida: 'Recolhida', analisada: 'Lida' };

const CAMPOS_PESSOAIS = ['moradorNome', 'rua', 'numeroImovel'];

function Ponto({ ovos }) {
  const f = faixaDeOvos(ovos);
  return <i className="inline-block w-2.5 h-2.5 rounded-full mr-1 align-middle" style={{ background: f.cor }} />;
}

export function CadastroArmadilhas({ armadilhasBrutas = [], armadilhas = [], todasLeituras = [], onAtualizarArmadilhas }) {
  const base = armadilhasBrutas && armadilhasBrutas.length > 0 ? armadilhasBrutas : armadilhas;
  const equipe = temAcessoEquipe();
  const [busca, setBusca] = useState('');
  const [bairro, setBairro] = useState('todos');
  const [situacao, setSituacao] = useState('todas');
  const [emEdicao, setEmEdicao] = useState(null);
  const [form, setForm] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');

  const linhas = useMemo(() => {
    const A = adaptarArmadilhasParaCiclo(base, todasLeituras, CICLO_SEMANA_1);
    const B = adaptarArmadilhasParaCiclo(base, todasLeituras, CICLO_SEMANA_2);
    const porNumeroB = new Map(B.map((b) => [String(b.numero), b]));
    return base
      .map((arm, i) => {
        const a = A[i];
        const b = porNumeroB.get(String(arm.numero));
        return {
          arm,
          ovosA: a && temLeitura(a) ? Number(a.ultimosOvos) : null,
          ovosB: b && temLeitura(b) ? Number(b.ultimosOvos) : null,
          ovosAB: (a && temLeitura(a)) || (b && temLeitura(b)) ? (a && temLeitura(a) ? Number(a.ultimosOvos) : 0) + (b && temLeitura(b) ? Number(b.ultimosOvos) : 0) : null,
          palhetaA: a?.dadosCiclos?.palhetaA || '-',
          palhetaB: b?.dadosCiclos?.palhetaB || '-'
        };
      })
      .sort((x, y) => Number(x.arm.numero) - Number(y.arm.numero));
  }, [base, todasLeituras]);

  const bairros = useMemo(
    () => ['todos', ...Array.from(new Set(base.map((a) => (a.bairro || a.microarea || '').trim()).filter(Boolean))).sort()],
    [base]
  );

  const filtradas = linhas.filter(({ arm, ovosA, ovosB }) => {
    const nome = (arm.bairro || arm.microarea || '').trim();
    if (bairro !== 'todos' && nome !== bairro) return false;
    if (situacao === 'positivas' && !((ovosA ?? 0) > 0 || (ovosB ?? 0) > 0)) return false;
    if (situacao === 'sem_leitura_b' && ovosB !== null) return false;
    if (situacao === 'em_campo' && arm.status !== 'instalada') return false;
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    const texto = `${arm.numero} ${nome} ${arm.quarteirao || ''} ${equipe ? `${arm.moradorNome || ''} ${arm.rua || ''}` : ''}`.toLowerCase();
    return texto.includes(termo);
  });

  const abrirEdicao = (arm) => {
    setEmEdicao(arm);
    setAviso('');
    setForm({
      numero: arm.numero || '',
      palheta: arm.palheta || '',
      moradorNome: arm.moradorNome || '',
      rua: arm.rua || '',
      numeroImovel: arm.numeroImovel || '',
      bairro: arm.bairro || '',
      microarea: arm.microarea || '',
      quarteirao: arm.quarteirao || '',
      status: arm.status || 'instalada',
      observacoes: arm.observacoes || ''
    });
  };

  const salvar = async (e) => {
    e.preventDefault();
    if (!emEdicao) return;
    setSalvando(true);
    // Sem acesso da equipe os campos pessoais nem saem do aparelho (o servidor tambem nao os apaga).
    const dados = { ...form };
    if (!equipe) CAMPOS_PESSOAIS.forEach((c) => delete dados[c]);
    const atualizada = await atualizarArmadilha(emEdicao.id, dados);
    setSalvando(false);
    if (atualizada) {
      setEmEdicao(null);
      if (onAtualizarArmadilhas) onAtualizarArmadilhas();
    } else {
      setAviso('Não foi possível salvar. Tente novamente.');
    }
  };

  const exportarCsv = () => {
    const cab = ['OV', 'Bairro', 'Microárea', 'Quarteirão', 'Palheta A', 'Ovos A', 'Palheta B', 'Ovos B', 'Ovos A + B', 'Situação', 'Latitude', 'Longitude'];
    if (equipe) cab.splice(1, 0, 'Morador', 'Rua', 'Nº do imóvel');
    const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filtradas.map(({ arm, ovosA, ovosB, ovosAB, palhetaA, palhetaB }) => {
      const r = [
        q(`OV-${arm.numero}`),
        q(arm.bairro),
        q(arm.microarea),
        q(arm.quarteirao),
        q(palhetaA),
        ovosA ?? '',
        q(palhetaB),
        ovosB ?? '',
        ovosAB ?? '',
        q(STATUS_TEXTO[arm.status] || arm.status),
        arm.latitude,
        arm.longitude
      ];
      if (equipe) r.splice(1, 0, q(arm.moradorNome), q(arm.rua), q(arm.numeroImovel));
      return r.join(';');
    });
    const blob = new Blob(['﻿' + [cab.join(';'), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ovitrampas_carmo_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const selecao = 'text-xs font-semibold border border-slate-300 rounded-lg px-2 py-1.5 bg-white';
  const campo = 'w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm';

  return (
    <div className="max-w-6xl mx-auto w-full p-3 sm:p-5 flex flex-col gap-3 text-black">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-lg font-black leading-tight">Cadastro das armadilhas</h1>
          <p className="text-xs text-slate-600">
            {filtradas.length} de {linhas.length} armadilhas ·{' '}
            {equipe ? 'acesso da equipe ativo (nomes e endereços visíveis)' : 'nomes e endereços de moradores só com o "Acesso da equipe"'}
          </p>
        </div>
        <button
          type="button"
          onClick={exportarCsv}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-black bg-white flex items-center gap-1.5"
        >
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 border border-slate-300 rounded-lg px-2 py-1.5 bg-white flex-1 min-w-[180px]">
          <Search size={14} className="text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={equipe ? 'Buscar OV, bairro, quarteirão, morador ou rua' : 'Buscar OV, bairro ou quarteirão'}
            className="flex-1 text-xs outline-none"
          />
        </div>
        <select value={bairro} onChange={(e) => setBairro(e.target.value)} className={selecao}>
          {bairros.map((b) => (
            <option key={b} value={b}>{b === 'todos' ? 'Todos os bairros' : b}</option>
          ))}
        </select>
        <select value={situacao} onChange={(e) => setSituacao(e.target.value)} className={selecao}>
          <option value="todas">Todas</option>
          <option value="positivas">Positivas (A ou B)</option>
          <option value="sem_leitura_b">Palheta B sem leitura</option>
          <option value="em_campo">Em campo</option>
        </select>
      </div>

      <div className="border border-slate-300 rounded-xl bg-white overflow-auto max-h-[70vh]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white text-[10px] uppercase text-slate-600 border-b border-black">
            <tr>
              <th className="text-left px-2 py-2">OV</th>
              <th className="text-left px-2 py-2">Bairro · Quarteirão</th>
              {equipe && <th className="text-left px-2 py-2">Morador</th>}
              {equipe && <th className="text-left px-2 py-2">Rua</th>}
              <th className="text-left px-2 py-2">Situação</th>
              <th className="text-right px-2 py-2">Ovos A</th>
              <th className="text-right px-2 py-2">Ovos B</th>
              <th className="text-right px-2 py-2">A + B</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtradas.map(({ arm, ovosA, ovosB, ovosAB }) => (
              <tr key={arm.id} className="border-t border-slate-200 hover:bg-slate-50">
                <td className="px-2 py-1.5 font-black">OV-{arm.numero}</td>
                <td className="px-2 py-1.5">
                  {(arm.bairro || arm.microarea || '-')}
                  {arm.quarteirao && !/distrito/i.test(arm.quarteirao) ? ` · ${arm.quarteirao}` : ''}
                </td>
                {equipe && <td className="px-2 py-1.5">{arm.moradorNome || '-'}</td>}
                {equipe && (
                  <td className="px-2 py-1.5">
                    {arm.rua || '-'}
                    {arm.numeroImovel ? `, ${arm.numeroImovel}` : ''}
                  </td>
                )}
                <td className="px-2 py-1.5">{STATUS_TEXTO[arm.status] || arm.status || '-'}</td>
                <td className="px-2 py-1.5 text-right font-bold">
                  {ovosA === null ? '-' : (<><Ponto ovos={ovosA} />{ovosA}</>)}
                </td>
                <td className="px-2 py-1.5 text-right font-bold">
                  {ovosB === null ? '-' : (<><Ponto ovos={ovosB} />{ovosB}</>)}
                </td>
                <td className="px-2 py-1.5 text-right font-black">
                  {ovosAB === null ? '-' : (<><Ponto ovos={ovosAB} />{ovosAB}</>)}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => abrirEdicao(arm)}
                    className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100"
                    aria-label={`Editar OV-${arm.numero}`}
                  >
                    <Pencil size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2 py-6 text-center text-slate-500">Nenhuma armadilha encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {emEdicao && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-3" onClick={() => setEmEdicao(null)}>
          <form
            onSubmit={salvar}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl border border-slate-300 w-full max-w-lg max-h-[90vh] overflow-auto p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black">Editar OV-{emEdicao.numero}</h2>
              <button type="button" onClick={() => setEmEdicao(null)} aria-label="Fechar"><X size={18} /></button>
            </div>
            {!equipe && (
              <p className="text-[11px] text-slate-600 border border-slate-300 rounded-lg px-2 py-1.5">
                Nome, rua e número do imóvel só podem ser vistos e editados com o "Acesso da equipe" (tela inicial).
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {[
                ['numero', 'Nº da OV'],
                ['palheta', 'Palheta'],
                ...(equipe ? [['moradorNome', 'Morador'], ['rua', 'Rua'], ['numeroImovel', 'Nº do imóvel']] : []),
                ['bairro', 'Bairro'],
                ['microarea', 'Microárea'],
                ['quarteirao', 'Quarteirão']
              ].map(([k, r]) => (
                <label key={k} className="text-[11px] font-bold text-slate-600">
                  {r}
                  <input value={form[k] ?? ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={campo} />
                </label>
              ))}
              <label className="text-[11px] font-bold text-slate-600">
                Situação
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={campo}>
                  <option value="instalada">Em campo</option>
                  <option value="recolhida">Recolhida</option>
                  <option value="analisada">Lida</option>
                </select>
              </label>
            </div>
            <label className="text-[11px] font-bold text-slate-600">
              Observações
              <textarea value={form.observacoes ?? ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} className={campo} />
            </label>
            {aviso && <p className="text-xs font-semibold text-red-700">{aviso}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEmEdicao(null)} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-black bg-black text-white disabled:opacity-50">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
