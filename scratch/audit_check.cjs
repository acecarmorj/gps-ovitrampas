const fs = require('fs');

const md = fs.readFileSync('RELATORIO_AUDITORIA_ENDERECOS_CAMPO.md', 'utf8');
const oficiais = JSON.parse(fs.readFileSync('src/lib/trapsOficiaisCarmo.json', 'utf8'));
let trapsClean = null;
if (fs.existsSync('traps_clean_utf8.json')) {
  trapsClean = JSON.parse(fs.readFileSync('traps_clean_utf8.json', 'utf8'));
}

const lines = md.split('\n');
const auditData = {};
for (const line of lines) {
  if (line.trim().startsWith('| OV-')) {
    const parts = line.split('|').map(s => s.trim()).filter(Boolean);
    const ovNum = parts[0].replace('OV-', '');
    const coordsStr = parts[5].replace(/`/g, '');
    const [lat, lng] = coordsStr.split(',').map(s => parseFloat(s.trim()));
    auditData[ovNum] = {
      morador: parts[1],
      logradouro: parts[2],
      bairro: parts[3],
      quarteirao: parts[4],
      lat,
      lng
    };
  }
}

console.log(`Parsed ${Object.keys(auditData).length} traps from audit report.`);

function compare(list, name) {
  console.log(`\n--- Checking ${name} (total ${list.length}) ---`);
  let diffCount = 0;
  for (const trap of list) {
    const num = (trap.numero || '').toString().padStart(2, '0');
    const audit = auditData[num];
    if (!audit) {
      console.log(`[${num}] Missing in audit!`);
      diffCount++;
      continue;
    }

    const issues = [];
    if (trap.morador_nome !== audit.morador) {
      issues.push(`morador_nome: "${trap.morador_nome}" vs "${audit.morador}"`);
    }
    if (trap.moradorNome !== audit.morador) {
      issues.push(`moradorNome: "${trap.moradorNome}" vs "${audit.morador}"`);
    }
    if (trap.quarteirao !== audit.quarteirao) {
      issues.push(`quarteirao: "${trap.quarteirao}" vs "${audit.quarteirao}"`);
    }
    if (trap.bairro !== audit.bairro) {
      issues.push(`bairro: "${trap.bairro}" vs "${audit.bairro}"`);
    }

    const parsedLog = audit.logradouro.split(', ');
    const expectedRua = parsedLog[0];
    const expectedNum = parsedLog.slice(1).join(', ');

    if (trap.rua !== expectedRua) {
      issues.push(`rua: "${trap.rua}" vs "${expectedRua}"`);
    }
    if ((trap.numeroImovel || trap.numero_imovel) !== expectedNum) {
      issues.push(`numImovel: "${trap.numeroImovel || trap.numero_imovel}" vs "${expectedNum}"`);
    }
    if (Math.abs(trap.latitude - audit.lat) > 0.0001) {
      issues.push(`lat: ${trap.latitude} vs ${audit.lat}`);
    }
    if (Math.abs(trap.longitude - audit.lng) > 0.0001) {
      issues.push(`lng: ${trap.longitude} vs ${audit.lng}`);
    }

    if (issues.length > 0) {
      console.log(`OV-${num}: ${issues.join(' | ')}`);
      diffCount++;
    }
  }
  console.log(`Total differences in ${name}: ${diffCount}`);
}

compare(oficiais, 'src/lib/trapsOficiaisCarmo.json');
if (trapsClean) {
  compare(trapsClean, 'traps_clean_utf8.json');
}
