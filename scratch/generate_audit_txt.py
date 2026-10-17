#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os

with open('src/lib/trapsOficiaisCarmo.json', 'r', encoding='utf-8') as f:
    traps = json.load(f)

traps.sort(key=lambda t: int(t.get('numero', 0)))

txt_lines = []
txt_lines.append('==============================================================================')
txt_lines.append('RELATORIO TECNICO DE AUDITORIA CADASTRAL E HISTORICO DE ALTERACOES')
txt_lines.append('TABELA OFICIAL DE COORDENADAS GEOGRAFICAS DAS OVITRAMPAS DE CARMO-RJ')
txt_lines.append('PARA INTEGRACAO COM O SISTEMA CONTA OVOS (FIOCRUZ / MINISTERIO DA SAUDE)')
txt_lines.append('==============================================================================')
txt_lines.append('Data da Auditoria: 16 de Outubro de 2026')
txt_lines.append('Destinatario da Auditoria: GPT (IA Auditora Externa Independente)')
txt_lines.append('Responsavel Tecnico: Almir Lemgruber (Coordenacao de Vigilancia em Saude)')
txt_lines.append('Sistema Alvo: GPS Ovitrampas Carmo-RJ (Prefeitura Municipal de Carmo)')
txt_lines.append('')
txt_lines.append('******************************************************************************')
txt_lines.append('*** AVISO MANDATORIO PARA O GPT / AUDITOR:                                 ***')
txt_lines.append('*** 1. VOCE E EXCLUSIVAMENTE UM AUDITOR DE CONFORMIDADE.                   ***')
txt_lines.append('*** 2. NAO ALTERE NENHUM ARQUIVO DO PROJETO.                               ***')
txt_lines.append('*** 3. NAO MODIFIQUE NENHUM DADO, CODIGO OU REGISTRO.                      ***')
txt_lines.append('*** 4. NAO FACA COMMITS NEM DEPLOYS.                                       ***')
txt_lines.append('*** 5. SUA MISSAO E CONFERIR, COMPARAR COM OS PRINTS E REPORTAR OS ACHADOS.***')
txt_lines.append('******************************************************************************')
txt_lines.append('')
txt_lines.append('------------------------------------------------------------------------------')
txt_lines.append('1. LOCALIZACAO DOS PRINTS MANUSCRITOS E ARQUIVOS AUDITADOS')
txt_lines.append('------------------------------------------------------------------------------')
txt_lines.append('PRINTS UTILIZADOS COMO FONTE PRIMARIA DE CORRECAO (ANOTACOES DA EQUIPE):')
txt_lines.append('- Pagina 1 (OV-01 a OV-31 com anotacoes manuscritas nas OVs 01, 12 e 14):')
txt_lines.append('  * Caminho no Projeto: F:\\Desktop\\GPS OVITRAMPAS\\auditoria_prints\\print_correcoes_pagina1_manuscrito.jpg')
txt_lines.append('  * Caminho de Upload Original: C:\\Users\\Almir LK\\.gemini\\antigravity\\brain\\d5ca7dec-a3d5-4d26-b7fc-36350d92f8ca\\.user_uploaded\\media_1792154429991_4631e37b.jpg')
txt_lines.append('')
txt_lines.append('- Pagina 2 (OV-32 a OV-56 com anotacoes manuscritas nas OVs 35, 37, 42, 50, 51 e 52):')
txt_lines.append('  * Caminho no Projeto: F:\\Desktop\\GPS OVITRAMPAS\\auditoria_prints\\print_correcoes_pagina2_manuscrito.jpg')
txt_lines.append('  * Caminho de Upload Original: C:\\Users\\Almir LK\\.gemini\\antigravity\\brain\\d5ca7dec-a3d5-4d26-b7fc-36350d92f8ca\\.user_uploaded\\media_1792154430000_618918d5.jpg')
txt_lines.append('')
txt_lines.append('ARQUIVOS CORRIGIDOS E EMITIDOS (DOCUMENTOS FINAIS):')
txt_lines.append('- PDF Oficial Final (A4 Paisagem, sem marca d\'agua, cabecalho com 1 unico timbre):')
txt_lines.append('  * Raiz do Projeto: F:\\Desktop\\GPS OVITRAMPAS\\TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf')
txt_lines.append('  * Area de Trabalho do Gestor: C:\\Users\\Almir LK\\Desktop\\TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf')
txt_lines.append('')

txt_lines.append('- Bases de Dados Oficiais Sincronizadas no Sistema:')
txt_lines.append('  * F:\\Desktop\\GPS OVITRAMPAS\\src\\lib\\trapsOficiaisCarmo.json')
txt_lines.append('  * F:\\Desktop\\GPS OVITRAMPAS\\traps_clean_utf8.json')
txt_lines.append('  * F:\\Desktop\\GPS OVITRAMPAS\\RELATORIO_AUDITORIA_ENDERECOS_CAMPO.md')
txt_lines.append('')
txt_lines.append('- Modulos Geradores de Codigo do PDF:')
txt_lines.append('  * Python (ReportLab): F:\\Desktop\\GPS OVITRAMPAS\\generate_pdf_tabela_conta_ovos.py')
txt_lines.append('  * Web React / Vite (jsPDF + autotable): F:\\Desktop\\GPS OVITRAMPAS\\src\\lib\\pdfRelatorioContaOvos.js')
txt_lines.append('')
txt_lines.append('------------------------------------------------------------------------------')
txt_lines.append('2. HISTORICO DETALHADO DO QUE FOI FEITO ONTEM (15/10) E HOJE (16/10)')
txt_lines.append('------------------------------------------------------------------------------')
txt_lines.append('ACOES REALIZADAS ONTEM (15/10/2026):')
txt_lines.append('1. Criacao do formato e layout oficial da Tabela de Coordenadas Geograficas A4 Paisagem, atendendo aos padroes exigidos pelo Sistema Conta Ovos (Fiocruz / Ministerio da Saude).')
txt_lines.append('2. Transcricao inicial dos dados manuscritos de campo colhidos pela equipe tecnica.')
txt_lines.append('3. Inclusao da coluna "Coordenada Completa" (Latitude, Longitude em Graus Decimais WGS 84) com formatacao pronta para copia e colagem rapida no sistema Conta Ovos.')
txt_lines.append('4. Implementacao de gerador duplo: script Python (ReportLab) e emissao direta pelo navegador no painel web (CentralRelatorios.jsx via pdfRelatorioContaOvos.js).')
txt_lines.append('5. Reconciliacao do cache do navegador (storage.js) para garantir que as 56 armadilhas oficiais sobreponham cadastros antigos em cache.')
txt_lines.append('')
txt_lines.append('ACOES REALIZADAS HOJE (16/10/2026):')
txt_lines.append('1. Adequacao do Cabecalho Institucional (Solicitacao Expressa do Gestor):')
txt_lines.append('   - ANTES: O cabecalho exibia dois timbres (Brasao de Carmo na extremidade esquerda e Logo da Prefeitura na extremidade direita).')
txt_lines.append('   - DEPOIS: Foi removido o segundo logotipo da direita. Agora ha estritamente UM UNICO TIMBRE NO CABECALHO (o Brasao Oficial do Municipio de Carmo a esquerda), mantendo o bloco institucional perfeitamente centralizado e com aspecto formal e limpo.')
txt_lines.append('')
txt_lines.append('2. Aplicacao das 9 Correcoes Manuscritas Apontadas nos Prints de Revisao:')
txt_lines.append('   - As anotacoes manuscritas a caneta azul sobre o documento impresso foram integralmente transcritas para a base de dados oficial e refletidas no PDF.')
txt_lines.append('   - Atualizacao das chaves cadastrais no storage.js (VERSAO_AUDITORIA_CADASTRO = "2026-10-16_AUDITORIA_OFICIAL_56_V3") para forcar atualizacao imediata nos navegadores.')
txt_lines.append('')
txt_lines.append('------------------------------------------------------------------------------')
txt_lines.append('3. QUADRO COMPARATIVO DAS 9 CORRECOES REALIZADAS (ANTES vs. DEPOIS)')
txt_lines.append('------------------------------------------------------------------------------')
txt_lines.append('OV    | CAMPO ALTERADO       | VALOR ANTERIOR (15/10)           | VALOR CORRIGIDO (16/10)          | MOTIVO / EVIDENCIA NO PRINT')
txt_lines.append('------+----------------------+----------------------------------+----------------------------------+---------------------------------------------------')
txt_lines.append('OV-01 | Numero Predial       | 123                              | 423                              | Caneta azul corrigiu 123 para 423 (Rua Celso C. Faria)')
txt_lines.append('OV-12 | Numero Predial       | 70                               | 40                               | Caneta azul riscou 70 e anotou 40 (Lad. Joao Alfredo)')
txt_lines.append('OV-14 | Numero Predial       | 34                               | 341                              | Caneta azul riscou 34 e anotou 341 (Rua Isaura Maia)')
txt_lines.append('OV-35 | Numero Predial       | 200                              | 269                              | Caneta azul riscou 200 e anotou 269 (R. Senador Dantas)')
txt_lines.append('OV-37 | Morador / Resp.      | Aline Reiff                      | Franciane Miguel                 | Caneta azul escreveu Franciane Miguel (Influencia)')
txt_lines.append('OV-42 | Logradouro           | Rua Gandur R. da Silva, 39       | Rua Djaniro R. da Silva, 39      | Caneta azul corrigiu sobre fita corretiva (P. Velho)')
txt_lines.append('OV-50 | Morador / Resp.      | Franciane Miguel                 | ESF Influencia                   | Caneta azul escreveu ESF Influencia (Influencia)')
txt_lines.append('OV-51 | Morador / Resp.      | Leo Jorge                        | Aline Reiff                      | Caneta azul escreveu Aline Reiff (Influencia)')
txt_lines.append('OV-52 | Morador / Resp.      | ESF Influencia                   | Leo Jorge                        | Caneta azul escreveu Leo Jorge (Influencia)')
txt_lines.append('')
txt_lines.append('*NOTA EXPLICATIVA SOBRE O 2º DISTRITO (INFLUENCIA):')
txt_lines.append('Houve uma rotatividade/ajuste de endereco entre 4 armadilhas do distrito:')
txt_lines.append('OV-37 (Rua Hermogenio Chaves, 160) passou a ser Franciane Miguel.')
txt_lines.append('OV-50 (Rua Jose Ferreira Alves, S/N) passou a ser ESF Influencia.')
txt_lines.append('OV-51 (Rua Maria da Silva Machareth, 182) passou a ser Aline Reiff.')
txt_lines.append('OV-52 (Rua Antonio N. Leite, 100) passou a ser Leo Jorge.')
txt_lines.append('Essa redistribuicao alinha com precisao milimetrica a localizacao do imovel fisico e o morador/ponto de apoio.')
txt_lines.append('')
txt_lines.append('------------------------------------------------------------------------------')
txt_lines.append('4. TABELA INTEGRAL DAS 56 ARMADILHAS AUDITADAS E CONSOLIDADAS (OV-01 A OV-56)')
txt_lines.append('------------------------------------------------------------------------------')
header_fmt = '{:<6} | {:<7} | {:<28} | {:<34} | {:<22} | {:<6} | {:<12} | {:<12} | {:<25}'
txt_lines.append(header_fmt.format('Nº OV', 'Palheta', 'Morador / Responsavel', 'Logradouro e Nº', 'Bairro / Distrito', 'Quart.', 'Latitude', 'Longitude', 'Coord. Completa'))
txt_lines.append('-'*175)

for t in traps:
    n = int(t.get('numero', 0))
    ov = f'OV-{n:02d}'
    palheta = t.get('palheta') or f'{n:02d}A'
    morador = t.get('morador_nome') or t.get('moradorNome') or '-'
    rua = t.get('rua') or ''
    num_im = str(t.get('numero_imovel') or t.get('numeroImovel') or '').strip()
    endereco = f'{rua}, {num_im}' if (rua and num_im) else (rua or '-')
    bairro = t.get('bairro') or '-'
    quart = t.get('quarteirao') or '-'
    lat = float(t.get('latitude', 0))
    lng = float(t.get('longitude', 0))
    lat_str = f'{lat:.7f}'
    lng_str = f'{lng:.7f}'
    coord_full = f'{lat_str}, {lng_str}'
    txt_lines.append(header_fmt.format(ov, palheta, morador[:28], endereco[:34], bairro[:22], quart[:6], lat_str, lng_str, coord_full))

txt_lines.append('')
txt_lines.append('------------------------------------------------------------------------------')
txt_lines.append('5. ROTEIRO DE VERIFICACAO PARA O AUDITOR (GPT)')
txt_lines.append('------------------------------------------------------------------------------')
txt_lines.append('Ao auditar este documento, verifique especificamente:')
txt_lines.append('1. [ ] Cabecalho: Certifique que existe apenas 1 timbre (Brasao de Carmo) e que nao ha logo na direita.')
txt_lines.append('2. [ ] OV-01: Verifique se o endereco e "Rua Celso Carrilho Faria, 423".')
txt_lines.append('3. [ ] OV-12: Verifique se o endereco e "Ladeira Joao Alfredo, 40".')
txt_lines.append('4. [ ] OV-14: Verifique se o endereco e "Rua Isaura Maia, 341".')
txt_lines.append('5. [ ] OV-35: Verifique se o endereco e "Rua Senador Dantas, 269".')
txt_lines.append('6. [ ] OV-37: Verifique se o morador e "Franciane Miguel".')
txt_lines.append('7. [ ] OV-42: Verifique se o logradouro e "Rua Djaniro R. da Silva, 39".')
txt_lines.append('8. [ ] OV-50: Verifique se o morador e "ESF Influencia".')
txt_lines.append('9. [ ] OV-51: Verifique se o morador e "Aline Reiff".')
txt_lines.append('10. [ ] OV-52: Verifique se o morador e "Leo Jorge".')
txt_lines.append('11. [ ] Totalizacao: Certifique que ha exatamente 56 armadilhas, com numeracao de 01 a 56 sem saltos.')
txt_lines.append('12. [ ] Coordenadas: Certifique que a coluna "Coordenada Completa" possui formato rigoroso "lat, long" com 7 casas decimais.')
txt_lines.append('')
txt_lines.append('FIM DO RELATORIO DE AUDITORIA.')
txt_lines.append('==============================================================================')

with open('RELATORIO_AUDITORIA_CONTA_OVOS_GPT.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(txt_lines))

# Tambem copia para a Area de Trabalho do Almir para facilitar envio
desktop_path = r'C:\Users\Almir LK\Desktop\RELATORIO_AUDITORIA_CONTA_OVOS_GPT.txt'
try:
    with open(desktop_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(txt_lines))
    print(f'Also copied to {desktop_path}')
except Exception as e:
    print(f'Could not copy to desktop: {e}')

print('RELATORIO_AUDITORIA_CONTA_OVOS_GPT.txt generated successfully')
