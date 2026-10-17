import os
import math
import io
import json
import requests
from PIL import Image, ImageDraw, ImageFont

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n)
    return (xtile, ytile)

def latlng_to_pixel(lat, lng, zoom, origin_xtile, origin_ytile):
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    x = ((lng + 180.0) / 360.0 * n - origin_xtile) * 256
    y = ((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n - origin_ytile) * 256
    return (int(x), int(y))

def get_meter_pixels(lat, meters, zoom):
    meters_per_pixel = 156543.03392 * math.cos(math.radians(lat)) / (2.0 ** zoom)
    return meters / meters_per_pixel

PARADAS_COR = [
    (0, (37, 99, 235)),    # Azul
    (1, (22, 163, 74)),    # Verde
    (20, (22, 163, 74)),
    (21, (234, 179, 8)),   # Amarelo
    (50, (234, 179, 8)),
    (51, (249, 115, 22)),  # Laranja
    (100, (249, 115, 22)),
    (101, (220, 38, 38)),  # Vermelho
    (250, (220, 38, 38))
]

def cor_da_intensidade(v):
    if v <= PARADAS_COR[0][0]:
        return PARADAS_COR[0][1]
    for i in range(1, len(PARADAS_COR)):
        v1, c1 = PARADAS_COR[i]
        if v <= v1:
            v0, c0 = PARADAS_COR[i-1]
            t = (v - v0) / (v1 - v0 or 1)
            return (
                int(c0[0] + (c1[0] - c0[0]) * t),
                int(c0[1] + (c1[1] - c0[1]) * t),
                int(c0[2] + (c1[2] - c0[2]) * t)
            )
    return PARADAS_COR[-1][1]

def render_heatmap_satellite(center_lat, center_lng, zoom, tiles_x, tiles_y, all_traps, focal_trap_ids, subtitle, output_path):
    cx, cy = deg2num(center_lat, center_lng, zoom)
    start_x = cx - tiles_x // 2
    start_y = cy - tiles_y // 2
    
    width = tiles_x * 256
    height = tiles_y * 256
    sat_img = Image.new('RGB', (width, height), (30, 30, 30))
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    # 1. Download ArcGIS satellite tiles
    for i in range(tiles_x):
        for j in range(tiles_y):
            tx = start_x + i
            ty = start_y + j
            sat_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{ty}/{tx}"
            try:
                r = requests.get(sat_url, headers=headers, timeout=6)
                if r.status_code == 200:
                    sat_img.paste(Image.open(io.BytesIO(r.content)).convert('RGB'), (i*256, j*256))
            except Exception:
                pass

    # 2. Gaussian KDE heatmap overlay (translucent so roofs & houses show clearly)
    sigma = 115 # meters
    inv2s2 = 1.0 / (2.0 * sigma * sigma)
    
    trap_coords = []
    for t in all_traps:
        px, py = latlng_to_pixel(t['lat'], t['lng'], zoom, start_x, start_y)
        trap_coords.append((px, py, t.get('ovos', 0)))
        
    meters_per_px = 156543.03392 * math.cos(math.radians(center_lat)) / (2.0 ** zoom)
    
    gw = width // 4
    gh = height // 4
    grid_img = Image.new('RGBA', (gw, gh), (0, 0, 0, 0))
    grid_pix = grid_img.load()
    
    for gy in range(gh):
        y = gy * 4 + 2
        for gx in range(gw):
            x = gx * 4 + 2
            soma_k = 0.0
            soma_kv = 0.0
            for tx, ty, ovos in trap_coords:
                dx = (x - tx) * meters_per_px
                dy = (y - ty) * meters_per_px
                d2 = dx * dx + dy * dy
                if d2 < (3.0 * sigma) ** 2:
                    k = math.exp(-d2 * inv2s2)
                    soma_k += k
                    soma_kv += k * ovos
            if soma_k >= 0.005:
                media_ovos = soma_kv / soma_k
                r, g, b = cor_da_intensidade(media_ovos)
                # Alpha between 0 and 130 (0.50) so houses underneath remain clearly visible
                alpha = int(min(1.0, soma_k * 1.3) * 130)
                grid_pix[gx, gy] = (r, g, b, alpha)
                
    heat_smooth = grid_img.resize((width, height), Image.Resampling.BILINEAR)
    
    # 3. Action circles (100m focal & 200m perimeter) ONLY WHERE NECESSARY
    raios_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw_raios = ImageDraw.Draw(raios_overlay)
    
    for t in all_traps:
        tid = str(t.get('id', ''))
        if tid in focal_trap_ids:
            px, py = latlng_to_pixel(t['lat'], t['lng'], zoom, start_x, start_y)
            r200 = get_meter_pixels(t['lat'], 200, zoom)
            r100 = get_meter_pixels(t['lat'], 100, zoom)
            
            # 200m Perimeter - Orange/Amber with border
            draw_raios.ellipse([px - r200, py - r200, px + r200, py + r200],
                               fill=(245, 158, 11, 40), outline=(251, 191, 36, 255), width=3)
            # 100m Focal Core - Red with border
            draw_raios.ellipse([px - r100, py - r100, px + r100, py + r100],
                               fill=(239, 68, 68, 70), outline=(254, 202, 202, 255), width=3)

    final = Image.alpha_composite(sat_img.convert('RGBA'), heat_smooth)
    final = Image.alpha_composite(final, raios_overlay).convert('RGB')
    draw = ImageDraw.Draw(final)
    
    try:
        font_tag = ImageFont.truetype('arialbd.ttf', 13)
        font_legend = ImageFont.truetype('arial.ttf', 11)
    except Exception:
        font_tag = ImageFont.load_default()
        font_legend = ImageFont.load_default()
        
    # 4. Draw pins and labels
    for t in all_traps:
        px, py = latlng_to_pixel(t['lat'], t['lng'], zoom, start_x, start_y)
        if px < -20 or px > width + 20 or py < -20 or py > height + 20:
            continue
        tid = str(t.get('id', ''))
        ovos = t.get('ovos', 0)
        eh_focal = tid in focal_trap_ids
        
        p_cor = (220, 38, 38) if ovos > 100 else (249, 115, 22) if ovos > 50 else (234, 179, 8) if ovos > 20 else (22, 163, 74) if ovos > 0 else (37, 99, 235)
        
        pr = 9 if eh_focal else 6
        draw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=p_cor, outline=(255, 255, 255), width=2)
        draw.ellipse([px - 2, py - 2, px + 2, py + 2], fill=(255, 255, 255))
        
        tag = f"OV-{tid} • {ovos} ovos" if ovos > 0 else f"OV-{tid} (0)"
        bbox = draw.textbbox((px + 10, py - 9), tag, font=font_tag)
        bg_cor = (15, 23, 42) if eh_focal else (30, 41, 59)
        draw.rectangle([bbox[0]-4, bbox[1]-2, bbox[2]+4, bbox[3]+2], fill=bg_cor, outline=(255, 255, 255), width=2 if eh_focal else 1)
        draw.text((px + 10, py - 9), tag, fill=(255, 255, 255), font=font_tag)

    # 5. Bottom Legend Bar
    bar_h = 30
    draw.rectangle([0, height - bar_h, width, height], fill=(15, 23, 42))
    
    draw.ellipse([12, height - 21, 24, height - 9], fill=(239, 68, 68), outline=(255, 255, 255), width=1)
    draw.text((29, height - 22), "Raio 100m (Núcleo Focal)", fill=(255, 255, 255), font=font_legend)
    
    draw.ellipse([185, height - 21, 197, height - 9], fill=(245, 158, 11), outline=(255, 255, 255), width=1)
    draw.text((202, height - 22), "Raio 200m (Perímetro MS)", fill=(255, 255, 255), font=font_legend)
    
    if subtitle:
        draw.text((width - 350, height - 22), subtitle, fill=(203, 213, 225), font=font_legend)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final.save(output_path, quality=94)
    print(f"Generated: {output_path} ({width}x{height})")
    return output_path

# ==========================================
# MAP DEFINITIONS FOR EACH DAY
# ==========================================

MAPAS_CONFIG = [
    # SEGUNDA 1: Sede Urbana (Progresso & Centro)
    {
        "output": "output/mapas_satelite/segunda_sede_urbana.png",
        "center_lat": -21.9292,
        "center_lng": -42.6135,
        "zoom": 16,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Carmo Sede: Progresso e Centro (822 ovos)",
        "focal_ids": ['23', '10', '21'],
        "traps": [
            {'id': '23', 'lat': -21.9279386, 'lng': -42.6166018, 'ovos': 342},
            {'id': '10', 'lat': -21.9327654, 'lng': -42.6111087, 'ovos': 242},
            {'id': '21', 'lat': -21.9262243, 'lng': -42.6149979, 'ovos': 100},
            {'id': '12', 'lat': -21.9335936, 'lng': -42.6077504, 'ovos': 84},
            {'id': '11', 'lat': -21.9356087, 'lng': -42.6099511, 'ovos': 24},
            {'id': '09', 'lat': -21.9266590, 'lng': -42.6030908, 'ovos': 15},
            {'id': '25', 'lat': -21.9208514, 'lng': -42.6162075, 'ovos': 15},
            {'id': '06', 'lat': -21.9316639, 'lng': -42.6066289, 'ovos': 0},
            {'id': '18', 'lat': -21.9333346, 'lng': -42.6129939, 'ovos': 0},
            {'id': '19', 'lat': -21.9317481, 'lng': -42.6133478, 'ovos': 0},
            {'id': '20', 'lat': -21.9284918, 'lng': -42.6141385, 'ovos': 0},
            {'id': '24', 'lat': -21.9259442, 'lng': -42.6160519, 'ovos': 0}
        ]
    },
    # SEGUNDA 2: Barra de São Francisco (5º Distrito)
    {
        "output": "output/mapas_satelite/segunda_barra_sao_francisco.png",
        "center_lat": -21.9690,
        "center_lng": -42.6905,
        "zoom": 16,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Barra de São Francisco - 5º Dist. (199 ovos)",
        "focal_ids": ['55', '54'],
        "traps": [
            {'id': '55', 'lat': -21.9716954, 'lng': -42.6928679, 'ovos': 125},
            {'id': '54', 'lat': -21.9660768, 'lng': -42.6886252, 'ovos': 74},
            {'id': '56', 'lat': -21.9680000, 'lng': -42.6900000, 'ovos': 0}
        ]
    },
    # TERÇA 1: Val Paraíso e Morro do Estado
    {
        "output": "output/mapas_satelite/terca_val_paraiso_morro.png",
        "center_lat": -21.9420,
        "center_lng": -42.6115,
        "zoom": 16,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Val Paraíso e Morro do Estado (423 ovos)",
        "focal_ids": ['31', '28'],
        "traps": [
            {'id': '31', 'lat': -21.9427123, 'lng': -42.6125015, 'ovos': 192},
            {'id': '28', 'lat': -21.9423531, 'lng': -42.6088396, 'ovos': 95},
            {'id': '34', 'lat': -21.9393970, 'lng': -42.6099252, 'ovos': 66},
            {'id': '33', 'lat': -21.9399107, 'lng': -42.6120440, 'ovos': 22},
            {'id': '32', 'lat': -21.9413746, 'lng': -42.6143837, 'ovos': 22},
            {'id': '30', 'lat': -21.9434643, 'lng': -42.6100608, 'ovos': 21},
            {'id': '26', 'lat': -21.9430366, 'lng': -42.6068555, 'ovos': 5},
            {'id': '29', 'lat': -21.9421201, 'lng': -42.6117471, 'ovos': 0}
        ]
    },
    # TERÇA 2: Jd. Centenário e Caixa d'Água
    {
        "output": "output/mapas_satelite/terca_centenario_caixa.png",
        "center_lat": -21.9325,
        "center_lng": -42.6065,
        "zoom": 16,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Jd. Centenário e Caixa d'Água (496 ovos)",
        "focal_ids": ['05', '35'],
        "traps": [
            {'id': '05', 'lat': -21.9283241, 'lng': -42.6057119, 'ovos': 173},
            {'id': '35', 'lat': -21.9350995, 'lng': -42.6062633, 'ovos': 121},
            {'id': '16', 'lat': -21.9372323, 'lng': -42.6056147, 'ovos': 89},
            {'id': '13', 'lat': -21.9334224, 'lng': -42.6043283, 'ovos': 71},
            {'id': '03', 'lat': -21.9255506, 'lng': -42.6095299, 'ovos': 53},
            {'id': '04', 'lat': -21.9295794, 'lng': -42.6090547, 'ovos': 53},
            {'id': '02', 'lat': -21.9241407, 'lng': -42.6118217, 'ovos': 19},
            {'id': '27', 'lat': -21.9396656, 'lng': -42.6064638, 'ovos': 6},
            {'id': '01', 'lat': -21.9276071, 'lng': -42.6113520, 'ovos': 0},
            {'id': '22', 'lat': -21.9390857, 'lng': -42.6078191, 'ovos': 0}
        ]
    },
    # QUARTA 1: Influência (2º Distrito)
    {
        "output": "output/mapas_satelite/quarta_influencia.png",
        "center_lat": -21.8745,
        "center_lng": -42.6635,
        "zoom": 16,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Influência - 2º Dist. (557 ovos acumulados)",
        "focal_ids": ['36', '38', '51'],
        "traps": [
            {'id': '36', 'lat': -21.8758627, 'lng': -42.6660048, 'ovos': 222},
            {'id': '38', 'lat': -21.8770524, 'lng': -42.6694291, 'ovos': 210},
            {'id': '51', 'lat': -21.8733495, 'lng': -42.6616928, 'ovos': 109},
            {'id': '50', 'lat': -21.8719351, 'lng': -42.6536530, 'ovos': 14},
            {'id': '37', 'lat': -21.8737037, 'lng': -42.6597379, 'ovos': 2},
            {'id': '52', 'lat': -21.8718113, 'lng': -42.6565278, 'ovos': 0}
        ]
    },
    # QUARTA 2: Usina Light / Ilha dos Pombos (3º Distrito)
    {
        "output": "output/mapas_satelite/quarta_usina_light.png",
        "center_lat": -21.8402,
        "center_lng": -42.5772,
        "zoom": 16,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Ilha dos Pombos / Light - 3º Dist. (320 ovos)",
        "focal_ids": ['41'],
        "traps": [
            {'id': '41', 'lat': -21.8406223, 'lng': -42.5806883, 'ovos': 203},
            {'id': '40', 'lat': -21.8415155, 'lng': -42.5769629, 'ovos': 66},
            {'id': '39', 'lat': -21.8410296, 'lng': -42.5739418, 'ovos': 30},
            {'id': '53', 'lat': -21.8380783, 'lng': -42.5780696, 'ovos': 21}
        ]
    },
    # QUINTA 1: Porto Velho do Cunha (3º Distrito)
    {
        "output": "output/mapas_satelite/quinta_porto_velho.png",
        "center_lat": -21.8256,
        "center_lng": -42.5495,
        "zoom": 16,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Porto Velho do Cunha - 3º Dist. (343 ovos)",
        "focal_ids": ['45', '44'],
        "traps": [
            {'id': '45', 'lat': -21.8238244, 'lng': -42.5454317, 'ovos': 241},
            {'id': '44', 'lat': -21.8248591, 'lng': -42.5481501, 'ovos': 102},
            {'id': '46', 'lat': -21.8259642, 'lng': -42.5487917, 'ovos': 0},
            {'id': '43', 'lat': -21.8257148, 'lng': -42.5513794, 'ovos': 0},
            {'id': '42', 'lat': -21.8273150, 'lng': -42.5546281, 'ovos': 0}
        ]
    },
    # QUINTA 2: Córrego da Prata (4º Distrito)
    {
        "output": "output/mapas_satelite/quinta_corrego_prata.png",
        "center_lat": -21.8645,
        "center_lng": -42.4865,
        "zoom": 16,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Córrego da Prata - 4º Dist. (181 ovos)",
        "focal_ids": ['48', '49'],
        "traps": [
            {'id': '48', 'lat': -21.8645750, 'lng': -42.4863877, 'ovos': 121},
            {'id': '49', 'lat': -21.8632567, 'lng': -42.4828514, 'ovos': 60},
            {'id': '47', 'lat': -21.8656497, 'lng': -42.4917339, 'ovos': 0}
        ]
    },
    # SEXTA 1: Síntese Territorial Sede & Barra (Varredura de Pendências)
    {
        "output": "output/mapas_satelite/sexta_varredura_sede.png",
        "center_lat": -21.9330,
        "center_lng": -42.6100,
        "zoom": 15,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Varredura de Pendências: Sede Urbana",
        "focal_ids": ['23', '10', '05', '31'],
        "traps": [
            {'id': '23', 'lat': -21.9279386, 'lng': -42.6166018, 'ovos': 342},
            {'id': '10', 'lat': -21.9327654, 'lng': -42.6111087, 'ovos': 242},
            {'id': '31', 'lat': -21.9427123, 'lng': -42.6125015, 'ovos': 192},
            {'id': '05', 'lat': -21.9283241, 'lng': -42.6057119, 'ovos': 173},
            {'id': '35', 'lat': -21.9350995, 'lng': -42.6062633, 'ovos': 121},
            {'id': '21', 'lat': -21.9262243, 'lng': -42.6149979, 'ovos': 100}
        ]
    },
    # SEXTA 2: Síntese Territorial Distritos (Influência, Light, Porto Velho, Prata)
    {
        "output": "output/mapas_satelite/sexta_varredura_distritos.png",
        "center_lat": -21.8402,
        "center_lng": -42.5772,
        "zoom": 16,
        "tiles_x": 4,
        "tiles_y": 3,
        "subtitle": "Varredura Distrital e Resgate de Imóveis Fechados",
        "focal_ids": ['41'],
        "traps": [
            {'id': '41', 'lat': -21.8406223, 'lng': -42.5806883, 'ovos': 203},
            {'id': '40', 'lat': -21.8415155, 'lng': -42.5769629, 'ovos': 66},
            {'id': '39', 'lat': -21.8410296, 'lng': -42.5739418, 'ovos': 30},
            {'id': '53', 'lat': -21.8380783, 'lng': -42.5780696, 'ovos': 21}
        ]
    }
]

if __name__ == '__main__':
    for cfg in MAPAS_CONFIG:
        print(f"Gerando {cfg['output']}...")
        render_heatmap_satellite(
            center_lat=cfg['center_lat'],
            center_lng=cfg['center_lng'],
            zoom=cfg['zoom'],
            tiles_x=cfg['tiles_x'],
            tiles_y=cfg['tiles_y'],
            all_traps=cfg['traps'],
            focal_trap_ids=cfg['focal_ids'],
            subtitle=cfg['subtitle'],
            output_path=cfg['output']
        )
    print("\nTodos os 10 mapas de satélite com calor foram gerados com sucesso!")
