#!/usr/bin/env python3
"""Prepare jersey PNG layers with text regions inpainted."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
ASSETS = Path("/home/ubuntu/.cursor/projects/workspace/assets")

REGIONS = {
    "back": {
        "size_source": "back_cropped.png",
        "jungler": {"x0": 278, "y0": 128, "x1": 513, "y1": 213, "color": "white"},
        "forbidden_gospel": {"x0": 322, "y0": 220, "x1": 477, "y1": 675, "color": "white"},
    },
    "front": {
        "size_source": "front_cropped.png",
        "jungler": {"x0": 322, "y0": 90, "x1": 465, "y1": 139, "color": "black"},
    },
}


def build_text_mask(rgba: np.ndarray, box: dict, color: str, pad: int = 4) -> np.ndarray:
    x0 = max(0, box["x0"] - pad)
    y0 = max(0, box["y0"] - pad)
    x1 = min(rgba.shape[1], box["x1"] + pad)
    y1 = min(rgba.shape[0], box["y1"] + pad)

    roi = rgba[y0:y1, x0:x1]
    rgb = roi[:, :, :3].astype(np.float32)
    alpha = roi[:, :, 3]

    if color == "white":
        mask = (
            (rgb[:, :, 0] > 185)
            & (rgb[:, :, 1] > 185)
            & (rgb[:, :, 2] > 185)
            & (alpha > 180)
        )
    else:
        mask = (
            (rgb.mean(axis=2) < 95)
            & (alpha > 180)
        )

    full = np.zeros(rgba.shape[:2], dtype=np.uint8)
    full[y0:y1, x0:x1] = (mask.astype(np.uint8) * 255)

    kernel = np.ones((3, 3), np.uint8)
    return cv2.dilate(full, kernel, iterations=1)


def inpaint_region(rgba: np.ndarray, box: dict, color: str = "white") -> np.ndarray:
    mask = build_text_mask(rgba, box, color)

    bgr = cv2.cvtColor(rgba[:, :, :3], cv2.COLOR_RGBA2BGR)
    inpainted = cv2.inpaint(bgr, mask, inpaintRadius=3, flags=cv2.INPAINT_TELEA)

    out = rgba.copy()
    out[:, :, :3] = cv2.cvtColor(inpainted, cv2.COLOR_BGR2RGB)
    return out


def ensure_cutouts() -> None:
    from rembg import remove

    for name, src in [
        ("front", ASSETS / "7273766D-AFD9-4BED-A1D9-C7CC0E448423_L0_001.jpg"),
        ("back", ASSETS / "C5D56656-D69B-428F-9E89-5F7C53921630_L0_001.jpg"),
    ]:
        cutout_path = ROOT / f"{name}_cutout.png"
        cropped_path = ROOT / f"{name}_cropped.png"
        if cropped_path.exists():
            continue

        with open(src, "rb") as handle:
            cutout = Image.open(__import__("io").BytesIO(remove(handle.read()))).convert("RGBA")
        cutout.save(cutout_path)

        alpha = np.array(cutout)[:, :, 3]
        ys, xs = np.where(alpha > 20)
        cropped = cutout.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        cropped.save(cropped_path)


def build_view(name: str) -> dict:
    cfg = REGIONS[name]
    src = Image.open(ROOT / cfg["size_source"]).convert("RGBA")
    rgba = np.array(src)

    base = rgba.copy()
    for key, box in cfg.items():
        if key in {"size_source"}:
            continue
        base = inpaint_region(base, box, box["color"])

    Image.fromarray(rgba).save(ROOT / f"{name}_original.png")
    Image.fromarray(base).save(ROOT / f"{name}_base.png")

    meta = {
        "name": name,
        "width": int(rgba.shape[1]),
        "height": int(rgba.shape[0]),
        "text_layers": {},
    }

    for key, box in cfg.items():
        if key in {"size_source"}:
            continue
        meta["text_layers"][key] = {
            "text": "JUNGLER" if key == "jungler" else "FORBIDDEN GOSPEL",
            "x": int(box["x0"]),
            "y": int(box["y0"]),
            "width": int(box["x1"] - box["x0"]),
            "height": int(box["y1"] - box["y0"]),
            "color": box["color"],
            "orientation": "horizontal" if key == "jungler" else "vertical",
        }

    return meta


def main() -> None:
    ensure_cutouts()
    metadata = {"views": [build_view("front"), build_view("back")]}
    out = ROOT / "layer_metadata.json"
    out.write_text(json.dumps(metadata, indent=2))
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
