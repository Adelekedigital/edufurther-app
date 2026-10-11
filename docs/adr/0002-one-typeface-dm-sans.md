# 0002. One typeface: DM Sans, with Inter filling its gaps

- Status: accepted
- Date: 2026-10-10
- Deciders: product (owner); frontend session edufurtherfe-58
- Supersedes: the four-font set imported from the design system (2026-09-26)

## Context and problem statement

The design system set four text families: Hanken Grotesk (brand and headings), Inter (UI
text), Poppins (buttons) and Nunito Sans (form fields, standing in for Avenir). Product
decided on 2026-10-10 that the product uses **DM Sans for everything**, in code now, with the
design system to follow.

DM Sans (google/fonts, both the pinned and the latest release) cannot draw **₦**, the
Yoruba/Igbo dot-below letters **ẹ ọ ṣ ị ụ ṅ** (no combining dot below either), or the West
African letters **ɛ ɔ ɓ ɗ ƙ**. Names and prices on a Nigerian product use them; Inter has
them all.

## Considered options

1. DM Sans, falling back per character to the device's system font.
2. **DM Sans, with a second file holding only the characters it lacks, cut from Inter.**
3. Stay on Inter until design picks a DM Sans-like family with the coverage.

## Decision

Option 2 (product, 2026-10-10). Every font role token (`--font-brand`, `--font-ui`,
`--font-button`, `--font-form`) is `var(--ff-inter-gaps), var(--ff-dmsans)`, then system
fonts. The gap file goes **first**, with no fallback face of its own: next/font gives DM
Sans a metric-matched "Fallback" face built on Arial, which has these characters, so with the
gap file second the browser drew them in Arial and never fetched it (caught in a browser
probe before merge). Its unicode-range keeps every other character on DM Sans. `scripts/fonts/build_fonts.py` builds DM Sans, works out which requested characters it
lacks, cuts exactly those from Inter into `inter-gaps.woff2`, and prints its unicode-range,
which `src/app/fonts.ts` declares. The gap file isn't preloaded: browsers fetch it only on a
page that shows one of those characters. The four old families are removed.

## Consequences

- Every screen changes look at once; DM Sans is wider than Inter, so tight spots (buttons,
  chips, one-line rows) were checked at 390, 600 and 1440.
- Font weight drops: one 30 KB file preloaded instead of Inter's 77 KB (plus Hanken), and
  20 KB more only where needed.
- A word mixing DM Sans and Inter glyphs (e.g. "Adébáyọ̀") reads close but not identical:
  accepted over a system-font fallback.
- The design system still says Inter etc.: until design updates it, every design comparison
  shows the font as a known difference (design-divergence.md). Design is asked to move the DS
  to DM Sans (session-join design request, section 11).
- Rebuilding fonts means rebuilding both files together, and pasting the new range.
