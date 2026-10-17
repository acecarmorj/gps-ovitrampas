import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
import pymupdf

def test():
    pdf_path = 'output/test/test_plano_segunda.pdf'
    os.makedirs('output/test', exist_ok=True)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=20,
        rightMargin=20,
        topMargin=15,
        bottomMargin=14
    )

    styles = getSampleStyleSheet()

    st_title = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    st_banner = ParagraphStyle(
        'Banner',
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12.5,
        textColor=colors.white,
        alignment=1
    )
    st_banner_sub = ParagraphStyle(
        'BannerSub',
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#e2e8f0'),
        alignment=1
    )
    st_th = ParagraphStyle(
        'TH',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white,
        alignment=0
    )
    st_td_eq = ParagraphStyle(
        'TDEq',
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#0f172a')
    )
    st_td = ParagraphStyle(
        'TD',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )
    st_td_bold = ParagraphStyle(
        'TDBold',
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#0f172a')
    )
    st_proto = ParagraphStyle(
        'Proto',
        fontName='Helvetica',
        fontSize=7.2,
        leading=9,
        textColor=colors.HexColor('#7f1d1d')
    )
    st_map_hdr = ParagraphStyle(
        'MapHdr',
        fontName='Helvetica-Bold',
        fontSize=8.2,
        leading=10,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=1
    )
    st_sign_line = ParagraphStyle(
        'SignLine',
        fontName='Helvetica',
        fontSize=8,
        leading=9,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    st_sign_lbl = ParagraphStyle(
        'SignLbl',
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor('#334155'),
        alignment=1
    )

    story = []

    # 1. Header
    header_data = [[
        Paragraph('<b>ESTADO DO RIO DE JANEIRO • PREFEITURA MUNICIPAL DE CARMO</b><br/>'
                  'SECRETARIA MUNICIPAL DE SAÚDE • SUBSECRETARIA DE VIGILÂNCIA EM SAÚDE<br/>'
                  '<b>COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES</b><br/>'
                  'PLANO OPERACIONAL DIÁRIO DE CAMPO • DELIMITAÇÃO TÉCNICA DE BLOQUEIO (MS / SES-RJ)', st_title)
    ]]
    t_header = Table(header_data, colWidths=[555])
    t_header.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 5))

    # 2. Banner
    banner_data = [
        [Paragraph('<b>SEGUNDA-FEIRA – OPERAÇÃO DE ABERTURA NA SEDE URBANA</b>', st_banner)],
        [Paragraph('<b>Território:</b> Progresso, Centro, Boa Ideia e Eixo Usina | <b>Logística:</b> 10 ACEs (5 Duplas Ativas) | Apoio: Caminhonete de Carga + Viatura Leve', st_banner_sub)]
    ]
    t_banner = Table(banner_data, colWidths=[555])
    t_banner.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#0f172a')),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_banner)
    story.append(Spacer(1, 5))

    # 3. Equipes
    rows = [
        [Paragraph('<b>EQUIPE DE CAMPO</b>', st_th),
         Paragraph('<b>TERRITÓRIO / SETOR</b>', st_th),
         Paragraph('<b>FOCO OVITRAMPA<br/>(CARGA ACUMULADA 2 SEMANAS: A + B)</b>', st_th),
         Paragraph('<b>DELIMITAÇÃO OPERACIONAL E DIRETRIZ DE AÇÃO</b>', st_th)]
    ]
    equipes = [
        ('Equipe 1 (2 ACEs)', 'Progresso (Q-01)', '<b>OV-23 • Pousada Valle do Sol</b><br/><font color="#b91c1c"><b>342 ovos</b></font> (Sem A=147 + Sem B=195)', 'Núcleo 100m (Pousada, R. Manoel José de Moraes 51 e R. José Cassane) + Perímetro 200m (Progresso). Foco em piscinas desativadas, ralos e reservatórios.'),
        ('Equipe 2 (2 ACEs)', 'Centro (Q-13)', '<b>OV-10 • R. Oscar de Souza Curty, 42</b><br/><font color="#b91c1c"><b>242 ovos</b></font> (Sem A=41 + Sem B=201)', 'Núcleo 100m (Oscar Curty e Celso C. Faria) + Perímetro 200m (comércios e lajes). Foco em calhas prediais, marquises e água empoçada.'),
        ('Equipe 3 (2 ACEs)', 'Progresso (Q-09)', '<b>OV-21 • R. Silvio Geraldo França, 753</b><br/><font color="#b91c1c"><b>100 ovos</b></font> (Sem A=100 + Sem B=0)', 'Núcleo 100m (nº 700 a 800) + Perímetro 200m (encosta). Foco em entulho de obras, fundos de vale e caixas baixas.'),
        ('Equipe 4 (2 ACEs)', 'Centro / Boa Ideia', '<b>OV-06 e OV-18 • R. Raul Fernandes e Benjamim Lopes</b><br/><font color="#15803d">Varredura Focal da Sede</font>', 'Varredura de transição no Centro e Boa Ideia. Inspeção de calhas, tambores plásticos e conscientização de moradores.'),
        ('Equipe 5 (2 ACEs)', 'Eixo Usina / Ilha', '<b>OV-39 e OV-40 • R. Hernane Barbosa e Carlos Cabral</b><br/><font color="#15803d">Vistoria Preventiva Ribeirinha</font>', 'Vistoria preventiva ribeirinha e preparação para o ciclo de Ilha dos Pombos e Usina Light.')
    ]
    for eq, terr, foco, dir in equipes:
        rows.append([Paragraph(eq, st_td_eq), Paragraph(terr, st_td), Paragraph(foco, st_td_bold), Paragraph(dir, st_td)])

    t_eq = Table(rows, colWidths=[80, 95, 140, 240])
    t_eq.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    story.append(t_eq)
    story.append(Spacer(1, 5))

    # 4. Normativa
    proto_data = [[
        Paragraph('<b>DIRETRIZES NORMATIVAS DE DELIMITAÇÃO TÉCNICA (MINISTÉRIO DA SAÚDE / SES-RJ):</b><br/>'
                  '• <b>Raio de 100 metros (Núcleo Focal Prioritário):</b> Área de dispersão biológica de voo da fêmea a partir da ovitrampa positiva. Varredura e eliminação mecânica obrigatória de depósitos em 100% dos imóveis e quintais confrontantes.<br/>'
                  '• <b>Raio de 200 metros (Perímetro Oficial MS):</b> Faixa ampliada de bloqueio perifocal abrangendo até 9 quarteirões vizinhos para contenção de postura fracionada e dispersão em áreas com alta densidade de ovos.', st_proto)
    ]]
    t_proto = Table(proto_data, colWidths=[555])
    t_proto.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#fef2f2')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#f87171')),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_proto)
    story.append(Spacer(1, 4))

    # 5. Header dos Mapas
    story.append(Paragraph('<b>RECORTE SATÉLITE INDIVIDUAL DAS ARMADILHAS FOCO (NÚCLEO 100m E PERÍMETRO 200m)</b>', st_map_hdr))
    story.append(Spacer(1, 3))

    # 6. Mapas de 3 colunas (width=181, height=190)
    img1 = Image('output/mapas_individuais/segunda_ov23_pousada.png', width=181, height=190)
    img2 = Image('output/mapas_individuais/segunda_ov10_oscar_curty.png', width=181, height=190)
    img3 = Image('output/mapas_individuais/segunda_ov21_silvio_franca.png', width=181, height=190)

    map_table = Table([[img1, img2, img3]], colWidths=[185, 185, 185])
    map_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING', (0,0), (-1,-1), 1),
        ('RIGHTPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(map_table)
    story.append(Spacer(1, 5))

    # 7. Metas e Logistica
    st_metas = ParagraphStyle(
        'Metas',
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.2,
        textColor=colors.HexColor('#1e293b')
    )
    metas_data = [[
        Paragraph('<b>METAS OPERACIONAIS E LOGÍSTICA:</b> Varredura de 100% dos imóveis nos núcleos focais de 100m da Pousada e Oscar Curty. Meta diária de campo: 150 imóveis inspecionados. Abastecimento de larvicida biológico (Bti) e pranchetas às 07:30.', st_metas)
    ]]
    t_metas = Table(metas_data, colWidths=[555])
    t_metas.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_metas)
    story.append(Spacer(1, 6))

    # 8. Signatures em 2 linhas limpas
    sign_data = [
        [
            Paragraph('__________________________________________', st_sign_line),
            Paragraph('__________________________________________', st_sign_line),
            Paragraph('Data da Ação:', st_sign_lbl)
        ],
        [
            Paragraph('<b>Supervisor de Campo do Dia</b>', st_sign_lbl),
            Paragraph('<b>Coordenação de Zoonoses / Vigilância Ambiental</b>', st_sign_lbl),
            Paragraph('<b>___/___/2026</b>', st_sign_lbl)
        ]
    ]
    t_sign = Table(sign_data, colWidths=[225, 225, 105])
    t_sign.setStyle(TableStyle([
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(t_sign)

    doc.build(story)

    # Check page count
    pdf_doc = pymupdf.open(pdf_path)
    page_count = len(pdf_doc)
    print(f'Total pages: {page_count}')
    page = pdf_doc[0]
    pix = page.get_pixmap(dpi=150)
    pix.save('output/test/test_plano_segunda.png')
    print('Rendered to output/test/test_plano_segunda.png')

if __name__ == '__main__':
    test()
