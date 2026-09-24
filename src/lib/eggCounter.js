/**
 * Motor de Visão Computacional para Análise de Palhetas de Ovitrampas
 * Adaptado e otimizado para o GPS Ovitrampas - Município de Carmo RJ.
 * 
 * Processamento 100% no cliente (HTML5 Canvas / TypedArrays).
 * Funciona offline, rápido (de 20ms a 80ms) e sem dependências externas.
 */

const MAX_CANDIDATES = 1500;
const SUSPICIOUS_CANDIDATE_COUNT = 800;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function boxSum(integral, integralWidth, x1, y1, x2, y2) {
  return (
    integral[(y2 + 1) * integralWidth + x2 + 1] -
    integral[y1 * integralWidth + x2 + 1] -
    integral[(y2 + 1) * integralWidth + x1] +
    integral[y1 * integralWidth + x1]
  );
}

function isBlueInk(red, green, blue) {
  return blue > red + 22 && blue > green + 10 && blue > 70 && red < 160;
}

function isBrightBackground(red, green, blue, gray) {
  return gray >= 214 || (red >= 220 && green >= 218 && blue >= 216);
}

// Antes o raio de exclusao crescia com o tamanho do ovo, entao um ovo grande
// "apagava" o vizinho a ate ~25px - na foto 2.jpeg ovos grandes e nitidos
// morriam assim. Componentes conexos ja sao disjuntos; o que sobra para
// suprimir sao pedacos do MESMO ovo cortado por uma fibra, com centros bem
// proximos. Entao a distancia e fixa: 0.65 do comprimento tipico de ovo
// (0.5 deixava passar ovo partido em 2 pedacos a ~10px um do outro).
function suppressOverlapping(candidates) {
  if (!candidates.length) return [];
  const tipico = median(candidates.map((c) => 2 * (c.rx ?? c.radius)));
  const limite = Math.max(3, tipico * 0.65);
  const sorted = [...candidates].sort((left, right) => right.score - left.score);
  const kept = [];

  for (const candidate of sorted) {
    const overlaps = kept.some(
      (other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) < limite
    );
    if (!overlaps) kept.push(candidate);
  }

  return kept;
}

function percentil(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

// Conta manchas de ovos colados pelo COMPRIMENTO/LARGURA, com a regua
// tirada dos ovos isolados da propria foto. Area nao serve: medido na
// 2.jpeg, a mancha de um unico ovo vai de 25 a 116 px e ovos isolados
// grandes viravam 3. Usa o percentil 75 (ovo inteiro, nao o pedaco que
// sobrou visivel) e so divide com folga: 1.7x a regua para contar 2.
// So divide AGLOMERADO (mancha que reprovou como ovo unico). Ovo isolado
// que passou no filtro de forma fica 1 mesmo se for comprido - o Almir
// conferiu um desses (12x33px) e era um ovo so.
function dividirAglomerados(candidates) {
  const isolados = candidates.filter((c) => !c.aglomerado);
  const base = isolados.length >= 5 ? isolados : candidates;
  const comprimentoTipico = percentil(
    base.map((c) => Math.max(c.bbox.maxX - c.bbox.minX, c.bbox.maxY - c.bbox.minY) + 1),
    0.75
  );
  const larguraTipica = percentil(
    base.map((c) => Math.min(c.bbox.maxX - c.bbox.minX, c.bbox.maxY - c.bbox.minY) + 1),
    0.75
  );
  const saida = [];

  for (const c of candidates) {
    const { minX, maxX, minY, maxY } = c.bbox;
    const largura = maxX - minX + 1;
    const altura = maxY - minY + 1;
    const porComprimento =
      comprimentoTipico > 0 ? Math.max(largura, altura) / comprimentoTipico : 1;
    const porLargura = larguraTipica > 0 ? Math.min(largura, altura) / larguraTipica : 1;
    if (!c.aglomerado) {
      saida.push(c);
      continue;
    }
    // Aglomerado pode ser fila (o "S") ou ovos lado a lado.
    const emFila = porComprimento >= porLargura;
    const partes = clamp(Math.floor((emFila ? porComprimento : porLargura) + 0.3), 1, 4);
    // Mancha escura torta que nao chega a 2 ovos: segue descartada, como antes.
    if (partes === 1) continue;
    // Fila divide ao longo do lado maior; lado a lado, ao longo do menor.
    const ladoMaiorVertical = altura >= largura;
    const dividirNaAltura = emFila ? ladoMaiorVertical : !ladoMaiorVertical;
    for (let i = 0; i < partes; i += 1) {
      const t = (i + 0.5) / partes;
      const rx = Math.max(3, (dividirNaAltura ? altura / partes : altura) / 2 + 1.2);
      const ry = Math.max(2.2, (dividirNaAltura ? largura : largura / partes) / 2 + 1);
      saida.push({
        ...c,
        x: dividirNaAltura ? c.x : minX + t * largura,
        y: dividirNaAltura ? minY + t * altura : c.y,
        radius: rx,
        rx,
        ry,
        angle: -Math.PI / 2,
        area: c.area / partes,
        parteDeAglomerado: partes,
      });
    }
  }

  return saida;
}

// Brilho do miolo da mancha (25% pixels mais escuros da caixa) dividido
// pelo brilho do fundo em volta (moldura fora da caixa). Ovo de verdade tem
// o miolo quase preto: conferido pelo Almir num quadrado da 2.jpeg, os
// ovos ficaram entre 0.05 e 0.18 e as sombras/fibras que o app contava
// como ovo entre 0.24 e 0.36. Relativo ao fundo, vale com qualquer luz.
function nucleoSobreFundo(gray, width, height, minX, maxX, minY, maxY) {
  const dentro = [];
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) dentro.push(gray[y * width + x]);
  }
  dentro.sort((a, b) => a - b);
  const n = Math.max(3, Math.round(dentro.length * 0.25));
  let soma = 0;
  for (let i = 0; i < n && i < dentro.length; i += 1) soma += dentro[i];
  const nucleo = soma / Math.min(n, dentro.length);
  const anel = [];
  for (let y = minY - 6; y <= maxY + 6; y += 1) {
    if (y < 0 || y >= height) continue;
    for (let x = minX - 6; x <= maxX + 6; x += 1) {
      if (x < 0 || x >= width) continue;
      if (x >= minX - 2 && x <= maxX + 2 && y >= minY - 2 && y <= maxY + 2) continue;
      anel.push(gray[y * width + x]);
    }
  }
  const fundo = median(anel) || 1;
  return nucleo / fundo;
}

function findPaddleRoi(gray, red, green, blue, width, height) {
  const pixelCount = width * height;
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let paddlePixels = 0;
  const paddleGray = [];

  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    if (isBlueInk(red[pixel], green[pixel], blue[pixel])) continue;
    if (isBrightBackground(red[pixel], green[pixel], blue[pixel], gray[pixel])) {
      continue;
    }
    const y = Math.floor(pixel / width);
    const x = pixel - y * width;
    paddlePixels += 1;
    paddleGray.push(gray[pixel]);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const coverage = paddlePixels / pixelCount;
  if (coverage < 0.06 || maxX <= minX || maxY <= minY) {
    return {
      minX: 1,
      minY: 1,
      maxX: width - 2,
      maxY: height - 2,
      width: width - 2,
      height: height - 2,
      medianGray: 140,
      coverage: 1,
    };
  }

  const insetX = clamp(Math.round((maxX - minX + 1) * 0.03), 2, 18);
  const insetY = clamp(Math.round((maxY - minY + 1) * 0.02), 2, 16);
  minX = Math.min(width - 3, Math.max(1, minX + insetX));
  maxX = Math.max(minX + 2, Math.min(width - 2, maxX - insetX));
  minY = Math.min(height - 3, Math.max(1, minY + insetY));
  maxY = Math.max(minY + 2, Math.min(height - 2, maxY - insetY));

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    medianGray: median(paddleGray),
    coverage,
  };
}

function estimateGroovePitch(gray, width, roi) {
  const span = roi.maxX - roi.minX + 1;
  if (span < 20) return 0;
  const means = new Float64Array(span);
  const counts = new Uint32Array(span);
  for (let y = roi.minY; y <= roi.maxY; y += 1) {
    const row = y * width;
    for (let x = roi.minX; x <= roi.maxX; x += 1) {
      const index = x - roi.minX;
      means[index] += gray[row + x];
      counts[index] += 1;
    }
  }
  const smooth = new Float64Array(span);
  for (let i = 0; i < span; i += 1) {
    means[i] = counts[i] ? means[i] / counts[i] : 0;
  }
  for (let i = 0; i < span; i += 1) {
    let sum = 0;
    let n = 0;
    for (let k = -2; k <= 2; k += 1) {
      const j = i + k;
      if (j < 0 || j >= span) continue;
      sum += means[j];
      n += 1;
    }
    smooth[i] = sum / n;
  }
  const mean = smooth.reduce((total, value) => total + value, 0) / span;
  const maxLag = Math.min(64, Math.floor(span / 3));
  const correlations = [];
  let bestLag = 0;
  let bestCorr = 0;
  for (let lag = 6; lag <= maxLag; lag += 1) {
    let num = 0;
    let den1 = 0;
    let den2 = 0;
    for (let i = 0; i < span - lag; i += 1) {
      const a = smooth[i] - mean;
      const b = smooth[i + lag] - mean;
      num += a * b;
      den1 += a * a;
      den2 += b * b;
    }
    const corr = num / Math.sqrt((den1 || 1) * (den2 || 1));
    correlations.push(corr);
    if (corr > bestCorr) {
      bestLag = lag;
      bestCorr = corr;
    }
  }
  if (bestCorr < 0.34 || !bestLag) return 0;
  for (let index = 0; index < correlations.length; index += 1) {
    const lag = index + 6;
    const corr = correlations[index];
    const prev = index > 0 ? correlations[index - 1] : 0;
    const next = index + 1 < correlations.length ? correlations[index + 1] : 0;
    const harmonic = bestLag > 0 && bestLag % lag === 0;
    if (corr >= 0.4 && corr >= prev && corr >= next && (harmonic || lag * 2 === bestLag)) {
      return lag;
    }
  }
  return bestLag;
}

function pruneSpecks(mask, width, height) {
  const copy = mask.slice();
  for (let y = 1; y < height - 1; y += 1) {
    const row = y * width;
    for (let x = 1; x < width - 1; x += 1) {
      const pixel = row + x;
      if (!copy[pixel]) continue;
      let neighbors = 0;
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (!offsetX && !offsetY) continue;
          if (copy[(y + offsetY) * width + x + offsetX]) neighbors += 1;
        }
      }
      if (neighbors < 2) mask[pixel] = 0;
    }
  }
}

/**
 * Analisa a imagem da palheta e detecta os ovos de Aedes aegypti.
 *
 * @param {Uint8ClampedArray} rgba - Bytes RGBA da imagem no Canvas
 * @param {number} width - Largura em pixels
 * @param {number} height - Altura em pixels
 * @param {number} sensitivity - Sensibilidade (20 a 80, padrão 45)
 * @returns {{ candidates: Array, threshold: number, inspectedPixels: number, suspicious: boolean, warning?: string }}
 */
export function analyzeEggImage(
  rgba,
  width,
  height,
  sensitivity = 45
) {
  if (width < 8 || height < 8 || rgba.length < width * height * 4) {
    return {
      candidates: [],
      threshold: 0,
      inspectedPixels: 0,
      suspicious: false,
    };
  }

  const pixelCount = width * height;
  const gray = new Uint8Array(pixelCount);
  const red = new Uint8Array(pixelCount);
  const green = new Uint8Array(pixelCount);
  const blue = new Uint8Array(pixelCount);
  for (let index = 0, pixel = 0; pixel < pixelCount; pixel += 1, index += 4) {
    red[pixel] = rgba[index];
    green[pixel] = rgba[index + 1];
    blue[pixel] = rgba[index + 2];
    gray[pixel] = Math.round(
      rgba[index] * 0.299 + rgba[index + 1] * 0.587 + rgba[index + 2] * 0.114
    );
  }

  const roi = findPaddleRoi(gray, red, green, blue, width, height);
  const integralWidth = width + 1;
  const integral = new Float64Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let rowSum = 0;
    const rowOffset = (y - 1) * width;
    const integralOffset = y * integralWidth;
    const previousOffset = (y - 1) * integralWidth;
    for (let x = 1; x <= width; x += 1) {
      rowSum += gray[rowOffset + x - 1];
      integral[integralOffset + x] = integral[previousOffset + x] + rowSum;
    }
  }

  const normalizedSensitivity = clamp(sensitivity, 0, 100);
  const contrastThreshold = 20 - normalizedSensitivity * 0.06;
  const verticalThreshold = 5 - normalizedSensitivity * 0.02;
  const darkFraction = 0.43 + normalizedSensitivity * 0.0014;
  const darkPixelLimit = clamp(roi.medianGray * darkFraction, 48, 100);
  const brownMax = 30 + normalizedSensitivity * 0.08;
  const achromaMax = 30 + normalizedSensitivity * 0.08;
  const localRadius = clamp(Math.round(roi.width / 42), 5, 22);
  const verticalSpan = clamp(Math.round(roi.width * 0.022), 4, 16);
  const horizontalSpan = clamp(Math.round(roi.width * 0.016), 3, 12);
  const groovePitch = estimateGroovePitch(gray, width, roi);

  const mask = new Uint8Array(pixelCount);
  const darkness = new Float32Array(pixelCount);
  const verticalDark = new Float32Array(pixelCount);
  let inspectedPixels = 0;

  for (let y = roi.minY; y <= roi.maxY; y += 1) {
    const y1 = Math.max(roi.minY, y - localRadius);
    const y2 = Math.min(roi.maxY, y + localRadius);
    const yUp = Math.max(roi.minY, y - verticalSpan);
    const yDown = Math.min(roi.maxY, y + verticalSpan);
    for (let x = roi.minX; x <= roi.maxX; x += 1) {
      const pixel = y * width + x;
      if (isBlueInk(red[pixel], green[pixel], blue[pixel])) continue;
      if (isBrightBackground(red[pixel], green[pixel], blue[pixel], gray[pixel])) {
        continue;
      }
      inspectedPixels += 1;
      const x1 = Math.max(roi.minX, x - localRadius);
      const x2 = Math.min(roi.maxX, x + localRadius);
      const area = (x2 - x1 + 1) * (y2 - y1 + 1);
      const localMean = boxSum(integral, integralWidth, x1, y1, x2, y2) / area;
      const difference = localMean - gray[pixel];
      const columnMean =
        boxSum(integral, integralWidth, x, yUp, x, yDown) /
        (yDown - yUp + 1);
      const verticalGap = columnMean - gray[pixel];
      const leftX = Math.max(roi.minX, x - horizontalSpan);
      const rightX = Math.min(roi.maxX, x + horizontalSpan);
      const horizontalGap =
        (gray[y * width + leftX] + gray[y * width + rightX]) / 2 -
        gray[pixel];
      darkness[pixel] = difference;
      verticalDark[pixel] = verticalGap;
      if (
        gray[pixel] <= darkPixelLimit &&
        gray[pixel] <= roi.medianGray * 0.72 &&
        difference >= contrastThreshold &&
        horizontalGap >= 10
      ) {
        mask[pixel] = 1;
      }
    }
  }

  pruneSpecks(mask, width, height);

  const stack = new Int32Array(pixelCount);
  const candidates = [];
  let rawComponents = 0;
  const minShort = clamp(Math.round(roi.width * 0.0045), 2, 6);
  const maxLong = clamp(Math.round(roi.width * 0.085), 12, 52);
  const minimumArea = Math.max(8, Math.round((roi.width * roi.width) / 42_000));
  const maximumArea = Math.max(
    70,
    Math.round((roi.width * roi.width) / 180)
  );

  for (let start = 0; start < pixelCount; start += 1) {
    if (!mask[start]) continue;

    let stackSize = 0;
    stack[stackSize++] = start;
    mask[start] = 0;
    rawComponents += 1;

    let area = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let darknessTotal = 0;
    let verticalTotal = 0;
    let grayTotal = 0;
    let minGray = 255;
    let redTotal = 0;
    let greenTotal = 0;
    let blueTotal = 0;
    let momentX = 0;
    let momentY = 0;

    while (stackSize) {
      const pixel = stack[--stackSize];
      const y = Math.floor(pixel / width);
      const x = pixel - y * width;
      area += 1;
      darknessTotal += darkness[pixel];
      verticalTotal += verticalDark[pixel];
      grayTotal += gray[pixel];
      minGray = Math.min(minGray, gray[pixel]);
      redTotal += red[pixel];
      greenTotal += green[pixel];
      blueTotal += blue[pixel];
      momentX += x;
      momentY += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        const neighborY = y + offsetY;
        if (neighborY < 0 || neighborY >= height) continue;
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighborX = x + offsetX;
          if (neighborX < 0 || neighborX >= width) continue;
          const neighbor = neighborY * width + neighborX;
          if (!mask[neighbor]) continue;
          mask[neighbor] = 0;
          stack[stackSize++] = neighbor;
        }
      }
    }

    const componentWidth = maxX - minX + 1;
    const componentHeight = maxY - minY + 1;
    const boxArea = componentWidth * componentHeight;
    const fill = area / boxArea;
    const meanDarkness = darknessTotal / area;
    const meanVertical = verticalTotal / area;
    const meanGray = grayTotal / area;
    const meanRed = redTotal / area;
    const meanGreen = greenTotal / area;
    const meanBlue = blueTotal / area;
    const meanBrown = meanRed - meanBlue;
    const meanAchroma =
      Math.max(meanRed, meanGreen, meanBlue) -
      Math.min(meanRed, meanGreen, meanBlue);
    const cx = momentX / area;
    const cy = momentY / area;
    const shortSide = Math.min(componentWidth, componentHeight);
    const longSide = Math.max(componentWidth, componentHeight);
    const bboxAspect = longSide / Math.max(1, shortSide);

    // O filtro de madeira existe pra descartar a fibra da palheta, que e
    // marrom. So que o ovo tambem e marrom-escuro: sob luz quente/amarelada
    // ele media marrom 44 e croma 44 (limite 34) e era descartado junto -
    // medido em foto real, 87 de 150 ovos morriam aqui e a contagem dava 22
    // onde havia ~140. A fibra e marrom CLARA; o ovo e bem mais escuro que o
    // fundo. Entao nao aplica o filtro a quem for bem escuro.
    const bemEscuro = meanGray <= roi.medianGray * 0.42;

    // "Fill" = quanto da caixa em volta a mancha ocupa. Ovo escuro meio
    // escondido por fibra, ou torto no sulco, ocupa pouco da caixa e morria
    // aqui: na foto 2.jpeg foi o motivo de 31 dos 42 ovos perdidos. Para
    // quem e bem escuro o minimo cai de 0.45 para 0.30 (medido: acerto 59%
    // -> 76%, palheta limpa continua 0).
    const fillMinimo = bemEscuro ? 0.3 : 0.45;
    const reprovaComoOvoUnico =
      area < minimumArea ||
      area > maximumArea ||
      shortSide < minShort ||
      longSide > maxLong ||
      componentWidth > maxLong ||
      fill < fillMinimo ||
      componentHeight < componentWidth * 0.8 ||
      meanDarkness < contrastThreshold * 0.85 ||
      meanGray > darkPixelLimit ||
      meanGray > roi.medianGray * darkFraction ||
      minGray > roi.medianGray * 0.5 ||
      isBlueInk(meanRed, meanGreen, meanBlue) ||
      meanBlue > meanRed + 18;

    // Ovos colados formam uma mancha torta ou larga (o "S" preto, dois ovos
    // lado a lado) que reprova como ovo unico. Se for bem escura e do
    // tamanho de 2+ ovos, nao descarta: segue pelos filtros de madeira e
    // ranhura e depois e contada pela area (ver dividirAglomerados).
    const podeSerAglomerado =
      bemEscuro &&
      minGray <= roi.medianGray * 0.38 &&
      area >= minimumArea * 2 &&
      area <= maximumArea &&
      longSide <= maxLong * 1.6 &&
      fill >= 0.2 &&
      meanDarkness >= contrastThreshold * 0.85 &&
      !isBlueInk(meanRed, meanGreen, meanBlue) &&
      meanBlue <= meanRed + 18;

    let aglomerado = false;
    if (reprovaComoOvoUnico) {
      if (!podeSerAglomerado) continue;
      aglomerado = true;
    }

    let mxx = 0;
    let myy = 0;
    let mxy = 0;
    for (let y = minY; y <= maxY; y += 1) {
      const row = y * width;
      for (let x = minX; x <= maxX; x += 1) {
        const pixel = row + x;
        if (
          gray[pixel] > meanGray + 12 ||
          isBlueInk(red[pixel], green[pixel], blue[pixel])
        ) {
          continue;
        }
        if (
          darkness[pixel] < contrastThreshold * 0.55 &&
          verticalDark[pixel] < verticalThreshold * 0.55
        ) {
          continue;
        }
        const dx = x - cx;
        const dy = y - cy;
        mxx += dx * dx;
        myy += dy * dy;
        mxy += dx * dy;
      }
    }
    const covNorm = Math.max(1, area);
    mxx /= covNorm;
    myy /= covNorm;
    mxy /= covNorm;
    const trace = mxx + myy;
    const det = mxx * myy - mxy * mxy;
    const disc = Math.sqrt(Math.max(0, trace * trace / 4 - det));
    const lambda1 = trace / 2 + disc;
    const lambda2 = Math.max(0.12, trace / 2 - disc);
    const momentAspect = Math.sqrt(lambda1 / lambda2);
    const angle = 0.5 * Math.atan2(2 * mxy, mxx - myy);
    const verticalAligned = Math.abs(Math.sin(angle));
    const riceAspect =
      momentAspect >= 1.35 && momentAspect <= 4.15
        ? momentAspect
        : bboxAspect;

    if (
      !aglomerado &&
      (riceAspect < 1.52 ||
        riceAspect > 3.95 ||
        (bboxAspect < 1.38 && momentAspect < 1.52) ||
        verticalAligned < 0.5)
    ) {
      const veryDark =
        minGray <= roi.medianGray * 0.38 &&
        meanGray <= roi.medianGray * 0.44 &&
        fill >= 0.5 &&
        area >= minimumArea;
      const blurredRice =
        veryDark &&
        riceAspect >= 1.18 &&
        riceAspect <= 2.4 &&
        componentHeight >= componentWidth * 0.85 &&
        meanAchroma < 24 &&
        meanBrown < 22;
      if (!blurredRice) {
        if (!podeSerAglomerado) continue;
        aglomerado = true;
      }
    }

    const woodLike =
      !bemEscuro && meanBrown > brownMax && meanAchroma > achromaMax;
    if (woodLike) continue;
    if (nucleoSobreFundo(gray, width, height, minX, maxX, minY, maxY) > 0.22) continue;

    if (groovePitch >= 6) {
      let periodicHits = 0;
      let periodicSamples = 0;
      const sampleY = clamp(Math.round(cy), roi.minY, roi.maxY);
      for (const step of [-2, -1, 1, 2]) {
        const sampleX = Math.round(cx + step * groovePitch);
        if (sampleX < roi.minX || sampleX > roi.maxX) continue;
        const sample = gray[sampleY * width + sampleX];
        periodicSamples += 1;
        if (sample <= meanGray + 16) periodicHits += 1;
      }
      if (periodicSamples >= 2 && periodicHits / periodicSamples >= 0.5) {
        continue;
      }
    }

    const shapeScore = clamp(1 - Math.abs(riceAspect - 2.4) / 2.4, 0, 1);
    const contrastScore = clamp((meanDarkness - contrastThreshold) / 38, 0, 1);
    const isolationScore = clamp((meanVertical - verticalThreshold) / 22, 0, 1);
    const chromaScore = clamp((achromaMax + 6 - meanAchroma) / 28, 0, 1);
    const darknessScore = clamp((roi.medianGray - meanGray) / 70, 0, 1);
    const coreScore = clamp((roi.medianGray * 0.46 - minGray) / 28, 0, 1);
    const rx = Math.max(3, longSide / 2 + 1.6);
    const ry = Math.max(2.2, shortSide / 2 + 1.2);

    candidates.push({
      x: cx,
      y: cy,
      radius: rx,
      rx,
      ry,
      angle,
      score:
        coreScore * 0.28 +
        darknessScore * 0.22 +
        chromaScore * 0.18 +
        contrastScore * 0.14 +
        shapeScore * 0.1 +
        isolationScore * 0.08,
      source: "automatic",
      area,
      aglomerado,
      bbox: { minX, maxX, minY, maxY },
    });
  }

  let filtered = suppressOverlapping(candidates).sort(
    (left, right) => right.score - left.score
  );
  if (filtered.length > 8) {
    const bestScore = filtered[0]?.score ?? 0;
    const scoreFloor = Math.max(0.32, bestScore - 0.30);
    filtered = filtered.filter((candidate) => candidate.score >= scoreFloor);
  }
  filtered = dividirAglomerados(filtered);
  if (filtered.length > MAX_CANDIDATES) {
    filtered = filtered.slice(0, MAX_CANDIDATES);
  }

  const textureDominated = rawComponents >= 1500 && filtered.length >= 800;
  // SUSPICIOUS_CANDIDATE_COUNT ficou declarado mas fora do calculo de
  // suspicious na ultima alteracao (80->1500) - sem ele, uma palheta suja
  // gerando centenas de blobs de ruido passava sem aviso nenhum antes de
  // chegar perto do teto de 1500. Restaurado.
  const suspicious =
    textureDominated ||
    filtered.length >= MAX_CANDIDATES ||
    filtered.length >= SUSPICIOUS_CANDIDATE_COUNT;
  let warning;
  if (filtered.length >= MAX_CANDIDATES) {
    warning = `Contagem atingiu o limite técnico de ${MAX_CANDIDATES} ovos. Verifique se a palheta possui sujeiras ou reduza a sensibilidade.`;
  } else if (textureDominated) {
    warning = "Palheta com textura ou ranhuras muito acentuadas. Revise os anéis marcados ou reduza a sensibilidade se necessário.";
  } else if (filtered.length >= SUSPICIOUS_CANDIDATE_COUNT) {
    warning = `Contagem incomum (${filtered.length}+ candidatos). Confira se a palheta esta suja ou a foto tem muito ruido antes de salvar.`;
  }

  return {
    candidates: filtered,
    threshold: contrastThreshold,
    inspectedPixels,
    suspicious,
    warning,
  };
}

/**
 * Calcula uma pontuação de confiança operacional (0 a 100%) da contagem automática.
 *
 * @param {{ candidates: Array, suspicious: boolean, warning?: string, inspectedPixels: number }} analysis 
 * @returns {number}
 */
export function calculateEggConfidence(analysis) {
  let score = 95;
  if (analysis.suspicious) score -= 15;
  if (analysis.candidates.length === 0) score -= 4;
  if (analysis.warning) score -= 8;
  if (analysis.inspectedPixels < 5000) score -= 6;
  return Math.max(40, Math.min(98, Math.round(score)));
}
