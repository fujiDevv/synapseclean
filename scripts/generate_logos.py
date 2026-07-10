#!/usr/bin/env python3
"""Generate SynapseClean logo PNGs (distinct from SourceCloak shield)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
WEB_PUBLIC = ROOT.parent / "synapseclean-web" / "public"
WEB_SRC_ASSETS = ROOT.parent / "synapseclean-web" / "src" / "assets"

BG = (19, 20, 19, 255)
BORDER = (91, 91, 93, 115)
WHITE = (255, 255, 255, 255)
MUTED = (163, 163, 163, 255)


def _line(draw: ImageDraw.ImageDraw, p1: tuple[float, float], p2: tuple[float, float], color, width: int) -> None:
    draw.line([(p1[0], p1[1]), (p2[0], p2[1])], fill=color, width=width)


def _polyline(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], color, width: int) -> None:
    for i in range(len(points) - 1):
        _line(draw, points[i], points[i + 1], color, width)


def draw_logo(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    s = size / 128.0
    radius = max(2, round(26 * s))

    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)
    inset = max(1, round(5 * s))
    draw.rounded_rectangle(
        [inset, inset, size - 1 - inset, size - 1 - inset],
        radius=max(1, round(22 * s)),
        outline=BORDER,
        width=max(1, round(2 * s)),
    )

    if size >= 20:
        w_outer = max(1, round(3.5 * s))
        w_inner = max(1, round(3.5 * s))
        _polyline(draw, [(46 * s, 34 * s), (64 * s, 20 * s), (82 * s, 34 * s)], MUTED, w_outer)
        _polyline(draw, [(52 * s, 44 * s), (64 * s, 34 * s), (76 * s, 44 * s)], WHITE, w_inner)

    lw = max(1, round(5 * s))
    _line(draw, (42 * s, 56 * s), (58 * s, 78 * s), WHITE, lw)
    _line(draw, (86 * s, 56 * s), (70 * s, 78 * s), WHITE, lw)

    for cx, cy, r in [(42, 56, 7), (86, 56, 7)]:
        rr = max(1, round(r * s))
        draw.ellipse([cx * s - rr, cy * s - rr, cx * s + rr, cy * s + rr], fill=WHITE)

    rr = max(2, round(10 * s))
    draw.ellipse([64 * s - rr, 86 * s - rr, 64 * s + rr, 86 * s + rr], fill=WHITE)
    if size >= 24:
        dr = max(1, round(4 * s))
        draw.ellipse([64 * s - dr, 86 * s - dr, 64 * s + dr, 86 * s + dr], fill=BG)

    if size >= 28:
        stem_w = max(1, round(3 * s))
        _line(draw, (64 * s, 96 * s), (64 * s, 108 * s), MUTED, stem_w)
        dot = max(1, round(3 * s))
        draw.ellipse([64 * s - dot, 112 * s - dot, 64 * s + dot, 112 * s + dot], fill=MUTED)

    return img


def main() -> None:
    sizes = [
        ("synapseclean-12.png", 12),
        ("synapseclean-48.png", 48),
        ("synapseclean-128.png", 128),
        ("synapseclean-256.png", 256),
    ]
    ASSETS.mkdir(parents=True, exist_ok=True)
    WEB_PUBLIC.mkdir(parents=True, exist_ok=True)
    WEB_SRC_ASSETS.mkdir(parents=True, exist_ok=True)

    for name, px in sizes:
        logo = draw_logo(px)
        for dest in (ASSETS, WEB_PUBLIC, WEB_SRC_ASSETS):
            logo.save(dest / name, format="PNG", optimize=True)
        print(f"wrote {name} ({px}px)")


if __name__ == "__main__":
    main()