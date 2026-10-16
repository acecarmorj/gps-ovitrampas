#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera a versão revisada do plano operacional de ovitrampas de Carmo/RJ."""

from __future__ import annotations

import io
import json
import math
import os
import time
import urllib.request
from collections import defaultdict
from pathlib import Path

from PIL import Image as PILImage
from PIL import ImageDraw, ImageFilter, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "auditoria_conta_ovos_2026" / "DRY_RUN_CONTA_OVOS_2026.json"
TERRITORY_PATH = ROOT / "public" / "data" / "carmo-territorios-data.js"
OUT_PATH = ROOT / "output" / "pdf" / "PLANO_DE_ACAO_OPERACIONAL_OVITRAMPAS_CARMO_RJ_REVISADO.pdf"
TMP_DIR = ROOT / "tmp" / "pdfs" / "plano_revisado"
CREST_PATH = ROOT / "tmp" / "pdfs" / "brasao_carmo_extraido.png"
TILE_DIR = TMP_DIR / "osm_tiles"

NAVY = colors.HexColor("#102F4A")
BLUE = colors.HexColor("#0B6FA4")
TEAL = colors.HexColor("#0F766E")
GREEN = colors.HexColor("#15803D")
AMBER = colors.HexColor("#D97706")
RED = colors.HexColor("#B91C1C")
INK = colors.HexColor("#17324D")
MUTED = colors.HexColor("#5F6F82")
GRID = colors.HexColor("#C9D4DF")
PALE = colors.HexColor("#F3F7FA")


BAIRRO_FIX = {
    "Influ�ncia": "Influência",
    "Jardim Centen�rio": "Jardim Centenário",
    "Val Para�so": "Val Paraíso",
    "Caixa d'�gua": "Caixa d'Água",
    "C�rrego da Prata": "Córrego da Prata",
    "Barra de S�o Francisco": "Barra de São Francisco",
}

MICROAREA_COLORS = {
    "Val Paraíso": (126, 34, 206),
    "Progresso": (220, 38, 38),
    "Morro do Estado": (180, 83, 9),
    "Jardim Centenário": (5, 150, 105),
    "Centro": (2, 132, 199),
    "Caixa d'Água": (79, 70, 229),
    "Boa Ideia": (219, 39, 119),
    "Botafogo": (8, 145, 178),
    "Influência": (22, 101, 52),
    "Porto Velho do Cunha": (194, 65, 12),
    "Ilha dos Pombos": (3, 105, 161),
    "Barra de São Francisco": (161, 98, 7),
    "Córrego da Prata": (71, 85, 105),
}


SCHEDULE = [
    ("SEG", "Alpha", "23", "Progresso", "R. Manoel José de Moraes, 51", "100 m", "Q-01 e adjacências; ralos, reservatórios e bebedouros."),
    ("SEG", "Alpha", "10", "Centro", "R. Oscar de Souza Curty, 42", "100 m", "Calhas, marquises, lajes e reservatórios elevados."),
    ("SEG", "Alpha", "21", "Progresso", "R. Silvio Geraldo França, 753", "50 m", "Verificar queda recente; fundos de vale, obras e tambores."),
    ("TER", "Beta", "05", "Jardim Centenário", "R. Ernesto Wermelinger, 63", "100 m", "Tambores, bromélias, pratos de vasos e lavanderias."),
    ("TER", "Gama", "31", "Val Paraíso", "R. Roberto Simões de Araújo, 98", "80 m", "Caixas d'água, tonéis e quintais de difícil acesso."),
    ("TER", "Gama", "35", "Caixa d'Água", "R. Senador Dantas, 269", "80 m", "Terrenos baldios, inservíveis e calhas obstruídas."),
    ("QUA", "Mutirão", "36", "Influência", "R. Manoel Cirilo da Silva, 116", "100 m", "Pneus, tonéis agrícolas e depósitos a céu aberto."),
    ("QUA", "Mutirão", "38", "Influência", "BR-116, S/N", "100 m", "Borracharias, oficinas, carcaças e galpões."),
    ("QUA", "Mutirão", "51", "Influência", "R. Maria da Silva Machareth, 182", "80 m", "Captação de chuva, caixas baixas e recipientes sombreados."),
    ("QUI", "Delta", "45", "Porto Velho do Cunha", "R. Major Fajardo, 601", "100 m", "Caçambas, carretas, plásticos e quintais beira-rio."),
    ("QUI", "Delta", "44", "Porto Velho do Cunha", "R. Major Fajardo, 312", "80 m", "Entorno da ESF; calhas, caixas e retornáveis."),
    ("QUI", "Delta", "41", "Ilha dos Pombos", "R. Beira Rio, 130", "100 m", "Embarcações, lonas, recipientes de pesca e quintais."),
    ("SEX", "Delta", "55", "Barra de São Francisco", "R. Antônio R. Serafim, S/N", "80 m", "Bebedouros, tambores e recipientes em áreas amplas."),
    ("SEX", "Delta", "48", "Córrego da Prata", "R. Benfica, 48 (ESF)", "80 m", "Calhas, descartáveis e caixas d'água ao nível do solo."),
]


def load_data():
    rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    by_ov = defaultdict(dict)
    for row in rows:
        ov = str(row["numero"]).zfill(2)
        bairro = BAIRRO_FIX.get(row["bairro"], row["bairro"])
        by_ov[ov][row["ciclo"]] = {
            **row,
            "numero": ov,
            "bairro": bairro,
            "ovos": int(row["ovos"]),
            "latitude": float(row["latitude"]),
            "longitude": float(row["longitude"]),
        }
    assert len(by_ov) == 56, f"Esperadas 56 OVs, encontradas {len(by_ov)}"
    assert all(set(v) == {"A", "B"} for v in by_ov.values())
    assert sum(v["A"]["ovos"] for v in by_ov.values()) == 1017
    assert sum(v["B"]["ovos"] for v in by_ov.values()) == 2665
    return dict(sorted(by_ov.items()))


def load_territories():
    text = TERRITORY_PATH.read_text(encoding="utf-8")
    payload = json.loads(text[text.index("{"):].rstrip(";\n\r "))
    polygons = []
    for item in payload.get("polygons", []):
        folder = BAIRRO_FIX.get(item.get("folder", ""), item.get("folder", ""))
        name = BAIRRO_FIX.get(item.get("name", ""), item.get("name", ""))
        coords = [(float(lat), float(lon)) for lat, lon in item.get("coordinates", [])]
        if len(coords) >= 3:
            polygons.append({**item, "folder": folder, "name": name, "coordinates": coords})
    assert len(polygons) >= 133, f"Base territorial incompleta: {len(polygons)} polígonos"
    return polygons


def priority(a, b):
    if b >= 150:
        return "P1", "100 m"
    if b >= 100:
        return "P2", "80 m"
    if b >= 50 or (a >= 100 and b < 50):
        return "P3", "50 m"
    return "P4", "30 m"


def world_xy(lon, lat, zoom):
    scale = 256 * (2**zoom)
    x = (lon + 180.0) / 360.0 * scale
    lat = max(min(lat, 85.05112878), -85.05112878)
    y = (1.0 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2.0 * scale
    return x, y


def choose_zoom(points, width, height):
    lons = [p["longitude"] for p in points]
    lats = [p["latitude"] for p in points]
    lon_pad = max((max(lons) - min(lons)) * 0.18, 0.0025)
    lat_pad = max((max(lats) - min(lats)) * 0.18, 0.0025)
    bounds = (min(lons) - lon_pad, min(lats) - lat_pad, max(lons) + lon_pad, max(lats) + lat_pad)
    for zoom in range(17, 10, -1):
        x1, y2 = world_xy(bounds[0], bounds[1], zoom)
        x2, y1 = world_xy(bounds[2], bounds[3], zoom)
        if abs(x2 - x1) <= width * 0.92 and abs(y2 - y1) <= height * 0.88:
            return zoom, bounds
    return 11, bounds


def get_tile(z, x, y):
    path = TILE_DIR / str(z) / str(x) / f"{y}.png"
    if path.exists():
        return PILImage.open(path).convert("RGB")
    path.parent.mkdir(parents=True, exist_ok=True)
    url = f"https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    request = urllib.request.Request(url, headers={"User-Agent": "Carmo-RJ-Vigilancia-Ambiental/1.0"})
    with urllib.request.urlopen(request, timeout=20) as response:
        data = response.read()
    path.write_bytes(data)
    time.sleep(0.04)
    return PILImage.open(io.BytesIO(data)).convert("RGB")


def base_map(points, width, height, polygons):
    extent = list(points)
    for poly in polygons:
        extent.extend({"latitude": lat, "longitude": lon} for lat, lon in poly["coordinates"])
    z, bounds = choose_zoom(extent, width, height)
    bg = PILImage.new("RGB", (width, height), "#EDF3F6")
    d = ImageDraw.Draw(bg)
    # Base esquemática inteiramente local: grade geográfica e faixas de relevo
    # apenas decorativas. Nenhuma coordenada é enviada a serviço externo.
    for i in range(9):
        y = int((i + 1) * height / 10)
        d.line((0, y, width, y), fill="#D6E1E8", width=1)
    for i in range(11):
        x = int((i + 1) * width / 12)
        d.line((x, 0, x, height), fill="#D6E1E8", width=1)
    for band in range(5):
        pts = []
        for x in range(-20, width + 40, 40):
            y = int(height * (0.16 + band * 0.17) + 16 * math.sin((x / 95.0) + band * 0.8))
            pts.append((x, y))
        d.line(pts, fill="#C7D7CF", width=3)
    d.rectangle((0, 0, width - 1, height - 1), outline="#9FB2C1", width=2)
    return bg.convert("RGBA"), z, bounds


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size=size)


def egg_color(value):
    if value >= 150:
        return (190, 30, 45, 255)
    if value >= 100:
        return (235, 112, 20, 255)
    if value >= 50:
        return (245, 185, 25, 255)
    if value > 0:
        return (27, 145, 93, 255)
    return (38, 102, 184, 255)


def render_panel(points, cycle, title, width, height, polygons):
    header_h = 58
    bg, z, bounds = base_map(points, width, height - header_h, polygons)
    panel = PILImage.new("RGBA", (width, height), "white")
    panel.paste(bg, (0, header_h))
    draw = ImageDraw.Draw(panel)
    draw.rectangle((0, 0, width, header_h), fill="#102F4A")
    draw.text((18, 12), title, font=font(25, True), fill="white")

    bx1, by1 = world_xy(bounds[0], bounds[3], z)
    bx2, by2 = world_xy(bounds[2], bounds[1], z)
    map_h = height - header_h
    # Limites oficiais dos quarteirões/territórios, carregados da base local.
    poly_layer = PILImage.new("RGBA", (width, map_h), (0, 0, 0, 0))
    pd = ImageDraw.Draw(poly_layer)
    for poly in polygons:
        pixels = []
        for lat, lon in poly["coordinates"]:
            wx, wy = world_xy(lon, lat, z)
            px = int((wx - bx1) / max(bx2 - bx1, 1) * width)
            py = int((wy - by1) / max(by2 - by1, 1) * map_h)
            pixels.append((px, py))
        if len(pixels) < 3:
            continue
        is_district = poly["folder"] == "DISTRITOS"
        microarea = poly["name"] if is_district else poly["folder"]
        color = MICROAREA_COLORS.get(microarea, (12, 111, 164))
        pd.polygon(pixels, fill=(*color, 30 if not is_district else 40), outline=(*color, 235))
        if is_district:
            pd.line(pixels + [pixels[0]], fill=(*color, 245), width=5)
            xs, ys = [v[0] for v in pixels], [v[1] for v in pixels]
            cx, cy = int(sum(xs) / len(xs)), int(sum(ys) / len(ys))
            pd.text((cx, cy), poly["name"].upper(), font=font(15, True), fill=(*color, 255), anchor="mm", stroke_width=3, stroke_fill="white")
        else:
            pd.line(pixels + [pixels[0]], fill=(*color, 240), width=2)
            xs, ys = [v[0] for v in pixels], [v[1] for v in pixels]
            if poly.get("territoryType") == "area":
                label = f"Q-{poly['name']}" if poly.get("territoryType") == "area" else poly["name"]
                cx, cy = int(sum(xs) / len(xs)), int(sum(ys) / len(ys))
                area = (max(xs) - min(xs)) * (max(ys) - min(ys))
                size = 12 if area > 2200 else 10
                pd.text((cx, cy), label, font=font(size, True), fill=(*color, 255), anchor="mm", stroke_width=2, stroke_fill="white")
    panel.alpha_composite(poly_layer, (0, header_h))
    heat = PILImage.new("RGBA", (width, map_h), (0, 0, 0, 0))
    hd = ImageDraw.Draw(heat)
    positions = []
    max_eggs = max(max(p["ovos"] for p in points), 1)
    for p in points:
        wx, wy = world_xy(p["longitude"], p["latitude"], z)
        x = int((wx - bx1) / max(bx2 - bx1, 1) * width)
        y = int((wy - by1) / max(by2 - by1, 1) * map_h)
        intensity = math.sqrt(p["ovos"] / max_eggs)
        radius = int(34 + 48 * intensity)
        if p["ovos"] > 0:
            for k in range(8, 0, -1):
                rr = radius * k / 8
                alpha = int((16 + 10 * intensity) * (9 - k))
                color = egg_color(p["ovos"])
                hd.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(color[0], color[1], color[2], alpha))
        positions.append((p, x, y + header_h))
    heat = heat.filter(ImageFilter.GaussianBlur(radius=12))
    panel.alpha_composite(heat, (0, header_h))
    draw = ImageDraw.Draw(panel)
    label_font = font(17, True)
    used = []
    offsets = [(8, -26), (8, 7), (-92, -26), (-92, 7), (8, -48), (-92, -48)]
    for p, x, y in sorted(positions, key=lambda q: q[0]["ovos"], reverse=True):
        c = egg_color(p["ovos"])
        draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=c, outline="white", width=2)
        label = f"OV-{p['numero']}  {p['ovos']}"
        box = draw.textbbox((0, 0), label, font=label_font)
        tw, th = box[2] - box[0], box[3] - box[1]
        chosen = None
        for ox, oy in offsets:
            rx1 = max(2, min(width - tw - 10, x + ox))
            ry1 = max(header_h + 2, min(height - th - 8, y + oy))
            rect = (rx1, ry1, rx1 + tw + 8, ry1 + th + 5)
            if not any(not (rect[2] < u[0] or rect[0] > u[2] or rect[3] < u[1] or rect[1] > u[3]) for u in used):
                chosen = rect
                break
        if chosen is None:
            chosen = rect
        used.append(chosen)
        draw.rounded_rectangle(chosen, radius=5, fill=(255, 255, 255, 220), outline=c, width=2)
        draw.text((chosen[0] + 4, chosen[1] + 1), label, font=label_font, fill="#102F4A")
    draw.text((width - 330, height - 22), "Base esquemática local - grade geográfica", font=font(13), fill="#40566B")
    return panel


def make_heat_map(by_ov, cycle, out_path, territories):
    all_points = [v[cycle] for v in by_ov.values()]
    district_names = {"Influência", "Porto Velho do Cunha", "Ilha dos Pombos", "Barra de São Francisco", "Córrego da Prata"}
    groups = [
        ("SEDE URBANA", [p for p in all_points if p["bairro"] not in district_names], [p for p in territories if p["folder"] != "DISTRITOS"]),
        ("2º DISTRITO - INFLUÊNCIA", [p for p in all_points if p["bairro"] == "Influência"], [p for p in territories if p["folder"] == "DISTRITOS" and p["name"] == "Influência"]),
        ("PORTO VELHO DO CUNHA", [p for p in all_points if p["bairro"] == "Porto Velho do Cunha"], [p for p in territories if p["folder"] == "DISTRITOS" and p["name"] == "Porto Velho do Cunha"]),
        ("ILHA DOS POMBOS", [p for p in all_points if p["bairro"] == "Ilha dos Pombos"], [p for p in territories if p["folder"] == "DISTRITOS" and p["name"] == "Ilha dos Pombos"]),
        ("BARRA E CÓRREGO DA PRATA", [p for p in all_points if p["bairro"] in {"Barra de São Francisco", "Córrego da Prata"}], [p for p in territories if p["folder"] == "DISTRITOS" and p["name"] in {"Barra de São Francisco", "Córrego da Prata"}]),
    ]
    canvas_img = PILImage.new("RGB", (1700, 1980), "#E6EDF3")
    main = render_panel(groups[0][1], cycle, groups[0][0], 1660, 1040, groups[0][2])
    canvas_img.paste(main.convert("RGB"), (20, 20))
    positions = [(20, 1080), (860, 1080), (20, 1480), (860, 1480)]
    for (title, pts, polys), pos in zip(groups[1:], positions):
        img = render_panel(pts, cycle, title, 820, 380, polys)
        canvas_img.paste(img.convert("RGB"), pos)
    d = ImageDraw.Draw(canvas_img)
    d.rectangle((20, 1866, 1680, 1960), fill="#FFFFFF")
    legend = [("0", 0), ("1-49", 20), ("50-99", 60), ("100-149", 120), ("150+", 180)]
    x = 40
    for label, value in legend:
        d.ellipse((x, 1870, x + 16, 1886), fill=egg_color(value))
        d.text((x + 22, 1867), label, font=font(16, True), fill="#17324D")
        x += 120
    d.text((760, 1867), "Intensidade calculada separadamente para este ciclo", font=font(16), fill="#40566B")
    d.text((40, 1902), "CORES DOS NÚMEROS E POLÍGONOS = MICROÁREAS", font=font(15, True), fill="#17324D")
    legend_items = list(MICROAREA_COLORS.items())
    for idx, (name, color) in enumerate(legend_items):
        row, col = divmod(idx, 7)
        lx = 40 + col * 235
        ly = 1926 + row * 25
        d.rounded_rectangle((lx, ly, lx + 18, ly + 18), radius=4, fill=color)
        d.text((lx + 24, ly - 1), name, font=font(13, True), fill="#17324D")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas_img.save(out_path, quality=94)


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved = []

    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved)
        for state in self._saved:
            self.__dict__.update(state)
            self._decorate(total)
            super().showPage()
        super().save()

    def _decorate(self, total):
        w, h = A4
        self.saveState()
        self.setFillColor(NAVY)
        self.rect(0, h - 12 * mm, w, 12 * mm, stroke=0, fill=1)
        self.setFillColor(colors.white)
        self.setFont("Helvetica-Bold", 8)
        self.drawString(18 * mm, h - 7.6 * mm, "VIGILÂNCIA AMBIENTAL - CARMO/RJ")
        self.setStrokeColor(GRID)
        self.line(18 * mm, 14 * mm, w - 18 * mm, 14 * mm)
        self.setFont("Helvetica", 7)
        self.setFillColor(MUTED)
        self.drawString(18 * mm, 9 * mm, "Plano operacional orientado por ovitrampas - versão revisada em 16/10/2026")
        self.drawRightString(w - 18 * mm, 9 * mm, f"Página {self._pageNumber} de {total}")
        self.restoreState()


def P(text, style):
    return Paragraph(text, style)


def section(title, width, styles):
    t = Table([[P(title, styles["section"])]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def boxed(items, width, background=PALE, border=GRID):
    t = Table([[items]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), background),
        ("BOX", (0, 0), (-1, -1), 0.6, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t


def build_pdf(by_ov, map_a, map_b):
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUT_PATH), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=17 * mm, bottomMargin=18 * mm,
        title="Plano Operacional de Controle Vetorial Orientado por Ovitrampas - Carmo/RJ",
        author="Coordenação de Vigilância em Saúde - Carmo/RJ",
    )
    width = A4[0] - 36 * mm
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle("title", parent=base["Title"], fontName="Helvetica-Bold", fontSize=17, leading=20, textColor=NAVY, alignment=TA_CENTER, spaceAfter=3),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=MUTED, alignment=TA_CENTER),
        "section": ParagraphStyle("section", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=11, textColor=colors.white),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=NAVY, spaceBefore=3, spaceAfter=4),
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName="Helvetica", fontSize=8.1, leading=11, textColor=INK, spaceAfter=3),
        "small": ParagraphStyle("small", parent=base["BodyText"], fontName="Helvetica", fontSize=6.8, leading=8.5, textColor=INK),
        "tiny": ParagraphStyle("tiny", parent=base["BodyText"], fontName="Helvetica", fontSize=5.8, leading=7, textColor=INK),
        "th": ParagraphStyle("th", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=6.1, leading=7.2, textColor=colors.white, alignment=TA_CENTER),
        "td": ParagraphStyle("td", parent=base["Normal"], fontName="Helvetica", fontSize=5.8, leading=7.0, textColor=INK),
        "tdc": ParagraphStyle("tdc", parent=base["Normal"], fontName="Helvetica", fontSize=6.1, leading=7.2, textColor=INK, alignment=TA_CENTER),
        "caption": ParagraphStyle("caption", parent=base["Normal"], fontName="Helvetica", fontSize=7.2, leading=9.2, textColor=MUTED, alignment=TA_LEFT),
    }

    story = []
    crest = Image(str(CREST_PATH), width=18 * mm, height=21.2 * mm) if CREST_PATH.exists() else ""
    header_text = [
        P("<b>PREFEITURA MUNICIPAL DE CARMO</b>", ParagraphStyle("inst1", parent=styles["body"], fontSize=9, leading=11, alignment=TA_CENTER, textColor=NAVY)),
        P("SECRETARIA MUNICIPAL DE SAÚDE", ParagraphStyle("inst2", parent=styles["body"], fontSize=8, leading=10, alignment=TA_CENTER, textColor=NAVY)),
        P("COORDENAÇÃO DE VIGILÂNCIA EM SAÚDE", ParagraphStyle("inst3", parent=styles["body"], fontSize=7.5, leading=9, alignment=TA_CENTER, textColor=MUTED)),
    ]
    ht = Table([[crest, header_text, ""]], colWidths=[24 * mm, width - 48 * mm, 24 * mm])
    ht.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (1, 0), (1, 0), "CENTER"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story += [ht, Spacer(1, 4), P("PLANO OPERACIONAL DE CONTROLE VETORIAL<br/>ORIENTADO POR OVITRAMPAS", styles["title"]), P("56 pontos monitorados - dois ciclos de campo de 2026 - versão revisada", styles["subtitle"]), Spacer(1, 8)]

    story += [section("1. FINALIDADE, ESCOPO E BASE DA DECISÃO", width, styles), Spacer(1, 4)]
    intro = [
        P("<b>Finalidade.</b> Direcionar a intensificação das visitas, a eliminação de criadouros e o retorno aos imóveis a partir da distribuição espacial e da tendência entre as duas semanas de ovitrampas.", styles["body"]),
        P("<b>Limite de interpretação.</b> A contagem de ovos é um indicador entomológico de presença e densidade relativa. Ela não identifica vírus, não localiza sozinha o imóvel produtor e não substitui a análise epidemiológica, a inspeção de campo ou o protocolo de bloqueio de transmissão.", styles["body"]),
        P("<b>Base utilizada.</b> Ciclo A: instalação em 16-17/09/2026, coleta em 21-22/09/2026, 1.017 ovos e 32 OVs positivas. Ciclo B: instalação em 21-22/09/2026, coleta em 28-29/09/2026, 2.665 ovos e 32 OVs positivas. A prioridade usa principalmente o Ciclo B; o Ciclo A informa tendência e persistência.", styles["body"]),
    ]
    story += [boxed(intro, width), Spacer(1, 6)]

    story.append(P("Matriz municipal de priorização", styles["h2"]))
    matrix = [
        [P("Nível", styles["th"]), P("Gatilho principal", styles["th"]), P("Buffer local", styles["th"]), P("Resposta operacional", styles["th"])],
        [P("<b>P1 - crítico</b>", styles["td"]), P("Ciclo B ≥ 150 ovos", styles["td"]), P("100 m", styles["tdc"]), P("Vistoria ampliada, eliminação imediata, supervisão e retorno programado.", styles["td"])],
        [P("<b>P2 - alto</b>", styles["td"]), P("Ciclo B de 100 a 149 ovos", styles["td"]), P("80 m", styles["tdc"]), P("Cobertura integral do quarteirão e faces confrontantes acessíveis.", styles["td"])],
        [P("<b>P3 - moderado</b>", styles["td"]), P("Ciclo B de 50 a 99; ou A ≥ 100 com queda no B", styles["td"]), P("50 m", styles["tdc"]), P("Verificação dirigida, busca de criadouros e confirmação da tendência.", styles["td"])],
        [P("<b>P4 - vigilância</b>", styles["td"]), P("Ciclo B de 0 a 49 ovos", styles["td"]), P("30 m", styles["tdc"]), P("Rotina preventiva no imóvel-sede e vizinhos imediatos.", styles["td"])],
    ]
    mt = Table(matrix, colWidths=[27 * mm, 51 * mm, 23 * mm, width - 101 * mm], repeatRows=1)
    mt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.5, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story += [mt, Spacer(1, 4), P("Os buffers são critérios locais de planejamento e devem ser ajustados à malha urbana, barreiras físicas, acessibilidade e achados da equipe. Suspeita ou confirmação de caso humano exige integração com a Vigilância Epidemiológica e aplicação do protocolo específico; adulticida não é acionado apenas pela contagem de ovos.", styles["caption"]), Spacer(1, 7)]

    story.append(P("Distribuição dos 10 agentes", styles["h2"]))
    teams = [
        [P("Equipe", styles["th"]), P("Efetivo", styles["th"]), P("Território-base", styles["th"]), P("Responsabilidade", styles["th"])],
        [P("Fixa - Influência", styles["td"]), P("1 ACE", styles["tdc"]), P("2º Distrito", styles["td"]), P("Vigilância diária e continuidade local; integra o mutirão de quarta-feira.", styles["td"])],
        [P("Alpha", styles["td"]), P("2 ACEs", styles["tdc"]), P("Progresso e Centro", styles["td"]), P("Pontos P1/P3, retornos e fechamento de pendências.", styles["td"])],
        [P("Beta", styles["td"]), P("2 ACEs", styles["tdc"]), P("Jardim Centenário e Boa Ideia", styles["td"]), P("Ponto P1, cobertura do entorno e apoio aos retornos.", styles["td"])],
        [P("Gama", styles["td"]), P("2 ACEs", styles["tdc"]), P("Val Paraíso, Morro do Estado e Caixa d'Água", styles["td"]), P("Pontos P2 e terrenos/áreas críticas identificados em campo.", styles["td"])],
        [P("Delta", styles["td"]), P("3 ACEs", styles["tdc"]), P("Distritos", styles["td"]), P("Viatura, logística distrital e reforço do mutirão.", styles["td"])],
    ]
    tt = Table(teams, colWidths=[31 * mm, 19 * mm, 53 * mm, width - 103 * mm], repeatRows=1)
    tt.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.5, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("TOPPADDING", (0, 0), (-1, -1), 3.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5)]))
    story.append(tt)

    story.append(PageBreak())
    story += [section("2. PROGRAMAÇÃO OPERACIONAL PRIORITÁRIA", width, styles), Spacer(1, 4), P("A programação abaixo reúne os 14 pontos prioritários. Na quarta-feira, os 10 ACEs atuam em mutirão no 2º Distrito. Equipes sem ordem prioritária no dia mantêm rotina, retorno a imóveis fechados/recusados e encerramento de pendências.", styles["body"]), Spacer(1, 3)]
    sched = [[P(x, styles["th"]) for x in ["Dia", "Equipe", "OV", "Local", "A", "B", "Δ", "Total", "Buffer", "Ação dirigida"]]]
    for day, team, ov, bairro, address, buffer, action in SCHEDULE:
        a = by_ov[ov]["A"]["ovos"]
        b = by_ov[ov]["B"]["ovos"]
        sched.append([
            P(f"<b>{day}</b>", styles["tdc"]), P(team, styles["tdc"]), P(f"<b>OV-{ov}</b>", styles["tdc"]),
            P(f"<b>{bairro}</b><br/>{address}", styles["tiny"]), P(str(a), styles["tdc"]), P(f"<b>{b}</b>", styles["tdc"]),
            P(f"{b-a:+d}", styles["tdc"]), P(str(a+b), styles["tdc"]), P(f"<b>{buffer}</b>", styles["tdc"]), P(action, styles["tiny"]),
        ])
    sw = [12*mm, 18*mm, 15*mm, 47*mm, 10*mm, 10*mm, 11*mm, 12*mm, 15*mm, width - 150*mm]
    st = Table(sched, colWidths=sw, repeatRows=1)
    st.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.45, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2),
    ]))
    story += [st, Spacer(1, 6)]
    story += [section("REGRAS DE EXECUÇÃO DIÁRIA", width, styles), Spacer(1, 4)]
    daily = [
        P("<b>Antes da saída:</b> supervisor confirma equipes, mapa, endereços, EPI, insumos autorizados, formulários e viatura.", styles["body"]),
        P("<b>Durante a ação:</b> registrar cada imóvel como trabalhado, fechado, recusado, desocupado ou impedido; contabilizar depósitos eliminados, protegidos e tratados.", styles["body"]),
        P("<b>Fim do turno:</b> lançar os dados no sistema no mesmo dia, consolidar pendências e definir retornos em até 48 horas quando operacionalmente possível.", styles["body"]),
        P("<b>Reavaliação:</b> pontos P1 e P2 devem ser revistos em até 7 dias ou no próximo ciclo oficial, com decisão registrada pela coordenação.", styles["body"]),
    ]
    story.append(boxed(daily, width))

    for cycle, map_path, title, subtitle in [
        ("A", map_a, "3. MAPA DE CALOR - PRIMEIRA SEMANA", "Ciclo A - coletas em 21-22/09/2026 - 1.017 ovos - 32 OVs positivas - semana epidemiológica 37"),
        ("B", map_b, "4. MAPA DE CALOR - SEGUNDA SEMANA", "Ciclo B - coletas em 28-29/09/2026 - 2.665 ovos - 32 OVs positivas - semana epidemiológica 38"),
    ]:
        story.append(PageBreak())
        story += [section(title, width, styles), Spacer(1, 4), P(subtitle, styles["body"]), Spacer(1, 4)]
        story.append(Image(str(map_path), width=width, height=width * 1980 / 1700))
        story += [Spacer(1, 4), P("Cada mapa usa somente os valores do respectivo ciclo. As manchas indicam concentração relativa para planejamento; os números ao lado dos pontos são as contagens individuais da semana. As linhas coloridas mostram os polígonos oficiais dos quarteirões na sede, identificados como Q-xx na cor da respectiva microárea, e os limites territoriais disponíveis nos distritos. A base é construída localmente, sem envio de localização a serviços externos. A tabela do Anexo A contém as 56 OVs e permite a comparação direta entre os ciclos.", styles["caption"])]

    story.append(PageBreak())
    story += [section("5. PROCEDIMENTO DE CAMPO, SEGURANÇA E MONITORAMENTO", width, styles), Spacer(1, 5)]
    flow = [
        [P("1", styles["th"]), P("Preparar", styles["th"]), P("Confirmar rota, prioridade, identificação funcional, EPI e materiais autorizados.", styles["td"])],
        [P("2", styles["th"]), P("Abordar", styles["th"]), P("Explicar que o monitoramento apontou maior presença de ovos na área e solicitar acesso para inspeção preventiva.", styles["td"])],
        [P("3", styles["th"]), P("Inspecionar", styles["th"]), P("Percorrer chão, meia altura e alto: recipientes, ralos, calhas, caixas, tonéis, pneus, lonas e áreas sombreadas.", styles["td"])],
        [P("4", styles["th"]), P("Corrigir", styles["th"]), P("Eliminar, virar, proteger ou vedar. Tratamento químico/biológico somente com produto, dose, indicação e registro previstos no protocolo vigente.", styles["td"])],
        [P("5", styles["th"]), P("Registrar", styles["th"]), P("Situação do imóvel, depósitos encontrados, providência, pendência, responsável pela visita e horário.", styles["td"])],
        [P("6", styles["th"]), P("Retornar", styles["th"]), P("Revisitar pendências e pontos P1/P2; comunicar risco coletivo, imóvel especial ou necessidade de outra secretaria.", styles["td"])],
    ]
    ft = Table(flow, colWidths=[12*mm, 27*mm, width-39*mm])
    ft.setStyle(TableStyle([("BACKGROUND", (0, 0), (1, -1), NAVY), ("GRID", (0, 0), (-1, -1), 0.5, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TEXTCOLOR", (0, 0), (1, -1), colors.white), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story += [ft, Spacer(1, 7)]
    two_col = Table([[
        [P("<b>Segurança e encaminhamentos</b>", styles["h2"]), P("• Não subir em telhados nem acessar estrutura insegura.<br/>• Comunicar material perfurocortante, risco elétrico, animal agressivo e produto químico.<br/>• Respeitar recusa e registrar; acionar fluxo administrativo quando houver risco sanitário persistente.<br/>• Nebulização/adulticida depende de decisão técnica e epidemiológica específica.<br/>• Não divulgar nome de morador em mapa ou relatório público.", styles["body"])],
        [P("<b>Metas internas da operação</b>", styles["h2"]), P("• Cobertura dos imóveis programados: ≥ 90%.<br/>• Depósitos passíveis de correção resolvidos na visita: ≥ 95%.<br/>• Registros lançados no mesmo dia: 100%.<br/>• Retorno documentado aos pontos P1/P2: 100%.<br/>• Pendência total (fechado + recusado): ≤ 10%.<br/>• Acidente ocupacional: zero.", styles["body"])],
    ]], colWidths=[width/2-3, width/2-3])
    two_col.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOX", (0, 0), (-1, -1), 0.5, GRID), ("INNERGRID", (0, 0), (-1, -1), 0.5, GRID), ("BACKGROUND", (0, 0), (-1, -1), PALE), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    story += [two_col, Spacer(1, 7), P("Indicadores para o fechamento", styles["h2"])]
    indicators = [
        [P("Indicador", styles["th"]), P("Cálculo", styles["th"]), P("Uso na decisão", styles["th"])],
        [P("Cobertura", styles["td"]), P("imóveis trabalhados ÷ imóveis programados × 100", styles["td"]), P("Identifica necessidade de novo turno ou redistribuição de equipe.", styles["td"])],
        [P("Pendência", styles["td"]), P("(fechados + recusados) ÷ programados × 100", styles["td"]), P("Organiza retorno e acionamento administrativo.", styles["td"])],
        [P("Resolutividade", styles["td"]), P("depósitos corrigidos ÷ depósitos passíveis de correção × 100", styles["td"]), P("Avalia resultado concreto da visita.", styles["td"])],
        [P("Tendência entomológica", styles["td"]), P("ovos do Ciclo B - ovos do Ciclo A", styles["td"]), P("Mantém, amplia ou reduz a prioridade no ciclo seguinte.", styles["td"])],
    ]
    it = Table(indicators, colWidths=[38*mm, 62*mm, width-100*mm], repeatRows=1)
    it.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.5, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    story += [it, Spacer(1, 8)]
    sign = Table([[P("______________________________________________<br/><b>Coordenação de Vigilância em Saúde</b><br/>Secretaria Municipal de Saúde - Carmo/RJ<br/><br/>Data: ____/____/________", ParagraphStyle("sign", parent=styles["body"], alignment=TA_CENTER, leading=12))]], colWidths=[width])
    story.append(sign)

    story.append(PageBreak())
    story += [section("ANEXO A - RESULTADOS DAS 56 OVITRAMPAS NOS DOIS CICLOS", width, styles), Spacer(1, 4), P("A tabela preserva os resultados separados por semana. Δ = Ciclo B - Ciclo A. A prioridade é calculada pela matriz municipal deste plano.", styles["body"]), Spacer(1, 3)]
    all_rows = []
    for ov, cyc in by_ov.items():
        a, b = cyc["A"]["ovos"], cyc["B"]["ovos"]
        prio, radius = priority(a, b)
        all_rows.append((ov, cyc["A"]["bairro"], a, b, b-a, a+b, prio, radius))
    chunks = [all_rows[:28], all_rows[28:]]
    for idx, chunk in enumerate(chunks):
        if idx:
            story.append(PageBreak())
            story += [section("ANEXO A - RESULTADOS DAS 56 OVITRAMPAS (CONTINUAÇÃO)", width, styles), Spacer(1, 5)]
        tab = [[P(x, styles["th"]) for x in ["OV", "Bairro/Distrito", "Ciclo A", "Ciclo B", "Δ", "Total", "Nível", "Buffer"]]]
        for ov, bairro, a, b, delta, total, prio, radius in chunk:
            tab.append([P(f"<b>OV-{ov}</b>", styles["tdc"]), P(bairro, styles["td"]), P(str(a), styles["tdc"]), P(str(b), styles["tdc"]), P(f"{delta:+d}", styles["tdc"]), P(str(total), styles["tdc"]), P(prio, styles["tdc"]), P(radius, styles["tdc"])])
        widths = [18*mm, 58*mm, 18*mm, 18*mm, 16*mm, 18*mm, 16*mm, width-162*mm]
        at = Table(tab, colWidths=widths, repeatRows=1)
        at.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.45, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
        story.append(at)

    story.append(PageBreak())
    story += [section("REFERÊNCIAS TÉCNICAS E CONTROLE DO DOCUMENTO", width, styles), Spacer(1, 6)]
    refs = [
        P("<b>1.</b> Ministério da Saúde. Nota Técnica nº 3/2025-CGARB/DEDT/SVSA/MS. Implementação da vigilância entomológica de <i>Aedes aegypti</i> e <i>Aedes albopictus</i> com ovitrampas no território nacional.", styles["body"]),
        P("<b>2.</b> Ministério da Saúde. Diretrizes Nacionais para Prevenção e Controle das Arboviroses Urbanas: Vigilância Entomológica e Controle Vetorial.", styles["body"]),
        P("<b>3.</b> Ministério da Saúde. Vigilância e controle do vetor - indicadores entomológicos, manejo integrado de vetores e segurança do trabalhador.", styles["body"]),
        P("<b>4.</b> Base municipal GPS Ovitrampas / Conta Ovos: 56 armadilhas e 112 leituras de 2026, auditadas em 16/10/2026.", styles["body"]),
    ]
    story += [boxed(refs, width), Spacer(1, 8)]
    control = [
        [P("Campo", styles["th"]), P("Registro", styles["th"])],
        [P("Documento", styles["td"]), P("Plano Operacional de Controle Vetorial Orientado por Ovitrampas", styles["td"])],
        [P("Versão", styles["td"]), P("2.0 - revisada em 16/10/2026", styles["td"])],
        [P("Dados", styles["td"]), P("Ciclos A e B de setembro de 2026, mantidos separados nos mapas e no Anexo A", styles["td"])],
        [P("Aprovação", styles["td"]), P("Coordenação de Vigilância em Saúde - assinatura na página 5", styles["td"])],
    ]
    ct = Table(control, colWidths=[40*mm, width-40*mm])
    ct.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.5, GRID), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    story.append(ct)

    doc.build(story, canvasmaker=NumberedCanvas)
    return OUT_PATH


def main():
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    by_ov = load_data()
    territories = load_territories()
    map_a = TMP_DIR / "mapa_calor_semana_1.png"
    map_b = TMP_DIR / "mapa_calor_semana_2.png"
    make_heat_map(by_ov, "A", map_a, territories)
    make_heat_map(by_ov, "B", map_b, territories)
    path = build_pdf(by_ov, map_a, map_b)
    print(path)


if __name__ == "__main__":
    main()
