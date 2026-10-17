const fs = require('fs');

function enrichFile(path) {
  const list = JSON.parse(fs.readFileSync(path, 'utf8'));
  const updated = list.map((t) => {
    const morador = t.moradorNome || t.morador_nome || '';
    const numImovel = t.numeroImovel || t.numero_imovel || '';
    const ultOvos = t.ultimosOvos !== undefined ? t.ultimosOvos : (t.ultimos_ovos !== undefined ? t.ultimos_ovos : 0);
    const ultPalheta = t.ultimaPalheta || t.ultima_palheta || t.palheta || `${t.numero}A`;
    const ultLeitura = t.ultimaLeituraEm || t.ultima_leitura_em || null;

    return {
      ...t,
      moradorNome: morador,
      morador_nome: morador,
      numeroImovel: numImovel,
      numero_imovel: numImovel,
      ultimosOvos: ultOvos,
      ultimos_ovos: ultOvos,
      ultimaPalheta: ultPalheta,
      ultima_palheta: ultPalheta,
      ultimaLeituraEm: ultLeitura,
      ultima_leitura_em: ultLeitura,
      latitude: Number(t.latitude),
      longitude: Number(t.longitude)
    };
  });

  fs.writeFileSync(path, JSON.stringify(updated, null, 2), 'utf8');
  console.log(`Enriched ${path}: ${updated.length} traps.`);
}

enrichFile('src/lib/trapsOficiaisCarmo.json');
enrichFile('traps_clean_utf8.json');
