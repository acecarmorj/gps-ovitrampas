# 🦟 GPS OVITRAMPAS — DOSSIÊ DE CONTEXTO DO PROJETO

Este arquivo serve como **ponto de partida e transferência de contexto** para qualquer assistente de inteligência artificial ou desenvolvedor que inicie uma nova sessão neste projeto.

---

## 📌 1. Visão Geral do Projeto
O **GPS Ovitrampas** é um sistema completo de gestão, geolocalização e monitoramento de armadilhas ovitrampas (vigilância entomológica de *Aedes aegypti* / *Aedes albopictus*) para o setor de Vigilância Ambiental em Saúde / Endemias do Município de **Carmo - RJ**.

* **Objetivo:** Acompanhamento em tempo real da instalação, inspeção, recolhimento das palhetas, contagem de ovos e cálculo de indicadores epidemiológicos:
  * **IPO** (Índice de Positividade de Ovitrampas)
  * **IDO** (Índice de Densidade de Ovos)
* **Escopo Atual:** 56 armadilhas municipais (identificadas de **P-01** a **P-56**), abrangendo a área urbana central (1º Distrito: Progresso, Centro, Boa Ideia, Morro do Estado, etc.) e os distritos municipais (2º Distrito - Influência, 3º Distrito - Córrego da Prata, 4º Distrito - Porto Velho do Cunha, 5º Distrito - Ilha dos Pombos e Barra de São Francisco).

---

## 🛠️ 2. Arquitetura e Stack Tecnológica

### Frontend
* **Framework:** React 19 + Vite (porta `3000`, host `0.0.0.0`)
* **Estilização:** Tailwind CSS v4
* **Mapas & Geolocalização:** Leaflet + Leaflet Heatmap (`leaflet.heat`) + Canvas de Satélite com Nevoeiro Térmico (`heatmapCanvas.js`)
* **Ícones:** Lucide React (`lucide-react`)
* **Exportação & Relatórios:** jsPDF + jsPDF-AutoTable
* **Diretório:** `F:\Desktop\GPS OVITRAMPAS`

### Backend & Nuvem
* **Plataforma Serverless:** Cloudflare Workers (`worker/`)
* **Nome do Worker:** `ovitrampas-api` (definido em `worker/wrangler.toml`)
* **Banco de Dados:** Cloudflare D1 (SQLite distribuído na Cloudflare)
  * **Database Name:** `ovitrampas-gps-db`
  * **Database ID:** `7f230c39-789f-416d-95fd-4e22e7fd5d69`
  * **Binding:** `DB`

---

## 📊 3. Estrutura de Dados Principal

### Tabela `traps` (Armadilhas)
* `id` / `numero`: Código único da armadilha (`P-01` até `P-56` / `01` a `56`).
* `rua`, `numero_imovel`, `bairro`, `microarea`, `quarteirao`: Localização territorial e cadastral.
* `morador_nome`, `telefone`: Dados de contato do morador (sigilosos / protegidos pela LGPD).
* `latitude`, `longitude`, `precisao_gps`: Coordenadas WGS-84 métricas.
* `status`: Status operacional (`instalada`, `recolhida`, `analisada`).
* `ultimos_ovos`: Contagem de ovos da última palheta lida.
* `observacoes`: Observações de campo (ex: armadilha seca, tombada, etc.).

### Tabela `readings` (Inspeções / Coletas / Leituras)
* `id`, `armadilha_id`: Associação direta com a armadilha.
* `numero_palheta`: Código identificador da palheta com sufixo do ciclo (`01A` para Ciclo A, `01B` para Ciclo B).
* `quantidade_ovos`: Quantidade de ovos de *Aedes* quantificados sob estereomicroscopia.
* `data_instalacao`, `data_coleta`, `data_leitura`: Série temporal do ciclo.
* `status`: Estado atual (`instalada`, `recolhida`, `lida`).
* `observacoes`: Intercorrências de bancada ou campo.

---

## 📈 4. Estado Atual dos Dados (Ciclo A e Ciclo B)

### Ciclo A (1ª Semana Amostral — Concluído):
* **Armadilhas Lidas:** 56 de 56 (100% de cobertura).
* **Positivas:** 32 armadilhas com presença de ovos.
* **Negativas:** 24 armadilhas com contagem zero.
* **Total de Ovos:** 1.017 ovos.
* **IPO Ciclo A:** 57,1% (Índice de Positividade).
* **IDO Ciclo A:** 31,8 ovos/armadilha positiva (Índice de Densidade).
* **Epicentro do Ciclo A:** Bairro Progresso (P-23 com 147 ovos e P-21 com 100 ovos).

### Ciclo B (2ª Semana Amostral — Parcial em 30/09/2026):
* **Armadilhas Lidas até 30/09:** 26 palhetas lidas (P-01 a P-25 + P-51).
* **Positivas (Parcial):** 12 armadilhas.
* **Negativas (Parcial):** 14 armadilhas.
* **Total de Ovos (Parcial):** 951 ovos.
* **IPO Ciclo B (Parcial):** 46,2%.
* **IDO Ciclo B (Parcial):** 79,2 ovos/armadilha positiva.
* **Palhetas Pendentes de Leitura:** 28 palhetas em processamento laboratorial (conclusão em 01/10/2026).
* **Correção Crítica no D1 Realizada em 30/09:**
  * Excluída leitura duplicada acidental com 0 ovos para P-05 (`leit-1790789164363-8cg9`).
  * Restaurada contagem correta de **167 ovos** na armadilha P-05 (palheta 05B) tanto na tabela `readings` quanto na tabela `traps`.

---

## 🏛️ 5. Relatório Técnico Oficial para a SES-RJ (8 Páginas)

Criado em `src/lib/pdfRelatorioFinalSesRJ.js` para submissão oficial à **Secretaria de Estado de Saúde do Rio de Janeiro (SES-RJ)**.

### Diretrizes Estritas do Documento:
1. **Privacidade e LGPD Total:** ZERO exibição de nomes de moradores ou endereços residenciais. Todos os dados são agregados por território ou identificados pelo código técnico (`P-01` a `P-56`).
2. **Agregação Territorial em 3 Níveis:** `Bairro > Microárea > Quarteirão`.
3. **Comparativo Temporal Lado a Lado:** Ciclo A x Ciclo B (Ovos, IPO, IDO e Tendência).
4. **Tratamento de Pendências:** Pontos do Ciclo B ainda sem leitura recebem o status `"Aguardando"` (nunca zero ou traço em branco).
5. **Timbres Oficiais em Base64:** Armazenados em `src/lib/timbresOficiais.js` para renderização instantânea 100% offline no jsPDF:
   * `TIMBRE_BRASAO_CARMO`: Brasão Oficial do Município de Carmo.
   * `TIMBRE_LOGO_PREFEITURA`: Logo Oficial da Prefeitura Municipal de Carmo.

### Estrutura Completa das 8 Páginas:
* **Página 1 (Capa Institucional):** Moldura dupla executiva, timbres oficiais do Município e da Prefeitura, cabeçalho da SES-RJ e SMS-Carmo, título oficial de monitoramento vetorial, selo LGPD e 4 cards de metadados executivos (Poder Executivo, Coordenação com **Almir Lemgruber**, Especificações da Malha de 56 OVs e Enquadramento Legal CIB-RJ nº 8.910/2024).
* **Página 2 (Sumário Executivo & Índice Geral):** Tabela de navegação com as 6 seções técnicas, objetivos de governança no SUS e Termo de Conformidade Ética e Sigilo Sanitário.
* **Página 3 (Seção 01):** Resumo Executivo e Painel Comparativo A x B (5 Cards de KPIs, tabela síntese por distrito e classificação pelos 5 estratos oficiais de risco do Ministério da Saúde).
* **Página 4 (Seção 02):** Tabela Técnica Territorial em 3 Níveis (Bairro > Microárea > Quarteirão).
* **Página 5 (Seção 03):** Inventário Técnico Individualizado das 56 Ovitrampas (P-01 a P-56).
* **Página 6 (Seção 04):** Mapeamento Geoespacial de Alta Resolução — Ciclo A (1.017 ovos contados, satélite + nevoeiro térmico).
* **Página 7 (Seção 05):** Mapeamento Geoespacial de Alta Resolução — Ciclo B (com leituras realizadas e pendências laboratoriais).
* **Página 8 (Seção 06):** Metodologia Científica Padronizada, Diretrizes de Bloqueio em Raio de 150m, Bloco de Chancela com Assinaturas Técnicas (Almir Lemgruber e Secretaria Municipal de Saúde) e Chave de Autenticação Digital.

### Botões na Interface:
* `src/features/admin/PainelRelatorios.jsx`: Card institucional de destaque com botão `"BAIXAR RELATÓRIO SES-RJ (PDF)"`.
* `src/features/admin/PainelAdminScreen.jsx`: Botão `[ Relatório SES-RJ (8 Págs) ]` na barra de ferramentas superior.

---

## 💻 6. Comandos Úteis do Projeto

### Executar o Frontend Localmente
```bash
# Na raiz: F:\Desktop\GPS OVITRAMPAS
npm run dev
# O app subirá em: http://localhost:3000
```

### Build e Verificação do Frontend
```bash
npm run build
```

### Consultas Rápidas no Cloudflare D1 (Produção)
```bash
# Contagem de leituras no D1:
npx wrangler d1 execute ovitrampas-gps-db --remote --command="SELECT COUNT(*) FROM readings;"

# Verificação das últimas leituras lançadas:
npx wrangler d1 execute ovitrampas-gps-db --remote --command="SELECT armadilha_id, numero_palheta, quantidade_ovos, data_leitura FROM readings ORDER BY id DESC LIMIT 15;"

# Verificação da P-05 (167 ovos):
npx wrangler d1 execute ovitrampas-gps-db --remote --command="SELECT id, numero, ultimos_ovos, status FROM traps WHERE numero = '05' OR numero = '5';"
```

---

## 🎯 7. Regras e Cuidados para Novas Sessões
1. **Regra de Ouro — Privacidade e LGPD no Relatório SES-RJ:** NUNCA incluir nomes de moradores ou endereços residenciais no relatório destinado à SES-RJ (`pdfRelatorioFinalSesRJ.js`). Os relatórios internos (`pdfRelatorioEntomologico.js` e `pdfRelatorioConsolidado.js`) permanecem inalterados.
2. **Revisão Obrigatória antes do Deploy:** Qualquer emissão de documento oficial externo deve ser previamente validada e aprovada pelo coordenador Almir Lemgruber antes de ser publicada ou enviada à SES-RJ.
3. **Sincronia entre IAs:** Manter o arquivo `conversa.txt` atualizado com as seções sequenciais para que Claude e Gemini operem em perfeita sintonia e sem colisão de arquivos.
