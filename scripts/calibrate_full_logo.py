import fitz
import os
import shutil

GLYPH_PATH = (
    "M320 240H640V320H320ZM320 400H640V480H320ZM240 80Q207 80 183.5 103.5"
    "Q160 127 160 160V800Q160 833 183.5 856.5Q207 880 240 880H560L800 640"
    "V160Q800 127 776.5 103.5Q753 80 720 80ZM520 600V800H240Q240 800 240.0 800.0"
    "Q240 800 240 800V160Q240 160 240.0 160.0Q240 160 240 160H720Q720 160 720.0 160.0"
    "Q720 160 720 160V600ZM240 800V600V800V600V160Q240 160 240.0 160.0"
    "Q240 160 240 160Q240 160 240.0 160.0Q240 160 240 160V800Q240 800 240.0 800.0"
    "Q240 800 240 800Z"
)

# Perfectly proportioned horizontal logo lockup
# Canvas: 1000 x 240
# Icon: scaled to 160x160 inside 240 height
# Text: font-size 110px, vertically centered
svg_full_transparent = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 240" width="1050" height="240">
  <!-- Icon: size 160x160 at x=40, y=40 -->
  <g transform="translate(40, 40)">
    <g transform="scale(0.16666, 0.16666)">
      <g transform="translate(0, 960) scale(1, -1)" fill="#4F46E5">
        <path d="{GLYPH_PATH}"/>
      </g>
    </g>
  </g>
  <!-- Text: Doc in Slate 900, Scalar in Indigo -->
  <text x="215" y="160" font-family="Plus Jakarta Sans, Inter, Arial, sans-serif" font-size="115" font-weight="700" letter-spacing="-2px">
    <tspan fill="#0F172A">Doc</tspan><tspan fill="#4F46E5">Scalar</tspan>
  </text>
</svg>'''

svg_full_white = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 240" width="1050" height="240">
  <rect width="1050" height="240" fill="#FFFFFF"/>
  <g transform="translate(40, 40)">
    <g transform="scale(0.16666, 0.16666)">
      <g transform="translate(0, 960) scale(1, -1)" fill="#4F46E5">
        <path d="{GLYPH_PATH}"/>
      </g>
    </g>
  </g>
  <text x="215" y="160" font-family="Plus Jakarta Sans, Inter, Arial, sans-serif" font-size="115" font-weight="700" letter-spacing="-2px">
    <tspan fill="#0F172A">Doc</tspan><tspan fill="#4F46E5">Scalar</tspan>
  </text>
</svg>'''

svg_full_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1050 240" width="1050" height="240">
  <rect width="1050" height="240" rx="20" fill="#0F172A"/>
  <g transform="translate(40, 40)">
    <g transform="scale(0.16666, 0.16666)">
      <g transform="translate(0, 960) scale(1, -1)" fill="#6366F1">
        <path d="{GLYPH_PATH}"/>
      </g>
    </g>
  </g>
  <text x="215" y="160" font-family="Plus Jakarta Sans, Inter, Arial, sans-serif" font-size="115" font-weight="700" letter-spacing="-2px">
    <tspan fill="#FFFFFF">Doc</tspan><tspan fill="#6366F1">Scalar</tspan>
  </text>
</svg>'''

def render(svg_str, out_path, dpi=180, alpha=True):
    doc = fitz.open(stream=svg_str.encode('utf-8'), filetype='svg')
    pix = doc[0].get_pixmap(dpi=dpi, alpha=alpha)
    pix.save(out_path)
    return out_path

root_dir = r"c:\Users\Tanvir Alam\Downloads\New folder upscaled"
public_dir = os.path.join(root_dir, "public")
artifact_dir = r"C:\Users\Tanvir Alam\.gemini\antigravity\brain\6cef2094-c0a8-4a06-a6d7-c7c2c8db137f"

# Save SVGs
for name, content in [("docscalar_logo.svg", svg_full_transparent), ("docscalar_logo_white.svg", svg_full_white)]:
    with open(os.path.join(root_dir, name), "w", encoding="utf-8") as f:
        f.write(content)
    with open(os.path.join(public_dir, name), "w", encoding="utf-8") as f:
        f.write(content)

# Render PNGs
render(svg_full_transparent, os.path.join(root_dir, "docscalar_logo.png"), dpi=200, alpha=True)
render(svg_full_white, os.path.join(root_dir, "docscalar_logo_white.png"), dpi=200, alpha=False)
render(svg_full_dark, os.path.join(root_dir, "docscalar_logo_dark.png"), dpi=200, alpha=False)

for p in ["docscalar_logo.png", "docscalar_logo_white.png", "docscalar_logo_dark.png"]:
    shutil.copy(os.path.join(root_dir, p), os.path.join(public_dir, p))
    shutil.copy(os.path.join(root_dir, p), os.path.join(artifact_dir, p))

print("Rendered calibrated logos successfully!")
