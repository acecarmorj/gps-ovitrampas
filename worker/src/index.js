// GPS OVITRAMPAS - Worker API
// Espelha o contrato ja consumido pelo front (src/lib/storage.js):
// POST /api/sync recebe { traps: [...], readings: [...] } no formato exato
// gerado por cadastrarArmadilha() / registrarLeituraLaboratorio() e grava no D1.
// Sem framework, roteamento manual (mesmo padrao do ESCADA/MOTOJA2IA).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
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
  return null;
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
       -- Nunca apaga resultado de laboratorio ja gravado: se o aparelho que
       -- esta enviando nao conhece a leitura (campo nulo), mantem o que o D1
       -- ja tem. Protege o caso do agente que ficou offline o dia todo e
       -- sincroniza depois do laboratorio ter lancado os ovos.
       ultimos_ovos = COALESCE(excluded.ultimos_ovos, traps.ultimos_ovos),
       ultima_palheta = COALESCE(excluded.ultima_palheta, traps.ultima_palheta),
       ultima_leitura_em = COALESCE(excluded.ultima_leitura_em, traps.ultima_leitura_em),
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
      if (path === "/api/traps" && request.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (!id) return badRequest("sem id da armadilha");
        await env.DB.prepare("DELETE FROM traps WHERE id = ?").bind(id).run();
        await env.DB.prepare("DELETE FROM readings WHERE armadilha_id = ?").bind(id).run();
        return json({ ok: true, deletedId: id });
      }
      if (path === "/api/traps/clear" && request.method === "POST") {
        await env.DB.prepare("DELETE FROM traps").run();
        await env.DB.prepare("DELETE FROM readings").run();
        return json({ ok: true, message: "Todas as armadilhas e leituras foram limpas." });
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
