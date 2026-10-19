-- Historico de campanhas anteriores (somente leitura), vindo do Conta Ovos.
-- Tabela SEPARADA de traps/readings: nao interfere em campo, laboratorio nem relatorios.
-- Sem nome de responsavel, rua ou numero de imovel (nao gravados na importacao).
-- Pontos de 2025 sao outros pontos fisicos que os de 2026, mesmo com o mesmo numero:
-- por isso guardam a propria latitude/longitude e NAO se ligam a tabela traps.

CREATE TABLE IF NOT EXISTS historical_readings (
  id TEXT PRIMARY KEY,
  campanha_id TEXT NOT NULL,
  numero_armadilha TEXT NOT NULL,
  ciclo_semana TEXT NOT NULL,          -- 'A' (1a semana) ou 'B' (2a semana)
  ano INTEGER NOT NULL,
  semana_epi INTEGER NOT NULL,
  ovos INTEGER NOT NULL DEFAULT 0,
  instalada_em TEXT NOT NULL,          -- AAAA-MM-DD (data de instalacao da palheta)
  coletada_em TEXT NOT NULL,           -- AAAA-MM-DD (data de coleta da palheta)
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  bairro TEXT,
  quarteirao TEXT,
  fonte TEXT NOT NULL DEFAULT 'contaovos',
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_hist_campanha ON historical_readings(campanha_id);
CREATE INDEX IF NOT EXISTS idx_hist_numero ON historical_readings(campanha_id, numero_armadilha);
