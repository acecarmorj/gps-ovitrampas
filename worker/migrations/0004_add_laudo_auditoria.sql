-- Guarda como a contagem de ovos foi feita (app, conferencia da IA por
-- quadros, correcoes a mao) - JSON serializado. Antes o laboratorio mandava
-- esses dados e eles eram descartados antes mesmo de chegar ao servidor.
ALTER TABLE readings ADD COLUMN laudo_auditoria TEXT;
