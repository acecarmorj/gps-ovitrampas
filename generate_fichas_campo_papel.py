#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera a 'FICHA DIÁRIA DE CAMPO PARA PRANCHETA (MODELO APP EM PAPEL)'.
Permite que o Agente de Endemias (ACE) execute a ação 100% no papel caso não queira
usar o celular pessoal ou caso o aparelho descarregue/fique sem sinal.
Cada página é um dia da semana (Segunda a Sexta), pronta para destacar e grampear.
"""

import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

def gerar_fichas_campo():
    pdf_filename = "FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
    
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=20,
        rightMargin=20,
        topMargin=15,
        bottomMargin=15
    )

    printable_w = doc.width
    styles = getSampleStyleSheet()

    st_title = ParagraphStyle('Title', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, leading=11.5, alignment=TA_CENTER, textColor=colors.HexColor('#0F2942'))
    st_sub = ParagraphStyle('Sub', parent=styles['Normal'], fontName='Helvetica', fontSize=7, leading=8.5, alignment=TA_CENTER, textColor=colors.HexColor('#475569'))
    st_dia_badge = ParagraphStyle('DiaBadge', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=TA_CENTER, textColor=colors.white)
    
    st_card_header = ParagraphStyle('CardH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#0F2942'))
    st_card_sub = ParagraphStyle('CardSub', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8, textColor=colors.HexColor('#475569'))
    st_card_body = ParagraphStyle('CardBody', parent=styles['Normal'], fontName='Helvetica', fontSize=6.2, leading=7.5, textColor=colors.HexColor('#1E293B'))
    st_check = ParagraphStyle('Check', parent=styles['Normal'], fontName='Helvetica', fontSize=6, leading=7.2, textColor=colors.HexColor('#0F172A'))
    st_check_bold = ParagraphStyle('CheckB', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6, leading=7.2, textColor=colors.HexColor('#0F172A'))

    crest_path = 'tmp/pdfs/brasao_carmo_extraido.png'
    if not os.path.exists(crest_path):
        crest_path = 'public/timbres/brasao_carmo.png'

    DIAS_DATA = [
        {
            "dia": "SEGUNDA-FEIRA",
            "tema": "Abertura da Semana • Bloqueio nos 2 Maiores Epicentros Urbanos",
            "territorio": "Progresso & Centro (Sede Urbana)",
            "equipes": "Equipe Alpha (2 ACEs • Apoio da Caminhonete) & Agente Fixa (Influência)",
            "alvos": [
                {
                    "ov": "OV-23",
                    "local": "Pousada Valle do Sol • Rua Manoel José de Moraes, 51",
                    "bairro": "Progresso",
                    "quarteirao": "Q-01",
                    "ovos": "342 OVOS (Nível Crítico de Emergência)",
                    "cor_badge": "#DC2626", # Vermelho
                    "regra": "Vistoriar a Pousada + Quarteirão Completo (cerca de 6 a 8 casas vizinhas para a direita, 6 a 8 para a esquerda, casas de frente e fundos na José Cassane).",
                    "itens_foco": [
                        "Piscina desativada / tanques",
                        "Ralos externos e grelhas",
                        "Tonéis de água de chuva",
                        "Bebedouros de animais",
                        "Pratos de plantas e vasos",
                        "Calhas e tampas de caixa d'água"
                    ]
                },
                {
                    "ov": "OV-10",
                    "local": "Residência / Ponto • Rua Oscar de Souza Curty, 42",
                    "bairro": "Centro",
                    "quarteirao": "Q-13",
                    "ovos": "242 OVOS (Nível Crítico de Emergência)",
                    "cor_badge": "#DC2626",
                    "regra": "Vistoriar o imóvel-foco + trecho comercial e residencial até a Celso C. Faria. Foco especial em marquises de lojas, calhas e lajes com água parada.",
                    "itens_foco": [
                        "Calhas prediais obstruídas",
                        "Marquises comerciais",
                        "Lajes com água empoçada",
                        "Ralos e caixas de gordura",
                        "Vasos e recipientes de lojas",
                        "Caixas d'água no telhado"
                    ]
                },
                {
                    "ov": "OV-21",
                    "local": "Paula Miranda • Rua Silvio Geraldo França, 753",
                    "bairro": "Progresso",
                    "quarteirao": "Q-09",
                    "ovos": "100 OVOS (Alerta Alto / Redução recente)",
                    "cor_badge": "#D97706", # Âmbar
                    "regra": "Vistoriar a casa foco + vizinhos imediatos (trecho do nº 700 ao 800). Foco em fundos de vale, entulho de obras e tambores no nível do solo.",
                    "itens_foco": [
                        "Fundos de vale e vegetação",
                        "Entulho de construção civil",
                        "Tambores e baldes no chão",
                        "Bebedouros de animais",
                        "Bromélias e jardins",
                        "Pneus e descartáveis"
                    ]
                }
            ]
        },
        {
            "dia": "TERÇA-FEIRA",
            "tema": "Bloqueio Vetorial em Encostas e Áreas Elevadas da Sede",
            "territorio": "Jardim Centenário, Val Paraíso e Caixa d'Água",
            "equipes": "Equipe Beta (2 ACEs a pé), Equipe Gama (2 ACEs • Apoio da Caminhonete)",
            "alvos": [
                {
                    "ov": "OV-05",
                    "local": "Residência • Rua Ernesto Wermelinger, 63",
                    "bairro": "Jardim Centenário",
                    "quarteirao": "Q-17",
                    "ovos": "173 OVOS (Crítico Máximo)",
                    "cor_badge": "#DC2626",
                    "regra": "Vistoriar a casa foco + quarteirão no encontro com Celso C. Faria. Foco em tanques de lavar roupa, tonéis e pratos de vasos.",
                    "itens_foco": [
                        "Tambores de lavanderia",
                        "Bromélias em jardins",
                        "Pratos de vasos de plantas",
                        "Caixas d'água sem tampa",
                        "Ralos de quintal",
                        "Garrafas viradas para cima"
                    ]
                },
                {
                    "ov": "OV-31",
                    "local": "Residência • Rua Roberto Simões de Araújo, 98",
                    "bairro": "Val Paraíso",
                    "quarteirao": "Q-05",
                    "ovos": "192 OVOS (Alerta Alto)",
                    "cor_badge": "#D97706",
                    "regra": "Vistoriar a casa foco + vizinhos da Rua Roberto Simões e Emanuel de Moraes. Quintais inclinados e reservatórios de água.",
                    "itens_foco": [
                        "Caixas d'água destampadas",
                        "Tonéis de captação de chuva",
                        "Potes de água de animais",
                        "Ralos sem tela de proteção",
                        "Baldes nos fundos do terreno",
                        "Calhas de telhado entupidas"
                    ]
                },
                {
                    "ov": "OV-35",
                    "local": "Almir Lemgruber • Rua Senador Dantas, 269",
                    "bairro": "Caixa d'Água",
                    "quarteirao": "Q-13",
                    "ovos": "121 OVOS (Alerta Alto)",
                    "cor_badge": "#D97706",
                    "regra": "Vistoriar a residência + terrenos baldios e vizinhos da parte alta da Senador Dantas. Atenção ao descarte de inservíveis e calhas.",
                    "itens_foco": [
                        "Terrenos baldios vizinhos",
                        "Calhas obstruídas por folhas",
                        "Garrafas e latas descartadas",
                        "Pneus velhos",
                        "Caixas d'água no nível do solo",
                        "Ralos externos"
                    ]
                }
            ]
        },
        {
            "dia": "QUARTA-FEIRA",
            "tema": "GRANDE MUTIRÃO DISTRITAL • BLOQUEIO NO DISTRITO DE MAIOR RISCO",
            "territorio": "2º Distrito (Influência) • 557 Ovos Acumulados no Distrito",
            "equipes": "FORÇA-TAREFA: Agente Fixa Local + 6 Agentes da Sede (Carro de 5 lug. + Caminhonete de 2 lug.)",
            "alvos": [
                {
                    "ov": "OV-36",
                    "local": "Residência • Rua Manoel Cirilo da Silva, 116",
                    "bairro": "Influência (2º Dist.)",
                    "quarteirao": "Q-05",
                    "ovos": "222 OVOS (Crítico Máximo)",
                    "cor_badge": "#DC2626",
                    "regra": "Extensão completa da Rua Manoel Cirilo (Q-05). Vistoria minuciosa em quintais rurais, pneus agrícolas e tonéis de água.",
                    "itens_foco": [
                        "Pneus velhos agrícolas",
                        "Tonéis de uso rural/horta",
                        "Baldes e bacias no chão",
                        "Caixas d'água baixas",
                        "Bebedouros de animais",
                        "Ralos e tanques"
                    ]
                },
                {
                    "ov": "OV-38",
                    "local": "Independente • Rodovia BR-116, S/N",
                    "bairro": "Influência (2º Dist.)",
                    "quarteirao": "Q-06",
                    "ovos": "210 OVOS (Crítico Máximo)",
                    "cor_badge": "#DC2626",
                    "regra": "Margens da Rodovia BR-116. Vistoria intensiva em borracharias, oficinas mecânicas, carcaças de veículos e galpões abertos.",
                    "itens_foco": [
                        "Pilhas de pneus de borracharia",
                        "Carcaças e peças de veículos",
                        "Tambores de lavagem de peças",
                        "Canaletas de escoamento da BR",
                        "Galpões com acúmulo de água",
                        "Lonas plásticas dobradas"
                    ]
                },
                {
                    "ov": "OV-51",
                    "local": "Residência • Rua Maria da Silva Machareth, 182",
                    "bairro": "Influência (2º Dist.)",
                    "quarteirao": "Q-11",
                    "ovos": "109 OVOS (Alerta Alto)",
                    "cor_badge": "#D97706",
                    "regra": "Rua Maria da Silva Machareth. Tambores de captação de chuva, caixas d'água baixas e recipientes sombreados em quintais úmidos.",
                    "itens_foco": [
                        "Tambores de captação de chuva",
                        "Tanques e bacias sem tampa",
                        "Bebedouros de aves e cães",
                        "Caixas d'água no nível do solo",
                        "Pratos de plantas em varandas",
                        "Calhas de telhado"
                    ]
                }
            ]
        },
        {
            "dia": "QUINTA-FEIRA",
            "tema": "Bloqueio Vetorial nos Distritos do Eixo Leste e Usina",
            "territorio": "Porto Velho do Cunha (5º Dist.) e Ilha dos Pombos",
            "equipes": "Equipe Delta (3 ACEs no Carro de 5 lugares) & Agente Fixa (Influência)",
            "alvos": [
                {
                    "ov": "OV-45",
                    "local": "Residência / Ponto • Rua Major Fajardo, 601",
                    "bairro": "Porto Velho do Cunha",
                    "quarteirao": "Q-01",
                    "ovos": "241 OVOS (Crítico Máximo)",
                    "cor_badge": "#DC2626",
                    "regra": "Rua Major Fajardo (nº 550 ao 650) e faixa beira-rio. Caçambas, carretas com água parada, plásticos e fundos de quintal ribeirinhos.",
                    "itens_foco": [
                        "Carretas e caçambas abertas",
                        "Recipientes e lonas de pesca",
                        "Fundos de quintal beira-rio",
                        "Tambores de captação de chuva",
                        "Bebedouros de animais",
                        "Calhas prediais"
                    ]
                },
                {
                    "ov": "OV-44",
                    "local": "Entorno da ESF Porto Velho • Rua Major Fajardo, 312",
                    "bairro": "Porto Velho do Cunha",
                    "quarteirao": "Q-10",
                    "ovos": "102 OVOS (Alerta Alto)",
                    "cor_badge": "#D97706",
                    "regra": "Entorno do Posto de Saúde (nº 280 ao 350). Vistoria predial, caixas d'água sem tampa, calhas e garrafas retornáveis.",
                    "itens_foco": [
                        "Entorno do Posto de Saúde (ESF)",
                        "Caixas d'água sem tampa",
                        "Calhas de telhado",
                        "Garrafas retornáveis",
                        "Ralos e canaletas",
                        "Vasos e pratos de plantas"
                    ]
                },
                {
                    "ov": "OV-41",
                    "local": "Residência / Orla • Rua Beira Rio, 130",
                    "bairro": "Ilha dos Pombos",
                    "quarteirao": "Q-01",
                    "ovos": "203 OVOS (Crítico Máximo)",
                    "cor_badge": "#DC2626",
                    "regra": "Ao longo da orla do Rio Paraíba (Rua Beira Rio). Canoas e embarcações com água de chuva, lonas plásticas e depósitos de pesca.",
                    "itens_foco": [
                        "Canoas com água de chuva",
                        "Lonas plásticas dobradas",
                        "Tambores de combustível/óleo",
                        "Tranqueiras de pesca",
                        "Caixas d'água baixas",
                        "Bebedouros de animais"
                    ]
                }
            ]
        },
        {
            "dia": "SEXTA-FEIRA",
            "tema": "Bloqueio nos Distritos Limítrofes e Fechamento Semanal de Pendências",
            "territorio": "Barra de São Francisco, Córrego da Prata e Sede Urbana",
            "equipes": "Equipe Delta (Carro de 5 lugares nos distritos) & Equipes Alpha/Beta (Sede Urbana)",
            "alvos": [
                {
                    "ov": "OV-55",
                    "local": "Residência Rural • Rua Antônio R. Serafim, S/N",
                    "bairro": "Barra de S. Francisco",
                    "quarteirao": "Q-01",
                    "ovos": "125 OVOS (Alerta Alto)",
                    "cor_badge": "#D97706",
                    "regra": "Rua Antônio R. Serafim e Sebastião Ferreira Costa. Bebedouros de animais de porte rural, tambores e recipientes em quintais amplos.",
                    "itens_foco": [
                        "Bebedouros de gado/cavalos",
                        "Tambores rurais sem tampa",
                        "Pneus de tratores/maquinário",
                        "Bacias de quintal",
                        "Caixas d'água no solo",
                        "Calhas rurais"
                    ]
                },
                {
                    "ov": "OV-48",
                    "local": "Entorno da ESF Prata • Rua Benfica, 48",
                    "bairro": "Córrego da Prata",
                    "quarteirao": "Q-01",
                    "ovos": "121 OVOS (Alerta Alto)",
                    "cor_badge": "#D97706",
                    "regra": "Rua Benfica e entorno da ESF de Prata. Calhas de telhado, recipientes plásticos descartáveis e caixas d'água no nível do solo.",
                    "itens_foco": [
                        "Entorno do Posto de Saúde (ESF)",
                        "Caixas d'água baixas",
                        "Calhas de telhado",
                        "Descarte de embalagens plásticas",
                        "Ralos externos",
                        "Bebedouros de animais"
                    ]
                },
                {
                    "ov": "SEDE",
                    "local": "Imóveis Fechados & Pendências • Progresso, Centro e Jd. Centenário",
                    "bairro": "Sede Urbana",
                    "quarteirao": "Geral",
                    "ovos": "REVISÃO GERAL (Fechamento)",
                    "cor_badge": "#0B6FA4", # Azul
                    "regra": "Equipes da sede retornam às residências que estavam fechadas ou desocupadas na segunda e terça-feira para garantir 100% de cobertura.",
                    "itens_foco": [
                        "Retorno a imóveis fechados",
                        "Imóveis com recusa inicial",
                        "Terrenos murados suspeitos",
                        "Lançamento dos dados no sistema",
                        "Contabilização dos focos",
                        "Relatório final à coordenação"
                    ]
                }
            ]
        }
    ]

    story = []

    for idx_dia, dia_info in enumerate(DIAS_DATA):
        if idx_dia > 0:
            story.append(PageBreak())

        # 1. CABEÇALHO DO DIA
        img_crest = Image(crest_path, width=28, height=34) if os.path.exists(crest_path) else ""
        header_text = [
            Paragraph("<b>PREFEITURA MUNICIPAL DE CARMO • SECRETARIA MUNICIPAL DE SAÚDE</b>", st_title),
            Paragraph("COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES • CARMO/RJ", ParagraphStyle('H2', parent=st_title, fontSize=7.5, leading=9.5)),
            Paragraph(f"<b>FICHA DE CAMPO PARA PRANCHETA • OPERAÇÃO {dia_info['dia']}</b>", ParagraphStyle('H3', parent=st_title, fontSize=9, leading=11, textColor=colors.HexColor('#0F2942'))),
            Paragraph(f"<b>Missão:</b> {dia_info['tema']} • <b>Território:</b> {dia_info['territorio']}", st_sub)
        ]
        t_header = Table([[img_crest, header_text]], colWidths=[35, printable_w - 35])
        t_header.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(t_header)
        story.append(Spacer(1, 2))

        # 2. BOX DE IDENTIFICAÇÃO DO AGENTE (PARA PREENCHER A CANETA)
        campos_agente = [
            [
                Paragraph("<b>Agente (ACE):</b> ____________________________________", st_card_body),
                Paragraph("<b>Dupla / Colega:</b> ____________________________________", st_card_body),
                Paragraph("<b>Data:</b> ____/____/2026", st_card_body)
            ],
            [
                Paragraph(f"<b>Equipe Responsável:</b> {dia_info['equipes']}", ParagraphStyle('Eq', parent=st_card_body, textColor=colors.HexColor('#0F2942'))),
                Paragraph("<b>Viatura Utilizada:</b> [  ] Carro 5 Lugares   [  ] Caminhonete   [  ] A Pé", st_card_body),
                Paragraph("<b>Horário:</b> ___:___ às ___:___", st_card_body)
            ]
        ]
        t_campos = Table(campos_agente, colWidths=[printable_w * 0.42, printable_w * 0.38, printable_w * 0.20])
        t_campos.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_campos)
        story.append(Spacer(1, 3))

        # 3. REGRA DE CAMPO PRÁTICA (COMO FAZER SEM TRENA)
        regra_box = Paragraph(
            "<b>🎯 REGRA DE OURO PARA O AGENTE (SEM TRENA):</b> Chegando ao endereço da armadilha, vistorie o imóvel sede e caminhe na rua vistoriando os vizinhos (cerca de 6 a 8 casas para cada lado, casas da frente e fundos). Marque abaixo os criadouros inspecionados e eliminados na hora!",
            ParagraphStyle('R', parent=st_sub, fontSize=6.5, leading=8, alignment=TA_LEFT, textColor=colors.HexColor('#991B1B'))
        )
        t_regra = Table([[regra_box]], colWidths=[printable_w])
        t_regra.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF2F2')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#FCA5A5')),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t_regra)
        story.append(Spacer(1, 3))

        # 4. OS 3 CARDS DE ALVOS DO DIA (ESTILO APP NO PAPEL)
        for alvo in dia_info['alvos']:
            # Cabeçalho do Card
            header_card_content = [
                Paragraph(f"<b>{alvo['ov']} • {alvo['local']}</b>", st_card_header),
                Paragraph(f"<b>Bairro:</b> {alvo['bairro']} • <b>Quarteirão:</b> {alvo['quarteirao']}", st_card_sub),
                Paragraph(f"<b>Carga da Palheta:</b> <font color='{alvo['cor_badge']}'><b>{alvo['ovos']}</b></font>", st_card_sub),
                Paragraph(f"<b>O que fazer na rua:</b> {alvo['regra']}", ParagraphStyle('Reg', parent=st_card_body, fontSize=6.2, leading=7.5, textColor=colors.HexColor('#0F2942')))
            ]

            # Lista de Checklist com quadradinhos para marcar a caneta
            col_check_1 = [
                Paragraph(f"[  ] {alvo['itens_foco'][0]}", st_check),
                Paragraph(f"[  ] {alvo['itens_foco'][1]}", st_check),
                Paragraph(f"[  ] {alvo['itens_foco'][2]}", st_check),
            ]
            col_check_2 = [
                Paragraph(f"[  ] {alvo['itens_foco'][3]}", st_check),
                Paragraph(f"[  ] {alvo['itens_foco'][4]}", st_check),
                Paragraph(f"[  ] {alvo['itens_foco'][5]}", st_check),
            ]
            col_anotacao = [
                Paragraph("<b>Casas Vizinhas Vistoriadas (Anotar nºs):</b>", st_check_bold),
                Paragraph("Nºs: ____________________________________________", st_check),
                Paragraph("<b>Focos Eliminados:</b> [  ] Sim  Qtd: ____  |  <b>Orientado:</b> [  ] Sim", st_check),
                Paragraph("<b>Situação:</b> [  ] Trabalhado   [  ] Fechado   [  ] Recusado", st_check_bold)
            ]

            t_card_inner = Table([
                [header_card_content, ""],
            ], colWidths=[printable_w * 0.98, 0])

            t_checks = Table([
                [col_check_1, col_check_2, col_anotacao]
            ], colWidths=[printable_w * 0.30, printable_w * 0.30, printable_w * 0.40])
            t_checks.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ('LEFTPADDING', (0, 0), (-1, -1), 2),
                ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ]))

            card_bloco = Table([
                [header_card_content],
                [t_checks]
            ], colWidths=[printable_w])
            card_bloco.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FFFFFF')),
                ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#94A3B8')),
                ('LINEBELOW', (0, 0), (-1, 0), 0.4, colors.HexColor('#E2E8F0')),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(card_bloco)
            story.append(Spacer(1, 2))

        # 5. ROTEIRO DE ABORDAGEM & ASSINATURA NO RODAPÉ
        rodape_bloco = [
            Paragraph(
                "<b>ROTEIRO DOS 5 PASSOS NO IMÓVEL:</b> "
                "<b>1.</b> Abordar com crachá e explicar o monitoramento de ovitrampas. | "
                "<b>2. Chão:</b> Pratos de plantas, baldes, garrafas e ralos. | "
                "<b>3. Meia Altura:</b> Tanques de lavar e tonéis (exigir tela/tampa). | "
                "<b>4. Alto:</b> Calhas de telhado e tampa da caixa d'água. | "
                "<b>5. Eliminar na hora:</b> Furar, virar ou descartar. Não deixar água parada!",
                ParagraphStyle('Rodape', parent=st_card_body, fontSize=5.6, leading=6.8, textColor=colors.HexColor('#334155'))
            ),
            Spacer(1, 1),
            Table([
                [
                    Paragraph("Assinatura do Agente (ACE): ____________________________________", ParagraphStyle('S1', parent=st_card_body, fontSize=5.8)),
                    Paragraph("Visto do Supervisor: ____________________________________", ParagraphStyle('S2', parent=st_card_body, fontSize=5.8, alignment=TA_RIGHT))
                ]
            ], colWidths=[printable_w * 0.55, printable_w * 0.45])
        ]
        t_rodape = Table([[rodape_bloco]], colWidths=[printable_w])
        t_rodape.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
            ('BOX', (0, 0), (-1, -1), 0.4, colors.HexColor('#94A3B8')),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_rodape)

    doc.build(story)
    print(f"[OK] Ficha de Campo para Prancheta gerada em: {pdf_filename}")

    desktop_path = r"C:\Users\Almir LK\Desktop\FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
    public_path = r"public\FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"

    try:
        shutil.copy(pdf_filename, desktop_path)
        print(f"[OK] Copia salva na Area de Trabalho: {desktop_path}")
    except Exception as e:
        print(f"[AVISO] Falha ao copiar para Desktop: {e}")

    try:
        shutil.copy(pdf_filename, public_path)
        print(f"[OK] Copia salva em public: {public_path}")
    except Exception as e:
        print(f"[AVISO] Falha ao copiar para public: {e}")

if __name__ == "__main__":
    gerar_fichas_campo()
