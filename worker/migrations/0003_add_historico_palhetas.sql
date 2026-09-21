-- Adiciona coluna de historico de trocas de palheta (JSON serializado).
-- Sem essa coluna, a troca salva local mas some no proximo poll de
-- /api/traps - o mesmo defeito que ja tinha acontecido com "observacoes"
-- (secao 58/59 do conversa.txt) antes de ganhar coluna propria.
ALTER TABLE traps ADD COLUMN historico_palhetas TEXT;
