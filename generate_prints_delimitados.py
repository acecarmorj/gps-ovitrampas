import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SCREENSHOTS_DIR = r"C:\Users\Almir LK\Pictures\Screenshots"
OUT_DIR = r"f:\Desktop\GPS OVITRAMPAS\output\prints_delimitados"
os.makedirs(OUT_DIR, exist_ok=True)


def get_font(size, bold=False):
    candidates = (
        ["C:/Windows/Fonts/segoeuib.ttf", "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/calibrib.ttf"]
        if bold
        else ["C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/calibri.ttf"]
    )
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


FONT_HEADER_TAG = get_font(10, bold=True)
FONT_HEADER_TITLE = get_font(14, bold=True)
FONT_HEADER_SUB = get_font(11, bold=True)
FONT_PILL_BOLD = get_font(12, bold=True)
FONT_PILL_REG = get_font(11, bold=False)
FONT_RING_TAG = get_font(10, bold=True)
FONT_LEGEND = get_font(11, bold=True)

PALETTE_RGB = {
    "RED": (220, 38, 38),
    "ORANGE": (249, 115, 22),
    "YELLOW": (234, 179, 8),
    "GREEN": (22, 163, 74),
    "BLUE": (37, 99, 235),
    "GRAY": (156, 140, 149),
}


def load_clean_crop(filename):
    """
    Loads the screenshot and crops the exact 813x636 satellite map area,
    finding the exact top edge of the map canvas at x=950 (where there are no toolbar buttons).
    Also smoothly inpaints the white +/- zoom button at top-left (x=10..46, y=10..84).
    """
    path = os.path.join(SCREENSHOTS_DIR, filename)
    im = Image.open(path).convert("RGB")
    full = np.array(im)
    # At x=950, there is pure white above the map; first non-white pixel is the exact top edge of the 636px map
    top_y = next(y for y in range(345, 415) if any(full[y, 950] < 240))
    crop_y0 = min(top_y, 1032 - 636)
    crop_x0 = 271
    crop = im.crop((crop_x0, crop_y0, crop_x0 + 813, crop_y0 + 636))

    # Smoothly inpaint the white +/- zoom control (x=10..45, y=10..81) using boundary interpolation + local texture
    arr = np.array(crop, dtype=np.float32)
    y0_b, y1_b = 9, 83
    x0_b, x1_b = 10, 46
    w_b = x1_b - x0_b
    left_col = arr[y0_b:y1_b, x0_b - 2 : x0_b].mean(axis=1, keepdims=True)
    right_col = arr[y0_b:y1_b, x1_b : x1_b + 2].mean(axis=1, keepdims=True)
    t = np.linspace(0.0, 1.0, w_b, dtype=np.float32)[None, :, None]
    base_interp = (1.0 - t) * left_col + t * right_col
    # Add high-frequency satellite texture from adjacent strip (x=47..83)
    tex_strip = arr[y0_b:y1_b, 47 : 47 + w_b]
    tex_Low = np.array(
        Image.fromarray(np.clip(tex_strip, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius=5)),
        dtype=np.float32,
    )
    detail = tex_strip - tex_Low
    arr[y0_b:y1_b, x0_b:x1_b] = base_interp + detail * 0.85
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def snap_to_marker(crop_rgb, approx_cx, approx_cy, color_name=None, search_r=28):
    """
    Finds the exact pixel centroid of a marker near (approx_cx, approx_cy) in crop_rgb
    so that rings and leader lines are always centered to 1-pixel precision.
    """
    arr = np.array(crop_rgb, dtype=np.float32)
    H, W, _ = arr.shape
    x0, x1 = max(0, approx_cx - search_r), min(W, approx_cx + search_r + 1)
    y0, y1 = max(0, approx_cy - search_r), min(H, approx_cy + search_r + 1)
    sub = arr[y0:y1, x0:x1]

    if color_name and color_name in PALETTE_RGB:
        target = np.array(PALETTE_RGB[color_name], dtype=np.float32)
        dmap = np.linalg.norm(sub - target, axis=2)
        ys, xs = np.where(dmap < 8.0)
        if len(xs) >= 10:
            return int(round(x0 + np.mean(xs))), int(round(y0 + np.mean(ys)))

    return approx_cx, approx_cy


def extract_existing_pills_and_markers(crop_rgb, markers_list):
    """
    Creates an RGBA overlay containing ALL original system white pill labels (A • B)
    and all original marker dots (r=8px) so they can be composited back ON TOP of
    the action-radius rings, guaranteeing zero rings ever cross over text labels.
    """
    arr = np.array(crop_rgb)
    H, W, _ = arr.shape
    mask = np.zeros((H, W), dtype=bool)
    yy, xx = np.ogrid[:H, :W]

    for mx, my in markers_list:
        # 1. Keep marker dot itself (r <= 7.5px)
        mask |= (xx - mx) ** 2 + (yy - my) ** 2 <= 7.5**2

        # 2. Find the system white pill below the marker: dx in [-58, +58], dy in [+12, +40]
        x0, x1 = max(0, mx - 58), min(W, mx + 59)
        y0, y1 = max(0, my + 12), min(H, my + 40)
        sub = arr[y0:y1, x0:x1]
        is_white = (sub[:, :, 0] > 215) & (sub[:, :, 1] > 215) & (sub[:, :, 2] > 215)
        if np.any(is_white):
            wys, wxs = np.where(is_white)
            px0 = max(0, x0 + int(wxs.min()) - 1)
            px1 = min(W, x0 + int(wxs.max()) + 2)
            py0 = max(0, y0 + int(wys.min()) - 1)
            py1 = min(H, y0 + int(wys.max()) + 2)
            pill_box = np.zeros((py1 - py0, px1 - px0), dtype=bool)
            for r in range(py1 - py0):
                row_w = np.where(
                    (arr[py0 + r, px0:px1, 0] > 200)
                    & (arr[py0 + r, px0:px1, 1] > 200)
                    & (arr[py0 + r, px0:px1, 2] > 200)
                )[0]
                if len(row_w) >= 2:
                    pill_box[r, row_w[0] : row_w[-1] + 1] = True
            mask[py0:py1, px0:px1] |= pill_box

    rgba = np.zeros((H, W, 4), dtype=np.uint8)
    rgba[:, :, :3] = arr
    rgba[:, :, 3] = np.where(mask, 255, 0)
    return Image.fromarray(rgba, mode="RGBA")


def draw_dashed_circle(draw, cx, cy, r, color, width=3, dash_deg=8, gap_deg=5, halo_color=(0, 0, 0, 180)):
    """Draws a high-contrast dashed circle with an under-halo for visibility on satellite imagery."""
    bbox = [cx - r, cy - r, cx + r, cy + r]
    step = dash_deg + gap_deg
    if halo_color:
        for angle in range(0, 360, step):
            draw.arc(bbox, start=angle, end=angle + dash_deg, fill=halo_color, width=width + 2)
    for angle in range(0, 360, step):
        draw.arc(bbox, start=angle, end=angle + dash_deg, fill=color, width=width)


def draw_mini_tag(draw, cx, cy, text, bg, fg):
    bbox = draw.textbbox((0, 0), text, font=FONT_RING_TAG)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, pad_y = 4, 2
    rx0, ry0 = cx - tw // 2 - pad_x, cy - th // 2 - pad_y
    rx1, ry1 = cx + tw // 2 + pad_x, cy + th // 2 + pad_y
    draw.rounded_rectangle([rx0, ry0, rx1, ry1], radius=4, fill=bg, outline=(255, 255, 255, 210), width=1)
    draw.text((cx - tw // 2, cy - th // 2 - 1), text, font=FONT_RING_TAG, fill=fg)


def draw_action_radius(
    base_rgba,
    cx,
    cy,
    r_inner,
    r_outer,
    severity="RED",
    show_ring_tags=True,
    tag_angle_deg=-90,
    add_calor_glow=False,
):
    """
    Draws the delimited Action Radius (Raio de Ação) around a focus trap:
    - Outer ring (r_outer): 200m Perimeter (dashed Amber/Gold with dark contrast halo)
    - Inner ring (r_inner): 100m Focal Core (high-contrast Red/White ring + cardinal target ticks + subtle core tint)
    - Center target halo around the trap marker (r=11px)
    """
    overlay = Image.new("RGBA", base_rgba.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    if add_calor_glow:
        glow_col = (220, 38, 38, 88) if severity == "RED" else (234, 179, 8, 88)
        draw.ellipse([cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer], fill=glow_col)

    core_fill = (220, 38, 38, 32) if severity == "RED" else (249, 115, 22, 28)
    draw.ellipse([cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner], fill=core_fill)

    # 1. Outer 200m Perimeter Ring (dashed Amber/Orange)
    draw_dashed_circle(
        draw,
        cx,
        cy,
        r_outer,
        color=(251, 191, 36, 255),
        width=3,
        dash_deg=7,
        gap_deg=5,
        halo_color=(15, 23, 42, 200),
    )

    # 2. Inner 100m Focal Ring (solid dark halo + solid crimson ring + white dashed overlay)
    bbox_in = [cx - r_inner, cy - r_inner, cx + r_inner, cy + r_inner]
    draw.ellipse(bbox_in, outline=(15, 23, 42, 220), width=6)
    draw.ellipse(bbox_in, outline=(220, 38, 38, 255), width=4)
    draw_dashed_circle(
        draw,
        cx,
        cy,
        r_inner,
        color=(255, 255, 255, 245),
        width=2,
        dash_deg=6,
        gap_deg=8,
        halo_color=None,
    )

    # Cardinal crosshair ticks on the 100m ring
    for deg in (0, 90, 180, 270):
        rad = math.radians(deg)
        x1 = cx + (r_inner - 6) * math.cos(rad)
        y1 = cy + (r_inner - 6) * math.sin(rad)
        x2 = cx + (r_inner + 6) * math.cos(rad)
        y2 = cy + (r_inner + 6) * math.sin(rad)
        draw.line([(x1, y1), (x2, y2)], fill=(255, 255, 255, 230), width=2)

    # 3. Target ring right around the marker dot (r=11px)
    draw.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], outline=(255, 255, 255, 245), width=2)
    draw.ellipse([cx - 13, cy - 13, cx + 13, cy + 13], outline=(220, 38, 38, 245), width=2)

    # 4. Small distance tags ("100m" on inner ring, "200m" on outer ring)
    if show_ring_tags:
        rad = math.radians(tag_angle_deg)
        tx1 = int(cx + r_inner * math.cos(rad))
        ty1 = int(cy + r_inner * math.sin(rad))
        draw_mini_tag(draw, tx1, ty1, "100m", bg=(185, 28, 28, 245), fg=(255, 255, 255, 255))
        tx2 = int(cx + r_outer * math.cos(rad))
        ty2 = int(cy + r_outer * math.sin(rad))
        if 20 <= tx2 <= 793 and 18 <= ty2 <= 595:
            draw_mini_tag(draw, tx2, ty2, "200m", bg=(180, 83, 9, 245), fg=(254, 243, 199, 255))

    return Image.alpha_composite(base_rgba, overlay)


def draw_pill_label(
    base_rgba,
    mx,
    my,
    px,
    py,
    ov_code,
    main_text,
    sub_text="",
    severity="RED",
    is_focus=True,
):
    """
    Draws a high-clarity pill label centered at (px, py) with a vector target icon
    (no missing emoji glyphs!) and a crisp leader line to (mx, my) if offset.
    """
    overlay = Image.new("RGBA", base_rgba.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    palette = {
        "RED": {"badge": (220, 38, 38, 255), "border": (220, 38, 38, 255), "text": (15, 23, 42, 255)},
        "ORANGE": {"badge": (234, 88, 12, 255), "border": (234, 88, 12, 255), "text": (15, 23, 42, 255)},
        "YELLOW": {"badge": (202, 138, 4, 255), "border": (202, 138, 4, 255), "text": (15, 23, 42, 255)},
        "GREEN": {"badge": (22, 163, 74, 255), "border": (22, 163, 74, 220), "text": (30, 41, 59, 255)},
        "BLUE": {"badge": (37, 99, 235, 255), "border": (37, 99, 235, 220), "text": (30, 41, 59, 255)},
    }
    col = palette.get(severity, palette["RED"])

    b_box = draw.textbbox((0, 0), ov_code, font=FONT_PILL_BOLD)
    bw = b_box[2] - b_box[0]
    icon_extra = 14 if is_focus else 0

    m_box = draw.textbbox((0, 0), main_text, font=FONT_PILL_BOLD)
    mw = m_box[2] - m_box[0]

    sw = 0
    if sub_text:
        s_box = draw.textbbox((0, 0), sub_text, font=FONT_PILL_REG)
        sw = s_box[2] - s_box[0]

    badge_w = bw + icon_extra + 14
    total_w = badge_w + mw + (sw + 6 if sub_text else 0) + 14
    total_h = 24

    x0 = max(6, min(807 - total_w, int(px - total_w // 2)))
    y0 = max(6, min(602 - total_h, int(py - total_h // 2)))
    x1 = x0 + total_w
    y1 = y0 + total_h
    cx_pill = (x0 + x1) // 2
    cy_pill = (y0 + y1) // 2

    # Draw leader line if pill center is > 24px from marker center
    dist = math.hypot(cx_pill - mx, cy_pill - my)
    if dist > 24:
        ux, uy = (cx_pill - mx) / dist, (cy_pill - my) / dist
        lx0, ly0 = mx + ux * 8, my + uy * 8
        draw.line([(lx0, ly0), (cx_pill, cy_pill)], fill=(15, 23, 42, 215), width=4)
        draw.line([(lx0, ly0), (cx_pill, cy_pill)], fill=(255, 255, 255, 245), width=2)

    # Drop shadow
    draw.rounded_rectangle([x0 + 2, y0 + 2, x1 + 2, y1 + 2], radius=12, fill=(0, 0, 0, 140))
    # Main white pill background
    draw.rounded_rectangle(
        [x0, y0, x1, y1],
        radius=12,
        fill=(255, 255, 255, 250),
        outline=col["border"],
        width=2 if is_focus else 1,
    )

    # Left colored badge inside pill
    bx1 = x0 + badge_w
    draw.rounded_rectangle([x0 + 2, y0 + 2, bx1, y1 - 2], radius=10, fill=col["badge"])

    text_x = x0 + 8
    if is_focus:
        # Draw crisp vector bullseye target icon inside badge
        icx, icy = x0 + 11, y0 + 12
        draw.ellipse([icx - 5, icy - 5, icx + 5, icy + 5], outline=(255, 255, 255, 255), width=1)
        draw.ellipse([icx - 2, icy - 2, icx + 2, icy + 2], fill=(255, 255, 255, 255))
        text_x += 12

    draw.text((text_x, y0 + 4), ov_code, font=FONT_PILL_BOLD, fill=(255, 255, 255, 255))

    # Main text (e.g. "125 ovos")
    tx = bx1 + 6
    draw.text((tx, y0 + 4), main_text, font=FONT_PILL_BOLD, fill=col["text"])
    if sub_text:
        draw.text((tx + mw + 4, y0 + 5), sub_text, font=FONT_PILL_REG, fill=(71, 85, 105, 255))

    return Image.alpha_composite(base_rgba, overlay)


def draw_legend_bar(draw, W, H):
    fy0 = H - 28
    draw.rectangle([0, fy0, W, H], fill=(15, 23, 42, 248))
    draw.line([(0, fy0), (W, fy0)], fill=(51, 65, 85, 255), width=2)

    lx = 14
    cy = fy0 + 14
    # Red focal ring icon
    draw.ellipse([lx, cy - 6, lx + 12, cy + 6], fill=(220, 38, 38, 130), outline=(239, 68, 68, 255), width=2)
    draw.ellipse([lx + 4, cy - 2, lx + 8, cy + 2], fill=(255, 255, 255, 255))
    lx += 18
    t1 = "Círculo Vermelho: Raio Focal 100m (Quarteirão/Vizinhos)"
    draw.text((lx, fy0 + 6), t1, font=FONT_LEGEND, fill=(248, 250, 252, 255))
    lx += draw.textbbox((0, 0), t1, font=FONT_LEGEND)[2] + 18

    draw.text((lx, fy0 + 6), "|", font=FONT_LEGEND, fill=(100, 116, 139, 255))
    lx += 14

    # Amber dashed icon
    draw.ellipse([lx, cy - 6, lx + 12, cy + 6], outline=(251, 191, 36, 255), width=2)
    lx += 18
    t2 = "Tracejado Âmbar: Perímetro 200m"
    draw.text((lx, fy0 + 6), t2, font=FONT_LEGEND, fill=(253, 224, 71, 255))
    lx += draw.textbbox((0, 0), t2, font=FONT_LEGEND)[2] + 18

    draw.text((lx, fy0 + 6), "|", font=FONT_LEGEND, fill=(100, 116, 139, 255))
    lx += 14

    t3 = "Dados: Soma 2 Semanas (A + B)"
    draw.text((lx, fy0 + 6), t3, font=FONT_LEGEND, fill=(148, 163, 184, 255))


def draw_header_and_footer(base_rgba, sector_title, subtitle_text, header_x=8):
    """
    1. Covers the top-left +/- button area (or custom header_x) with a 3-line dark sector badge.
    2. Adds the 28px bottom legend bar (y=608..636) explaining the Action Radius rings.
    """
    overlay = Image.new("RGBA", base_rgba.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    kicker = "VIGILÂNCIA AMBIENTAL • PAINEL DE CALOR OFICIAL (CARMO-RJ)"
    k_box = draw.textbbox((0, 0), kicker, font=FONT_HEADER_TAG)
    t_box = draw.textbbox((0, 0), sector_title, font=FONT_HEADER_TITLE)
    s_box = draw.textbbox((0, 0), subtitle_text, font=FONT_HEADER_SUB)
    box_w = max(k_box[2] - k_box[0], t_box[2] - t_box[0], s_box[2] - s_box[0]) + 28
    box_h = 66
    x0, y0 = header_x, 8
    x1, y1 = x0 + box_w, y0 + box_h

    draw.rounded_rectangle([x0 + 2, y0 + 2, x1 + 2, y1 + 2], radius=8, fill=(0, 0, 0, 150))
    draw.rounded_rectangle(
        [x0, y0, x1, y1],
        radius=8,
        fill=(15, 23, 42, 242),
        outline=(71, 85, 105, 230),
        width=1,
    )
    draw.rounded_rectangle([x0, y0, x0 + 6, y1], radius=3, fill=(239, 68, 68, 255))
    draw.text((x0 + 14, y0 + 6), kicker, font=FONT_HEADER_TAG, fill=(148, 163, 184, 255))
    draw.text((x0 + 14, y0 + 21), sector_title, font=FONT_HEADER_TITLE, fill=(255, 255, 255, 255))
    draw.text((x0 + 14, y0 + 43), subtitle_text, font=FONT_HEADER_SUB, fill=(253, 224, 71, 255))

    W, H = base_rgba.size
    draw_legend_bar(draw, W, H)

    return Image.alpha_composite(base_rgba, overlay)


def process_urban_map(filename, out_name, sector_title, subtitle_text, all_markers, focus_traps, header_x=8):
    crop = load_clean_crop(filename)
    # Snap focus traps to exact pixel centroids
    for ft in focus_traps:
        dx = ft["px"] - ft["cx"]
        dy = ft["py"] - ft["cy"]
        ft["cx"], ft["cy"] = snap_to_marker(crop, ft["cx"], ft["cy"], ft["sev"])
        ft["px"], ft["py"] = ft["cx"] + dx, ft["cy"] + dy

    pills_overlay = extract_existing_pills_and_markers(crop, all_markers)
    rgba = crop.convert("RGBA")

    for ft in focus_traps:
        rgba = draw_action_radius(
            rgba,
            cx=ft["cx"],
            cy=ft["cy"],
            r_inner=78,
            r_outer=156,
            severity=ft["sev"],
            show_ring_tags=True,
            tag_angle_deg=ft.get("tag_angle", -90),
        )

    # Restore original white pills and marker centers ON TOP of the rings
    rgba = Image.alpha_composite(rgba, pills_overlay)

    # Draw compact callout pill for each focus trap
    for ft in focus_traps:
        rgba = draw_pill_label(
            rgba,
            mx=ft["cx"],
            my=ft["cy"],
            px=ft["px"],
            py=ft["py"],
            ov_code=ft["ov"],
            main_text=ft["main"],
            sub_text=ft.get("sub", ""),
            severity=ft["sev"],
            is_focus=True,
        )

    rgba = draw_header_and_footer(rgba, sector_title, subtitle_text, header_x=header_x)
    out_path = os.path.join(OUT_DIR, out_name)
    rgba.convert("RGB").save(out_path, quality=95)
    print(f"Saved {out_path}")
    return rgba.convert("RGB")


def process_district_map(filename, out_name, sector_title, subtitle_text, traps, add_calor_glow=False):
    crop = load_clean_crop(filename)
    for t in traps:
        dx = t["px"] - t["cx"]
        dy = t["py"] - t["cy"]
        t["cx"], t["cy"] = snap_to_marker(crop, t["cx"], t["cy"], t["sev"])
        t["px"], t["py"] = t["cx"] + dx, t["cy"] + dy

    all_coords = [(t["cx"], t["cy"]) for t in traps]
    dots_overlay = extract_existing_pills_and_markers(crop, all_coords)
    rgba = crop.convert("RGBA")

    for t in traps:
        if t["focus"]:
            rgba = draw_action_radius(
                rgba,
                cx=t["cx"],
                cy=t["cy"],
                r_inner=42,
                r_outer=78,
                severity=t["sev"],
                show_ring_tags=True,
                tag_angle_deg=t.get("tag_angle", -90),
                add_calor_glow=add_calor_glow,
            )

    rgba = Image.alpha_composite(rgba, dots_overlay)

    for t in [tr for tr in traps if not tr["focus"]] + [tr for tr in traps if tr["focus"]]:
        rgba = draw_pill_label(
            rgba,
            mx=t["cx"],
            my=t["cy"],
            px=t["px"],
            py=t["py"],
            ov_code=t["ov"],
            main_text=t["main"],
            sub_text=t.get("sub", ""),
            severity=t["sev"],
            is_focus=t["focus"],
        )

    rgba = draw_header_and_footer(rgba, sector_title, subtitle_text)
    out_path = os.path.join(OUT_DIR, out_name)
    rgba.convert("RGB").save(out_path, quality=95)
    print(f"Saved {out_path}")
    return rgba.convert("RGB")


def build_all():
    # =========================================================================
    # 1. SEGUNDA-FEIRA
    # =========================================================================
    # 1.1 Progresso (210147.png)
    process_urban_map(
        filename="Captura de tela 2026-10-16 210147.png",
        out_name="segunda_1_progresso.png",
        sector_title="SEGUNDA • SETOR 1: PROGRESSO",
        subtitle_text="Focos: OV-23 (342 ovos - 1º Município) • OV-21 (100 ovos)",
        all_markers=[(310, 405), (360, 204), (458, 233), (538, 460), (755, 23), (798, 372)],
        focus_traps=[
            {
                "ov": "OV-23",
                "cx": 310,
                "cy": 405,
                "px": 310,
                "py": 374,
                "main": "342 ovos",
                "sub": "(1º Foco)",
                "sev": "RED",
                "tag_angle": -135,
            },
            {
                "ov": "OV-21",
                "cx": 458,
                "cy": 233,
                "px": 485,
                "py": 202,
                "main": "100 ovos",
                "sub": "(A:100+B:0)",
                "sev": "YELLOW",
                "tag_angle": -45,
            },
        ],
    )

    # 1.2 Centro (210158.png)
    process_urban_map(
        filename="Captura de tela 2026-10-16 210158.png",
        out_name="segunda_2_centro.png",
        sector_title="SEGUNDA • SETOR 2: CENTRO",
        subtitle_text="Focos: OV-10 (242 ovos - 2º Município) • OV-12 (84 ovos)",
        all_markers=[(223, 209), (255, 368), (432, 312), (539, 598), (744, 395)],
        focus_traps=[
            {
                "ov": "OV-10",
                "cx": 432,
                "cy": 312,
                "px": 432,
                "py": 280,
                "main": "242 ovos",
                "sub": "(2º Foco)",
                "sev": "RED",
                "tag_angle": -90,
            },
            {
                "ov": "OV-12",
                "cx": 744,
                "cy": 395,
                "px": 715,
                "py": 364,
                "main": "84 ovos",
                "sub": "(Q-17)",
                "sev": "YELLOW",
                "tag_angle": -135,
            },
        ],
    )

    # 1.3 Barra de São Francisco (210013.png - crop_y0=387)
    process_district_map(
        filename="Captura de tela 2026-10-16 210013.png",
        out_name="segunda_3_barra.png",
        sector_title="SEGUNDA • SETOR 3: BARRA DE SÃO FRANCISCO",
        subtitle_text="100% Positividade (3/3) • Total: 268 ovos (OV-55, OV-54, OV-56)",
        traps=[
            {
                "ov": "OV-55",
                "cx": 327,
                "cy": 490,
                "px": 327,
                "py": 548,
                "main": "125 ovos",
                "sub": "(A:5 + B:120)",
                "sev": "ORANGE",
                "focus": True,
                "tag_angle": -90,
            },
            {
                "ov": "OV-54",
                "cx": 469,
                "cy": 280,
                "px": 345,
                "py": 325,
                "main": "74 ovos",
                "sub": "(A:13 + B:61)",
                "sev": "YELLOW",
                "focus": True,
                "tag_angle": 45,
            },
            {
                "ov": "OV-56",
                "cx": 526,
                "cy": 206,
                "px": 640,
                "py": 162,
                "main": "69 ovos",
                "sub": "(A:3 + B:66)",
                "sev": "YELLOW",
                "focus": True,
                "tag_angle": -135,
            },
        ],
    )

    # =========================================================================
    # 2. TERÇA-FEIRA
    # =========================================================================
    # 2.1 Val Paraíso + Morro do Estado (210240.png) - include gray marker OV-29 at (398, 376) so its pill is preserved!
    process_urban_map(
        filename="Captura de tela 2026-10-16 210240.png",
        out_name="terca_1_val_paraiso.png",
        sector_title="TERÇA • SETOR 1: VAL PARAÍSO / MORRO DO ESTADO",
        subtitle_text="Focos: OV-31 (192 ovos) • OV-28 (95 ovos) • OV-34 (66 ovos)",
        all_markers=[(156, 290), (331, 426), (374, 144), (398, 376), (558, 500), (572, 92), (674, 388)],
        focus_traps=[
            {
                "ov": "OV-31",
                "cx": 331,
                "cy": 426,
                "px": 250,
                "py": 395,
                "main": "192 ovos",
                "sub": "(Val Paraíso)",
                "sev": "ORANGE",
                "tag_angle": -135,
            },
            {
                "ov": "OV-28",
                "cx": 674,
                "cy": 388,
                "px": 674,
                "py": 356,
                "main": "95 ovos",
                "sub": "(Morro Q-04)",
                "sev": "YELLOW",
                "tag_angle": -90,
            },
            {
                "ov": "OV-34",
                "cx": 572,
                "cy": 92,
                "px": 572,
                "py": 60,
                "main": "66 ovos",
                "sub": "(Morro Q-11)",
                "sev": "YELLOW",
                "tag_angle": 180,
            },
        ],
    )

    # 2.2 Jardim Centenário (210214.png)
    process_urban_map(
        filename="Captura de tela 2026-10-16 210214.png",
        out_name="terca_2_centenario.png",
        sector_title="TERÇA • SETOR 2: JARDIM CENTENÁRIO",
        subtitle_text="Focos: OV-05 (173 ovos - +2683% em B) • OV-03 (53) • OV-04 (53)",
        all_markers=[(24, 288), (194, 81), (238, 486), (549, 359), (794, 192)],
        header_x=385,
        focus_traps=[
            {
                "ov": "OV-05",
                "cx": 549,
                "cy": 359,
                "px": 549,
                "py": 327,
                "main": "173 ovos",
                "sub": "(Q-17 Surto)",
                "sev": "ORANGE",
                "tag_angle": -90,
            },
            {
                "ov": "OV-03",
                "cx": 194,
                "cy": 81,
                "px": 194,
                "py": 49,
                "main": "53 ovos",
                "sub": "(Q-09)",
                "sev": "YELLOW",
                "tag_angle": 45,
            },
            {
                "ov": "OV-04",
                "cx": 238,
                "cy": 486,
                "px": 238,
                "py": 454,
                "main": "53 ovos",
                "sub": "(Q-1/1)",
                "sev": "YELLOW",
                "tag_angle": -90,
            },
        ],
    )

    # 2.3 Caixa d'Água (210231.png)
    process_urban_map(
        filename="Captura de tela 2026-10-16 210231.png",
        out_name="terca_3_caixa_dagua.png",
        sector_title="TERÇA • SETOR 3: CAIXA D'ÁGUA",
        subtitle_text="Focos: OV-35 (121 ovos) • OV-16 (89 ovos) • OV-13 (71 ovos)",
        all_markers=[(83, 372), (287, 169), (426, 320), (486, 535), (606, 151), (754, 479)],
        focus_traps=[
            {
                "ov": "OV-35",
                "cx": 426,
                "cy": 320,
                "px": 426,
                "py": 288,
                "main": "121 ovos",
                "sub": "(Q-13 Foco)",
                "sev": "ORANGE",
                "tag_angle": -90,
            },
            {
                "ov": "OV-16",
                "cx": 486,
                "cy": 535,
                "px": 486,
                "py": 503,
                "main": "89 ovos",
                "sub": "(Q-10)",
                "sev": "YELLOW",
                "tag_angle": -135,
            },
            {
                "ov": "OV-13",
                "cx": 606,
                "cy": 151,
                "px": 606,
                "py": 119,
                "main": "71 ovos",
                "sub": "(Q-16)",
                "sev": "YELLOW",
                "tag_angle": -90,
            },
        ],
    )

    # =========================================================================
    # 3. QUARTA-FEIRA
    # =========================================================================
    # 3.1 Influência (205948.png - crop_y0=370)
    im_inf = process_district_map(
        filename="Captura de tela 2026-10-16 205948.png",
        out_name="quarta_1_influencia.png",
        sector_title="QUARTA • SETOR 1: INFLUÊNCIA (PONTE / BR-116)",
        subtitle_text="Focos Críticos: OV-36 (222 ovos) • OV-38 (210 ovos) • OV-51 (109 ovos)",
        traps=[
            {
                "ov": "OV-38",
                "cx": 94,
                "cy": 514,
                "px": 135,
                "py": 565,
                "main": "210 ovos",
                "sub": "(A:25 + B:185)",
                "sev": "RED",
                "focus": True,
                "tag_angle": -90,
            },
            {
                "ov": "OV-36",
                "cx": 254,
                "cy": 454,
                "px": 285,
                "py": 505,
                "main": "222 ovos",
                "sub": "(A:53 + B:169)",
                "sev": "RED",
                "focus": True,
                "tag_angle": -90,
            },
            {
                "ov": "OV-51",
                "cx": 456,
                "cy": 327,
                "px": 435,
                "py": 268,
                "main": "109 ovos",
                "sub": "(A:3 + B:106)",
                "sev": "ORANGE",
                "focus": True,
                "tag_angle": 90,
            },
            {
                "ov": "OV-37",
                "cx": 546,
                "cy": 346,
                "px": 605,
                "py": 382,
                "main": "2 ovos",
                "sub": "(A:2 + B:0)",
                "sev": "GREEN",
                "focus": False,
            },
            {
                "ov": "OV-52",
                "cx": 696,
                "cy": 251,
                "px": 696,
                "py": 284,
                "main": "0 ovos",
                "sub": "(Negativa)",
                "sev": "BLUE",
                "focus": False,
            },
        ],
    )

    # 3.2 Usina Light / Ilha dos Pombos (204915.png - crop_y0=387)
    im_usina = process_district_map(
        filename="Captura de tela 2026-10-16 204915.png",
        out_name="quarta_2_usina_light.png",
        sector_title="QUARTA • SETOR 2: USINA LIGHT / ILHA DOS POMBOS",
        subtitle_text="100% Positividade (4/4) • Focos: OV-41 (203 ovos) • OV-40 (66 ovos)",
        add_calor_glow=True,
        traps=[
            {
                "ov": "OV-41",
                "cx": 304,
                "cy": 369,
                "px": 270,
                "py": 425,
                "main": "203 ovos",
                "sub": "(A:40 + B:163)",
                "sev": "RED",
                "focus": True,
                "tag_angle": -90,
            },
            {
                "ov": "OV-40",
                "cx": 478,
                "cy": 414,
                "px": 478,
                "py": 470,
                "main": "66 ovos",
                "sub": "(A:20 + B:46)",
                "sev": "YELLOW",
                "focus": True,
                "tag_angle": -90,
            },
            {
                "ov": "OV-53",
                "cx": 427,
                "cy": 241,
                "px": 427,
                "py": 208,
                "main": "21 ovos",
                "sub": "(A:0 + B:21)",
                "sev": "GREEN",
                "focus": False,
            },
            {
                "ov": "OV-39",
                "cx": 619,
                "cy": 389,
                "px": 645,
                "py": 422,
                "main": "30 ovos",
                "sub": "(A:0 + B:30)",
                "sev": "GREEN",
                "focus": False,
            },
        ],
    )

    # =========================================================================
    # 4. QUINTA-FEIRA
    # =========================================================================
    # 4.1 Porto Velho do Cunha (210024.png - crop_y0=396)
    im_pv = process_district_map(
        filename="Captura de tela 2026-10-16 210024.png",
        out_name="quinta_1_porto_velho.png",
        sector_title="QUINTA • SETOR 1: PORTO VELHO DO CUNHA",
        subtitle_text="Focos Concentrados: OV-45 (241 ovos - 3º Município) • OV-44 (102 ovos)",
        traps=[
            {
                "ov": "OV-45",
                "cx": 619,
                "cy": 233,
                "px": 650,
                "py": 178,
                "main": "241 ovos",
                "sub": "(A:35 + B:206)",
                "sev": "RED",
                "focus": True,
                "tag_angle": 90,
            },
            {
                "ov": "OV-44",
                "cx": 492,
                "cy": 285,
                "px": 445,
                "py": 230,
                "main": "102 ovos",
                "sub": "(A:2 + B:100)",
                "sev": "ORANGE",
                "focus": True,
                "tag_angle": 180,
            },
            {
                "ov": "OV-43",
                "cx": 463,
                "cy": 341,
                "px": 485,
                "py": 378,
                "main": "0 ovos",
                "sub": "(Negativa)",
                "sev": "BLUE",
                "focus": False,
            },
            {
                "ov": "OV-42",
                "cx": 342,
                "cy": 328,
                "px": 325,
                "py": 362,
                "main": "0 ovos",
                "sub": "(Negativa)",
                "sev": "BLUE",
                "focus": False,
            },
            {
                "ov": "OV-46",
                "cx": 191,
                "cy": 409,
                "px": 191,
                "py": 442,
                "main": "0 ovos",
                "sub": "(Negativa)",
                "sev": "BLUE",
                "focus": False,
            },
        ],
    )

    # 4.2 Córrego da Prata (210038.png - crop_y0=387)
    im_cp = process_district_map(
        filename="Captura de tela 2026-10-16 210038.png",
        out_name="quinta_2_corrego_prata.png",
        sector_title="QUINTA • SETOR 2: CÓRREGO DA PRATA",
        subtitle_text="Focos Ativos: OV-48 (121 ovos - +1529% em B) • OV-49 (62 ovos)",
        traps=[
            {
                "ov": "OV-48",
                "cx": 446,
                "cy": 342,
                "px": 446,
                "py": 400,
                "main": "121 ovos",
                "sub": "(A:7 + B:114)",
                "sev": "ORANGE",
                "focus": True,
                "tag_angle": -90,
            },
            {
                "ov": "OV-49",
                "cx": 612,
                "cy": 276,
                "px": 612,
                "py": 334,
                "main": "62 ovos",
                "sub": "(A:2 + B:60)",
                "sev": "YELLOW",
                "focus": True,
                "tag_angle": -90,
            },
            {
                "ov": "OV-47",
                "cx": 198,
                "cy": 396,
                "px": 198,
                "py": 430,
                "main": "0 ovos",
                "sub": "(Negativa)",
                "sev": "BLUE",
                "focus": False,
            },
        ],
    )

    # =========================================================================
    # 5. SEXTA-FEIRA
    # =========================================================================
    # 5.1 Sede Geral (210329.png)
    crop_sede = load_clean_crop("Captura de tela 2026-10-16 210329.png")
    sede_foci = [
        {
            "ov": "OV-23",
            "cx": 249,
            "cy": 178,
            "px": 115,
            "py": 178,
            "main": "342 ovos",
            "sub": "(Progresso)",
            "sev": "RED",
        },
        {
            "ov": "OV-10",
            "cx": 378,
            "cy": 299,
            "px": 145,
            "py": 299,
            "main": "242 ovos",
            "sub": "(Centro)",
            "sev": "RED",
        },
        {
            "ov": "OV-31",
            "cx": 345,
            "cy": 548,
            "px": 150,
            "py": 548,
            "main": "192 ovos",
            "sub": "(Val Paraíso)",
            "sev": "ORANGE",
        },
        {
            "ov": "OV-05",
            "cx": 504,
            "cy": 186,
            "px": 675,
            "py": 186,
            "main": "173 ovos",
            "sub": "(Centenário)",
            "sev": "ORANGE",
        },
        {
            "ov": "OV-35",
            "cx": 490,
            "cy": 357,
            "px": 685,
            "py": 357,
            "main": "121 ovos",
            "sub": "(Caixa d'Água)",
            "sev": "ORANGE",
        },
    ]
    for f in sede_foci:
        f["cx"], f["cy"] = snap_to_marker(crop_sede, f["cx"], f["cy"], f["sev"])
    dots_sede = extract_existing_pills_and_markers(crop_sede, [(f["cx"], f["cy"]) for f in sede_foci])
    rgba_sede = crop_sede.convert("RGBA")
    for f in sede_foci:
        rgba_sede = draw_action_radius(
            rgba_sede,
            cx=f["cx"],
            cy=f["cy"],
            r_inner=22,
            r_outer=39,
            severity=f["sev"],
            show_ring_tags=False,
        )
    rgba_sede = Image.alpha_composite(rgba_sede, dots_sede)
    for f in sede_foci:
        rgba_sede = draw_pill_label(
            rgba_sede,
            mx=f["cx"],
            my=f["cy"],
            px=f["px"],
            py=f["py"],
            ov_code=f["ov"],
            main_text=f["main"],
            sub_text=f["sub"],
            severity=f["sev"],
            is_focus=True,
        )
    rgba_sede = draw_header_and_footer(
        rgba_sede,
        "SEXTA • PAINEL GERAL: SEDE URBANA (35 ARMADILHAS)",
        "Varredura de Pendências, Recusas e Imóveis Fechados nos 5 Polos Críticos",
    )
    sede_path = os.path.join(OUT_DIR, "sexta_1_sede_geral.png")
    rgba_sede.convert("RGB").save(sede_path, quality=95)
    print(f"Saved {sede_path}")

    # 5.2 Mosaico 2x2 dos Distritos (sexta_2_distritos_mosaico.png - 813x636)
    mosaic = Image.new("RGBA", (813, 636), (15, 23, 42, 255))
    q_w, q_h = 403, 301
    quads = [
        (im_inf.crop((0, 0, 813, 608)), 2, 2),
        (im_usina.crop((0, 0, 813, 608)), 408, 2),
        (im_pv.crop((0, 0, 813, 608)), 2, 305),
        (im_cp.crop((0, 0, 813, 608)), 408, 305),
    ]
    for q_img, qx, qy in quads:
        resized = q_img.resize((q_w, q_h), Image.Resampling.LANCZOS)
        mosaic.paste(resized, (qx, qy))

    m_draw = ImageDraw.Draw(mosaic)
    m_draw.line([(406, 0), (406, 608)], fill=(255, 255, 255, 220), width=2)
    m_draw.line([(0, 303), (813, 303)], fill=(255, 255, 255, 220), width=2)
    draw_legend_bar(m_draw, 813, 636)

    mosaic_path = os.path.join(OUT_DIR, "sexta_2_distritos_mosaico.png")
    mosaic.convert("RGB").save(mosaic_path, quality=95)
    print(f"Saved {mosaic_path}")


if __name__ == "__main__":
    build_all()
