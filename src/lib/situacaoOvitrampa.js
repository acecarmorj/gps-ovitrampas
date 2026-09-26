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

  // 1. Se já passou pelo laboratório e foi lida no ciclo atual
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

  // 2. Está em campo aguardando término dos DIAS_CICLO_PADRAO dias de exposição
  const diasCorridos = diasDesde(armadilha.instaladaEm);
  const diasRestantes = DIAS_CICLO_PADRAO - diasCorridos;
  const dataPrevista = calcularDataPrevistaRecolhimento(armadilha.instaladaEm, DIAS_CICLO_PADRAO);
  const dataPrevistaFormatada = dataPrevista.toLocaleDateString('pt-BR');
  const diaSemanaRaw = dataPrevista.toLocaleDateString('pt-BR', { weekday: 'long' });
  const diaSemana = diaSemanaRaw.charAt(0).toUpperCase() + diaSemanaRaw.slice(1);

  // Atraso Crítico (> 7 dias sem recolher - risco iminente de eclosão de larvas)
  if (diasCorridos > DIAS_CICLO_MAXIMO) {
    const diasExcesso = diasCorridos - DIAS_CICLO_MAXIMO;
    return {
      fase: 'atrasada',
      titulo: `Atraso Crítico (${diasCorridos}d em campo)`,
      descricao: `Ultrapassou o limite máximo de ${DIAS_CICLO_MAXIMO} dias em ${diasExcesso} ${diasExcesso === 1 ? 'dia' : 'dias'}. Risco iminente de eclosão de larvas no vaso! Recolher imediatamente.`,
      diasCorridos,
      diasRestantes,
      dataPrevistaFormatada,
      diaSemana,
      corTexto: 'text-rose-400',
      corBg: 'bg-rose-500/20',
      corBorda: 'border-rose-500/40',
      pinCor: '#e11d48'
    };
  }

  // Janela Limite / Tolerância (dias 6 e 7 - passou do 5º dia, mas está dentro do teto seguro de 7 dias)
  if (diasCorridos > DIAS_CICLO_PADRAO) {
    return {
      fase: 'tolerancia',
      titulo: `Janela Limite (Dia ${diasCorridos} de ${DIAS_CICLO_MAXIMO})`,
      descricao: `Superou o ciclo padrão de ${DIAS_CICLO_PADRAO} dias (previsto p/ ${diaSemana}), mas está dentro da janela máxima de segurança de ${DIAS_CICLO_MAXIMO} dias. Coletar com prioridade.`,
      diasCorridos,
      diasRestantes,
      dataPrevistaFormatada,
      diaSemana,
      corTexto: 'text-amber-400',
      corBg: 'bg-amber-500/20',
      corBorda: 'border-amber-500/40',
      pinCor: '#f59e0b'
    };
  }

  // Hoje (exatamente 5 dias - Segunda ou Terça de coleta)
  if (diasRestantes === 0) {
    return {
      fase: 'hoje',
      titulo: `Trocar Palheta Hoje! (Dia 5 - ${diaSemana})`,
      descricao: `A armadilha completou 5 dias em campo hoje (${diaSemana}, ${dataPrevistaFormatada}). Período ideal de coleta (margem de 2 dias até o limite de 7 dias).`,
      diasCorridos,
      diasRestantes: 0,
      dataPrevistaFormatada,
      diaSemana,
      corTexto: 'text-emerald-400',
      corBg: 'bg-emerald-500/20',
      corBorda: 'border-emerald-500/40',
      pinCor: '#10b981'
    };
  }

  // Véspera (4 dias em campo, falta 1 dia)
  if (diasRestantes === 1) {
    return {
      fase: 'vespera',
      titulo: `Coleta Amanhã (${diaSemana})`,
      descricao: `Armadilha em campo há 4 dias. Coleta agendada para amanhã, ${diaSemana} (${dataPrevistaFormatada}). Totalmente dentro do prazo máximo de 7 dias.`,
      diasCorridos,
      diasRestantes: 1,
      dataPrevistaFormatada,
      diaSemana,
      corTexto: 'text-amber-300',
      corBg: 'bg-amber-500/15',
      corBorda: 'border-amber-500/30',
      pinCor: '#d97706'
    };
  }

  // Em campo normal (dias 0 a 3)
  return {
    fase: 'em_campo',
    titulo: `Em Campo: Faltam ${diasRestantes} dias`,
    descricao: `Armadilha instalada (Dia ${diasCorridos} de ${DIAS_CICLO_PADRAO}). Coleta agendada para ${diaSemana}, ${dataPrevistaFormatada} • Limite máx: ${DIAS_CICLO_MAXIMO} dias.`,
    diasCorridos,
    diasRestantes,
    dataPrevistaFormatada,
    diaSemana,
    corTexto: 'text-blue-400',
    corBg: 'bg-blue-500/20',
    corBorda: 'border-blue-500/40',
    pinCor: '#3b82f6'
  };
}
