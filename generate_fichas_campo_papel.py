#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera a Ficha Oficial de Campo para Prancheta em Papel A4 (Segunda a Sexta).
Layout Amplo, Sem Espaço Sobrando, Tipografia Legível (sem texto espremido)
Classificação Completa de Criadouros (Ministério da Saúde / PNCD: A1, A2, B, C, D1, D2, E).
Prefeitura Municipal de Carmo / Secretaria Municipal de Saúde / Vigilância Ambiental
"""

import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing

def make_qr_code(url, size=44):
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    d = Drawing(size, size, transform=[size / w, 0, 0, size / h, -bounds[0] * size / w, -bounds[1] * size / h])
    d.add(qr)
    return d

DIAS_CONFIG = [
    {
        "dia_cod": "segunda",
        "dia_nome": "SEGUNDA-FEIRA",
        "tema": "Abertura da Semana • Bloqueio nos 2 Maiores Epicentros Urbanos",
        "bairros": "Progresso e Centro",
        "equipe_sugerida": "Equipe Alpha (2) + Beta (2) • Apoio da Caminhonete",
        "alvos": [
            {
                "ov": "OV-23",
                "local": "Pousada Valle do Sol",
                "morador": "Pousada Valle do Sol",
                "endereco": "Rua Manoel José de Moraes, 51",
                "bairro": "Progresso",
                "quarteirao": "Q-01",
                "ovos": "342 OVOS (NÍVEL CRÍTICO DE EMERGÊNCIA)",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Vistoriar a pousada e imóveis confrontantes do Q-01 e R. José Cassane. Perímetro 200m (MS): Varredura nos quarteirões adjacentes do Progresso.",
            },
            {
                "ov": "OV-10",
                "local": "Residência Monitorada",
                "morador": "Clea Suely / Residente",
                "endereco": "Rua Oscar de Souza Curty, 42",
                "bairro": "Centro",
                "quarteirao": "Q-13",
                "ovos": "242 OVOS (NÍVEL CRÍTICO DE EMERGÊNCIA)",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Quarteirão comercial e residencial entre Oscar Curty e Celso C. Faria. Perímetro 200m (MS): Marquises, lajes e comércios da área central.",
            },
            {
                "ov": "OV-21",
                "local": "Residência Monitorada",
                "morador": "Paula Miranda",
                "endereco": "Rua Silvio Geraldo França, 753",
                "bairro": "Progresso",
                "quarteirao": "Q-09",
                "ovos": "100 OVOS (NÍVEL DE ALERTA)",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: R. Silvio Geraldo França (nº 700 a 800). Perímetro 200m (MS): Encosta, fundos de vale e terrenos baldios do Progresso.",
            }
        ]
    },
    {
        "dia_cod": "terca",
        "dia_nome": "TERÇA-FEIRA",
        "tema": "Bloqueio Vetorial em Encostas e Áreas Elevadas da Sede",
        "bairros": "Jd. Centenário, Val Paraíso e Caixa d'Água",
        "equipe_sugerida": "Equipe Beta (2) + Gama (2) • Apoio da Caminhonete",
        "alvos": [
            {
                "ov": "OV-05",
                "local": "Residência Monitorada",
                "morador": "Manoel Ezidio / Residente",
                "endereco": "Rua Ernesto Wermelinger, 63",
                "bairro": "Jardim Centenário",
                "quarteirao": "Q-17",
                "ovos": "173 OVOS (NÍVEL CRÍTICO)",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Quarteirão Q-17 entre R. Ernesto Wermelinger e Celso C. Faria. Perímetro 200m (MS): Tambores, bromélias e caixas d'água no solo.",
            },
            {
                "ov": "OV-31",
                "local": "Residência Monitorada",
                "morador": "Rosimeri / Residente",
                "endereco": "Rua Roberto Simões de Araújo, 98",
                "bairro": "Val Paraíso",
                "quarteirao": "Q-05",
                "ovos": "192 OVOS (NÍVEL DE ALERTA ALTO)",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: R. Roberto Simões e Emanuel de Moraes (declive acentuado). Perímetro 200m (MS): Quintais em declive e lavanderias externas.",
            },
            {
                "ov": "OV-35",
                "local": "Almir Lemgruber",
                "morador": "Almir Lemgruber",
                "endereco": "Rua Senador Dantas, 269",
                "bairro": "Caixa d'Água",
                "quarteirao": "Q-13",
                "ovos": "121 OVOS (NÍVEL DE ALERTA)",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: Trecho superior da R. Senador Dantas. Perímetro 200m (MS): Terrenos baldios, calhas altas e caixas de gordura abertas.",
            }
        ]
    },
    {
        "dia_cod": "quarta",
        "dia_nome": "QUARTA-FEIRA",
        "tema": "GRANDE MUTIRÃO DISTRITAL • BLOQUEIO NO DISTRITO DE MAIOR RISCO",
        "bairros": "Influência (2º Distrito) • Força-Tarefa de 7 Agentes",
        "equipe_sugerida": "7 Agentes Integrados (Alpha + Beta + Delta) • Van/Carro 5 Lugares",
        "alvos": [
            {
                "ov": "OV-36",
                "local": "Residência Monitorada",
                "morador": "Silvana / Residente",
                "endereco": "Rua Manoel Cirilo da Silva, 116",
                "bairro": "Influência (2º Dist.)",
                "quarteirao": "Q-05",
                "ovos": "222 OVOS (NÍVEL CRÍTICO)",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Extensão habitada da R. Manoel Cirilo (Q-05). Perímetro 200m (MS): Galinheiros, tonéis de captação de chuva e quintais rurais.",
            },
            {
                "ov": "OV-38",
                "local": "Ponto Independente",
                "morador": "Oficina / Comércio Local",
                "endereco": "Rodovia BR-116, KM 12 (Posto/Oficina)",
                "bairro": "Influência (BR-116)",
                "quarteirao": "Q-06",
                "ovos": "210 OVOS (NÍVEL CRÍTICO)",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Borracharias, oficinas mecânicas e galpões da BR-116. Perímetro 200m (MS): Pilhas de pneus, carcaças de veículos e canaletas.",
            },
            {
                "ov": "OV-51",
                "local": "Residência Monitorada",
                "morador": "Aline / Residente",
                "endereco": "Rua Maria da Silva Machareth, 182",
                "bairro": "Influência (2º Dist.)",
                "quarteirao": "Q-11",
                "ovos": "109 OVOS (NÍVEL DE ALERTA)",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: R. Maria da Silva Machareth. Perímetro 200m (MS): Tambores de água de chuva, fossas e caixas d'água sem tampa no solo.",
            }
        ]
    },
    {
        "dia_cod": "quinta",
        "dia_nome": "QUINTA-FEIRA",
        "tema": "Bloqueio Vetorial nos Distritos do Eixo Leste e Usina Hidrelétrica",
        "bairros": "Porto Velho do Cunha e Ilha dos Pombos / Usina Light",
        "equipe_sugerida": "Equipe Delta (3 ACEs) • Viatura Distrital",
        "alvos": [
            {
                "ov": "OV-45",
                "local": "Residência Monitorada",
                "morador": "Lindomar / Residente",
                "endereco": "Rua Major Fajardo, 601",
                "bairro": "Porto Velho do Cunha",
                "quarteirao": "Q-01",
                "ovos": "241 OVOS (NÍVEL CRÍTICO DE EMERGÊNCIA)",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: R. Major Fajardo (altura nº 550 a 650). Perímetro 200m (MS): Galpões, caçambas, faixa ribeirinha e recipientes plásticos.",
            },
            {
                "ov": "OV-44",
                "local": "Entorno da ESF Porto Velho",
                "morador": "Posto de Saúde e Vizinhos",
                "endereco": "Rua Major Fajardo, 312",
                "bairro": "Porto Velho do Cunha",
                "quarteirao": "Q-10",
                "ovos": "102 OVOS (NÍVEL DE ALERTA)",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: Entorno imediato da ESF Porto Velho. Perímetro 200m (MS): Calhas prediais, garrafas retornáveis e caixas d'água baixas.",
            },
            {
                "ov": "OV-41",
                "local": "Residência Ribeirinha",
                "morador": "Dayse Regina / Residente",
                "endereco": "Rua Beira Rio, 130",
                "bairro": "Ilha dos Pombos / Usina Light",
                "quarteirao": "Q-01",
                "ovos": "203 OVOS (NÍVEL CRÍTICO DE EMERGÊNCIA)",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Orla da R. Beira Rio em Ilha dos Pombos. Perímetro 200m (MS): Canoas acumulando chuva, lonas plásticas e depósitos de pesca.",
            }
        ]
    },
    {
        "dia_cod": "sexta",
        "dia_nome": "SEXTA-FEIRA",
        "tema": "Bloqueio nos Distritos Limítrofes e Fechamento Semanal de Pendências",
        "bairros": "Barra de São Francisco, Córrego da Prata e Revisão na Sede",
        "equipe_sugerida": "Equipe Delta (Distritos) + Equipes Alpha e Beta (Revisão da Sede)",
        "alvos": [
            {
                "ov": "OV-55",
                "local": "Propriedade Rural",
                "morador": "Solange / Residente",
                "endereco": "Rua Antônio R. Serafim, S/N",
                "bairro": "Barra de São Francisco",
                "quarteirao": "Q-01",
                "ovos": "125 OVOS (NÍVEL DE ALERTA)",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: R. Antônio Serafim e Sebastião Costa. Perímetro 200m (MS): Bebedouros de criação, carcaças de veículos e depósitos rurais.",
            },
            {
                "ov": "OV-48",
                "local": "Entorno da ESF Prata",
                "morador": "Posto de Saúde e Residências",
                "endereco": "Rua Benfica, 48",
                "bairro": "Córrego da Prata",
                "quarteirao": "Q-01",
                "ovos": "121 OVOS (NÍVEL DE ALERTA)",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: Entorno da ESF Prata e R. Benfica. Perímetro 200m (MS): Calhas de telhado, recipientes descartáveis e caixas d'água no solo.",
            },
            {
                "ov": "SEDE-REVISAO",
                "local": "Imóveis Fechados da Sede",
                "morador": "Casas Pendentes de Vistoria",
                "endereco": "Progresso, Centro e Jd. Centenário",
                "bairro": "Sede Urbana",
                "quarteirao": "Revisão",
                "ovos": "VARREDURA DE IMÓVEIS FECHADOS",
                "cor_badge": "#0F2942",
                "instrucao": "Retorno programado aos imóveis fechados no início da semana para garantir 100% de cobertura nos núcleos de 100m.",
            }
        ]
    }
]

def gerar_fichas_impressas():
    pdf_filename = "FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
    
    # Margens equilibradas de 14mm para aproveitar 100% da página A4 sem desperdício
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=32,
        rightMargin=32,
        topMargin=22,
        bottomMargin=22
    )

    printable_w = doc.width
    styles = getSampleStyleSheet()

    st_title_main = ParagraphStyle('TitleMain', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10.5, leading=12.5, alignment=TA_CENTER, textColor=colors.HexColor('#0F2942'))
    st_sub_main = ParagraphStyle('SubMain', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9.5, alignment=TA_CENTER, textColor=colors.HexColor('#475569'))
    
    st_dia_badge = ParagraphStyle('DiaBadge', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, leading=11.5, alignment=TA_CENTER, textColor=colors.white)
    st_dia_desc = ParagraphStyle('DiaDesc', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#0F2942'))
    
    st_th = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.8, leading=8, alignment=TA_CENTER, textColor=colors.white)
    st_td = ParagraphStyle('TD', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8, textColor=colors.HexColor('#0F172A'))
    st_td_bold = ParagraphStyle('TDBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=8, textColor=colors.HexColor('#0F172A'))
    st_td_center = ParagraphStyle('TDCenter', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))
    st_td_center_bold = ParagraphStyle('TDCenterBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))

    st_card_header = ParagraphStyle('CH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, leading=10.5, textColor=colors.HexColor('#0F2942'))
    st_card_sub = ParagraphStyle('CS', parent=styles['Normal'], fontName='Helvetica', fontSize=7, leading=8.5, textColor=colors.HexColor('#334155'))
    st_card_instrucao = ParagraphStyle('CI', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.8, leading=8.2, textColor=colors.HexColor('#991B1B'))

    story = []

    crest_path = 'tmp/pdfs/brasao_carmo_extraido.png'
    if not os.path.exists(crest_path):
        crest_path = 'public/timbres/brasao_carmo.png'
    img_brasao = Image(crest_path, width=32, height=32) if os.path.exists(crest_path) else None

    qr_flowable = make_qr_code("https://gps-ovitrampas-demo.pages.dev/acao", size=36)

    total_dias = len(DIAS_CONFIG)

    for idx_dia, dia_info in enumerate(DIAS_CONFIG):
        if idx_dia > 0:
            story.append(PageBreak())

        # 1. CABEÇALHO OFICIAL DO MUNICÍPIO
        cab_texto = [
            Paragraph("<b>PREFEITURA MUNICIPAL DE CARMO • SECRETARIA MUNICIPAL DE SAÚDE</b>", st_title_main),
            Paragraph("COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES", st_sub_main),
            Paragraph("<b>FICHA DE CAMPO PARA PRANCHETA • BLOQUEIO FOCAL E PERIFOCAL (MS / SES-RJ)</b>", ParagraphStyle('FichaH', parent=st_sub_main, fontSize=8, leading=9.5, textColor=colors.HexColor('#0F2942'))),
        ]
        t_cab = Table([[img_brasao or '', cab_texto, qr_flowable]], colWidths=[36, printable_w - 78, 42])
        t_cab.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(t_cab)
        story.append(Spacer(1, 2))

        # 2. FAIXA DO DIA DA SEMANA E TERRITÓRIO
        faixa_dia = Table([
            [
                Paragraph(f"<b>{dia_info['dia_nome']}</b>", st_dia_badge),
                Paragraph(f"<b>Território:</b> {dia_info['bairros']} | <b>Logística:</b> {dia_info['equipe_sugerida']}", st_dia_desc)
            ]
        ], colWidths=[90, printable_w - 90])
        faixa_dia.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#0F2942')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#F1F5F9')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#0F2942')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(faixa_dia)
        story.append(Spacer(1, 2))

        # 3. IDENTIFICAÇÃO DA EQUIPE DE AGENTES
        campos_agente = [
            [
                Paragraph("<b>Agente de Combate às Endemias (ACE 1):</b> __________________________________", st_td_bold),
                Paragraph("<b>Agente Parceiro (ACE 2):</b> __________________________________", st_td_bold),
                Paragraph("<b>Data da Ação:</b> ____/____/2026", st_td_bold)
            ]
        ]
        t_campos = Table(campos_agente, colWidths=[printable_w * 0.40, printable_w * 0.40, printable_w * 0.20])
        t_campos.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_campos)
        story.append(Spacer(1, 2))

        # 4. DIRETRIZ NORMATIVA OFICIAL DOS RAIOS (MS / SES-RJ)
        box_diretriz = Table([
            [
                Paragraph("<b>🎯 DIRETRIZ NORMATIVA DE BLOQUEIO (MS / SES-RJ):</b> "
                          "<b>🔴 Raio 100m (Núcleo Focal Prioritário):</b> Varredura em 100% dos imóveis e quintais lindeiros/confrontantes com eliminação mecânica imediata de criadouros. "
                          "<b>🟠 Raio 200m (Perímetro Oficial MS):</b> Bloqueio perifocal de contenção em até 9 quarteirões vizinhos em áreas de alta carga.", ParagraphStyle('Dir', parent=st_td, fontSize=6.5, leading=8, textColor=colors.HexColor('#991B1B')))
            ]
        ], colWidths=[printable_w])
        box_diretriz.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF2F2')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#FCA5A5')),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(box_diretriz)
        story.append(Spacer(1, 2))

        # 5. OS 3 CARDS DE EPICENTROS DO DIA COM A TABELA COMPLETA DE CRIADOUROS (A1, A2, B, C, D1, D2, E)
        for alvo in dia_info['alvos']:
            # Cabeçalho do Alvo
            cabecalho_alvo = [
                Paragraph(f"<b>{alvo['ov']} • {alvo['local']}</b> ({alvo['morador']})", st_card_header),
                Paragraph(f"<b>Endereço:</b> {alvo['endereco']} • <b>Bairro:</b> {alvo['bairro']} • <b>Quarteirão:</b> {alvo['quarteirao']} • <b>Carga:</b> <font color='{alvo['cor_badge']}'><b>{alvo['ovos']}</b></font>", st_card_sub),
                Paragraph(f"<b>Delimitação Operacional:</b> {alvo['instrucao']}", st_card_instrucao)
            ]

            # TABELA COMPLETA DE VISTORIA DE DEPÓSITOS (CLASSIFICAÇÃO PNCD / MINISTÉRIO DA SAÚDE)
            tabela_criadouros = [
                [
                    Paragraph("Cód.", st_th),
                    Paragraph("Categoria do Depósito (Ministério da Saúde - PNCD)", st_th),
                    Paragraph("Insp.", st_th),
                    Paragraph("Foco (+)", st_th),
                    Paragraph("Ação Executada (Marcar [X])", st_th)
                ],
                [
                    Paragraph("<b>A1</b>", st_td_center_bold),
                    Paragraph("Caixa d'água elevada / Reservatórios altos", st_td),
                    Paragraph("[  ]", st_td_center), Paragraph("[  ]", st_td_center),
                    Paragraph("[  ] Vedado / Telado   [  ] Tratado com Larvicida", st_td)
                ],
                [
                    Paragraph("<b>A2</b>", st_td_center_bold),
                    Paragraph("Depósito no solo p/ armazenamento (tonel 200L, tambor, cisterna, tina)", st_td),
                    Paragraph("[  ]", st_td_center), Paragraph("[  ]", st_td_center),
                    Paragraph("[  ] Vedado / Telado   [  ] Esvaziado   [  ] Tratado", st_td)
                ],
                [
                    Paragraph("<b>B</b>", st_td_center_bold),
                    Paragraph("Pequenos depósitos móveis (pratos de plantas, bebedouros de animais, vasos)", st_td),
                    Paragraph("[  ]", st_td_center), Paragraph("[  ]", st_td_center),
                    Paragraph("[  ] Eliminado na hora   [  ] Escovado e Virado", st_td)
                ],
                [
                    Paragraph("<b>C</b>", st_td_center_bold),
                    Paragraph("Depósitos fixos (ralos externos/grelhas, piscinas desativadas, canaletas, calhas)", st_td),
                    Paragraph("[  ]", st_td_center), Paragraph("[  ]", st_td_center),
                    Paragraph("[  ] Telado / Desobstruído   [  ] Tratado Larvicida", st_td)
                ],
                [
                    Paragraph("<b>D1</b>", st_td_center_bold),
                    Paragraph("Pneus e materiais rodantes (carros, caminhões, tratores e implementos)", st_td),
                    Paragraph("[  ]", st_td_center), Paragraph("[  ]", st_td_center),
                    Paragraph("[  ] Coberto / Abrigado   [  ] Recolhido p/ Descarte", st_td)
                ],
                [
                    Paragraph("<b>D2</b>", st_td_center_bold),
                    Paragraph("Lixo, entulho, garrafas descartáveis, latas, plásticos, lonas e sucatas", st_td),
                    Paragraph("[  ]", st_td_center), Paragraph("[  ]", st_td_center),
                    Paragraph("[  ] Ensacado / Eliminado mecanicamente", st_td)
                ],
                [
                    Paragraph("<b>E</b>", st_td_center_bold),
                    Paragraph("Criadouros naturais (ocos de árvores, bromélias, bambus, depressões em pedras)", st_td),
                    Paragraph("[  ]", st_td_center), Paragraph("[  ]", st_td_center),
                    Paragraph("[  ] Drenado / Areia   [  ] Tratado se necessário", st_td)
                ]
            ]
            t_grid_criadouros = Table(tabela_criadouros, colWidths=[24, 210, 28, 34, printable_w - 296])
            t_grid_criadouros.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')),
                ('BOX', (0, 0), (-1, -1), 0.4, colors.HexColor('#94A3B8')),
                ('INNERGRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#E2E8F0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 1),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ]))

            # Bloco de anotação de imóveis vizinhos vistoriados no raio
            rodape_card = Table([
                [
                    Paragraph("<b>Imóveis Vistoriados no Raio (Nºs dos vizinhos):</b> ____________________________________________________________________", st_td_bold),
                    Paragraph("<b>Focos Eliminados:</b> Qtd: ______ | <b>Situação:</b> [  ] Trabalhado  [  ] Fechado  [  ] Recusado", ParagraphStyle('Sit', parent=st_td_bold, alignment=TA_RIGHT))
                ]
            ], colWidths=[printable_w * 0.62, printable_w * 0.38])
            rodape_card.setStyle(TableStyle([
                ('TOPPADDING', (0, 0), (-1, -1), 1.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ]))

            bloco_card = Table([
                [cabecalho_alvo],
                [t_grid_criadouros],
                [rodape_card]
            ], colWidths=[printable_w])
            bloco_card.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                ('BACKGROUND', (0, 1), (-1, 1), colors.white),
                ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F1F5F9')),
                ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#64748B')),
                ('LINEBELOW', (0, 0), (-1, 0), 0.4, colors.HexColor('#CBD5E1')),
                ('LINEBELOW', (0, 1), (-1, 1), 0.4, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 1.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(bloco_card)
            story.append(Spacer(1, 2))

        # 6. ASSINATURAS NO FINAL DA PÁGINA
        assinaturas = Table([
            [
                Paragraph("<b>Assinatura do Agente (ACE):</b> _______________________________________________", st_td),
                Paragraph("<b>Visto da Supervisão:</b> _______________________________________________", ParagraphStyle('S2', parent=st_td, alignment=TA_RIGHT))
            ]
        ], colWidths=[printable_w * 0.55, printable_w * 0.45])
        assinaturas.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(assinaturas)

    doc.build(story)
    print(f"[OK] Ficha de Campo Ampla e sem Espaço Sobrando gerada em: {pdf_filename}")

    desktop_dir = r"C:\Users\Almir LK\Desktop\PLANO PARA SEGUNDA"
    if not os.path.exists(desktop_dir):
        os.makedirs(desktop_dir, exist_ok=True)
    
    shutil.copy(pdf_filename, os.path.join(desktop_dir, pdf_filename))
    shutil.copy(pdf_filename, os.path.join("public", pdf_filename))
    print(f"[OK] Copia salva em: {desktop_dir}\\{pdf_filename}")

if __name__ == "__main__":
    gerar_fichas_impressas()
