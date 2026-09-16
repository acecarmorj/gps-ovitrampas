/**
 * Identificador de Especies de Mosquitos e Larvas com IA Google Gemini 3.6 Flash
 * Especializado para o Laboratorio de Entomologia - Carmo RJ.
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

export async function identificarEspeciePorFoto(fotoDataUrl, apiKey = null) {
  if (!fotoDataUrl) {
    throw new Error('Fotografia nao fornecida.');
  }
  const chave = apiKey || obterChaveAtiva();
  if (!chave) {
    throw new Error('Chave da IA nao configurada.');
  }
  const match = fotoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato da imagem invalido.');
  }
  const mimeType = match[1];
  const base64Data = match[2];

  const promptEntomologia = `Voce e um entomologista senior e especialista em taxonomia de Culicideos (mosquitos) para a Vigilancia em Saude de Carmo - RJ.
Examine cuidadosamente esta fotografia macro (pode ser mosquito adulto, larva em lamina ou recipiente, pupa ou palheta).

CHAVE TAXONOMICA DE REFERENCIA:
1. ADULTOS:
   - Aedes aegypti: Torax escuro com desenho nitido em forma de LIRA (duas linhas brancas retas centrais e duas linhas curvas brancas laterais). Pernas posteriores com aneis brancos/prateados nas articulacoes tarsais. Abdomen com faixas brancas basais.
   - Aedes albopictus: Torax escuro com uma UNICA LINHA RETA branca-prateada longitudinal no centro do mesonoto. Aneis brancos nos tarsos.
   - Culex quinquefasciatus (Pernilongo comum): Coloracao geral castanha ou amarelada uniforme, sem escamas prateadas no dorso, sem desenho em lira e sem aneis contrastantes nas pernas.
   - Anopheles: Pouso com corpo inclinado a 45 graus, palpos tao longos quanto a proboscide.
2. LARVAS:
   - Larva de Aedes: Sifao respiratorio CURTO, conico e escuro (relacao comprimento/largura ~ 2:1). Nadam com movimento serpentiforme vigoroso.
   - Larva de Culex: Sifao respiratorio LONGO e fino (relacao > 4:1) com multiplos tufos de cerdas.
3. OVOS: Graos negros alongados (~1mm) em palheta de madeira.

Retorne OBRIGATORIAMENTE um JSON estrito (sem formatacao markdown ao redor) com:
{
  "especie": "Nome Cientifico (ex: Aedes aegypti)",
  "nomePopular": "Nome Comum (ex: Mosquito da Dengue)",
  "genero": "Aedes / Culex / Anopheles / Outro",
  "fase": "Adulto (Femea) / Adulto (Macho) / Larva / Pupa / Indeterminado",
  "vetorDe": ["Dengue", "Zika", "Chikungunya", "Febre Amarela Urbana"],
  "confianca": 95,
  "caracteristicasVisuais": "Descricao minuciosa do que foi observado na foto (escudo toracico, pernas, escamas ou sifao).",
  "riscoEpidemiologico": "ALTO",
  "acaoRecomendada": "Orientacao de campo direta para a equipe de agentes de Carmo - RJ."
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

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': chave
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Erro API Gemini:', response.status, errText);
    throw new Error('Nao foi possivel realizar a identificacao taxonomica no momento.');
  }

  const jsonResult = await response.json();
  const textOutput = jsonResult?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('A IA nao retornou laudo valido.');
  }

  try {
    const data = JSON.parse(textOutput.trim());
    return {
      especie: data.especie || 'Nao identificado',
      nomePopular: data.nomePopular || 'Inseto / Culicideo',
      genero: data.genero || 'Indeterminado',
      fase: data.fase || 'Adulto',
      vetorDe: Array.isArray(data.vetorDe) ? data.vetorDe : [],
      confianca: Math.min(100, Math.max(0, parseInt(data.confianca, 10) || 85)),
      caracteristicasVisuais: data.caracteristicasVisuais || 'Caracteristicas observadas na fotografia.',
      riscoEpidemiologico: data.riscoEpidemiologico || 'MEDIO',
      acaoRecomendada: data.acaoRecomendada || 'Realizar vistoria no imovel e arredores.'
    };
  } catch (parseErr) {
    console.error('Erro parse JSON:', textOutput);
    throw new Error('Falha ao processar o parecer taxonomico da IA.');
  }
}
