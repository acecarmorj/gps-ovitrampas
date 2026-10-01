// GPS OVITRAMPAS - Worker API
// Espelha o contrato ja consumido pelo front (src/lib/storage.js):
// POST /api/sync recebe { traps: [...], readings: [...] } no formato exato
// gerado por cadastrarArmadilha() / registrarLeituraLaboratorio() e grava no D1.
// Sem framework, roteamento manual (mesmo padrao do ESCADA/MOTOJA2IA).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Team-Key",
};

// ---- Privacidade: nome do morador, rua e numero do imovel so para a equipe ----
// A chave fica como segredo do Worker (TEAM_KEY), nunca no codigo. Sem chave valida
// o servidor devolve esses 3 campos vazios. Sem TEAM_KEY configurada, ninguem e equipe.
function equipeAutorizada(request, env) {
  const esperada = env.TEAM_KEY;
  const recebida = request.headers.get("X-Team-Key") || "";
  if (!esperada || recebida.length === 0 || recebida.length !== esperada.length) return false;
  let diferenca = 0;
  for (let i = 0; i < esperada.length; i++) diferenca |= esperada.charCodeAt(i) ^ recebida.charCodeAt(i);
  return diferenca === 0;
}

function semDadosDeMorador(trap) {
  // observacoes tambem: o campo livre costuma ter nome/referencia de morador ("casa da Dona X")
  return { ...trap, morador_nome: null, rua: null, numero_imovel: null, observacoes: null };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function badRequest(message) {
  return json({ error: "bad_request", message }, 400);
}

function agoraIso() {
  return new Date().toISOString();
}

// Valida o minimo para o registro poder ser gravado. Devolve o motivo da
// recusa (string) ou null se estiver ok. O motivo volta pro aparelho para o
// registro continuar pendente em vez de sumir silenciosamente.
function motivoRecusaTrap(trap) {
  if (!trap || typeof trap !== "object") return "registro vazio";
  if (!trap.id) return "sem id";
  if (trap.numero == null || String(trap.numero).trim() === "") return "sem numero da ovitrampa";
  // Number(null) e Number("") viram 0, que passa em Number.isFinite() -
  // sem essa checagem explicita, uma armadilha sem GPS era aceita como
  // latitude=0/longitude=0 (golfo da Guine) em vez de recusada.
  if (trap.latitude == null || trap.longitude == null || trap.latitude === "" || trap.longitude === "") {
    return "sem coordenadas GPS validas";
  }
  if (!Number.isFinite(Number(trap.latitude)) || !Number.isFinite(Number(trap.longitude))) {
    return "sem coordenadas GPS validas";
  }
  return null;
}

function motivoRecusaReading(reading) {
  if (!reading || typeof reading !== "object") return "registro vazio";
  if (!reading.id) return "sem id";
  if (reading.numeroArmadilha == null || String(reading.numeroArmadilha).trim() === "") {
    return "sem numero da ovitrampa";
  }
  // Mesma protecao que ja existe pro lado das armadilhas (ver upsertTrap):
  // data undefined faz o bind() do D1 lancar e o item cai em recusado pra
  // sempre, tentativa apos tentativa, sem nunca sincronizar.
  if (!reading.lidaEm) return "sem data da leitura";
  return null;
}

async function upsertTrap(trap, env) {
  await env.DB.prepare(
    `INSERT INTO traps (
       id, numero, palheta, morador_nome, rua, numero_imovel, bairro, microarea,
       quarteirao, latitude, longitude, precisao_gps, tem_foto, status,
       instalada_em, atualizada_em, ultimos_ovos, ultima_palheta, ultima_leitura_em,
       observacoes, historico_palhetas, synced_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       numero = excluded.numero,
       palheta = excluded.palheta,
       -- Aparelho sem a chave da equipe recebe esses campos vazios e os devolve vazios no
       -- proximo sync: vazio NUNCA pode apagar o que ja esta gravado.
       morador_nome = COALESCE(NULLIF(excluded.morador_nome, ''), traps.morador_nome),
       rua = COALESCE(NULLIF(excluded.rua, ''), traps.rua),
       numero_imovel = COALESCE(NULLIF(excluded.numero_imovel, ''), traps.numero_imovel),
       bairro = excluded.bairro,
       microarea = excluded.microarea,
       quarteirao = excluded.quarteirao,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       precisao_gps = excluded.precisao_gps,
       tem_foto = excluded.tem_foto,
       status = excluded.status,
       instalada_em = COALESCE(excluded.instalada_em, traps.instalada_em),
       atualizada_em = excluded.atualizada_em,
       -- Se a palheta foi trocada e voltou para 'instalada', inicia novo ciclo (zera ultimos_ovos da trap)
       -- Leituras anteriores continuam permanentemente salvas na tabela 'readings'.
       ultimos_ovos = CASE 
         WHEN excluded.palheta != traps.palheta AND excluded.status = 'instalada' THEN NULL 
         ELSE COALESCE(excluded.ultimos_ovos, traps.ultimos_ovos) 
       END,
       ultima_palheta = COALESCE(excluded.ultima_palheta, traps.ultima_palheta),
       ultima_leitura_em = CASE 
         WHEN excluded.palheta != traps.palheta AND excluded.status = 'instalada' THEN NULL 
         ELSE COALESCE(excluded.ultima_leitura_em, traps.ultima_leitura_em) 
       END,
       observacoes = COALESCE(excluded.observacoes, traps.observacoes),
       -- Mesmo raciocinio do observacoes: o aparelho do agente de campo
       -- nunca manda historico de troca (so o admin troca palheta). Sem o
       -- COALESCE, o proximo sync do agente reenviando essa armadilha
       -- apagaria o historico com null.
       historico_palhetas = COALESCE(excluded.historico_palhetas, traps.historico_palhetas),
       synced_at = datetime('now')
     -- So aceita a versao que chegou se ela for igual ou mais nova que a
     -- gravada. Versao atrasada e ignorada (sem erro) em vez de regredir o
     -- registro.
     WHERE excluded.atualizada_em >= traps.atualizada_em`
  )
    .bind(
      trap.id,
      trap.numero,
      trap.palheta ?? null,
      trap.moradorNome ?? null,
      trap.rua ?? null,
      trap.numeroImovel ?? null,
      trap.bairro ?? null,
      trap.microarea ?? null,
      trap.quarteirao ?? null,
      Number(trap.latitude),
      Number(trap.longitude),
      trap.precisaoGps != null ? Number(trap.precisaoGps) : null,
      trap.temFoto ? 1 : 0,
      trap.status ?? "instalada",
      // Datas nunca podem ser undefined: bind() do D1 lanca e derruba o lote
      // inteiro, travando a fila do agente para sempre.
      trap.instaladaEm ?? agoraIso(),
      trap.atualizadaEm ?? trap.instaladaEm ?? agoraIso(),
      trap.ultimosOvos != null ? Number(trap.ultimosOvos) : null,
      trap.ultimaPalheta ?? null,
      trap.ultimaLeituraEm ?? null,
      trap.observacoes ?? null,
      // Lista de trocas de palheta serializada em JSON (coluna e TEXT).
      // Vazio/ausente vira null, nao "[]" - assim o COALESCE acima nao
      // sobrescreve um historico ja existente com uma lista vazia.
      Array.isArray(trap.historicoPalhetas) && trap.historicoPalhetas.length > 0
        ? JSON.stringify(trap.historicoPalhetas)
        : null
    )
    .run();
}

async function upsertReading(reading, env) {
  await env.DB.prepare(
    `INSERT INTO readings (
       id, armadilha_id, numero_armadilha, numero_palheta, ovos, positiva,
       tecnico_nome, lida_em, laudo_auditoria, synced_at
     ) VALUES (?,?,?,?,?,?,?,?,?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       armadilha_id = excluded.armadilha_id,
       numero_armadilha = excluded.numero_armadilha,
       numero_palheta = excluded.numero_palheta,
       ovos = excluded.ovos,
       positiva = excluded.positiva,
       -- o nome padrao "Laboratório Carmo" (aparelho sem login) nunca apaga o nome de quem lancou
       tecnico_nome = CASE
         WHEN excluded.tecnico_nome IS NULL OR excluded.tecnico_nome IN ('', 'Laboratório Carmo') THEN readings.tecnico_nome
         ELSE excluded.tecnico_nome
       END,
       lida_em = excluded.lida_em,
       laudo_auditoria = COALESCE(excluded.laudo_auditoria, readings.laudo_auditoria),
       synced_at = datetime('now')`
  )
    .bind(
      reading.id,
      reading.armadilhaId ?? null,
      reading.numeroArmadilha,
      reading.numeroPalheta ?? null,
      Number(reading.ovos ?? 0),
      reading.positiva ? 1 : 0,
      reading.tecnicoNome ?? null,
      reading.lidaEm,
      reading.laudoAuditoria ? JSON.stringify(reading.laudoAuditoria) : null
    )
    .run();

  // Garante que a tabela 'traps' mantenha consistencia imediata com a leitura registrada
  try {
    await env.DB.prepare(
      `UPDATE traps SET
         status = CASE 
           WHEN palheta = ? OR palheta IS NULL THEN 'analisada'
           ELSE status
         END,
         ultimos_ovos = ?,
         ultima_palheta = COALESCE(?, ultima_palheta, palheta),
         ultima_leitura_em = ?,
         atualizada_em = datetime('now'),
         synced_at = datetime('now')
       WHERE id = ? OR numero = ?`
    )
      .bind(
        reading.numeroPalheta ?? null,
        Number(reading.ovos ?? 0),
        reading.numeroPalheta ?? null,
        reading.lidaEm ?? agoraIso(),
        reading.armadilhaId ?? '',
        String(reading.numeroArmadilha)
      )
      .run();
  } catch (err) {
    console.warn('[worker] Falha ao atualizar traps a partir de leitura:', err);
  }
}

async function handleSync(request, env) {
  // Gravar leituras e armadilhas exige o Acesso da equipe. Sem isso qualquer pessoa que conhecesse o endereco
  // do servidor poderia falsificar leituras ou sobrescrever armadilhas (auditoria do Gemini, achado 1).
  if (!equipeAutorizada(request, env)) {
    return json(
      { error: "equipe_necessaria", message: "Ative o Acesso da equipe neste aparelho para sincronizar. Os dados continuam salvos no aparelho." },
      401
    );
  }
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("json invalido");

  const traps = Array.isArray(body.traps) ? body.traps : [];
  const readings = Array.isArray(body.readings) ? body.readings : [];

  // Responde com a lista EXATA do que foi gravado. O aparelho so pode marcar
  // como sincronizado aquilo que o servidor confirmou - antes a resposta era
  // sempre {ok:true} mesmo descartando itens, e o registro descartado sumia
  // do aparelho no proximo poll (dado perdido de vez).
  const trapsAceitos = [];
  const trapsRecusados = [];
  const readingsAceitos = [];
  const readingsRecusados = [];

  for (const trap of traps) {
    const motivo = motivoRecusaTrap(trap);
    if (motivo) {
      trapsRecusados.push({ id: trap?.id ?? null, motivo });
      continue;
    }
    // Falha de um item nao pode derrubar o lote inteiro: sem isso, um unico
    // registro problematico trava a fila do agente para sempre.
    try {
      await upsertTrap(trap, env);
      trapsAceitos.push(trap.id);
    } catch (err) {
      trapsRecusados.push({ id: trap.id, motivo: String(err?.message || err) });
    }
  }

  for (const reading of readings) {
    const motivo = motivoRecusaReading(reading);
    if (motivo) {
      readingsRecusados.push({ id: reading?.id ?? null, motivo });
      continue;
    }
    try {
      await upsertReading(reading, env);
      readingsAceitos.push(reading.id);
    } catch (err) {
      readingsRecusados.push({ id: reading.id, motivo: String(err?.message || err) });
    }
  }

  return json({
    ok: true,
    trapsAceitos,
    trapsRecusados,
    readingsAceitos,
    readingsRecusados,
    traps: trapsAceitos.length,
    readings: readingsAceitos.length
  });
}

async function listTraps(request, env) {
  const { results } = await env.DB.prepare("SELECT * FROM traps ORDER BY instalada_em DESC").all();
  return json({ traps: equipeAutorizada(request, env) ? results : results.map(semDadosDeMorador) });
}

async function listReadings(request, env) {
  const url = new URL(request.url);
  const numeroArmadilha = url.searchParams.get("numero_armadilha");
  let query = "SELECT * FROM readings";
  const params = [];
  if (numeroArmadilha) {
    query += " WHERE numero_armadilha = ?";
    params.push(numeroArmadilha);
  }
  query += " ORDER BY lida_em DESC";
  const { results } = await env.DB.prepare(query).bind(...params).all();
  return json({ readings: results });
}


async function handleAgentHeartbeat(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("json invalido");
  const { agentId, deviceId, label, latitude, longitude, accuracy, bairro } = body;
  if (!agentId || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return badRequest("dados de localizacao do agente invalidos");
  }

  const agentLabel = label || agentId.toUpperCase();

  await env.DB.prepare(
    `INSERT INTO agent_locations (
       agent_id, device_id, label, latitude, longitude, accuracy, bairro, updated_at
     ) VALUES (?,?,?,?,?,?,?, datetime('now'))
     ON CONFLICT(agent_id) DO UPDATE SET
       device_id = excluded.device_id,
       label = excluded.label,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       accuracy = excluded.accuracy,
       bairro = excluded.bairro,
       updated_at = datetime('now')`
  ).bind(
    agentId,
    deviceId ?? null,
    agentLabel,
    Number(latitude),
    Number(longitude),
    accuracy != null ? Number(accuracy) : null,
    bairro ?? null
  ).run();

  // Limpeza de agentes inativos há mais de 1 hora
  try {
    await env.DB.prepare("DELETE FROM agent_locations WHERE updated_at < datetime('now', '-60 minutes')").run();
  } catch (e) {}

  return json({ ok: true, agentId, label: agentLabel });
}

async function listActiveAgents(env) {
  const { results } = await env.DB.prepare(
    `SELECT agent_id as agentId, device_id as deviceId, label, latitude, longitude, accuracy, bairro, updated_at as updatedAt
     FROM agent_locations
     WHERE updated_at >= datetime('now', '-15 minutes')
     ORDER BY label ASC`
  ).all();
  return json({ agents: results || [] });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/agents/heartbeat" && request.method === "POST") {
        return await handleAgentHeartbeat(request, env);
      }
      if (path === "/api/agents/locations" && request.method === "GET") {
        return await listActiveAgents(env);
      }
      if (path === "/api/auth/check") {
        return json({ equipe: equipeAutorizada(request, env) });
      }
      if (path === "/api/health") {
        return json({ ok: true, service: "ovitrampas-api" });
      }
      if (path === "/api/sync" && request.method === "POST") {
        return await handleSync(request, env);
      }
      if (path === "/api/traps" && request.method === "GET") {
        return await listTraps(request, env);
      }
      if (path === "/api/traps" && request.method === "DELETE") {
        // BANCO OFICIAL PROTEGIDO: exclusão desativada para botões aparentes ou chamadas externas
        return json({
          error: "forbidden",
          message: "Operação bloqueada: o banco agora é oficial e não pode ser apagado por botões aparentes. Apenas comandos diretos do Almir/Claude são permitidos."
        }, 403);
      }
      if (path === "/api/traps/clear" && request.method === "POST") {
        // BANCO OFICIAL PROTEGIDO: zeramento bloqueado permanentemente
        return json({
          error: "forbidden",
          message: "Operação bloqueada: o banco agora é oficial e não pode ser zerado. Apenas comandos diretos do Almir/Claude via console são permitidos."
        }, 403);
      }
      if (path === "/api/public/dados-territoriais" && request.method === "GET") {
        // Rota pública 100% anônima e agregada: NUNCA expõe nome de morador, rua ou GPS exato
        const { results: traps } = await env.DB.prepare(
          "SELECT bairro, microarea, quarteirao, status, ultimos_ovos, ultima_palheta FROM traps"
        ).all();

        const mapaBairros = {};
        for (const t of (traps || [])) {
          const nomeBairro = (t.bairro || 'Outros').trim();
          if (!mapaBairros[nomeBairro]) {
            mapaBairros[nomeBairro] = {
              bairro: nomeBairro,
              totalArmadilhas: 0,
              lidas: 0,
              positivas: 0,
              totalOvos: 0
            };
          }
          const b = mapaBairros[nomeBairro];
          b.totalArmadilhas += 1;
          const ovos = t.ultimos_ovos;
          if (ovos != null && ovos !== undefined) {
            b.lidas += 1;
            const qtd = Number(ovos);
            b.totalOvos += qtd;
            if (qtd > 0) b.positivas += 1;
          }
        }

        const dadosAgregados = Object.values(mapaBairros).map((b) => {
          const ipo = b.lidas > 0 ? (b.positivas / b.lidas) * 100 : 0;
          const ido = b.positivas > 0 ? b.totalOvos / b.positivas : 0;
          let nivelRisco = 'Baixo';
          if (b.totalOvos > 100 || ipo > 60) nivelRisco = 'Crítico';
          else if (b.totalOvos > 50 || ipo > 40) nivelRisco = 'Alto';
          else if (b.totalOvos > 20 || ipo > 20) nivelRisco = 'Médio';
          return {
            ...b,
            ipo: Number(ipo.toFixed(1)),
            ido: Number(ido.toFixed(1)),
            nivelRisco
          };
        });

        return json({
          municipio: "Carmo - RJ",
          dataHora: agoraIso(),
          totalArmadilhas: (traps || []).length,
          bairros: dadosAgregados
        });
      }
      if (path === "/api/readings" && request.method === "GET") {
        return await listReadings(request, env);
      }
      return json({ error: "not_found" }, 404);
    } catch (err) {
      return json({ error: "internal_error", message: String(err?.message || err) }, 500);
    }
  },
};
