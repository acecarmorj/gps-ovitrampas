/**
 * Funções puras da conferência de ovos: ordem de leitura da numeração,
 * grade de quadros enviada à IA e cruzamento das marcações do app com os
 * pontos devolvidos pela IA. Sem DOM, para poder testar no Node.
 */

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Comprimento típico de um ovo na foto (em px), medido nas marcações do
 * próprio detector. Serve de régua para as faixas da numeração e para o
 * raio de cruzamento app x IA.
 */
export function comprimentoTipicoOvo(markers) {
  const automaticos = markers.filter((m) => m.source === 'automatic' && m.rx);
  const base = automaticos.length >= 5 ? automaticos : markers.filter((m) => m.rx || m.radius);
  const comprimento = median(base.map((m) => 2 * (m.rx || m.radius)));
  return comprimento > 0 ? comprimento : 14;
}

/**
 * Ordem de leitura como num texto: faixas horizontais de cima para baixo e,
 * dentro de cada faixa, da esquerda para a direita. Ordenar só por y dava
 * zigue-zague na tela e o técnico se perdia conferindo 01, 02, 03...
 *
 * @returns {number[]} numeroPorIndice - numero (1..N) de cada marker, na mesma posição do array.
 */
export function numerarEmOrdemDeLeitura(markers) {
  if (!markers.length) return [];
  const faixa = Math.max(10, comprimentoTipicoOvo(markers) * 1.5);
  const indices = markers.map((_, i) => i);
  indices.sort((a, b) => {
    const fa = Math.floor(markers[a].y / faixa);
    const fb = Math.floor(markers[b].y / faixa);
    if (fa !== fb) return fa - fb;
    return markers[a].x - markers[b].x;
  });
  const numeroPorIndice = new Array(markers.length);
  indices.forEach((indice, posicao) => {
    numeroPorIndice[indice] = posicao + 1;
  });
  return numeroPorIndice;
}

function maiorTrechoAcima(valores, limite) {
  let melhorInicio = 0;
  let melhorFim = -1;
  let inicio = -1;
  for (let i = 0; i <= valores.length; i += 1) {
    const acima = i < valores.length && valores[i] >= limite;
    if (acima && inicio < 0) inicio = i;
    if (!acima && inicio >= 0) {
      if (i - 1 - inicio > melhorFim - melhorInicio) {
        melhorInicio = inicio;
        melhorFim = i - 1;
      }
      inicio = -1;
    }
  }
  return [melhorInicio, melhorFim];
}

/**
 * Contorno retangular da palheta (madeira clara) sobre o fundo escuro, para
 * o modo "Folha" desenhar a palheta em branco com os ovos. Usa o brilho
 * médio de cada coluna/linha: a madeira é bem mais clara que o fundo. Se a
 * foto não tiver fundo distinguível, devolve a foto inteira.
 */
export function estimarContornoPalheta(rgba, largura, altura) {
  const inteira = { x: 0, y: 0, w: largura, h: altura };
  if (!largura || !altura) return inteira;
  const passo = Math.max(1, Math.round(Math.max(largura, altura) / 400));
  const cinza = (x, y) => {
    const i = (y * largura + x) * 4;
    return rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114;
  };
  const limiarDe = (medias) => {
    const ordenadas = [...medias].sort((a, b) => a - b);
    const baixo = ordenadas[Math.floor(ordenadas.length * 0.1)];
    const alto = ordenadas[Math.floor(ordenadas.length * 0.9)];
    return alto - baixo < 40 ? null : (baixo + alto) / 2;
  };

  const colunas = [];
  for (let x = 0; x < largura; x += 1) {
    let soma = 0;
    let n = 0;
    for (let y = 0; y < altura; y += passo) {
      soma += cinza(x, y);
      n += 1;
    }
    colunas.push(soma / n);
  }
  const limiarX = limiarDe(colunas);
  const [x0, x1] = limiarX == null ? [0, largura - 1] : maiorTrechoAcima(colunas, limiarX);

  const linhas = [];
  for (let y = 0; y < altura; y += 1) {
    let soma = 0;
    let n = 0;
    for (let x = x0; x <= x1; x += passo) {
      soma += cinza(x, y);
      n += 1;
    }
    linhas.push(n ? soma / n : 0);
  }
  const limiarY = limiarDe(linhas);
  const [y0, y1] = limiarY == null ? [0, altura - 1] : maiorTrechoAcima(linhas, limiarY);

  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  if (w < largura * 0.25 || h < altura * 0.25) return inteira;
  return { x: x0, y: y0, w, h };
}

/**
 * Divide a imagem em ~alvo quadros quase quadrados. Cada quadro tem um
 * "núcleo" (a célula da grade, sem sobreposição) e um "recorte" (o núcleo
 * com margem), que é o que vai para a IA. A margem existe para o ovo que
 * cai na divisa aparecer inteiro em pelo menos um recorte; o núcleo decide
 * de qual quadro o ponto é, e assim nenhum ovo é contado duas vezes.
 */
export function gradeDeQuadros(largura, altura, { alvo = 12, margem = 0.12 } = {}) {
  const colunas = Math.max(1, Math.round(Math.sqrt((alvo * largura) / altura)));
  const linhas = Math.max(1, Math.round(alvo / colunas));
  const celulaL = largura / colunas;
  const celulaA = altura / linhas;
  const margemX = Math.round(celulaL * margem);
  const margemY = Math.round(celulaA * margem);
  const quadros = [];
  for (let linha = 0; linha < linhas; linha += 1) {
    for (let coluna = 0; coluna < colunas; coluna += 1) {
      const nx0 = Math.round(coluna * celulaL);
      const ny0 = Math.round(linha * celulaA);
      const nx1 = coluna === colunas - 1 ? largura : Math.round((coluna + 1) * celulaL);
      const ny1 = linha === linhas - 1 ? altura : Math.round((linha + 1) * celulaA);
      const rx0 = Math.max(0, nx0 - margemX);
      const ry0 = Math.max(0, ny0 - margemY);
      const rx1 = Math.min(largura, nx1 + margemX);
      const ry1 = Math.min(altura, ny1 + margemY);
      quadros.push({
        linha,
        coluna,
        nucleo: { x: nx0, y: ny0, w: nx1 - nx0, h: ny1 - ny0 },
        recorte: { x: rx0, y: ry0, w: rx1 - rx0, h: ry1 - ry0 }
      });
    }
  }
  return { colunas, linhas, quadros };
}

/**
 * Converte os pontos da IA (y, x de 0 a 1000, relativos ao recorte) para
 * coordenadas da imagem inteira e descarta os que caem fora do núcleo do
 * quadro - esses pertencem ao quadro vizinho, que também os viu.
 */
export function pontosDoQuadroNaImagem(pontos, quadro) {
  const { recorte, nucleo } = quadro;
  const saida = [];
  for (const p of pontos || []) {
    const py = Number(p?.y);
    const px = Number(p?.x);
    if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
    if (px < 0 || px > 1000 || py < 0 || py > 1000) continue;
    const x = recorte.x + (px / 1000) * recorte.w;
    const y = recorte.y + (py / 1000) * recorte.h;
    if (x < nucleo.x || x >= nucleo.x + nucleo.w) continue;
    if (y < nucleo.y || y >= nucleo.y + nucleo.h) continue;
    saida.push({ x, y });
  }
  return saida;
}

/**
 * Cruza marcações do app com pontos da IA, um para um, pelo par mais
 * próximo primeiro. Dois ovos colados que o app marcou como um só viram
 * um par + um ponto "só IA" - é assim que o ovo que faltava aparece.
 *
 * @returns {{ pares: Array<[number, number]>, soApp: number[], soIA: number[] }}
 *   índices em markers (soApp) e em pontosIA (soIA).
 */
export function cruzarAppComIA(markers, pontosIA, raio) {
  const candidatos = [];
  for (let i = 0; i < markers.length; i += 1) {
    for (let j = 0; j < pontosIA.length; j += 1) {
      const d = Math.hypot(markers[i].x - pontosIA[j].x, markers[i].y - pontosIA[j].y);
      if (d <= raio) candidatos.push([d, i, j]);
    }
  }
  candidatos.sort((a, b) => a[0] - b[0]);
  const usadoApp = new Uint8Array(markers.length);
  const usadoIA = new Uint8Array(pontosIA.length);
  const pares = [];
  for (const [, i, j] of candidatos) {
    if (usadoApp[i] || usadoIA[j]) continue;
    usadoApp[i] = 1;
    usadoIA[j] = 1;
    pares.push([i, j]);
  }
  const soApp = [];
  for (let i = 0; i < markers.length; i += 1) if (!usadoApp[i]) soApp.push(i);
  const soIA = [];
  for (let j = 0; j < pontosIA.length; j += 1) if (!usadoIA[j]) soIA.push(j);
  return { pares, soApp, soIA };
}

/**
 * Junta as marcações atuais com os pontos da IA: marca quem só o app viu
 * (divergencia 'so_app') e acrescenta quem só a IA viu (source 'ia').
 * Marcações manuais do técnico nunca recebem divergência - ele já decidiu.
 */
export function mesclarConferenciaIA(markers, pontosIA) {
  const base = markers
    .filter((m) => m.source !== 'ia')
    .map(({ divergencia, ...resto }) => resto);
  const comprimento = comprimentoTipicoOvo(base);
  // Medido na foto 2.jpeg contra as 103 marcações do Almir: os pares
  // verdadeiros ficam a menos de ~10px; de 1 ovo em diante já é o vizinho.
  const raio = Math.max(6, comprimento);
  const { pares, soApp, soIA } = cruzarAppComIA(base, pontosIA, raio);

  const soAppSet = new Set(soApp);
  const mesclados = base.map((m, i) =>
    soAppSet.has(i) && m.source !== 'manual' ? { ...m, divergencia: 'so_app' } : m
  );
  const rx = Math.max(3, comprimento / 2);
  for (const j of soIA) {
    mesclados.push({
      x: pontosIA[j].x,
      y: pontosIA[j].y,
      radius: rx,
      rx,
      ry: Math.max(2.2, rx * 0.55),
      angle: -Math.PI / 2,
      score: 1,
      source: 'ia',
      divergencia: 'so_ia'
    });
  }

  const soAppConta = mesclados.filter((m) => m.divergencia === 'so_app').length;
  const total = pares.length + soAppConta + soIA.length;
  return {
    markers: mesclados,
    resumo: {
      ovosIA: pontosIA.length,
      concordam: pares.length,
      soApp: soAppConta,
      soIA: soIA.length,
      concordancia: total ? Math.round((pares.length / total) * 100) : 100
    }
  };
}
