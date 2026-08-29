#!/usr/bin/env python3
"""Generate SS Jersey Phoenix-style sublimation cut-and-sew template (PNG + PSD)."""

from __future__ import annotations

import importlib
import os
import sys
import types
from dataclasses import dataclass
from typing import Iterable, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image as PILImage
from PIL import ImageDraw, ImageFont


def _install_packbits_shim() -> None:
    """Provide PackBits encode when pytoshop's Cython extension is missing."""
    try:
        from pytoshop import packbits as _pb  # noqa: F401

        if hasattr(_pb, "encode"):
            return
    except Exception:
        pass

    def encode(data):
        if isinstance(data, np.ndarray):
            data = data.astype(np.uint8).tobytes()
        out = bytearray()
        i = 0
        n = len(data)
        while i < n:
            run = 1
            while i + run < n and run < 128 and data[i] == data[i + run]:
                run += 1
            if run >= 3:
                out.append((256 - (run - 1)) % 256)
                out.append(data[i])
                i += run
                continue
            j = i
            while j < n:
                if j + 2 < n and data[j] == data[j + 1] == data[j + 2]:
                    break
                if j - i >= 128:
                    break
                j += 1
            length = j - i
            if length == 0:
                length = min(2, n - i) or 1
                j = i + length
            out.append(length - 1)
            out.extend(data[i:j])
            i = j
        return bytes(out)

    mod = types.ModuleType("pytoshop.packbits")
    mod.encode = encode
    sys.modules["pytoshop.packbits"] = mod
    import pytoshop.codecs as codecs

    importlib.reload(codecs)


_install_packbits_shim()

from pytoshop import enums  # noqa: E402
from pytoshop.user.nested_layers import Group, Image as PsdImage  # noqa: E402
from pytoshop.user.nested_layers import nested_layers_to_psd  # noqa: E402

Point = Tuple[float, float]
DPI = 150
CM_TO_IN = 1 / 2.54


def cm(v: float) -> int:
    return int(round(v * CM_TO_IN * DPI))


@dataclass
class Panel:
    name: str
    origin: Tuple[int, int]
    size_cm: Tuple[float, float]
    kind: str  # front | back | sleeve_l | sleeve_r | collar


# Adult M approximate panel sizes (cut size, before bleed)
PANELS: List[Panel] = [
    Panel("FRONT", (cm(1.5), cm(4.5)), (52.0, 72.0), "front"),
    Panel("BACK", (cm(1.5 + 52.0 + 3.0), cm(4.5)), (52.0, 72.0), "back"),
    Panel("L SLEEVE", (cm(1.5 + 52.0 + 3.0 + 52.0 + 3.0), cm(4.5)), (48.0, 28.0), "sleeve_l"),
    Panel("R SLEEVE", (cm(1.5 + 52.0 + 3.0 + 52.0 + 3.0), cm(4.5 + 28.0 + 3.0)), (48.0, 28.0), "sleeve_r"),
    Panel("COLLAR", (cm(1.5 + 52.0 + 3.0 + 52.0 + 3.0), cm(4.5 + 28.0 + 3.0 + 28.0 + 3.0)), (42.0, 6.0), "collar"),
]

BLEED_CM = 1.0
SAFE_CM = 1.5
MARGIN_CM = 1.5


def canvas_size() -> Tuple[int, int]:
    max_r = 0
    max_b = 0
    for p in PANELS:
        w, h = cm(p.size_cm[0] + BLEED_CM * 2), cm(p.size_cm[1] + BLEED_CM * 2)
        max_r = max(max_r, p.origin[0] + w)
        max_b = max(max_b, p.origin[1] + h)
    return max_r + cm(MARGIN_CM), max_b + cm(MARGIN_CM + 2)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def body_outline(w: float, h: float, vneck: bool) -> List[Point]:
    """Clockwise outline in local panel coords (cut line)."""
    # Shoulder / armhole / side / hem geometry for athletic jersey
    shoulder_in = w * 0.12
    neck_w = w * 0.28
    arm_depth = h * 0.22
    waist = w * 0.90
    hem_curve = h * 0.015

    cx = w / 2
    left_shoulder = shoulder_in
    right_shoulder = w - shoulder_in
    neck_l = cx - neck_w / 2
    neck_r = cx + neck_w / 2

    pts: List[Point] = []
    # Left shoulder to left armhole to left side to hem to right side...
    pts.append((left_shoulder, 0))
    # left armhole curve (outward)
    for t in np.linspace(0, 1, 12):
        x = lerp(left_shoulder, 0, t)
        y = lerp(0, arm_depth, t)
        # bulge outward near mid-armhole
        bulge = -w * 0.02 * np.sin(np.pi * t)
        pts.append((x + bulge, y))
    # left side down to hem
    for t in np.linspace(0, 1, 10)[1:]:
        x = lerp(0, (w - waist) / 2, t)
        y = lerp(arm_depth, h - hem_curve, t)
        pts.append((x, y))
    # hem curve
    for t in np.linspace(0, 1, 16):
        x = lerp((w - waist) / 2, w - (w - waist) / 2, t)
        y = h - hem_curve * np.sin(np.pi * t)
        pts.append((x, y))
    # right side up
    for t in np.linspace(0, 1, 10)[1:]:
        x = lerp(w - (w - waist) / 2, w, t)
        y = lerp(h - hem_curve, arm_depth, t)
        pts.append((x, y))
    # right armhole
    for t in np.linspace(0, 1, 12)[1:]:
        x = lerp(w, right_shoulder, t)
        y = lerp(arm_depth, 0, t)
        bulge = w * 0.02 * np.sin(np.pi * t)
        pts.append((x + bulge, y))
    # neckline
    if vneck:
        # right shoulder to V to left
        pts.append((neck_r, 0))
        pts.append((cx, h * 0.10))
        pts.append((neck_l, 0))
    else:
        # shallow crew/back neck
        for t in np.linspace(0, 1, 14):
            x = lerp(neck_r, neck_l, t)
            y = h * 0.035 * np.sin(np.pi * t)
            pts.append((x, y))
        pts.append((neck_l, 0))
    pts.append((left_shoulder, 0))
    return pts


def sleeve_outline(w: float, h: float, mirror: bool) -> List[Point]:
    """Short sleeve panel: top=shoulder/armhole curve, bottom=hem."""
    pts: List[Point] = []
    # Outer (underarm) left, cuff, outer right, armhole arc
    # Shape as a curved trapezoid
    cuff_w = w * 0.72
    cuff_left = (w - cuff_w) / 2
    cuff_right = cuff_left + cuff_w
    arm_top = 0
    for t in np.linspace(0, 1, 20):
        # armhole / cap curve along top
        x = lerp(0, w, t)
        y = arm_top + h * 0.28 * np.sin(np.pi * t)
        pts.append((x, y))
    # right underarm down to cuff
    for t in np.linspace(0, 1, 8)[1:]:
        x = lerp(w, cuff_right, t)
        y = lerp(arm_top, h, t)
        pts.append((x, y))
    # cuff
    for t in np.linspace(0, 1, 12)[1:]:
        x = lerp(cuff_right, cuff_left, t)
        y = h - h * 0.04 * np.sin(np.pi * t)
        pts.append((x, y))
    # left underarm up
    for t in np.linspace(0, 1, 8)[1:]:
        x = lerp(cuff_left, 0, t)
        y = lerp(h, arm_top + h * 0.28 * np.sin(np.pi * 0), t)
        pts.append((x, y))
    if mirror:
        pts = [(w - x, y) for x, y in pts]
    return pts


def collar_outline(w: float, h: float) -> List[Point]:
    return [(0, 0), (w, 0), (w, h), (0, h), (0, 0)]


def offset_polygon(pts: Sequence[Point], delta: float) -> List[Point]:
    """Simple radial offset from centroid (good enough for guides)."""
    if abs(delta) < 1e-6:
        return list(pts)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    out: List[Point] = []
    for x, y in pts:
        dx, dy = x - cx, y - cy
        dist = (dx * dx + dy * dy) ** 0.5 or 1.0
        out.append((x + dx / dist * delta, y + dy / dist * delta))
    return out


def panel_cut_points(panel: Panel) -> List[Point]:
    w, h = cm(panel.size_cm[0]), cm(panel.size_cm[1])
    if panel.kind == "front":
        return body_outline(w, h, vneck=True)
    if panel.kind == "back":
        return body_outline(w, h, vneck=False)
    if panel.kind == "sleeve_l":
        return sleeve_outline(w, h, mirror=False)
    if panel.kind == "sleeve_r":
        return sleeve_outline(w, h, mirror=True)
    return collar_outline(w, h)


def to_abs(pts: Iterable[Point], origin: Tuple[int, int], bleed_pad: int) -> List[Tuple[int, int]]:
    ox, oy = origin
    return [(int(round(ox + bleed_pad + x)), int(round(oy + bleed_pad + y))) for x, y in pts]


def try_font(size: int) -> ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def new_rgba(size: Tuple[int, int], color=(0, 0, 0, 0)) -> PILImage.Image:
    return PILImage.new("RGBA", size, color)


def draw_dashed_polygon(draw: ImageDraw.ImageDraw, pts: Sequence[Tuple[int, int]], fill, width=2, dash=14, gap=10):
    for i in range(len(pts) - 1):
        x0, y0 = pts[i]
        x1, y1 = pts[i + 1]
        seg_len = max(((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5, 1)
        n = int(seg_len // (dash + gap)) + 1
        for k in range(n):
            t0 = (k * (dash + gap)) / seg_len
            t1 = min((k * (dash + gap) + dash) / seg_len, 1.0)
            if t0 >= 1:
                break
            ax = int(lerp(x0, x1, t0))
            ay = int(lerp(y0, y1, t0))
            bx = int(lerp(x0, x1, t1))
            by = int(lerp(y0, y1, t1))
            draw.line([(ax, ay), (bx, by)], fill=fill, width=width)


def fill_polygon(img: PILImage.Image, pts: Sequence[Tuple[int, int]], color) -> PILImage.Image:
    layer = new_rgba(img.size)
    d = ImageDraw.Draw(layer)
    d.polygon(list(pts), fill=color)
    return layer


def draw_registration(draw: ImageDraw.ImageDraw, x: int, y: int, size=18, color=(0, 0, 0, 255)):
    draw.line([(x - size, y), (x + size, y)], fill=color, width=2)
    draw.line([(x, y - size), (x, y + size)], fill=color, width=2)
    draw.ellipse([x - 4, y - 4, x + 4, y + 4], outline=color, width=2)


def rgba_to_channels(arr: np.ndarray):
    """RGBA uint8 HxWx4 -> pytoshop channel dict."""
    return {
        0: np.ascontiguousarray(arr[:, :, 0]),
        1: np.ascontiguousarray(arr[:, :, 1]),
        2: np.ascontiguousarray(arr[:, :, 2]),
        -1: np.ascontiguousarray(arr[:, :, 3]),
    }


def content_bbox(arr: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    """Return (top, left, bottom, right) for non-transparent pixels, or None."""
    alpha = arr[:, :, 3]
    ys, xs = np.where(alpha > 0)
    if len(xs) == 0:
        return None
    top, bottom = int(ys.min()), int(ys.max()) + 1
    left, right = int(xs.min()), int(xs.max()) + 1
    return top, left, bottom, right


def layer_from_pil(name: str, img: PILImage.Image, visible=True, opacity=255) -> PsdImage:
    arr = np.array(img.convert("RGBA"))
    bbox = content_bbox(arr)
    if bbox is None:
        # 1x1 transparent placeholder
        arr = np.zeros((1, 1, 4), dtype=np.uint8)
        top = left = 0
        bottom = right = 1
    else:
        top, left, bottom, right = bbox
        arr = arr[top:bottom, left:right]
    return PsdImage(
        name=name,
        visible=visible,
        opacity=opacity,
        top=top,
        left=left,
        bottom=bottom,
        right=right,
        channels=rgba_to_channels(arr),
        color_mode=enums.ColorMode.rgb,
    )


DEFAULT_REFERENCE = os.environ.get(
    "JERSEY_REFERENCE",
    "/home/ubuntu/.cursor/projects/workspace/assets/B9B9ABDD-8A5D-4599-BD31-840A8A5C9451_L0_001.jpg",
)

# Approximate crop boxes on the 3D mockup (x0, y0, x1, y1) in reference pixels
MOCKUP_CROPS = {
    "FRONT": (55, 330, 525, 1175),
    "BACK": (560, 330, 1030, 1175),
    "L SLEEVE": (55, 360, 195, 820),
    "R SLEEVE": (385, 360, 525, 820),
    "COLLAR": (175, 330, 405, 455),
}


def panel_bbox(cut: Sequence[Tuple[int, int]]) -> Tuple[int, int, int, int]:
    xs = [p[0] for p in cut]
    ys = [p[1] for p in cut]
    return min(xs), min(ys), max(xs), max(ys)


def paste_art_into_panel(
    canvas: PILImage.Image,
    art: PILImage.Image,
    cut: Sequence[Tuple[int, int]],
) -> PILImage.Image:
    """Resize art to panel bbox and clip to cut polygon."""
    minx, miny, maxx, maxy = panel_bbox(cut)
    pw, ph = maxx - minx, maxy - miny
    if pw <= 0 or ph <= 0:
        return canvas
    resized = art.resize((pw, ph), PILImage.Resampling.LANCZOS).convert("RGBA")
    mask = PILImage.new("L", canvas.size, 0)
    ImageDraw.Draw(mask).polygon(list(cut), fill=255)
    layer = new_rgba(canvas.size)
    layer.paste(resized, (minx, miny))
    masked = new_rgba(canvas.size)
    masked.paste(layer, mask=mask)
    return PILImage.alpha_composite(canvas, masked)


def build_design_from_reference(
    size: Tuple[int, int],
    panels_abs: dict,
    reference_path: str = DEFAULT_REFERENCE,
) -> PILImage.Image:
    """Map the Orochi mockup artwork onto flat sublimation panels."""
    layer = new_rgba(size)
    if not os.path.exists(reference_path):
        return build_design_fill(size, panels_abs)

    ref = PILImage.open(reference_path).convert("RGBA")
    ref_w, ref_h = ref.size

    for panel_name, (cut, _bleed, _safe) in panels_abs.items():
        crop = MOCKUP_CROPS.get(panel_name)
        if crop is None:
            continue
        x0, y0, x1, y1 = crop
        x0 = max(0, min(x0, ref_w - 1))
        y0 = max(0, min(y0, ref_h - 1))
        x1 = max(x0 + 1, min(x1, ref_w))
        y1 = max(y0 + 1, min(y1, ref_h))
        art = ref.crop((x0, y0, x1, y1))
        layer = paste_art_into_panel(layer, art, cut)

    return layer


def build_design_fill(size: Tuple[int, int], panels_abs: dict) -> PILImage.Image:
    """Fallback stylized green/black energy fill when no reference image is available."""
    layer = new_rgba(size)
    draw = ImageDraw.Draw(layer)
    rng = np.random.default_rng(7)

    for name, (cut, bleed, safe) in panels_abs.items():
        mask = new_rgba(size)
        ImageDraw.Draw(mask).polygon(cut, fill=(255, 255, 255, 255))
        panel = new_rgba(size)
        pd = ImageDraw.Draw(panel)
        # base dark green
        pd.polygon(cut, fill=(8, 40, 18, 255))
        # flame / tribal shards
        xs = [p[0] for p in cut]
        ys = [p[1] for p in cut]
        minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
        for _ in range(55):
            x0 = int(rng.integers(minx, maxx))
            y0 = int(rng.integers(miny, maxy))
            span = int(rng.integers(40, 180))
            color = (20, int(rng.integers(160, 230)), 40, 220) if rng.random() > 0.35 else (0, 0, 0, 230)
            pts = [
                (x0, y0),
                (x0 + span, y0 + int(span * 0.2)),
                (x0 + int(span * 0.35), y0 + span),
                (x0 - int(span * 0.15), y0 + int(span * 0.45)),
            ]
            pd.polygon(pts, fill=color)
        # soft center glow for front
        if name == "FRONT":
            cx = (minx + maxx) // 2
            cy = (miny + maxy) // 2 + cm(4)
            for r, a in ((cm(12), 90), (cm(8), 140), (cm(4), 180)):
                pd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(40, 220, 90, a))
            font = try_font(int(DPI * 0.55))
            text = "JAGUARS"
            bbox = pd.textbbox((0, 0), text, font=font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pd.text((cx - tw // 2, miny + cm(8)), text, font=font, fill=(240, 255, 240, 255))
            small = try_font(int(DPI * 0.14))
            tag = "RELENTLESS · UNITED · VICTORIOUS"
            bbox = pd.textbbox((0, 0), tag, font=small)
            tw = bbox[2] - bbox[0]
            pd.text((cx - tw // 2, miny + cm(8) + th + 8), tag, font=small, fill=(200, 255, 210, 230))
        if name == "BACK":
            cx = (minx + maxx) // 2
            font = try_font(int(DPI * 0.42))
            text = "JUNGLER"
            bbox = pd.textbbox((0, 0), text, font=font)
            tw = bbox[2] - bbox[0]
            pd.text((cx - tw // 2, miny + cm(6)), text, font=font, fill=(255, 255, 255, 255))
            # vertical strip
            strip_w = cm(3.2)
            pd.rectangle([cx - strip_w // 2, miny + cm(14), cx + strip_w // 2, maxy - cm(4)], fill=(0, 0, 0, 230))
        panel = PILImage.composite(panel, new_rgba(size), mask.split()[-1])
        layer = PILImage.alpha_composite(layer, panel)
    return layer


def main():
    out_dir = "/workspace/public/templates"
    os.makedirs(out_dir, exist_ok=True)
    width, height = canvas_size()
    size = (width, height)

    # --- layer: background ---
    bg = new_rgba(size, (245, 247, 244, 255))
    bg_draw = ImageDraw.Draw(bg)
    # light grid
    step = cm(1)
    for x in range(0, width, step):
        bg_draw.line([(x, 0), (x, height)], fill=(230, 234, 228, 255), width=1)
    for y in range(0, height, step):
        bg_draw.line([(0, y), (width, y)], fill=(230, 234, 228, 255), width=1)

    # header
    title_font = try_font(int(DPI * 0.28))
    meta_font = try_font(int(DPI * 0.12))
    bg_draw.rectangle([0, 0, width, cm(3.2)], fill=(18, 28, 22, 255))
    bg_draw.text((cm(1.5), cm(0.7)), "SS JERSEY PHOENIX  —  SUBLIMATION TEMPLATE  —  ADULT M", font=title_font, fill=(180, 255, 120, 255))
    bg_draw.text(
        (cm(1.5), cm(2.0)),
        f"Dye-sublimation cut & sew  |  {DPI} DPI  |  Bleed {BLEED_CM} cm  |  Safe {SAFE_CM} cm  |  CMYK print from RGB preview",
        font=meta_font,
        fill=(200, 220, 200, 255),
    )

    bleed_pad = cm(BLEED_CM)
    panels_abs = {}
    art_areas = new_rgba(size)
    cut_layer = new_rgba(size)
    bleed_layer = new_rgba(size)
    safe_layer = new_rgba(size)
    labels_layer = new_rgba(size)
    reg_layer = new_rgba(size)

    art_draw = ImageDraw.Draw(art_areas)
    cut_draw = ImageDraw.Draw(cut_layer)
    bleed_draw = ImageDraw.Draw(bleed_layer)
    safe_draw = ImageDraw.Draw(safe_layer)
    label_draw = ImageDraw.Draw(labels_layer)
    reg_draw = ImageDraw.Draw(reg_layer)

    label_font = try_font(int(DPI * 0.22))
    dim_font = try_font(int(DPI * 0.11))

    for panel in PANELS:
        cut_local = panel_cut_points(panel)
        bleed_local = offset_polygon(cut_local, cm(BLEED_CM))
        safe_local = offset_polygon(cut_local, -cm(SAFE_CM))
        cut = to_abs(cut_local, panel.origin, bleed_pad)
        bleed = to_abs(bleed_local, panel.origin, bleed_pad)
        safe = to_abs(safe_local, panel.origin, bleed_pad)
        panels_abs[panel.name] = (cut, bleed, safe)

        # art fill (neutral)
        art_draw.polygon(cut, fill=(255, 255, 255, 255))
        # faint panel box for collar clarity
        draw_dashed_polygon(bleed_draw, bleed, fill=(220, 40, 160, 255), width=3, dash=16, gap=8)
        cut_draw.line(cut, fill=(10, 10, 10, 255), width=4)
        draw_dashed_polygon(safe_draw, safe, fill=(0, 170, 210, 220), width=2, dash=12, gap=8)

        xs = [p[0] for p in cut]
        ys = [p[1] for p in cut]
        cx, cy = sum(xs) // len(xs), sum(ys) // len(ys)
        label_draw.text((cx - cm(2), cy - cm(0.6)), panel.name, font=label_font, fill=(40, 60, 45, 200))
        dims = f"{panel.size_cm[0]:.0f} × {panel.size_cm[1]:.0f} cm (cut)"
        label_draw.text((cx - cm(3.2), cy + cm(0.5)), dims, font=dim_font, fill=(80, 100, 85, 200))

        # registration near panel bleed bounds
        minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
        for rx, ry in ((minx - 12, miny - 12), (maxx + 12, miny - 12), (minx - 12, maxy + 12), (maxx + 12, maxy + 12)):
            draw_registration(reg_draw, rx, ry, size=12, color=(0, 0, 0, 220))

    # legend
    legend_y = height - cm(3.5)
    legend = new_rgba(size)
    ld = ImageDraw.Draw(legend)
    ld.rectangle([cm(1.5), legend_y, width - cm(1.5), height - cm(0.8)], fill=(255, 255, 255, 230), outline=(180, 190, 180, 255))
    ld.text((cm(2), legend_y + cm(0.35)), "LEGEND", font=dim_font, fill=(20, 20, 20, 255))
    ld.line([(cm(5), legend_y + cm(0.7)), (cm(8), legend_y + cm(0.7))], fill=(10, 10, 10, 255), width=4)
    ld.text((cm(8.3), legend_y + cm(0.4)), "CUT", font=dim_font, fill=(20, 20, 20, 255))
    draw_dashed_polygon(ld, [(cm(12), legend_y + cm(0.7)), (cm(15), legend_y + cm(0.7))], fill=(220, 40, 160, 255), width=3)
    ld.text((cm(15.3), legend_y + cm(0.4)), "BLEED (+1 cm)", font=dim_font, fill=(20, 20, 20, 255))
    draw_dashed_polygon(ld, [(cm(22), legend_y + cm(0.7)), (cm(25), legend_y + cm(0.7))], fill=(0, 170, 210, 255), width=2)
    ld.text((cm(25.3), legend_y + cm(0.4)), "SAFE (−1.5 cm)", font=dim_font, fill=(20, 20, 20, 255))
    ld.text(
        (cm(35), legend_y + cm(0.4)),
        "Place artwork under CUT lines with BLEED. Keep critical logos inside SAFE. Match sleeve patterns at armhole seams.",
        font=dim_font,
        fill=(40, 50, 40, 255),
    )

    # notes strip
    notes = new_rgba(size)
    nd = ImageDraw.Draw(notes)
    note_font = try_font(int(DPI * 0.10))
    nd.text(
        (cm(1.5), cm(3.5)),
        "Panels: FRONT (V-neck) · BACK · L/R SLEEVE · COLLAR   |   Fabric: 100% polyester jersey   |   Process: dye-sublimation → cut → sew",
        font=note_font,
        fill=(60, 80, 65, 255),
    )

    design = build_design_from_reference(size, panels_abs)

    # Composite PNG (production view without sample art, plus a design preview)
    production = bg.copy()
    for layer in (art_areas, bleed_layer, cut_layer, safe_layer, labels_layer, reg_layer, legend, notes):
        production = PILImage.alpha_composite(production, layer)

    preview = bg.copy()
    preview = PILImage.alpha_composite(preview, design)
    for layer in (bleed_layer, cut_layer, safe_layer, labels_layer, reg_layer, legend, notes):
        preview = PILImage.alpha_composite(preview, layer)

    # Design-only flat panels (no guides/header) for quick PNG review / print prep
    design_only = bg.copy()
    design_only = PILImage.alpha_composite(design_only, design)

    png_path = os.path.join(out_dir, "ss-jersey-phoenix-sublimation-template.png")
    preview_path = os.path.join(out_dir, "ss-jersey-phoenix-sublimation-template-design-preview.png")
    artwork_path = os.path.join(out_dir, "ss-jersey-phoenix-sublimation-artwork.png")
    production.convert("RGB").save(png_path, "PNG", dpi=(DPI, DPI))
    preview.convert("RGB").save(preview_path, "PNG", dpi=(DPI, DPI))
    design_only.convert("RGB").save(artwork_path, "PNG", dpi=(DPI, DPI))

    # PSD layers
    psd_layers = [
        layer_from_pil("00_Background", bg),
        Group(
            name="01_Artwork",
            closed=False,
            layers=[
                layer_from_pil("Art_Safe_White", art_areas),
                layer_from_pil("Reference_Design", design, visible=True, opacity=255),
            ],
        ),
        Group(
            name="02_Guides",
            closed=False,
            layers=[
                layer_from_pil("Bleed_Magenta", bleed_layer),
                layer_from_pil("Cut_Black", cut_layer),
                layer_from_pil("Safe_Cyan", safe_layer),
                layer_from_pil("Registration", reg_layer),
            ],
        ),
        Group(
            name="03_Labels",
            closed=False,
            layers=[
                layer_from_pil("Panel_Labels", labels_layer),
                layer_from_pil("Legend", legend),
                layer_from_pil("Notes", notes),
            ],
        ),
    ]

    psd = nested_layers_to_psd(
        psd_layers,
        color_mode=enums.ColorMode.rgb,
        compression=enums.Compression.rle,
        # pytoshop treats size as (width, height) despite docs saying otherwise
        size=(width, height),
    )
    psd_path = os.path.join(out_dir, "ss-jersey-phoenix-sublimation-template.psd")
    with open(psd_path, "wb") as f:
        psd.write(f)

    # copy to artifacts for walkthrough
    art_dir = "/opt/cursor/artifacts"
    os.makedirs(art_dir, exist_ok=True)
    production.convert("RGB").save(os.path.join(art_dir, "ss-jersey-phoenix-sublimation-template.png"), "PNG")
    preview.convert("RGB").save(os.path.join(art_dir, "ss-jersey-phoenix-sublimation-template-design-preview.png"), "PNG")
    design_only.convert("RGB").save(os.path.join(art_dir, "ss-jersey-phoenix-sublimation-artwork.png"), "PNG")

    print("Wrote:")
    for p in (png_path, preview_path, artwork_path, psd_path):
        print(f"  {p}  ({os.path.getsize(p)} bytes)  canvas={width}x{height}px @ {DPI}dpi")


if __name__ == "__main__":
    main()
