const fs = require('fs');

// We can test adapting traps
const traps = JSON.parse(fs.readFileSync('src/lib/trapsOficiaisCarmo.json', 'utf8'));
const readings = JSON.parse(fs.readFileSync('src/lib/readingsOficiaisCarmo.json', 'utf8'));

console.log('Traps count:', traps.length);
console.log('Readings count:', readings.length);
