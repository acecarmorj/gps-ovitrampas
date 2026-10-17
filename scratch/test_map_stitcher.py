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

def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)

def latlng_to_pixel(lat, lng, zoom, origin_xtile, origin_ytile):
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    x = ((lng + 180.0) / 360.0 * n - origin_xtile) * 256
    y = ((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n - origin_ytile) * 256
    return (int(x), int(y))

def get_meter_pixels(lat, meters, zoom):
    # meters per pixel at latitude: 156543.03392 * cos(lat) / (2 ^ zoom)
    meters_per_pixel = 156543.03392 * math.cos(math.radians(lat)) / (2.0 ** zoom)
    return meters / meters_per_pixel

def generate_static_map(center_lat, center_lng, zoom=16, tiles_x=4, tiles_y=3, traps=[]):
    cx, cy = deg2num(center_lat, center_lng, zoom)
    start_x = cx - tiles_x // 2
    start_y = cy - tiles_y // 2
    
    width = tiles_x * 256
    height = tiles_y * 256
    stitched = Image.new('RGB', (width, height), (240, 240, 240))
    
    headers = {'User-Agent': 'GPS-Ovitrampas-Carmo/1.0 (pm.carmo.rj.gov.br)'}
    
    for i in range(tiles_x):
        for j in range(tiles_y):
            tx = start_x + i
            ty = start_y + j
            # Usar CartoDB Voyager ou OpenStreetMap
            url = f"https://a.basemaps.cartocdn.com/rastertiles/voyager/{zoom}/{tx}/{ty}.png"
            try:
                resp = requests.get(url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    tile_img = Image.open(io.BytesIO(resp.content)).convert('RGB')
                    stitched.paste(tile_img, (i * 256, j * 256))
            except Exception as e:
                pass
                
    # Cria overlay para círculos transparentes
    overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw_overlay = ImageDraw.Draw(overlay)
    draw_main = ImageDraw.Draw(stitched)
    
    # Desenha círculos e alvos
    for t in traps:
        lat = t['lat']
        lng = t['lng']
        px, py = latlng_to_pixel(lat, lng, zoom, start_x, start_y)
        
        r200 = get_meter_pixels(lat, 200, zoom)
        r100 = get_meter_pixels(lat, 100, zoom)
        
        # 200m Perímetro (Amarelo/Laranja translúcido)
        draw_overlay.ellipse([px - r200, py - r200, px + r200, py + r200],
                             fill=(245, 158, 11, 45), outline=(217, 119, 6, 180), width=2)
        
        # 100m Núcleo Focal (Vermelho translúcido)
        draw_overlay.ellipse([px - r100, py - r100, px + r100, py + r100],
                             fill=(239, 68, 68, 70), outline=(185, 28, 28, 230), width=2)
                             
    stitched = Image.alpha_composite(stitched.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(stitched)
    
    # Desenha os marcadores e números por cima
    for t in traps:
        lat = t['lat']
        lng = t['lng']
        label = t.get('label', '')
        ovos = t.get('ovos', '')
        px, py = latlng_to_pixel(lat, lng, zoom, start_x, start_y)
        
        # Pin
        pr = 10
        draw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=(220, 38, 38), outline=(255, 255, 255), width=2)
        
        # Tag com texto
        tag_text = f"{label} ({ovos} ovos)" if ovos else label
        bbox = draw.textbbox((px + 14, py - 8), tag_text)
        draw.rectangle([bbox[0]-3, bbox[1]-2, bbox[2]+3, bbox[3]+2], fill=(15, 23, 42, 220), outline=(255, 255, 255), width=1)
        draw.text((px + 14, py - 8), tag_text, fill=(255, 255, 255))

    # Barra de Legenda no topo ou rodapé
    leg_h = 28
    draw.rectangle([0, height - leg_h, width, height], fill=(15, 23, 42))
    draw.ellipse([15, height - 20, 27, height - 8], fill=(239, 68, 68), outline=(255, 255, 255))
    draw.text((32, height - 20), "Raio 100m: Núcleo Focal Prioritário", fill=(255, 255, 255))
    
    draw.ellipse([260, height - 20, 272, height - 8], fill=(245, 158, 11), outline=(255, 255, 255))
    draw.text((278, height - 20), "Raio 200m: Bloqueio Perifocal Oficial MS", fill=(255, 255, 255))
    
    draw.text((width - 230, height - 20), "Datum SIRGAS 2000 / WGS 84", fill=(148, 163, 184))

    return stitched

if __name__ == '__main__':
    # Teste com Progresso / Pousada (OV-23 e OV-10)
    traps = [
        {'label': 'OV-23 Pousada', 'ovos': 342, 'lat': -21.9279386, 'lng': -42.6166018},
        {'label': 'OV-10 Oscar Curty', 'ovos': 242, 'lat': -21.9333550, 'lng': -42.6083330},
        {'label': 'OV-21 Silvio França', 'ovos': 100, 'lat': -21.9268800, 'lng': -42.6145000}
    ]
    img = generate_static_map(-21.930, -42.612, zoom=15, tiles_x=4, tiles_y=3, traps=traps)
    img.save('scratch/test_mapa_segunda.png')
    print("Sucesso! Imagem gerada em scratch/test_mapa_segunda.png:", img.size)
