import fitz
import os

svg_text = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100" width="800" height="200">
  <rect width="100%" height="100%" fill="white"/>
  <text x="50" y="60" font-family="Arial" font-size="40" font-weight="bold" fill="#0f172a">Doc<tspan fill="#4f46e5">Scalar</tspan></text>
</svg>"""

doc = fitz.open(stream=svg_text.encode('utf-8'), filetype='svg')
pix = doc[0].get_pixmap(dpi=150)
pix.save("test_text_render.png")
print("Rendered text successfully, size:", pix.width, pix.height)
