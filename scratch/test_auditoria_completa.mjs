import fs from 'fs';
import assert from 'assert';
import {
  VERSAO_AUDITORIA_CADASTRO,
  reconciliarArmadilhaComBaseOficial,
  reconciliarArmadilhasComBaseOficial
} from '../src/lib/storage.js';

console.log('================================================================');
console.log('INICIANDO BATERIA DE TESTES DE AUDITORIA CADASTRAL - CARMO/RJ');
console.log('================================================================\n');

// 1. Carrega dados de auditoria
const mdContent = fs.readFileSync('RELATORIO_AUDITORIA_ENDERECOS_CAMPO.md', 'utf8');
const lines = mdContent.split('\n');
const auditRecords = {};

for (const line of lines) {
  if (line.trim().startsWith('| OV-')) {
    const parts = line.split('|').map(s => s.trim()).filter(Boolean);
    const ovNum = parts[0].replace('OV-', '');
    const coords = parts[5].replace(/`/g, '').split(',').map(s => parseFloat(s.trim()));
    auditRecords[ovNum] = {
      morador: parts[1],
      logradouro: parts[2],
      bairro: parts[3],
      quarteirao: parts[4],
      lat: coords[0],
      lng: coords[1]
    };
  }
}

console.log(`[TESTE 1] Relatório de auditoria parsed: ${Object.keys(auditRecords).length} armadilhas.`);
assert.strictEqual(Object.keys(auditRecords).length, 56, 'Deveria ter exatamente 56 armadilhas no MD');

// 2. Valida src/lib/trapsOficiaisCarmo.json
const oficiais = JSON.parse(fs.readFileSync('src/lib/trapsOficiaisCarmo.json', 'utf8'));
assert.strictEqual(oficiais.length, 56, 'trapsOficiaisCarmo.json deve ter 56 armadilhas');

for (const t of oficiais) {
  const num = (t.numero || '').toString().padStart(2, '0');
  const audit = auditRecords[num];
  assert(audit, `Armadilha OV-${num} não encontrada no relatório de auditoria`);

  // Valida morador
  assert.strictEqual(t.moradorNome, audit.morador, `OV-${num} moradorNome incorreto: ${t.moradorNome} vs ${audit.morador}`);
  assert.strictEqual(t.morador_nome, audit.morador, `OV-${num} morador_nome incorreto: ${t.morador_nome} vs ${audit.morador}`);

  // Valida quarteirão (NUNCA Q-Distrito)
  assert.strictEqual(t.quarteirao, audit.quarteirao, `OV-${num} quarteirao incorreto: ${t.quarteirao} vs ${audit.quarteirao}`);
  assert(!/distrito/i.test(t.quarteirao), `OV-${num} quarteirão ainda contém 'distrito'`);

  // Valida bairro
  assert.strictEqual(t.bairro, audit.bairro, `OV-${num} bairro incorreto: ${t.bairro} vs ${audit.bairro}`);

  // Valida logradouro
  const auditParts = audit.logradouro.split(', ');
  const auditRua = auditParts[0];
  const auditNum = auditParts.slice(1).join(', ');
  assert.strictEqual(t.rua, auditRua, `OV-${num} rua incorreta: ${t.rua} vs ${auditRua}`);
  assert.strictEqual(t.numeroImovel || t.numero_imovel, auditNum, `OV-${num} numeroImovel incorreto: ${t.numeroImovel} vs ${auditNum}`);

  // Valida coordenadas
  assert(Math.abs(t.latitude - audit.lat) < 0.0001, `OV-${num} latitude difere: ${t.latitude} vs ${audit.lat}`);
  assert(Math.abs(t.longitude - audit.lng) < 0.0001, `OV-${num} longitude difere: ${t.longitude} vs ${audit.lng}`);

  // Valida presença de chaves camelCase para compatibilidade
  assert(t.ultimosOvos !== undefined, `OV-${num} deve conter ultimosOvos`);
  assert(t.ultimaPalheta !== undefined, `OV-${num} deve conter ultimaPalheta`);
}
console.log('✓ [TESTE 2] Todas as 56 armadilhas em src/lib/trapsOficiaisCarmo.json 100% validadas contra o relatório de campo!');

// 3. Valida traps_clean_utf8.json
const clean = JSON.parse(fs.readFileSync('traps_clean_utf8.json', 'utf8'));
assert.strictEqual(clean.length, 56, 'traps_clean_utf8.json deve ter 56 armadilhas');
for (const t of clean) {
  const num = (t.numero || '').toString().padStart(2, '0');
  const audit = auditRecords[num];
  assert.strictEqual(t.moradorNome, audit.morador, `Clean OV-${num} morador`);
  assert.strictEqual(t.quarteirao, audit.quarteirao, `Clean OV-${num} quarteirao`);
  assert.strictEqual(t.bairro, audit.bairro, `Clean OV-${num} bairro`);
}
console.log('✓ [TESTE 3] traps_clean_utf8.json 100% validado contra a auditoria!');

// 4. Teste de Reconciliação do storage
console.log('VERSAO_AUDITORIA_CADASTRO:', VERSAO_AUDITORIA_CADASTRO);
assert(VERSAO_AUDITORIA_CADASTRO, 'VERSAO_AUDITORIA_CADASTRO deve estar exportada');

// Simula um registro desatualizado (ex: retornado por sync antigo do servidor com morador null e Q-Distrito)
const trapDesatualizada = {
  id: 'arm-teste-legada',
  numero: '12',
  palheta: '12B',
  moradorNome: '',
  morador_nome: null,
  rua: '',
  numeroImovel: '',
  numero_imovel: null,
  bairro: 'Centro',
  quarteirao: 'Q-Distrito',
  latitude: 0,
  longitude: 0,
  status: 'analisada',
  ultimosOvos: 15
};

const reconciliada = reconciliarArmadilhaComBaseOficial(trapDesatualizada);
assert.strictEqual(reconciliada.moradorNome, 'José Carlos enfermeiro', 'Deve recuperar morador oficial');
assert.strictEqual(reconciliada.rua, 'Ladeira João Alfredo', 'Deve recuperar rua oficial');
assert.strictEqual(reconciliada.numeroImovel, '70', 'Deve recuperar número predial oficial');
assert.strictEqual(reconciliada.quarteirao, 'Q-10', 'Deve substituir Q-Distrito por Q-10');
assert.strictEqual(reconciliada.ultimosOvos, 15, 'Deve preservar os ovos contados operacionalmente');
assert.strictEqual(reconciliada.palheta, '12B', 'Deve preservar a palheta operacional');
assert.strictEqual(reconciliada.status, 'analisada', 'Deve preservar o status');
console.log('✓ [TESTE 4] Função de reconciliação cadastral repara registros desatualizados e preserva operação!');

// 5. Teste de armadilha OV-23 (Pousada Valle do sol)
const ov23 = reconciliarArmadilhaComBaseOficial({ numero: '23' });
assert.strictEqual(ov23.moradorNome, 'Pousada Valle do sol');
assert.strictEqual(ov23.rua, 'Rua Manoel José de Moraes');
assert.strictEqual(ov23.numeroImovel, '51');
assert.strictEqual(ov23.quarteirao, 'Q-01');
assert.strictEqual(ov23.bairro, 'Progresso');
console.log('✓ [TESTE 5] OV-23 (Pousada Valle do sol) cadastrada com perfeição!');

// 6. Teste de armadilha OV-35 (Almir Lemgruber)
const ov35 = reconciliarArmadilhaComBaseOficial({ numero: '35' });
assert.strictEqual(ov35.moradorNome, 'Almir Lemgruber');
assert.strictEqual(ov35.rua, 'Rua Senador Dantas');
assert.strictEqual(ov35.numeroImovel, '200');
assert.strictEqual(ov35.quarteirao, 'Q-13');
assert.strictEqual(ov35.bairro, "Caixa d'Água");
console.log('✓ [TESTE 6] OV-35 (Almir Lemgruber) cadastrada com perfeição!');

// 7. Teste de armadilha OV-46 (Olívia)
const ov46 = reconciliarArmadilhaComBaseOficial({ numero: '46' });
assert.strictEqual(ov46.moradorNome, 'Olívia');
assert.strictEqual(ov46.rua, 'Rua Oscar Feuchard de Carvalho');
assert.strictEqual(ov46.numeroImovel, '145');
assert.strictEqual(ov46.quarteirao, 'Q-10');
assert.strictEqual(ov46.bairro, 'Porto Velho do Cunha');
console.log('✓ [TESTE 7] OV-46 (Olívia) cadastrada com perfeição!');

console.log('\n================================================================');
console.log('TODOS OS TESTES DE AUDITORIA CADASTRAL PASSARAM COM 100% SUCESSO!');
console.log('================================================================');
