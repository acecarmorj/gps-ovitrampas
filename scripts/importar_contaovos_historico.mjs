// Gera o SQL de importacao do historico do Conta Ovos (uso: node scripts/importar_contaovos_historico.mjs <csv> <ano> <campanha_id> <saida.sql>)
// Exemplo: node scripts/importar_contaovos_historico.mjs dados_contaovos/contaovos-contagens-carmo-2024-2026.csv 2025 2025_FEV dados_contaovos/importar_2025_FEV.sql
// Nao grava nome de responsavel, rua nem complemento. Nao acessa o banco: so escreve o arquivo .sql.
import fs from 'node:fs';

const [, , arquivo, anoArg, campanha, saida] = process.argv;
if (!arquivo || !anoArg || !campanha || !saida) {
  console.error('Uso: node scripts/importar_contaovos_historico.mjs <csv> <ano> <campanha_id> <saida.sql>');
  process.exit(1);
}

const linhas = fs.readFileSync(arquivo, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).map((l) => l.split(';'));
const cab = linhas.shift();
const col = (nome) => {
  const i = cab.indexOf(nome);
  if (i < 0) throw new Error(`Coluna ausente no CSV: ${nome}`);
  return i;
};
const C = {
  num: col('Ovitrampa (número no município)'),
  ano: col('Ano'),
  sem: col('Semana epidemiológica'),
  ovos: col('Ovos'),
  inst: col('Data de instalação da palheta'),
  colh: col('Data de coleta da palheta'),
  lat: col('Latitude'),
  lng: col('Longitude'),
  bairro: col('Bairro'),
  quart: col('Quarteirão')
};

const NOMES_BAIRRO = new Map([
  ['boa ideia', 'Boa Ideia'],
  ['caixa dagua', "Caixa d'Água"],
  ['caixa d’agua', "Caixa d'Água"],
  ['morro do estado', 'Morro do Estado'],
  ['val paraiso', 'Val Paraíso'],
  ['jardim centenario', 'Jardim Centenário'],
  ['influencia', 'Influência'],
  ['corrego da prata', 'Córrego da Prata'],
  ['barra de sao francisco', 'Barra de São Francisco'],
  ['porto velho do cunha', 'Porto Velho do Cunha'],
  ['ilha dos pombos', 'Ilha dos Pombos'],
  ['centro', 'Centro'],
  ['botafogo', 'Botafogo'],
  ['progresso', 'Progresso'],
  ['jose moraes ferreira', 'José Moraes Ferreira']
]);
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’`´]/g, '').toLowerCase().trim();
const bairroPadrao = (b) => {
  const k = semAcento(String(b || ''));
  return NOMES_BAIRRO.get(k) || (b ? String(b).trim() : null);
};
const num = (s) => parseFloat(String(s).replace(',', '.'));
const esc = (s) => (s === null || s === undefined || s === '' ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

const linhasAno = linhas.map((r) => r).filter((r) => r[C.ano] === String(anoArg));
if (linhasAno.length === 0) throw new Error(`Nenhuma linha do ano ${anoArg} no CSV`);

// A = menor semana epidemiologica da campanha; B = a seguinte. Se houver mais de duas, aborta (revisao humana).
const semanas = [...new Set(linhasAno.map((r) => Number(r[C.sem])))].sort((a, b) => a - b);
if (semanas.length !== 2) throw new Error(`Esperadas 2 semanas epidemiologicas, achei ${semanas.join(',')}: revisar antes de importar`);
const cicloDaSemana = new Map([[semanas[0], 'A'], [semanas[1], 'B']]);

const vistos = new Set();
const out = [`-- Importacao do Conta Ovos: campanha ${campanha}, ano ${anoArg}, ${linhasAno.length} leituras (gerado em ${new Date().toISOString()})`];
out.push(`DELETE FROM historical_readings WHERE campanha_id = '${campanha}';`);
for (const r of linhasAno) {
  const numero = String(r[C.num]).trim().padStart(2, '0');
  const ciclo = cicloDaSemana.get(Number(r[C.sem]));
  const id = `hist-${campanha}-${numero}-${ciclo}-${r[C.colh]}`;
  if (vistos.has(id)) throw new Error(`Leitura duplicada: ${id}`);
  vistos.add(id);
  out.push(
    `INSERT INTO historical_readings (id, campanha_id, numero_armadilha, ciclo_semana, ano, semana_epi, ovos, instalada_em, coletada_em, latitude, longitude, bairro, quarteirao) VALUES (` +
      [esc(id), esc(campanha), esc(numero), esc(ciclo), Number(r[C.ano]), Number(r[C.sem]), Number(r[C.ovos]), esc(r[C.inst]), esc(r[C.colh]), num(r[C.lat]), num(r[C.lng]), esc(bairroPadrao(r[C.bairro])), esc(r[C.quart])].join(', ') +
      ');'
  );
}
fs.writeFileSync(saida, out.join('\n') + '\n', 'utf8');

const tot = (c) => linhasAno.filter((r) => cicloDaSemana.get(Number(r[C.sem])) === c).reduce((s, r) => s + Number(r[C.ovos]), 0);
console.log(`OK: ${linhasAno.length} leituras, semanas ${semanas.join('=A, ')}=B | ovos A ${tot('A')} | ovos B ${tot('B')} | arquivo ${saida}`);
