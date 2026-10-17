UPDATE traps 
SET instalada_em = '2026-09-21T14:00:00.000Z',
    historico_palhetas = REPLACE(REPLACE(historico_palhetas, '2026-09-23T14:00:00.000Z', '2026-09-21T14:00:00.000Z'), '23/09 (Quarta)', '21/09 (Segunda)'),
    atualizada_em = datetime('now')
WHERE CAST(numero AS INTEGER) <= 35;

UPDATE traps 
SET instalada_em = '2026-09-22T14:00:00.000Z',
    historico_palhetas = REPLACE(REPLACE(historico_palhetas, '2026-09-24T14:00:00.000Z', '2026-09-22T14:00:00.000Z'), '24/09 (Quinta)', '22/09 (Terca)'),
    atualizada_em = datetime('now')
WHERE CAST(numero AS INTEGER) > 35;
