"""Build the self-hosted font subsets in src/app/fonts/ (run by hand, not in CI).

Sources: the official google/fonts repo (SIL OFL 1.1), pinned in SOURCES below.
Each family becomes ONE woff2 covering the Latin script as our users write it,
so next/font/local can preload it and size a matching fallback (no layout shift).

Coverage, beyond Google's own latin + latin-ext split:
  - precomposed Yoruba / Igbo letters: ọ ẹ ṣ ị ụ ṅ (not the whole Latin Extended
    Additional block, which is mostly Vietnamese: 24 KB on Inter alone)
  - West African letters: ɛ ɔ ɓ ɗ ƙ ŋ ə ɣ ɲ (Akan, Ewe, Hausa, Fula…)
  - combining marks (0300-036F): tone marks on any vowel
  - currency incl. ₦ (20A6)

Usage (needs fonttools + brotli):
  python scripts/fonts/build_fonts.py <dir with the downloaded source .ttf files>
"""

import io
import sys
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

GOOGLE_FONTS_COMMIT = "23e54b51ddffbc7713c583748e3bd86f62b1fa4a"

UNICODES = ",".join(
    [
        "U+0020-007E,U+00A0-00FF",  # Basic Latin, Latin-1
        "U+0100-017F",  # Latin Extended-A (incl. ŋ U+014B)
        "U+0300-036F",  # combining marks: tone marks on any vowel
        # West African letters from Latin Extended-B / IPA: Ɔ Ɖ Ɗ Ə Ɛ Ƙ Ƴ ɓ ɔ ɖ ɗ ə ɛ ɣ ɲ
        "U+0186,U+0189-018A,U+018F-0190,U+0198-0199,U+01B3-01B4",
        "U+0253-0254,U+0256-0257,U+0259,U+025B,U+0263,U+0272",
        # Precomposed Yoruba / Igbo letters: Ṅ ṅ Ṣ ṣ Ẹ ẹ Ị ị Ọ ọ Ụ ụ (+ Ẁ ẁ Ẃ ẃ Ẅ ẅ Ẽ ẽ)
        "U+1E44-1E45,U+1E62-1E63,U+1E80-1E85,U+1EB8-1EB9,U+1EBC-1EBD,U+1ECA-1ECD,U+1EE4-1EE5",
        "U+2000-206F",  # punctuation (dashes, quotes, ellipsis)
        "U+20A0-20CF",  # currency incl. ₦ (U+20A6)
        "U+2122,U+2190-2193,U+2212,U+2215,U+FEFF,U+FFFD",
    ]
)

# (source file under ofl/, output name, axis limits: pin to a value or keep a range)
SOURCES = [
    ("inter/Inter[opsz,wght].ttf", "inter-var.woff2", {"opsz": None, "wght": (400, 700)}),
    ("hankengrotesk/HankenGrotesk[wght].ttf", "hanken-grotesk-var.woff2", {"wght": (400, 700)}),
    (
        "nunitosans/NunitoSans[YTLC,opsz,wdth,wght].ttf",
        "nunito-sans-var.woff2",
        {"YTLC": None, "opsz": None, "wdth": None, "wght": (400, 700)},
    ),
    ("poppins/Poppins-SemiBold.ttf", "poppins-600.woff2", None),
    ("poppins/Poppins-Bold.ttf", "poppins-700.woff2", None),
]

OUT = Path(__file__).resolve().parents[2] / "src" / "app" / "fonts"


def build(src_dir: Path) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for rel, out_name, axes in SOURCES:
        font = TTFont(src_dir / rel, lazy=False)
        if axes:
            # None pins an axis to its default; a tuple keeps that range only.
            font = instancer.instantiateVariableFont(font, axes)
            # Round-trip so the subsetter sees fully built tables.
            buf = io.BytesIO()
            font.save(buf)
            buf.seek(0)
            font = TTFont(buf, lazy=False)
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        opts.drop_tables += ["DSIG"]
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=subset.parse_unicodes(UNICODES))
        sub.subset(font)
        font.flavor = "woff2"
        font.save(OUT / out_name)
        print(f"{out_name}: {(OUT / out_name).stat().st_size // 1024} KB")


if __name__ == "__main__":
    build(Path(sys.argv[1]))
