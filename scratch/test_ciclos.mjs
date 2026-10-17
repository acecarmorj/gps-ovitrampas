import fs from 'fs';
import {
  adaptarArmadilhasParaCiclo,
  calcularMetricasCiclo,
  CICLO_SEMANA_1,
  CICLO_SEMANA_2,
  CICLO_AMBAS,
  CICLO_ID_ANTERIOR,
  CICLO_ID_ATUAL
} from './src/lib/ciclosOvitrampas.js';

const traps = JSON.parse(fs.readFileSync('src/lib/trapsOficiaisCarmo.json', 'utf8'));
const rawReadings = JSON.parse(fs.readFileSync('src/lib/readingsOficiaisCarmo.json', 'utf8'));

// Convert rawReadings using mapD1ReadingToLocal equivalent
const leituras = rawReadings.map(row => ({
  id: row.id,
  armadilhaId: row.armadilha_id,
  numeroArmadilha: String(row.numero_armadilha).replace(/^OV[-_ ]*/i, '').trim(),
  numeroPalheta: String(row.numero_palheta || 'P-01').trim(),
  ovos: Number(row.ovos || 0),
  positiva: Boolean(row.positiva),
  tecnicoNome: row.tecnico_nome || 'Laboratório Carmo',
  observacao: row.observacao || '',
  lidaEm: row.lida_em,
  cicloId: row.lida_em && new Date(row.lida_em) >= new Date('2026-10-10T00:00:00Z') ? '2026_NOVO' : '2025_2026',
  campanhaId: row.lida_em && new Date(row.lida_em) >= new Date('2026-10-10T00:00:00Z') ? '2026_NOVO' : '2025_2026'
}));

console.log('=== TESTE ANO PASSADO (2025_2026) ===');
const adaptadasA = adaptarArmadilhasParaCiclo(traps, leituras, CICLO_SEMANA_1, CICLO_ID_ANTERIOR);
const mA = calcularMetricasCiclo(adaptadasA);
console.log('Ciclo A:', mA);

const adaptadasB = adaptarArmadilhasParaCiclo(traps, leituras, CICLO_SEMANA_2, CICLO_ID_ANTERIOR);
const mB = calcularMetricasCiclo(adaptadasB);
console.log('Ciclo B:', mB);

console.log('\n=== TESTE NOVO CICLO (2026_NOVO) ===');
const adaptadasNovoA = adaptarArmadilhasParaCiclo(traps, leituras, CICLO_SEMANA_1, CICLO_ID_ATUAL);
const mNovoA = calcularMetricasCiclo(adaptadasNovoA);
console.log('Novo Ciclo A:', mNovoA);
