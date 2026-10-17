import os
import math
import io
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

def get_fonts():
    try:
        font_title = ImageFont.truetype('arial.ttf', 15)
        font_tag = ImageFont.truetype('arialbd.ttf', 13)
        font_legend = ImageFont.truetype('arial.ttf', 12)
    except Exception:
        font_title = ImageFont.load_default()
        font_tag = ImageFont.load_default()
        font_legend = ImageFont.load_default()
    return font_title, font_tag, font_legend

def generate_recorte_satelite(center_lat, center_lng, zoom, tiles_x, tiles_y, traps, title, output_path):
    cx, cy = deg2num(center_lat, center_lng, zoom)
    start_x = cx - tiles_x // 2
    start_y = cy - tiles_y // 2
    
    width = tiles_x * 256
    height = tiles_y * 256
    stitched = Image.new('RGB', (width, height), (30, 30, 30))
    labels_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    
    # 1. Download satellite tiles + labels
    for i in range(tiles_x):
        for j in range(tiles_y):
            tx = start_x + i
            ty = start_y + j
            sat_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{ty}/{tx}"
            lbl_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{zoom}/{ty}/{tx}"
            try:
                r_sat = requests.get(sat_url, headers=headers, timeout=6)
                if r_sat.status_code == 200:
                    tile_img = Image.open(io.BytesIO(r_sat.content)).convert('RGB')
                    stitched.paste(tile_img, (i * 256, j * 256))
            except Exception:
                pass
                
            try:
                r_lbl = requests.get(lbl_url, headers=headers, timeout=4)
                if r_lbl.status_code == 200:
                    lbl_tile = Image.open(io.BytesIO(r_lbl.content)).convert('RGBA')
                    labels_layer.paste(lbl_tile, (i * 256, j * 256))
            except Exception:
                pass

    # 2. Vector buffer overlay
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)
    
    for t in traps:
        lat = t['lat']
        lng = t['lng']
        px, py = latlng_to_pixel(lat, lng, zoom, start_x, start_y)
        r200 = get_meter_pixels(lat, 200, zoom)
        r100 = get_meter_pixels(lat, 100, zoom)
        
        # 200m Perímetro Ampliado MS (Laranja com borda nítida)
        draw_overlay.ellipse([px - r200, py - r200, px + r200, py + r200],
                             fill=(245, 158, 11, 45), outline=(251, 191, 36, 255), width=3)
        # 100m Núcleo Focal Prioritário (Vermelho com borda nítida)
        draw_overlay.ellipse([px - r100, py - r100, px + r100, py + r100],
                             fill=(239, 68, 68, 75), outline=(254, 202, 202, 255), width=3)
                             
    stitched_rgba = Image.alpha_composite(stitched.convert('RGBA'), overlay)
    stitched_rgba = Image.alpha_composite(stitched_rgba, labels_layer)
    final = stitched_rgba.convert('RGB')
    draw = ImageDraw.Draw(final)
    font_title, font_tag, font_legend = get_fonts()
    
    # 3. Draw pins & text tags
    for t in traps:
        lat = t['lat']
        lng = t['lng']
        label = t.get('label', '')
        ovos = t.get('ovos', '')
        px, py = latlng_to_pixel(lat, lng, zoom, start_x, start_y)
        
        # Pin
        pr = 9
        draw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=(220, 38, 38), outline=(255, 255, 255), width=2)
        draw.ellipse([px - 3, py - 3, px + 3, py + 3], fill=(255, 255, 255))
        
        # Text Tag
        tag = f"{label} • {ovos} ovos" if ovos else label
        bbox = draw.textbbox((px + 14, py - 10), tag, font=font_tag)
        draw.rectangle([bbox[0]-6, bbox[1]-4, bbox[2]+6, bbox[3]+4], fill=(15, 23, 42), outline=(255, 255, 255), width=2)
        draw.text((px + 14, py - 10), tag, fill=(255, 255, 255), font=font_tag)

    # 4. Top Banner
    bar_top = 30
    draw.rectangle([0, 0, width, bar_top], fill=(15, 23, 42))
    draw.text((15, 6), f"RECORTE SATÉLITE OFICIAL – {title.upper()}", fill=(255, 255, 255), font=font_title)
    
    # 5. Bottom Legend Banner
    bar_bot = 30
    draw.rectangle([0, height - bar_bot, width, height], fill=(15, 23, 42))
    
    draw.ellipse([15, height - 21, 27, height - 9], fill=(239, 68, 68), outline=(255, 255, 255), width=1)
    draw.text((34, height - 21), "Raio 100m: Núcleo Focal Prioritário (Eliminação 100%)", fill=(255, 255, 255), font=font_legend)
    
    draw.ellipse([370, height - 21, 382, height - 9], fill=(245, 158, 11), outline=(255, 255, 255), width=1)
    draw.text((389, height - 21), "Raio 200m: Perímetro de Bloqueio Perifocal (MS/SES-RJ)", fill=(255, 255, 255), font=font_legend)
    
    draw.text((width - 240, height - 21), "Satélite ArcGIS / SIRGAS 2000", fill=(148, 163, 184), font=font_legend)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final.save(output_path, quality=92)
    print(f"Salvo: {output_path} ({width}x{height})")
    return output_path

def gerar_todos_os_mapas():
    # 1. SEGUNDA
    generate_recorte_satelite(
        center_lat=-21.9305, center_lng=-42.6125, zoom=15, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-23 Pousada Valle do Sol', 'ovos': 342, 'lat': -21.9279386, 'lng': -42.6166018},
            {'label': 'OV-21 R. Silvio G. França', 'ovos': 100, 'lat': -21.9268800, 'lng': -42.6145000},
            {'label': 'OV-10 R. Oscar Curty', 'ovos': 242, 'lat': -21.9333550, 'lng': -42.6083330}
        ],
        title="Segunda-Feira: Progresso e Centro",
        output_path="output/mapas_satelite/mapa_segunda.png"
    )
    # 2. TERÇA
    generate_recorte_satelite(
        center_lat=-21.9365, center_lng=-42.6105, zoom=15, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-05 Ernesto Wermelinger', 'ovos': 173, 'lat': -21.9333900, 'lng': -42.6087000},
            {'label': 'OV-31 Roberto Simões', 'ovos': 192, 'lat': -21.9399107, 'lng': -42.6120440},
            {'label': 'OV-35 Senador Dantas', 'ovos': 121, 'lat': -21.9350995, 'lng': -42.6062633}
        ],
        title="Terça-Feira: Jd. Centenário, Val Paraíso e Caixa d'Água",
        output_path="output/mapas_satelite/mapa_terca.png"
    )
    # 3. QUARTA (Influência - 2º Distrito)
    generate_recorte_satelite(
        center_lat=-21.8745, center_lng=-42.6630, zoom=15, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-36 R. Manoel Cirilo', 'ovos': 222, 'lat': -21.8758627, 'lng': -42.6660048},
            {'label': 'OV-38 BR-116', 'ovos': 210, 'lat': -21.8770524, 'lng': -42.6694291},
            {'label': 'OV-51 Machareth', 'ovos': 109, 'lat': -21.8733495, 'lng': -42.6616928},
            {'label': 'OV-37 Hermogênio', 'ovos': 2, 'lat': -21.8737037, 'lng': -42.6597379}
        ],
        title="Quarta-Feira: Grande Mutirão de Influência (2º Distrito)",
        output_path="output/mapas_satelite/mapa_quarta.png"
    )
    # 4. QUINTA (Porto Velho e Usina Light)
    generate_recorte_satelite(
        center_lat=-21.8335, center_lng=-42.5650, zoom=14, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-45 Major Fajardo', 'ovos': 241, 'lat': -21.8257148, 'lng': -42.5513794},
            {'label': 'OV-44 ESF Porto Velho', 'ovos': 102, 'lat': -21.8273150, 'lng': -42.5546281},
            {'label': 'OV-41 Beira Rio', 'ovos': 203, 'lat': -21.8406223, 'lng': -42.5806883},
            {'label': 'OV-53 Colégio Light', 'ovos': 0, 'lat': -21.8380783, 'lng': -42.5780696}
        ],
        title="Quinta-Feira: Porto Velho e Ilha dos Pombos / Usina Light",
        output_path="output/mapas_satelite/mapa_quinta.png"
    )
    # 5. SEXTA (Barra de São Francisco e Córrego da Prata)
    generate_recorte_satelite(
        center_lat=-21.9680, center_lng=-42.6900, zoom=15, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-55 Antônio Serafim', 'ovos': 48, 'lat': -21.9716954, 'lng': -42.6928679},
            {'label': 'OV-54 Sebastião Ferreira', 'ovos': 32, 'lat': -21.9660768, 'lng': -42.6886252},
            {'label': 'OV-56 Escola da Barra', 'ovos': 15, 'lat': -21.9675433, 'lng': -42.6898283}
        ],
        title="Sexta-Feira: Barra de São Francisco e Córrego da Prata",
        output_path="output/mapas_satelite/mapa_sexta.png"
    )

if __name__ == '__main__':
    gerar_todos_os_mapas()
