import os
import shutil
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
import pypdf

PLANOS_DIARIOS_DATA = [
    {
        "cod": "SEGUNDA",
        "nome_arquivo": "PLANO_DE_CAMPO_SEGUNDA_FEIRA.pdf",
        "dia_extenso": "SEGUNDA-FEIRA – OPERAÇÃO DE ABERTURA NA SEDE URBANA",
        "territorio": "Progresso, Centro, Boa Ideia e Eixo Usina",
        "frota_efetivo": "10 ACEs (5 Duplas Ativas) | Apoio: Caminhonete de Carga + Viatura Leve",
        "mapas_cards": [
            "output/mapas_individuais/segunda_ov23_pousada.png",
            "output/mapas_individuais/segunda_ov10_oscar_curty.png",
            "output/mapas_individuais/segunda_ov21_silvio_franca.png"
        ],
        "escala_10_agentes": [
            ("Equipe 1 (2 ACEs)", "Progresso (Q-01)", "<b>OV-23 • Pousada Valle do Sol</b><br/><font color=\"#b91c1c\"><b>342 ovos</b></font> (Sem A=147 + Sem B=195)", "Núcleo 100m (Pousada, R. Manoel José de Moraes 51 e R. José Cassane) + Perímetro 200m (Progresso). Foco em piscinas desativadas, ralos e reservatórios."),
            ("Equipe 2 (2 ACEs)", "Centro (Q-13)", "<b>OV-10 • R. Oscar de Souza Curty, 42</b><br/><font color=\"#b91c1c\"><b>242 ovos</b></font> (Sem A=41 + Sem B=201)", "Núcleo 100m (Oscar Curty e Celso C. Faria) + Perímetro 200m (comércios e lajes). Foco em calhas prediais, marquises e água empoçada."),
            ("Equipe 3 (2 ACEs)", "Progresso (Q-09)", "<b>OV-21 • R. Silvio Geraldo França, 753</b><br/><font color=\"#b91c1c\"><b>100 ovos</b></font> (Sem A=100 + Sem B=0)", "Núcleo 100m (nº 700 a 800) + Perímetro 200m (encosta). Foco em entulho de obras, fundos de vale e caixas baixas."),
            ("Equipe 4 (2 ACEs)", "Centro / Boa Ideia", "<b>OV-06 e OV-18 • R. Raul Fernandes e Benjamim Lopes</b><br/><font color=\"#15803d\">Varredura Focal da Sede</font>", "Varredura de transição no Centro e Boa Ideia. Inspeção de calhas, tambores plásticos e conscientização de moradores."),
            ("Equipe 5 (2 ACEs)", "Eixo Usina / Ilha", "<b>OV-39 e OV-40 • R. Hernane Barbosa e Carlos Cabral</b><br/><font color=\"#15803d\">Vistoria Preventiva Ribeirinha</font>", "Vistoria preventiva ribeirinha e preparação para o ciclo de Ilha dos Pombos e Usina Light.")
        ],
        "metas": "Varredura de 100% dos imóveis nos núcleos focais de 100m da Pousada e Oscar Curty. Meta diária de campo: 150 imóveis inspecionados. Abastecimento de larvicida biológico (Bti) e pranchetas às 07:30."
    },
    {
        "cod": "TERCA",
        "nome_arquivo": "PLANO_DE_CAMPO_TERCA_FEIRA.pdf",
        "dia_extenso": "TERÇA-FEIRA – BLOQUEIO EM ENCOSTAS E ÁREAS ALTAS",
        "territorio": "Val Paraíso, Jd. Centenário, Caixa d'Água e Morro do Estado",
        "frota_efetivo": "10 ACEs (5 Duplas Ativas) | Apoio: Caminhonete de Apoio Tático",
        "mapas_cards": [
            "output/mapas_individuais/terca_ov31_val_paraiso.png",
            "output/mapas_individuais/terca_ov05_jd_centenario.png",
            "output/mapas_individuais/terca_ov35_caixa_dagua.png"
        ],
        "escala_10_agentes": [
            ("Equipe 1 (2 ACEs)", "Val Paraíso (Q-05)", "<b>OV-31 • R. Roberto Simões de Araújo, 98</b><br/><font color=\"#b91c1c\"><b>192 ovos</b></font> (Sem A=51 + Sem B=141)", "Núcleo 100m (Roberto Simões e Emanuel de Moraes) + Perímetro 200m. Foco em quintais em declive acentuado e tonéis externos de água pluvial."),
            ("Equipe 2 (2 ACEs)", "Jd. Centenário (Q-17)", "<b>OV-05 • R. Ernesto Wermelinger, 63</b><br/><font color=\"#b91c1c\"><b>173 ovos</b></font> (Sem A=6 + Sem B=167)", "Núcleo 100m (Wermelinger e Celso Faria) + Perímetro 200m (Jd. Centenário). Foco em tambores de chuva, pratinhos e bromélias."),
            ("Equipe 3 (2 ACEs)", "Caixa d'Água (Q-13)", "<b>OV-35 • R. Senador Dantas, 269</b><br/><font color=\"#b91c1c\"><b>121 ovos</b></font> (Sem A=4 + Sem B=117)", "Núcleo 100m (Senador Dantas alta) + Perímetro 200m. Foco em terrenos baldios com entulho, calhas altas e caixas de gordura."),
            ("Equipe 4 (2 ACEs)", "Boa Ideia / Encostas", "<b>OV-07, OV-15 e OV-28 • Jair Nunes e Adalberto Pires</b><br/><font color=\"#15803d\">Varredura de Encostas</font>", "Varredura em quintais de fundo de vale e terrenos baldios do Morro do Estado e Boa Ideia."),
            ("Equipe 5 (2 ACEs)", "Centro / Botafogo", "<b>OV-11 (Asilo São Vicente) e OV-12 (Ladeira J. Alfredo)</b><br/><font color=\"#15803d\">Imóveis Especiais</font>", "Vistoria minuciosa em imóveis especiais e áreas institucionais de alto fluxo e convivência coletiva.")
        ],
        "metas": "Eliminação de criadouros em quintais de declive e vedação de caixas d'água no solo. Meta diária: 140 imóveis inspecionados. Vistoria prioritária em encostas e terrenos baldios."
    },
    {
        "cod": "QUARTA",
        "nome_arquivo": "PLANO_DE_CAMPO_QUARTA_FEIRA.pdf",
        "dia_extenso": "QUARTA-FEIRA – GRANDE MUTIRÃO DISTRITAL EM INFLUÊNCIA",
        "territorio": "Influência (2º Distrito – Epicentro Rural) + Retorno e Resgate na Sede Urbana",
        "frota_efetivo": "10 ACEs (3 Duplas em Influência + 2 Duplas na Sede) | Transporte: Van / Caminhonete + Viatura",
        "mapas_cards": [
            "output/mapas_individuais/quarta_ov36_manoel_cirilo.png",
            "output/mapas_individuais/quarta_ov38_br116.png",
            "output/mapas_individuais/quarta_ov51_machareth.png"
        ],
        "escala_10_agentes": [
            ("Equipe 1 (2 ACEs)", "Influência (Q-05)", "<b>OV-36 • R. Manoel Cirilo da Silva, 116</b><br/><font color=\"#b91c1c\"><b>222 ovos</b></font> (Sem A=53 + Sem B=169)", "Núcleo 100m (extensão habitada da R. Manoel Cirilo) + Perímetro 200m. Foco em tonéis de 200L, bebedouros de animais e galinheiros."),
            ("Equipe 2 (2 ACEs)", "Influência (Q-06 - BR-116)", "<b>OV-38 • Rodovia BR-116, KM 12</b><br/><font color=\"#b91c1c\"><b>210 ovos</b></font> (Sem A=25 + Sem B=185)", "Núcleo 100m (faixa marginal da rodovia) + Perímetro 200m. Foco em borracharias, oficinas mecânicas, pilhas de pneus e sucatas."),
            ("Equipe 3 (2 ACEs)", "Influência (Q-11)", "<b>OV-51 • R. Maria da Silva Machareth, 182</b><br/><font color=\"#b91c1c\"><b>217 ovos</b></font> (Sem A=3 + Sem B=214)", "Núcleo 100m (R. Machareth) + Perímetro 200m. Foco em tambores de água da chuva, fossas abertas e caixas d'água baixas."),
            ("Equipe 4 (2 ACEs)", "Sede Urbana (Progresso)", "<b>Resgate de Imóveis Fechados de Segunda</b><br/><font color=\"#15803d\">Progresso (Q-01 e Q-09)</font>", "Visita de resgate aos imóveis fechados no Progresso para garantir 100% de cobertura nos perímetros focais."),
            ("Equipe 5 (2 ACEs)", "Sede Urbana (Centro)", "<b>Resgate de Imóveis Fechados de Segunda</b><br/><font color=\"#15803d\">Centro (Oscar Curty / Comércio)</font>", "Recuperação de visitas comerciais e residenciais pendentes na R. Oscar Curty e imediações da Sede.")
        ],
        "metas": "Varredura completa do eixo urbano e rodoviário de Influência e recuperação de pendências na Sede. Meta diária: 180 imóveis. Tratamento larvicida imediato em depósitos não elimináveis."
    },
    {
        "cod": "QUINTA",
        "nome_arquivo": "PLANO_DE_CAMPO_QUINTA_FEIRA.pdf",
        "dia_extenso": "QUINTA-FEIRA – BLOQUEIO NO EIXO RIBEIRINHO E USINA",
        "territorio": "Porto Velho do Cunha (3º Distrito) e Ilha dos Pombos / Usina Light",
        "frota_efetivo": "10 ACEs (3 Duplas em Porto Velho/Light + 2 Duplas na Sede) | Viatura Distrital + Viatura Sede",
        "mapas_cards": [
            "output/mapas_individuais/quinta_ov45_major_fajardo.png",
            "output/mapas_individuais/quinta_ov41_beira_rio.png",
            "output/mapas_individuais/quinta_ov44_esf_porto_velho.png"
        ],
        "escala_10_agentes": [
            ("Equipe 1 (2 ACEs)", "Porto Velho (Q-01)", "<b>OV-45 • R. Major Fajardo, 601</b><br/><font color=\"#b91c1c\"><b>241 ovos</b></font> (Sem A=35 + Sem B=206)", "Núcleo 100m (nº 550 a 650) + Perímetro 200m (faixa ribeirinha). Foco em galpões, caçambas, embarcações e recipientes plásticos."),
            ("Equipe 2 (2 ACEs)", "Ilha dos Pombos (Q-01)", "<b>OV-41 • R. Beira Rio, 130</b><br/><font color=\"#b91c1c\"><b>203 ovos</b></font> (Sem A=40 + Sem B=163)", "Núcleo 100m (orla da R. Beira Rio) + Perímetro 200m. Foco em canoas com água de chuva, lonas plásticas e depósitos de pesca."),
            ("Equipe 3 (2 ACEs)", "Porto Velho (Q-10)", "<b>OV-44 • R. Major Fajardo, 312 (ESF P. Velho)</b><br/><font color=\"#b91c1c\"><b>102 ovos</b></font> (Sem A=2 + Sem B=100)", "Núcleo 100m (entorno da ESF Porto Velho) + Perímetro 200m. Foco em calhas prediais, garrafas retornáveis e caixas baixas."),
            ("Equipe 4 (2 ACEs)", "Sede (Botafogo / Caixa d'Água)", "<b>OV-16 e OV-13 • Soares Brandão e Ulisses Lengruber</b><br/><font color=\"#15803d\">Varredura de Apoio</font>", "Varredura de apoio na Sede em quarteirões com depósitos em quintais e calhas."),
            ("Equipe 5 (2 ACEs)", "Sede (Morro do Estado / Val Paraíso)", "<b>OV-26, OV-27 e OV-32 • Edgar Gismonti e M. Gomes</b><br/><font color=\"#15803d\">Inspeção de Encostas</font>", "Inspeção em terrenos baldios e residências de encosta da Sede Urbana.")
        ],
        "metas": "Eliminação de criadouros em embarcações e quintais ribeirinhos de Porto Velho e Usina. Meta diária: 150 imóveis. Bloqueio perifocal reforçado ao longo da calha do Rio Paraíba do Sul."
    },
    {
        "cod": "SEXTA",
        "nome_arquivo": "PLANO_DE_CAMPO_SEXTA_FEIRA.pdf",
        "dia_extenso": "SEXTA-FEIRA – CONSOLIDAÇÃO DISTRITAL E REUNIÃO GERAL",
        "territorio": "Barra de São Francisco (5º Dist.), Córrego da Prata (4º Dist.) e Varredura Final",
        "frota_efetivo": "10 ACEs (5 Duplas Ativas até 14:30) | 15:00: Reunião Técnica Geral com os 10 ACEs",
        "mapas_cards": [
            "output/mapas_individuais/sexta_ov55_antonio_serafim.png",
            "output/mapas_individuais/sexta_ov54_escola_barra.png",
            "output/mapas_individuais/sexta_ov48_corrego_prata.png"
        ],
        "escala_10_agentes": [
            ("Equipe 1 (2 ACEs)", "Barra de S. Francisco (Q-01)", "<b>OV-55 • R. Antônio R. Serafim</b><br/><font color=\"#b91c1c\"><b>125 ovos</b></font> (Sem A=5 + Sem B=120)", "Núcleo 100m (entorno da R. Antônio Serafim) + Perímetro 200m. Foco em bebedouros de animais e depósitos em quintais rurais."),
            ("Equipe 2 (2 ACEs)", "Barra de S. Francisco (Q-01)", "<b>OV-54 • Sebastião F. / Escola da Barra</b><br/><font color=\"#b91c1c\"><b>74 ovos</b></font> (Sem A=13 + Sem B=61)", "Núcleo 100m (entorno da Escola da Barra) + Perímetro 200m. Vistoria predial escolar e caixas d'água no solo."),
            ("Equipe 3 (2 ACEs)", "Córrego da Prata (Q-01)", "<b>OV-48 • R. Benfica (ESF Córrego da Prata)</b><br/><font color=\"#b91c1c\"><b>121 ovos</b></font> (Sem A=7 + Sem B=114)", "Núcleo 100m (entorno da ESF Prata) + Perímetro 200m. Foco em calhas e tambores de captação de chuva."),
            ("Equipe 4 (2 ACEs)", "Sede Urbana", "<b>Resgate Final de Imóveis Fechados da Semana</b><br/><font color=\"#15803d\">Sede Urbana (Varredura de Pendências)</font>", "Resgate de imóveis fechados remanescentes de Terça e Quarta em toda a Sede para fechamento dos 100% de cobertura."),
            ("Equipe 5 (2 ACEs)", "Sede / Laboratório", "<b>Laboratório / Coordenação de Zoonoses</b><br/><font color=\"#15803d\">Consolidação e Triagem de Larvas</font>", "Consolidação de planilhas de campo, conferência de fichas e triagem de larvas para a Reunião Técnica Geral.")
        ],
        "metas": "Conclusão de 100% dos blocos planejados até 14h30. Reunião Técnica Geral às 15h00 na Coordenação de Zoonoses. Meta diária: 120 imóveis."
    }
]

def gerar_pdf_diario_com_satelite(dados, dest_folder, desktop_folder):
    caminho_local = os.path.join(dest_folder, dados["nome_arquivo"])
    
    doc = SimpleDocTemplate(
        caminho_local,
        pagesize=A4,
        leftMargin=20,
        rightMargin=20,
        topMargin=15,
        bottomMargin=14
    )
    
    styles = getSampleStyleSheet()
    
    st_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    st_banner = ParagraphStyle(
        'Banner',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=12.5,
        textColor=colors.white,
        alignment=1
    )
    st_banner_sub = ParagraphStyle(
        'BannerSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#e2e8f0'),
        alignment=1
    )
    st_th = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white,
        alignment=0
    )
    st_td_eq = ParagraphStyle(
        'TDEq',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#0f172a')
    )
    st_td = ParagraphStyle(
        'TD',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1e293b')
    )
    st_td_bold = ParagraphStyle(
        'TDBold',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#0f172a')
    )
    st_proto = ParagraphStyle(
        'Proto',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9,
        textColor=colors.HexColor('#7f1d1d')
    )
    st_map_hdr = ParagraphStyle(
        'MapHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.2,
        leading=10,
        textColor=colors.HexColor('#1e3a8a'),
        alignment=1
    )
    st_metas = ParagraphStyle(
        'Metas',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.2,
        textColor=colors.HexColor('#1e293b')
    )
    st_sign_line = ParagraphStyle(
        'SignLine',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=9,
        textColor=colors.HexColor('#0f172a'),
        alignment=1
    )
    st_sign_lbl = ParagraphStyle(
        'SignLbl',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
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
                      "PLANO OPERACIONAL DIÁRIO DE CAMPO • DELIMITAÇÃO TÉCNICA DE BLOQUEIO (MS / SES-RJ)", st_title)
        ]
    ]
    t_header = Table(header_data, colWidths=[555])
    t_header.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(t_header)
    story.append(Spacer(1, 5))
    
    # 2. BANNER DO DIA
    banner_data = [
        [
            Paragraph(f"<b>{dados['dia_extenso']}</b>", st_banner)
        ],
        [
            Paragraph(f"<b>Território:</b> {dados['territorio']} | <b>Logística:</b> {dados['frota_efetivo']}", st_banner_sub)
        ]
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
    
    # 3. TABELA OPERACIONAL DAS 5 EQUIPES (10 ACEs TRABALHANDO TODOS OS DIAS)
    table_rows = [
        [
            Paragraph("<b>EQUIPE DE CAMPO</b>", st_th),
            Paragraph("<b>TERRITÓRIO / SETOR</b>", st_th),
            Paragraph("<b>FOCO OVITRAMPA<br/>(CARGA ACUMULADA 2 SEMANAS: A + B)</b>", st_th),
            Paragraph("<b>DELIMITAÇÃO OPERACIONAL E DIRETRIZ DE AÇÃO</b>", st_th)
        ]
    ]
    
    for eq_nome, terr, ovs, acao in dados["escala_10_agentes"]:
        table_rows.append([
            Paragraph(eq_nome, st_td_eq),
            Paragraph(terr, st_td),
            Paragraph(ovs, st_td_bold),
            Paragraph(acao, st_td)
        ])
        
    t_escala = Table(table_rows, colWidths=[80, 95, 140, 240])
    t_escala.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1e3a8a')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8fafc')])
    ]))
    story.append(t_escala)
    story.append(Spacer(1, 5))
    
    # 4. QUADRO TÉCNICO DE DELIMITAÇÃO (DIRETRIZES MINISTÉRIO DA SAÚDE / SES-RJ)
    proto_data = [
        [
            Paragraph("<b>DIRETRIZES NORMATIVAS DE DELIMITAÇÃO TÉCNICA (MINISTÉRIO DA SAÚDE / SES-RJ):</b><br/>"
                      "• <b>Raio de 100 metros (Núcleo Focal Prioritário):</b> Área de dispersão biológica de voo da fêmea a partir da ovitrampa positiva. Varredura e eliminação mecânica obrigatória de depósitos em 100% dos imóveis e quintais confrontantes.<br/>"
                      "• <b>Raio de 200 metros (Perímetro Oficial MS):</b> Faixa ampliada de bloqueio perifocal abrangendo até 9 quarteirões vizinhos para contenção de postura fracionada e dispersão em áreas com alta densidade de ovos.", st_proto)
        ]
    ]
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
    
    # 5. HEADER SEÇÃO DE MAPAS
    story.append(Paragraph("<b>RECORTE SATÉLITE INDIVIDUAL DAS ARMADILHAS FOCO (NÚCLEO 100m E PERÍMETRO 200m)</b>", st_map_hdr))
    story.append(Spacer(1, 3))
    
    # 6. TABELA DE 3 COLUNAS COM OS 3 CARDS DE SATÉLITE INDIVIDUAIS
    imgs_row = []
    for img_path in dados["mapas_cards"]:
        if os.path.exists(img_path):
            img_obj = Image(img_path, width=181, height=190)
            imgs_row.append(img_obj)
        else:
            imgs_row.append(Spacer(1, 190))
            
    t_mapas = Table([imgs_row], colWidths=[185, 185, 185])
    t_mapas.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 1),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1),
        ('LEFTPADDING', (0,0), (-1,-1), 1),
        ('RIGHTPADDING', (0,0), (-1,-1), 1),
    ]))
    story.append(t_mapas)
    story.append(Spacer(1, 5))
    
    # 7. METAS E DIRETRIZES LOGÍSTICAS
    metas_data = [
        [
            Paragraph(f"<b>METAS OPERACIONAIS E LOGÍSTICA:</b> {dados['metas']}", st_metas)
        ]
    ]
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
    
    # 8. RODAPÉ COM ASSINATURAS EM 2 LINHAS LIMPAS
    sign_data = [
        [
            Paragraph("__________________________________________", st_sign_line),
            Paragraph("__________________________________________", st_sign_line),
            Paragraph("Data da Ação:", st_sign_lbl)
        ],
        [
            Paragraph("<b>Supervisor de Campo do Dia</b>", st_sign_lbl),
            Paragraph("<b>Coordenação de Zoonoses / Vigilância Ambiental</b>", st_sign_lbl),
            Paragraph("<b>___/___/2026</b>", st_sign_lbl)
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
    
    # Valida com PyPDF se tem exatamente 1 pagina
    reader = pypdf.PdfReader(caminho_local)
    num_pags = len(reader.pages)
    if num_pags != 1:
        print(f"ALERTA: {dados['nome_arquivo']} gerou {num_pags} paginas!")
    else:
        print(f"SUCESSO: {dados['nome_arquivo']} possui EXATAMENTE 1 pagina.")
        
    # Copia para Desktop
    caminho_desktop = os.path.join(desktop_folder, dados["nome_arquivo"])
    shutil.copyfile(caminho_local, caminho_desktop)
    
    # Copia para raiz do projeto tambem para facil acesso
    shutil.copyfile(caminho_local, dados["nome_arquivo"])
    print(f"Salvo em: {caminho_local}, {caminho_desktop} e ./{dados['nome_arquivo']}")

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
        
    print("\n=======================================================")
    print("RELATÓRIO DE VALIDAÇÃO DOS 5 PLANOS OPERACIONAIS (A4):")
    for r in relatorio:
        print(f" - {r['arquivo']}: {r['paginas']} página(s) [STATUS: {'PERFEITO' if r['paginas'] == 1 else 'REVISAR'}]")
    print("=======================================================")

if __name__ == '__main__':
    gerar_todos_os_planos_com_satelite()
