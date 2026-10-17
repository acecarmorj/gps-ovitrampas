const fs = require('fs');
const readings = JSON.parse(fs.readFileSync('src/lib/readingsOficiaisCarmo.json', 'utf8'));
const traps = JSON.parse(fs.readFileSync('src/lib/trapsOficiaisCarmo.json', 'utf8'));

console.log('Total readings:', readings.length);

const readingsByTrap = {};
for (const r of readings) {
  const num = (r.numero_armadilha || '').toString().padStart(2, '0');
  if (!readingsByTrap[num]) readingsByTrap[num] = [];
  readingsByTrap[num].push(r);
}

console.log('Traps with readings in readingsOficiaisCarmo:', Object.keys(readingsByTrap).length);

let semA = 0;
let semB = 0;
for (let i = 1; i <= 56; i++) {
  const num = String(i).padStart(2, '0');
  const t = traps.find(x => (x.numero || '').toString().padStart(2, '0') === num);
  const rList = readingsByTrap[num] || [];
  const rA = rList.find(r => r.numero_palheta && r.numero_palheta.endsWith('A'));
  const rB = rList.find(r => r.numero_palheta && r.numero_palheta.endsWith('B'));
  if (!rA) semA++;
  if (!rB) semB++;
}
console.log(`Summary: Sem Palheta A: ${semA}, Sem Palheta B: ${semB}`);
