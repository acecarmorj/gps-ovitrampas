#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gera os 2 Cadernos Oficiais de Fichas de Campo para Prancheta em Papel A4:
1. FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf (5 Páginas A4 — 1 página por Dia: Segunda a Sexta)
2. FICHAS_DE_CAMPO_POR_EQUIPE_1_A_5.pdf (5 Páginas A4 — 1 página exclusiva por Equipe: Equipe 1 a Equipe 5)

Regras cumpridas 100%:
- Horário Corrido das 08h00 às 13h00 (Saída e encontro sempre no P.A. - Ponto de Apoio).
- Sexta-feira: 08h00 às 12h00 resgate de imóveis fechados em campo + 12h00 às 13h00 Reunião Geral no P.A.
- 10 ACEs (Equipes 1 a 5) 100% em campo todos os dias (serviço interno possui equipe própria).
- Frota real: 1 Carro (5 lugares) + 1 Caminhonete (2 lugares) = máx. 7 lugares móveis.
- Classificação Completa de Criadouros (Ministério da Saúde / PNCD: A1, A2, B, C, D1, D2, E).
"""

import os
import shutil
import pypdf
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
        "tema": "Operação Integrada: Sede Urbana (Progresso e Centro) + Barra de São Francisco",
        "bairros": "Carmo Sede (Progresso e Centro) + Barra de São Francisco (5º Dist.)",
        "equipe_sugerida": "Horário Corrido 08h00 às 13h00 (Saída do P.A.) | Eq 1-2 (Carro 5L p/ Barra) + Eq 3-5 (Sede + Caminhonete 2L)",
        "alvos": [
            {
                "ov": "OV-23 e OV-21 (Equipes 3 e 5)",
                "local": "Pousada Valle do Sol (OV-23) e R. Silvio G. França (OV-21)",
                "morador": "Eq 3 (2 ACEs) na OV-23 | Eq 5 (2 ACEs) na OV-21 • 08h00 às 13h00",
                "endereco": "R. Manoel J. Moraes, 51 (Q-01) e R. Silvio G. França, 753 (Q-09)",
                "bairro": "Progresso (Sede)",
                "quarteirao": "Q-01 / Q-09",
                "ovos": "OV-23: 342 OVOS [A:147+B:195] | OV-21: 100 OVOS [A:100+B:0]",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Pousada Valle do Sol, R. José Cassane e R. Silvio G. França (nº 700 a 800). Perímetro 200m (MS): Quarteirões adjacentes, piscinas, ralos e encosta.",
            },
            {
                "ov": "OV-10 e OV-12 (Equipe 4)",
                "local": "R. Oscar de Souza Curty (OV-10) e Ladeira João Alfredo (OV-12)",
                "morador": "Eq 4 (2 ACEs) em Campo a Pé no Centro • 08h00 às 13h00",
                "endereco": "R. Oscar de Souza Curty, 42 (Q-13) e Lad. João Alfredo, 130 (Q-06)",
                "bairro": "Centro (Sede)",
                "quarteirao": "Q-13 / Q-06",
                "ovos": "OV-10: 242 OVOS [A:41+B:201] | OV-12: 84 OVOS [A:64+B:20]",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Quarteirão comercial/residencial entre Oscar Curty, Celso C. Faria e Lad. João Alfredo. Perímetro 200m (MS): Marquises, lajes e calhas centrais.",
            },
            {
                "ov": "OV-55, OV-54 e OV-56 (Equipes 1 e 2)",
                "local": "Barra de São Francisco (Núcleo Rural e Entorno Escolar)",
                "morador": "Eq 1 (2 ACEs) na OV-55 | Eq 2 (2 ACEs) nas OV-54 e OV-56 (Carro 5L)",
                "endereco": "R. Antônio R. Serafim e R. Sebastião F. da Costa",
                "bairro": "Barra de S. Francisco",
                "quarteirao": "Q-01",
                "ovos": "OV-55: 125 [A:5+B:120] | OV-54: 74 [A:13+B:61] | OV-56: 69 [A:3+B:66]",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: R. Antônio Serafim, Sebastião Costa e Escola da Barra. Perímetro 200m (MS): Bebedouros de animais, tonéis rurais, calhas e caixas no solo.",
            }
        ]
    },
    {
        "dia_cod": "terca",
        "dia_nome": "TERÇA-FEIRA",
        "tema": "Bloqueio Vetorial 100% em Campo nas Encostas e Cotas Altas da Sede Urbana",
        "bairros": "Val Paraíso, Jd. Centenário, Caixa d'Água, Morro do Estado, Boa Ideia e Botafogo",
        "equipe_sugerida": "Horário Corrido 08h00 às 13h00 (Saída do P.A.) | Eq 1 a 5 (10 ACEs em campo a pé + Caminhonete 2L)",
        "alvos": [
            {
                "ov": "OV-31, OV-34, OV-28, OV-08 e OV-15 (Equipes 1 e 4)",
                "local": "Encostas do Val Paraíso (Eq 1) e Morro do Estado / Boa Ideia (Eq 4)",
                "morador": "Eq 1: OV-31 e OV-34 | Eq 4: OV-28, OV-08 e OV-15 • 08h00 às 13h00",
                "endereco": "R. Roberto Simões, 98 (Val Paraíso) e R. Adalberto Pires, 45 (Morro)",
                "bairro": "Val Paraíso / Morro / Boa Ideia",
                "quarteirao": "Q-05 / Encostas",
                "ovos": "OV-31: 192 [A:51+B:141] | OV-34: 66 | OV-28: 95 [A:86+B:9] | OV-08: 93 | OV-15: 78",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: R. Roberto Simões, Emanuel de Moraes e Adalberto Pires. Perímetro 200m (MS): Quintais em declive acentuado, barrancos e tonéis pluviais.",
            },
            {
                "ov": "OV-05, OV-03 e OV-04 (Equipe 2)",
                "local": "Jardim Centenário (Quarteirão Q-17 e Adjacências)",
                "morador": "Eq 2 (2 ACEs) em Campo no Jardim Centenário • 08h00 às 13h00",
                "endereco": "Rua Ernesto Wermelinger, 63 e encontro com Celso C. Faria",
                "bairro": "Jardim Centenário",
                "quarteirao": "Q-17",
                "ovos": "OV-05: 173 OVOS [A:6+B:167] | OV-03: 53 OVOS | OV-04: 53 OVOS",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Quarteirão Q-17 entre R. Ernesto Wermelinger e Celso C. Faria. Perímetro 200m (MS): Tambores de lavanderia, bromélias e caixas d'água no solo.",
            },
            {
                "ov": "OV-35, OV-13, OV-16, OV-12 e OV-11 (Equipes 3 e 5)",
                "local": "Caixa d'Água (Eq 3) e Botafogo / Centro / Asilo (Eq 5)",
                "morador": "Eq 3: OV-35 e OV-13 | Eq 5: OV-16, OV-12 e OV-11 (Asilo) • 08h00 às 13h00",
                "endereco": "R. Senador Dantas, 269 (Caixa d'Água) e R. Soares Brandão (Botafogo)",
                "bairro": "Caixa d'Água / Botafogo",
                "quarteirao": "Q-13 / Q-06",
                "ovos": "OV-35: 121 [A:4+B:117] | OV-13: 71 [A:48+B:23] | OV-16: 89 [A:0+B:89] | OV-12: 84 | OV-11: 24",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: Trecho alto da Senador Dantas, R. Soares Brandão e Asilo São Vicente. Perímetro 200m (MS): Terrenos baldios, calhas altas e caixas de gordura.",
            }
        ]
    },
    {
        "dia_cod": "quarta",
        "dia_nome": "QUARTA-FEIRA",
        "tema": "Operação Distrital (Influência + Usina Light) & Campo Sede Urbana",
        "bairros": "Influência (2º Dist.), Usina Light / Ilha dos Pombos e Sede Urbana",
        "equipe_sugerida": "Horário Corrido 08h00 às 13h00 (P.A.) | Eq 1-3 (Carro 5L + Caminhonete 2L) | Eq 4-5 (Sede a pé)",
        "alvos": [
            {
                "ov": "OV-36, OV-51, OV-38 e OV-50 (Equipes 1 e 2)",
                "local": "Influência Urbano (Eq 1) e Influência Rodovia BR-116 (Eq 2)",
                "morador": "Eq 1 (2 ACEs): OV-36 e OV-51 | Eq 2 (2 ACEs): OV-38 e OV-50 • 08h00 às 13h00",
                "endereco": "R. Manoel Cirilo, 116 (Q-05), R. Maria Machareth, 182 (Q-11) e BR-116 KM 12",
                "bairro": "Influência (2º Dist.)",
                "quarteirao": "Q-05 / Q-06 / Q-11",
                "ovos": "OV-36: 222 [A:53+B:169] | OV-38: 210 [A:25+B:185] | OV-51: 109 [A:3+B:106] | OV-50: 14",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Extensão da Manoel Cirilo, Machareth e faixa da BR-116. Perímetro 200m (MS): Tonéis 200L, galinheiros, borracharias, oficinas e pilhas de pneus.",
            },
            {
                "ov": "OV-41, OV-40, OV-39 e OV-53 (Equipe 3)",
                "local": "Usina Light / Ilha dos Pombos (Orla Ribeirinha e Vila)",
                "morador": "Eq 3 (2 ACEs) em Bloqueio Ribeirinho • 08h00 às 13h00",
                "endereco": "Rua Beira Rio, 130, R. Carlos Cabral e R. Hernane Barbosa",
                "bairro": "Usina Light / Ilha",
                "quarteirao": "Q-01",
                "ovos": "OV-41: 203 [A:40+B:163] | OV-40: 66 [A:20+B:46] | OV-39: 30 | OV-53: 21",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: Orla da R. Beira Rio em Ilha dos Pombos. Perímetro 200m (MS): Canoas acumulando água de chuva, lonas plásticas, bambus e depósitos de pesca.",
            },
            {
                "ov": "CAMPO SEDE URBANA (Equipes 4 e 5)",
                "local": "Resgate de Fechados e Bloqueio Complementar a Pé na Sede",
                "morador": "Eq 4 (2 ACEs): Progresso/Centenário | Eq 5 (2 ACEs): Centro/Boa Ideia",
                "endereco": "Raios das OV-23, OV-21, OV-05 (Eq 4) e OV-08 [93], OV-15 [78], OV-10 (Eq 5)",
                "bairro": "Sede Urbana (A Pé)",
                "quarteirao": "Q-01 / Q-13 / Q-17",
                "ovos": "ATUAÇÃO 100% EM CAMPO NA SEDE: OV-08 (93) + OV-15 (78) + RESGATE FECHADOS",
                "cor_badge": "#0F2942",
                "instrucao": "Eq 4 resgata imóveis fechados de Segunda/Terça (OV-23, OV-21, OV-05). Eq 5 realiza bloqueio de quarteirão em Boa Ideia (OV-08, OV-15) e fechados da OV-10.",
            }
        ]
    },
    {
        "dia_cod": "quinta",
        "dia_nome": "QUINTA-FEIRA",
        "tema": "Operação Distrital (Porto Velho + Córrego da Prata) & Campo Sede Urbana",
        "bairros": "Porto Velho do Cunha (3º Dist.), Córrego da Prata (4º Dist.) e Sede Urbana",
        "equipe_sugerida": "Horário Corrido 08h00 às 13h00 (P.A.) | Eq 1-3 (Carro 5L + Caminhonete 2L) | Eq 4-5 (Sede a pé)",
        "alvos": [
            {
                "ov": "OV-45 e OV-44 (Equipes 1 e 2)",
                "local": "Porto Velho do Cunha (Major Fajardo 601 e Entorno ESF)",
                "morador": "Eq 1 (2 ACEs) na OV-45 | Eq 2 (2 ACEs) na OV-44 e Orla • 08h00 às 13h00",
                "endereco": "Rua Major Fajardo, 601 (Q-01) e Rua Major Fajardo, 312 - ESF (Q-10)",
                "bairro": "Porto Velho do Cunha",
                "quarteirao": "Q-01 / Q-10",
                "ovos": "OV-45: 241 OVOS [A:35+B:206] | OV-44: 102 OVOS [A:2+B:100]",
                "cor_badge": "#B91C1C",
                "instrucao": "Núcleo 100m: R. Major Fajardo (nº 550 a 650) e entorno da ESF Porto Velho. Perímetro 200m (MS): Galpões, caçambas, faixa ribeirinha, calhas e caixas baixas.",
            },
            {
                "ov": "OV-48 e OV-49 (Equipe 3)",
                "local": "Córrego da Prata (Entorno da ESF Prata e R. Alfredo Ferreira)",
                "morador": "Eq 3 (2 ACEs) em Bloqueio no 4º Distrito • 08h00 às 13h00",
                "endereco": "Rua Benfica, 48 - ESF (Q-01) e Rua Alfredo Ferreira (Q-05)",
                "bairro": "Córrego da Prata",
                "quarteirao": "Q-01 / Q-05",
                "ovos": "OV-48: 121 OVOS [A:7+B:114] | OV-49: 62 OVOS [A:2+B:60]",
                "cor_badge": "#D97706",
                "instrucao": "Núcleo 100m: Entorno da ESF Prata (R. Benfica) e R. Alfredo Ferreira. Perímetro 200m (MS): Calhas de telhado, tambores de captação de chuva e caixas no solo.",
            },
            {
                "ov": "CAMPO SEDE URBANA (Equipes 4 e 5)",
                "local": "Varredura Complementar e Resgate de Fechados em Encostas da Sede",
                "morador": "Eq 4 (2 ACEs): Val Paraíso/Morro | Eq 5 (2 ACEs): Caixa d'Água/Botafogo",
                "endereco": "Raios de OV-31, OV-28, OV-34 (Eq 4) e OV-35, OV-16, OV-13, OV-12 (Eq 5)",
                "bairro": "Sede Urbana (A Pé)",
                "quarteirao": "Q-05 / Q-13 / Q-06",
                "ovos": "ATUAÇÃO 100% EM CAMPO NA SEDE: VARREDURA COMPLEMENTAR DE ENCOSTAS",
                "cor_badge": "#0F2942",
                "instrucao": "Eq 4 realiza varredura complementar e resgate de fechados no Val Paraíso e Morro do Estado. Eq 5 cobre pendentes na Caixa d'Água, Botafogo e Lad. João Alfredo.",
            }
        ]
    },
    {
        "dia_cod": "sexta",
        "dia_nome": "SEXTA-FEIRA",
        "tema": "Horário Corrido 08h00 às 13h00: Campo (08h–12h) + Reunião no P.A. (12h–13h)",
        "bairros": "Sede Urbana (Eq 1, 2 e 3 a pé) + Distritos (Eq 4 Caminhonete 2L | Eq 5 Carro 5L)",
        "equipe_sugerida": "08h00 às 12h00: 10 ACEs em Campo | 12h00 às 13h00: Reunião Geral no P.A. (Ponto de Apoio)",
        "alvos": [
            {
                "ov": "RESGATE FINAL SEDE URBANA (Equipes 1, 2 e 3 a Pé • 08h00 às 12h00)",
                "local": "Fechamento de 100% dos Imóveis Pendentes nos Bairros da Sede",
                "morador": "Eq 1: Progresso/Centenário | Eq 2: Centro/Caixa/Botafogo | Eq 3: Val Paraíso/Morro/Boa Ideia",
                "endereco": "Raios de OV-23, OV-21, OV-05 (Eq 1) | OV-10, OV-35, OV-16 (Eq 2) | OV-31, OV-28, OV-08 (Eq 3)",
                "bairro": "Carmo Sede Urbana",
                "quarteirao": "Todos os Setores",
                "ovos": "META: 100% DOS IMÓVEIS FECHADOS RECUPERADOS NOS NÚCLEOS DE 100M DA SEDE",
                "cor_badge": "#0F2942",
                "instrucao": "Repasse nos imóveis que estavam fechados de Segunda a Quinta na Sede Urbana (08h00 às 12h00), garantindo 100% de cobertura focal antes do retorno ao P.A.",
            },
            {
                "ov": "RESGATE DISTRITAL SUL/OESTE (Equipe 4 - Caminhonete 2L • 08h00 às 12h00)",
                "local": "Fechamento de Imóveis Pendentes em Influência e Barra de S. Francisco",
                "morador": "Eq 4 (2 ACEs) em Deslocamento Tático na Caminhonete (2L)",
                "endereco": "Influência (OV-36 [222], OV-38 [210], OV-51 [109]) e Barra (OV-55 [125], OV-54 [74])",
                "bairro": "Influência e Barra",
                "quarteirao": "Q-01 / Q-05 / Q-06",
                "ovos": "RESGATE FOCAL EM INFLUÊNCIA (541 OVOS ACUM.) E BARRA (268 OVOS ACUM.)",
                "cor_badge": "#B91C1C",
                "instrucao": "Inspeção final das 08h00 às 12h00 nos imóveis fechados anotados nas fichas de Segunda (Barra) e Quarta (Influência), com retorno ao P.A. às 12h00.",
            },
            {
                "ov": "RESGATE DISTRITAL LESTE/NORTE (Equipe 5 - Carro 5L) + REUNIÃO NO P.A. (12h00)",
                "local": "Fechamento em Porto Velho, Light e Prata + Reunião Geral no P.A.",
                "morador": "Eq 5 (2 ACEs) no Carro (5L) das 08h00 às 12h00 | 12h00 às 13h00: Reunião no P.A.",
                "endereco": "Porto Velho (OV-45 [241], OV-44 [102]), Light (OV-41 [203]) e Prata (OV-48 [121], OV-49 [62])",
                "bairro": "P. Velho / Light / Prata",
                "quarteirao": "Q-01 / Q-10 / Q-05",
                "ovos": "CAMPO ATÉ 12H00 + REUNIÃO GERAL DE AVALIAÇÃO NO P.A. (12H00 ÀS 13H00)",
                "cor_badge": "#D97706",
                "instrucao": "Vistoria de fechados em Porto Velho, Light e Prata das 08h00 às 12h00. Das 12h00 às 13h00: Reunião Geral de Avaliação Semanal no P.A. (Ponto de Apoio) com os 10 ACEs.",
            }
        ]
    }
]

EQUIPES_CONFIG = [
    {
        "eq_num": 1,
        "eq_nome": "EQUIPE 1 (2 ACEs)",
        "resumo_logistica": "Saída diária às 08h00 do P.A. (Ponto de Apoio) • Horário Corrido: 08h00 às 13h00 (100% em Campo)",
        "dias": [
            ("SEGUNDA (08h00–13h00)", "Barra de S. Francisco (Q-01) • Carro 5L", "OV-55 (125 ovos [Sem A:5 + Sem B:120]) — R. Antônio R. Serafim, S/N", "Núcleo 100m + Perímetro 200m na R. Antônio Serafim. Foco em bebedouros rurais, tonéis e quintais amplos."),
            ("TERÇA (08h00–13h00)", "Val Paraíso (Q-05) • Campo Sede a Pé", "OV-31 (192 ovos [A:51+B:141]) e OV-34 (66 ovos [A:0+B:66]) — R. Roberto Simões, 98", "Núcleo 100m (Roberto Simões e Emanuel de Moraes) + Perímetro 200m. Quintais em declive acentuado e tonéis."),
            ("QUARTA (08h00–13h00)", "Influência Urbano (Q-05/Q-11) • Viatura", "OV-36 (222 ovos [A:53+B:169]) e OV-51 (109 ovos [A:3+B:106]) — Manoel Cirilo e Machareth", "Núcleo 100m + Perímetro 200m em Manoel Cirilo 116 e Machareth 182. Tonéis 200L, galinheiros e caixas baixas."),
            ("QUINTA (08h00–13h00)", "Porto Velho do Cunha (Q-01) • Viatura", "OV-45 (241 ovos [Sem A:35 + Sem B:206]) — R. Major Fajardo, 601", "Núcleo 100m (Major Fajardo nº 550 a 650) + Perímetro 200m ribeirinho. Galpões, caçambas e plásticos."),
            ("SEXTA (08h–12h + P.A. 12h)", "Campo Sede (Progresso/Centenário) • A Pé", "Resgate Final: OV-23 (342), OV-21 (100), OV-05 (173), OV-03 (53) e OV-04 (53)", "08h00 às 12h00: Resgate de 100% dos imóveis fechados no Progresso e Centenário. 12h00 às 13h00: Reunião no P.A.")
        ]
    },
    {
        "eq_num": 2,
        "eq_nome": "EQUIPE 2 (2 ACEs)",
        "resumo_logistica": "Saída diária às 08h00 do P.A. (Ponto de Apoio) • Horário Corrido: 08h00 às 13h00 (100% em Campo)",
        "dias": [
            ("SEGUNDA (08h00–13h00)", "Barra de S. Francisco (Q-01) • Carro 5L", "OV-54 (74 ovos [A:13+B:61]) e OV-56 (69 ovos [A:3+B:66]) — R. Sebastião F. da Costa", "Núcleo 100m (entorno da Escola da Barra e Sebastião Costa) + Perímetro 200m. Calhas prediais e caixas no solo."),
            ("TERÇA (08h00–13h00)", "Jd. Centenário (Q-17) • Campo Sede a Pé", "OV-05 (173 ovos [A:6+B:167]), OV-03 (53 ovos) e OV-04 (53 ovos) — R. Ernesto Wermelinger, 63", "Núcleo 100m (Wermelinger e Celso C. Faria) + Perímetro 200m. Tambores de lavanderia, bromélias e pratinhos."),
            ("QUARTA (08h00–13h00)", "Influência Rodovia (Q-06) • Viatura", "OV-38 (210 ovos [Sem A:25 + Sem B:185]) e OV-50 (14 ovos) — Rodovia BR-116, KM 12", "Núcleo 100m (faixa marginal da BR-116) + Perímetro 200m. Borracharias, oficinas mecânicas, pneus e sucatas."),
            ("QUINTA (08h00–13h00)", "Porto Velho do Cunha (Q-10) • Viatura", "OV-44 (102 ovos [Sem A:2 + Sem B:100]) — R. Major Fajardo, 312 (ESF Porto Velho)", "Núcleo 100m (entorno da ESF Porto Velho e faixa ribeirinha) + Perímetro 200m. Calhas, barcos e caixas baixas."),
            ("SEXTA (08h–12h + P.A. 12h)", "Campo Sede (Centro/Caixa/Botafogo) • A Pé", "Resgate Final: OV-10 (242), OV-35 (121), OV-16 (89), OV-13 (71) e OV-12 (84)", "08h00 às 12h00: Resgate de imóveis fechados no Centro, Caixa d'Água e Botafogo. 12h00 às 13h00: Reunião no P.A.")
        ]
    },
    {
        "eq_num": 3,
        "eq_nome": "EQUIPE 3 (2 ACEs)",
        "resumo_logistica": "Saída diária às 08h00 do P.A. (Ponto de Apoio) • Horário Corrido: 08h00 às 13h00 (100% em Campo)",
        "dias": [
            ("SEGUNDA (08h00–13h00)", "Progresso (Q-01) • Sede + Caminhonete 2L", "OV-23 (342 ovos [Sem A:147 + Sem B:195]) — Pousada Valle do Sol (R. Manoel J. Moraes, 51)", "Núcleo 100m (Pousada Valle do Sol e R. José Cassane) + Perímetro 200m. Piscinas desativadas, ralos e tonéis."),
            ("TERÇA (08h00–13h00)", "Caixa d'Água (Q-13) • Sede + Caminhonete 2L", "OV-35 (121 ovos [A:4+B:117]) e OV-13 (71 ovos [A:48+B:23]) — R. Senador Dantas, 269", "Núcleo 100m (trecho superior da Senador Dantas) + Perímetro 200m. Terrenos baldios, calhas altas e caixas."),
            ("QUARTA (08h00–13h00)", "Usina Light / Ilha dos Pombos • Viatura", "OV-41 (203 ovos [A:40+B:163]), OV-40 (66 [A:20+B:46]), OV-39 (30), OV-53 (21) — R. Beira Rio", "Núcleo 100m (orla da R. Beira Rio 130) + Perímetro 200m. Canoas acumulando água de chuva, lonas e pesca."),
            ("QUINTA (08h00–13h00)", "Córrego da Prata (Q-01 e Q-05) • Viatura", "OV-48 (121 ovos [A:7+B:114]) e OV-49 (62 ovos [A:2+B:60]) — ESF Prata (R. Benfica, 48)", "Núcleo 100m (ESF Córrego da Prata e R. Alfredo Ferreira) + Perímetro 200m. Calhas e tambores de chuva."),
            ("SEXTA (08h–12h + P.A. 12h)", "Campo Sede (Val Paraíso/Morro/Boa Ideia)", "Resgate Final: OV-31 (192), OV-28 (95), OV-34 (66), OV-08 (93) e OV-15 (78)", "08h00 às 12h00: Resgate de imóveis fechados em encostas da Sede Urbana. 12h00 às 13h00: Reunião Geral no P.A.")
        ]
    },
    {
        "eq_num": 4,
        "eq_nome": "EQUIPE 4 (2 ACEs)",
        "resumo_logistica": "Saída diária às 08h00 do P.A. (Ponto de Apoio) • Horário Corrido: 08h00 às 13h00 (100% em Campo)",
        "dias": [
            ("SEGUNDA (08h00–13h00)", "Centro (Q-13 e Q-06) • Campo Sede a Pé", "OV-10 (242 ovos [A:41+B:201]) e OV-12 (84 ovos [A:64+B:20]) — R. Oscar Curty, 42 e Lad. J. Alfredo", "Núcleo 100m (Oscar Curty, Celso C. Faria e Lad. João Alfredo) + Perímetro 200m. Marquises, lajes e comércios."),
            ("TERÇA (08h00–13h00)", "Morro do Estado e Boa Ideia • Sede a Pé", "OV-28 (95 ovos [A:86+B:9]), OV-08 (93 [A:64+B:29]) e OV-15 (78 [A:78+B:0]) — R. Adalberto Pires, 45", "Núcleo 100m (Adalberto Pires e Boa Ideia) + Perímetro 200m. Quintais de encosta, barrancos e tonéis."),
            ("QUARTA (08h00–13h00)", "Campo Sede (Progresso e Jd. Centenário)", "Resgate de Imóveis Fechados de Segunda e Terça — Raios de OV-23 (342), OV-21 (100) e OV-05 (173)", "Atuação 100% em campo a pé na Sede: recuperação de imóveis fechados nos núcleos focais do Progresso e Centenário."),
            ("QUINTA (08h00–13h00)", "Campo Sede (Val Paraíso e Morro do Estado)", "Varredura Complementar e Fechados — Raios de OV-31 (192), OV-28 (95) e OV-34 (66)", "Atuação 100% em campo a pé na Sede: bloqueio complementar e resgate de fechados nas encostas do Val Paraíso/Morro."),
            ("SEXTA (08h–12h + P.A. 12h)", "Distritos Sul/Oeste • Caminhonete 2L", "Resgate Distrital: Influência (OV-36, OV-38, OV-51) e Barra de S. Francisco (OV-55, OV-54)", "08h00 às 12h00: Fechamento de imóveis pendentes em Influência e Barra (Caminhonete 2L). 12h00: Reunião no P.A.")
        ]
    },
    {
        "eq_num": 5,
        "eq_nome": "EQUIPE 5 (2 ACEs)",
        "resumo_logistica": "Saída diária às 08h00 do P.A. (Ponto de Apoio) • Horário Corrido: 08h00 às 13h00 (100% em Campo)",
        "dias": [
            ("SEGUNDA (08h00–13h00)", "Progresso (Q-09) • Sede + Caminhonete 2L", "OV-21 (100 ovos [Sem A:100 + Sem B:0]) — R. Silvio Geraldo França, 753", "Núcleo 100m (Silvio G. França nº 700 a 800) + Perímetro 200m (encosta). Entulho de obras, fundos de vale e tonéis."),
            ("TERÇA (08h00–13h00)", "Botafogo e Centro • Campo Sede a Pé", "OV-16 (89 ovos [A:0+B:89]), OV-12 (84 ovos [A:64+B:20]) e OV-11 (24 ovos) — R. Soares Brandão e Asilo", "Núcleo 100m (Soares Brandão, Lad. João Alfredo e Asilo São Vicente) + Perímetro 200m. Imóveis especiais e encosta."),
            ("QUARTA (08h00–13h00)", "Campo Sede (Centro e Boa Ideia) • A Pé", "Bloqueio Complementar OV-08 (93) e OV-15 (78) + Resgate de Fechados da OV-10 (242)", "Atuação 100% em campo a pé na Sede: bloqueio de quarteirão em Boa Ideia e recuperação de fechados no Centro."),
            ("QUINTA (08h00–13h00)", "Campo Sede (Caixa d'Água e Botafogo)", "Varredura Complementar e Fechados — Raios de OV-35 (121), OV-16 (89), OV-13 (71) e OV-12 (84)", "Atuação 100% em campo a pé na Sede: varredura complementar e resgate de fechados na Caixa d'Água e Botafogo."),
            ("SEXTA (08h–12h + P.A. 12h)", "Distritos Leste/Norte • Carro 5 Lugares", "Resgate Distrital: Porto Velho (OV-45, OV-44), Usina Light (OV-41) e Prata (OV-48, OV-49)", "08h00 às 12h00: Fechamento de pendentes em P. Velho, Light e Prata (Carro 5L). 12h00 às 13h00: Reunião no P.A.")
        ]
    }
]

def gerar_fichas_impressas():
    pdf_filename = "FICHA_DE_CAMPO_IMPRESSA_AGENTE_OVITRAMPAS.pdf"
    
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
    st_dia_desc = ParagraphStyle('DiaDesc', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.6, leading=9.6, textColor=colors.HexColor('#0F2942'))
    
    st_th = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.8, leading=8, alignment=TA_CENTER, textColor=colors.white)
    st_td = ParagraphStyle('TD', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8, textColor=colors.HexColor('#0F172A'))
    st_td_bold = ParagraphStyle('TDBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=8, textColor=colors.HexColor('#0F172A'))
    st_td_center = ParagraphStyle('TDCenter', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))
    st_td_center_bold = ParagraphStyle('TDCenterBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))

    st_card_header = ParagraphStyle('CH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.2, leading=10.2, textColor=colors.HexColor('#0F2942'))
    st_card_sub = ParagraphStyle('CS', parent=styles['Normal'], fontName='Helvetica', fontSize=6.8, leading=8.4, textColor=colors.HexColor('#334155'))
    st_card_instrucao = ParagraphStyle('CI', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.6, leading=8.0, textColor=colors.HexColor('#991B1B'))

    story = []

    crest_path = 'tmp/pdfs/brasao_carmo_extraido.png'
    if not os.path.exists(crest_path):
        crest_path = 'public/timbres/brasao_carmo.png'
    img_brasao = Image(crest_path, width=32, height=32) if os.path.exists(crest_path) else None

    qr_flowable = make_qr_code("https://gps-ovitrampas-demo.pages.dev/acao", size=36)

    for idx_dia, dia_info in enumerate(DIAS_CONFIG):
        if idx_dia > 0:
            story.append(PageBreak())

        cab_texto = [
            Paragraph("<b>PREFEITURA MUNICIPAL DE CARMO • SECRETARIA MUNICIPAL DE SAÚDE</b>", st_title_main),
            Paragraph("COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES", st_sub_main),
            Paragraph("<b>FICHA DE CAMPO PARA PRANCHETA (POR DIA) • HORÁRIO CORRIDO 08h00 ÀS 13h00 (P.A.)</b>", ParagraphStyle('FichaH', parent=st_sub_main, fontSize=8, leading=9.5, textColor=colors.HexColor('#0F2942'))),
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

        faixa_dia = Table([
            [
                Paragraph(f"<b>{dia_info['dia_nome']}</b>", st_dia_badge),
                Paragraph(f"<b>Território:</b> {dia_info['bairros']}<br/><b>Escala de Campo (10 ACEs):</b> {dia_info['equipe_sugerida']}", st_dia_desc)
            ]
        ], colWidths=[90, printable_w - 90])
        faixa_dia.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#0F2942')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#F1F5F9')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#0F2942')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(faixa_dia)
        story.append(Spacer(1, 2))

        campos_agente = [
            [
                Paragraph("<b>Equipe Nº (1 a 5) / ACE 1:</b> ____________________________", st_td_bold),
                Paragraph("<b>Agente Parceiro (ACE 2):</b> ____________________________", st_td_bold),
                Paragraph("<b>Data:</b> ___/___/2026", st_td_bold)
            ]
        ]
        t_campos = Table(campos_agente, colWidths=[printable_w * 0.42, printable_w * 0.40, printable_w * 0.18])
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
        story.append(Spacer(1, 2.5))

        box_diretriz = Table([
            [
                Paragraph("<b>DIRETRIZ NORMATIVA DE BLOQUEIO (MS / SES-RJ):</b> "
                          "<b>Raio 100m (Núcleo Focal Prioritário):</b> Varredura em 100% dos imóveis e quintais confrontantes com eliminação mecânica imediata. "
                          "<b>Raio 200m (Perímetro Oficial MS):</b> Bloqueio perifocal de contenção nos quarteirões vizinhos (carga acumulada Sem A + Sem B).", ParagraphStyle('Dir', parent=st_td, fontSize=6.4, leading=7.8, textColor=colors.HexColor('#991B1B')))
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
        story.append(Spacer(1, 2.5))

        inner_w = printable_w - 8
        for alvo in dia_info['alvos']:
            cabecalho_alvo = [
                Paragraph(f"<b>{alvo['ov']} • {alvo['local']}</b> ({alvo['morador']})", st_card_header),
                Paragraph(f"<b>Endereço:</b> {alvo['endereco']} • <b>Setor:</b> {alvo['bairro']} ({alvo['quarteirao']}) • <b>Soma 2 Sem.:</b> <font color='{alvo['cor_badge']}'><b>{alvo['ovos']}</b></font>", st_card_sub),
                Paragraph(f"<b>Delimitação Operacional:</b> {alvo['instrucao']}", st_card_instrucao)
            ]

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
            t_grid_criadouros = Table(tabela_criadouros, colWidths=[24, 214, 28, 34, inner_w - 300])
            t_grid_criadouros.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')),
                ('BOX', (0, 0), (-1, -1), 0.4, colors.HexColor('#94A3B8')),
                ('INNERGRID', (0, 0), (-1, -1), 0.3, colors.HexColor('#E2E8F0')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 1.3),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1.3),
                ('LEFTPADDING', (0, 0), (-1, -1), 3),
                ('RIGHTPADDING', (0, 0), (-1, -1), 3),
            ]))

            rodape_card = Table([
                [
                    Paragraph("<b>Imóveis Vistoriados no Raio (Nºs vizinhos):</b> _____________________________________________", st_td_bold),
                    Paragraph("<b>Focos (+):</b> _____ | <b>Status:</b> [ ] Trab.  [ ] Fechado  [ ] Recusado", ParagraphStyle('Sit', parent=st_td_bold, alignment=TA_RIGHT))
                ]
            ], colWidths=[inner_w * 0.58, inner_w * 0.42])
            rodape_card.setStyle(TableStyle([
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ('LEFTPADDING', (0, 0), (-1, -1), 2),
                ('RIGHTPADDING', (0, 0), (-1, -1), 2),
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
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(bloco_card)
            story.append(Spacer(1, 3))

        assinaturas = Table([
            [
                Paragraph("<b>Assinatura da Dupla de Campo (ACEs):</b> ___________________________________", st_td),
                Paragraph("<b>Visto da Supervisão (P.A. - Ponto de Apoio):</b> _____________________________", ParagraphStyle('S2', parent=st_td, alignment=TA_RIGHT))
            ]
        ], colWidths=[printable_w * 0.50, printable_w * 0.50])
        assinaturas.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.4, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 4),
            ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(assinaturas)

    doc.build(story)
    reader = pypdf.PdfReader(pdf_filename)
    print(f"[OK] Ficha de Campo por Dia gerada em: {pdf_filename} ({len(reader.pages)} páginas)")

    desktop_dir = r"C:\Users\Almir LK\Desktop\PLANO PARA SEGUNDA"
    os.makedirs(desktop_dir, exist_ok=True)
    os.makedirs("public", exist_ok=True)
    
    shutil.copy(pdf_filename, os.path.join(desktop_dir, pdf_filename))
    shutil.copy(pdf_filename, os.path.join("public", pdf_filename))
    print(f"[OK] Copia salva em: {desktop_dir}\\{pdf_filename} e public\\{pdf_filename}")


def gerar_fichas_por_equipe():
    pdf_filename = "FICHAS_DE_CAMPO_POR_EQUIPE_1_A_5.pdf"

    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=A4,
        leftMargin=24,
        rightMargin=24,
        topMargin=18,
        bottomMargin=16
    )

    printable_w = doc.width
    styles = getSampleStyleSheet()

    st_title_main = ParagraphStyle('EqTitleMain', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, leading=12, alignment=TA_CENTER, textColor=colors.HexColor('#0F2942'))
    st_sub_main = ParagraphStyle('EqSubMain', parent=styles['Normal'], fontName='Helvetica', fontSize=7.3, leading=9, alignment=TA_CENTER, textColor=colors.HexColor('#475569'))
    st_eq_badge = ParagraphStyle('EqBadge', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, leading=11.5, alignment=TA_CENTER, textColor=colors.white)
    st_eq_desc = ParagraphStyle('EqDesc', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.4, leading=9.5, textColor=colors.HexColor('#0F2942'))

    st_th = ParagraphStyle('EqTH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=7.8, alignment=TA_CENTER, textColor=colors.white)
    st_td = ParagraphStyle('EqTD', parent=styles['Normal'], fontName='Helvetica', fontSize=6.2, leading=7.6, textColor=colors.HexColor('#0F172A'))
    st_td_bold = ParagraphStyle('EqTDBold', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.3, leading=7.7, textColor=colors.HexColor('#0F172A'))
    st_td_center = ParagraphStyle('EqTDCenter', parent=styles['Normal'], fontName='Helvetica', fontSize=6.1, leading=7.5, alignment=TA_CENTER, textColor=colors.HexColor('#0F172A'))

    st_card_hdr = ParagraphStyle('EqCH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.4, leading=9.2, textColor=colors.HexColor('#0F2942'))
    st_card_inst = ParagraphStyle('EqCI', parent=styles['Normal'], fontName='Helvetica', fontSize=6.4, leading=7.8, textColor=colors.HexColor('#7F1D1D'))

    story = []

    crest_path = 'tmp/pdfs/brasao_carmo_extraido.png'
    if not os.path.exists(crest_path):
        crest_path = 'public/timbres/brasao_carmo.png'
    img_brasao = Image(crest_path, width=30, height=30) if os.path.exists(crest_path) else None

    qr_flowable = make_qr_code("https://gps-ovitrampas-demo.pages.dev/acao", size=34)

    for idx_eq, eq_info in enumerate(EQUIPES_CONFIG):
        if idx_eq > 0:
            story.append(PageBreak())

        # 1. CABEÇALHO OFICIAL
        cab_texto = [
            Paragraph("<b>PREFEITURA MUNICIPAL DE CARMO • SECRETARIA MUNICIPAL DE SAÚDE</b>", st_title_main),
            Paragraph("COORDENAÇÃO DE VIGILÂNCIA AMBIENTAL E CONTROLE DE ZOONOSES", st_sub_main),
            Paragraph(f"<b>FICHA SEMANAL EXCLUSIVA DE PRANCHETA • {eq_info['eq_nome']} • SEGUNDA A SEXTA</b>", ParagraphStyle('EqH3', parent=st_sub_main, fontSize=8.0, leading=9.5, textColor=colors.HexColor('#B91C1C'))),
        ]
        t_cab = Table([[img_brasao or '', cab_texto, qr_flowable]], colWidths=[34, printable_w - 72, 38])
        t_cab.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('ALIGN', (0, 0), (0, 0), 'LEFT'),
            ('ALIGN', (1, 0), (1, 0), 'CENTER'),
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('TOPPADDING', (0, 0), (-1, -1), 0),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 0),
            ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ]))
        story.append(t_cab)
        story.append(Spacer(1, 2))

        # 2. FAIXA DA EQUIPE E IDENTIFICAÇÃO DOS 2 ACEs
        faixa_eq = Table([
            [
                Paragraph(f"<b>{eq_info['eq_nome']}</b>", st_eq_badge),
                Paragraph(f"<b>Logística:</b> {eq_info['resumo_logistica']}<br/>"
                          f"<b>ACE 1:</b> _____________________________  <b>ACE 2:</b> _____________________________  <b>Semana:</b> ___/___ a ___/___/2026", st_eq_desc)
            ]
        ], colWidths=[105, printable_w - 105])
        faixa_eq.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#1E3A8A')),
            ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#F1F5F9')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#1E3A8A')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 2.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(faixa_eq)
        story.append(Spacer(1, 3))

        # 3. OS 5 BLOCOS DIÁRIOS (SEGUNDA A SEXTA) DAQUELA EQUIPE COM CHECKLIST PNCD E ANOTAÇÃO DE CASAS
        for dia_lbl, setor_log, alvos_str, inst_str in eq_info["dias"]:
            hdr_bloco = [
                Paragraph(f"<b>■ {dia_lbl} • Setor:</b> {setor_log} | <b>Alvos (Soma A+B):</b> <font color='#B91C1C'><b>{alvos_str}</b></font>", st_card_hdr),
                Paragraph(f"<b>Diretriz de Campo (Raios 100m e 200m):</b> {inst_str}", st_card_inst)
            ]

            pncd_grid = [
                [
                    Paragraph("<b>Depósitos PNCD (Anotar Qtd / [X])</b>", st_th),
                    Paragraph("<b>A1 (Cx. Elevada)</b>", st_th),
                    Paragraph("<b>A2 (Solo/Tonel)</b>", st_th),
                    Paragraph("<b>B (Móveis/Vasos)</b>", st_th),
                    Paragraph("<b>C (Fixos/Calhas)</b>", st_th),
                    Paragraph("<b>D1 (Pneus)</b>", st_th),
                    Paragraph("<b>D2 (Lixo/Sucata)</b>", st_th),
                    Paragraph("<b>E (Naturais)</b>", st_th)
                ],
                [
                    Paragraph("<b>Inspecionados / Foco (+):</b>", st_td_bold),
                    Paragraph("Insp:[   ] Foco:[   ]", st_td_center),
                    Paragraph("Insp:[   ] Foco:[   ]", st_td_center),
                    Paragraph("Insp:[   ] Foco:[   ]", st_td_center),
                    Paragraph("Insp:[   ] Foco:[   ]", st_td_center),
                    Paragraph("Insp:[   ] Foco:[   ]", st_td_center),
                    Paragraph("Insp:[   ] Foco:[   ]", st_td_center),
                    Paragraph("Insp:[   ] Foco:[   ]", st_td_center)
                ],
                [
                    Paragraph("<b>Ação Executada (Marcar [X]):</b>", st_td_bold),
                    Paragraph("[ ]Ved. [ ]Bti", st_td_center),
                    Paragraph("[ ]Ved. [ ]Bti", st_td_center),
                    Paragraph("[ ]Elim. [ ]Vir.", st_td_center),
                    Paragraph("[ ]Desob. [ ]Bti", st_td_center),
                    Paragraph("[ ]Cob. [ ]Rec.", st_td_center),
                    Paragraph("[ ]Ensac./Elim.", st_td_center),
                    Paragraph("[ ]Dren. [ ]Bti", st_td_center)
                ]
            ]
            w_first = 114
            w_cat = (printable_w - 8 - w_first) / 7.0
            t_pncd = Table(pncd_grid, colWidths=[w_first] + [w_cat]*7)
            t_pncd.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')),
                ('BACKGROUND', (0, 1), (-1, 1), colors.white),
                ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F8FAFC')),
                ('GRID', (0, 0), (-1, -1), 0.35, colors.HexColor('#CBD5E1')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 1.8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 1.8),
                ('LEFTPADDING', (0, 0), (-1, -1), 2),
                ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ]))

            anot_dia = Table([
                [
                    Paragraph("<b>Nºs das Casas Trabalhadas no Raio:</b> ___________________________________", st_td_bold),
                    Paragraph("<b>Nºs Fechados/Recusados:</b> _______________ | <b>Bti (g):</b> ____", ParagraphStyle('AnR', parent=st_td_bold, alignment=TA_RIGHT))
                ]
            ], colWidths=[(printable_w - 8) * 0.55, (printable_w - 8) * 0.45])
            anot_dia.setStyle(TableStyle([
                ('TOPPADDING', (0, 0), (-1, -1), 2),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
                ('LEFTPADDING', (0, 0), (-1, -1), 2),
                ('RIGHTPADDING', (0, 0), (-1, -1), 2),
            ]))

            card_dia = Table([
                [hdr_bloco],
                [t_pncd],
                [anot_dia]
            ], colWidths=[printable_w])
            card_dia.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
                ('BACKGROUND', (0, 1), (-1, 1), colors.white),
                ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F1F5F9')),
                ('BOX', (0, 0), (-1, -1), 0.6, colors.HexColor('#64748B')),
                ('LINEBELOW', (0, 0), (-1, 0), 0.4, colors.HexColor('#CBD5E1')),
                ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
                ('LEFTPADDING', (0, 0), (-1, -1), 4),
                ('RIGHTPADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(card_dia)
            story.append(Spacer(1, 3.5))

        # 4. CONSOLIDAÇÃO SEMANAL DA EQUIPE E ASSINATURA NO P.A.
        resumo_sem = Table([
            [
                Paragraph("<b>FECHAMENTO SEMANAL DA DUPLA NO P.A. (SEXTA-FEIRA ÀS 12h00):</b>   "
                          "Imóveis Trabalhados: ______  |  Fechados Recuperados: ______  |  Focos (+) Eliminados: ______", st_td_bold)
            ],
            [
                Paragraph("<b>Assinatura ACE 1:</b> ___________________________   "
                          "<b>Assinatura ACE 2:</b> ___________________________   "
                          "<b>Visto Supervisão (P.A.):</b> ___________________________", st_td)
            ]
        ], colWidths=[printable_w])
        resumo_sem.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FEF2F2')),
            ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#94A3B8')),
            ('LINEBELOW', (0, 0), (-1, 0), 0.4, colors.HexColor('#FCA5A5')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(resumo_sem)

    doc.build(story)
    reader = pypdf.PdfReader(pdf_filename)
    print(f"[OK] Fichas Individuais por Equipe (1 a 5) geradas em: {pdf_filename} ({len(reader.pages)} páginas)")

    desktop_dir = r"C:\Users\Almir LK\Desktop\PLANO PARA SEGUNDA"
    os.makedirs(desktop_dir, exist_ok=True)
    os.makedirs("public", exist_ok=True)

    shutil.copy(pdf_filename, os.path.join(desktop_dir, pdf_filename))
    shutil.copy(pdf_filename, os.path.join("public", pdf_filename))
    print(f"[OK] Copia salva em: {desktop_dir}\\{pdf_filename} e public\\{pdf_filename}")

if __name__ == "__main__":
    gerar_fichas_impressas()
    gerar_fichas_por_equipe()
