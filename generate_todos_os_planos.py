#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera os 5 Planos Diários de Campo (Segunda a Sexta) e o Plano Geral Semanal da Coordenação/Supervisão.
Todos com EXATAMENTE 1 página A4 Retrato cada, validados via pypdf.

Regras Críticas Cumpridas 100%:
1. Todos os 10 ACEs (Equipes 1 a 5) atuam 100% EM CAMPO todos os dias (serviço interno possui equipe própria).
2. Frota real respeitada: 1 Carro de passeio (5 lugares) + 1 Caminhonete (2 lugares) = máx. 7 lugares móveis.
3. Horário Corrido das 08h00 às 13h00, com concentração, saída e reunião sempre no P.A. (Ponto de Apoio).
4. Sexta-feira: 08h00 às 12h00 varredura de imóveis fechados em campo + 12h00 às 13h00 Reunião Geral no P.A.
5. Mapas recortados e delimitados de output/prints_delimitados/ (3 colunas na Segunda e Terça; 2 colunas na Quarta, Quinta e Sexta).
"""

import os
import shutil
import pypdf
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from generate_plano_geral_supervisao import gerar_plano_geral_supervisao

PLANOS_DIARIOS_DATA = [
    {
        "cod": "SEGUNDA",
        "nome_arquivo": "PLANO_DE_CAMPO_SEGUNDA_FEIRA.pdf",
        "dia_extenso": "SEGUNDA-FEIRA – OPERAÇÃO INTEGRADA SEDE URBANA & BARRA DE SÃO FRANCISCO",
        "territorio": "Carmo Sede (Progresso e Centro) + Barra de São Francisco (5º Distrito)",
        "frota_efetivo": "Horário Corrido: 08h00 às 13h00 (Saída do P.A.) | 10 ACEs em Campo: Carro 5L (4 ACEs Barra) + 6 ACEs Sede (Caminhonete 2L)",
        "layout_mapas": "3_colunas",
        "mapas_cards": [
            ("output/prints_delimitados/segunda_1_progresso.png", "output/mapas_individuais/segunda_ov23_pousada.png"),
            ("output/prints_delimitados/segunda_2_centro.png", "output/mapas_individuais/segunda_ov10_oscar_curty.png"),
            ("output/prints_delimitados/segunda_3_barra.png", "output/mapas_satelite/segunda_barra_sao_francisco.png")
        ],
        "escala_10_agentes": [
            (
                "Equipe 1 (2 ACEs)",
                "Barra de S. Francisco (Q-01)\n[Carro 5 Lugares]",
                "<b>OV-55 • R. Antônio R. Serafim, S/N</b><br/><font color=\"#b91c1c\"><b>125 ovos</b></font> (Sem A=5 + Sem B=120)",
                "Saída às 08h00 do P.A. no Carro (5L). Núcleo 100m (R. Antônio Serafim) + Perímetro 200m. Foco em bebedouros rurais, tonéis e quintais amplos."
            ),
            (
                "Equipe 2 (2 ACEs)",
                "Barra de S. Francisco (Q-01)\n[Carro 5 Lugares]",
                "<b>OV-54 (74 ovos) e OV-56 (69 ovos)</b><br/><font color=\"#b91c1c\"><b>143 ovos acum.</b></font> (A:13+B:61 | A:3+B:66)",
                "Saída às 08h00 do P.A. no Carro (5L). Núcleo 100m (R. Sebastião F. da Costa e Escola da Barra) + Perímetro 200m. Inspeção predial escolar, calhas e caixas no solo."
            ),
            (
                "Equipe 3 (2 ACEs)",
                "Progresso (Q-01)\n[Sede + Caminhonete 2L]",
                "<b>OV-23 • Pousada Valle do Sol</b><br/><font color=\"#b91c1c\"><b>342 ovos</b></font> (Sem A=147 + Sem B=195)",
                "Campo Sede (08h00 às 13h00) com apoio da Caminhonete (2L). Núcleo 100m (Pousada, R. Manoel J. Moraes 51 e José Cassane) + Perímetro 200m. Piscinas, ralos e tonéis."
            ),
            (
                "Equipe 4 (2 ACEs)",
                "Centro (Q-13 e Q-06)\n[Campo Sede a Pé]",
                "<b>OV-10 (242 ovos) e OV-12 (84 ovos)</b><br/><font color=\"#b91c1c\"><b>326 ovos acum.</b></font> (A:41+B:201 | A:64+B:20)",
                "Campo Sede a pé (08h00 às 13h00). Núcleo 100m (R. Oscar de Souza Curty 42 e Ladeira João Alfredo 130) + Perímetro 200m comercial e residencial. Marquises, lajes e calhas."
            ),
            (
                "Equipe 5 (2 ACEs)",
                "Progresso (Q-09)\n[Sede + Caminhonete 2L]",
                "<b>OV-21 • R. Silvio Geraldo França, 753</b><br/><font color=\"#b91c1c\"><b>100 ovos</b></font> (Sem A=100 + Sem B=0)",
                "Campo Sede (08h00 às 13h00) com apoio da Caminhonete (2L). Núcleo 100m (nº 700 a 800) + Perímetro 200m (encosta). Entulho de obras, fundos de vale e caixas baixas."
            )
        ],
        "metas": "Horário Corrido das 08h00 às 13h00 (concentração e abastecimento de Bti/pranchetas às 08h00 no P.A. - Ponto de Apoio). Deslocamento para Barra no Carro 5L (4 ACEs) e 6 ACEs na Sede com apoio da Caminhonete 2L. Meta: 150 imóveis."
    },
    {
        "cod": "TERCA",
        "nome_arquivo": "PLANO_DE_CAMPO_TERCA_FEIRA.pdf",
        "dia_extenso": "TERÇA-FEIRA – BLOQUEIO EM ENCOSTAS E COTAS ALTAS DA SEDE URBANA",
        "territorio": "Val Paraíso, Jd. Centenário, Caixa d'Água, Morro do Estado, Boa Ideia e Botafogo",
        "frota_efetivo": "Horário Corrido: 08h00 às 13h00 (Saída do P.A.) | 10 ACEs (5 Duplas 100% em Campo a pé na Sede + Apoio Caminhonete 2L)",
        "layout_mapas": "3_colunas",
        "mapas_cards": [
            ("output/prints_delimitados/terca_1_val_paraiso.png", "output/mapas_individuais/terca_ov31_val_paraiso.png"),
            ("output/prints_delimitados/terca_2_centenario.png", "output/mapas_individuais/terca_ov05_centenario.png"),
            ("output/prints_delimitados/terca_3_caixa_dagua.png", "output/mapas_individuais/terca_ov35_caixa_dagua.png")
        ],
        "escala_10_agentes": [
            (
                "Equipe 1 (2 ACEs)",
                "Val Paraíso (Q-05)\n[Campo Sede a Pé]",
                "<b>OV-31 (192 ovos) e OV-34 (66 ovos)</b><br/><font color=\"#b91c1c\"><b>258 ovos acum.</b></font> (A:51+B:141 | A:0+B:66)",
                "Saída às 08h00 do P.A. Núcleo 100m (R. Roberto Simões de Araújo 98 e R. Emanuel de Moraes) + Perímetro 200m. Foco em quintais em declive acentuado e tonéis pluviais."
            ),
            (
                "Equipe 2 (2 ACEs)",
                "Jd. Centenário (Q-17)\n[Campo Sede a Pé]",
                "<b>OV-05 (173 ovos), OV-03 (53) e OV-04 (53)</b><br/><font color=\"#b91c1c\"><b>279 ovos acum.</b></font> (OV-05: A=6 + B=167)",
                "Saída às 08h00 do P.A. Núcleo 100m (R. Ernesto Wermelinger 63 e encontro com Celso C. Faria) + Perímetro 200m no Jd. Centenário. Tambores, pratinhos e bromélias."
            ),
            (
                "Equipe 3 (2 ACEs)",
                "Caixa d'Água (Q-13)\n[Sede + Caminhonete 2L]",
                "<b>OV-35 (121 ovos) e OV-13 (71 ovos)</b><br/><font color=\"#b91c1c\"><b>192 ovos acum.</b></font> (A:4+B:117 | A:48+B:23)",
                "Saída às 08h00 do P.A. (apoio da Caminhonete 2L para subida de encosta). Núcleo 100m (R. Senador Dantas 269) + Perímetro 200m. Terrenos baldios, calhas altas e caixas."
            ),
            (
                "Equipe 4 (2 ACEs)",
                "Morro do Estado e Boa Ideia\n[Campo Sede a Pé]",
                "<b>OV-28 (95), OV-08 (93) e OV-15 (78)</b><br/><font color=\"#b91c1c\"><b>266 ovos acum.</b></font> (A:86+B:9 | A:64+B:29 | A:78+B:0)",
                "Saída às 08h00 do P.A. Núcleo 100m (R. Adalberto Pires 45 e perímetros de Boa Ideia) + Perímetro 200m. Varredura em quintais de fundo de vale, barrancos e tonéis."
            ),
            (
                "Equipe 5 (2 ACEs)",
                "Botafogo e Centro\n[Campo Sede a Pé]",
                "<b>OV-16 (89), OV-12 (84) e OV-11 (24)</b><br/><font color=\"#b91c1c\"><b>197 ovos acum.</b></font> (A:0+B:89 | A:64+B:20)",
                "Saída às 08h00 do P.A. Núcleo 100m (R. Soares Brandão, Ladeira João Alfredo e Asilo São Vicente) + Perímetro 200m. Vistoria minuciosa no Asilo e encostas."
            )
        ],
        "metas": "Horário Corrido das 08h00 às 13h00 (saída às 08h00 do P.A. - Ponto de Apoio). Todas as 5 duplas (10 ACEs) 100% em campo a pé nos bairros contíguos da Sede Urbana com apoio da Caminhonete (2 lugares). Meta diária: 150 imóveis."
    },
    {
        "cod": "QUARTA",
        "nome_arquivo": "PLANO_DE_CAMPO_QUARTA_FEIRA.pdf",
        "dia_extenso": "QUARTA-FEIRA – OPERAÇÃO DISTRITAL (INFLUÊNCIA + USINA LIGHT) & CAMPO SEDE",
        "territorio": "Influência (2º Distrito), Usina Light / Ilha dos Pombos e Sede Urbana",
        "frota_efetivo": "Horário Corrido: 08h00 às 13h00 (Saída do P.A.) | 6 ACEs nas 2 Viaturas (Carro 5L + Caminhonete 2L) + 4 ACEs a pé na Sede",
        "layout_mapas": "2_colunas",
        "mapas_cards": [
            ("output/prints_delimitados/quarta_1_influencia.png", "output/mapas_satelite/quarta_influencia.png"),
            ("output/prints_delimitados/quarta_2_usina_light.png", "output/mapas_satelite/quarta_usina_light.png")
        ],
        "escala_10_agentes": [
            (
                "Equipe 1 (2 ACEs)",
                "Influência (Q-05 e Q-11)\n[Viatura Distrital]",
                "<b>OV-36 (222 ovos) e OV-51 (109 ovos)</b><br/><font color=\"#b91c1c\"><b>331 ovos acum.</b></font> (A:53+B:169 | A:3+B:106)",
                "Saída às 08h00 do P.A. Núcleo 100m (R. Manoel Cirilo 116 e R. Maria Machareth 182) + Perímetro 200m. Foco em tonéis de 200L, bebedouros de animais e galinheiros."
            ),
            (
                "Equipe 2 (2 ACEs)",
                "Influência Rodovia (Q-06)\n[Viatura Distrital]",
                "<b>OV-38 (210 ovos) e OV-50 (14 ovos)</b><br/><font color=\"#b91c1c\"><b>224 ovos acum.</b></font> (OV-38: A=25 + B=185)",
                "Saída às 08h00 do P.A. Núcleo 100m (Rodovia BR-116 KM 12) + Perímetro 200m. Foco em borracharias, oficinas mecânicas, pilhas de pneus e pátios."
            ),
            (
                "Equipe 3 (2 ACEs)",
                "Usina Light / Ilha dos Pombos\n[Viatura Distrital]",
                "<b>OV-41 (203), OV-40 (66), OV-39 (30), OV-53 (21)</b><br/><font color=\"#b91c1c\"><b>320 ovos acum.</b></font> (OV-41: A=40 + B=163)",
                "Saída às 08h00 do P.A. Núcleo 100m (Orla da R. Beira Rio 130) + Perímetro 200m. Foco em canoas acumulando água da chuva, lonas plásticas e depósitos de pesca."
            ),
            (
                "Equipe 4 (2 ACEs)",
                "Campo Sede: Progresso e Centenário\n[Em Campo a Pé]",
                "<b>OV-23 (342), OV-21 (100) e OV-05 (173)</b><br/><font color=\"#15803d\"><b>Resgate de Imóveis Fechados (Em Campo)</b></font>",
                "Atuação 100% em campo a pé na Sede (08h00 às 13h00): resgate de imóveis fechados de Segunda/Terça nos perímetros de OV-23, OV-21 e OV-05."
            ),
            (
                "Equipe 5 (2 ACEs)",
                "Campo Sede: Centro e Boa Ideia\n[Em Campo a Pé]",
                "<b>OV-08 (93 ovos), OV-15 (78 ovos) e OV-10</b><br/><font color=\"#15803d\"><b>Bloqueio Complementar & Fechados (Em Campo)</b></font>",
                "Atuação 100% em campo a pé na Sede (08h00 às 13h00): bloqueio complementar em OV-08 [A:64+B:29] e OV-15 [A:78+B:0] + resgate de fechados da OV-10."
            )
        ],
        "metas": "Horário Corrido das 08h00 às 13h00 (saída do P.A.). Respeito estrito à frota: 3 duplas (6 ACEs) nas 2 viaturas (Carro 5L + Caminhonete 2L) para os distritos e 2 duplas (4 ACEs) em campo a pé na Sede. Meta: 170 imóveis."
    },
    {
        "cod": "QUINTA",
        "nome_arquivo": "PLANO_DE_CAMPO_QUINTA_FEIRA.pdf",
        "dia_extenso": "QUINTA-FEIRA – OPERAÇÃO DISTRITAL (PORTO VELHO + PRATA) & CAMPO SEDE",
        "territorio": "Porto Velho do Cunha (3º Distrito), Córrego da Prata (4º Distrito) e Sede Urbana",
        "frota_efetivo": "Horário Corrido: 08h00 às 13h00 (Saída do P.A.) | 6 ACEs nas 2 Viaturas (Carro 5L + Caminhonete 2L) + 4 ACEs a pé na Sede",
        "layout_mapas": "2_colunas",
        "mapas_cards": [
            ("output/prints_delimitados/quinta_1_porto_velho.png", "output/mapas_satelite/quinta_porto_velho.png"),
            ("output/prints_delimitados/quinta_2_corrego_prata.png", "output/mapas_satelite/quinta_corrego_prata.png")
        ],
        "escala_10_agentes": [
            (
                "Equipe 1 (2 ACEs)",
                "Porto Velho do Cunha (Q-01)\n[Viatura Distrital]",
                "<b>OV-45 • R. Major Fajardo, 601</b><br/><font color=\"#b91c1c\"><b>241 ovos</b></font> (Sem A=35 + Sem B=206)",
                "Saída às 08h00 do P.A. Núcleo 100m (Major Fajardo alta nº 550 a 650) + Perímetro 200m ribeirinho. Foco em galpões, caçambas, barcos e recipientes plásticos."
            ),
            (
                "Equipe 2 (2 ACEs)",
                "Porto Velho do Cunha (Q-10)\n[Viatura Distrital]",
                "<b>OV-44 • R. Major Fajardo, 312 (ESF)</b><br/><font color=\"#b91c1c\"><b>102 ovos</b></font> (Sem A=2 + Sem B=100)",
                "Saída às 08h00 do P.A. Núcleo 100m (entorno da ESF Porto Velho e faixa ribeirinha) + Perímetro 200m. Foco em calhas prediais, garrafas e caixas d'água baixas."
            ),
            (
                "Equipe 3 (2 ACEs)",
                "Córrego da Prata (Q-01 e Q-05)\n[Viatura Distrital]",
                "<b>OV-48 (121 ovos) e OV-49 (62 ovos)</b><br/><font color=\"#b91c1c\"><b>183 ovos acum.</b></font> (A:7+B:114 | A:2+B:60)",
                "Saída às 08h00 do P.A. Núcleo 100m (ESF Prata na R. Benfica 48 e R. Alfredo Ferreira) + Perímetro 200m. Foco em calhas de telhado e tambores de água de chuva."
            ),
            (
                "Equipe 4 (2 ACEs)",
                "Campo Sede: Val Paraíso e Morro\n[Em Campo a Pé]",
                "<b>OV-31 (192), OV-28 (95) e OV-34 (66)</b><br/><font color=\"#15803d\"><b>Varredura Complementar & Fechados (Em Campo)</b></font>",
                "Atuação 100% em campo a pé na Sede (08h00 às 13h00): varredura complementar e resgate de imóveis fechados em encostas do Val Paraíso e Morro do Estado."
            ),
            (
                "Equipe 5 (2 ACEs)",
                "Campo Sede: Caixa d'Água e Botafogo\n[Em Campo a Pé]",
                "<b>OV-35 (121), OV-16 (89), OV-13 (71) e OV-12 (84)</b><br/><font color=\"#15803d\"><b>Varredura Complementar & Fechados (Em Campo)</b></font>",
                "Atuação 100% em campo a pé na Sede (08h00 às 13h00): varredura complementar e resgate de imóveis fechados na Caixa d'Água, Botafogo e Ladeira João Alfredo."
            )
        ],
        "metas": "Horário Corrido das 08h00 às 13h00 (saída do P.A.). 3 duplas (6 ACEs) nas 2 viaturas (Carro 5L + Caminhonete 2L) para Porto Velho e Prata; 2 duplas (4 ACEs) 100% em campo a pé na Sede (serviço interno possui equipe própria). Meta: 150 imóveis."
    },
    {
        "cod": "SEXTA",
        "nome_arquivo": "PLANO_DE_CAMPO_SEXTA_FEIRA.pdf",
        "dia_extenso": "SEXTA-FEIRA – VARREDURA GERAL DE FECHADOS (08h–12h) & REUNIÃO NO P.A. (12h–13h)",
        "territorio": "Resgate de Imóveis Fechados (Sede e Distritos) + Reunião Geral de Avaliação no P.A. (Ponto de Apoio)",
        "frota_efetivo": "Horário Corrido: 08h00 às 13h00 | 08h00 às 12h00: 10 ACEs em Campo | 12h00 às 13h00: Reunião Geral no P.A. (Ponto de Apoio)",
        "layout_mapas": "2_colunas",
        "mapas_cards": [
            ("output/prints_delimitados/sexta_1_sede_geral.png", "output/mapas_satelite/sexta_varredura_sede.png"),
            ("output/prints_delimitados/sexta_2_distritos_mosaico.png", "output/mapas_satelite/sexta_varredura_distritos.png")
        ],
        "escala_10_agentes": [
            (
                "Equipe 1 (2 ACEs)",
                "Campo Sede: Progresso e Centenário\n[08h00 às 12h00 • A Pé]",
                "<b>OV-23, OV-21, OV-05, OV-03 e OV-04</b><br/><font color=\"#15803d\"><b>Resgate Final de Imóveis Fechados</b></font>",
                "Saída às 08h00 do P.A. Visita confirmatória em campo (08h00 às 12h00) a 100% dos imóveis fechados no Progresso e Jd. Centenário. Às 12h00: retorno ao P.A."
            ),
            (
                "Equipe 2 (2 ACEs)",
                "Campo Sede: Centro, Caixa e Botafogo\n[08h00 às 12h00 • A Pé]",
                "<b>OV-10, OV-35, OV-16, OV-13 e OV-12</b><br/><font color=\"#15803d\"><b>Resgate Final de Imóveis Fechados</b></font>",
                "Saída às 08h00 do P.A. Recuperação final em campo (08h00 às 12h00) de imóveis pendentes no Centro, Caixa d'Água e Botafogo. Às 12h00: retorno ao P.A."
            ),
            (
                "Equipe 3 (2 ACEs)",
                "Campo Sede: Val Paraíso, Morro e Boa Ideia\n[08h00 às 12h00 • A Pé]",
                "<b>OV-31, OV-28, OV-34, OV-08 e OV-15</b><br/><font color=\"#15803d\"><b>Resgate Final de Imóveis Fechados</b></font>",
                "Saída às 08h00 do P.A. Fechamento em campo (08h00 às 12h00) das pendências de encostas no Val Paraíso, Morro do Estado e Boa Ideia. Às 12h00: retorno ao P.A."
            ),
            (
                "Equipe 4 (2 ACEs)",
                "Campo Distritos: Influência e Barra\n[08h00 às 12h00 • Caminhonete 2L]",
                "<b>Influência (OV-36, OV-38, OV-51) e Barra (OV-55, OV-54)</b><br/><font color=\"#b91c1c\"><b>Resgate Distrital na Caminhonete (2L)</b></font>",
                "Saída às 08h00 do P.A. na Caminhonete (2 lugares) para vistoria de imóveis fechados em Influência e Barra de S. Francisco até 12h00. Às 12h00: retorno ao P.A."
            ),
            (
                "Equipe 5 (2 ACEs)",
                "Campo Distritos: P. Velho, Light e Prata\n[08h00 às 12h00 • Carro 5L]",
                "<b>Porto Velho (OV-45, OV-44), Light (OV-41) e Prata (OV-48, OV-49)</b><br/><font color=\"#b91c1c\"><b>Resgate Distrital no Carro (5L)</b></font>",
                "Saída às 08h00 do P.A. no Carro (5 lugares) para resgate de imóveis fechados em Porto Velho, Usina Light e Córrego da Prata até 12h00. Às 12h00: retorno ao P.A."
            )
        ],
        "metas": "Horário Corrido das 08h00 às 13h00: das 08h00 às 12h00 todas as 5 duplas (10 ACEs) concluem 100% dos resgates em campo; das 12h00 às 13h00 realiza-se a Reunião Técnica Geral de Avaliação Semanal no P.A. (Ponto de Apoio)."
    }
]

def resolver_caminho_mapa(item):
    if isinstance(item, tuple):
        pref, fb = item
        if os.path.exists(pref):
            return pref
        if fb and os.path.exists(fb):
            return fb
        return None
    return item if os.path.exists(item) else None

def gerar_pdf_diario_com_satelite(dados, dest_folder, desktop_folder):
    caminho_local = os.path.join(dest_folder, dados["nome_arquivo"])
    
    doc = SimpleDocTemplate(
        caminho_local,
        pagesize=A4,
        leftMargin=20,
        rightMargin=20,
        topMargin=14,
        bottomMargin=12
    )
    
    styles = getSampleStyleSheet()
    
    st_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11.5,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    st_banner = ParagraphStyle(
        'Banner',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.2,
        leading=11.5,
        textColor=colors.white,
        alignment=1
    )
    st_banner_sub = ParagraphStyle(
        'BannerSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.6,
        textColor=colors.HexColor('#e2e8f0'),
        alignment=1
    )
    st_th = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.0,
        leading=9.0,
        textColor=colors.white,
        alignment=0
    )
    st_td_eq = ParagraphStyle(
        'TDEq',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.4,
        leading=9.6,
        textColor=colors.HexColor('#0f172a')
    )
    st_td = ParagraphStyle(
        'TD',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.0,
        leading=9.2,
        textColor=colors.HexColor('#1e293b')
    )
    st_td_bold = ParagraphStyle(
        'TDBold',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.0,
        leading=9.2,
        textColor=colors.HexColor('#0f172a')
    )
    st_proto = ParagraphStyle(
        'Proto',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.8,
        leading=8.6,
        textColor=colors.HexColor('#7f1d1d')
    )
    st_map_hdr = ParagraphStyle(
        'MapHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=9.5,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=1
    )
    st_metas = ParagraphStyle(
        'Metas',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=6.9,
        leading=8.8,
        textColor=colors.HexColor('#1e293b')
    )
    st_sign_line = ParagraphStyle(
        'SignLine',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=8.5,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    st_sign_lbl = ParagraphStyle(
        'SignLbl',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.0,
        leading=8.8,
        textColor=colors.HexColor('#334155'),
        alignment=1
    )

    story = []
    
    # 1. CABEÇALHO OFICIAL
    header_data = [
        [
            Paragraph("<b>ESTADO DO RIO DE JANEIRO • PREFEITURA MUNICIPAL DE CARMO</b><br/>"
                      "SECRETARIA MUNICIPAL DE SAÚDE • SUBSECRETARIA DE VIGILÂNCIA EM SAÚDE<br/>"
                      "<b>COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES</b><br/>"
                      "PLANO OPERACIONAL DIÁRIO DE CAMPO • HORÁRIO CORRIDO 08h00 ÀS 13h00 • PONTO DE APOIO (P.A.)", st_title)
        ]
    ]
    t_header = Table(header_data, colWidths=[555])
    t_header.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 4))
    
    # 2. BANNER DO DIA
    banner_data = [
        [
            Paragraph(f"<b>{dados['dia_extenso']}</b>", st_banner)
        ],
        [
            Paragraph(f"<b>Território:</b> {dados['territorio']}<br/><b>Jornada e Frota:</b> {dados['frota_efetivo']}", st_banner_sub)
        ]
    ]
    t_banner = Table(banner_data, colWidths=[555])
    t_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0f172a')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_banner)
    story.append(Spacer(1, 4))
    
    # 3. TABELA OPERACIONAL DAS 5 EQUIPES (10 ACEs 100% EM CAMPO)
    table_rows = [
        [
            Paragraph("<b>EQUIPE DE CAMPO</b>", st_th),
            Paragraph("<b>TERRITÓRIO / FROTA</b>", st_th),
            Paragraph("<b>FOCO OVITRAMPA<br/>(SOMA 2 SEMANAS: A + B)</b>", st_th),
            Paragraph("<b>DELIMITAÇÃO OPERACIONAL E DIRETRIZ DE CAMPO (08h00 ÀS 13h00)</b>", st_th)
        ]
    ]
    
    for eq_nome, terr, ovs, acao in dados["escala_10_agentes"]:
        table_rows.append([
            Paragraph(eq_nome, st_td_eq),
            Paragraph(terr.replace("\n", "<br/>"), st_td),
            Paragraph(ovs, st_td_bold),
            Paragraph(acao, st_td)
        ])
        
    t_escala = Table(table_rows, colWidths=[78, 102, 140, 235])
    t_escala.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    story.append(t_escala)
    story.append(Spacer(1, 4))
    
    # 4. QUADRO TÉCNICO DE DELIMITAÇÃO (DIRETRIZES MINISTÉRIO DA SAÚDE / SES-RJ)
    proto_data = [
        [
            Paragraph("<b>DIRETRIZES NORMATIVAS DE CAMPO (MS / SES-RJ) & ORGANIZAÇÃO DE EQUIPE:</b><br/>"
                      "• <b>Raio de 100m (Núcleo Focal Prioritário):</b> Varredura e eliminação mecânica obrigatória de depósitos em 100% dos imóveis e quintais confrontantes.<br/>"
                      "• <b>Raio de 200m (Perímetro Oficial MS):</b> Bloqueio perifocal nos quarteirões adjacentes. <b>Nota:</b> Os 10 ACEs atuam exclusivamente em campo (serviço interno possui equipe própria).", st_proto)
        ]
    ]
    t_proto = Table(proto_data, colWidths=[555])
    t_proto.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fef2f2')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#f87171')),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_proto)
    story.append(Spacer(1, 4))
    
    # 5. HEADER SEÇÃO DE MAPAS
    story.append(Paragraph("<b>MAPAS DE SATÉLITE COM DELIMITAÇÃO DE QUARTEIRÕES E RAIOS DE BLOQUEIO (100m E 200m)</b>", st_map_hdr))
    story.append(Spacer(1, 3))
    
    # 6. TABELA DE MAPAS (3 COLUNAS NA SEGUNDA/TERÇA; 2 COLUNAS NA QUARTA/QUINTA/SEXTA)
    imgs_row = []
    if dados.get("layout_mapas") == "3_colunas":
        for item in dados["mapas_cards"]:
            img_path = resolver_caminho_mapa(item)
            if img_path:
                imgs_row.append(Image(img_path, width=181, height=168))
            else:
                imgs_row.append(Spacer(181, 168))
        t_mapas = Table([imgs_row], colWidths=[185, 185, 185])
    else:
        for item in dados["mapas_cards"]:
            img_path = resolver_caminho_mapa(item)
            if img_path:
                imgs_row.append(Image(img_path, width=272, height=175))
            else:
                imgs_row.append(Spacer(272, 175))
        t_mapas = Table([imgs_row], colWidths=[275, 275])

    t_mapas.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING', (0,0), (-1,-1), 1),
        ('RIGHTPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(t_mapas)
    story.append(Spacer(1, 4))
    
    # 7. METAS E DIRETRIZES LOGÍSTICAS
    metas_data = [
        [
            Paragraph(f"<b>METAS OPERACIONAIS E LOGÍSTICA (P.A. - PONTO DE APOIO):</b> {dados['metas']}", st_metas)
        ]
    ]
    t_metas = Table(metas_data, colWidths=[555])
    t_metas.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_metas)
    story.append(Spacer(1, 4))
    
    # 8. RODAPÉ COM ASSINATURAS NO P.A.
    sign_data = [
        [
            Paragraph("__________________________________________", st_sign_line),
            Paragraph("__________________________________________", st_sign_line),
            Paragraph("Saída / Encontro: <b>P.A.</b>", st_sign_lbl)
        ],
        [
            Paragraph("<b>Supervisor de Campo do Dia (P.A.)</b>", st_sign_lbl),
            Paragraph("<b>Coordenação de Vigilância Ambiental • Carmo/RJ</b>", st_sign_lbl),
            Paragraph("<b>08h00 às 13h00 • ___/___/2026</b>", st_sign_lbl)
        ]
    ]
    t_sign = Table(sign_data, colWidths=[215, 220, 120])
    t_sign.setStyle(TableStyle([
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_sign)
    
    doc.build(story)
    
    reader = pypdf.PdfReader(caminho_local)
    num_pags = len(reader.pages)
    if num_pags != 1:
        print(f"ALERTA: {dados['nome_arquivo']} gerou {num_pags} paginas!")
    else:
        print(f"SUCESSO: {dados['nome_arquivo']} possui EXATAMENTE 1 pagina.")
        
    caminho_desktop = os.path.join(desktop_folder, dados["nome_arquivo"])
    shutil.copyfile(caminho_local, caminho_desktop)
    shutil.copyfile(caminho_local, dados["nome_arquivo"])

def gerar_todos_os_planos_com_satelite():
    dest_folder = "public"
    desktop_folder = r"C:\Users\Almir LK\Desktop\PLANO PARA SEGUNDA"
    os.makedirs(dest_folder, exist_ok=True)
    os.makedirs(desktop_folder, exist_ok=True)
    
    relatorio = []
    for plano in PLANOS_DIARIOS_DATA:
        gerar_pdf_diario_com_satelite(plano, dest_folder, desktop_folder)
        reader = pypdf.PdfReader(os.path.join(dest_folder, plano["nome_arquivo"]))
        relatorio.append({
            "arquivo": plano["nome_arquivo"],
            "paginas": len(reader.pages)
        })
        
    pags_geral = gerar_plano_geral_supervisao()
    relatorio.append({
        "arquivo": "PLANO_GERAL_SEMANAL_COORDENACAO_SUPERVISAO.pdf",
        "paginas": pags_geral
    })

    print("\n=======================================================")
    print("RELATÓRIO DE VALIDAÇÃO DOS PLANOS OPERACIONAIS (A4):")
    for r in relatorio:
        print(f" - {r['arquivo']}: {r['paginas']} página(s) [STATUS: {'PERFEITO' if r['paginas'] == 1 else 'REVISAR'}]")
    print("=======================================================")

if __name__ == '__main__':
    gerar_todos_os_planos_com_satelite()
