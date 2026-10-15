/**
 * Módulo de Integração com a API do Conta Ovos (https://contaovos.com)
 * 
 * Funcionalidades:
 * - Gerenciamento e validação da Chave de API (token de 45 caracteres)
 * - Teste de conexão (endpoints públicos e autenticados)
 * - Consulta de contagens e armadilhas (modo público e privado)
 * - Envio e atualização de armadilhas e leituras entomológicas
 * - Geração de carga em lote (JSON e CSV) compatível com o Conta Ovos
 */

// URL base oficial da API do Conta Ovos
export const CONTA_OVOS_BASE_URL = 'https://contaovos.com';

// Chave para persistência local no navegador
const STORAGE_API_KEY = 'ovitrampas_conta_ovos_api_key';

/**
 * Tabela oficial de observações de campo do Conta Ovos (counting_observation_id)
 */
export const OBSERVATION_CODES = {
  1: 'Sem observações',
  2: 'Intervalo entre instalação e coleta maior que o previsto',
  3: 'Ovitrampa ou paleta desaparecida',
  4: 'Ovitrampa ou paleta quebrada',
  5: 'Ovitrampa ou paleta removida',
  6: 'Ovitrampa seca',
  7: 'Casa fechada',
  8: 'Ovitrampa cheia de água',
  9: 'Ovitrampa com pouca água',
  10: 'Outra observação'
};

/**
 * Tipo de ovitrampa (ovitrap_type_id)
 */
export const OVITRAP_TYPES = {
  URBANA: 1, // Padrão
  RURAL: 2
};

/* ==========================================================================
   GERENCIAMENTO DA CHAVE DE API
   ========================================================================== */

/**
 * Obtém a chave de API do Conta Ovos configurada
 */
export function getContaOvosApiKey() {
  if (typeof window !== 'undefined' && window.localStorage) {
    const key = window.localStorage.getItem(STORAGE_API_KEY);
    if (key && key.trim()) return key.trim();
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CONTA_OVOS_API_KEY) {
    return import.meta.env.VITE_CONTA_OVOS_API_KEY.trim();
  }
  return '';
}

/**
 * Salva a chave de API no localStorage
 */
export function setContaOvosApiKey(chave) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const limpa = String(chave || '').trim();
  if (limpa) {
    window.localStorage.setItem(STORAGE_API_KEY, limpa);
  } else {
    window.localStorage.removeItem(STORAGE_API_KEY);
  }
}

/**
 * Remove a chave de API salva
 */
export function removerContaOvosApiKey() {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_API_KEY);
  }
}

/**
 * Valida o formato da chave de API do Conta Ovos.
 * A chave do Conta Ovos é composta por exatamente 45 caracteres alfanuméricos.
 */
export function validarFormatoChave(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { valido: false, motivo: 'Chave não informada' };
  }
  const limpa = apiKey.trim();
  if (limpa.length !== 45) {
    return {
      valido: false,
      motivo: `Comprimento inválido (${limpa.length}/45 caracteres). A chave oficial do Conta Ovos possui exatamente 45 caracteres.`
    };
  }
  if (!/^[a-zA-Z0-9]+$/.test(limpa)) {
    return {
      valido: false,
      motivo: 'Formato inválido. A chave deve conter apenas caracteres alfanuméricos.'
    };
  }
  return { valido: true, motivo: 'Formato válido' };
}

/* ==========================================================================
   UTILITÁRIOS DE FORMATAÇÃO E NORMALIZAÇÃO
   ========================================================================== */

/**
 * Formata qualquer data para o padrão estrito exigido pela API: YYYY-MM-DD
 */
export function formatarDataIso(data) {
  if (!data) return '';
  if (typeof data === 'string') {
    // Se já estiver em YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
    // Se for ISO string (ex: 2026-09-25T16:51:56.729Z)
    if (data.includes('T')) return data.split('T')[0];
    // Se for formato brasileiro DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      const [d, m, y] = data.split('/');
      return `${y}-${m}-${d}`;
    }
  }
  try {
    const d = new Date(data);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

/**
 * Normaliza o identificador da ovitrampa para o padrão Conta Ovos (número limpo)
 * Exemplos: "ARM-02" -> "02", "OV-56" -> "56", " 49 " -> "49"
 */
export function normalizarIdArmadilha(numero) {
  if (numero === undefined || numero === null) return '';
  return String(numero).trim().replace(/^(ARM|OV|PL)[-_ ]*/i, '').trim();
}

/**
 * Mapeia texto de observação para o ID oficial do Conta Ovos
 */
export function mapearObservacao(textoObs) {
  if (!textoObs || !String(textoObs).trim()) {
    return { id: 1, descricao: '' };
  }
  const t = String(textoObs).toLowerCase();
  if (t.includes('desaparecid') || t.includes('sumiu') || t.includes('perdid')) return { id: 3, descricao: textoObs };
  if (t.includes('quebrad') || t.includes('danificad')) return { id: 4, descricao: textoObs };
  if (t.includes('removid') || t.includes('retirad')) return { id: 5, descricao: textoObs };
  if (t.includes('seca') || t.includes('sem água')) return { id: 6, descricao: textoObs };
  if (t.includes('fechad') || t.includes('ausente') || t.includes('recusa')) return { id: 7, descricao: textoObs };
  if (t.includes('cheia de água') || t.includes('transbord')) return { id: 8, descricao: textoObs };
  if (t.includes('pouca água')) return { id: 9, descricao: textoObs };
  if (t.includes('atraso') || t.includes('maior que o previsto')) return { id: 2, descricao: textoObs };
  return { id: 10, descricao: textoObs };
}

/* ==========================================================================
   FUNÇÕES DE COMUNICAÇÃO COM A API DO CONTA OVOS
   ========================================================================== */

/**
 * 1. Testar conexão com a API do Conta Ovos
 * 
 * Se a apiKey for informada, valida a autenticação chamando o endpoint privado /api/lastcounting.
 * Se a apiKey não for informada, testa o endpoint público /api/lastcountingpublic do município informado.
 * 
 * @param {string} apiKey - Chave de 45 caracteres (opcional se quiser testar apenas modo público)
 * @param {string} municipio - Nome do município para teste (padrão: "Carmo")
 * @returns {Promise<Object>} Resultado detalhado do teste
 */
export async function testarConexaoContaOvos(apiKey = '', municipio = 'Carmo') {
  const chave = apiKey?.trim() || getContaOvosApiKey();
  const temChave = Boolean(chave);

  if (temChave) {
    const validacao = validarFormatoChave(chave);
    if (!validacao.valido) {
      return {
        sucesso: false,
        autenticado: false,
        status: 400,
        mensagem: `Formato de chave inválido: ${validacao.motivo}`,
        detalhes: validacao
      };
    }
  }

  try {
    if (temChave) {
      // Teste autenticado no endpoint privado
      const url = `${CONTA_OVOS_BASE_URL}/api/lastcounting?page=1&key=${encodeURIComponent(chave)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${chave}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const dados = await response.json();
        return {
          sucesso: true,
          autenticado: true,
          status: response.status,
          mensagem: 'Conexão autenticada estabelecida com sucesso com o Conta Ovos!',
          escopo: 'Privado (Municipal/Regional/Estadual)',
          totalRegistros: Array.isArray(dados) ? dados.length : 0,
          amostra: Array.isArray(dados) && dados.length > 0 ? dados[0] : null
        };
      }

      if (response.status === 404) {
        return {
          sucesso: false,
          autenticado: false,
          status: 404,
          mensagem: 'Chave de API inválida ou revogada ("Wrong key"). Solicite ao gestor municipal no painel contaovos.com.',
          dica: 'O gestor municipal deve acessar seu perfil em contaovos.com e clicar em "Solicitar chave de API".'
        };
      }

      if (response.status === 403) {
        return {
          sucesso: false,
          autenticado: false,
          status: 403,
          mensagem: 'Acesso negado: a chave não tem permissão para este escopo geográfico.',
          dica: 'Verifique se a chave gerada pertence ao município correto.'
        };
      }

      return {
        sucesso: false,
        autenticado: false,
        status: response.status,
        mensagem: `O servidor retornou status HTTP ${response.status}.`
      };
    } else {
      // Teste público sem autenticação
      const url = `${CONTA_OVOS_BASE_URL}/api/lastcountingpublic?municipality=${encodeURIComponent(municipio)}&state=RJ`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const dados = await response.json();
        return {
          sucesso: true,
          autenticado: false,
          status: 200,
          mensagem: `Servidor Conta Ovos online! Foram encontrados ${dados.length} registros públicos para ${municipio}/RJ. Para enviar e editar armadilhas, cadastre a Chave de API de 45 caracteres.`,
          totalRegistros: dados.length,
          amostra: dados.length > 0 ? dados[0] : null
        };
      }

      return {
        sucesso: false,
        autenticado: false,
        status: response.status,
        mensagem: `Falha ao conectar no endpoint público do Conta Ovos (HTTP ${response.status}).`
      };
    }
  } catch (error) {
    return {
      sucesso: false,
      autenticado: false,
      status: 0,
      mensagem: `Erro de rede ou conexão com contaovos.com: ${error.message}`,
      erro: error.message
    };
  }
}

/**
 * 2. Consultar últimas contagens lançadas no Conta Ovos
 * 
 * Se a apiKey estiver disponível, consulta o endpoint privado /api/lastcounting.
 * Se não houver chave, consulta o endpoint público /api/lastcountingpublic.
 * 
 * @param {Object} params
 * @param {string} [params.apiKey] - Chave da API (se omitida, usa a salva)
 * @param {string} [params.municipio] - Nome do município (padrão: "Carmo")
 * @param {string} [params.estado] - Sigla do estado (padrão: "RJ")
 * @param {string|Date} [params.dataInicio] - Filtro data inicial (YYYY-MM-DD)
 * @param {string|Date} [params.dataFim] - Filtro data final (YYYY-MM-DD)
 * @param {number} [params.pagina] - Página (1 a 100)
 * @returns {Promise<Object>} Lista de contagens
 */
export async function consultarUltimasContagens({
  apiKey = '',
  municipio = 'Carmo',
  estado = 'RJ',
  dataInicio = '',
  dataFim = '',
  pagina = 1
} = {}) {
  const chave = apiKey?.trim() || getContaOvosApiKey();
  const temChave = Boolean(chave);

  const queryParams = new URLSearchParams();
  if (pagina) queryParams.set('page', String(pagina));

  const dInicio = formatarDataIso(dataInicio);
  const dFim = formatarDataIso(dataFim);
  if (dInicio) queryParams.set('date_start', dInicio);
  if (dFim) queryParams.set('date_end', dFim);

  let url = '';
  const headers = { 'Accept': 'application/json' };

  if (temChave) {
    queryParams.set('key', chave);
    headers['Authorization'] = `Bearer ${chave}`;
    url = `${CONTA_OVOS_BASE_URL}/api/lastcounting?${queryParams.toString()}`;
  } else {
    if (municipio) queryParams.set('municipality', municipio);
    if (estado) queryParams.set('state', estado);
    url = `${CONTA_OVOS_BASE_URL}/api/lastcountingpublic?${queryParams.toString()}`;
  }

  try {
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      const textoErro = await response.text();
      return {
        sucesso: false,
        status: response.status,
        mensagem: `Erro na consulta ao Conta Ovos (HTTP ${response.status}): ${textoErro}`,
        dados: []
      };
    }

    const data = await response.json();
    return {
      sucesso: true,
      status: 200,
      total: Array.isArray(data) ? data.length : 0,
      dados: Array.isArray(data) ? data : [],
      modo: temChave ? 'privado' : 'publico'
    };
  } catch (error) {
    return {
      sucesso: false,
      status: 0,
      mensagem: `Falha na requisição: ${error.message}`,
      dados: []
    };
  }
}

/**
 * 3. Enviar / Cadastrar / Atualizar Armadilha no Conta Ovos
 * 
 * Se a armadilha já existe no município, atualiza seu cadastro via POST /api/posteditovitrap.
 * Para novas instalações ou cadastro inicial com contagem, envia via POST /api/postcounting.
 * 
 * @param {string} apiKey - Chave da API
 * @param {Object} dadosArmadilha - Dados da armadilha (modelo local do app ou objeto compatível)
 * @returns {Promise<Object>} Resposta da API
 */
export async function enviarArmadilhaParaContaOvos(apiKey, dadosArmadilha) {
  const chave = apiKey?.trim() || getContaOvosApiKey();
  if (!chave) {
    return { sucesso: false, mensagem: 'Chave de API do Conta Ovos não fornecida.' };
  }

  const numLimpo = normalizarIdArmadilha(dadosArmadilha.numero || dadosArmadilha.ovitrap_group_id);
  const lat = parseFloat(dadosArmadilha.latitude ?? dadosArmadilha.ovitrap_lat);
  const lng = parseFloat(dadosArmadilha.longitude ?? dadosArmadilha.ovitrap_lng);

  if (!numLimpo) {
    return { sucesso: false, mensagem: 'Identificador/número da armadilha é obrigatório.' };
  }
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { sucesso: false, mensagem: `Coordenadas inválidas: lat=${lat}, lng=${lng}.` };
  }

  // Monta payload de edição cadastral (POST /api/posteditovitrap)
  const payloadEdit = {
    ovitrap_group_id: numLimpo,
    ovitrap_address_district: dadosArmadilha.bairro || dadosArmadilha.microarea || '',
    ovitrap_address_street: dadosArmadilha.rua || '',
    ovitrap_address_number: dadosArmadilha.numero_imovel || 'S/N',
    ovitrap_address_complement: dadosArmadilha.complemento || '',
    ovitrap_address_loc_inst: dadosArmadilha.local_instalacao || 'Área Externa',
    ovitrap_address_sector: dadosArmadilha.setor || dadosArmadilha.microarea || 'Urbano',
    ovitrap_responsable: dadosArmadilha.morador_nome || 'Responsável',
    ovitrap_block_id: String(dadosArmadilha.quarteirao || '01'),
    ovitrap_type_id: dadosArmadilha.tipo === 'rural' ? OVITRAP_TYPES.RURAL : OVITRAP_TYPES.URBANA,
    ovitrap_lat: lat,
    ovitrap_lng: lng
  };

  const dataInstalacao = formatarDataIso(dadosArmadilha.instalada_em) || new Date().toISOString().split('T')[0];
  if (dataInstalacao) {
    payloadEdit.atualizar_desde = dataInstalacao;
  }

  try {
    // 1º tentativa: atualizar via /api/posteditovitrap
    const urlEdit = `${CONTA_OVOS_BASE_URL}/api/posteditovitrap?key=${encodeURIComponent(chave)}`;
    const resEdit = await fetch(urlEdit, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chave}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payloadEdit)
    });

    if (resEdit.ok) {
      const respJson = await resEdit.json();
      return {
        sucesso: true,
        operacao: 'atualizada',
        status: resEdit.status,
        mensagem: `Armadilha OV-${numLimpo} atualizada com sucesso no Conta Ovos!`,
        resposta: respJson
      };
    }

    // Se retornou 404, significa que a armadilha ainda não está cadastrada no Conta Ovos.
    // Vamos registrá-la via /api/postcounting (instalação inicial com 0 ovos ou contagem inicial)
    if (resEdit.status === 404) {
      const payloadCadastro = {
        ...payloadEdit,
        date: dataInstalacao,
        counting_date_collect: dataInstalacao,
        counting_observation_id: 1,
        counting_observation: 'Instalação inicial via App GPS Ovitrampas',
        counting_eggs: parseInt(dadosArmadilha.ultimos_ovos ?? 0, 10)
      };

      const urlPostCounting = `${CONTA_OVOS_BASE_URL}/api/postcounting?key=${encodeURIComponent(chave)}`;
      const resCadastro = await fetch(urlPostCounting, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chave}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payloadCadastro)
      });

      if (resCadastro.ok) {
        const cadastroJson = await resCadastro.json();
        return {
          sucesso: true,
          operacao: 'cadastrada',
          status: resCadastro.status,
          mensagem: `Nova armadilha OV-${numLimpo} cadastrada com sucesso no Conta Ovos!`,
          resposta: cadastroJson
        };
      }

      const erroCadastro = await resCadastro.text();
      return {
        sucesso: false,
        status: resCadastro.status,
        mensagem: `Erro ao cadastrar armadilha OV-${numLimpo} no Conta Ovos: ${erroCadastro}`
      };
    }

    const textoErro = await resEdit.text();
    return {
      sucesso: false,
      status: resEdit.status,
      mensagem: `Erro na API do Conta Ovos (HTTP ${resEdit.status}): ${textoErro}`
    };
  } catch (error) {
    return {
      sucesso: false,
      status: 0,
      mensagem: `Erro de rede ao enviar armadilha: ${error.message}`
    };
  }
}

/**
 * 4. Enviar Leitura (Contagem de Ovos) para o Conta Ovos
 * 
 * Envia uma leitura para POST /api/postcounting. Se a contagem já existir na semana/ano (404/409),
 * realiza a atualização via POST /api/posteditcounting.
 * 
 * @param {string} apiKey - Chave da API
 * @param {Object} dadosLeitura - Leitura do laboratório (ovos, data, palheta, etc.)
 * @param {Object} [dadosArmadilha] - Dados cadastrais da armadilha (se disponíveis)
 * @returns {Promise<Object>} Resposta da API
 */
export async function enviarLeituraParaContaOvos(apiKey, dadosLeitura, dadosArmadilha = null) {
  const chave = apiKey?.trim() || getContaOvosApiKey();
  if (!chave) {
    return { sucesso: false, mensagem: 'Chave de API do Conta Ovos não fornecida.' };
  }

  const numLimpo = normalizarIdArmadilha(
    dadosLeitura.numero_armadilha || dadosArmadilha?.numero || dadosLeitura.ovitrap_group_id
  );
  if (!numLimpo) {
    return { sucesso: false, mensagem: 'Número da ovitrampa não identificado na leitura.' };
  }

  const ovos = parseInt(dadosLeitura.ovos ?? dadosLeitura.counting_eggs ?? 0, 10);
  const dataLeitura = formatarDataIso(dadosLeitura.lida_em || dadosLeitura.date) || new Date().toISOString().split('T')[0];
  const dataInstalacao = formatarDataIso(dadosArmadilha?.instalada_em || dadosLeitura.data_instalacao) || dataLeitura;

  const lat = parseFloat(dadosLeitura.latitude ?? dadosArmadilha?.latitude ?? 0);
  const lng = parseFloat(dadosLeitura.longitude ?? dadosArmadilha?.longitude ?? 0);

  const obsInfo = mapearObservacao(dadosLeitura.observacao || dadosLeitura.counting_observation || '');

  // Payload oficial exigido por POST /api/postcounting
  const payload = {
    ovitrap_group_id: numLimpo,
    ovitrap_lat: lat,
    ovitrap_lng: lng,
    date: dataInstalacao,
    counting_date_collect: dataLeitura,
    counting_eggs: ovos,
    counting_observation_id: obsInfo.id,
    counting_observation: obsInfo.descricao
  };

  // Se tivermos os dados cadastrais completos do imóvel, incluímos para garantir integridade
  if (dadosArmadilha) {
    payload.ovitrap_address_district = dadosArmadilha.bairro || dadosArmadilha.microarea || '';
    payload.ovitrap_address_street = dadosArmadilha.rua || '';
    payload.ovitrap_address_number = dadosArmadilha.numero_imovel || 'S/N';
    payload.ovitrap_address_complement = dadosArmadilha.complemento || '';
    payload.ovitrap_address_loc_inst = dadosArmadilha.local_instalacao || 'Quintal';
    payload.ovitrap_address_sector = dadosArmadilha.setor || dadosArmadilha.microarea || 'Urbano';
    payload.ovitrap_responsable = dadosArmadilha.morador_nome || 'Morador';
    payload.ovitrap_block_id = String(dadosArmadilha.quarteirao || '01');
    payload.ovitrap_type_id = dadosArmadilha.tipo === 'rural' ? OVITRAP_TYPES.RURAL : OVITRAP_TYPES.URBANA;
  }

  try {
    const url = `${CONTA_OVOS_BASE_URL}/api/postcounting?key=${encodeURIComponent(chave)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chave}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const respJson = await response.json();
      return {
        sucesso: true,
        operacao: 'criada',
        status: response.status,
        mensagem: `Leitura da OV-${numLimpo} (${ovos} ovos) registrada no Conta Ovos com sucesso!`,
        resposta: respJson
      };
    }

    // Se retornar 404 informando que já existe uma contagem para essa ovitrampa/ano/semana, usamos POST /api/posteditcounting
    const textoResp = await response.text();
    if (response.status === 404 && textoResp.toLowerCase().includes('já existe uma contagem')) {
      const editPayload = {
        ovitrap_group_id: numLimpo,
        date: dataInstalacao,
        counting_date_collect: dataLeitura,
        counting_eggs: ovos,
        counting_observation_id: obsInfo.id,
        counting_observation: obsInfo.descricao
      };

      const urlEdit = `${CONTA_OVOS_BASE_URL}/api/posteditcounting?key=${encodeURIComponent(chave)}`;
      const resEdit = await fetch(urlEdit, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chave}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(editPayload)
      });

      if (resEdit.ok) {
        const respEditJson = await resEdit.json();
        return {
          sucesso: true,
          operacao: 'atualizada',
          status: resEdit.status,
          mensagem: `Leitura da OV-${numLimpo} atualizada no Conta Ovos (${ovos} ovos)!`,
          resposta: respEditJson
        };
      }
    }

    return {
      sucesso: false,
      status: response.status,
      mensagem: `Erro ao enviar leitura para o Conta Ovos (HTTP ${response.status}): ${textoResp}`
    };
  } catch (error) {
    return {
      sucesso: false,
      status: 0,
      mensagem: `Erro de rede ao enviar leitura: ${error.message}`
    };
  }
}

/**
 * 5. Gerar Payloads Padronizados e Arquivo de Exportação para o Conta Ovos
 * 
 * Cruza armadilhas e leituras locais, gerando:
 * - payloadPostCounting: array de objetos prontos para POST /api/postcounting
 * - payloadEditOvitrap: array de objetos prontos para POST /api/posteditovitrap
 * - csvContent: string em formato CSV padronizado com cabeçalhos oficiais do Conta Ovos
 * - estatisticas: sumário do lote gerado
 * 
 * @param {Array<Object>} armadilhas - Lista de armadilhas locais
 * @param {Array<Object>} leituras - Lista de leituras locais
 * @returns {Object} Pacote completo de exportação e sincronização
 */
export function gerarPayloadExportacaoContaOvos(armadilhas = [], leituras = []) {
  const armadilhaPorId = new Map();
  const armadilhaPorNumero = new Map();

  armadilhas.forEach((arm) => {
    if (arm.id) armadilhaPorId.set(arm.id, arm);
    const num = normalizarIdArmadilha(arm.numero);
    if (num) armadilhaPorNumero.set(num, arm);
  });

  const payloadsPostCounting = [];
  const payloadsEditOvitrap = [];

  let totalOvos = 0;
  let totalPositivas = 0;

  // 1. Processa leituras vinculadas
  leituras.forEach((leit) => {
    const numLimpo = normalizarIdArmadilha(leit.numero_armadilha);
    const arm = (leit.armadilha_id && armadilhaPorId.get(leit.armadilha_id)) ||
                (numLimpo && armadilhaPorNumero.get(numLimpo)) || null;

    const ovos = parseInt(leit.ovos ?? 0, 10);
    totalOvos += ovos;
    if (ovos > 0) totalPositivas++;

    const dataLeitura = formatarDataIso(leit.lida_em) || new Date().toISOString().split('T')[0];
    const dataInstalacao = formatarDataIso(arm?.instalada_em) || dataLeitura;
    const lat = parseFloat(leit.latitude ?? arm?.latitude ?? 0);
    const lng = parseFloat(leit.longitude ?? arm?.longitude ?? 0);
    const obs = mapearObservacao(leit.observacoes || leit.observacao || '');

    const itemPayload = {
      ovitrap_group_id: numLimpo || (arm ? normalizarIdArmadilha(arm.numero) : '01'),
      ovitrap_address_district: arm?.bairro || arm?.microarea || '',
      ovitrap_address_street: arm?.rua || '',
      ovitrap_address_number: arm?.numero_imovel || 'S/N',
      ovitrap_address_complement: arm?.complemento || '',
      ovitrap_address_loc_inst: arm?.local_instalacao || 'Quintal / Área Externa',
      ovitrap_lat: lat,
      ovitrap_lng: lng,
      ovitrap_address_sector: arm?.setor || arm?.microarea || 'Urbano',
      ovitrap_responsable: arm?.morador_nome || 'Responsável',
      ovitrap_block_id: String(arm?.quarteirao || '01'),
      ovitrap_type_id: arm?.tipo === 'rural' ? OVITRAP_TYPES.RURAL : OVITRAP_TYPES.URBANA,
      date: dataInstalacao,
      counting_date_collect: dataLeitura,
      counting_observation_id: obs.id,
      counting_observation: obs.descricao,
      counting_eggs: ovos
    };

    payloadsPostCounting.push(itemPayload);
  });

  // 2. Processa armadilhas cadastradas para payload de edição/cadastro puro
  armadilhas.forEach((arm) => {
    const numLimpo = normalizarIdArmadilha(arm.numero);
    const lat = parseFloat(arm.latitude ?? 0);
    const lng = parseFloat(arm.longitude ?? 0);
    const dataInstalacao = formatarDataIso(arm.instalada_em) || new Date().toISOString().split('T')[0];

    payloadsEditOvitrap.push({
      ovitrap_group_id: numLimpo,
      ovitrap_address_district: arm.bairro || arm.microarea || '',
      ovitrap_address_street: arm.rua || '',
      ovitrap_address_number: arm.numero_imovel || 'S/N',
      ovitrap_address_complement: arm.complemento || '',
      ovitrap_address_loc_inst: arm.local_instalacao || 'Área Externa',
      ovitrap_address_sector: arm.setor || arm.microarea || 'Urbano',
      ovitrap_responsable: arm.morador_nome || 'Responsável',
      ovitrap_block_id: String(arm.quarteirao || '01'),
      ovitrap_type_id: arm.tipo === 'rural' ? OVITRAP_TYPES.RURAL : OVITRAP_TYPES.URBANA,
      ovitrap_lat: lat,
      ovitrap_lng: lng,
      atualizar_desde: dataInstalacao
    });
  });

  // 3. Monta CSV com BOM UTF-8 para abertura perfeita no Excel / LibreOffice
  const cabecalhosCsv = [
    'ovitrap_group_id',
    'ovitrap_address_district',
    'ovitrap_address_street',
    'ovitrap_address_number',
    'ovitrap_address_complement',
    'ovitrap_address_loc_inst',
    'ovitrap_lat',
    'ovitrap_lng',
    'ovitrap_address_sector',
    'ovitrap_responsable',
    'ovitrap_block_id',
    'ovitrap_type_id',
    'date',
    'counting_date_collect',
    'counting_observation_id',
    'counting_observation',
    'counting_eggs'
  ];

  const escapeCsv = (val) => {
    if (val === undefined || val === null) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const linhasCsv = payloadsPostCounting.map((item) => [
    escapeCsv(item.ovitrap_group_id),
    escapeCsv(item.ovitrap_address_district),
    escapeCsv(item.ovitrap_address_street),
    escapeCsv(item.ovitrap_address_number),
    escapeCsv(item.ovitrap_address_complement),
    escapeCsv(item.ovitrap_address_loc_inst),
    item.ovitrap_lat.toFixed(6),
    item.ovitrap_lng.toFixed(6),
    escapeCsv(item.ovitrap_address_sector),
    escapeCsv(item.ovitrap_responsable),
    escapeCsv(item.ovitrap_block_id),
    item.ovitrap_type_id,
    escapeCsv(item.date),
    escapeCsv(item.counting_date_collect),
    item.counting_observation_id,
    escapeCsv(item.counting_observation),
    item.counting_eggs
  ].join(';'));

  const csvContent = '\uFEFF' + [cabecalhosCsv.join(';'), ...linhasCsv].join('\r\n');

  return {
    sucesso: true,
    dataGeracao: new Date().toISOString(),
    estatisticas: {
      totalArmadilhas: armadilhas.length,
      totalLeituras: leituras.length,
      positivas: totalPositivas,
      negativas: leituras.length - totalPositivas,
      indicePositividade: leituras.length > 0 ? ((totalPositivas / leituras.length) * 100).toFixed(1) + '%' : '0%',
      totalOvos: totalOvos,
      mediaOvosPorArmadilha: leituras.length > 0 ? (totalOvos / leituras.length).toFixed(1) : 0
    },
    payloadPostCounting: payloadsPostCounting,
    payloadEditOvitrap: payloadsEditOvitrap,
    csvContent: csvContent
  };
}
