-- Adiciona coluna de observacoes livres da armadilha (editada pelo admin).
-- Sem essa coluna, o campo era aceito no payload de sync e descartado em
-- silencio pelo upsertTrap - o proximo poll de /api/traps sobrescrevia o
-- registro local sem a observacao, fazendo o texto sumir da tela sozinho.
ALTER TABLE traps ADD COLUMN observacoes TEXT;
