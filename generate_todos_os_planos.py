#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador dos Planos Diários de Campo (Segunda a Sexta) e do Plano Geral de Coordenação e Supervisão.
- 10 Agentes de Combate às Endemias trabalhando TODOS OS DIAS da semana.
- 5 PDFs diários individuais para as equipes de campo (Segunda, Terça, Quarta, Quinta, Sexta).
- 1 PDF Geral consolidado para a Coordenação e Supervisão.
- Classificação completa de criadouros (PNCD / Ministério da Saúde: A1, A2, B, C, D1, D2, E).
- Embasamento oficial dos raios de 100m (Núcleo Focal) e 200m (Perímetro Oficial MS/SES-RJ).
Prefeitura Municipal de Carmo / Secretaria Municipal de Saúde / Vigilância Ambiental
"""

import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing

def make_qr_code(url, size=40):
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    d = Drawing(size, size, transform=[size / w, 0, 0, size / h, -bounds[0] * size / w, -bounds[1] * size / h])
    d.add(qr)
    return d

# DADOS TÁTICOS DIÁRIOS COM OS 10 AGENTES TRABALHANDO TODOS OS DIAS
PLANOS_DIARIOS_DATA = [
    {
        "cod": "SEGUNDA",
        "nome_arquivo": "PLANO_DE_CAMPO_SEGUNDA_FEIRA.pdf",
        "dia_extenso": "SEGUNDA-FEIRA • OPERAÇÃO DE ABERTURA",
        "territorio": "Progresso, Centro, Boa Ideia e Eixo Usina",
        "objetivo": "Bloqueio imediato nos dois maiores epicentros de oviposição urbana (Pousada Valle do Sol com 342 ovos e R. Oscar Curty com 242 ovos) e varredura de apoio em 100% das frentes da Sede.",
        "frota": "Caminhonete de Carga (apoio a escadas, materiais pesados e subida à Pousada) + Viatura leve",
        "escala_10_agentes": [
            ("Equipe 1 (Larissa + ACE 2)", "2 ACEs", "Progresso (Q-01)", "OV-23 • Pousada Valle do Sol (342 ovos)", "Núcleo 100m (Pousada, R. Manoel José de Moraes 51 e R. José Cassane) + Perímetro 200m (Progresso). Foco em piscinas desativadas, ralos e reservatórios."),
            ("Equipe 2 (ACE 3 + ACE 4)", "2 ACEs", "Centro (Q-13)", "OV-10 • R. Oscar de Souza Curty, 42 (242 ovos)", "Núcleo 100m (Oscar Curty e Celso C. Faria) + Perímetro 200m (comércios e lajes). Foco em calhas prediais, marquises e água empoçada."),
            ("Equipe 3 (ACE 5 + ACE 6)", "2 ACEs", "Progresso (Q-09)", "OV-21 • R. Silvio Geraldo França, 753 (100 ovos)", "Núcleo 100m (nº 700 a 800) + Perímetro 200m (encosta). Foco em entulho de obras, fundos de vale e caixas baixas."),
            ("Equipe 4 (ACE 7 + ACE 8)", "2 ACEs", "Centro / Boa Ideia", "OV-06 e OV-18 • R. Raul Fernandes e Benjamim Lopes", "Varredura de transição no Centro e Boa Ideia. Inspeção de calhas, tambores plásticos e conscientização de moradores."),
            ("Equipe 5 (ACE 9 + ACE 10)", "2 ACEs", "Eixo Usina / Ilha dos Pombos", "OV-39 e OV-40 • R. Hernane Barbosa e Carlos Cabral", "Vistoria preventiva ribeirinha e preparação para o ciclo de Ilha dos Pombos e Usina Light.")
        ],
        "metas": "Varredura de 100% dos imóveis nos núcleos de 100m da Pousada e Oscar Curty. Meta diária: 150 imóveis inspecionados."
    },
    {
        "cod": "TERCA",
        "nome_arquivo": "PLANO_DE_CAMPO_TERCA_FEIRA.pdf",
        "dia_extenso": "TERÇA-FEIRA • BLOQUEIO EM ENCOSTAS E ÁREAS ALTAS",
        "territorio": "Jd. Centenário, Val Paraíso, Caixa d'Água e Morro do Estado",
        "objetivo": "Intervenção vetorial em terrenos íngremes, encostas com depósitos de captação pluvial e terrenos baldios em cotas elevadas.",
        "frota": "Caminhonete de Apoio Tático (subida à Caixa d'Água e recolhimento de materiais em encostas)",
        "escala_10_agentes": [
            ("Equipe 1 (Larissa + ACE 2)", "2 ACEs", "Jd. Centenário (Q-17)", "OV-05 • R. Ernesto Wermelinger, 63 (173 ovos)", "Núcleo 100m (Wermelinger e Celso Faria) + Perímetro 200m (Jd. Centenário). Foco em tambores de chuva, pratinhos e bromélias."),
            ("Equipe 2 (ACE 3 + ACE 4)", "2 ACEs", "Val Paraíso (Q-05)", "OV-31 • R. Roberto Simões de Araújo, 98 (192 ovos)", "Núcleo 100m (Roberto Simões e Emanuel de Moraes) + Perímetro 200m. Foco em quintais em declive acentuado e tonéis externos."),
            ("Equipe 3 (ACE 5 + ACE 6)", "2 ACEs", "Caixa d'Água (Q-13)", "OV-35 • R. Senador Dantas, 269 (121 ovos)", "Núcleo 100m (Senador Dantas alta) + Perímetro 200m. Foco em terrenos baldios com entulho, calhas altas e caixas de gordura."),
            ("Equipe 4 (ACE 7 + ACE 8)", "2 ACEs", "Boa Ideia / Morro do Estado", "OV-07, OV-15 e OV-28 • Jair Nunes e Adalberto Pires", "Varredura em quintais de fundo de vale e terrenos baldios do Morro do Estado."),
            ("Equipe 5 (ACE 9 + ACE 10)", "2 ACEs", "Centro / Botafogo", "OV-11 (Asilo São Vicente) e OV-12 (Ladeira João Alfredo)", "Vistoria minuciosa em imóveis especiais e áreas institucionais de alto fluxo.")
        ],
        "metas": "Eliminação de criadouros em quintais de declive e vedação de caixas d'água no solo. Meta diária: 140 imóveis."
    },
    {
        "cod": "QUARTA",
        "nome_arquivo": "PLANO_DE_CAMPO_QUARTA_FEIRA.pdf",
        "dia_extenso": "QUARTA-FEIRA • GRANDE MUTIRÃO DISTRITAL EM INFLUÊNCIA",
        "territorio": "Influência (2º Distrito • 557 ovos) + Retorno na Sede Urbana",
        "objetivo": "Concentração de força-tarefa de 7 agentes no distrito com maior densidade de ovos do município, simultaneamente mantendo 3 agentes na Sede.",
        "frota": "Van/Carro 5 Lugares (transporte da tropa da Sede para Influência) + Caminhonete de apoio na rodovia BR-116",
        "escala_10_agentes": [
            ("Equipe 1 (Larissa + ACE 2 + ACE 3)", "3 ACEs", "Influência (Q-05)", "OV-36 • R. Manoel Cirilo da Silva, 116 (222 ovos)", "Núcleo 100m (extensão habitada da R. Manoel Cirilo) + Perímetro 200m. Foco em tonéis de 200L, bebedouros de animais e galinheiros."),
            ("Equipe 2 (ACE 4 + ACE 5)", "2 ACEs", "Influência (Q-06 - BR-116)", "OV-38 • BR-116, KM 12 (210 ovos)", "Núcleo 100m (faixa marginal da rodovia) + Perímetro 200m. Foco em borracharias, oficinas mecânicas, pilhas de pneus e carcaças."),
            ("Equipe 3 (ACE 6 + ACE 7)", "2 ACEs", "Influência (Q-11)", "OV-51 • R. Maria da Silva Machareth, 182 (109 ovos)", "Núcleo 100m (R. Machareth) + Perímetro 200m. Foco em tambores de água da chuva, fossas abertas e caixas d'água baixas."),
            ("Equipe 4 (ACE 8 + ACE 9)", "2 ACEs", "Sede Urbana (Progresso)", "Retorno a Imóveis Fechados de Segunda-Feira", "Visita de resgate aos imóveis que estavam fechados no Progresso (Q-01 e Q-09) para garantir 100% de cobertura."),
            ("Equipe 5 (ACE 10)", "1 ACE", "Sede Urbana (Centro)", "Retorno a Imóveis Fechados de Segunda no Centro", "Recuperação de visitas comerciais e residenciais pendentes na R. Oscar Curty e imediações.")
        ],
        "metas": "Varredura completa do eixo urbano e rodoviário de Influência e recuperação de pendências na Sede. Meta diária: 180 imóveis."
    },
    {
        "cod": "QUINTA",
        "nome_arquivo": "PLANO_DE_CAMPO_QUINTA_FEIRA.pdf",
        "dia_extenso": "QUINTA-FEIRA • BLOQUEIO NO EIXO RIBEIRINHO E USINA",
        "territorio": "Porto Velho do Cunha (3º Distrito) e Ilha dos Pombos / Usina Light",
        "objetivo": "Controle de focos na faixa marginal do Rio Paraíba do Sul, estaleiros, canoas atracadas, galpões e entorno das Unidades de Saúde.",
        "frota": "Viatura Distrital (deslocamento para Porto Velho e Usina Light) + Viatura local na Sede",
        "escala_10_agentes": [
            ("Equipe 1 (Larissa + ACE 2)", "2 ACEs", "Porto Velho (Q-01)", "OV-45 • R. Major Fajardo, 601 (241 ovos)", "Núcleo 100m (nº 550 a 650) + Perímetro 200m (faixa ribeirinha). Foco em galpões, caçambas, embarcações e recipientes plásticos."),
            ("Equipe 2 (ACE 3 + ACE 4)", "2 ACEs", "Ilha dos Pombos (Q-01)", "OV-41 • R. Beira Rio, 130 (203 ovos)", "Núcleo 100m (orla da R. Beira Rio) + Perímetro 200m. Foco em canoas com água de chuva, lonas plásticas e depósitos de pesca."),
            ("Equipe 3 (ACE 5)", "1 ACE", "Porto Velho (Q-10)", "OV-44 • R. Major Fajardo, 312 (102 ovos)", "Núcleo 100m (entorno da ESF Porto Velho) + Perímetro 200m. Foco em calhas prediais, garrafas retornáveis e caixas baixas."),
            ("Equipe 4 (ACE 6 + ACE 7)", "2 ACEs", "Sede (Botafogo / Caixa d'Água)", "OV-16 e OV-13 • R. Soares Brandão e Ulisses Lengruber", "Varredura de apoio na Sede em quarteirões com depósitos em quintais e calhas."),
            ("Equipe 5 (ACE 8, 9 e 10)", "3 ACEs", "Sede (Morro do Estado e Val Paraíso)", "OV-26, OV-27 e OV-32 • Edgar Gismonti e Manoel Gomes", "Inspeção em terrenos baldios e residências de encosta da Sede Urbana.")
        ],
        "metas": "Eliminação de criadouros em embarcações e quintais ribeirinhos de Porto Velho e Usina. Meta diária: 150 imóveis."
    },
    {
        "cod": "SEXTA",
        "nome_arquivo": "PLANO_DE_CAMPO_SEXTA_FEIRA.pdf",
        "dia_extenso": "SEXTA-FEIRA • DISTRITOS SUL/NORTE E CONSOLIDAÇÃO GERAL",
        "territorio": "Barra de São Francisco, Córrego da Prata e Sede da Vigilância",
        "objetivo": "Cobertura dos distritos rurais limítrofes, varredura final de imóveis fechados na Sede e Reunião Geral de Balanço Semanal com a Coordenação.",
        "frota": "Viatura Distrital (rota Barra e Prata) + Viatura da Sede",
        "escala_10_agentes": [
            ("Equipe 1 (Larissa + ACE 2)", "2 ACEs", "Barra de S. Francisco (Q-01)", "OV-55 • R. Antônio R. Serafim, S/N (125 ovos)", "Núcleo 100m (Antônio Serafim e Sebastião Costa) + Perímetro 200m. Foco em bebedouros de animais, tonéis e depósitos rurais."),
            ("Equipe 2 (ACE 3 + ACE 4)", "2 ACEs", "Córrego da Prata (Q-01)", "OV-48 • R. Benfica, 48 (121 ovos)", "Núcleo 100m (entorno da ESF Prata) + Perímetro 200m. Foco em calhas de telhado, recipientes descartáveis e caixas no solo."),
            ("Equipe 3 (ACE 5)", "1 ACE", "Escolas Rurais e Chácaras", "OV-56 (Escola da Barra) e OV-47 (São José)", "Vistoria em escolas rurais e chácaras limítrofes dos distritos."),
            ("Equipe 4 (ACE 6 + ACE 7)", "2 ACEs", "Sede Urbana (Varredura Final)", "Revisão Geral de Imóveis Fechados de Terça e Quarta", "Varredura e retorno final aos imóveis fechados em Val Paraíso e Centenário."),
            ("Equipe 5 (ACE 8, 9 e 10)", "3 ACEs", "Sede Urbana (Consolidação de Campo)", "Consolidação dos Boletins e Preparação do Balanço", "Triagem das fichas de campo preenchidas, contagem de focos eliminados e organização de amostras.")
        ],
        "metas": "100% de cobertura nos distritos rurais e Reunião Geral de Fechamento às 15:00h com a Coordenação."
    }
]

def gerar_todos_os_planos():
    desktop_dir = r"C:\Users\Almir LK\Desktop\PLANO PARA SEGUNDA"
    os.makedirs(desktop_dir, exist_ok=True)
    os.makedirs("public", exist_ok=True)

    styles = getSampleStyleSheet()

    st_title_main = ParagraphStyle('TitleMain', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10.5, leading=12.5, alignment=TA_CENTER, textColor=colors.HexColor('#0F2942'))
    st_sub_main = ParagraphStyle('SubMain', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, leading=9.5, alignment=TA_CENTER, textColor=colors.HexColor('#475569'))
    
    st_sec_title = ParagraphStyle('SecTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white)
    
    st_th = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.8, leading=8, alignment=TA_CENTER, textColor=colors.white)
    st_td = ParagraphStyle('TD', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8, textColor=colors.HexColor('#0F172A'))
    st_td_bold = ParagraphStyle('TDBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=8, textColor=colors.HexColor('#0F172A'))
    st_td_center = ParagraphStyle('TDCenter', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))
    st_td_center_bold = ParagraphStyle('TDCenterBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))

    crest_path = 'tmp/pdfs/brasao_carmo_extraido.png'
    if not os.path.exists(crest_path):
        crest_path = 'public/timbres/brasao_carmo.png'
    img_brasao = Image(crest_path, width=32, height=32) if os.path.exists(crest_path) else None

    qr_flowable = make_qr_code("https://gps-ovitrampas-demo.pages.dev/acao", size=36)

    # =========================================================================
    # 1. GERA OS 5 PLANOS DIÁRIOS INDIVIDUAIS (1 PDF PARA CADA DIA DA SEMANA)
    # =========================================================================
    for plano in PLANOS_DIARIOS_DATA:
        doc = SimpleDocTemplate(
            plano['nome_arquivo'],
            pagesize=A4,
            leftMargin=30,
            rightMargin=30,
            topMargin=20,
            bottomMargin=20
        )
        printable_w = doc.width
        story = []

        # Cabeçalho Oficial
        cab_texto = [
            Paragraph("<b>PREFEITURA MUNICIPAL DE CARMO • SECRETARIA MUNICIPAL DE SAÚDE</b>", st_title_main),
            Paragraph("COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL • PROGRAMA MUNICIPAL DE OVITRAMPAS", st_sub_main),
            Paragraph(f"<b>PLANO OPERACIONAL DE CAMPO • {plano['dia_extenso']}</b>", ParagraphStyle('H1', parent=st_sub_main, fontSize=8.5, leading=10.5, textColor=colors.HexColor('#0F2942'))),
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

        # Quadro Resumo da Operação do Dia
        info_dia = [
            [
                Paragraph(f"<b>Território Alvo:</b> {plano['territorio']}", st_td_bold),
                Paragraph(f"<b>Logística de Frota:</b> {plano['frota']}", st_td)
            ],
            [
                Paragraph(f"<b>Objetivo Tático:</b> {plano['objetivo']}", ParagraphStyle('Obj', parent=st_td, fontSize=6.2, leading=7.5)),
                Paragraph(f"<b>Metas do Dia:</b> {plano['metas']}", ParagraphStyle('Met', parent=st_td_bold, fontSize=6.2, leading=7.5, textColor=colors.HexColor('#991B1B')))
            ]
        ]
        t_info = Table(info_dia, colWidths=[printable_w * 0.52, printable_w * 0.48])
        t_info.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(t_info)
        story.append(Spacer(1, 3))

        # Faixa da Escala dos 10 Agentes
        faixa_equipe = Table([[Paragraph(f"<b>ESCALA DE CAMPO: TODOS OS 10 AGENTES ATIVOS EM {plano['cod']}</b>", st_sec_title)]], colWidths=[printable_w])
        faixa_equipe.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0F2942')),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(faixa_equipe)
        story.append(Spacer(1, 2))

        # Tabela dos 10 Agentes
        dados_tabela_agentes = [
            [
                Paragraph("Equipe / Composição", st_th),
                Paragraph("Efetivo", st_th),
                Paragraph("Bairro / Setor", st_th),
                Paragraph("Epicentro de Ação", st_th),
                Paragraph("Delimitação Operacional (Raio 100m e 200m - MS)", st_th)
            ]
        ]
        for eq, ef, bai, arm, missao in plano['escala_10_agentes']:
            dados_tabela_agentes.append([
                Paragraph(f"<b>{eq}</b>", st_td_bold),
                Paragraph(ef, st_td_center),
                Paragraph(bai, st_td_bold),
                Paragraph(arm, st_td),
                Paragraph(missao, ParagraphStyle('M', parent=st_td, fontSize=6.2, leading=7.5))
            ])
        t_escala = Table(dados_tabela_agentes, colWidths=[85, 34, 75, 120, printable_w - 314])
        t_escala.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
            ('INNERGRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 3),
            ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ]))
        story.append(t_escala)
        story.append(Spacer(1, 3))

        # Diretriz Normativa de Bloqueio (MS/SES-RJ)
        box_diretriz = Table([
            [
                Paragraph("<b>🎯 PROTOCOLO OPERACIONAL OBRIGATÓRIO (DIRETRIZES MINISTÉRIO DA SAÚDE / SES-RJ):</b><br/>"
                          "• <b>🔴 Raio 100m (Núcleo Focal Prioritário):</b> A fêmea do mosquito raramente dispersa mais de 50 a 100m. A varredura de 100% dos imóveis e depósitos no quarteirão do foco é compulsória. Eliminação mecânica imediata.<br/>"
                          "• <b>🟠 Raio 200m (Perímetro Oficial MS):</b> Em áreas de alta carga, o bloqueio perifocal deve abranger até 9 quarteirões vizinhos para conter fêmeas em postura fracionada e evitar colonização de bairros adjacentes.",
                          ParagraphStyle('DirP', parent=st_td, fontSize=6.5, leading=8, textColor=colors.HexColor('#991B1B')))
            ]
        ], colWidths=[printable_w])
        box_diretriz.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF2F2')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#FCA5A5')),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(box_diretriz)
        story.append(Spacer(1, 3))

        # Rodapé de Assinatura e Supervisão
        rodape_plano = Table([
            [
                Paragraph("<b>Supervisor de Campo do Dia:</b> ___________________________________", st_td),
                Paragraph("<b>Visto da Coordenação:</b> ___________________________________", ParagraphStyle('RCoord', parent=st_td, alignment=TA_RIGHT))
            ]
        ], colWidths=[printable_w * 0.55, printable_w * 0.45])
        rodape_plano.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(rodape_plano)

        doc.build(story)
        print(f"[OK] Plano Diário gerado: {plano['nome_arquivo']}")
        shutil.copy(plano['nome_arquivo'], os.path.join(desktop_dir, plano['nome_arquivo']))
        shutil.copy(plano['nome_arquivo'], os.path.join("public", plano['nome_arquivo']))

    # =========================================================================
    # 2. GERA O PLANO GERAL SEMANAL DA COORDENAÇÃO E SUPERVISÃO (SEGUNDA A SEXTA)
    # =========================================================================
    nome_coord = "PLANO_GERAL_SEMANAL_COORDENACAO_SUPERVISAO.pdf"
    doc_coord = SimpleDocTemplate(
        nome_coord,
        pagesize=A4,
        leftMargin=28,
        rightMargin=28,
        topMargin=20,
        bottomMargin=20
    )
    printable_w = doc_coord.width
    story_coord = []

    # Cabeçalho Oficial
    cab_coord = [
        Paragraph("<b>PREFEITURA MUNICIPAL DE CARMO • SECRETARIA MUNICIPAL DE SAÚDE</b>", st_title_main),
        Paragraph("COORDENAÇÃO MUNICIPAL DE VIGILÂNCIA AMBIENTAL E ZOONOSES", st_sub_main),
        Paragraph("<b>PLANO DIRETOR SEMANAL DE BLOQUEIO VETORIAL • COORDENAÇÃO & SUPERVISÃO</b>", ParagraphStyle('HCoord', parent=st_sub_main, fontSize=9, leading=11, textColor=colors.HexColor('#0F2942'))),
        Paragraph("<b>Operação Completa de Segunda a Sexta-feira • Rede de 56 Ovitrampas • 10 Agentes de Campo</b>", ParagraphStyle('SubCoord', parent=st_sub_main, fontSize=7, leading=8.5, textColor=colors.HexColor('#B91C1C'))),
    ]
    t_cab_coord = Table([[img_brasao or '', cab_coord, qr_flowable]], colWidths=[36, printable_w - 78, 42])
    t_cab_coord.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story_coord.append(t_cab_coord)
    story_coord.append(Spacer(1, 3))

    # Matriz Executiva da Coordenação
    matriz_coord = [
        [
            Paragraph("<b>Efetivo Total:</b> 10 Agentes de Combate às Endemias (ACE)", st_td_bold),
            Paragraph("<b>Frota Ativa:</b> Caminhonete 2 Lugares + Viatura 5 Lugares", st_td_bold),
            Paragraph("<b>Armadilhas Monitoradas:</b> 56 Ovitrampas Oficiais", st_td_bold)
        ],
        [
            Paragraph("<b>Total de Ovos no Monitoramento:</b> 3.682 ovos mapeados", st_td),
            Paragraph("<b>Epicentros Críticos de Ação:</b> 14 Pontos de Intervenção", st_td),
            Paragraph("<b>Meta Operacional:</b> 100% de núcleos de 100m varridos", ParagraphStyle('MetaC', parent=st_td_bold, textColor=colors.HexColor('#991B1B')))
        ]
    ]
    t_matriz = Table(matriz_coord, colWidths=[printable_w * 0.35, printable_w * 0.35, printable_w * 0.30])
    t_matriz.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story_coord.append(t_matriz)
    story_coord.append(Spacer(1, 3))

    # Faixa Cronograma Consolidado de Segunda a Sexta
    faixa_geral = Table([[Paragraph("<b>CRONOGRAMA CONSOLIDADO DA SEMANA: DISTRIBUIÇÃO DIÁRIA DOS 10 AGENTES</b>", st_sec_title)]], colWidths=[printable_w])
    faixa_geral.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0F2942')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story_coord.append(faixa_geral)
    story_coord.append(Spacer(1, 2))

    # Tabela Consolidada dos 5 Dias da Semana
    dados_tabela_coord = [
        [
            Paragraph("Dia", st_th),
            Paragraph("Território & Logística", st_th),
            Paragraph("Efetivo Ativo", st_th),
            Paragraph("Epicentros Principais (Carga de Ovos)", st_th),
            Paragraph("Missão Tática das 5 Equipes de Agentes", st_th)
        ],
        [
            Paragraph("<b>SEG</b>", st_td_center_bold),
            Paragraph("<b>Progresso e Centro</b><br/>Caminhonete de Carga", st_td),
            Paragraph("<b>10 ACEs</b><br/>(5 Duplas)", st_td_center_bold),
            Paragraph("<b>OV-23</b> Pousada Valle do Sol (342)<br/><b>OV-10</b> R. Oscar Curty (242)<br/><b>OV-21</b> Silvio G. França (100)", st_td),
            Paragraph("Eq 1 e 2 nos dois maiores focos urbanos; Eq 3 no Progresso alto; Eq 4 no Centro comercial; Eq 5 na área da Usina.", st_td)
        ],
        [
            Paragraph("<b>TER</b>", st_td_center_bold),
            Paragraph("<b>Centenário, Val Paraíso, Caixa d'Água</b><br/>Caminhonete em Encostas", st_td),
            Paragraph("<b>10 ACEs</b><br/>(5 Duplas)", st_td_center_bold),
            Paragraph("<b>OV-31</b> Val Paraíso (192)<br/><b>OV-05</b> Jd. Centenário (173)<br/><b>OV-35</b> Caixa d'Água (121)", st_td),
            Paragraph("Varredura em encostas e quintais de declive. Eq 1 em Wermelinger; Eq 2 em Roberto Simões; Eq 3 na Senador Dantas; Eq 4 e 5 em Boa Ideia e Morro do Estado.", st_td)
        ],
        [
            Paragraph("<b>QUA</b>", st_td_center_bold),
            Paragraph("<b>Influência (Grande Mutirão)</b><br/>Van 5 Lugares + Viatura", st_td),
            Paragraph("<b>10 ACEs</b><br/>(7 Distr. + 3 Sede)", st_td_center_bold),
            Paragraph("<b>OV-36</b> Manoel Cirilo (222)<br/><b>OV-38</b> BR-116 KM 12 (210)<br/><b>OV-51</b> Machareth (109)", st_td),
            Paragraph("Força-tarefa de 7 ACEs em Influência cobrindo quintais rurais, oficinas e borracharias da BR-116. 3 ACEs recuperam fechados na Sede.", st_td)
        ],
        [
            Paragraph("<b>QUI</b>", st_td_center_bold),
            Paragraph("<b>Porto Velho e Ilha dos Pombos</b><br/>Viatura Distrital Eixo Leste", st_td),
            Paragraph("<b>10 ACEs</b><br/>(5 Distr. + 5 Sede)", st_td_center_bold),
            Paragraph("<b>OV-45</b> Major Fajardo 601 (241)<br/><b>OV-41</b> Beira Rio (203)<br/><b>OV-44</b> ESF Porto Velho (102)", st_td),
            Paragraph("Faixa ribeirinha, canoas e depósitos de pesca em Ilha dos Pombos e Porto Velho. 5 ACEs em varredura na Sede Urbana.", st_td)
        ],
        [
            Paragraph("<b>SEX</b>", st_td_center_bold),
            Paragraph("<b>Barra, Córrego da Prata e Sede</b><br/>Viatura Distrital + Sede", st_td),
            Paragraph("<b>10 ACEs</b><br/>(5 Distr. + 5 Sede)", st_td_center_bold),
            Paragraph("<b>OV-55</b> Barra S. Francisco (125)<br/><b>OV-48</b> Córrego da Prata (121)<br/><b>Revisão Sede Urbana</b>", st_td),
            Paragraph("Quintais rurais de Barra e Prata. Varredura final de fechados na Sede. Às 15:00h: Reunião Geral de Consolidação com todos os 10 ACEs.", st_td)
        ]
    ]
    t_cron_coord = Table(dados_tabela_coord, colWidths=[24, 95, 45, 125, printable_w - 289])
    t_cron_coord.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E293B')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    story_coord.append(t_cron_coord)
    story_coord.append(Spacer(1, 3))

    # Protocolo de Auditoria da Supervisão
    box_auditoria = Table([
        [
            Paragraph("<b>📋 ATRIBUIÇÕES OBRIGATÓRIAS DA SUPERVISÃO DE CAMPO:</b><br/>"
                      "1. <b>Conferência de Raio:</b> Auditar presencialmente se a dupla cumpriu 100% da varredura nos 100 metros ao redor da ovitrampa-foco.<br/>"
                      "2. <b>Classificação de Depósitos:</b> Verificar se os depósitos foram corretamente registrados conforme o padrão PNCD (A1, A2, B, C, D1, D2, E).<br/>"
                      "3. <b>Controle de Pendências:</b> Encaminhar as casas fechadas de Segunda e Terça para recuperação obrigatória na Sexta-feira.<br/>"
                      "4. <b>Consolidação Semanal:</b> Apresentar na reunião das 15:00h de Sexta-feira o total de focos eliminados e depósitos tratados.",
                      ParagraphStyle('AudText', parent=st_td, fontSize=6.2, leading=7.5, textColor=colors.HexColor('#0F2942')))
        ]
    ], colWidths=[printable_w])
    box_auditoria.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF3C7')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#F59E0B')),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story_coord.append(box_auditoria)
    story_coord.append(Spacer(1, 3))

    # Assinatura Oficial da Chefia
    assinatura_coord = Table([
        [
            Paragraph("<b>Almir Lemgruber da Silva</b><br/>Coordenação de Vigilância Ambiental • Carmo/RJ", ParagraphStyle('Sign1', parent=st_td, fontSize=6.5, leading=8)),
            Paragraph("<b>Secretaria Municipal de Saúde</b><br/>Prefeitura Municipal de Carmo - RJ", ParagraphStyle('Sign2', parent=st_td, fontSize=6.5, leading=8, alignment=TA_RIGHT))
        ]
    ], colWidths=[printable_w * 0.55, printable_w * 0.45])
    assinatura_coord.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story_coord.append(assinatura_coord)

    doc_coord.build(story_coord)
    print(f"[OK] Plano Geral da Coordenação gerado: {nome_coord}")
    shutil.copy(nome_coord, os.path.join(desktop_dir, nome_coord))
    shutil.copy(nome_coord, os.path.join("public", nome_coord))

if __name__ == "__main__":
    gerar_todos_os_planos()
