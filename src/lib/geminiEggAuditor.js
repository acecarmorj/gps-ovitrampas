/**
 * Conferência de Ovos de Palheta com IA Google Gemini, por quadros.
 * Desenvolvido especificamente para o Laboratório de Entomologia - Carmo RJ.
 *
 * Antes a foto inteira ia reduzida e a IA devolvia só um número: cada ovo
 * virava 3-4 pixels, a IA estimava em vez de contar e ninguém conseguia ver
 * o que ela tinha contado. Agora a palheta é cortada em ~12 quadros na
 * resolução original e, em cada um, a IA devolve ONDE está cada ovo. Os
 * pontos voltam para a foto e são cruzados com as marcações do app.
 */

import { chamarGeminiGenerateContent, getGeminiApiKey } from './geminiKeyManager';
import { gradeDeQuadros, pontosDoQuadroNaImagem } from './eggAudit';

// Lado maior da imagem de onde saem os quadros. Com ~12 quadros, cada um
// fica com ~800px e o ovo com ~20px - tamanho em que a IA enxerga o grão.
const LADO_MAXIMO_FONTE = 2400;
const QUADROS_ALVO = 12;
const CHAMADAS_SIMULTANEAS = 3;

const PROMPT_QUADRO = `Esta imagem é UM PEDAÇO ampliado da foto de uma palheta de ovitrampa (madeira/eucatex) do laboratório de entomologia de Carmo - RJ. A palheta foi lavada antes de ir para campo.

Marque CADA ovo de Aedes individualmente:
- Ovo = grão preto ou castanho muito escuro, alongado (forma de charuto ou arroz), geralmente em pé nos sulcos da madeira.
- Ovos colados uns nos outros: um ponto para CADA ovo do grupo.
- Ovo cortado pela borda do pedaço: marque se pelo menos metade dele aparece.

NÃO marque: fibras, sulcos ou ranhuras da madeira, manchas marrons claras, sujeira, fiapos, pontinhos muito menores que um ovo, nem nada fora da madeira (fundo preto, mesa, régua).

Responda só o JSON: {"ovos":[{"y":Y,"x":X}, ...]} com o centro de cada ovo em coordenadas de 0 a 1000 relativas a ESTE pedaço (y de cima para baixo, x da esquerda para a direita). Sem ovos: {"ovos":[]}.`;

const SCHEMA_RESPOSTA = {
  type: 'OBJECT',
  properties: {
    ovos: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          y: { type: 'INTEGER' },
          x: { type: 'INTEGER' }
        },
        required: ['y', 'x']
      }
    }
  },
  required: ['ovos']
};

function carregarImagem(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a foto para a conferência.'));
    img.src = dataUrl;
  });
}

async function chamarQuadro(base64, chave) {
  const payload = {
    contents: [
      {
        parts: [
          { text: PROMPT_QUADRO },
          { inlineData: { mimeType: 'image/jpeg', data: base64 } }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA_RESPOSTA,
      temperature: 0.1
    }
  };
  const json = await chamarGeminiGenerateContent(payload, chave);
  const texto = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error('A IA não respondeu para um dos quadros.');
  const dados = JSON.parse(texto.trim());
  return {
    ovos: Array.isArray(dados?.ovos) ? dados.ovos : [],
    modelo: json?.modelVersion || null
  };
}

/**
 * Pede à IA a posição de cada ovo, quadro a quadro.
 *
 * @param {string} fotoDataUrl - foto da palheta (quanto maior a resolução, melhor)
 * @param {{ largura: number, altura: number }} destino - tamanho da imagem onde os
 *   pontos serão desenhados (a do contador local), para devolver na mesma escala.
 * @param {(feitos: number, total: number) => void} [onProgresso]
 * @returns {Promise<{ pontos: Array<{x:number,y:number}>, quadros: number, modelo: string|null }>}
 */
export async function localizarOvosComGemini(fotoDataUrl, destino, onProgresso) {
  if (!fotoDataUrl) {
    throw new Error('Nenhuma fotografia fornecida para análise.');
  }
  const chave = getGeminiApiKey();
  if (!chave) {
    const erro = new Error('Chave da IA do Google não configurada (401). Insira sua chave de API nas configurações.');
    erro.code = 'ERR_CHAVE_AUSENTE';
    throw erro;
  }

  const img = await carregarImagem(fotoDataUrl);
  const naturalL = img.naturalWidth || img.width;
  const naturalA = img.naturalHeight || img.height;
  const escala = Math.min(1, LADO_MAXIMO_FONTE / Math.max(naturalL, naturalA));
  const largura = Math.max(1, Math.round(naturalL * escala));
  const altura = Math.max(1, Math.round(naturalA * escala));

  const fonte = document.createElement('canvas');
  fonte.width = largura;
  fonte.height = altura;
  fonte.getContext('2d').drawImage(img, 0, 0, largura, altura);

  const { quadros } = gradeDeQuadros(largura, altura, { alvo: QUADROS_ALVO });
  const fatorX = destino.largura / largura;
  const fatorY = destino.altura / altura;

  const pontos = [];
  let modelo = null;
  let feitos = 0;
  let proximo = 0;
  onProgresso?.(0, quadros.length);

  const recorte = (quadro) => {
    const c = document.createElement('canvas');
    c.width = quadro.recorte.w;
    c.height = quadro.recorte.h;
    c.getContext('2d').drawImage(
      fonte,
      quadro.recorte.x, quadro.recorte.y, quadro.recorte.w, quadro.recorte.h,
      0, 0, quadro.recorte.w, quadro.recorte.h
    );
    return c.toDataURL('image/jpeg', 0.92).split(',')[1];
  };

  // Um quadro que falha derruba a conferência inteira: sem ele, os ovos
  // daquela área apareceriam como "só o app viu" e o técnico seria levado
  // a apagar ovos de verdade.
  const trabalhador = async () => {
    while (proximo < quadros.length) {
      const quadro = quadros[proximo++];
      const base64 = recorte(quadro);
      let resposta;
      try {
        resposta = await chamarQuadro(base64, chave);
      } catch (err) {
        if (err.code === 'ERR_CHAVE_INVALIDA' || err.code === 'ERR_CHAVE_AUSENTE') throw err;
        await new Promise((r) => setTimeout(r, 2500));
        resposta = await chamarQuadro(base64, chave);
      }
      if (resposta.modelo) modelo = resposta.modelo;
      for (const p of pontosDoQuadroNaImagem(resposta.ovos, quadro)) {
        pontos.push({ x: p.x * fatorX, y: p.y * fatorY });
      }
      feitos += 1;
      onProgresso?.(feitos, quadros.length);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CHAMADAS_SIMULTANEAS, quadros.length) }, trabalhador)
  );

  return { pontos, quadros: quadros.length, modelo };
}
