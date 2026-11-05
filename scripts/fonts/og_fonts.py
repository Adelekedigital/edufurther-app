"""Cut the static font files the link-preview images use (run by hand).

next/og's ImageResponse (satori) reads TTF, OTF or WOFF, never WOFF2 or a
variable font, so the one typeface (ADR 0002) needs static cuts for it. They
come from the committed variable subset, so they cover exactly what the site
does; rerun this after build_fonts.py rebuilds them. Inter's gap file comes
too: DM Sans lacks ₦, Yoruba/Igbo dot-below and West African letters, and
satori, like the site, falls back to it per character (a name like "Ṣadé"
must not break the image or send next/og to Google Fonts).

Usage (needs fonttools + brotli):
  python scripts/fonts/og_fonts.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src/app/fonts/og"
WEIGHTS = {"regular": 400, "bold": 700}
SOURCES = {
    "dm-sans": ROOT / "src/app/fonts/dm-sans-var.woff2",
    "inter-gaps": ROOT / "src/app/fonts/inter-gaps.woff2",
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for family, source in SOURCES.items():
        for name, weight in WEIGHTS.items():
            cut(family, source, name, weight)


def cut(family: str, source: Path, name: str, weight: int) -> None:
    font = TTFont(source)
    axes = {"wght": weight}
    if "opsz" in [a.axisTag for a in font["fvar"].axes]:
        # The images set text at 32 to 80px: the display cut.
        axes["opsz"] = 32
    static = instancer.instantiateVariableFont(font, axes)
    static.flavor = None
    path = OUT / f"{family}-{name}.ttf"
    static.save(path)
    print(f"{path.relative_to(ROOT)}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
