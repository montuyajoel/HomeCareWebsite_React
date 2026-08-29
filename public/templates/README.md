# SS Jersey Phoenix — Sublimation Template

Flat **cut-and-sew dye-sublimation** template for a short-sleeve V-neck athletic / esports jersey (Adult M).

## Files

| File | Use |
|------|-----|
| `ss-jersey-phoenix-sublimation-template.png` | Blank production layout (cut / bleed / safe guides) |
| `ss-jersey-phoenix-sublimation-template-design-preview.png` | Layout + Orochi Jaguars reference design on panels |
| `ss-jersey-phoenix-sublimation-artwork.png` | Design mapped to panels only (no guide overlays) |
| `ss-jersey-phoenix-sublimation-template.psd` | Layered Photoshop file |

## Panels

- **FRONT** — V-neck body (52 × 72 cm cut)
- **BACK** — body (52 × 72 cm cut)
- **L SLEEVE / R SLEEVE** — short sleeves (48 × 28 cm cut)
- **COLLAR** — neck tape (42 × 6 cm cut)

Guides: **magenta dashed = bleed (+1 cm)**, **black = cut**, **cyan dashed = safe (−1.5 cm)**.

## Specs

- Resolution: **150 DPI**
- Color: RGB preview (convert to **CMYK** before print)
- Fabric: 100% polyester jersey
- Process: sublimate panels → cut on cut lines → sew

## PSD layers

1. `00_Background` — sheet + header  
2. `01_Artwork` — white art masks + sample design (toggle/replace)  
3. `02_Guides` — bleed / cut / safe / registration  
4. `03_Labels` — panel names, legend, notes  

Place your artwork **under** the guide groups. Keep logos inside the cyan safe area; extend pattern fills to the magenta bleed.

## Regenerate

```bash
python3 scripts/create_sublimation_template.py
```
