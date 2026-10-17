"""
Script: generate_mapas_individuais.py
Finalidade: Gerar recortes individuais de satelite em altissima resolucao (ArcGIS World Imagery, zoom 17)
            para CADA uma das 15 armadilhas foco semanais de Carmo-RJ.

Requisitos de Design:
- SEM barra preta de titulo no topo: 100% da imagem de satelite visivel.
- Precisao metrica rigorosa:
    * Raio de 100m: Nucleo Focal Prioritario (Vermelho translucido com borda destacada)
    * Raio de 200m: Perimetro de Bloqueio Perifocal MS (Laranja translucido com borda destacada)
    * Ponto central: Pino vermelho com nucleo branco e sombra
- Tarja discreta no rodape (38px):
    * Identificacao: ex: "OV-23 • Pousada Valle do Sol"
    * Carga 2 Semanas: ex: "342 ovos (Acumulado A + B)"
    * Legenda minima: Vermelho = 100m | Laranja = 200m
- Cache local de tiles para maxima performance e resiliencia.
"""

import os
import math
import io
import time
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from PIL import Image, ImageDraw, ImageFont

# Configuracoes de renderizacao
ZOOM_DEFAULT = 17
IMG_WIDTH = 800
MAP_HEIGHT = 562
FOOTER_HEIGHT = 38
TOTAL_HEIGHT = MAP_HEIGHT + FOOTER_HEIGHT

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache_tiles")
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output", "mapas_individuais")

# Sessao HTTP otimizada
session = requests.Session()
retries = Retry(total=4, backoff_factor=0.3, status_forcelist=[500, 502, 503, 504])
session.mount('https://', HTTPAdapter(max_retries=retries))
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) OvitrampasMap/2.0'})


def get_fonts():
    """Carrega fontes do sistema com fallback seguro."""
    try:
        font_id = ImageFont.truetype('arialbd.ttf', 13)
        font_ovos = ImageFont.truetype('arialbd.ttf', 13)
        font_leg = ImageFont.truetype('arial.ttf', 11)
        font_pill = ImageFont.truetype('arialbd.ttf', 10)
    except Exception:
        try:
            font_id = ImageFont.truetype('segoeuib.ttf', 13)
            font_ovos = ImageFont.truetype('segoeuib.ttf', 13)
            font_leg = ImageFont.truetype('segoeui.ttf', 11)
            font_pill = ImageFont.truetype('segoeuib.ttf', 10)
        except Exception:
            f = ImageFont.load_default()
            font_id, font_ovos, font_leg, font_pill = f, f, f, f
    return font_id, font_ovos, font_leg, font_pill


def get_global_pixel(lat_deg, lon_deg, zoom):
    """Calcula a coordenada em pixels globais Web Mercator (EPSG:3857)."""
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    x = (lon_deg + 180.0) / 360.0 * n * 256.0
    y = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n * 256.0
    return x, y


def fetch_tile(url, cache_path):
    """Baixa um tile com cache em disco persistente."""
    if os.path.exists(cache_path) and os.path.getsize(cache_path) > 0:
        try:
            return Image.open(cache_path)
        except Exception:
            pass

    try:
        resp = session.get(url, timeout=6)
        if resp.status_code == 200:
            os.makedirs(os.path.dirname(cache_path), exist_ok=True)
            with open(cache_path, 'wb') as f:
                f.write(resp.content)
            return Image.open(io.BytesIO(resp.content))
    except Exception as e:
        print(f"Aviso: falha ao baixar tile {url}: {e}")
    return None


def generate_mapa_individual(lat, lng, ident, ovos_texto, output_filename, zoom=ZOOM_DEFAULT):
    """
    Gera um mapa individual de satelite perfeitamente centralizado na armadilha foco.
    
    Parametros:
      lat, lng: Coordenadas decimais WGS-84
      ident: Texto identificador (ex: 'OV-23 • Pousada Valle do Sol')
      ovos_texto: Carga em 2 semanas (ex: '342 ovos (Acumulado A + B)')
      output_filename: Nome do arquivo de saida (ex: 'segunda_ov23_pousada.png')
      zoom: Nivel de zoom (default 17)
    """
    gx, gy = get_global_pixel(lat, lng, zoom)

    # Coordenadas do recorte na grade global (armadilha no centro exato)
    cx = IMG_WIDTH / 2.0
    cy = MAP_HEIGHT / 2.0
    xmin = gx - cx
    ymin = gy - cy
    xmax = xmin + IMG_WIDTH
    ymax = ymin + MAP_HEIGHT

    t_xmin = int(math.floor(xmin / 256.0))
    t_xmax = int(math.floor(xmax / 256.0))
    t_ymin = int(math.floor(ymin / 256.0))
    t_ymax = int(math.floor(ymax / 256.0))

    canvas_w = (t_xmax - t_xmin + 1) * 256
    canvas_h = (t_ymax - t_ymin + 1) * 256

    stitched_sat = Image.new('RGB', (canvas_w, canvas_h), (25, 25, 25))
    stitched_lbl = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))

    # Download e montagem dos tiles de satelite e rotulos
    for tx in range(t_xmin, t_xmax + 1):
        for ty in range(t_ymin, t_ymax + 1):
            px_tile = (tx - t_xmin) * 256
            py_tile = (ty - t_ymin) * 256

            # 1. Satelite ArcGIS World Imagery
            sat_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{ty}/{tx}"
            sat_cache = os.path.join(CACHE_DIR, f"sat_{zoom}_{tx}_{ty}.jpg")
            tile_sat = fetch_tile(sat_url, sat_cache)
            if tile_sat:
                stitched_sat.paste(tile_sat.convert('RGB'), (px_tile, py_tile))

            # 2. Rotulos ArcGIS Reference (ruas e limites)
            lbl_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{zoom}/{ty}/{tx}"
            lbl_cache = os.path.join(CACHE_DIR, f"lbl_{zoom}_{tx}_{ty}.png")
            tile_lbl = fetch_tile(lbl_url, lbl_cache)
            if tile_lbl:
                stitched_lbl.paste(tile_lbl.convert('RGBA'), (px_tile, py_tile))

    # Recorte exato centralizado
    crop_x1 = int(round(xmin - t_xmin * 256.0))
    crop_y1 = int(round(ymin - t_ymin * 256.0))
    map_crop = stitched_sat.crop((crop_x1, crop_y1, crop_x1 + IMG_WIDTH, crop_y1 + MAP_HEIGHT)).convert('RGBA')
    labels_crop = stitched_lbl.crop((crop_x1, crop_y1, crop_x1 + IMG_WIDTH, crop_y1 + MAP_HEIGHT))

    # Calculo metrico preciso dos raios de 100m e 200m
    lat_rad = math.radians(lat)
    meters_per_pixel = 156543.03392 * math.cos(lat_rad) / (2.0 ** zoom)
    r100 = 100.0 / meters_per_pixel
    r200 = 200.0 / meters_per_pixel

    # Camada vetorial com os aneis de amortecimento
    overlay = Image.new('RGBA', (IMG_WIDTH, MAP_HEIGHT), (0, 0, 0, 0))
    draw_ov = ImageDraw.Draw(overlay)
    font_id, font_ovos, font_leg, font_pill = get_fonts()

    # 1. Raio de 200m (Perimetro de Bloqueio Perifocal MS)
    draw_ov.ellipse([cx - r200, cy - r200, cx + r200, cy + r200],
                    fill=(245, 158, 11, 40), outline=(245, 158, 11, 255), width=3)

    # 2. Raio de 100m (Nucleo Focal Prioritario)
    draw_ov.ellipse([cx - r100, cy - r100, cx + r100, cy + r100],
                    fill=(220, 38, 38, 65), outline=(220, 38, 38, 255), width=3)

    # Etiquetas de cota nos aneis (pills discretos no topo dos circulos)
    # Pill 100m
    p100_x, p100_y = cx, cy - r100
    t100 = "100m"
    b100 = draw_ov.textbbox((p100_x, p100_y), t100, font=font_pill, anchor='mm')
    draw_ov.rounded_rectangle([b100[0]-4, b100[1]-2, b100[2]+4, b100[3]+2],
                              radius=3, fill=(185, 28, 28, 235), outline=(255, 255, 255, 240), width=1)
    draw_ov.text((p100_x, p100_y), t100, fill=(255, 255, 255), font=font_pill, anchor='mm')

    # Pill 200m
    p200_x, p200_y = cx, cy - r200
    t200 = "200m"
    b200 = draw_ov.textbbox((p200_x, p200_y), t200, font=font_pill, anchor='mm')
    draw_ov.rounded_rectangle([b200[0]-4, b200[1]-2, b200[2]+4, b200[3]+2],
                              radius=3, fill=(217, 119, 6, 235), outline=(255, 255, 255, 240), width=1)
    draw_ov.text((p200_x, p200_y), t200, fill=(255, 255, 255), font=font_pill, anchor='mm')

    # Composicao das camadas visuais do mapa
    final_map = Image.alpha_composite(map_crop, overlay)
    final_map = Image.alpha_composite(final_map, labels_crop)

    # Imagem final completa (Mapa 100% visivel + Tarja de rodape)
    final_img = Image.new('RGB', (IMG_WIDTH, TOTAL_HEIGHT), (15, 23, 42))
    final_img.paste(final_map.convert('RGB'), (0, 0))

    draw = ImageDraw.Draw(final_img)

    # Ponto central: Pino vermelho com nucleo branco e sombra
    draw.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=(0, 0, 0, 160))
    draw.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=(220, 38, 38), outline=(255, 255, 255), width=2)
    draw.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(255, 255, 255))

    # --- TARJA DISCRETA NO RODAPE ---
    # Linha divisoria sutil
    draw.line([(0, MAP_HEIGHT), (IMG_WIDTH, MAP_HEIGHT)], fill=(51, 65, 85), width=1)

    y_text = MAP_HEIGHT + 11

    # Lado Esquerdo: Identificacao e Carga
    draw.text((15, y_text), ident, fill=(255, 255, 255), font=font_id)
    bbox_id = draw.textbbox((15, y_text), ident, font=font_id)
    carga_full = f" • {ovos_texto}"
    draw.text((bbox_id[2], y_text), carga_full, fill=(253, 224, 71), font=font_ovos)

    # Lado Direito: Legenda Minima
    leg2_text = "Laranja = 200m"
    leg1_text = "Vermelho = 100m"

    x_cursor = IMG_WIDTH - 15

    # 200m
    bbox2 = draw.textbbox((0, 0), leg2_text, font=font_leg)
    w2 = bbox2[2] - bbox2[0]
    x2 = x_cursor - w2
    draw.text((x2, y_text), leg2_text, fill=(226, 232, 240), font=font_leg)
    draw.ellipse([x2 - 14, y_text + 2, x2 - 4, y_text + 12], fill=(245, 158, 11), outline=(255, 255, 255), width=1)

    # 100m
    x_cursor = x2 - 25
    bbox1 = draw.textbbox((0, 0), leg1_text, font=font_leg)
    w1 = bbox1[2] - bbox1[0]
    x1 = x_cursor - w1
    draw.text((x1, y_text), leg1_text, fill=(226, 232, 240), font=font_leg)
    draw.ellipse([x1 - 14, y_text + 2, x1 - 4, y_text + 12], fill=(220, 38, 38), outline=(255, 255, 255), width=1)

    # Salva imagem final
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, output_filename)
    final_img.save(out_path, quality=95)
    file_size_kb = os.path.getsize(out_path) / 1024.0
    print(f"OK: {output_filename:<32} -> {out_path} ({IMG_WIDTH}x{TOTAL_HEIGHT}, {file_size_kb:.1f} KB)")
    return out_path


# Lista oficial das 15 armadilhas foco
ARMADILHAS_FOCO = [
    # SEGUNDA-FEIRA
    {
        "dia": "SEGUNDA",
        "filename": "segunda_ov23_pousada.png",
        "lat": -21.9279386,
        "lng": -42.6166018,
        "ident": "OV-23 • Pousada Valle do Sol",
        "ovos": "342 ovos (Acumulado A + B)"
    },
    {
        "dia": "SEGUNDA",
        "filename": "segunda_ov10_oscar_curty.png",
        "lat": -21.9333550,
        "lng": -42.6083330,
        "ident": "OV-10 • R. Oscar de Souza Curty",
        "ovos": "242 ovos (Acumulado A + B)"
    },
    {
        "dia": "SEGUNDA",
        "filename": "segunda_ov21_silvio_franca.png",
        "lat": -21.9268800,
        "lng": -42.6145000,
        "ident": "OV-21 • R. Silvio Geraldo França",
        "ovos": "100 ovos (Acumulado A + B)"
    },

    # TERCA-FEIRA
    {
        "dia": "TERCA",
        "filename": "terca_ov31_val_paraiso.png",
        "lat": -21.9399107,
        "lng": -42.6120440,
        "ident": "OV-31 • R. Roberto Simões de Araújo",
        "ovos": "192 ovos (Acumulado A + B)"
    },
    {
        "dia": "TERCA",
        "filename": "terca_ov05_jd_centenario.png",
        "lat": -21.9333900,
        "lng": -42.6087000,
        "ident": "OV-05 • R. Ernesto Wermelinger",
        "ovos": "173 ovos (Acumulado A + B)"
    },
    {
        "dia": "TERCA",
        "filename": "terca_ov35_caixa_dagua.png",
        "lat": -21.9350995,
        "lng": -42.6062633,
        "ident": "OV-35 • R. Senador Dantas",
        "ovos": "121 ovos (Acumulado A + B)"
    },

    # QUARTA-FEIRA (Influencia)
    {
        "dia": "QUARTA",
        "filename": "quarta_ov36_manoel_cirilo.png",
        "lat": -21.8758627,
        "lng": -42.6660048,
        "ident": "OV-36 • R. Manoel Cirilo da Silva",
        "ovos": "222 ovos (Acumulado A + B)"
    },
    {
        "dia": "QUARTA",
        "filename": "quarta_ov38_br116.png",
        "lat": -21.8770524,
        "lng": -42.6694291,
        "ident": "OV-38 • Rodovia BR-116, KM 12",
        "ovos": "210 ovos (Acumulado A + B)"
    },
    {
        "dia": "QUARTA",
        "filename": "quarta_ov51_machareth.png",
        "lat": -21.8733495,
        "lng": -42.6616928,
        "ident": "OV-51 • R. Maria da Silva Machareth",
        "ovos": "109 ovos (Acumulado A + B)"
    },

    # QUINTA-FEIRA (Porto Velho e Usina Light)
    {
        "dia": "QUINTA",
        "filename": "quinta_ov45_major_fajardo.png",
        "lat": -21.8257148,
        "lng": -42.5513794,
        "ident": "OV-45 • R. Major Fajardo, 601",
        "ovos": "241 ovos (Acumulado A + B)"
    },
    {
        "dia": "QUINTA",
        "filename": "quinta_ov41_beira_rio.png",
        "lat": -21.8406223,
        "lng": -42.5806883,
        "ident": "OV-41 • R. Beira Rio, 130",
        "ovos": "203 ovos (Acumulado A + B)"
    },
    {
        "dia": "QUINTA",
        "filename": "quinta_ov44_esf_porto_velho.png",
        "lat": -21.8273150,
        "lng": -42.5546281,
        "ident": "OV-44 • R. Major Fajardo (ESF Porto Velho)",
        "ovos": "102 ovos (Acumulado A + B)"
    },

    # SEXTA-FEIRA (Barra de Sao Francisco e Corrego da Prata)
    {
        "dia": "SEXTA",
        "filename": "sexta_ov55_antonio_serafim.png",
        "lat": -21.9716954,
        "lng": -42.6928679,
        "ident": "OV-55 • R. Antônio R. Serafim",
        "ovos": "48 ovos (Acumulado A + B)"
    },
    {
        "dia": "SEXTA",
        "filename": "sexta_ov54_escola_barra.png",
        "lat": -21.9660768,
        "lng": -42.6886252,
        "ident": "OV-54 • Escola da Barra / Sebastião Ferreira",
        "ovos": "47 ovos (Acumulado A + B)"
    },
    {
        "dia": "SEXTA",
        "filename": "sexta_ov48_corrego_prata.png",
        "lat": -21.8645750,
        "lng": -42.4863877,
        "ident": "OV-48 • R. Benfica (ESF Córrego da Prata)",
        "ovos": "19 ovos (Acumulado A + B)"
    }
]


def gerar_todos_os_mapas_individuais():
    """Executa a geracao das 15 imagens de satelite individuais."""
    print("=" * 70)
    print("INICIANDO GERACAO DE RECORTES DE SATELITE INDIVIDUAIS (ZOOM 17)")
    print("Origem: ArcGIS World Imagery | Resolucao: Alta Definicio (Submetrica)")
    print("=" * 70)
    
    t0 = time.time()
    gerados = []

    for idx, t in enumerate(ARMADILHAS_FOCO, start=1):
        print(f"[{idx:02d}/15] Gerando {t['dia']}: {t['ident']}...")
        path = generate_mapa_individual(
            lat=t["lat"],
            lng=t["lng"],
            ident=t["ident"],
            ovos_texto=t["ovos"],
            output_filename=t["filename"],
            zoom=ZOOM_DEFAULT
        )
        gerados.append(path)

    tempo_total = time.time() - t0
    print("=" * 70)
    print(f"CONCLUIDO COM SUCESSO: {len(gerados)} imagens geradas em {tempo_total:.1f} segundos.")
    print(f"Diretorio: {OUTPUT_DIR}")
    print("=" * 70)
    return gerados


if __name__ == '__main__':
    gerar_todos_os_mapas_individuais()
