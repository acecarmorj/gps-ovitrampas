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

PARADAS_COR = [
    (0, (37, 99, 235)),    # Azul (0 ovos)
    (1, (22, 163, 74)),    # Verde (1-20)
    (20, (22, 163, 74)),
    (21, (234, 179, 8)),   # Amarelo (21-50)
    (50, (234, 179, 8)),
    (51, (249, 115, 22)),  # Laranja (51-100)
    (100, (249, 115, 22)),
    (101, (220, 38, 38)),  # Vermelho (>100)
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

def generate_heatmap_satelite(center_lat, center_lng, zoom, tiles_x, tiles_y, all_traps, focal_trap_ids, title, output_path):
    cx, cy = deg2num(center_lat, center_lng, zoom)
    start_x = cx - tiles_x // 2
    start_y = cy - tiles_y // 2
    
    width = tiles_x * 256
    height = tiles_y * 256
    sat_img = Image.new('RGB', (width, height), (30, 30, 30))
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    # 1. Baixa satélite ArcGIS
    for i in range(tiles_x):
        for j in range(tiles_y):
            tx = start_x + i
            ty = start_y + j
            sat_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{ty}/{tx}"
            try:
                r = requests.get(sat_url, headers=headers, timeout=5)
                if r.status_code == 200:
                    sat_img.paste(Image.open(io.BytesIO(r.content)).convert('RGB'), (i*256, j*256))
            except Exception:
                pass

    # 2. Gera o Nevoeiro de Calor translúcido sobre o satélite (KDE)
    heat_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    heat_pixels = heat_overlay.load()
    
    sigma = 110 # alcance em metros
    inv2s2 = 1.0 / (2.0 * sigma * sigma)
    
    # Pré-converte armadilhas para pixels
    trap_coords = []
    for t in all_traps:
        px, py = latlng_to_pixel(t['lat'], t['lng'], zoom, start_x, start_y)
        trap_coords.append((px, py, t.get('ovos', 0)))
        
    meters_per_px = 156543.03392 * math.cos(math.radians(center_lat)) / (2.0 ** zoom)
    
    # Amostragem em grade reduzida para alta performance (passo 4px) e depois upscale suave
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
                # Alfa translúcido (max 0.55 = 140 de 255) para permitir ver as casas embaixo perfeitamente!
                alpha = int(min(1.0, soma_k * 1.3) * 140)
                grid_pix[gx, gy] = (r, g, b, alpha)
                
    # Redimensiona a grade suavemente com filtro bilinear
    heat_smooth = grid_img.resize((width, height), Image.Resampling.BILINEAR)
    
    # 3. Desenha os Raios de Ação (100m e 200m) SOMENTE ONDE FOR NECESSÁRIO (focal_trap_ids)
    raios_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw_raios = ImageDraw.Draw(raios_overlay)
    
    for t in all_traps:
        tid = str(t.get('id', ''))
        if tid in focal_trap_ids:
            px, py = latlng_to_pixel(t['lat'], t['lng'], zoom, start_x, start_y)
            r200 = get_meter_pixels(t['lat'], 200, zoom)
            r100 = get_meter_pixels(t['lat'], 100, zoom)
            
            # Raio 200m (Perímetro Ampliado MS) - Laranja com borda destacada
            draw_raios.ellipse([px - r200, py - r200, px + r200, py + r200],
                               fill=(245, 158, 11, 35), outline=(251, 191, 36, 255), width=3)
            # Raio 100m (Núcleo Focal) - Vermelho com borda destacada
            draw_raios.ellipse([px - r100, py - r100, px + r100, py + r100],
                               fill=(239, 68, 68, 65), outline=(254, 202, 202, 255), width=3)

    # 4. Composição Final
    final = Image.alpha_composite(sat_img.convert('RGBA'), heat_smooth)
    final = Image.alpha_composite(final, raios_overlay).convert('RGB')
    draw = ImageDraw.Draw(final)
    
    try:
        font_tag = ImageFont.truetype('arialbd.ttf', 13)
        font_legend = ImageFont.truetype('arial.ttf', 12)
    except Exception:
        font_tag = ImageFont.load_default()
        font_legend = ImageFont.load_default()
        
    # 5. Desenha Pinos e Etiquetas das Armadilhas
    for t in all_traps:
        px, py = latlng_to_pixel(t['lat'], t['lng'], zoom, start_x, start_y)
        tid = str(t.get('id', ''))
        ovos = t.get('ovos', 0)
        eh_focal = tid in focal_trap_ids
        
        # Cor do pino baseada na faixa de ovos
        p_cor = (220, 38, 38) if ovos > 100 else (249, 115, 22) if ovos > 50 else (234, 179, 8) if ovos > 20 else (22, 163, 74) if ovos > 0 else (37, 99, 235)
        
        # Ponto central
        pr = 9 if eh_focal else 6
        draw.ellipse([px - pr, py - pr, px + pr, py + pr], fill=p_cor, outline=(255, 255, 255), width=2)
        draw.ellipse([px - 2, py - 2, px + 2, py + 2], fill=(255, 255, 255))
        
        # Etiqueta de identificação
        tag = f"OV-{tid} • {ovos} ovos" if ovos > 0 else f"OV-{tid} (0 ovos)"
        bbox = draw.textbbox((px + 12, py - 9), tag, font=font_tag)
        bg_cor = (15, 23, 42) if eh_focal else (30, 41, 59)
        draw.rectangle([bbox[0]-5, bbox[1]-3, bbox[2]+5, bbox[3]+3], fill=bg_cor, outline=(255, 255, 255), width=2 if eh_focal else 1)
        draw.text((px + 12, py - 9), tag, fill=(255, 255, 255), font=font_tag)

    # 6. Barra de Legenda no Rodapé (SEM título no topo, exatamente como o usuário pediu!)
    bar_bot = 32
    draw.rectangle([0, height - bar_bot, width, height], fill=(15, 23, 42))
    
    draw.ellipse([15, height - 22, 27, height - 10], fill=(239, 68, 68), outline=(255, 255, 255), width=1)
    draw.text((34, height - 22), "Raio 100m: Núcleo Focal", fill=(255, 255, 255), font=font_legend)
    
    draw.ellipse([210, height - 22, 222, height - 10], fill=(245, 158, 11), outline=(255, 255, 255), width=1)
    draw.text((229, height - 22), "Raio 200m: Bloqueio Perifocal MS", fill=(255, 255, 255), font=font_legend)
    
    draw.text((width - 330, height - 22), "Mancha de Calor Oficial (A+B) sobre Satélite", fill=(148, 163, 184), font=font_legend)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final.save(output_path, quality=94)
    print(f"Mapa de Calor com Satélite gerado: {output_path} ({width}x{height})")
    return output_path

if __name__ == '__main__':
    # Teste Porto Velho (como no screenshot do usuário)
    traps_pv = [
        {'id': '45', 'lat': -21.8257148, 'lng': -42.5513794, 'ovos': 241},
        {'id': '44', 'lat': -21.8273150, 'lng': -42.5546281, 'ovos': 102},
        {'id': '43', 'lat': -21.8285, 'lng': -42.5570, 'ovos': 0},
        {'id': '42', 'lat': -21.8300, 'lng': -42.5600, 'ovos': 0},
        {'id': '46', 'lat': -21.8280, 'lng': -42.5555, 'ovos': 0}
    ]
    generate_heatmap_satelite(
        center_lat=-21.8275, center_lng=-42.5555, zoom=15, tiles_x=4, tiles_y=2,
        all_traps=traps_pv, focal_trap_ids=['45', '44'],
        title="Porto Velho do Cunha",
        output_path="scratch/test_heatmap_sat_portovelho.png"
    )
