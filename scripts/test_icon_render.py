import fitz
import os
from PIL import Image

# 1. Test rendering the exact description icon from font
# Note: In font coords, xMin: 160, yMin: 80, xMax: 800, yMax: 880. Width = 640, Height = 800.
# We flip Y: translate(0, 960) scale(1, -1).
svg_icon = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 960" width="512" height="512">
  <g transform="translate(0, 960) scale(1, -1)" fill="#4f46e5">
    <path d="M320 240H640V320H320ZM320 400H640V480H320ZM240 80Q207 80 183.5 103.5Q160 127 160 160V800Q160 833 183.5 856.5Q207 880 240 880H560L800 640V160Q800 127 776.5 103.5Q753 80 720 80ZM520 600V800H240Q240 800 240.0 800.0Q240 800 240 800V160Q240 160 240.0 160.0Q240 160 240 160H720Q720 160 720.0 160.0Q720 160 720 160V600ZM240 800V600V800V600V160Q240 160 240.0 160.0Q240 160 240 160Q240 160 240.0 160.0Q240 160 240 160V800Q240 800 240.0 800.0Q240 800 240 800Z"/>
  </g>
</svg>"""

doc = fitz.open(stream=svg_icon.encode('utf-8'), filetype='svg')
pix = doc[0].get_pixmap(dpi=150)
pix.save("test_extracted_icon.png")
print("Saved test_extracted_icon.png, size:", pix.width, pix.height)
