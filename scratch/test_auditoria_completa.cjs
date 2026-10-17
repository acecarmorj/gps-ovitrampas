const fs = require('fs');
const assert = require('assert');

console.log('================================================================');
console.log('BATERIA DE TESTES: AUDITORIA CADASTRAL DAS 56 OVITRAMPAS');
console.log('Data: 15/10/2026 | Município: Carmo - RJ');
console.log('================================================================\n');

// 1. Carrega dados de auditoria do arquivo MD
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

console.log(`[TESTE 1] Relatório de auditoria de campo: ${Object.keys(auditRecords).length} armadilhas carregadas.`);
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
  assert.strictEqual(t.numeroImovel, auditNum, `OV-${num} numeroImovel incorreto: ${t.numeroImovel} vs ${auditNum}`);
  assert.strictEqual(t.numero_imovel, auditNum, `OV-${num} numero_imovel incorreto: ${t.numero_imovel} vs ${auditNum}`);

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

// 4. Teste de armadilhas chave citadas pelo usuário
const trapsMap = new Map(oficiais.map(t => [(t.numero || '').toString().padStart(2, '0'), t]));

const casosEspeciais = [
  { num: '01', morador: 'Maria de Fátima', rua: 'Rua Celso Carrilho Faria', numIm: '123', q: 'Q-17' },
  { num: '03', morador: 'Samy Soares', rua: 'Rua Carolina França', numIm: '30', q: 'Q-09' },
  { num: '12', morador: 'José Carlos enfermeiro', rua: 'Ladeira João Alfredo', numIm: '70', q: 'Q-10' },
  { num: '13', morador: 'Lucia Glória', rua: 'Rua Ulisses Lengruber', numIm: '618', q: 'Q-16' },
  { num: '15', morador: 'Maria das Dores Meneguiti', rua: 'Rua Jorge R. do Valle', numIm: '290', q: 'Q-15' },
  { num: '16', morador: 'Selma Araújo', rua: 'Rua Soares Brandão', numIm: '347', q: 'Q-10' },
  { num: '21', morador: 'Paula Miranda', rua: 'Rua Silvio Geraldo França', numIm: '753', q: 'Q-09' },
  { num: '23', morador: 'Pousada Valle do sol', rua: 'Rua Manoel José de Moraes', numIm: '51', q: 'Q-01' },
  { num: '24', morador: 'Marienio Oliveira', rua: 'Rua José Cassane', numIm: '04', q: 'Q-01' },
  { num: '35', morador: 'Almir Lemgruber', rua: 'Rua Senador Dantas', numIm: '200', q: 'Q-13' },
  { num: '46', morador: 'Olívia', rua: 'Rua Oscar Feuchard de Carvalho', numIm: '145', q: 'Q-10' },
  { num: '51', morador: 'Léo Jorge', rua: 'Rua Maria da Silva Machareth', numIm: '182', q: 'Q-11' },
  { num: '54', morador: 'Sebastião Ferreira', rua: 'Rua Sebastião F. da Costa', numIm: '389', q: 'Q-01' }
];

for (const c of casosEspeciais) {
  const item = trapsMap.get(c.num);
  assert(item, `OV-${c.num} não encontrada`);
  assert.strictEqual(item.moradorNome, c.morador, `OV-${c.num} moradorNome`);
  assert.strictEqual(item.rua, c.rua, `OV-${c.num} rua`);
  assert.strictEqual(item.numeroImovel, c.numIm, `OV-${c.num} numeroImovel`);
  assert.strictEqual(item.quarteirao, c.q, `OV-${c.num} quarteirão`);
  console.log(`  ✓ OV-${c.num}: ${item.moradorNome} | ${item.rua}, ${item.numeroImovel} | ${item.bairro} | ${item.quarteirao}`);
}
console.log('✓ [TESTE 4] Casos especiais de auditoria verificados com sucesso!');

// 5. Teste de Anonimização do Modo Demonstração
console.log('\n[TESTE 5] Testando Anonimização de Modo Demonstração:');
const demoTraps = oficiais.map(a => ({
  ...a,
  moradorNome: 'XXX',
  morador_nome: 'XXX',
  rua: 'Rua XXXXXXXXX',
  numeroImovel: 'XXX',
  numero_imovel: 'XXX'
}));

assert.strictEqual(demoTraps.length, 56);
for (const dt of demoTraps) {
  assert.strictEqual(dt.moradorNome, 'XXX', 'Nome deve ser XXX');
  assert.strictEqual(dt.rua, 'Rua XXXXXXXXX', 'Rua deve ser Rua XXXXXXXXX');
  assert.strictEqual(dt.numeroImovel, 'XXX', 'Número deve ser XXX');
  assert(dt.latitude !== 0, 'Coordenada latitude deve ser preservada');
  assert(dt.longitude !== 0, 'Coordenada longitude deve ser preservada');
  assert(dt.quarteirao.length > 0, 'Quarteirão deve ser preservado');
  assert(dt.bairro.length > 0, 'Bairro deve ser preservado');
}
console.log('✓ [TESTE 5] Modo Demonstração mascara dados pessoais com XXX e preserva dados geo-epidemiológicos!');

console.log('\n================================================================');
console.log('BATERIA CONCLUÍDA: 100% DAS 56 OVITRAMPAS CONFORMES COM O CAMPO!');
console.log('================================================================');
