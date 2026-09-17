/**
 * Auditoria de Ovos de Palheta com IA Google Gemini
 * Desenvolvido especificamente para o Laboratório de Entomologia - Carmo RJ.
 */

import { chamarGeminiGenerateContent, getGeminiApiKey } from './geminiKeyManager';

/**
 * Envia a foto da palheta para a IA Google Gemini analisar e contar ovos com precisão microscópica.
 * 
 * @param {string} fotoDataUrl - Foto em base64 (data:image/jpeg;base64,...)
 * @param {string} [apiKey] - Chave opcional do Gemini
 * @returns {Promise<{ ovos: number, confianca: number, positiva: boolean, laudo: string, observacoes: string }>}
 */
export async function auditarFotoComGemini(fotoDataUrl, apiKey = null) {
  if (!fotoDataUrl) {
    throw new Error('Nenhuma fotografia fornecida para análise.');
  }

  const chave = apiKey || getGeminiApiKey();
  if (!chave) {
    const erro = new Error('Chave da IA do Google não configurada (401). Insira sua chave de API nas configurações.');
    erro.code = 'ERR_CHAVE_AUSENTE';
    throw erro;
  }

  // Extrai o MIME type e a string base64 pura
  const match = fotoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato da imagem inválido para envio à IA.');
  }

  const mimeType = match[1];
  const base64Data = match[2];

  const promptEntomologia = `Você é um entomologista sênior especialista em leitura e perícia de ovitrampas de Aedes aegypti no laboratório do município de Carmo - RJ.
Analise detalhadamente esta fotografia macro da palheta de madeira de ovitrampa.

Critérios rigorosos de inspeção:
1. IDENTIFICAÇÃO DE OVOS: Conte individualmente cada ovo de Aedes aegypti. Ovos de Aedes são pequenos grãos negros/castanhos muito escuros, formato alongado de charuto ou arroz (comprimento ~1mm), fixados nos sulcos e fibras da palheta.
2. ELIMINAÇÃO DE FALSOS POSITIVOS: Descarte imperfeições da madeira, nós escuros, fiapos de celulose, fungos/mofo, terra ou partículas de sujeira que não possuem a curvatura e contorno simétrico do ovo.
3. DESMEMBRAMENTO DE AGLOMERADOS: Se houver ovos depositados em blocos colados uns nos outros, desmembre visualmente e conte cada indivíduo da massa.

Retorne ESTRITAMENTE um objeto JSON válido (sem qualquer formatação markdown ou código adicional) com as seguintes chaves:
{
  "ovos": number, // total exato de ovos detectados
  "confianca": number, // percentual de confiança de 0 a 100
  "positiva": boolean, // true se ovos > 0
  "laudo": string, // resumo técnico direto em português (ex: "28 ovos de Aedes aegypti confirmados nos sulcos centrais")
  "observacoes": string // observação sobre distribuição, aglomerados ou qualidade da palheta
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
    throw new Error('A IA não retornou um laudo válido.');
  }

  try {
    const laudoIA = JSON.parse(textOutput.trim());
    return {
      ovos: Math.max(0, parseInt(laudoIA.ovos, 10) || 0),
      confianca: Math.min(100, Math.max(0, parseInt(laudoIA.confianca, 10) || 90)),
      positiva: Boolean(laudoIA.positiva ?? (laudoIA.ovos > 0)),
      laudo: laudoIA.laudo || `${laudoIA.ovos} ovos de Aedes aegypti identificados.`,
      observacoes: laudoIA.observacoes || 'Análise pericial concluída com sucesso pelo modelo Google Gemini.'
    };
  } catch (parseError) {
    console.error('Erro ao interpretar JSON da IA:', textOutput);
    throw new Error('Resposta da IA em formato inesperado.');
  }
}
