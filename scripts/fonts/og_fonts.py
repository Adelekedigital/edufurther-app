"""Cut the static DM Sans files the link-preview images use (run by hand).

next/og's ImageResponse (satori) reads TTF, OTF or WOFF, never WOFF2 or a
variable font, so the one typeface (ADR 0002) needs static cuts for it. They
come from the committed variable subset, so they cover exactly what the site
does; rerun this after build_fonts.py rebuilds it.

Usage (needs fonttools + brotli):
  python scripts/fonts/og_fonts.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "src/app/fonts/dm-sans-var.woff2"
OUT = ROOT / "src/app/fonts/og"
WEIGHTS = {"regular": 400, "bold": 700}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, weight in WEIGHTS.items():
        font = TTFont(SOURCE)
        axes = {"wght": weight}
        if "opsz" in [a.axisTag for a in font["fvar"].axes]:
            # The images set text at 32 to 80px: the display cut.
            axes["opsz"] = 32
        static = instancer.instantiateVariableFont(font, axes)
        static.flavor = None
        path = OUT / f"dm-sans-{name}.ttf"
        static.save(path)
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
