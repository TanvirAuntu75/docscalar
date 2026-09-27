import fitz
import os
import shutil
from PIL import Image

# Exact glyph path extracted directly from Material Symbols Outlined in public/fonts
# Units: 960x960 grid
GLYPH_PATH = (
    "M320 240H640V320H320ZM320 400H640V480H320ZM240 80Q207 80 183.5 103.5"
    "Q160 127 160 160V800Q160 833 183.5 856.5Q207 880 240 880H560L800 640"
    "V160Q800 127 776.5 103.5Q753 80 720 80ZM520 600V800H240Q240 800 240.0 800.0"
    "Q240 800 240 800V160Q240 160 240.0 160.0Q240 160 240 160H720Q720 160 720.0 160.0"
    "Q720 160 720 160V600ZM240 800V600V800V600V160Q240 160 240.0 160.0"
    "Q240 160 240 160Q240 160 240.0 160.0Q240 160 240 160V800Q240 800 240.0 800.0"
    "Q240 800 240 800Z"
)

# 1. ICON ONLY - Vector SVG (Transparent)
svg_icon_transparent = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960" width="512" height="512">
  <g transform="translate(0, 960) scale(1, -1)" fill="#4F46E5">
    <path d="{GLYPH_PATH}"/>
  </g>
</svg>'''

# 2. ICON ONLY - Vector SVG (White Background Square with rounded corners)
svg_icon_white = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960" width="512" height="512">
  <rect width="960" height="960" fill="#FFFFFF"/>
  <g transform="translate(0, 960) scale(1, -1)" fill="#4F46E5">
    <path d="{GLYPH_PATH}"/>
  </g>
</svg>'''

# 3. ICON ONLY - Vector SVG (Dark Slate Background for Dark Theme)
svg_icon_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960" width="512" height="512">
  <rect width="960" height="960" rx="160" fill="#0F172A"/>
  <g transform="translate(0, 960) scale(1, -1)" fill="#6366F1">
    <path d="{GLYPH_PATH}"/>
  </g>
</svg>'''

# 4. FULL LOGO LOCKUP - Horizontal [Icon] DocScalar (Transparent)
# Canvas: 1800 x 480
svg_full_transparent = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480" width="1600" height="480">
  <!-- Document Icon -->
  <g transform="translate(40, -180) scale(0.9, 0.9)">
    <g transform="translate(0, 960) scale(1, -1)" fill="#4F46E5">
      <path d="{GLYPH_PATH}"/>
    </g>
  </g>
  <!-- Brand Text -->
  <text x="640" y="315" font-family="Plus Jakarta Sans, Inter, system-ui, -apple-system, sans-serif" font-size="270" font-weight="700" letter-spacing="-6px">
    <tspan fill="#0F172A">Doc</tspan><tspan fill="#4F46E5">Scalar</tspan>
  </text>
</svg>'''

# 5. FULL LOGO LOCKUP - Horizontal [Icon] DocScalar (White Background)
svg_full_white = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480" width="1600" height="480">
  <rect width="1600" height="480" fill="#FFFFFF"/>
  <!-- Document Icon -->
  <g transform="translate(40, -180) scale(0.9, 0.9)">
    <g transform="translate(0, 960) scale(1, -1)" fill="#4F46E5">
      <path d="{GLYPH_PATH}"/>
    </g>
  </g>
  <!-- Brand Text -->
  <text x="640" y="315" font-family="Plus Jakarta Sans, Inter, system-ui, -apple-system, sans-serif" font-size="270" font-weight="700" letter-spacing="-6px">
    <tspan fill="#0F172A">Doc</tspan><tspan fill="#4F46E5">Scalar</tspan>
  </text>
</svg>'''

# 6. FULL LOGO LOCKUP - Dark Background (for Dark Mode / Pitch Decks)
svg_full_dark = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 480" width="1600" height="480">
  <rect width="1600" height="480" rx="32" fill="#0F172A"/>
  <!-- Document Icon -->
  <g transform="translate(40, -180) scale(0.9, 0.9)">
    <g transform="translate(0, 960) scale(1, -1)" fill="#6366F1">
      <path d="{GLYPH_PATH}"/>
    </g>
  </g>
  <!-- Brand Text -->
  <text x="640" y="315" font-family="Plus Jakarta Sans, Inter, system-ui, -apple-system, sans-serif" font-size="270" font-weight="700" letter-spacing="-6px">
    <tspan fill="#FFFFFF">Doc</tspan><tspan fill="#6366F1">Scalar</tspan>
  </text>
</svg>'''

def render_svg_to_png(svg_str, output_path, dpi=150, alpha=True):
    doc = fitz.open(stream=svg_str.encode('utf-8'), filetype='svg')
    pix = doc[0].get_pixmap(dpi=dpi, alpha=alpha)
    pix.save(output_path)
    print(f"Rendered: {output_path} ({pix.width}x{pix.height})")
    return output_path

# Target directories
root_dir = r"c:\Users\Tanvir Alam\Downloads\New folder upscaled"
public_dir = os.path.join(root_dir, "public")
artifact_dir = r"C:\Users\Tanvir Alam\.gemini\antigravity\brain\6cef2094-c0a8-4a06-a6d7-c7c2c8db137f"

# Save SVGs
svg_files = {
    "docscalar_icon.svg": svg_icon_transparent,
    "docscalar_icon_white.svg": svg_icon_white,
    "docscalar_logo.svg": svg_full_transparent,
    "docscalar_logo_white.svg": svg_full_white,
}

for name, content in svg_files.items():
    with open(os.path.join(root_dir, name), "w", encoding="utf-8") as f:
        f.write(content)
    with open(os.path.join(public_dir, name), "w", encoding="utf-8") as f:
        f.write(content)

# Render PNGs (high DPI for crystal-clear 1024+ resolution)
render_svg_to_png(svg_icon_transparent, os.path.join(root_dir, "docscalar_icon.png"), dpi=192, alpha=True)
render_svg_to_png(svg_icon_white, os.path.join(root_dir, "docscalar_icon_white.png"), dpi=192, alpha=False)
render_svg_to_png(svg_full_transparent, os.path.join(root_dir, "docscalar_logo.png"), dpi=150, alpha=True)
render_svg_to_png(svg_full_white, os.path.join(root_dir, "docscalar_logo_white.png"), dpi=150, alpha=False)
render_svg_to_png(svg_full_dark, os.path.join(root_dir, "docscalar_logo_dark.png"), dpi=150, alpha=False)

# Copy to public and artifact folders for user review
png_files = [
    "docscalar_icon.png",
    "docscalar_icon_white.png",
    "docscalar_logo.png",
    "docscalar_logo_white.png",
    "docscalar_logo_dark.png"
]

for p in png_files:
    src = os.path.join(root_dir, p)
    dst_pub = os.path.join(public_dir, p)
    dst_art = os.path.join(artifact_dir, p)
    shutil.copy(src, dst_pub)
    shutil.copy(src, dst_art)

print("All brand assets generated and synchronized successfully!")
