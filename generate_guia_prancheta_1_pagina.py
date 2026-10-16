#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera o Guia de Campo para Prancheta em 1 Única Página A4.
Ultra simples, direto e prático para o Agente de Endemias (ACE) levar em campo.
Prefeitura Municipal de Carmo / Secretaria Municipal de Saúde / Vigilância Ambiental
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing

def make_qr_code(url, size=38):
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    d = Drawing(size, size, transform=[size / w, 0, 0, size / h, -bounds[0] * size / w, -bounds[1] * size / h])
    d.add(qr)
    return d

def gerar_guia_prancheta():
    pdf_filename = "GUIA_DE_CAMPO_PRANCHETA_1_PAGINA.pdf"
    
    # Margens de 8mm para caber tudo perfeitamente em 1 única página
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

    st_title = ParagraphStyle('Title', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=12, alignment=TA_CENTER, textColor=colors.HexColor('#0F2942'))
    st_sub = ParagraphStyle('Sub', parent=styles['Normal'], fontName='Helvetica', fontSize=7, leading=8.5, alignment=TA_CENTER, textColor=colors.HexColor('#475569'))
    st_th = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=7.5, alignment=TA_CENTER, textColor=colors.white)
    st_td = ParagraphStyle('TD', parent=styles['Normal'], fontName='Helvetica', fontSize=6, leading=7.2, textColor=colors.HexColor('#0F172A'))
    st_td_bold = ParagraphStyle('TDBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6, leading=7.2, textColor=colors.HexColor('#0F172A'))
    st_td_center = ParagraphStyle('TDCenter', parent=styles['Normal'], fontName='Helvetica', fontSize=6, leading=7.2, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))
    st_td_center_bold = ParagraphStyle('TDCenterBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6, leading=7.2, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))
    st_box_title = ParagraphStyle('BoxTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.8, leading=8, textColor=colors.HexColor('#0F2942'))
    st_box_text = ParagraphStyle('BoxText', parent=styles['Normal'], fontName='Helvetica', fontSize=5.8, leading=7.2, textColor=colors.HexColor('#334155'))

    story = []

    # 1. CABEÇALHO COM BRASÃO
    crest_path = 'tmp/pdfs/brasao_carmo_extraido.png'
    if not os.path.exists(crest_path):
        crest_path = 'public/timbres/brasao_carmo.png'
    
    header_data = []
    if os.path.exists(crest_path):
        img_crest = Image(crest_path, width=32, height=38)
        header_text = [
            Paragraph("<b>PREFEITURA MUNICIPAL DE CARMO • SECRETARIA MUNICIPAL DE SAÚDE</b>", st_title),
            Paragraph("COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES", ParagraphStyle('H2', parent=st_title, fontSize=8, leading=10)),
            Paragraph("<b>GUIA OPERACIONAL DE CAMPO • BLOQUEIO DE FOCOS POR OVITRAMPAS (1 PÁGINA)</b>", ParagraphStyle('H3', parent=st_title, fontSize=8.5, leading=10.5, textColor=colors.HexColor('#B91C1C'))),
            Paragraph("Operação Semanal • 10 Agentes de Combate às Endemias (ACE) • 2 Viaturas Municipais • Nota Técnica nº 03/2025-SVSA/MS", st_sub)
        ]
        t_header = Table([[img_crest, header_text]], colWidths=[42, printable_w - 42])
        t_header.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        story.append(t_header)
    else:
        story.append(Paragraph("<b>PREFEITURA MUNICIPAL DE CARMO • VIGILÂNCIA AMBIENTAL</b>", st_title))
        story.append(Paragraph("<b>GUIA OPERACIONAL DE CAMPO • BLOQUEIO DE FOCOS POR OVITRAMPAS</b>", st_title))
    
    story.append(Spacer(1, 3))

    # 2. BOX DE LOGÍSTICA DE VIATURAS & REGRA DE OURO DO AGENTE
    box_viaturas = [
        Paragraph("<b>🚐 LOGÍSTICA DAS 2 VIATURAS & 10 AGENTES:</b>", st_box_title),
        Paragraph("• <b>Carro de 5 Lugares:</b> Equipe Delta (3 ACEs) nos distritos distantes + Transporte de 4 agentes para o Mutirão de Influência na quarta-feira.<br/>"
                  "• <b>Caminhonete de 2 Lugares:</b> Apoio tático, escadas, materiais pesados e subida aos pontos altos (Pousada no Progresso e Caixa d'Água).<br/>"
                  "• <b>1 Agente Dedicada em Influência:</b> Permanece no 2º Distrito diariamente (não consome vaga de carro). Demais duplas a pé na Sede.", st_box_text)
    ]
    box_regra_ouro = [
        Paragraph("<b>🎯 DELIMITAÇÃO OPERACIONAL DE BLOQUEIO (MS / SES-RJ):</b>", ParagraphStyle('R', parent=st_box_title, textColor=colors.HexColor('#B91C1C'))),
        Paragraph("• <b>1. Rota GPS:</b> Toque em <i>'Abrir Rota no Google Maps'</i> no celular para o GPS guiar até o portão do foco.<br/>"
                  "• <b>2. Núcleo Focal (Raio 100m):</b> Vistoriar o imóvel da armadilha e imóveis confrontantes do quarteirão. Eliminação imediata de criadouros!<br/>"
                  "• <b>3. Perímetro Oficial (Raio 200m - Diretriz MS):</b> Extensão aos quarteirões vizinhos em áreas críticas para contenção de dispersão.", st_box_text)
    ]

    t_box = Table([[box_viaturas, box_regra_ouro]], colWidths=[printable_w * 0.52, printable_w * 0.48])
    t_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#F1F5F9')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#FEF2F2')),
        ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#CBD5E1')),
        ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#F87171')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_box)
    story.append(Spacer(1, 4))

    # 3. TABELA OPERACIONAL DE SEGUNDA A SEXTA (14 PONTOS CRÍTICOS)
    tabela_dados = [
        [
            Paragraph("Dia", st_th),
            Paragraph("Equipe / Viatura", st_th),
            Paragraph("Bairro / Distrito", st_th),
            Paragraph("Q.", st_th),
            Paragraph("Armadilha & Endereço", st_th),
            Paragraph("Ovos", st_th),
            Paragraph("Área de Bloqueio na Prática (O que o Agente Vistoria)", st_th)
        ],
        # Segunda
        [
            Paragraph("<b>SEG</b>", st_td_center_bold), Paragraph("Alpha (2)<br/><i>Caminhonete</i>", st_td_center), Paragraph("<b>Progresso</b>", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-23</b> • Pousada Valle do Sol<br/>R. Manoel José de Moraes, 51", st_td), Paragraph("<b>342</b>", st_td_center_bold),
            Paragraph("<b>Pousada + Quarteirão Completo:</b> 6 a 8 casas vizinhas para cada lado, casas de frente e fundos (início da José Cassane). Ralos, piscina desativada, tonéis e bebedouros.", st_td)
        ],
        [
            Paragraph("<b>SEG</b>", st_td_center_bold), Paragraph("Alpha (2)", st_td_center), Paragraph("<b>Centro</b>", st_td_bold), Paragraph("Q-13", st_td_center),
            Paragraph("<b>OV-10</b> • R. Oscar de Souza Curty, 42", st_td), Paragraph("<b>242</b>", st_td_center_bold),
            Paragraph("<b>Quarteirão Comercial & Residencial:</b> Entre Oscar Curty e Celso C. Faria. Foco em calhas prediais, marquises de lojas e lajes com água empoçada.", st_td)
        ],
        [
            Paragraph("<b>SEG</b>", st_td_center_bold), Paragraph("Alpha (2)", st_td_center), Paragraph("Progresso", st_td_bold), Paragraph("Q-09", st_td_center),
            Paragraph("<b>OV-21</b> • Paula Miranda<br/>R. Silvio Geraldo França, 753", st_td), Paragraph("100", st_td_center),
            Paragraph("<b>Trecho da Rua (nº 700 a 800):</b> Imóvel sede + 4 casas de cada lado. Fundos de vale, entulho de obras e tambores no solo.", st_td)
        ],
        # Terça
        [
            Paragraph("<b>TER</b>", st_td_center), Paragraph("Beta (2)", st_td_center), Paragraph("<b>Jd. Centenário</b>", st_td_bold), Paragraph("Q-17", st_td_center),
            Paragraph("<b>OV-05</b> • R. Ernesto Wermelinger, 63", st_td), Paragraph("<b>173</b>", st_td_center_bold),
            Paragraph("<b>Quarteirão Completo:</b> Encontro com Celso C. Faria. Foco em tambores de lavanderia, bromélias em jardins e pratos de vasos.", st_td)
        ],
        [
            Paragraph("<b>TER</b>", st_td_center), Paragraph("Gama (2)", st_td_center), Paragraph("Val Paraíso", st_td_bold), Paragraph("Q-05", st_td_center),
            Paragraph("<b>OV-31</b> • R. Roberto Simões de Araújo, 98", st_td), Paragraph("<b>192</b>", st_td_center_bold),
            Paragraph("<b>Rua Roberto Simões & Emanuel de Moraes:</b> Caixas d'água destampadas, tonéis de captação de chuva e quintais acidentados.", st_td)
        ],
        [
            Paragraph("<b>TER</b>", st_td_center), Paragraph("Gama (2)<br/><i>Caminhonete</i>", st_td_center), Paragraph("Caixa d'Água", st_td_bold), Paragraph("Q-13", st_td_center),
            Paragraph("<b>OV-35</b> • Almir Lemgruber<br/>R. Senador Dantas, 269", st_td), Paragraph("121", st_td_center),
            Paragraph("<b>Trecho Superior da Senador Dantas:</b> Terrenos baldios com descarte de inservíveis e calhas de telhado obstruídas por folhas.", st_td)
        ],
        # Quarta
        [
            Paragraph("<b>QUA</b>", st_td_center_bold), Paragraph("<b>MUTIRÃO GERAL</b><br/><i>Carro + Caminh.</i><br/>(7 ACEs juntos)", st_td_center_bold), Paragraph("<b>Influência (2º)</b><br/>(557 ovos no total)", st_td_bold), Paragraph("Q-05<br/>Q-06<br/>Q-11", st_td_center),
            Paragraph("<b>OV-36</b> (222 ovos) • R. Manoel Cirilo da Silva, 116<br/>"
                      "<b>OV-38</b> (210 ovos) • BR-116, S/N (Oficinas e Borracharias)<br/>"
                      "<b>OV-51</b> (109 ovos) • R. Maria da Silva Machareth, 182", st_td),
            Paragraph("<b>541</b><br/>ovos", st_td_center_bold),
            Paragraph("<b>GRANDE MUTIRÃO EM INFLUÊNCIA:</b> Agente fixa local + reforço de 6 agentes da sede (viaturas Carro + Caminhonete). Varredura completa na Manoel Cirilo (tonéis rurais), margens da BR-116 (borracharias, oficinas mecânicas, carcaças e galpões) e Machareth (tonéis de chuva e caixas d'água baixas).", st_td)
        ],
        # Quinta
        [
            Paragraph("<b>QUI</b>", st_td_center), Paragraph("Delta (3)<br/><i>Carro 5 lug.</i>", st_td_center), Paragraph("Porto Velho", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-45</b> • R. Major Fajardo, 601", st_td), Paragraph("<b>241</b>", st_td_center_bold),
            Paragraph("<b>Major Fajardo (nº 550 a 650):</b> Caçambas, carretas com água parada, recipientes plásticos e quintais na beira do rio.", st_td)
        ],
        [
            Paragraph("<b>QUI</b>", st_td_center), Paragraph("Delta (3)<br/><i>Carro 5 lug.</i>", st_td_center), Paragraph("Porto Velho", st_td_bold), Paragraph("Q-10", st_td_center),
            Paragraph("<b>OV-44</b> • R. Major Fajardo, 312 (ESF)", st_td), Paragraph("102", st_td_center),
            Paragraph("<b>Entorno do Posto de Saúde (nº 280 ao 350):</b> Calhas prediais, caixas d'água destampadas e garrafas retornáveis.", st_td)
        ],
        [
            Paragraph("<b>QUI</b>", st_td_center), Paragraph("Delta (3)<br/><i>Carro 5 lug.</i>", st_td_center), Paragraph("Ilha dos Pombos", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-41</b> • R. Beira Rio, 130", st_td), Paragraph("<b>203</b>", st_td_center_bold),
            Paragraph("<b>Orla do Rio Paraíba / R. Beira Rio:</b> Canoas/embarcações com água de chuva represada, lonas dobradas e recipientes de pesca.", st_td)
        ],
        # Sexta
        [
            Paragraph("<b>SEX</b>", st_td_center), Paragraph("Delta (3)<br/><i>Carro 5 lug.</i>", st_td_center), Paragraph("Barra S. Franc.", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-55</b> • R. Antônio R. Serafim, S/N", st_td), Paragraph("125", st_td_center),
            Paragraph("<b>R. Antônio Serafim e Sebastião Costa:</b> Bebedouros de animais rurais, tonéis e recipientes em quintais amplos.", st_td)
        ],
        [
            Paragraph("<b>SEX</b>", st_td_center), Paragraph("Delta (3)<br/><i>Carro 5 lug.</i>", st_td_center), Paragraph("Córrego da Prata", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-48</b> • R. Benfica, 48 (ESF Prata)", st_td), Paragraph("121", st_td_center),
            Paragraph("<b>Rua Benfica & Entorno da ESF:</b> Calhas de telhado, embalagens descartadas e caixas d'água no nível do solo.", st_td)
        ],
        [
            Paragraph("<b>SEX</b>", st_td_center), Paragraph("Alpha / Beta", st_td_center), Paragraph("Sede Urbana", st_td_bold), Paragraph("Geral", st_td_center),
            Paragraph("Imóveis Fechados & Pendências", st_td), Paragraph("—", st_td_center),
            Paragraph("<b>Retorno a Imóveis Fechados:</b> Revisitar casas que não puderam ser acessadas durante a semana e fechar a planilha com a chefia.", st_td)
        ]
    ]

    col_widths = [22, 54, 52, 20, 115, 22, printable_w - 285]
    t_cron = Table(tabela_dados, colWidths=col_widths)
    t_cron.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.6),
        ('LEFTPADDING', (0, 0), (-1, -1), 2.5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2.5),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#FEF2F2')), # OV-23 destaque vermelho
        ('BACKGROUND', (0, 7), (-1, 7), colors.HexColor('#F5F3FF')), # Mutirão destaque roxo
    ]))
    story.append(t_cron)
    story.append(Spacer(1, 4))

    # 4. ROTEIRO DOS 5 PASSOS DE INSPEÇÃO + ASSINATURA
    passos_text = (
        "<b>ROTEIRO PRÁTICO DO AGENTE (5 PASSOS):</b> "
        "<b>1. Abordagem:</b> <i>'Bom dia! O monitoramento de ovitrampas da Saúde detectou risco de Dengue nesta rua. Viemos inspecionar seu quintal para eliminar os focos.'</i> | "
        "<b>2. Chão:</b> Pratos de plantas, garrafas, potes de cães, baldes e ralos. | "
        "<b>3. Meia Altura:</b> Tanques de lavar, tonéis de chuva (exigir tela/tampa) e torneiras. | "
        "<b>4. Alto:</b> Tampa da caixa d'água e calhas entupidas. | "
        "<b>5. Eliminar na Hora:</b> Virar, furar ou descartar. Não deixar água parada!"
    )
    t_passos = Table([[Paragraph(passos_text, st_box_text)]], colWidths=[printable_w])
    t_passos.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_passos)
    story.append(Spacer(1, 4))

    # 5. ASSINATURA INSTITUCIONAL COM QR CODE
    qr_drawing = make_qr_code("https://gps-ovitrampas-demo.pages.dev/plano", 36)
    sign_data = [
        [
            Paragraph("____________________________________________________________<br/><b>Coordenação de Vigilância em Saúde e Controle de Zoonoses</b><br/>Secretaria Municipal de Saúde • Prefeitura Municipal de Carmo/RJ", ParagraphStyle('Sign', parent=st_box_text, alignment=TA_CENTER)),
            qr_drawing,
            Paragraph("<b>Acesse no Celular (GPS):</b><br/>gps-ovitrampas-demo.pages.dev/plano<br/><b>Aponte a câmera para o QR Code</b>", ParagraphStyle('Info', parent=st_box_text, fontSize=5.3, leading=6.8, alignment=TA_LEFT))
        ]
    ]
    t_sign = Table(sign_data, colWidths=[printable_w * 0.58, 40, printable_w * 0.42 - 40])
    t_sign.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_sign)

    doc.build(story)
    print(f"[OK] Guia de Prancheta de 1 Pagina gerado em: {pdf_filename}")

    # Copia para Área de Trabalho e para pasta public
    desktop_path = r"C:\Users\Almir LK\Desktop\GUIA_DE_CAMPO_PRANCHETA_1_PAGINA.pdf"
    public_path = r"public\GUIA_DE_CAMPO_PRANCHETA_1_PAGINA.pdf"
    
    import shutil
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
    gerar_guia_prancheta()
