#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador do PDF Oficial Completo do Plano de Ação Operacional — Carmo/RJ
Com Mapas de Calor Integrados, Raio de Ação Específico por Armadilha e Distribuição dos 10 Agentes.
Layout: A4 Retrato Oficial (ReportLab).
"""

import os
import shutil
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Table,
    TableStyle,
    Spacer,
    KeepTogether,
    Image,
    PageBreak,
    HRFlowable
)
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing

def make_qr_code(url, size=42):
    qr = QrCodeWidget(url)
    bounds = qr.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    d = Drawing(size, size, transform=[size / w, 0, 0, size / h, -bounds[0] * size / w, -bounds[1] * size / h])
    d.add(qr)
    return d


class NumberedCanvas(canvas.Canvas):
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
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, total_pages):
        self.saveState()
        w, h = A4
        m = 26 # mm

        # Rodapé institucional
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.6)
        self.line(m, 22, w - m, 22)

        self.setFont('Helvetica-Bold', 7)
        self.setFillColor(colors.HexColor('#1E293B'))
        self.drawString(m, 14, "Prefeitura Municipal de Carmo · Secretaria Municipal de Saúde · Vigilância Ambiental e Zoonoses")

        self.setFont('Helvetica-Bold', 7.5)
        self.setFillColor(colors.HexColor('#0F172A'))
        self.drawRightString(w - m, 14, f"Página {self._pageNumber} de {total_pages}")

        self.setFont('Helvetica', 6.5)
        self.setFillColor(colors.HexColor('#64748B'))
        self.drawString(m, 7, "Plano de Ação de Bloqueio Vetorial · 10 Agentes em Campo · Mapas de Calor e Raios de Ação")
        self.drawRightString(w - m, 7, "Documento Técnico e Operacional — Carmo/RJ")
        self.restoreState()


def gerar_pdf_plano_completo(pdf_saida, copia_desktop=None):
    doc = SimpleDocTemplate(
        pdf_saida,
        pagesize=A4,
        leftMargin=26,
        rightMargin=26,
        topMargin=22,
        bottomMargin=26
    )

    w, h = A4
    printable_w = w - 52

    styles = getSampleStyleSheet()

    st_h1 = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=8.5, leading=10.5, alignment=1, textColor=colors.HexColor('#0F2942'))
    st_h2 = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=7.5, leading=9.5, alignment=1, textColor=colors.HexColor('#1E293B'))
    st_h3 = ParagraphStyle('H3', fontName='Helvetica', fontSize=7, leading=8.5, alignment=1, textColor=colors.HexColor('#334155'))
    st_title_main = ParagraphStyle('Main', fontName='Helvetica-Bold', fontSize=10, leading=12.5, alignment=1, textColor=colors.HexColor('#0369A1'))
    
    st_sec = ParagraphStyle('Sec', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white)
    st_body = ParagraphStyle('Body', fontName='Helvetica', fontSize=6.8, leading=8.8, textColor=colors.HexColor('#1E293B'))
    st_body_bold = ParagraphStyle('BodyB', fontName='Helvetica-Bold', fontSize=6.8, leading=8.8, textColor=colors.HexColor('#0F172A'))
    
    st_th = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=1, textColor=colors.white)
    st_td = ParagraphStyle('TD', fontName='Helvetica', fontSize=6.2, leading=7.8, textColor=colors.HexColor('#1E293B'))
    st_td_bold = ParagraphStyle('TDBold', fontName='Helvetica-Bold', fontSize=6.2, leading=7.8, textColor=colors.HexColor('#0F172A'))
    st_td_center = ParagraphStyle('TDCenter', fontName='Helvetica', fontSize=6.2, leading=7.8, alignment=1, textColor=colors.HexColor('#1E293B'))
    st_td_center_bold = ParagraphStyle('TDCenterBold', fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=1, textColor=colors.HexColor('#B91C1C'))
    st_td_raio = ParagraphStyle('TDRaio', fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=1, textColor=colors.HexColor('#047857'))

    story = []

    # =========================================================================
    # PÁGINA 1: CABEÇALHO, DIRETRIZES DO RAIO DE AÇÃO E DISTRIBUIÇÃO DOS 10 AGENTES
    # =========================================================================
    brasao_path = 'public/timbres/brasao_carmo.png'
    img_brasao = None
    if os.path.exists(brasao_path):
        img_brasao = Image(brasao_path, width=34, height=40.1)

    texto_cabecalho = [
        Paragraph("<b>ESTADO DO RIO DE JANEIRO · PREFEITURA MUNICIPAL DE CARMO</b>", st_h1),
        Paragraph("<b>SECRETARIA MUNICIPAL DE SAÚDE · SUBSECRETARIA DE VIGILÂNCIA EM SAÚDE</b>", st_h2),
        Paragraph("COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES", st_h3),
        Spacer(1, 1),
        Paragraph("<b>PLANO OPERACIONAL DE AÇÃO DE CAMPO — BLOQUEIO DE FOCOS POR RAIO DE AÇÃO</b>", st_title_main),
        Paragraph("<font size='7' color='#0F172A'><b>Direcionamento Tático Baseado no Mapa de Calor das 56 Ovitrampas · 10 Agentes em Campo</b></font>", ParagraphStyle('HSub', fontName='Helvetica', fontSize=7, leading=8.5, alignment=1))
    ]

    cab_table = Table([[img_brasao or '', texto_cabecalho, '']], colWidths=[38, printable_w - 76, 38])
    cab_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(cab_table)
    story.append(Spacer(1, 3))

    def header_faixa(texto, cor='#0F2942'):
        t = Table([[Paragraph(f"<b>{texto}</b>", st_sec)]], colWidths=[printable_w])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(cor)),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        return t

    # 1. Definição Técnica dos Raios Oficiais (100m e 200m - MS / SES-RJ)
    story.append(header_faixa("1. DIRETRIZ NORMATIVA: FUNDAMENTAÇÃO DOS RAIOS DE BLOQUEIO (MS / SES-RJ)"))
    story.append(Spacer(1, 2))

    raio_explicativo = [
        Paragraph("<b>• Embasamento Técnico e Normativo (Diretrizes Nacionais do Ministério da Saúde / Fiocruz):</b><br/>"
                  "<b>1. Raio de 100 Metros (Núcleo Focal Prioritário de Eliminação):</b> Estudos entomológicos da Fiocruz e do Ministério da Saúde comprovam que a fêmea do <i>Aedes aegypti</i> possui raio de dispersão biológica primária de 50 a 100 metros quando há oferta de alimento e água no local. Portanto, quando uma ovitrampa registra alta densidade de ovos, <b>o foco gerador dos criadouros está situado no próprio imóvel ou nos imóveis confrontantes do quarteirão</b>. Ação: Varredura obrigatória em 100% dos imóveis e depósitos no raio de 100m.<br/>"
                  "<b>2. Raio de 200 Metros (Perímetro Ampliado de Bloqueio Perifocal - Diretriz MS / SES-RJ):</b> Conforme preconizado pelo Ministério da Saúde para resposta a focos e controle de epidemias, em áreas de alerta ou emergência vetorial a delimitação de bloqueio deve abranger de 150m a 200m (área equivalente ao quarteirão-sede + os 8 quarteirões adjacentes, totalizando até 9 quarteirões). O objetivo é conter a oviposição fracionada ('skip oviposition') e impedir o transbordamento do vetor para áreas adjacentes.", st_body),
        Spacer(1, 1.5),
        Paragraph("<b>• Estratificação Operacional em Campo:</b><br/>"
                  "<b>- Prioridade 1 (Raio 100m):</b> Eliminação mecânica imediata de 100% dos criadouros móveis e vedação de caixas d'água no quarteirão da ovitrampa.<br/>"
                  "<b>- Prioridade 2 (Raio 200m):</b> Varredura nos quarteirões vizinhos confrontantes, inspeção perifocal e conscientização dos moradores.", st_body)
    ]
    t_box_raio = Table([[raio_explicativo]], colWidths=[printable_w])
    t_box_raio.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF3C7')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#F59E0B')),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_box_raio)
    story.append(Spacer(1, 4))

    # 2. Distribuição Tática dos 10 Agentes de Campo
    story.append(header_faixa("2. DISTRIBUIÇÃO OPERACIONAL DA EQUIPE (10 AGENTES DE COMBATE ÀS ENDEMIAS)"))
    story.append(Spacer(1, 2))

    tabela_agentes = [
        [Paragraph("Equipe / Designação", st_th), Paragraph("Efetivo", st_th), Paragraph("Área Geográfica de Atuação", st_th), Paragraph("Missão Principal / Foco de Eliminação", st_th)],
        [
            Paragraph("<b>Agente Fixa 1 (Influência)</b>", st_td_bold),
            Paragraph("1 ACE (Fixa)", st_td_center),
            Paragraph("<b>2º Distrito (Influência)</b>", st_td_bold),
            Paragraph("Cobertura diária do distrito com maior carga (557 ovos). Monitorar OVs 36, 37, 38, 50, 51 e 52; atuar nos quintais rurais e margens da BR-116. Recebe reforço geral na quarta-feira.", st_td)
        ],
        [
            Paragraph("<b>Equipe Alpha (Dupla 1)</b>", st_td_bold),
            Paragraph("2 ACEs", st_td_center),
            Paragraph("<b>Progresso e Centro</b>", st_td_bold),
            Paragraph("Atuar nos dois maiores focos urbanos: OV-23 (Pousada Valle do Sol - 342 ovos / Raio 100m) e OV-10 (R. Oscar de Souza Curty - 242 ovos / Raio 100m).", st_td)
        ],
        [
            Paragraph("<b>Equipe Beta (Dupla 2)</b>", st_td_bold),
            Paragraph("2 ACEs", st_td_center),
            Paragraph("<b>Jardim Centenário e Boa Ideia</b>", st_td_bold),
            Paragraph("Bloquear OV-05 (R. Ernesto Wermelinger - 173 ovos / Raio 100m) e quarteirões da Celso C. Faria, Armando Chaves e Jorge R. do Valle.", st_td)
        ],
        [
            Paragraph("<b>Equipe Gama (Dupla 3)</b>", st_td_bold),
            Paragraph("2 ACEs", st_td_center),
            Paragraph("<b>Val Paraíso, Morro do Estado e Caixa d'Água</b>", st_td_bold),
            Paragraph("Bloquear OV-31 (R. Roberto Simões - 192 ovos / Raio 80m), OV-35 (R. Senador Dantas - 121 ovos / Raio 80m) e terrenos baldios do Morro do Estado.", st_td)
        ],
        [
            Paragraph("<b>Equipe Delta (Volante Distrital)</b>", st_td_bold),
            Paragraph("3 ACEs", st_td_center),
            Paragraph("<b>Distritos: Porto Velho, Ilha dos Pombos, Barra e Prata</b>", st_td_bold),
            Paragraph("Viatura de apoio para cobertura dos distritos distantes: Major Fajardo (343 ovos / Raio 100m), Beira Rio (203 ovos / Raio 100m), Barra (125 ovos) e Córrego da Prata (121 ovos).", st_td)
        ]
    ]
    t_ag = Table(tabela_agentes, colWidths=[70, 36, 120, printable_w - 226])
    t_ag.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_ag)
    story.append(Spacer(1, 4))

    # 3. Tabela Operacional das 13 Armadilhas Prioritárias com Raio Específico
    story.append(header_faixa("3. CRONOGRAMA OPERACIONAL: RAIO DE AÇÃO EXATO E IMÓVEIS PRIORITÁRIOS"))
    story.append(Spacer(1, 2))

    dados_cronograma = [
        [
            Paragraph("Dia", st_th),
            Paragraph("Equipe", st_th),
            Paragraph("Bairro / Distrito", st_th),
            Paragraph("Quart.", st_th),
            Paragraph("Armadilha / Endereço", st_th),
            Paragraph("Ovos", st_th),
            Paragraph("Raio de Ação", st_th),
            Paragraph("Delimitação do Bloqueio & Criadouros Críticos", st_th)
        ],
        # Segunda
        [
            Paragraph("<b>SEG</b>", st_td_center_bold), Paragraph("Alpha", st_td_center), Paragraph("Progresso", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-23</b> · R. Manoel José de Moraes, 51", st_td), Paragraph("<b>342</b>", st_td_center_bold),
            Paragraph("<b>100m</b>", st_td_raio),
            Paragraph("Todo o Q-01 e início da R. José Cassane. Inspecionar ralos externos, piscinas desativadas, reservatórios de chuva e bebedouros de animais.", st_td)
        ],
        [
            Paragraph("<b>SEG</b>", st_td_center_bold), Paragraph("Alpha", st_td_center), Paragraph("Centro", st_td_bold), Paragraph("Q-13", st_td_center),
            Paragraph("<b>OV-10</b> · R. Oscar de Souza Curty, 42", st_td), Paragraph("<b>242</b>", st_td_center_bold),
            Paragraph("<b>100m</b>", st_td_raio),
            Paragraph("Entre R. Oscar Curty e encontro com Celso C. Faria. Foco em calhas prediais, marquises comerciais e lajes com água empoçada.", st_td)
        ],
        [
            Paragraph("<b>SEG</b>", st_td_center_bold), Paragraph("Alpha", st_td_center), Paragraph("Progresso", st_td_bold), Paragraph("Q-09", st_td_center),
            Paragraph("<b>OV-21</b> · R. Silvio Geraldo França, 753", st_td), Paragraph("100", st_td_center),
            Paragraph("<b>80m</b>", st_td_raio),
            Paragraph("R. Silvio Geraldo França (nº 700 a 800). Varrer fundos de vale, entulhos de obras e tambores no nível do solo.", st_td)
        ],
        # Terça
        [
            Paragraph("<b>TER</b>", st_td_center), Paragraph("Beta", st_td_center), Paragraph("Jd. Centenário", st_td_bold), Paragraph("Q-17", st_td_center),
            Paragraph("<b>OV-05</b> · R. Ernesto Wermelinger, 63", st_td), Paragraph("<b>173</b>", st_td_center_bold),
            Paragraph("<b>100m</b>", st_td_raio),
            Paragraph("R. Ernesto Wermelinger e encontro com Celso C. Faria. Foco em tambores de lavanderia, bromélias e pratos de vasos.", st_td)
        ],
        [
            Paragraph("<b>TER</b>", st_td_center), Paragraph("Gama", st_td_center), Paragraph("Val Paraíso", st_td_bold), Paragraph("Q-05", st_td_center),
            Paragraph("<b>OV-31</b> · R. Roberto Simões de Araújo, 98", st_td), Paragraph("<b>192</b>", st_td_center_bold),
            Paragraph("<b>80m</b>", st_td_raio),
            Paragraph("R. Roberto Simões e R. Emanuel de Moraes. Foco em caixas d'água destampadas, tonéis de chuva e quintais acidentados.", st_td)
        ],
        [
            Paragraph("<b>TER</b>", st_td_center), Paragraph("Gama", st_td_center), Paragraph("Caixa d'Água", st_td_bold), Paragraph("Q-13", st_td_center),
            Paragraph("<b>OV-35</b> · R. Senador Dantas, 269", st_td), Paragraph("121", st_td_center),
            Paragraph("<b>80m</b>", st_td_raio),
            Paragraph("R. Senador Dantas (trecho superior). Terrenos baldios com descarte de inservíveis e calhas obstruídas por folhas.", st_td)
        ],
        # Quarta
        [
            Paragraph("<b>QUA</b>", st_td_center_bold), Paragraph("Mutirão*", st_td_center_bold), Paragraph("Influência (2º)", st_td_bold), Paragraph("Q-05", st_td_center),
            Paragraph("<b>OV-36</b> · R. Manoel Cirilo da Silva, 116", st_td), Paragraph("<b>222</b>", st_td_center_bold),
            Paragraph("<b>100m</b>", st_td_raio),
            Paragraph("Extensão completa da R. Manoel Cirilo (Q-05). Agente fixa + reforço da equipe Delta. Pneus velhos e tonéis agrícolas.", st_td)
        ],
        [
            Paragraph("<b>QUA</b>", st_td_center_bold), Paragraph("Mutirão*", st_td_center_bold), Paragraph("Influência (2º)", st_td_bold), Paragraph("Q-06", st_td_center),
            Paragraph("<b>OV-38</b> · BR-116, S/N (Independente)", st_td), Paragraph("<b>210</b>", st_td_center_bold),
            Paragraph("<b>100m</b>", st_td_raio),
            Paragraph("Margens da rodovia BR-116. Vistoria intensiva em borracharias, oficinas mecânicas, carcaças de veículos e galpões.", st_td)
        ],
        [
            Paragraph("<b>QUA</b>", st_td_center_bold), Paragraph("Mutirão*", st_td_center_bold), Paragraph("Influência (2º)", st_td_bold), Paragraph("Q-11", st_td_center),
            Paragraph("<b>OV-51</b> · R. Maria da Silva Machareth, 182", st_td), Paragraph("109", st_td_center),
            Paragraph("<b>80m</b>", st_td_raio),
            Paragraph("R. Maria da Silva Machareth. Tambores de captação de chuva, caixas d'água baixas e recipientes sombreados.", st_td)
        ],
        # Quinta
        [
            Paragraph("<b>QUI</b>", st_td_center), Paragraph("Delta", st_td_center), Paragraph("P. Velho Cunha", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-45</b> · R. Major Fajardo, 601", st_td), Paragraph("<b>241</b>", st_td_center_bold),
            Paragraph("<b>100m</b>", st_td_raio),
            Paragraph("R. Major Fajardo (altura do 550 ao 650). Caçambas, carretas com água parada, recipientes plásticos e quintais beira-rio.", st_td)
        ],
        [
            Paragraph("<b>QUI</b>", st_td_center), Paragraph("Delta", st_td_center), Paragraph("P. Velho Cunha", st_td_bold), Paragraph("Q-10", st_td_center),
            Paragraph("<b>OV-44</b> · R. Major Fajardo, 312", st_td), Paragraph("102", st_td_center),
            Paragraph("<b>80m</b>", st_td_raio),
            Paragraph("R. Major Fajardo (nº 280 ao 350 - entorno da ESF). Calhas prediais, caixas d'água sem tampa e garrafas retornáveis.", st_td)
        ],
        [
            Paragraph("<b>QUI</b>", st_td_center), Paragraph("Delta", st_td_center), Paragraph("Ilha dos Pombos", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-41</b> · R. Beira Rio, 130", st_td), Paragraph("<b>203</b>", st_td_center_bold),
            Paragraph("<b>100m</b>", st_td_raio),
            Paragraph("Ao longo da orla do rio na R. Beira Rio. Canoas/embarcações com acúmulo de chuva, lonas e recipientes de pesca.", st_td)
        ],
        # Sexta
        [
            Paragraph("<b>SEX</b>", st_td_center), Paragraph("Delta", st_td_center), Paragraph("Barra S. Francisco", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-55</b> · R. Antônio R. Serafim, S/N", st_td), Paragraph("125", st_td_center),
            Paragraph("<b>80m</b>", st_td_raio),
            Paragraph("R. Antônio R. Serafim e Sebastião F. Costa. Bebedouros de animais rurais, tambores e recipientes em quintais amplos.", st_td)
        ],
        [
            Paragraph("<b>SEX</b>", st_td_center), Paragraph("Delta", st_td_center), Paragraph("Córrego da Prata", st_td_bold), Paragraph("Q-01", st_td_center),
            Paragraph("<b>OV-48</b> · R. Benfica, 48 (ESF)", st_td), Paragraph("121", st_td_center),
            Paragraph("<b>80m</b>", st_td_raio),
            Paragraph("Rua Benfica e entorno do posto de saúde. Calhas de telhado, recipientes descartáveis e caixas d'água no nível do solo.", st_td)
        ]
    ]

    t_cron = Table(dados_cronograma, colWidths=[18, 28, 48, 20, 114, 20, 30, printable_w - 278])
    t_cron.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 1.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 2),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(t_cron)
    story.append(Spacer(1, 4))

    # =========================================================================
    # PÁGINA 2: OS MAPAS DE CALOR OFICIAIS (SEDE URBANA E DISTRITOS)
    # =========================================================================
    story.append(PageBreak())

    story.append(header_faixa("4. CARTOGRAFIA TÉCNICA: MAPAS DE CALOR E NEVOEIRO TÉRMICO DE INFESTAÇÃO"))
    story.append(Spacer(1, 3))

    mapa_sede_path = 'public/maps/mapa_2_sede_nevoeiro.jpg'
    mapa_dist_path = 'public/maps/mapa_3_distritos_nevoeiro.jpg'

    mapas_imgs = []
    
    # Imagem 1: Sede Urbana (Nevoeiro Térmico)
    if os.path.exists(mapa_sede_path):
        img_s = Image(mapa_sede_path, width=printable_w * 0.48, height=(printable_w * 0.48) * (1739 / 1274))
        desc_sede = Paragraph("<font size='7'><b>MAPA 1: SEDE URBANA (NEVOEIRO TÉRMICO)</b><br/>Visualização dos epicentros de calor nos bairros Progresso (OV-23), Centro (OV-10), Jardim Centenário (OV-05) e Val Paraíso (OV-31). Áreas em vermelho indicam prioridade máxima para bloqueio na segunda e terça-feira.</font>", st_body)
        bloco_s = Table([[img_s], [desc_sede]], colWidths=[printable_w * 0.48])
        bloco_s.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, 0), 0.5, colors.HexColor('#94A3B8')),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        mapas_imgs.append(bloco_s)

    # Imagem 2: Distritos (Influência, Porto Velho, Ilha dos Pombos, Barra e Prata)
    if os.path.exists(mapa_dist_path):
        img_d = Image(mapa_dist_path, width=printable_w * 0.48, height=(printable_w * 0.48) * (3000 / 2600))
        desc_dist = Paragraph("<font size='7'><b>MAPA 2: DISTRITOS MUNICIPAIS (NEVOEIRO TÉRMICO)</b><br/>Destaca a mancha de alta intensidade no 2º Distrito (Influência: 557 ovos), no 5º Distrito (Porto Velho: 343 ovos na Major Fajardo) e Ilha dos Pombos (203 ovos). Área da agente fixa e da equipe Delta volante.</font>", st_body)
        bloco_d = Table([[img_d], [desc_dist]], colWidths=[printable_w * 0.48])
        bloco_d.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOX', (0, 0), (-1, 0), 0.5, colors.HexColor('#94A3B8')),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        mapas_imgs.append(bloco_d)

    if len(mapas_imgs) == 2:
        t_duo_mapas = Table([[mapas_imgs[0], mapas_imgs[1]]], colWidths=[printable_w * 0.49, printable_w * 0.49])
        t_duo_mapas.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(t_duo_mapas)
        story.append(Spacer(1, 4))

    # =========================================================================
    # SEÇÃO 4: CHECKLIST PRÁTICO DO AGENTE E ASSINATURAS
    # =========================================================================
    story.append(header_faixa("5. ROTEIRO PRÁTICO DO AGENTE DE ENDEMIAS E TERMO DE COMPROMISSO"))
    story.append(Spacer(1, 2))

    check_itens = [
        Paragraph("<b>1. Abordagem Padronizada:</b> <i>'Bom dia! A equipe da Saúde detectou alta proliferação do mosquito da Dengue nesta rua pelo nosso monitoramento. Viemos vistoriar seu quintal para eliminar os focos antes que as pessoas adoeçam.'</i>", st_body),
        Paragraph("<b>2. Varredura do Chão:</b> Pratos de plantas, garrafas vazias viradas para cima, potes de água de animais, baldes e ralos de quintal.", st_body),
        Paragraph("<b>3. Varredura de Meia Altura:</b> Tanques de lavar roupa, tonéis de captação de chuva (exigir tampa hermética ou tela), torneiras vazando.", st_body),
        Paragraph("<b>4. Varredura do Alto:</b> Verificar vedação da tampa da caixa d'água e calhas entupidas por folhas que represam água de chuva.", st_body),
        Paragraph("<b>5. Ação Física Imediata:</b> Eliminar na hora. Não deixar água parada. Furar, virar ou descartar no lixo imediatamente.", st_body)
    ]
    t_chk = Table([[check_itens]], colWidths=[printable_w])
    t_chk.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_chk)
    story.append(Spacer(1, 8))

    # Assinaturas e QR Code Oficial do Sistema
    qr_drawing = make_qr_code("https://gps-ovitrampas-demo.pages.dev/plano", 40)
    qr_col = [
        qr_drawing,
        Paragraph("<font size='5'><b>App GPS Celular</b><br/>Escaneie o código</font>", ParagraphStyle('QRT', fontName='Helvetica', fontSize=5, leading=6, alignment=1, textColor=colors.HexColor('#0F2942')))
    ]
    t_qr = Table([[qr_col]], colWidths=[48])
    t_qr.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))

    w_side = (printable_w - 52) / 2
    ass_data = [
        [
            Paragraph("____________________________________________<br/><b>Almir Lemgruber</b><br/>Responsável Técnico pelo Monitoramento<br/>Vigilância Ambiental de Carmo/RJ", ParagraphStyle('A1', fontName='Helvetica', fontSize=6.8, leading=8.5, alignment=1)),
            t_qr,
            Paragraph("____________________________________________<br/><b>Coordenação de Vigilância em Saúde</b><br/>Secretaria Municipal de Saúde<br/>Prefeitura Municipal de Carmo/RJ", ParagraphStyle('A2', fontName='Helvetica', fontSize=6.8, leading=8.5, alignment=1))
        ]
    ]
    t_ass = Table(ass_data, colWidths=[w_side, 52, w_side])
    t_ass.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(KeepTogether([t_ass]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] PDF Oficial do Plano com Mapas gerado em: {pdf_saida}")

    if copia_desktop and os.path.exists(os.path.dirname(copia_desktop)):
        try:
            shutil.copy2(pdf_saida, copia_desktop)
            print(f"[OK] Cópia salva com sucesso na Área de Trabalho: {copia_desktop}")
        except Exception as e:
            print(f"[AVISO] Falha ao copiar para desktop: {e}")


if __name__ == '__main__':
    pdf_destino = 'PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ.pdf'
    copia_desktop = r'C:\Users\Almir LK\Desktop\PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ.pdf'
    gerar_pdf_plano_completo(pdf_destino, copia_desktop)
