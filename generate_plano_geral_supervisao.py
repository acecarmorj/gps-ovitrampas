#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera o PLANO_GERAL_SEMANAL_COORDENACAO_SUPERVISAO.pdf (1 Página A4 Retrato Impecável).
Reflete 100% das diretrizes operacionais:
- 10 ACEs (5 duplas: Equipes 1 a 5) 100% em campo todos os dias (serviço interno possui equipe própria).
- Frota real: 1 Carro de passeio (5 lugares) + 1 Caminhonete (2 lugares) = máx. 7 lugares móveis.
- Horário Corrido das 08h00 às 13h00, com ponto de encontro e saída no P.A. (Ponto de Apoio).
- Sexta-feira: 08h00 às 12h00 varredura de imóveis fechados em campo + 12h00 às 13h00 Reunião Geral no P.A.
- Soma acumulada das 2 semanas (Sem A + Sem B = 3.682 ovos).
- Metade inferior com os 2 mapas gerais delimitados (Sede Urbana + Mosaico dos Distritos), Atribuições da Supervisão e Assinatura.
"""

import os
import shutil
import pypdf
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
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

def resolver_imagem(caminho_preferencial, caminho_fallback):
    if os.path.exists(caminho_preferencial):
        return caminho_preferencial
    if caminho_fallback and os.path.exists(caminho_fallback):
        return caminho_fallback
    return None

def gerar_plano_geral_supervisao():
    nome_arquivo = "PLANO_GERAL_SEMANAL_COORDENACAO_SUPERVISAO.pdf"
    dest_folder = "public"
    desktop_folder = r"C:\Users\Almir LK\Desktop\PLANO PARA SEGUNDA"
    os.makedirs(dest_folder, exist_ok=True)
    os.makedirs(desktop_folder, exist_ok=True)

    caminho_local = os.path.join(dest_folder, nome_arquivo)

    doc = SimpleDocTemplate(
        caminho_local,
        pagesize=A4,
        leftMargin=20,
        rightMargin=20,
        topMargin=12,
        bottomMargin=10
    )

    printable_w = 555
    styles = getSampleStyleSheet()

    st_title = ParagraphStyle('Title', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.2, leading=11.0, alignment=TA_CENTER, textColor=colors.HexColor('#0F2942'))
    st_sub = ParagraphStyle('Sub', parent=styles['Normal'], fontName='Helvetica', fontSize=7.2, leading=8.8, alignment=TA_CENTER, textColor=colors.HexColor('#334155'))
    st_banner = ParagraphStyle('Banner', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.4, leading=10.2, alignment=TA_CENTER, textColor=colors.white)
    
    st_kpi_lbl = ParagraphStyle('KPILbl', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.3, leading=7.6, textColor=colors.HexColor('#1E3A8A'))
    st_kpi_val = ParagraphStyle('KPIVal', parent=styles['Normal'], fontName='Helvetica', fontSize=6.2, leading=7.6, textColor=colors.HexColor('#0F172A'))

    st_th = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=7.8, alignment=TA_CENTER, textColor=colors.white)
    st_td_dia = ParagraphStyle('TDDia', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.8, leading=8.2, alignment=TA_CENTER, textColor=colors.HexColor('#0F2942'))
    st_td = ParagraphStyle('TD', parent=styles['Normal'], fontName='Helvetica', fontSize=6.2, leading=7.6, textColor=colors.HexColor('#1E293B'))
    st_td_center = ParagraphStyle('TDCenter', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.2, leading=7.6, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))

    st_sec_hdr = ParagraphStyle('SecHdr', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9.0, alignment=TA_CENTER, textColor=colors.HexColor('#1E3A8A'))
    st_sup_title = ParagraphStyle('SupTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.8, leading=8.2, textColor=colors.HexColor('#7F1D1D'))
    st_sup_item = ParagraphStyle('SupItem', parent=styles['Normal'], fontName='Helvetica', fontSize=6.2, leading=7.6, textColor=colors.HexColor('#1E293B'))
    st_sign = ParagraphStyle('Sign', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.8, leading=8.2, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))
    st_sign_sub = ParagraphStyle('SignSub', parent=styles['Normal'], fontName='Helvetica', fontSize=6.1, leading=7.4, alignment=TA_CENTER, textColor=colors.HexColor('#475569'))

    story = []

    # 1. CABEÇALHO INSTITUCIONAL COM BRASÃO E QR CODE
    crest_path = 'tmp/pdfs/brasao_carmo_extraido.png'
    if not os.path.exists(crest_path):
        crest_path = 'public/timbres/brasao_carmo.png'
    img_brasao = Image(crest_path, width=32, height=32) if os.path.exists(crest_path) else ''
    qr_code = make_qr_code("https://gps-ovitrampas-demo.pages.dev/plano", size=34)

    cab_center = [
        Paragraph("<b>PREFEITURA MUNICIPAL DE CARMO • SECRETARIA MUNICIPAL DE SAÚDE</b>", st_title),
        Paragraph("COORDENAÇÃO MUNICIPAL DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES", ParagraphStyle('H2', parent=st_title, fontSize=7.8, leading=9.2)),
        Paragraph("<b>PLANO DIRETOR SEMANAL DE BLOQUEIO VETORIAL • COORDENAÇÃO & SUPERVISÃO</b>", ParagraphStyle('H3', parent=st_title, fontSize=8.2, leading=9.8, textColor=colors.HexColor('#B91C1C'))),
        Paragraph("Operação de Segunda a Sexta-Feira • Horário Corrido: 08h00 às 13h00 (Saída do P.A.) • Rede de 56 Ovitrampas", st_sub)
    ]
    t_cab = Table([[img_brasao, cab_center, qr_code]], colWidths=[38, printable_w - 78, 40])
    t_cab.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_cab)
    story.append(Spacer(1, 2))

    # 2. PAINEL DE INDICADORES E REGRAS LOGÍSTICAS DA COORDENAÇÃO
    kpi_rows = [
        [
            Paragraph("<b>EFETIVO DE CAMPO:</b> 10 ACEs (Equipes 1 a 5 — 100% em Campo)<br/><i>*Serviço interno/laboratorial possui equipe própria</i>", st_kpi_val),
            Paragraph("<b>FROTA DISPONÍVEL:</b> 1 Carro (5 Lugares) + 1 Caminhonete (2 Lugares)<br/><i>*Capacidade móvel máx.: 7 lugares (3 duplas em viatura)</i>", st_kpi_val),
            Paragraph("<b>JORNADA E PONTO DE ENCONTRO:</b> Horário Corrido <b>08h00 às 13h00</b><br/><i>*Concentração, saída e reunião no <b>P.A. (Ponto de Apoio)</b></i>", st_kpi_val)
        ],
        [
            Paragraph("<b>CARGA ACUMULADA (2 SEMANAS):</b> <b>3.682 ovos</b> em 56 Ovitrampas<br/><i>*Semana A: 1.017 ovos + Semana B: 2.665 ovos (IPO: 73,2%)</i>", st_kpi_val),
            Paragraph("<b>DELIMITAÇÃO OFICIAL (MS / SES-RJ):</b><br/><i>*<b>Raio 100m:</b> Núcleo Focal (100% imóveis) | <b>Raio 200m:</b> Perímetro MS</i>", st_kpi_val),
            Paragraph("<b>REUNIÃO SEMANAL DE AVALIAÇÃO:</b> Sexta-feira das <b>12h00 às 13h00</b><br/><i>*Realizada no <b>P.A. (Ponto de Apoio)</b> após campo (08h00–12h00)</i>", st_kpi_val)
        ]
    ]
    t_kpi = Table(kpi_rows, colWidths=[185, 185, 185])
    t_kpi.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#94A3B8')),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 3))

    # 3. TABELA CONSOLIDADA DE SEGUNDA A SEXTA
    faixa_cron = Table([[Paragraph("<b>CRONOGRAMA OPERACIONAL CONSOLIDADO • ESCALA DOS 10 AGENTES DE CAMPO (08h00 ÀS 13h00)</b>", st_banner)]], colWidths=[printable_w])
    faixa_cron.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#0F2942')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(faixa_cron)

    cron_rows = [
        [
            Paragraph("Dia / Horário", st_th),
            Paragraph("Território & Logística de Frota", st_th),
            Paragraph("Alocação Campo", st_th),
            Paragraph("Epicentros (Soma 2 Semanas: A + B)", st_th),
            Paragraph("Divisão Tática das 5 Equipes (10 ACEs 100% em Campo)", st_th)
        ],
        [
            Paragraph("<b>SEG</b><br/>08h–13h<br/><i>(Saída P.A.)</i>", st_td_dia),
            Paragraph("<b>Carmo Sede + Barra de S. Francisco</b><br/>• Carro 5L (Barra)<br/>• Caminhonete 2L (Sede)", st_td),
            Paragraph("<b>10 ACEs</b><br/>(4 Distrito +<br/>6 Sede)", st_td_center),
            Paragraph("• <b>OV-23</b> Pousada: <font color='#B91C1C'><b>342</b></font> [147+195]<br/>"
                      "• <b>OV-10</b> Centro: <font color='#B91C1C'><b>242</b></font> [41+201]<br/>"
                      "• <b>OV-55</b> Barra: <font color='#B91C1C'><b>125</b></font> [5+120]<br/>"
                      "• <b>OV-21</b> (100), <b>OV-12</b> (84), <b>OV-54</b> (74), <b>OV-56</b> (69)", st_td),
            Paragraph("• <b>Eq 1 e Eq 2 (4 ACEs - Carro 5L):</b> Barra de S. Francisco (<b>OV-55</b>, <b>OV-54</b> e <b>OV-56</b>).<br/>"
                      "• <b>Eq 3 e Eq 5 (4 ACEs - Sede + Caminhonete 2L):</b> Progresso (<b>OV-23</b> Pousada Valle do Sol e <b>OV-21</b> Silvio G. França).<br/>"
                      "• <b>Eq 4 (2 ACEs - Sede a pé):</b> Centro (<b>OV-10</b> Oscar Curty e <b>OV-12</b> Lad. João Alfredo).", st_td)
        ],
        [
            Paragraph("<b>TER</b><br/>08h–13h<br/><i>(Saída P.A.)</i>", st_td_dia),
            Paragraph("<b>Carmo Sede (Encostas e Cotas Altas)</b><br/>• 5 Duplas a pé<br/>• Caminhonete 2L apoio", st_td),
            Paragraph("<b>10 ACEs</b><br/>(10 na Sede<br/>Urbana)", st_td_center),
            Paragraph("• <b>OV-31</b> Val Paraíso: <font color='#B91C1C'><b>192</b></font> [51+141]<br/>"
                      "• <b>OV-05</b> Centenário: <font color='#B91C1C'><b>173</b></font> [6+167]<br/>"
                      "• <b>OV-35</b> Cx. d'Água: <font color='#B91C1C'><b>121</b></font> [4+117]<br/>"
                      "• <b>OV-28</b> (95), <b>OV-08</b> (93), <b>OV-16</b> (89), <b>OV-12</b> (84), <b>OV-15</b> (78)", st_td),
            Paragraph("• <b>Eq 1 (2 ACEs):</b> Val Paraíso (<b>OV-31</b> [192] e <b>OV-34</b> [66]).<br/>"
                      "• <b>Eq 2 (2 ACEs):</b> Jd. Centenário (<b>OV-05</b> [173], <b>OV-03</b> [53] e <b>OV-04</b> [53]).<br/>"
                      "• <b>Eq 3 (2 ACEs):</b> Caixa d'Água (<b>OV-35</b> [121] e <b>OV-13</b> [71]).<br/>"
                      "• <b>Eq 4 (2 ACEs):</b> Morro do Estado e Boa Ideia (<b>OV-28</b> [95], <b>OV-08</b> [93], <b>OV-15</b> [78]).<br/>"
                      "• <b>Eq 5 (2 ACEs):</b> Botafogo e Centro (<b>OV-16</b> [89], <b>OV-12</b> [84] e <b>OV-11</b> Asilo [24]).", st_td)
        ],
        [
            Paragraph("<b>QUA</b><br/>08h–13h<br/><i>(Saída P.A.)</i>", st_td_dia),
            Paragraph("<b>Influência + Usina Light + Campo Sede</b><br/>• Carro 5L + Caminh. 2L<br/>• 2 Duplas a pé Sede", st_td),
            Paragraph("<b>10 ACEs</b><br/>(6 Distritos +<br/>4 Sede)", st_td_center),
            Paragraph("• <b>OV-36</b> Influência: <font color='#B91C1C'><b>222</b></font> [53+169]<br/>"
                      "• <b>OV-38</b> BR-116: <font color='#B91C1C'><b>210</b></font> [25+185]<br/>"
                      "• <b>OV-41</b> Light: <font color='#B91C1C'><b>203</b></font> [40+163]<br/>"
                      "• <b>OV-51</b> (109 [3+106]), <b>OV-40</b> (66), <b>OV-39</b> (30), <b>OV-53</b> (21)", st_td),
            Paragraph("• <b>Eq 1 (2 ACEs - Viatura):</b> Influência (<b>OV-36</b> Manoel Cirilo e <b>OV-51</b> Machareth).<br/>"
                      "• <b>Eq 2 (2 ACEs - Viatura):</b> Influência Rodovia (<b>OV-38</b> BR-116 KM 12 e <b>OV-50</b>).<br/>"
                      "• <b>Eq 3 (2 ACEs - Viatura):</b> Usina Light / Ilha (<b>OV-41</b> Beira Rio, <b>OV-40</b>, <b>OV-39</b>, <b>OV-53</b>).<br/>"
                      "• <b>Eq 4 (2 ACEs - Campo Sede):</b> Progresso e Centenário (Resgate fechados <b>OV-23</b>, <b>OV-21</b>, <b>OV-05</b>).<br/>"
                      "• <b>Eq 5 (2 ACEs - Campo Sede):</b> Centro e Boa Ideia (Bloqueio <b>OV-08</b>, <b>OV-15</b> + fechados <b>OV-10</b>).", st_td)
        ],
        [
            Paragraph("<b>QUI</b><br/>08h–13h<br/><i>(Saída P.A.)</i>", st_td_dia),
            Paragraph("<b>Porto Velho + Córrego da Prata + Sede</b><br/>• Carro 5L + Caminh. 2L<br/>• 2 Duplas a pé Sede", st_td),
            Paragraph("<b>10 ACEs</b><br/>(6 Distritos +<br/>4 Sede)", st_td_center),
            Paragraph("• <b>OV-45</b> P. Velho: <font color='#B91C1C'><b>241</b></font> [35+206]<br/>"
                      "• <b>OV-48</b> ESF Prata: <font color='#B91C1C'><b>121</b></font> [7+114]<br/>"
                      "• <b>OV-44</b> ESF P. Velho: <font color='#B91C1C'><b>102</b></font> [2+100]<br/>"
                      "• <b>OV-49</b> Alfredo Ferreira: <b>62</b> [2+60]", st_td),
            Paragraph("• <b>Eq 1 (2 ACEs - Viatura):</b> Porto Velho do Cunha (<b>OV-45</b> Major Fajardo 601).<br/>"
                      "• <b>Eq 2 (2 ACEs - Viatura):</b> Porto Velho do Cunha (<b>OV-44</b> ESF Porto Velho e faixa ribeirinha).<br/>"
                      "• <b>Eq 3 (2 ACEs - Viatura):</b> Córrego da Prata (<b>OV-48</b> ESF Prata e <b>OV-49</b> Alfredo Ferreira).<br/>"
                      "• <b>Eq 4 (2 ACEs - Campo Sede):</b> Val Paraíso e Morro do Estado (Varredura/fechados <b>OV-31</b>, <b>OV-28</b>, <b>OV-34</b>).<br/>"
                      "• <b>Eq 5 (2 ACEs - Campo Sede):</b> Caixa d'Água e Botafogo (Varredura/fechados <b>OV-35</b>, <b>OV-16</b>, <b>OV-13</b>, <b>OV-12</b>).", st_td)
        ],
        [
            Paragraph("<b>SEX</b><br/>08h–12h Campo<br/><b>12h–13h P.A.</b>", st_td_dia),
            Paragraph("<b>Varredura Geral de Fechados + Reunião P.A.</b><br/>• 3 Duplas Sede a pé<br/>• 2 Duplas nas Viaturas", st_td),
            Paragraph("<b>10 ACEs</b><br/>(6 Sede +<br/>4 Distritos)", st_td_center),
            Paragraph("• <b>08h00 às 12h00:</b> Resgate 100% Imóveis Fechados (Sede e Distritos)<br/>"
                      "• <b>12h00 às 13h00:</b> Reunião Técnica Geral no <b>P.A.</b>", st_td),
            Paragraph("• <b>Eq 1 (Sede a pé):</b> Resgate final Progresso e Centenário (<b>OV-23, OV-21, OV-05, OV-03, OV-04</b>).<br/>"
                      "• <b>Eq 2 (Sede a pé):</b> Resgate final Centro, Caixa d'Água e Botafogo (<b>OV-10, OV-35, OV-16, OV-13, OV-12</b>).<br/>"
                      "• <b>Eq 3 (Sede a pé):</b> Resgate final Val Paraíso, Morro e Boa Ideia (<b>OV-31, OV-28, OV-34, OV-08, OV-15</b>).<br/>"
                      "• <b>Eq 4 (Caminhonete 2L):</b> Fechados Influência e Barra | <b>Eq 5 (Carro 5L):</b> P. Velho, Light e Prata.<br/>"
                      "• <b>12h00 às 13h00 no P.A. (Ponto de Apoio):</b> Reunião Técnica Geral de Avaliação Semanal (10 ACEs).", st_td)
        ]
    ]

    t_cron = Table(cron_rows, colWidths=[48, 95, 52, 125, 235])
    t_cron.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.8),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
    ]))
    story.append(t_cron)
    story.append(Spacer(1, 3))

    # 4. MAPAS GERAIS DE MONITORAMENTO (SEDE URBANA E MOSAICO DOS DISTRITOS)
    story.append(Paragraph("<b>VISÃO GERAL GEORREFERENCIADA DA OPERAÇÃO: SEDE URBANA & MOSAICO DOS 5 DISTRITOS (RAIOS 100m E 200m)</b>", st_sec_hdr))
    story.append(Spacer(1, 2))

    img1_path = resolver_imagem("output/prints_delimitados/sexta_1_sede_geral.png", "output/mapas_satelite/sexta_varredura_sede.png")
    img2_path = resolver_imagem("output/prints_delimitados/sexta_2_distritos_mosaico.png", "output/mapas_satelite/sexta_varredura_distritos.png")

    img1_flow = Image(img1_path, width=272, height=150) if img1_path else Spacer(272, 150)
    img2_flow = Image(img2_path, width=272, height=150) if img2_path else Spacer(272, 150)

    t_mapas = Table([[img1_flow, img2_flow]], colWidths=[275, 275])
    t_mapas.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING', (0, 0), (-1, -1), 1),
        ('RIGHTPADDING', (0, 0), (-1, -1), 1),
    ]))
    story.append(t_mapas)
    story.append(Spacer(1, 3))

    # 5. ATRIBUIÇÕES OBRIGATÓRIAS DA SUPERVISÃO DE CAMPO
    sup_data = [
        [
            Paragraph("<b>■ ATRIBUIÇÕES OBRIGATÓRIAS DA SUPERVISÃO E REGRAS DE CAMPO (HORÁRIO CORRIDO 08h00 ÀS 13h00):</b>", st_sup_title)
        ],
        [
            Paragraph("<b>1. Concentração no P.A. (Ponto de Apoio) às 08h00:</b> Entrega de pranchetas, fichas impressas e larvicida (Bti), com saída imediata das 5 duplas (10 ACEs 100% dedicados ao serviço de campo; atividades internas e laboratoriais ficam a cargo da equipe interna própria).<br/>"
                      "<b>2. Respeito Estrito à Capacidade da Frota (Máx. 7 Lugares):</b> O município dispõe de 1 Carro (5 lugares) e 1 Caminhonete (2 lugares). Nos dias distritais (Quarta e Quinta), exatamente 3 duplas (6 ACEs) embarcam nas 2 viaturas e 2 duplas (4 ACEs) atuam em campo a pé na Sede Urbana.<br/>"
                      "<b>3. Auditoria de Raio (100m e 200m) e Fechamento Semanal:</b> Fiscalizar o bloqueio mecânico/larvicida padrão PNCD (A1, A2, B, C, D1, D2, E) e o resgate de imóveis fechados até Sexta às 12h00, seguido da <b>Reunião Geral de Avaliação no P.A. das 12h00 às 13h00</b>.", st_sup_item)
        ]
    ]
    t_sup = Table(sup_data, colWidths=[printable_w])
    t_sup.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF2F2')),
        ('BOX', (0, 0), (-1, -1), 0.7, colors.HexColor('#F87171')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_sup)
    story.append(Spacer(1, 3))

    # 6. ASSINATURAS INSTITUCIONAIS
    sign_rows = [
        [
            Paragraph("____________________________________________________", st_sign),
            Paragraph("____________________________________________________", st_sign),
            Paragraph("<b>Ponto de Encontro: P.A.</b>", st_sign)
        ],
        [
            Paragraph("<b>Almir Lemgruber da Silva</b><br/>Coordenação de Vigilância Ambiental • Carmo/RJ", st_sign_sub),
            Paragraph("<b>Supervisão Geral de Campo</b><br/>Secretaria Municipal de Saúde • Carmo/RJ", st_sign_sub),
            Paragraph("Horário Corrido: <b>08h00 às 13h00</b><br/>Data: ____/____/2026", st_sign_sub)
        ]
    ]
    t_sign = Table(sign_rows, colWidths=[220, 220, 115])
    t_sign.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    story.append(t_sign)

    doc.build(story)

    reader = pypdf.PdfReader(caminho_local)
    num_pags = len(reader.pages)
    print(f"[{'OK' if num_pags == 1 else 'ALERTA'}] {nome_arquivo}: {num_pags} página(s)")

    shutil.copyfile(caminho_local, os.path.join(desktop_folder, nome_arquivo))
    shutil.copyfile(caminho_local, nome_arquivo)
    return num_pags

if __name__ == "__main__":
    gerar_plano_geral_supervisao()
