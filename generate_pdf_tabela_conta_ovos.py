#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador da Tabela Oficial de Coordenadas Geográficas das Ovitrampas de Carmo-RJ
Para importação e cadastramento no Sistema Conta Ovos (Fiocruz / Ministério da Saúde).
Layout: A4 Paisagem (Landscape) elegante, oficial e de alta legibilidade.
"""

import os
import json
import shutil
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Table,
    TableStyle,
    Spacer,
    KeepTogether,
    Image,
    HRFlowable
)


class NumberedCanvas(canvas.Canvas):
    """
    Canvas de dois passos para calcular o total de páginas (Página X de Y)
    e desenhar cabeçalhos e rodapés oficiais padronizados.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, total_pages):
        self.saveState()
        w, h = landscape(A4)
        margin = 28  # ~10mm

        # Rodapé oficial
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.75)
        self.line(margin, 24, w - margin, 24)

        self.setFont('Helvetica-Bold', 7)
        self.setFillColor(colors.HexColor('#1E293B'))
        self.drawString(margin, 15, "Prefeitura Municipal de Carmo · Secretaria Municipal de Saúde · Vigilância Ambiental e Zoonoses")
        
        self.setFont('Helvetica-Bold', 7.5)
        self.setFillColor(colors.HexColor('#0F172A'))
        self.drawRightString(w - margin, 15, f"Página {self._pageNumber} de {total_pages}")

        self.setFont('Helvetica', 6.5)
        self.setFillColor(colors.HexColor('#475569'))
        self.drawString(margin, 8, "Rede Municipal de Monitoramento de Ovitrampas (56 Armadilhas Oficiais) · Datum WGS 84 / SIRGAS 2000 · Integração Sistema Conta Ovos (Fiocruz/MS)")
        self.drawRightString(w - margin, 8, "Documento Técnico Oficial — Carmo/RJ")

        # Marca d'água de demonstração em todas as páginas (sombra suave no fundo)
        if getattr(self, 'is_demo', False):
            self.saveState()
            self.setFont('Helvetica-Bold', 50)
            self.setFillColor(colors.HexColor('#94A3B8'), alpha=0.13)
            self.translate(w / 2, h / 2)
            self.rotate(26)
            self.drawCentredString(0, 5, "VERSÃO DEMONSTRAÇÃO")
            self.setFont('Helvetica', 12)
            self.setFillColor(colors.HexColor('#64748B'), alpha=0.18)
            self.drawCentredString(0, -16, "USO DIDÁTICO / APRESENTAÇÃO · DADOS ANONIMIZADOS COM XXX")
            self.restoreState()

        self.restoreState()


def carregar_armadilhas(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Ordenar numericamente por número da OV
    def chave_ordem(item):
        try:
            return int(item.get('numero', 0))
        except (ValueError, TypeError):
            return 999
            
    data.sort(key=chave_ordem)
    return data


def gerar_pdf(json_path, pdf_saida, copia_desktop=None, is_demo=False):
    traps = carregar_armadilhas(json_path)
    total_traps = len(traps)

    # Configuração de página A4 Paisagem
    w, h = landscape(A4)
    margin = 28 # ~10mm

    doc = SimpleDocTemplate(
        pdf_saida,
        pagesize=landscape(A4),
        leftMargin=margin,
        rightMargin=margin,
        topMargin=26,
        bottomMargin=28
    )

    styles = getSampleStyleSheet()

    # Estilos customizados
    style_th = ParagraphStyle(
        'TH',
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=8.5,
        textColor=colors.white,
        alignment=1 # Centered
    )
    style_th_left = ParagraphStyle(
        'TH_Left',
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=8.5,
        textColor=colors.white,
        alignment=0 # Left
    )
    style_ov = ParagraphStyle(
        'CellOV',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#1E3A8A'),
        alignment=1
    )
    style_palheta = ParagraphStyle(
        'CellPalheta',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor('#047857'),
        alignment=1
    )
    style_morador = ParagraphStyle(
        'CellMorador',
        fontName='Helvetica-Bold',
        fontSize=7.0,
        leading=8.5,
        textColor=colors.HexColor('#0F172A'),
        alignment=0
    )
    style_logradouro = ParagraphStyle(
        'CellLogradouro',
        fontName='Helvetica',
        fontSize=6.8,
        leading=8.2,
        textColor=colors.HexColor('#334155'),
        alignment=0
    )
    style_bairro = ParagraphStyle(
        'CellBairro',
        fontName='Helvetica-Bold',
        fontSize=6.8,
        leading=8.2,
        textColor=colors.HexColor('#1E293B'),
        alignment=0
    )
    style_quart = ParagraphStyle(
        'CellQuart',
        fontName='Helvetica',
        fontSize=7.0,
        leading=8.5,
        textColor=colors.HexColor('#475569'),
        alignment=1
    )
    style_coord_mono = ParagraphStyle(
        'CellCoordMono',
        fontName='Courier',
        fontSize=6.8,
        leading=8.2,
        textColor=colors.HexColor('#0F172A'),
        alignment=1
    )
    style_coord_full = ParagraphStyle(
        'CellCoordFull',
        fontName='Courier-Bold',
        fontSize=6.8,
        leading=8.2,
        textColor=colors.HexColor('#0369A1'),
        alignment=1
    )

    story = []

    # ==========================================
    # CABEÇALHO OFICIAL (Único Timbre no Cabeçalho: Brasão de Carmo)
    # ==========================================
    brasao_path = 'public/timbres/brasao_carmo.png'

    img_brasao = None
    if os.path.exists(brasao_path):
        img_brasao = Image(brasao_path, width=40, height=47.2) # proporção original ~0.8467

    texto_cabecalho = [
        Paragraph("<font size='9.5'><b>ESTADO DO RIO DE JANEIRO · PREFEITURA MUNICIPAL DE CARMO</b></font>", ParagraphStyle('H1', fontName='Helvetica-Bold', alignment=1, textColor=colors.HexColor('#0F2942'))),
        Paragraph("<font size='8'><b>SECRETARIA MUNICIPAL DE SAÚDE · SUBSECRETARIA DE VIGILÂNCIA EM SAÚDE</b></font>", ParagraphStyle('H2', fontName='Helvetica-Bold', alignment=1, textColor=colors.HexColor('#1E293B'))),
        Paragraph("<font size='7.5'>COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES</font>", ParagraphStyle('H3', fontName='Helvetica', alignment=1, textColor=colors.HexColor('#334155'))),
        Paragraph("<font size='8'><b>REDE MUNICIPAL DE MONITORAMENTO ENTOMOLÓGICO DE ARBOVIROSES (AEDES AEGYPTI)</b></font>", ParagraphStyle('H4', fontName='Helvetica-Bold', alignment=1, textColor=colors.HexColor('#0369A1'))),
        Paragraph("<font size='10.5'><b>TABELA OFICIAL DE COORDENADAS GEOGRÁFICAS — INTEGRAÇÃO SISTEMA CONTA OVOS</b></font>", ParagraphStyle('H5', fontName='Helvetica-Bold', alignment=1, textColor=colors.HexColor('#0A2540')))
    ]

    # Único timbre no cabeçalho (Brasão à esquerda), texto perfeitamente centralizado
    cabecalho_data = [
        [img_brasao or '', texto_cabecalho, '']
    ]

    tabela_cabecalho = Table(
        cabecalho_data,
        colWidths=[45, 695, 45]
    )
    tabela_cabecalho.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
    ]))
    story.append(tabela_cabecalho)
    story.append(Spacer(1, 3))

    # ==========================================
    # FAIXA DE METADADOS E INSTRUÇÕES CONTA OVOS
    # ==========================================
    data_emissao = datetime.now().strftime("%d/%m/%Y às %H:%M")
    info_text = (
        f"<b>Município:</b> Carmo/RJ (IBGE: 3301207)  |  "
        f"<b>Total de Armadilhas Oficiais:</b> {total_traps} Ovitrampas (OV-01 a OV-56)  |  "
        f"<b>Datum:</b> WGS 84 / SIRGAS 2000  |  "
        f"<b>Formato:</b> Graus Decimais (DD)  |  "
        f"<b>Data do Levantamento:</b> 2026  |  "
        f"<b>Emissão:</b> {data_emissao}<br/>"
        f"<font color='#0369A1'><b>INSTRUÇÃO DE USO NO CONTA OVOS (FIOCRUZ/MS):</b> As coordenadas abaixo estão prontas para cadastramento ou importação. "
        f"A coluna <i>'Coordenada Completa'</i> está formatada como <b>'Latitude, Longitude'</b> para cópia e cola direta sem necessidade de conversão.</font>"
    )

    tabela_info = Table(
        [[Paragraph(info_text, ParagraphStyle('InfoStyle', fontName='Helvetica', fontSize=7.0, leading=9.2, textColor=colors.HexColor('#0F172A')))]],
        colWidths=[785]
    )
    tabela_info.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(tabela_info)
    story.append(Spacer(1, 4))

    # ==========================================
    # TABELA PRINCIPAL DE 56 ARMADILHAS
    # ==========================================
    col_widths = [
        42,  # 0: Nº OV
        42,  # 1: Palheta
        110, # 2: Morador / Responsável
        160, # 3: Logradouro e Nº
        105, # 4: Bairro / Distrito
        52,  # 5: Quarteirão
        78,  # 6: Latitude
        78,  # 7: Longitude
        118  # 8: Coordenada Completa (Lat, Long)
    ]

    header_row = [
        Paragraph("<b>Nº OV</b>", style_th),
        Paragraph("<b>Palheta Oficial</b>", style_th),
        Paragraph("<b>Morador / Responsável</b>", style_th_left),
        Paragraph("<b>Logradouro e Nº</b>", style_th_left),
        Paragraph("<b>Bairro / Distrito</b>", style_th_left),
        Paragraph("<b>Quart.</b>", style_th),
        Paragraph("<b>Latitude (DD)</b>", style_th),
        Paragraph("<b>Longitude (DD)</b>", style_th),
        Paragraph("<b>Coordenada Completa (Lat, Long)</b>", style_th),
    ]

    table_data = [header_row]

    for t in traps:
        num = int(t.get('numero', 0))
        ov_label = f"OV-{num:02d}"
        palheta = t.get('palheta') or f"{num:02d}A"
        
        if is_demo:
            morador = "XXX"
            endereco = "Rua XXXXXXXXX, nº XXX"
        else:
            morador = (t.get('morador_nome') or '').strip() or '-'
            rua = (t.get('rua') or '').strip()
            num_im = str(t.get('numero_imovel') or '').strip()
            if num_im:
                endereco = f"{rua}, {num_im}"
            elif rua:
                endereco = f"{rua}"
            else:
                endereco = '-'

        bairro = (t.get('bairro') or t.get('microarea') or '').strip() or '-'
        quarteirao = (t.get('quarteirao') or '').strip() or '-'

        lat_val = float(t.get('latitude', 0))
        lng_val = float(t.get('longitude', 0))

        lat_str = f"{lat_val:.7f}"
        lng_str = f"{lng_val:.7f}"
        coord_full = f"{lat_str}, {lng_str}"

        table_data.append([
            Paragraph(ov_label, style_ov),
            Paragraph(palheta, style_palheta),
            Paragraph(morador, style_morador),
            Paragraph(endereco, style_logradouro),
            Paragraph(bairro, style_bairro),
            Paragraph(quarteirao, style_quart),
            Paragraph(lat_str, style_coord_mono),
            Paragraph(lng_str, style_coord_mono),
            Paragraph(coord_full, style_coord_full),
        ])

    table_main = Table(
        table_data,
        colWidths=col_widths,
        repeatRows=1
    )

    # Estilização da tabela com alternância de linhas e bordas refinadas
    table_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')), # Header navy
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, 0), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('BOX', (0, 0), (-1, -1), 1.0, colors.HexColor('#0F2942')),
    ]

    # Cores alternadas para as linhas
    for i in range(1, len(table_data)):
        bg = colors.HexColor('#F8FAFC') if i % 2 == 1 else colors.white
        table_style.append(('BACKGROUND', (0, i), (-1, i), bg))
        table_style.append(('TOPPADDING', (0, i), (-1, i), 2.0))
        table_style.append(('BOTTOMPADDING', (0, i), (-1, i), 2.0))

    table_main.setStyle(TableStyle(table_style))
    story.append(table_main)
    story.append(Spacer(1, 6))

    # ==========================================
    # BLOCO TÉCNICO FINAL & ASSINATURAS
    # ==========================================
    bloco_final_conteudo = [
        [
            Paragraph(
                "<b>ESTRUTURAÇÃO TERRITORIAL DA MALHA DE 56 OVITRAMPAS:</b><br/>"
                "• <b>Sede Urbana (35 armadilhas):</b> Jardim Centenário (OV-01 a 05), Centro (OV-06, 09 a 12), "
                "Boa Ideia (OV-07, 08, 14, 15, 17), Caixa d'Água (OV-13, 22, 27, 35), Botafogo (OV-16), "
                "Progresso (OV-18 a 21, 23 a 25), Morro do Estado (OV-26, 28, 30), Val Paraíso (OV-29, 31 a 34).<br/>"
                "• <b>Distritos (21 armadilhas):</b> 2º Dist. Influência (OV-36 a 38, 50 a 52), "
                "3º Dist. Ilha dos Pombos (OV-39 a 41, 53), 4º Dist. Córrego da Prata (OV-47 a 49), "
                "5º Dist. Porto Velho do Cunha (OV-42 a 46), 6º Dist. Barra de São Francisco (OV-54 a 56).",
                ParagraphStyle('BlocoTecnico', fontName='Helvetica', fontSize=6.5, leading=8.5, textColor=colors.HexColor('#1E293B'))
            ),
            Paragraph(
                "<b>DECLARAÇÃO DE CONFORMIDADE TÉCNICA:</b><br/>"
                "Certificamos que as 56 armadilhas ovitrampas descritas foram instaladas e georreferenciadas "
                "por equipe técnica capacitada da Vigilância Ambiental de Carmo/RJ, atendendo rigorosamente "
                "às normas operacionais e diretrizes técnicas do Ministério da Saúde para o monitoramento vetorial.<br/>"
                "<b>Base Cartográfica:</b> WGS-84 / Datum SIRGAS 2000 | <b>Software Alvo:</b> Conta Ovos / Fiocruz.",
                ParagraphStyle('BlocoCertificacao', fontName='Helvetica', fontSize=6.5, leading=8.5, textColor=colors.HexColor('#1E293B'))
            )
        ]
    ]

    tabela_bloco_final = Table(
        bloco_final_conteudo,
        colWidths=[420, 365]
    )
    tabela_bloco_final.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))

    # Linha de assinaturas
    assinaturas_data = [
        [
            Paragraph("____________________________________________________<br/><b>Responsável Técnico pelo Monitoramento</b><br/>Vigilância Ambiental de Carmo/RJ", ParagraphStyle('Ass1', fontName='Helvetica', fontSize=6.8, leading=8.5, alignment=1, textColor=colors.HexColor('#334155'))),
            Paragraph("____________________________________________________<br/><b>Coordenação de Vigilância em Saúde</b><br/>Secretaria Municipal de Saúde", ParagraphStyle('Ass2', fontName='Helvetica', fontSize=6.8, leading=8.5, alignment=1, textColor=colors.HexColor('#334155'))),
            Paragraph("____________________________________________________<br/><b>Secretaria Municipal de Saúde</b><br/>Prefeitura Municipal de Carmo/RJ", ParagraphStyle('Ass3', fontName='Helvetica', fontSize=6.8, leading=8.5, alignment=1, textColor=colors.HexColor('#334155')))
        ]
    ]
    tabela_assinaturas = Table(assinaturas_data, colWidths=[261, 261, 263])
    tabela_assinaturas.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    bloco_conclusao = KeepTogether([
        tabela_bloco_final,
        tabela_assinaturas
    ])
    story.append(bloco_conclusao)

    # Construir documento com o canvas de numeração e marca d'água
    class CustomNumberedCanvas(NumberedCanvas):
        pass
    CustomNumberedCanvas.is_demo = is_demo

    doc.build(story, canvasmaker=CustomNumberedCanvas)
    print(f"[OK] PDF gerado com sucesso: {pdf_saida}")

    if copia_desktop and os.path.exists(os.path.dirname(copia_desktop)):
        try:
            shutil.copy2(pdf_saida, copia_desktop)
            print(f"[OK] Cópia salva com sucesso em: {copia_desktop}")
        except Exception as e:
            print(f"[AVISO] Falha ao copiar para {copia_desktop}: {e}")


if __name__ == '__main__':
    import sys
    eh_demo = '--demo' in sys.argv
    
    json_origem = r'F:\Desktop\GPS OVITRAMPAS\traps_clean_utf8.json'
    
    if eh_demo:
        pdf_destino = r'F:\Desktop\GPS OVITRAMPAS\TABELA_COORDENADAS_OVITRAMPAS_DEMO_CARMO_RJ.pdf'
        copia_desktop = r'C:\Users\Almir LK\Desktop\TABELA_COORDENADAS_OVITRAMPAS_DEMO_CARMO_RJ.pdf'
        print("[DEMO] Gerando versão demonstração com marca d'água no fundo e endereços anonimizados...")
        gerar_pdf(json_origem, pdf_destino, copia_desktop, is_demo=True)
    else:
        pdf_destino = r'F:\Desktop\GPS OVITRAMPAS\TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf'
        copia_desktop = r'C:\Users\Almir LK\Desktop\TABELA_COORDENADAS_OVITRAMPAS_CONTA_OVOS_CARMO_RJ.pdf'
        gerar_pdf(json_origem, pdf_destino, copia_desktop, is_demo=False)
