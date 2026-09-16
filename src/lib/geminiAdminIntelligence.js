/**
 * Motor de Inteligencia Epidemiologica & Boletins com IA Google Gemini 3.6 Flash
 * Especializado para a Coordenacao de Vigilancia em Saude - Carmo RJ.
 */

const DEFAULT_KEY_B64 = 'QVEuQWI4Uk42S3ZhVGZyLXJ0aFByVkd6ZXNOaWxKdXhqSkhockVTYUJuZW1YVk54Z3JZdXc=';

function obterChaveAtiva() {
  if (typeof window !== 'undefined') {
    const custom = window.localStorage.getItem('ovitrampas_gemini_key');
    if (custom && custom.trim()) return custom.trim();
  }
  try {
    return atob(DEFAULT_KEY_B64);
  } catch {
    return '';
  }
}

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';

export async function gerarBoletimEpidemiologicoOficial(armadilhas = [], leituras = [], apiKey = null) {
  const chave = apiKey || obterChaveAtiva();
  if (!chave) throw new Error('Chave da IA nao configurada.');

  const totalArmadilhas = armadilhas.length;
  const armadilhasComOvos = armadilhas.filter((a) => Number(a.ultimosOvos) > 0);
  const totalOvos = armadilhas.reduce((acc, a) => acc + (Number(a.ultimosOvos) || 0), 0);
  const ipoGeral = totalArmadilhas > 0 ? Math.round((armadilhasComOvos.length / totalArmadilhas) * 100) : 0;
  const idoGeral = armadilhasComOvos.length > 0 ? (totalOvos / armadilhasComOvos.length).toFixed(1) : '0.0';

  const porMicroarea = {};
  armadilhas.forEach((a) => {
    const micro = a.microarea || 'Centro';
    if (!porMicroarea[micro]) {
      porMicroarea[micro] = { total: 0, positivas: 0, ovos: 0 };
    }
    porMicroarea[micro].total += 1;
    const ovos = Number(a.ultimosOvos) || 0;
    porMicroarea[micro].ovos += ovos;
    if (ovos > 0) porMicroarea[micro].positivas += 1;
  });

  const resumoMicroareas = Object.entries(porMicroarea).map(([nome, dados]) => {
    const ipo = dados.total > 0 ? Math.round((dados.positivas / dados.total) * 100) : 0;
    const ido = dados.positivas > 0 ? (dados.ovos / dados.positivas).toFixed(1) : '0';
    return `- ${nome}: ${dados.total} armadilhas, ${dados.positivas} positivas (IPO: ${ipo}%), ${dados.ovos} ovos (IDO: ${ido})`;
  }).join('\n');

  const prompt = `Voce e o Coordenador de Vigilancia em Saude e Entomologia da Prefeitura Municipal de Carmo - RJ.
Elabore um BOLETIM EPIDEMIOLOGICO MUNICIPAL OFICIAL no formato tecnico da Secretaria de Estado de Saude do RJ (SES-RJ) e Ministerio da Saude, utilizando os dados reais do monitoramento por ovitrampas:

DADOS REAIS DE CARMO - RJ:
- Municipio: Carmo - RJ
- Total de Ovitrampas Monitoradas: ${totalArmadilhas}
- Ovitrampas Positivas (com ovos): ${armadilhasComOvos.length}
- Total de Ovos Coletados: ${totalOvos}
- IPO Geral (Indice de Positividade de Ovitrampas): ${ipoGeral}%
- IDO Geral (Indice de Densidade de Ovos): ${idoGeral} ovos/palheta positiva

DADOS POR MICROAREA DE CARMO:
${resumoMicroareas || 'Nenhuma microarea cadastrada ainda.'}

ESTRUTURA OBRIGATORIA DO BOLETIM (Redija em portugues formal e tecnico):
1. CABECALHO INSTITUCIONAL:
   PREFEITURA MUNICIPAL DE CARMO - RJ
   SECRETARIA MUNICIPAL DE SAUDE
   COORDENACAO DE VIGILANCIA AMBIENTAL E CONTROLE DE VETORES
   BOLETIM EPIDEMIOLOGICO SEMANAL DE MONITORAMENTO POR OVITRAMPAS
2. SUMARIO EXECUTIVO (Interpretacao dos indices IPO e IDO: Baixo < 20%, Medio 20-40%, Alto > 40%).
3. CLASSIFICACAO DE RISCO DAS MICROAREAS (Destaque para areas de maior risco em Carmo: Valparaiso, Centro, Morro do Estado, etc.).
4. PLANO DE ACAO IMEDIATA RECOMENDADO (Visitas de agentes, eliminacao de criadouros, borrifacao/UBV fumace nos quarteiroes criticos).
5. NOTA TECNICA E ASSINATURA.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 }
  };

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`Erro na API do Gemini (${response.status})`);
  const jsonResult = await response.json();
  return jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text || 'Falha ao gerar boletim.';
}

export async function gerarAlertaPopulacaoWhatsApp(armadilhas = [], apiKey = null) {
  const chave = apiKey || obterChaveAtiva();
  if (!chave) throw new Error('Chave da IA nao configurada.');

  const totalArmadilhas = armadilhas.length;
  const totalOvos = armadilhas.reduce((acc, a) => acc + (Number(a.ultimosOvos) || 0), 0);
  const contagem = {};
  armadilhas.forEach((a) => {
    const micro = a.microarea || 'Centro';
    contagem[micro] = (contagem[micro] || 0) + (Number(a.ultimosOvos) || 0);
  });
  const ordenadas = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  const bairrosCriticos = ordenadas.slice(0, 3).map(([b]) => b).join(', ');

  const prompt = `Voce e o Coordenador de Comunicacao em Saude de Carmo - RJ.
Crie uma mensagem amigavel, clara e de alto engajamento para ser divulgada nos grupos de WhatsApp de moradores e redes sociais da Prefeitura de Carmo.

CONTEXTO:
- O monitoramento de ovitrampas desta semana coletou ${totalOvos} ovos de mosquito da Dengue.
- Bairros com maior atencao: ${bairrosCriticos || 'Centro e bairros vizinhos'}.

DIRETRIZES:
- Use linguagem acessivel e emojis estrategicos.
- Instrua os moradores a fazerem o 'Check-up de 10 minutos' no sabado (calhas, caixas d'agua, pratinhos de plantas).
- Finalize com mensagem de uniao: 'Carmo unida contra a Dengue, Zika e Chikungunya!'
- Formate com negritos no padrao do WhatsApp (*texto*).`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3 }
  };

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`Erro na API do Gemini (${response.status})`);
  const jsonResult = await response.json();
  return jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text || 'Falha ao gerar comunicado.';
}

export async function consultarManualSUS(duvidaTecnica, apiKey = null) {
  const chave = apiKey || obterChaveAtiva();
  if (!chave) throw new Error('Chave da IA nao configurada.');

  const prompt = `Voce e o Especialista Oficial em Entomologia Medica e Legislacao do SUS do Ministerio da Saude.
Responda de forma concisa, direta e altamente precisa a seguinte duvida tecnica de um coordenador de saude de Carmo - RJ:

DUVIDA: "${duvidaTecnica}"

DIRETRIZES DA RESPOSTA:
- Baseie-se estritamente nas Diretrizes Nacionais para Prevencao e Controle de Epidemias de Dengue e manuais da Funasa.
- Se a duvida for sobre dosagem (ex: Piriproxifem, Espinosade, BTI), forneca o calculo exato para o volume de agua.
- Se for sobre ovitrampas, cite a norma de 300m a 400m de raio e periodicidade de coleta a cada 5 ou 7 dias.
- Seja objetivo e pratico para aplicacao no campo.`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1 }
  };

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`Erro na API do Gemini (${response.status})`);
  const jsonResult = await response.json();
  return jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta no momento.';
}
