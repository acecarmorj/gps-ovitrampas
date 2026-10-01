/**
 * Relatorio entomologico detalhado (USO INTERNO) - A4 paisagem, preto no branco.
 * Uma linha por armadilha: morador, endereco, palheta e ovos de A, de B e de Ambas (A + B somados).
 * Nome/rua/numero do imovel so entram se o aparelho tem o "Acesso da equipe"; sem ele as colunas nem aparecem.
 * Cor so na bolinha da faixa de risco (5 cores).
 */
import { adaptarArmadilhasParaCiclo, calcularMetricasCiclo, CICLO_SEMANA_1, CICLO_SEMANA_2 } from './ciclosOvitrampas';
import { mesclarCiclos, coresDosBairros, metricasAmbas, idvDe } from './mapaPoligonos';
import { faixaDeOvos, temLeitura } from './mapaPoligonos';
import { temAcessoEquipe } from './acessoEquipe';
import { carregarTimbresOficiais, PROPORCAO_BRASAO_CARMO } from './timbresOficiais';

const W = 297;
const H = 210;
const M = 12;
const PRETO = [17, 17, 17];
const CINZA = [90, 90, 90];
const LINHA = [200, 200, 200];
const STATUS_TEXTO = { instalada: 'Em campo', recolhida: 'Recolhida', analisada: 'Lida' };

const n1 = (n) => Number(n).toFixed(1).replace('.', ',');

export async function gerarRelatorioEntomologicoLimpo(armadilhas = [], todasLeituras = []) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const autoTable = autoTableMod.default || autoTableMod.autoTable;
  const timbres = await carregarTimbresOficiais().catch(() => ({}));
  const equipe = temAcessoEquipe();

  const A = adaptarArmadilhasParaCiclo(armadilhas, todasLeituras, CICLO_SEMANA_1);
  const B = adaptarArmadilhasParaCiclo(armadilhas, todasLeituras, CICLO_SEMANA_2);
  const porNumA = new Map(A.map((a) => [String(a.numero), a]));
  const porNumB = new Map(B.map((b) => [String(b.numero), b]));
  const mA = calcularMetricasCiclo(A);
  const mB = calcularMetricasCiclo(B);
  const mAB = metricasAmbas(mesclarCiclos(A, B));

  const linhas = armadilhas
    .map((arm) => {
      const a = porNumA.get(String(arm.numero));
      const b = porNumB.get(String(arm.numero));
      return {
        arm,
        palA: a?.dadosCiclos?.palhetaA || '-',
        ovosA: a && temLeitura(a) ? Number(a.ultimosOvos) : null,
        palB: b?.dadosCiclos?.palhetaB || '-',
        ovosB: b && temLeitura(b) ? Number(b.ultimosOvos) : null
      };
    })
    .sort((x, y) => Number(x.arm.numero) - Number(y.arm.numero));

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });

  // ---------- cabecalho ----------
  let xTexto = M;
  if (timbres.TIMBRE_BRASAO_CARMO) {
    try {
      doc.addImage(timbres.TIMBRE_BRASAO_CARMO, 'PNG', M, 8, 13 * PROPORCAO_BRASAO_CARMO, 13);
      xTexto = M + 13 * PROPORCAO_BRASAO_CARMO + 4;
    } catch (_) {
      xTexto = M;
    }
  }
  doc.setTextColor(...PRETO);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Relatório Entomológico Detalhado', xTexto, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...CINZA);
  doc.text('Prefeitura Municipal de Carmo/RJ · Vigilância Entomológica · Ovitrampas · USO INTERNO', xTexto, 18.5);
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, W - M, 13, { align: 'right' });
  doc.setDrawColor(...PRETO);
  doc.setLineWidth(0.4);
  doc.line(M, 24, W - M, 24);

  // ---------- resumo A e B ----------
  const resumo = (nome, m, parcial) =>
    `${nome}: ${m.totalLidas} de ${m.total} palhetas lidas${parcial ? ' (parcial)' : ''} · ${m.totalOvos.toLocaleString('pt-BR')} ovos · IPO ${n1(m.ipo)}% · IDO ${n1(m.ido)} · IDV ${n1(m.idv ?? idvDe(m))}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...PRETO);
  doc.text(resumo('Ciclo A', mA, mA.totalLidas < mA.total), M, 30);
  doc.text(resumo('Ciclo B', mB, mB.totalLidas < mB.total), M, 35);
  doc.text(resumo('Ambas (A + B)', mAB, false).replace('palhetas lidas', 'armadilhas lidas'), M, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...CINZA);
  doc.text(
    equipe
      ? 'Contém nome e endereço de moradores. Não enviar para fora da equipe. A coluna "A + B" soma os ovos dos dois ciclos.'
      : 'Sem o "Acesso da equipe" neste aparelho, nome e endereço dos moradores NÃO são incluídos. A coluna "A + B" soma os ovos dos dois ciclos.',
    M,
    45
  );

  // ---------- tabela ----------
  const cab = ['OV'];
  if (equipe) cab.push('Morador', 'Endereço');
  cab.push('Bairro', 'Quarteirão', 'Palheta A', 'Ovos A', 'Palheta B', 'Ovos B', 'A + B', 'Situação');
  const iOvosA = cab.indexOf('Ovos A');
  const iOvosB = cab.indexOf('Ovos B');
  const iOvosAB = cab.indexOf('A + B');

  const corpo = linhas.map(({ arm, palA, ovosA, palB, ovosB }) => {
    const r = [`OV-${arm.numero}`];
    if (equipe) {
      r.push(arm.moradorNome || '-', [arm.rua, arm.numeroImovel].filter(Boolean).join(', ') || '-');
    }
    r.push(
      arm.bairro || arm.microarea || '-',
      arm.quarteirao && !/distrito/i.test(arm.quarteirao) ? arm.quarteirao : '-',
      palA,
      ovosA === null ? '-' : String(ovosA),
      palB,
      ovosB === null ? 'Aguardando' : String(ovosB),
      ovosA === null && ovosB === null ? '-' : String((ovosA ?? 0) + (ovosB ?? 0)),
      STATUS_TEXTO[arm.status] || arm.status || '-'
    );
    r.ovos = { [iOvosA]: ovosA, [iOvosB]: ovosB, [iOvosAB]: ovosA === null && ovosB === null ? null : (ovosA ?? 0) + (ovosB ?? 0) };
    return r;
  });

  const coresBairro = coresDosBairros(mesclarCiclos(A, B), (a) => a.bairro || a.microarea || '-');
  const iBairro = cab.indexOf('Bairro');
  autoTable(doc, {
    startY: 49,
    margin: { left: M, right: M, bottom: 14 },
    head: [cab],
    body: corpo,
    styles: { fontSize: 7.8, cellPadding: 1.5, textColor: PRETO, lineColor: LINHA, lineWidth: 0.1 },
    headStyles: { fillColor: [255, 255, 255], textColor: PRETO, fontStyle: 'bold', lineColor: PRETO, lineWidth: { bottom: 0.4 } },
    columnStyles: {
      0: { fontStyle: 'bold' },
      [iOvosA]: { halign: 'right', fontStyle: 'bold', cellPadding: { left: 6, top: 1.5, bottom: 1.5, right: 1.5 } },
      [iOvosB]: { halign: 'right', fontStyle: 'bold', cellPadding: { left: 6, top: 1.5, bottom: 1.5, right: 1.5 } },
      [iOvosAB]: { halign: 'right', fontStyle: 'bold', cellPadding: { left: 6, top: 1.5, bottom: 1.5, right: 1.5 } }
    },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index === iBairro) {
        const a = linhas[d.row.index].arm;
        const c = coresBairro.get(a.bairro || a.microarea || '-');
        if (c) {
          d.cell.styles.textColor = c;
          d.cell.styles.fontStyle = 'bold';
        }
      }
    },
    didDrawCell: (d) => {
      if (d.section !== 'body') return;
      const v = d.row.raw && d.row.raw.ovos ? d.row.raw.ovos[d.column.index] : undefined;
      if (v === undefined || v === null) return;
      d.doc.setFillColor(faixaDeOvos(v).cor);
      d.doc.circle(d.cell.x + 2.6, d.cell.y + d.cell.height / 2, 1.3, 'F');
    }
  });

  // ---------- legenda + rodape ----------
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(...CINZA);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'Faixas: azul 0 ovos · verde 1 a 20 · amarelo 21 a 50 · laranja 51 a 100 · vermelho mais de 100',
      M,
      H - 6
    );
    doc.text(`Página ${i} de ${total}`, W - M, H - 6, { align: 'right' });
  }

  doc.save(`relatorio-entomologico-carmo-${new Date().toISOString().slice(0, 10)}.pdf`);
}
