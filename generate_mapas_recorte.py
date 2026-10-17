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

def generate_recorte_mapa(center_lat, center_lng, zoom, tiles_x, tiles_y, traps, title, output_path):
    cx, cy = deg2num(center_lat, center_lng, zoom)
    start_x = cx - tiles_x // 2
    start_y = cy - tiles_y // 2
    
    width = tiles_x * 256
    height = tiles_y * 256
    stitched = Image.new('RGB', (width, height), (245, 245, 245))
    
    headers = {'User-Agent': 'CarmoVectorControl/1.0 (pm.carmo.rj.gov.br)'}
    
    for i in range(tiles_x):
        for j in range(tiles_y):
            tx = start_x + i
            ty = start_y + j
            url = f"https://tile.openstreetmap.org/{zoom}/{tx}/{ty}.png"
            try:
                resp = requests.get(url, headers=headers, timeout=6)
                if resp.status_code == 200:
                    tile_img = Image.open(io.BytesIO(resp.content)).convert('RGB')
                    stitched.paste(tile_img, (i * 256, j * 256))
            except Exception:
                pass
                
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)
    
    for t in traps:
        lat = t['lat']
        lng = t['lng']
        px, py = latlng_to_pixel(lat, lng, zoom, start_x, start_y)
        r200 = get_meter_pixels(lat, 200, zoom)
        r100 = get_meter_pixels(lat, 100, zoom)
        
        # 200m Perímetro (Laranja/Amarelo translúcido)
        draw_overlay.ellipse([px - r200, py - r200, px + r200, py + r200],
                             fill=(245, 158, 11, 45), outline=(217, 119, 6, 210), width=2)
        # 100m Núcleo Focal (Vermelho translúcido)
        draw_overlay.ellipse([px - r100, py - r100, px + r100, py + r100],
                             fill=(239, 68, 68, 75), outline=(185, 28, 28, 240), width=3)
                             
    stitched = Image.alpha_composite(stitched.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(stitched)
    
    # Marcadores e etiquetas
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
        
        # Etiqueta
        tag = f"{label}: {ovos} ovos" if ovos else label
        bbox = draw.textbbox((px + 12, py - 7), tag)
        draw.rectangle([bbox[0]-4, bbox[1]-2, bbox[2]+4, bbox[3]+2], fill=(15, 23, 42), outline=(255, 255, 255), width=1)
        draw.text((px + 12, py - 7), tag, fill=(255, 255, 255))

    # Barra de Título Superior
    bar_top = 26
    draw.rectangle([0, 0, width, bar_top], fill=(15, 23, 42))
    draw.text((15, 6), f"RECORTE OFICIAL DE OPERAÇÃO – {title.upper()}", fill=(255, 255, 255))
    
    # Barra de Legenda Inferior
    bar_bot = 26
    draw.rectangle([0, height - bar_bot, width, height], fill=(15, 23, 42))
    draw.ellipse([15, height - 19, 27, height - 7], fill=(239, 68, 68), outline=(255, 255, 255))
    draw.text((32, height - 19), "Raio 100m: Núcleo Focal Prioritário (Eliminação 100%)", fill=(255, 255, 255))
    
    draw.ellipse([340, height - 19, 352, height - 7], fill=(245, 158, 11), outline=(255, 255, 255))
    draw.text((358, height - 19), "Raio 200m: Perímetro de Bloqueio Perifocal (MS/SES-RJ)", fill=(255, 255, 255))
    
    draw.text((width - 200, height - 19), "Datum SIRGAS 2000 / WGS 84", fill=(148, 163, 184))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    stitched.save(output_path, quality=92)
    print(f"Salvo: {output_path} ({width}x{height})")
    return output_path

if __name__ == '__main__':
    # 1. SEGUNDA
    generate_recorte_mapa(
        center_lat=-21.9305, center_lng=-42.6125, zoom=15, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-23 Pousada Valle do Sol', 'ovos': 342, 'lat': -21.9279386, 'lng': -42.6166018},
            {'label': 'OV-21 R. Silvio G. França', 'ovos': 100, 'lat': -21.9268800, 'lng': -42.6145000},
            {'label': 'OV-10 R. Oscar Curty', 'ovos': 242, 'lat': -21.9333550, 'lng': -42.6083330}
        ],
        title="Segunda-Feira: Progresso e Centro",
        output_path="output/mapas_planos/mapa_segunda.png"
    )
    # 2. TERÇA
    generate_recorte_mapa(
        center_lat=-21.9365, center_lng=-42.6105, zoom=15, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-05 Ernesto Wermelinger', 'ovos': 173, 'lat': -21.9333900, 'lng': -42.6087000},
            {'label': 'OV-31 Roberto Simões', 'ovos': 192, 'lat': -21.9399107, 'lng': -42.6120440},
            {'label': 'OV-35 Senador Dantas', 'ovos': 121, 'lat': -21.9350995, 'lng': -42.6062633}
        ],
        title="Terça-Feira: Jd. Centenário, Val Paraíso e Caixa d'Água",
        output_path="output/mapas_planos/mapa_terca.png"
    )
    # 3. QUARTA
    generate_recorte_mapa(
        center_lat=-21.8745, center_lng=-42.6630, zoom=15, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-36 R. Manoel Cirilo', 'ovos': 222, 'lat': -21.8758627, 'lng': -42.6660048},
            {'label': 'OV-38 BR-116', 'ovos': 210, 'lat': -21.8770524, 'lng': -42.6694291},
            {'label': 'OV-51 Machareth', 'ovos': 109, 'lat': -21.8733495, 'lng': -42.6616928},
            {'label': 'OV-37 Hermogênio', 'ovos': 2, 'lat': -21.8737037, 'lng': -42.6597379}
        ],
        title="Quarta-Feira: Grande Mutirão de Influência (2º Distrito)",
        output_path="output/mapas_planos/mapa_quarta.png"
    )
    # 4. QUINTA
    generate_recorte_mapa(
        center_lat=-21.8335, center_lng=-42.5650, zoom=14, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-45 Major Fajardo', 'ovos': 241, 'lat': -21.8257148, 'lng': -42.5513794},
            {'label': 'OV-44 ESF Porto Velho', 'ovos': 102, 'lat': -21.8273150, 'lng': -42.5546281},
            {'label': 'OV-41 Beira Rio', 'ovos': 203, 'lat': -21.8406223, 'lng': -42.5806883},
            {'label': 'OV-53 Colégio Light', 'ovos': 0, 'lat': -21.8380783, 'lng': -42.5780696}
        ],
        title="Quinta-Feira: Porto Velho e Ilha dos Pombos / Usina Light",
        output_path="output/mapas_planos/mapa_quinta.png"
    )
    # 5. SEXTA
    generate_recorte_mapa(
        center_lat=-21.9680, center_lng=-42.6900, zoom=15, tiles_x=4, tiles_y=2,
        traps=[
            {'label': 'OV-55 Antônio Serafim', 'ovos': 48, 'lat': -21.9716954, 'lng': -42.6928679},
            {'label': 'OV-54 Sebastião Ferreira', 'ovos': 32, 'lat': -21.9660768, 'lng': -42.6886252},
            {'label': 'OV-56 Escola da Barra', 'ovos': 15, 'lat': -21.9675433, 'lng': -42.6898283}
        ],
        title="Sexta-Feira: Barra de São Francisco e Córrego da Prata",
        output_path="output/mapas_planos/mapa_sexta.png"
    )
