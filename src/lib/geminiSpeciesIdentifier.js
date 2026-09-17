/**
 * Identificador de Espécies de Mosquitos e Larvas com IA Google Gemini
 * Especializado para o Laboratório de Entomologia - Carmo RJ.
 */

import { chamarGeminiGenerateContent, getGeminiApiKey } from './geminiKeyManager';

export async function identificarEspeciePorFoto(fotoDataUrl, apiKey = null) {
  if (!fotoDataUrl) {
    throw new Error('Fotografia não fornecida.');
  }
  const chave = apiKey || getGeminiApiKey();
  if (!chave) {
    const erro = new Error('Chave da IA do Google não configurada (401). Insira sua chave de API nas configurações.');
    erro.code = 'ERR_CHAVE_AUSENTE';
    throw erro;
  }
  const match = fotoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato da imagem inválido.');
  }
  const mimeType = match[1];
  const base64Data = match[2];

  const promptEntomologia = `Você é um entomologista sênior e especialista em taxonomia de Culicídeos (mosquitos) para a Vigilância em Saúde de Carmo - RJ.
Examine cuidadosamente esta fotografia macro (pode ser mosquito adulto, larva em lâmina ou recipiente, pupa ou palheta).

CHAVE TAXONÔMICA DE REFERÊNCIA:
1. ADULTOS:
   - Aedes aegypti: Tórax escuro com desenho nítido em forma de LIRA (duas linhas brancas retas centrais e duas linhas curvas brancas laterais). Pernas posteriores com anéis brancos/prateados nas articulações tarsais. Abdômen com faixas brancas basais.
   - Aedes albopictus: Tórax escuro com uma ÚNICA LINHA RETA branca-prateada longitudinal no centro do mesonoto. Anéis brancos nos tarsos.
   - Culex quinquefasciatus (Pernilongo comum): Coloração geral castanha ou amarelada uniforme, sem escamas prateadas no dorso, sem desenho em lira e sem anéis contrastantes nas pernas.
   - Anopheles: Pouso com corpo inclinado a 45 graus, palpos tão longos quanto a probóscide.
2. LARVAS:
   - Aedes aegypti: Sifão respiratório curto e cônico (relação comprimento/largura ~ 2:1), espinho do pente do 8º segmento com dentes laterais desenvolvidos.
   - Culex quinquefasciatus: Sifão respiratório longo e estreito (relação ~ 4:1 ou 5:1), com múltiplos tufos de cerdas.

Retorne ESTRITAMENTE um objeto JSON válido (sem markdown ou texto extra):
{
  "especie": string, // "Aedes aegypti", "Aedes albopictus", "Culex quinquefasciatus" ou "Não identificado"
  "nomePopular": string, // "Mosquito da Dengue", "Mosquito Tigre Asiático", "Pernilongo / Muriçoca", etc.
  "genero": string, // "Aedes", "Culex", "Anopheles", "Outro"
  "fase": string, // "Adulto", "Larva", "Pupa", "Ovos"
  "vetorDe": string[], // Doenças que transmite: ["Dengue", "Zika", "Chikungunya", "Febre Amarela"]
  "confianca": number, // 0 a 100
  "caracteristicasVisuais": string, // descrição das marcas que permitiram a identificação (lira, faixa, pernas, sifão)
  "riscoEpidemiologico": "ALTO" | "MEDIO" | "BAIXO",
  "acaoRecomendada": string // orientação operacional direta para a equipe de campo do Carmo
}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: promptEntomologia },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  };

  const jsonResult = await chamarGeminiGenerateContent(payload, chave);
  const textOutput = jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('A IA não retornou laudo válido.');
  }

  try {
    const data = JSON.parse(textOutput.trim());
    return {
      especie: data.especie || 'Não identificado',
      nomePopular: data.nomePopular || 'Inseto / Culicídeo',
      genero: data.genero || 'Indeterminado',
      fase: data.fase || 'Adulto',
      vetorDe: Array.isArray(data.vetorDe) ? data.vetorDe : [],
      confianca: Math.min(100, Math.max(0, parseInt(data.confianca, 10) || 85)),
      caracteristicasVisuais: data.caracteristicasVisuais || 'Características observadas na fotografia.',
      riscoEpidemiologico: data.riscoEpidemiologico || 'MEDIO',
      acaoRecomendada: data.acaoRecomendada || 'Realizar vistoria no imóvel e arredores.'
    };
  } catch (parseErr) {
    console.error('Erro parse JSON:', textOutput);
    throw new Error('Falha ao processar o parecer taxonômico da IA.');
  }
}
