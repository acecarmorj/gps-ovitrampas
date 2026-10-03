/**
 * Motor de Cálculo da Situação Epidemiológica da Ovitrampa
 * Baseado nas regras oficiais do programa de Ovitrampas de Carmo/RJ.
 *
 * Ciclo Oficial: 5 dias de exposição no imóvel.
 */

export const DIAS_CICLO_PADRAO = 5;
export const DIAS_CICLO_MAXIMO = 7;

export function parseData(dataStr) {
  if (!dataStr) return new Date();
  return new Date(dataStr);
}

export function diasDesde(dataStr) {
  const agora = new Date();
  const inicio = parseData(dataStr);
  
  // Zera horário para comparação de dias inteiros
  const dInicio = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const dAgora = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  
  const diffMs = dAgora.getTime() - dInicio.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function calcularDataPrevistaRecolhimento(dataInstalacaoStr, diasCiclo = DIAS_CICLO_PADRAO) {
  const data = parseData(dataInstalacaoStr);
  const prevista = new Date(data);
  prevista.setDate(prevista.getDate() + diasCiclo);
  return prevista;
}

export function formatarDataETrocaPalheta(dataInstalacaoStr, diasCiclo = DIAS_CICLO_PADRAO) {
  if (!dataInstalacaoStr) return 'N/D';
  const prevista = calcularDataPrevistaRecolhimento(dataInstalacaoStr, diasCiclo);
  const dataFmt = prevista.toLocaleDateString('pt-BR');
  const diaSemana = prevista.toLocaleDateString('pt-BR', { weekday: 'short' });
  const semCapitalizada = diaSemana.replace('.', '').charAt(0).toUpperCase() + diaSemana.replace('.', '').slice(1);
  return `${dataFmt} (${semCapitalizada})`;
}

export function classificarRiscoOvos(ovos) {
  if (ovos === null || ovos === undefined) {
    return {
      nivel: 'Aguardando Leitura',
      corTexto: 'text-slate-400',
      corBg: 'bg-slate-800',
      corBorda: 'border-slate-700',
      badgeCor: '#64748b'
    };
  }
  if (ovos === 0) {
    return {
      nivel: 'Sem Ovos (Negativa)',
      corTexto: 'text-blue-400',
      corBg: 'bg-blue-500/20',
      corBorda: 'border-blue-500/40',
      badgeCor: '#2563eb'
    };
  }
  if (ovos <= 20) {
    return {
      nivel: 'Baixo Risco (1 a 20 ovos)',
      corTexto: 'text-emerald-400',
      corBg: 'bg-emerald-500/20',
      corBorda: 'border-emerald-500/40',
      badgeCor: '#10b981'
    };
  }
  if (ovos <= 50) {
    return {
      nivel: 'Médio Risco (21 a 50 ovos)',
      corTexto: 'text-amber-400',
      corBg: 'bg-amber-500/20',
      corBorda: 'border-amber-500/40',
      badgeCor: '#f59e0b'
    };
  }
  if (ovos <= 100) {
    return {
      nivel: 'Alto Risco (51 a 100 ovos)',
      corTexto: 'text-orange-400',
      corBg: 'bg-orange-500/20',
      corBorda: 'border-orange-500/40',
      badgeCor: '#f97316'
    };
  }
  return {
    nivel: 'Crítico (> 100 ovos)',
    corTexto: 'text-rose-400',
    corBg: 'bg-rose-500/20',
    corBorda: 'border-rose-500/40',
    badgeCor: '#e11d48'
  };
}

/**
 * Retorna a situação detalhada e formatada da armadilha
 */
export function calcularSituacaoArmadilha(armadilha) {
  if (!armadilha) {
    return {
      fase: 'desconhecida',
      titulo: 'Indefinida',
      descricao: '',
      corTexto: 'text-slate-400',
      corBg: 'bg-slate-800',
      corBorda: 'border-slate-700',
      pinCor: '#64748b'
    };
  }

  // 1. Se já foi recolhida do campo (aguardando leitura no laboratório)
  if (armadilha.status === 'recolhida') {
    const dataRecolhida = armadilha.recolhidaEm ? new Date(armadilha.recolhidaEm) : new Date();
    const dataFmt = dataRecolhida.toLocaleDateString('pt-BR');
    const palhetaRec = armadilha.palhetaRecolhida || armadilha.ultimaPalheta || armadilha.palheta || 'P-01';
    return {
      fase: 'recolhida',
      titulo: 'Armadilha e Palheta Recolhidas',
      descricao: `Palheta ${palhetaRec} e armadilha recolhidas em ${dataFmt}. Aguardando contagem de ovos no laboratório.`,
      diasCorridos: diasDesde(armadilha.instaladaEm),
      diasRestantes: 0,
      corTexto: 'text-indigo-400',
      corBg: 'bg-indigo-500/20',
      corBorda: 'border-indigo-500/40',
      pinCor: '#6366f1'
    };
  }

  // 2. Se já passou pelo laboratório e foi lida no ciclo atual
  if (armadilha.status === 'analisada' && armadilha.ultimosOvos != null) {
    const risco = classificarRiscoOvos(armadilha.ultimosOvos);
    return {
      fase: 'lida',
      titulo: `Leitura Concluída: ${armadilha.ultimosOvos} ovos`,
      descricao: `Palheta ${armadilha.ultimaPalheta || armadilha.palheta || 'P-01'} analisada no laboratório (${risco.nivel})`,
      diasCorridos: diasDesde(armadilha.instaladaEm),
      diasRestantes: 0,
      risco,
      corTexto: risco.corTexto,
      corBg: risco.corBg,
      corBorda: risco.corBorda,
      pinCor: risco.badgeCor
    };
  }

  // 3. Está em campo: ciclo de 5 a 7 dias de exposição.
  const cicloInfo = identificarCicloArmadilha(armadilha);
  const isPalhetaA = cicloInfo.ciclo === 'A';
  const nomeAcaoCurta = isPalhetaA ? 'Troca' : 'Recolher';
  const verboAcao = isPalhetaA ? 'Trocar palheta' : 'Recolher armadilha';

  const diasCorridos = Math.max(0, diasDesde(armadilha.instaladaEm));
  const diasRestantes = DIAS_CICLO_PADRAO - diasCorridos;
  const dataPrevista = calcularDataPrevistaRecolhimento(armadilha.instaladaEm, DIAS_CICLO_PADRAO);
  const dataLimite = calcularDataPrevistaRecolhimento(armadilha.instaladaEm, DIAS_CICLO_MAXIMO);

  const dataPrevistaFormatada = dataPrevista.toLocaleDateString('pt-BR');
  const dataLimiteFormatada = dataLimite.toLocaleDateString('pt-BR');
  const diaSemanaRaw = dataPrevista.toLocaleDateString('pt-BR', { weekday: 'long' });
  const diaSemana = diaSemanaRaw.charAt(0).toUpperCase() + diaSemanaRaw.slice(1);

  // Atrasada: passou de DIAS_CICLO_MAXIMO (7 dias)
  if (diasCorridos > DIAS_CICLO_MAXIMO) {
    const diasAtraso = diasCorridos - DIAS_CICLO_MAXIMO;
    return {
      fase: 'atrasada',
      titulo: `${nomeAcaoCurta}: ${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'} de atraso (>7d)`,
      descricao: `Ciclo máximo de 7 dias encerrado em ${dataLimiteFormatada}. ${verboAcao} com urgência e enviar ao laboratório.`,
      diasCorridos,
      diasRestantes,
      dataPrevistaFormatada,
      dataLimiteFormatada,
      diaSemana,
      corTexto: 'text-rose-400',
      corBg: 'bg-rose-500/20',
      corBorda: 'border-rose-500/40',
      pinCor: '#e11d48'
    };
  }

  // Janela oficial ideal: entre 5 e 7 dias
  if (diasCorridos >= DIAS_CICLO_PADRAO && diasCorridos <= DIAS_CICLO_MAXIMO) {
    return {
      fase: 'hoje',
      titulo: `${nomeAcaoCurta} (${diasCorridos}d - 5 a 7 dias)`,
      descricao: `A armadilha completou ${diasCorridos} dias em campo (${diaSemana}, ${dataPrevistaFormatada}). Período oficial para ${verboAcao}.`,
      diasCorridos,
      diasRestantes: 0,
      dataPrevistaFormatada,
      dataLimiteFormatada,
      diaSemana,
      corTexto: 'text-amber-400',
      corBg: 'bg-amber-500/20',
      corBorda: 'border-amber-500/40',
      pinCor: '#f59e0b'
    };
  }

  // Véspera: 4 dias completos (falta 1 dia para o 5º dia)
  if (diasRestantes === 1) {
    return {
      fase: 'vespera',
      titulo: `${nomeAcaoCurta} Amanhã (${diaSemana})`,
      descricao: `Armadilha em campo há ${diasCorridos} dias. Período de ${verboAcao} liberado a partir de amanhã (${dataPrevistaFormatada}).`,
      diasCorridos,
      diasRestantes: 1,
      dataPrevistaFormatada,
      dataLimiteFormatada,
      diaSemana,
      corTexto: 'text-amber-300',
      corBg: 'bg-amber-500/15',
      corBorda: 'border-amber-500/30',
      pinCor: '#d97706'
    };
  }

  // Em campo antes do 4º dia (diasCorridos < 4)
  return {
    fase: 'em_campo',
    titulo: `Em Campo: Faltam ${diasRestantes} dias`,
    descricao: `${isPalhetaA ? 'Palheta A instalada' : 'Palheta B instalada'} (Dia ${diasCorridos} de 5). ${verboAcao} liberado em ${diaSemana}, ${dataPrevistaFormatada}.`,
    diasCorridos,
    diasRestantes,
    dataPrevistaFormatada,
    dataLimiteFormatada,
    diaSemana,
    corTexto: 'text-blue-400',
    corBg: 'bg-blue-500/20',
    corBorda: 'border-blue-500/40',
    pinCor: '#3b82f6'
  };
}

/**
 * Identifica se a armadilha está no Ciclo 1 (Palheta A) ou Ciclo 2 (Palheta B).
 */
export function identificarCicloArmadilha(armadilha) {
  if (!armadilha) return { ciclo: 'A', fase: 'nova' };

  // 1. Checa histórico de trocas de palheta
  const trocas = Array.isArray(armadilha.historicoPalhetas)
    ? armadilha.historicoPalhetas.filter((h) => h.novaPalheta || h.palhetaAnterior)
    : [];

  const palhetaStr = String(armadilha.palheta || '').trim().toUpperCase();

  // Se o código da palheta termina com 'B' ou tem troca registrada
  if (palhetaStr.endsWith('B') || trocas.length > 0) {
    return { ciclo: 'B', fase: 'segundo_ciclo' };
  }

  return { ciclo: 'A', fase: 'primeiro_ciclo' };
}

/**
 * Proxima palheta no esquema {numero}{letra}: 35A -> 35B -> ... -> 35Z -> 35AA.
 * Sem palheta nesse formato, comeca em {numero}A. Sem barra "/" de
 * proposito: em papel a lapis sob sol, "/" borra e vira 1 ou 7. O numero da
 * armadilha vai junto na palheta - essencial pra rastrear ela solta na
 * bancada do laboratorio.
 */
export function sugerirProximaPalheta(armadilha) {
  const numero = armadilha?.numero || '';
  const numInt = parseInt(numero, 10);
  const atual = String(armadilha?.palheta || '').trim().toUpperCase();
  const regex = Number.isNaN(numInt)
    ? new RegExp(`^${numero}([A-Z]+)$`)
    : new RegExp(`^(?:${numero}|0*${numInt})([A-Z]+)$`);
  const match = atual.match(regex);
  if (match) {
    const letras = match[1].split('');
    let i = letras.length - 1;
    while (i >= 0) {
      if (letras[i] !== 'Z') {
        letras[i] = String.fromCharCode(letras[i].charCodeAt(0) + 1);
        break;
      }
      letras[i] = 'A';
      i -= 1;
    }
    if (i < 0) letras.unshift('A');
    return `${numero}${letras.join('')}`;
  }
  return `${numero}A`;
}

/**
 * O que o agente de campo tem que fazer nesta armadilha agora.
 * Regras estritas oficiais:
 * - Sem cadastro (!armadilha): tela de INSTALAR.
 * - Com cadastro (armadilha existente):
 *   - Ciclo 1 (Palheta A): tela de TROCAR PALHETA (Palheta A -> Palheta B).
 *     - diasCorridos < 5: BLOQUEADO (aguardar 5 a 7 dias).
 *     - 5 a 7 dias: LIBERADO para trocar.
 *     - > 7 dias: LIBERADO em atraso.
 *   - Ciclo 2 (Palheta B): tela de RETIRAR ARMADILHA E PALHETA B.
 *     - diasCorridos < 5: BLOQUEADO (aguardar 5 a 7 dias).
 *     - 5 a 7 dias: LIBERADO para retirar.
 *     - > 7 dias: LIBERADO em atraso.
 */
export function decidirAcaoCampo(armadilha) {
  // 1. Sem cadastro: instalar nova
  if (!armadilha) {
    return {
      acao: 'instalar',
      bloqueado: false,
      podeExecutar: true,
      motivo: 'Número sem cadastro: instalar armadilha nova neste ponto.',
      rotulo: 'instalar'
    };
  }

  // 2. Já recolhida do campo
  if (armadilha.status === 'recolhida') {
    return {
      acao: 'recolhida',
      bloqueado: true,
      podeExecutar: false,
      motivo: 'Armadilha e palheta já recolhidas. Aguardando contagem no laboratório.',
      rotulo: 'recolhida'
    };
  }

  // 3. Já analisada no laboratório
  if (armadilha.status === 'analisada') {
    return {
      acao: 'analisada',
      bloqueado: true,
      podeExecutar: false,
      motivo: 'Palheta já analisada no laboratório.',
      rotulo: 'analisada'
    };
  }

  // 4. Armadilha em campo
  const cicloInfo = identificarCicloArmadilha(armadilha);
  const diasCorridos = Math.max(0, diasDesde(armadilha.instaladaEm));
  const dataInstalacao = armadilha.instaladaEm ? parseData(armadilha.instaladaEm) : new Date();

  const dataMinima = new Date(dataInstalacao);
  dataMinima.setDate(dataMinima.getDate() + DIAS_CICLO_PADRAO);

  const dataMaxima = new Date(dataInstalacao);
  dataMaxima.setDate(dataMaxima.getDate() + DIAS_CICLO_MAXIMO);

  const dataMinFmt = dataMinima.toLocaleDateString('pt-BR');
  const diaSemanaMin = dataMinima.toLocaleDateString('pt-BR', { weekday: 'short' });
  const semCapMin = diaSemanaMin.replace('.', '').charAt(0).toUpperCase() + diaSemanaMin.replace('.', '').slice(1);

  const dataMaxFmt = dataMaxima.toLocaleDateString('pt-BR');
  const diaSemanaMax = dataMaxima.toLocaleDateString('pt-BR', { weekday: 'short' });
  const semCapMax = diaSemanaMax.replace('.', '').charAt(0).toUpperCase() + diaSemanaMax.replace('.', '').slice(1);

  const diasFaltam = Math.max(0, DIAS_CICLO_PADRAO - diasCorridos);
  const antesPrazo = diasCorridos < DIAS_CICLO_PADRAO;
  const atrasada = diasCorridos > DIAS_CICLO_MAXIMO;

  const sit = calcularSituacaoArmadilha(armadilha);

  if (cicloInfo.ciclo === 'A') {
    // -----------------------------------------------------------------------
    // FASE 1: PALHETA A -> TELA É SEMPRE DE TROCAR PALHETA (Palheta A -> B)
    // -----------------------------------------------------------------------
    if (antesPrazo) {
      return {
        acao: 'trocar',
        bloqueado: true,
        podeExecutar: false,
        ciclo: 'A',
        diasCorridos,
        diasFaltam,
        dataMinFmt: `${dataMinFmt} (${semCapMin})`,
        dataMaxFmt: `${dataMaxFmt} (${semCapMax})`,
        motivo: `Armadilha em campo há ${diasCorridos} ${diasCorridos === 1 ? 'dia' : 'dias'}. A troca da palheta só é permitida entre 5 e 7 dias. Faltam ${diasFaltam} ${diasFaltam === 1 ? 'dia' : 'dias'} (liberação em ${dataMinFmt}).`,
        rotulo: 'aguardar_troca',
        situacao: sit
      };
    }

    if (atrasada) {
      return {
        acao: 'trocar',
        bloqueado: false,
        podeExecutar: true,
        ciclo: 'A',
        diasCorridos,
        diasFaltam: 0,
        dataMinFmt: `${dataMinFmt} (${semCapMin})`,
        dataMaxFmt: `${dataMaxFmt} (${semCapMax})`,
        motivo: `Troca atrasada (${diasCorridos} dias em campo). Prazo máximo de 7 dias venceu em ${dataMaxFmt}. Troque a palheta o quanto antes.`,
        rotulo: 'trocar_atrasada',
        situacao: sit
      };
    }

    return {
      acao: 'trocar',
      bloqueado: false,
      podeExecutar: true,
      ciclo: 'A',
      diasCorridos,
      diasFaltam: 0,
      dataMinFmt: `${dataMinFmt} (${semCapMin})`,
      dataMaxFmt: `${dataMaxFmt} (${semCapMax})`,
      motivo: `Período oficial de troca atingido (${diasCorridos} dias em campo). Troque a Palheta A pela Palheta B.`,
      rotulo: 'trocar_ideal',
      situacao: sit
    };
  } else {
    // -----------------------------------------------------------------------
    // FASE 2: PALHETA B -> TELA É SEMPRE DE RETIRAR ARMADILHA E PALHETA B
    // -----------------------------------------------------------------------
    if (antesPrazo) {
      return {
        acao: 'recolher',
        bloqueado: true,
        podeExecutar: false,
        ciclo: 'B',
        diasCorridos,
        diasFaltam,
        dataMinFmt: `${dataMinFmt} (${semCapMin})`,
        dataMaxFmt: `${dataMaxFmt} (${semCapMax})`,
        motivo: `Palheta B em campo há ${diasCorridos} ${diasCorridos === 1 ? 'dia' : 'dias'}. A retirada só é permitida entre 5 e 7 dias. Faltam ${diasFaltam} ${diasFaltam === 1 ? 'dia' : 'dias'} (liberação em ${dataMinFmt}).`,
        rotulo: 'aguardar_recolhimento',
        situacao: sit
      };
    }

    if (atrasada) {
      return {
        acao: 'recolher',
        bloqueado: false,
        podeExecutar: true,
        ciclo: 'B',
        diasCorridos,
        diasFaltam: 0,
        dataMinFmt: `${dataMinFmt} (${semCapMin})`,
        dataMaxFmt: `${dataMaxFmt} (${semCapMax})`,
        motivo: `Retirada atrasada (${diasCorridos} dias em campo). Prazo máximo de 7 dias venceu em ${dataMaxFmt}. Recolha a armadilha imediatamente para o laboratório.`,
        rotulo: 'recolher_atrasada',
        situacao: sit
      };
    }

    return {
      acao: 'recolher',
      bloqueado: false,
      podeExecutar: true,
      ciclo: 'B',
      diasCorridos,
      diasFaltam: 0,
      dataMinFmt: `${dataMinFmt} (${semCapMin})`,
      dataMaxFmt: `${dataMaxFmt} (${semCapMax})`,
      motivo: `Período oficial de retirada atingido (${diasCorridos} dias em campo). Recolher armadilha e Palheta B para o laboratório.`,
      rotulo: 'recolher_ideal',
      situacao: sit
    };
  }
}
