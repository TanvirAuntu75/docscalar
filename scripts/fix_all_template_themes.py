import os
import re

def fix_all_templates():
    print("Fixing themeColor across all identified templates...")

    # 1. donna_stroupe.js
    p = 'src/engines/utility/templates/donna_stroupe.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('#2b211d', '${espressoColor}')
    c = c.replace("themeColor = '${espressoColor}'", "themeColor = '#2b211d'")
    c = c.replace("? '${espressoColor}'", "? '#2b211d'")
    c = c.replace("Banner (${espressoColor})", "Banner (#2b211d)")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] donna_stroupe.js fixed")

    # 2. howard_ong.js
    p = 'src/engines/utility/templates/howard_ong.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('#802b3e', '${burgundyColor}')
    c = c.replace("themeColor = '${burgundyColor}'", "themeColor = '#802b3e'")
    c = c.replace("? '${burgundyColor}'", "? '#802b3e'")
    c = c.replace("Banner (${burgundyColor})", "Banner (#802b3e)")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] howard_ong.js fixed")

    # 3. isabel_mercado.js
    p = 'src/engines/utility/templates/isabel_mercado.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('#31353d', '${charcoalColor}')
    c = c.replace("themeColor = '${charcoalColor}'", "themeColor = '#31353d'")
    c = c.replace("? '${charcoalColor}'", "? '#31353d'")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] isabel_mercado.js fixed")

    # 4. isabel_schumacher.js
    p = 'src/engines/utility/templates/isabel_schumacher.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('#2e3440', '${charcoalColor}')
    c = c.replace("themeColor = '${charcoalColor}'", "themeColor = '#2e3440'")
    c = c.replace("? '${charcoalColor}'", "? '#2e3440'")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] isabel_schumacher.js fixed")

    # 5. jonathan_patterson.js
    p = 'src/engines/utility/templates/jonathan_patterson.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('#1b324d', '${navyColor}')
    c = c.replace("themeColor = '${navyColor}'", "themeColor = '#1b324d'")
    c = c.replace("? '${navyColor}'", "? '#1b324d'")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] jonathan_patterson.js fixed")

    # 6. korina_villanueva.js
    p = 'src/engines/utility/templates/korina_villanueva.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('#1a2b49', '${navyColor}')
    c = c.replace("themeColor = '${navyColor}'", "themeColor = '#1a2b49'")
    c = c.replace("? '${navyColor}'", "? '#1a2b49'")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] korina_villanueva.js fixed")

    # 7. lorna_alvarado.js
    p = 'src/engines/utility/templates/lorna_alvarado.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('#475569', '${slateColor}')
    c = c.replace("themeColor = '${slateColor}'", "themeColor = '#475569'")
    c = c.replace("? '${slateColor}'", "? '#475569'")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] lorna_alvarado.js fixed")

    # 8. terracotta_arch.js
    p = 'src/engines/utility/templates/terracotta_arch.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('#a9533b', '${terracottaColor}')
    c = c.replace("themeColor = '${terracottaColor}'", "themeColor = '#a9533b'")
    c = c.replace("? '${terracottaColor}'", "? '#a9533b'")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] terracotta_arch.js fixed")

    # 9. schumacher_charcoal.js
    p = 'src/engines/utility/templates/schumacher_charcoal.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('#2f2e2d', '${accent}')
    c = c.replace("themeColor = '${accent}'", "themeColor = '#2f2e2d'")
    c = c.replace("? '${accent}'", "? '#2f2e2d'")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] schumacher_charcoal.js fixed")

    # 10. alfredo_torres.js
    p = 'src/engines/utility/templates/alfredo_torres.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    if 'export const generateAlfredoTorresHtml' in c:
        c = c.replace(
            "export const generateAlfredoTorresHtml = (data = {}) => {",
            """export function generateAlfredoTorresHtml(
  data = {},
  themeColor = '#b89358',
  themeFont = 'Plus Jakarta Sans',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#b89358' : themeColor;"""
        )
        c = c.replace('fill="#b89358"', 'fill="${accent}"')
        c = c.replace('background-color: #b89358;', 'background-color: ${accent};')
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] alfredo_torres.js fixed")

    # 11. marcus_vance.js
    p = 'src/engines/utility/templates/marcus_vance.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    if 'export const generateMarcusVanceHtml' in c:
        c = c.replace(
            "export const generateMarcusVanceHtml = (data = {}) => {",
            """export function generateMarcusVanceHtml(
  data = {},
  themeColor = '#0d9488',
  themeFont = 'Space Grotesk',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0d9488' : themeColor;"""
        )
        c = c.replace('#0d9488', '${accent}')
        c = c.replace("themeColor = '${accent}'", "themeColor = '#0d9488'")
        c = c.replace("? '${accent}'", "? '#0d9488'")
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] marcus_vance.js fixed")

    # 12. arthur_pendelton.js
    p = 'src/engines/utility/templates/arthur_pendelton.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    if 'export const generateArthurPendeltonHtml' in c:
        c = c.replace(
            "export const generateArthurPendeltonHtml = (data = {}) => {",
            """export function generateArthurPendeltonHtml(
  data = {},
  themeColor = '#0f172a',
  themeFont = 'Inter',
  sectionOrder = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications'],
  themeLayout = 'single',
  pageMargin = 0,
  lineSpacing = 1.45
) {
  const accent = themeColor === 'default' || !themeColor ? '#0f172a' : themeColor;"""
        )
        c = c.replace('border-bottom: 1.5px solid #0f172a;', 'border-bottom: 1.5px solid ${accent};')
        c = c.replace("color: #0f172a;", "color: ${accent};")
        c = c.replace('background-color: #0f172a;', 'background-color: ${accent};')
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] arthur_pendelton.js fixed")

    # 13. jakes_monochrome.js
    p = 'src/engines/utility/templates/jakes_monochrome.js'
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    if 'const accent =' not in c:
        c = c.replace(
            "const fontFam =",
            "const accent = themeColor === 'default' || !themeColor ? '#000000' : themeColor;\n  const fontFam ="
        )
        c = c.replace('border-bottom: 1px solid #111;', 'border-bottom: 1.5px solid ${accent};')
        c = c.replace('color: #111;', 'color: ${accent};')
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)
    print("[OK] jakes_monochrome.js fixed")

if __name__ == '__main__':
    fix_all_templates()
