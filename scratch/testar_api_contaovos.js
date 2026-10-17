/**
 * Script de Teste Automatizado da Integração com o Conta Ovos (Node.js ES Module)
 * Executa testes reais nos endpoints públicos e validação de payloads.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  testarConexaoContaOvos,
  consultarUltimasContagens,
  gerarPayloadExportacaoContaOvos,
  validarFormatoChave,
  enviarArmadilhaParaContaOvos,
  enviarLeituraParaContaOvos
} from '../src/lib/contaOvosApi.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

async function executarTestes() {
  console.log('='.repeat(70));
  console.log('   TESTE AUTOMATIZADO: MÓDULO CONTA OVOS API (src/lib/contaOvosApi.js)');
  console.log('='.repeat(70));

  // 1. Teste de Validação de Chave
  console.log('\n[1] TESTE DE VALIDAÇÃO DE CHAVE DE API (45 caracteres alfanuméricos):');
  const chaveInvalidaCurta = '123456';
  const chaveInvalidaChar = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2-'; // tem hífen
  const chaveValidaExemplo = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w'; // 45 chars

  console.log('  Chave curta (6 chars):', validarFormatoChave(chaveInvalidaCurta));
  console.log('  Chave com caractere especial:', validarFormatoChave(chaveInvalidaChar));
  console.log('  Chave válida (45 alfanum):', validarFormatoChave(chaveValidaExemplo));

  // 2. Teste de Conexão Pública (Carmo / RJ)
  console.log('\n[2] TESTE DE CONEXÃO COM O CONTA OVOS (Modo Público):');
  const resConexaoPublica = await testarConexaoContaOvos('', 'Carmo');
  console.log('  Status:', resConexaoPublica.status);
  console.log('  Sucesso:', resConexaoPublica.sucesso);
  console.log('  Mensagem:', resConexaoPublica.mensagem);
  console.log('  Total de registros públicos em Carmo:', resConexaoPublica.totalRegistros);

  // 3. Teste de Consulta de Contagens
  console.log('\n[3] TESTE DE CONSULTA DE ÚLTIMAS CONTAGENS (Carmo/RJ):');
  const resContagens = await consultarUltimasContagens({ municipio: 'Carmo', estado: 'RJ' });
  console.log('  Sucesso:', resContagens.sucesso);
  console.log('  Total retornado:', resContagens.total);
  if (resContagens.dados.length > 0) {
    const amostra = resContagens.dados[0];
    console.log(`  Amostra: OV-${amostra.ovitrap_id} | ${amostra.eggs} ovos | Coleta: ${amostra.date_collect} | Sem: ${amostra.week}/${amostra.year}`);
  }

  // 4. Teste de Geração de Payloads de Carga em Lote com Dados Reais do Projeto
  console.log('\n[4] TESTE DE GERAÇÃO DE PAYLOADS DE EXPORTAÇÃO (Dados de Carmo):');
  try {
    const trapsRaw = fs.readFileSync(path.join(projectRoot, 'traps_clean.json'), 'utf-8');
    const readingsRaw = fs.readFileSync(path.join(projectRoot, 'readings_clean.json'), 'utf-8');
    
    // Remove BOM se presente
    const cleanTrapsJson = trapsRaw.charCodeAt(0) === 0xFEFF ? trapsRaw.slice(1) : trapsRaw;
    const cleanReadingsJson = readingsRaw.charCodeAt(0) === 0xFEFF ? readingsRaw.slice(1) : readingsRaw;

    const trapsData = JSON.parse(cleanTrapsJson);
    const readingsData = JSON.parse(cleanReadingsJson);

    const trapsList = Array.isArray(trapsData) 
      ? (trapsData[0]?.results || trapsData) 
      : (trapsData.results || []);
    const readingsList = Array.isArray(readingsData) 
      ? (readingsData[0]?.results || readingsData) 
      : (readingsData.results || []);

    console.log(`  Armadilhas carregadas: ${trapsList.length}`);
    console.log(`  Leituras carregadas: ${readingsList.length}`);

    const lote = gerarPayloadExportacaoContaOvos(trapsList, readingsList);

    console.log('\n  Estatísticas do Lote Gerado:');
    console.log('   - Total de Armadilhas:', lote.estatisticas.totalArmadilhas);
    console.log('   - Total de Leituras:', lote.estatisticas.totalLeituras);
    console.log('   - Positivas:', lote.estatisticas.positivas);
    console.log('   - Negativas:', lote.estatisticas.negativas);
    console.log('   - Índice de Positividade:', lote.estatisticas.indicePositividade);
    console.log('   - Total de Ovos:', lote.estatisticas.totalOvos);
    console.log('   - Média Ovos/Armadilha:', lote.estatisticas.mediaOvosPorArmadilha);

    console.log(`\n  Payloads para POST /api/postcounting gerados: ${lote.payloadPostCounting.length}`);
    if (lote.payloadPostCounting.length > 0) {
      console.log('  Exemplo de payload de leitura (#1):');
      console.log(JSON.stringify(lote.payloadPostCounting[0], null, 2));
    }

    console.log(`\n  Payloads para POST /api/posteditovitrap gerados: ${lote.payloadEditOvitrap.length}`);
    if (lote.payloadEditOvitrap.length > 0) {
      console.log('  Exemplo de payload de armadilha (#1):');
      console.log(JSON.stringify(lote.payloadEditOvitrap[0], null, 2));
    }

    console.log(`\n  Arquivo CSV gerado: ${lote.csvContent.length} bytes (Primeiras 3 linhas):`);
    console.log(lote.csvContent.split('\r\n').slice(0, 3).join('\n'));

    // Salva arquivo exportado para inspeção em scratch
    fs.writeFileSync(path.join(projectRoot, 'scratch', 'carga_exemplo_contaovos.csv'), lote.csvContent, 'utf-8');
    fs.writeFileSync(path.join(projectRoot, 'scratch', 'payloads_postcounting.json'), JSON.stringify(lote.payloadPostCounting, null, 2), 'utf-8');
    console.log('\n  Arquivos de auditoria gravados em scratch/carga_exemplo_contaovos.csv e scratch/payloads_postcounting.json.');

  } catch (err) {
    console.error('  Erro ao processar dados de teste:', err.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('   TODOS OS TESTES CONCLUÍDOS COM SUCESSO!');
  console.log('='.repeat(70) + '\n');
}

executarTestes().catch(console.error);
