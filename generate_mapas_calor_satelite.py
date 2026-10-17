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

def generate_heatmap_satelite(center_lat, center_lng, zoom, tiles_x, tiles_y, all_traps, focal_trap_ids, subtitle, output_path):
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

    # 2. Gaussian KDE heatmap overlay
    sigma = 110 # meters
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
                # Translucent alpha (max 135 out of 255) so houses and rooftops are clearly seen
                alpha = int(min(1.0, soma_k * 1.3) * 135)
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
        font_badge = ImageFont.truetype('arialbd.ttf', 12)
    except Exception:
        font_tag = ImageFont.load_default()
        font_legend = ImageFont.load_default()
        font_badge = ImageFont.load_default()
        
    # 4. Draw pins and labels
    for t in all_traps:
        px, py = latlng_to_pixel(t['lat'], t['lng'], zoom, start_x, start_y)
        # Check if point is inside viewport
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

    # 5. Bottom Legend Bar (NO top bar blocking view)
    bar_h = 30
    draw.rectangle([0, height - bar_h, width, height], fill=(15, 23, 42))
    
    # Legend items
    draw.ellipse([12, height - 21, 24, height - 9], fill=(239, 68, 68), outline=(255, 255, 255), width=1)
    draw.text((29, height - 22), "Raio 100m (Núcleo Focal)", fill=(255, 255, 255), font=font_legend)
    
    draw.ellipse([185, height - 21, 197, height - 9], fill=(245, 158, 11), outline=(255, 255, 255), width=1)
    draw.text((202, height - 22), "Raio 200m (Perímetro MS)", fill=(255, 255, 255), font=font_legend)
    
    if subtitle:
        draw.text((width - 340, height - 22), subtitle, fill=(203, 213, 225), font=font_legend)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    final.save(output_path, quality=94)
    print(f"Generated: {output_path} ({width}x{height})")
    return output_path

if __name__ == '__main__':
    # Test generation of Usina Light / Ilha dos Pombos matching screenshot
    traps_light = [
        {'id': '41', 'lat': -21.8406223, 'lng': -42.5806883, 'ovos': 203},
        {'id': '40', 'lat': -21.8415155, 'lng': -42.5769629, 'ovos': 66},
        {'id': '39', 'lat': -21.8410296, 'lng': -42.5739418, 'ovos': 30},
        {'id': '53', 'lat': -21.8380783, 'lng': -42.5780696, 'ovos': 21}
    ]
    generate_heatmap_satelite(
        center_lat=-21.8402, center_lng=-42.5772, zoom=16, tiles_x=4, tiles_y=2,
        all_traps=traps_light, focal_trap_ids=['41'],
        subtitle="Ilha dos Pombos / Light (320 ovos)",
        output_path="output/mapas_satelite/test_ilha_pombos_sat.png"
    )
