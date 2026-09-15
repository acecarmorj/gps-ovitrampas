// GPS OVITRAMPAS - Worker API
// Espelha o contrato ja consumido pelo front (src/lib/storage.js):
// POST /api/sync recebe { traps: [...], readings: [...] } no formato exato
// gerado por cadastrarArmadilha() / registrarLeituraLaboratorio() e grava no D1.
// Sem framework, roteamento manual (mesmo padrao do ESCADA/MOTOJA2IA).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function badRequest(message) {
  return json({ error: "bad_request", message }, 400);
}

async function upsertTrap(trap, env) {
  await env.DB.prepare(
    `INSERT INTO traps (
       id, numero, palheta, morador_nome, rua, numero_imovel, bairro, microarea,
       quarteirao, latitude, longitude, precisao_gps, tem_foto, status,
       instalada_em, atualizada_em, ultimos_ovos, ultima_palheta, ultima_leitura_em,
       synced_at
     ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       numero = excluded.numero,
       palheta = excluded.palheta,
       morador_nome = excluded.morador_nome,
       rua = excluded.rua,
       numero_imovel = excluded.numero_imovel,
       bairro = excluded.bairro,
       microarea = excluded.microarea,
       quarteirao = excluded.quarteirao,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       precisao_gps = excluded.precisao_gps,
       tem_foto = excluded.tem_foto,
       status = excluded.status,
       atualizada_em = excluded.atualizada_em,
       ultimos_ovos = excluded.ultimos_ovos,
       ultima_palheta = excluded.ultima_palheta,
       ultima_leitura_em = excluded.ultima_leitura_em,
       synced_at = datetime('now')`
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
      trap.instaladaEm,
      trap.atualizadaEm ?? trap.instaladaEm,
      trap.ultimosOvos != null ? Number(trap.ultimosOvos) : null,
      trap.ultimaPalheta ?? null,
      trap.ultimaLeituraEm ?? null
    )
    .run();
}

async function upsertReading(reading, env) {
  await env.DB.prepare(
    `INSERT INTO readings (
       id, armadilha_id, numero_armadilha, numero_palheta, ovos, positiva,
       tecnico_nome, lida_em, synced_at
     ) VALUES (?,?,?,?,?,?,?,?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       armadilha_id = excluded.armadilha_id,
       numero_armadilha = excluded.numero_armadilha,
       numero_palheta = excluded.numero_palheta,
       ovos = excluded.ovos,
       positiva = excluded.positiva,
       tecnico_nome = excluded.tecnico_nome,
       lida_em = excluded.lida_em,
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
      reading.lidaEm
    )
    .run();
}

async function handleSync(request, env) {
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("json invalido");

  const traps = Array.isArray(body.traps) ? body.traps : [];
  const readings = Array.isArray(body.readings) ? body.readings : [];

  let trapsSalvos = 0;
  let readingsSalvos = 0;

  for (const trap of traps) {
    if (!trap.id || !trap.numero || trap.latitude == null || trap.longitude == null) continue;
    await upsertTrap(trap, env);
    trapsSalvos++;
  }

  for (const reading of readings) {
    if (!reading.id || !reading.numeroArmadilha) continue;
    await upsertReading(reading, env);
    readingsSalvos++;
  }

  return json({ ok: true, traps: trapsSalvos, readings: readingsSalvos });
}

async function listTraps(env) {
  const { results } = await env.DB.prepare("SELECT * FROM traps ORDER BY instalada_em DESC").all();
  return json({ traps: results });
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

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === "/api/health") {
        return json({ ok: true, service: "ovitrampas-api" });
      }
      if (path === "/api/sync" && request.method === "POST") {
        return await handleSync(request, env);
      }
      if (path === "/api/traps" && request.method === "GET") {
        return await listTraps(env);
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
