#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gerador do PDF Oficial do Plano de Ação Operacional de Campo — Carmo/RJ
Baseado no Mapa de Calor da Rede de 56 Ovitrampas (Semana Prioritária)
Layout: A4 Retrato Oficial, pronto para impressão e distribuição aos agentes de campo.
"""

import os
import shutil
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
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
        m = 28 # ~10mm

        # Rodapé
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.75)
        self.line(m, 22, w - m, 22)

        self.setFont('Helvetica-Bold', 7)
        self.setFillColor(colors.HexColor('#1E293B'))
        self.drawString(m, 14, "Prefeitura Municipal de Carmo · Secretaria Municipal de Saúde · Vigilância Ambiental e Zoonoses")

        self.setFont('Helvetica-Bold', 7.5)
        self.setFillColor(colors.HexColor('#0F172A'))
        self.drawRightString(w - m, 14, f"Página {self._pageNumber} de {total_pages}")

        self.setFont('Helvetica', 6.5)
        self.setFillColor(colors.HexColor('#64748B'))
        self.drawString(m, 7, "Plano de Ação Operacional Semanal · Bloqueio Perifocal (Raio 50-80m) · Rede de 56 Ovitrampas")
        self.drawRightString(w - m, 7, "Documento Operacional de Campo — Carmo/RJ")
        self.restoreState()


def gerar_pdf_plano(pdf_saida, copia_desktop=None):
    doc = SimpleDocTemplate(
        pdf_saida,
        pagesize=A4,
        leftMargin=26,
        rightMargin=26,
        topMargin=24,
        bottomMargin=26
    )

    w, h = A4
    printable_w = w - 52

    styles = getSampleStyleSheet()

    # Estilos customizados
    st_title_h1 = ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=1, textColor=colors.HexColor('#0F2942'))
    st_title_h2 = ParagraphStyle('H2', fontName='Helvetica-Bold', fontSize=8, leading=10, alignment=1, textColor=colors.HexColor('#1E293B'))
    st_title_h3 = ParagraphStyle('H3', fontName='Helvetica', fontSize=7, leading=9, alignment=1, textColor=colors.HexColor('#334155'))
    st_title_main = ParagraphStyle('Main', fontName='Helvetica-Bold', fontSize=10.5, leading=13, alignment=1, textColor=colors.HexColor('#0369A1'))

    st_sec_title = ParagraphStyle('Sec', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.white)
    st_sub_title = ParagraphStyle('Sub', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#0F172A'))
    st_body = ParagraphStyle('Body', fontName='Helvetica', fontSize=7, leading=9, textColor=colors.HexColor('#1E293B'))
    st_body_bold = ParagraphStyle('BodyBold', fontName='Helvetica-Bold', fontSize=7, leading=9, textColor=colors.HexColor('#0F172A'))
    st_th = ParagraphStyle('TH', fontName='Helvetica-Bold', fontSize=6.8, leading=8.2, alignment=1, textColor=colors.white)
    st_td = ParagraphStyle('TD', fontName='Helvetica', fontSize=6.5, leading=8, textColor=colors.HexColor('#1E293B'))
    st_td_bold = ParagraphStyle('TDBold', fontName='Helvetica-Bold', fontSize=6.5, leading=8, textColor=colors.HexColor('#0F172A'))
    st_td_center = ParagraphStyle('TDCenter', fontName='Helvetica', fontSize=6.5, leading=8, alignment=1, textColor=colors.HexColor('#1E293B'))
    st_td_center_bold = ParagraphStyle('TDCenterBold', fontName='Helvetica-Bold', fontSize=6.8, leading=8.5, alignment=1, textColor=colors.HexColor('#B91C1C'))

    story = []

    # =========================================================================
    # CABEÇALHO OFICIAL (Único Timbre no Cabeçalho à esquerda)
    # =========================================================================
    brasao_path = 'public/timbres/brasao_carmo.png'
    img_brasao = None
    if os.path.exists(brasao_path):
        img_brasao = Image(brasao_path, width=36, height=42.5)

    texto_cabecalho = [
        Paragraph("<b>ESTADO DO RIO DE JANEIRO · PREFEITURA MUNICIPAL DE CARMO</b>", st_title_h1),
        Paragraph("<b>SECRETARIA MUNICIPAL DE SAÚDE · SUBSECRETARIA DE VIGILÂNCIA EM SAÚDE</b>", st_title_h2),
        Paragraph("COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES", st_title_h3),
        Spacer(1, 2),
        Paragraph("<b>PLANO OPERACIONAL DE AÇÃO DE CAMPO — BLOQUEIO DE FOCOS POR RAIO DE AÇÃO</b>", st_title_main),
        Paragraph("<font size='7.5' color='#0F172A'><b>Direcionamento Tático Baseado no Mapa de Calor da Rede de 56 Ovitrampas (Carmo/RJ)</b></font>", ParagraphStyle('HSub', fontName='Helvetica', fontSize=7.5, leading=9, alignment=1))
    ]

    cab_table = Table([[img_brasao or '', texto_cabecalho, '']], colWidths=[42, printable_w - 84, 42])
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
    story.append(Spacer(1, 4))

    # Faixa de Metadados
    meta_p = Paragraph(
        "<b>Período:</b> Segunda a Sexta-feira | <b>Equipe:</b> Agentes de Combate às Endemias (ACE) | <b>Total de Ovos no Monitoramento:</b> 3.682 ovos mapeados | <b>Meta:</b> Eliminação de criadouros em 100% dos imóveis no raio prioritário",
        ParagraphStyle('Meta', fontName='Helvetica', fontSize=6.8, leading=8.5, alignment=1, textColor=colors.HexColor('#0F172A'))
    )
    t_meta = Table([[meta_p]], colWidths=[printable_w])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F1F5F9')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 6))

    # =========================================================================
    # SEÇÃO 1: FUNDAMENTAÇÃO DOS RAIOS DE AÇÃO (100m E 200m - MS / SES-RJ)
    # =========================================================================
    def bloco_titulo_secao(titulo, cor='#0F2942'):
        t = Table([[Paragraph(f"<b>{titulo}</b>", st_sec_title)]], colWidths=[printable_w])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(cor)),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ]))
        return t

    story.append(bloco_titulo_secao("1. DIRETRIZ NORMATIVA: FUNDAMENTAÇÃO DOS RAIOS DE BLOQUEIO (MS / SES-RJ)"))
    story.append(Spacer(1, 3))

    raio_texto = [
        Paragraph("<b>• Embasamento Técnico e Normativo (Diretrizes Nacionais do Ministério da Saúde / Fiocruz):</b><br/>"
                  "<b>1. Raio de 100 Metros (Núcleo Focal Prioritário):</b> A fêmea do mosquito <i>Aedes aegypti</i> possui raio de dispersão biológica primária de 50 a 100 metros quando há oferta de alimento e criadouros próximos. Portanto, o criadouro prolífero principal responsável pela alta contagem de ovos está situado <b>no próprio imóvel ou nos imóveis confrontantes do quarteirão</b>. Ação: Varredura minuciosa obrigatória e eliminação mecânica de 100% dos recipientes.<br/>"
                  "<b>2. Raio de 200 Metros (Perímetro Ampliado de Bloqueio Perifocal - Diretriz MS / SES-RJ):</b> Em situações de alerta ou emergência epidemiológica (epicentros com &ge; 100 ou &ge; 200 ovos), o Ministério da Saúde determina a extensão das ações de bloqueio para o raio de 150m a 200m (abrangência de até 9 quarteirões: o quarteirão-sede e os 8 quarteirões adjacentes), contendo fêmeas em postura fracionada e impedindo a colonização de áreas vizinhas.", st_body),
        Spacer(1, 2),
        Paragraph("<b>• Protocolo de Execução dos Agentes em Campo:</b> A dupla deve focar inicialmente na varredura imediata de 100% dos imóveis no raio prioritário de 100m. Concluído o núcleo, estende-se a vistoria e orientação comunitária aos quarteirões confrontantes até o limite de 200m.", st_body)
    ]
    t_raio = Table([[raio_texto]], colWidths=[printable_w])
    t_raio.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF3C7')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#F59E0B')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_raio)
    story.append(Spacer(1, 6))

    # =========================================================================
    # SEÇÃO 2: CRONOGRAMA SEMANAL DETALHADO POR DIA E QUARTEIRÃO
    # =========================================================================
    story.append(bloco_titulo_secao("2. CRONOGRAMA OPERACIONAL SEMANAL (SEGUNDA A SEXTA)"))
    story.append(Spacer(1, 3))

    # Tabela com as ações dia a dia
    dados_tabela = [
        [
            Paragraph("Dia", st_th),
            Paragraph("Bairro / Distrito", st_th),
            Paragraph("Quart.", st_th),
            Paragraph("Armadilha / Endereço (Epicentro)", st_th),
            Paragraph("Ovos", st_th),
            Paragraph("Raio de Ação & Imóveis Prioritários", st_th),
            Paragraph("Foco Principal de Eliminação", st_th),
        ]
    ]

    cronograma = [
        # Segunda
        ("SEG", "Progresso", "Q-01", "OV-23 · R. Manoel José de Moraes, 51 (Pousada Valle do Sol)", "342", "Núcleo 100m (Q-01 e José Cassane) + Perímetro 200m (Diretriz MS)", "Piscinas desativadas, ralos externos, reservatórios de captação de chuva e recipientes em quintais amplos."),
        ("SEG", "Centro", "Q-13", "OV-10 · R. Oscar de Souza Curty, 42 (Clea Suely)", "242", "Núcleo 100m (Oscar Curty e Celso Faria) + Perímetro 200m (Diretriz MS)", "Calhas prediais, marquises comerciais, ralos internos e lajes com água empoçada."),
        ("SEG", "Progresso", "Q-09", "OV-21 · R. Silvio Geraldo França, 753 (Paula Miranda)", "100", "Núcleo 100m (nº 700 a 800) + Perímetro 200m (Diretriz MS)", "Entulhos de obra, fundos de vale e caixas d'água baixas sem tampa."),
        
        # Terça
        ("TER", "Val Paraíso", "Q-05", "OV-31 · R. Roberto Simões de Araújo, 98 (Rosimeri)", "192", "Núcleo 100m (R. Roberto Simões e Emanuel) + Perímetro 200m (MS)", "Tonéis plásticos de lavanderia externa e recipientes expostos no quintal."),
        ("TER", "Jd. Centenário", "Q-17", "OV-05 · R. Ernesto Wermelinger, 63 (Manoel Ezidio)", "173", "Núcleo 100m (Wermelinger e Celso Faria) + Perímetro 200m (MS)", "Tambores de armazenamento de água, pratinhos e bromélias em jardins."),
        ("TER", "Caixa d'Água", "Q-13", "OV-35 · R. Senador Dantas, 269 (Almir Lemgruber)", "121", "Núcleo 100m (R. Senador Dantas alta) + Perímetro 200m (MS)", "Terrenos baldios, calhas de telhado obstruídas e caixas de gordura abertas."),

        # Quarta
        ("QUA", "Influência (2º)", "Q-05", "OV-36 · R. Manoel Cirilo da Silva, 116 (Silvana)", "222", "Núcleo 100m (extensão do Q-05) + Perímetro 200m (Diretriz MS)", "Pneus velhos, bebedouros de animais de criação e tonéis de água."),
        ("QUA", "Influência (2º)", "Q-06", "OV-38 · BR-116, S/N (Independente)", "210", "Núcleo 100m (margens da rodovia) + Perímetro 200m (Diretriz MS)", "Oficinas mecânicas, borracharias, sucatas e galpões de beira de pista."),
        ("QUA", "Influência (2º)", "Q-11", "OV-51 · R. Maria da Silva Machareth, 182 (Aline)", "109", "Núcleo 100m (R. Machareth) + Perímetro 200m (Diretriz MS)", "Tambores de água da chuva, fossas abertas e recipientes sombreados."),

        # Quinta
        ("QUI", "P. Velho Cunha", "Q-01", "OV-45 · R. Major Fajardo, 601 (Lindomar)", "241", "Núcleo 100m (Major Fajardo nº 550 a 650) + Perímetro 200m (MS)", "Galpões, caçambas, embarcações e recipientes plásticos em quintais."),
        ("QUI", "P. Velho Cunha", "Q-10", "OV-44 · R. Major Fajardo, 312 (ESF P. Velho)", "102", "Núcleo 100m (entorno da ESF) + Perímetro 200m (Diretriz MS)", "Caixas d'água sem tampa, calhas prediais e garrafas retornáveis."),
        ("QUI", "Ilha dos Pombos", "Q-01", "OV-41 · R. Beira Rio, 130 (Dayse Regina)", "203", "Núcleo 100m (orla da R. Beira Rio) + Perímetro 200m (Diretriz MS)", "Canoas acumulando água de chuva, lonas plásticas e depósitos de pesca."),

        # Sexta
        ("SEX", "Barra S. Francisco", "Q-01", "OV-55 · R. Antônio R. Serafim, S/N (Solange)", "125", "Núcleo 100m (Antônio Serafim e Sebastião) + Perímetro 200m (MS)", "Bebedouros de criação, carcaças de veículos e depósitos rurais."),
        ("SEX", "Córrego da Prata", "Q-01", "OV-48 · R. Benfica, 48 (ESF Córrego da Prata)", "121", "Núcleo 100m (entorno da ESF Prata) + Perímetro 200m (MS)", "Calhas de telhado, recipientes descartáveis e caixas d'água no nível do solo."),
        ("SEX", "Coordenação", "--", "Sede da Vigilância Ambiental (15:00h)", "--", "Reunião de Fechamento e Balanço da Semana", "Consolidação dos focos eliminados, boletins de campo e avaliação dos indicadores.")
    ]

    for dia, bairro, quart, arm, ovos, raio, acao in cronograma:
        is_reuniao = dia == "SEX" and bairro == "Coordenação"
        bg_col = colors.HexColor('#FEF2F2') if (ovos != '--' and int(ovos) >= 200) else colors.white
        dados_tabela.append([
            Paragraph(f"<b>{dia}</b>", st_td_center_bold if dia in ["SEG", "QUA"] else st_td_center),
            Paragraph(f"<b>{bairro}</b>", st_td_bold),
            Paragraph(quart, st_td_center),
            Paragraph(arm, st_td),
            Paragraph(f"<b>{ovos}</b>" if ovos != '--' else '--', st_td_center_bold if ovos != '--' and int(ovos) >= 200 else st_td_center),
            Paragraph(raio, st_td),
            Paragraph(acao, st_td),
        ])

    col_widths = [20, 52, 22, 126, 22, 142, 158]
    t_cronograma = Table(dados_tabela, colWidths=col_widths, repeatRows=1)
    t_cronograma.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LEFTPADDING', (0, 0), (-1, -1), 2.5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 2.5),
    ]))
    story.append(t_cronograma)
    story.append(Spacer(1, 6))

    # =========================================================================
    # SEÇÃO 3: ROTEIRO PRÁTICO DE VISITA E METAS OPERACIONAIS
    # =========================================================================
    story.append(bloco_titulo_secao("3. ROTEIRO DE INSPEÇÃO NO IMÓVEL (PASSO A PASSO DO AGENTE)"))
    story.append(Spacer(1, 3))

    passos_texto = [
        Paragraph("<b>1. Abordagem:</b> <i>'Bom dia! A Vigilância Ambiental detectou alta proliferação do mosquito da Dengue nesta rua pelo nosso monitoramento. Precisamos vistoriar seu quintal para eliminar os focos.'</i>", st_body),
        Paragraph("<b>2. Varredura do Chão:</b> Inspecionar pratinhos de plantas, garrafas vazias, potes de animais, bebedouros e ralos externos de chuva.", st_body),
        Paragraph("<b>3. Varredura a Meia Altura:</b> Tanques de lavar roupa, baldes de água, torneiras com vazamento e calhas de muros.", st_body),
        Paragraph("<b>4. Varredura do Alto:</b> Verificar vedação da tampa da caixa d'água e calhas de telhado entupidas por folhas secas.", st_body),
        Paragraph("<b>5. Eliminação na Hora:</b> Não deixe água parada para depois. Virar, esvaziar, ensacar para coleta ou tampar hermeticamente.", st_body)
    ]
    t_passos = Table([[passos_texto]], colWidths=[printable_w])
    t_passos.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_passos)
    story.append(Spacer(1, 8))

    # Bloco de Assinaturas
    ass_data = [
        [
            Paragraph("____________________________________________<br/><b>Almir Lemgruber</b><br/>Responsável Técnico pelo Monitoramento<br/>Vigilância Ambiental de Carmo/RJ", ParagraphStyle('A1', fontName='Helvetica', fontSize=7, leading=9, alignment=1)),
            Paragraph("____________________________________________<br/><b>Coordenação de Vigilância em Saúde</b><br/>Secretaria Municipal de Saúde<br/>Prefeitura Municipal de Carmo/RJ", ParagraphStyle('A2', fontName='Helvetica', fontSize=7, leading=9, alignment=1))
        ]
    ]
    t_ass = Table(ass_data, colWidths=[printable_w / 2, printable_w / 2])
    t_ass.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(KeepTogether([t_ass]))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[OK] PDF do Plano gerado em: {pdf_saida}")

    if copia_desktop and os.path.exists(os.path.dirname(copia_desktop)):
        try:
            shutil.copy2(pdf_saida, copia_desktop)
            print(f"[OK] Cópia salva na Área de Trabalho: {copia_desktop}")
        except Exception as e:
            print(f"[AVISO] Falha ao copiar para desktop: {e}")


if __name__ == '__main__':
    pdf_destino = 'PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ.pdf'
    copia_desktop = r'C:\Users\Almir LK\Desktop\PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ.pdf'
    gerar_pdf_plano(pdf_destino, copia_desktop)
