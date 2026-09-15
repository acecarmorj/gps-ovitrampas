-- GPS OVITRAMPAS - schema espelhando o formato real usado no front (src/lib/storage.js)
-- id vem pronto do cliente (ex: "arm-1234567890-ab12", "leit-1234567890-cd34")

CREATE TABLE traps (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL,
  palheta TEXT,
  morador_nome TEXT,
  rua TEXT,
  numero_imovel TEXT,
  bairro TEXT,
  microarea TEXT,
  quarteirao TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  precisao_gps REAL,
  tem_foto INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'instalada',
  instalada_em TEXT NOT NULL,
  atualizada_em TEXT NOT NULL,
  ultimos_ovos INTEGER,
  ultima_palheta TEXT,
  ultima_leitura_em TEXT,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_traps_numero ON traps(numero);
CREATE INDEX idx_traps_status ON traps(status);

CREATE TABLE readings (
  id TEXT PRIMARY KEY,
  armadilha_id TEXT,
  numero_armadilha TEXT NOT NULL,
  numero_palheta TEXT,
  ovos INTEGER NOT NULL DEFAULT 0,
  positiva INTEGER NOT NULL DEFAULT 0,
  tecnico_nome TEXT,
  lida_em TEXT NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_readings_numero_armadilha ON readings(numero_armadilha);
CREATE INDEX idx_readings_armadilha_id ON readings(armadilha_id);
