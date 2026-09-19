import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Current keys in order
keys_raw = """
  adeline_palmerston    : { label: '👑 Adeline Palmerston', fn: generateAdelinePalmerstonHtml, badge: 'Exact Slate & Bronze', photoUrl: '/images/candidates/adeline_palmerston.jpg', candidateName: 'Adeline Palmerston' },
  adora_montminy        : { label: '👑 Adora Montminy', fn: generateAdoraMontminyHtml, badge: 'Exact Gradient Blue & Slate', photoUrl: '/images/candidates/adora_montminy.jpg', candidateName: 'Adora Montminy' },
  adam_fletcher         : { label: '👑 Adam Fletcher', fn: generateAdamFletcherHtml, badge: 'Exact Charcoal Bar Header', photoUrl: '/images/candidates/adam_fletcher.jpg', candidateName: 'Adam Fletcher' },
  richard_sanchez       : { label: '👑 Richard Sanchez', fn: generateRichardSanchezHtml, badge: 'Exact Royal Blue Banner', photoUrl: '/images/candidates/richard_sanchez.jpg', candidateName: 'Richard Sanchez' },
  sebastian_bennett     : { label: '👑 Sebastian Bennett', fn: generateSebastianBennettHtml, badge: 'Exact Executive Rounded Card', photoUrl: '/images/candidates/sebastian_bennett.jpg', candidateName: 'Sebastian Bennett' },
  lorna_alvarado        : { label: '👑 Lorna Alvarado', fn: generateLornaAlvaradoHtml, badge: 'Exact 3D Folded Ribbon', photoUrl: '/images/candidates/lorna_alvarado.jpg', candidateName: 'Lorna Alvarado' },
  donna_stroupe         : { label: '👑 Donna Stroupe', fn: generateDonnaStroupeHtml, badge: 'Exact Espresso Banner & Taupe', photoUrl: '/images/candidates/donna_stroupe.jpg', candidateName: 'Donna Stroupe' },
  isabel_schumacher     : { label: '👑 Isabel Schumacher', fn: generateIsabelSchumacherHtml, badge: 'Exact Charcoal Halo & Nodes', photoUrl: '/images/candidates/isabel_schumacher.jpg', candidateName: 'Isabel Schumacher' },
  howard_ong            : { label: '👑 Howard Ong', fn: generateHowardOngHtml, badge: 'Exact Burgundy Banner & Headroom', photoUrl: '/images/candidates/howard_ong.jpg', candidateName: 'Howard Ong' },
  terracotta_arch       : { label: '👑 Terracotta Arch', fn: generateTerracottaArchHtml, badge: 'Exact Terracotta & Sage Overview', photoUrl: '/images/candidates/terracotta_arch.jpg', candidateName: 'Harper Montgomery' },
  korina_villanueva     : { label: '👑 Korina Villanueva', fn: generateKorinaVillanuevaHtml, badge: 'Exact Chevron Pennant & Dots', photoUrl: '/images/candidates/korina_villanueva.jpg', candidateName: 'Korina Villanueva' },
  isabel_mercado        : { label: '👑 Isabel Mercado', fn: generateIsabelMercadoHtml, badge: 'Exact Framed Portrait & Pills', photoUrl: '/images/candidates/isabel_mercado.jpg', candidateName: 'Isabel Mercado' },
  jonathan_patterson    : { label: '👑 Jonathan Patterson', fn: generateJonathanPattersonHtml, badge: 'Exact Navy Arch Dome & Donut', photoUrl: '/images/candidates/jonathan_patterson.jpg', candidateName: 'Jonathan Patterson' },
  alfredo_torres        : { label: '👑 Alfredo Torres', fn: generateAlfredoTorresHtml, badge: 'Exact Geometric Vector Header', photoUrl: '/images/candidates/alfredo_torres.jpg', candidateName: 'Alfredo Torres' },
  marcus_vance          : { label: '👑 Marcus Vance', fn: generateMarcusVanceHtml, badge: 'Exact Monolithic Slate & Teal', photoUrl: '/images/candidates/marcus_vance.jpg', candidateName: 'Marcus Vance' },
  arthur_pendelton      : { label: '👑 Arthur Pendelton', fn: generateArthurPendeltonHtml, badge: 'Exact Editorial Swiss & Newsreader', photoUrl: '/images/candidates/arthur_pendelton.jpg', candidateName: 'Arthur Pendelton' },
  diagonal_wedge        : { label: '✨ Diagonal Wedge', fn: generateDiagonalWedgeHtml, badge: 'Polygon Cut & 5-Dots', photoUrl: '/images/candidates/diagonal_wedge.jpg', candidateName: 'Marcus Sterling' },
  floating_card_matrix  : { label: '✨ Floating Cards', fn: generateFloatingCardMatrixHtml, badge: 'Modular Cards & Bars', photoUrl: '/images/candidates/floating_card_matrix.jpg', candidateName: 'Clara Oswald' },
  split_dual_block      : { label: '✨ Split Dual Block', fn: generateSplitDualBlockHtml, badge: 'Forest & Peach Box', photoUrl: '/images/candidates/split_dual_block.jpg', candidateName: 'Evelyn St. Claire' },
  overlapping_badge     : { label: '✨ Overlap Badge', fn: generateOverlappingBadgeHtml, badge: 'Navy Banner Halo Badge', photoUrl: '/images/candidates/overlapping_badge.jpg', candidateName: 'Alexander Hayes' },
  mariana               : { label: '✨ Mariana', fn: generateMarianaHtml, badge: 'Premium Headshot', photoUrl: '/images/candidates/mariana.jpg', candidateName: 'Mariana Anderson' },
  olivia                : { label: '✨ Olivia', fn: generateOliviaHtml, badge: 'Premium Bronze', photoUrl: '/images/candidates/olivia.jpg', candidateName: 'Olivia Sterling' },
  jonathan              : { label: '✨ Jonathan', fn: generateJonathanHtml, badge: 'Classic Serif', photoUrl: '/images/candidates/jonathan.jpg', candidateName: 'Jonathan Brewer' },
  emma                  : { label: '✨ Emma', fn: generateEmmaHtml, badge: 'Balanced Split', photoUrl: '/images/candidates/emma.jpg', candidateName: 'Emma Sinclair' },
  charles               : { label: '✨ Charles', fn: generateCharlesHtml, badge: 'Ocean Teal', photoUrl: '/images/candidates/charles.jpg', candidateName: 'Charles Rodriguez' },
  kathleen              : { label: '✨ Kathleen', fn: generateKathleenHtml, badge: 'Modern Accent', photoUrl: '/images/candidates/kathleen.jpg', candidateName: 'Kathleen Jenkins' },
  richard               : { label: '✨ Richard', fn: generateRichardHtml, badge: 'Split Band', photoUrl: '/images/candidates/richard.jpg', candidateName: 'Richard Fowler' },
  sanchez_dark          : { label: '✨ Sanchez Dark', fn: generateSanchezDarkHtml, badge: 'Timeline Sidebar', photoUrl: '/images/candidates/sanchez_dark.jpg', candidateName: 'Mateo Sanchez' },
  wilson_light          : { label: '✨ Wilson Light', fn: generateWilsonLightHtml, badge: 'Modern Navy', photoUrl: '/images/candidates/wilson_light.jpg', candidateName: 'Marcus Wilson' },
  sanchez_mono          : { label: '✨ Sanchez Mono', fn: generateSanchezMonoHtml, badge: 'Minimalist Timeline', photoUrl: '/images/candidates/sanchez_mono.jpg', candidateName: 'Yuki Sanchez' },
  sanchez_wave          : { label: '✨ Sanchez Wave', fn: generateSanchezWaveHtml, badge: 'Elegant Waves', photoUrl: '/images/candidates/sanchez_wave.jpg', candidateName: 'Mei Sanchez' },
  ong_burgundy          : { label: '✨ Howard Burgundy', fn: generateOngBurgundyHtml, badge: 'Burgundy Classic', photoUrl: '/images/candidates/ong_burgundy.jpg', candidateName: 'David Howard' },
  schumacher_charcoal   : { label: '✨ Schumacher Charcoal', fn: generateSchumacherCharcoalHtml, badge: 'Curved Headshot', photoUrl: '/images/candidates/schumacher_charcoal.jpg', candidateName: 'Layla Schumacher' },
  ziv_olive             : { label: '✨ Catrine Olive', fn: generateZivOliveHtml, badge: 'Sage Split', photoUrl: '/images/candidates/ziv_olive.jpg', candidateName: 'Catrine Olive' },
  adora_diagonal        : { label: '✨ Adora Diagonal', fn: generateAdoraDiagonalHtml, badge: 'Diagonal Waves', photoUrl: '/images/candidates/adora_diagonal.jpg', candidateName: 'Adora Sharma' },
  wilson_minimal        : { label: '✨ Wilson Minimal', fn: generateWilsonMinimalHtml, badge: 'Elegant Border', photoUrl: '/images/candidates/wilson_minimal.jpg', candidateName: 'Mariana Wilson' },
  alvarado_slate        : { label: '✨ Lorna Slate', fn: generateAlvaradoSlateHtml, badge: 'Slate Ribbon', photoUrl: '/images/candidates/alvarado_slate.jpg', candidateName: 'Lorna Slate' },
  kelly_mint            : { label: '✨ Kelly Mint', fn: generateKellyMintHtml, badge: 'Mint Highlight', photoUrl: '/images/candidates/kelly_mint.jpg', candidateName: 'Kelly Blackwell' },
  berlin_two_tone       : { label: '✨ Berlin Two-Tone', fn: generateBerlinTwoToneHtml, badge: 'Warm Tan Card', photoUrl: '/images/candidates/berlin_two_tone.jpg', candidateName: 'David Berlin' },
  card_matrix           : { label: '✨ Card Matrix', fn: generateCardMatrixHtml, badge: 'Boxed Tech Cards', photoUrl: '/images/candidates/card_matrix.jpg', candidateName: 'Alex Mercer' },
  violet_modern         : { label: '✨ Violet Modern', fn: generateVioletModernHtml, badge: 'Electric Violet', photoUrl: '/images/candidates/violet_modern.jpg', candidateName: 'Elena Rostova' },
  date_capsule          : { label: '✨ Date Capsule', fn: generateDateCapsuleHtml, badge: 'Capsule Timeline', photoUrl: '/images/candidates/date_capsule.jpg', candidateName: 'Jason Vance' },
  sage_pastel           : { label: '✨ Sage Mist', fn: generateSagePastelHtml, badge: 'Pastel Sage', photoUrl: '/images/candidates/sage_pastel.jpg', candidateName: 'Claire Laurent' },
  lilac_sidebar         : { label: '✨ Lilac Harmony', fn: generateLilacSidebarHtml, badge: 'Lavender Sidebar', photoUrl: '/images/candidates/lilac_sidebar.jpg', candidateName: 'Chloe Bennett' },
  ocean_block           : { label: '✨ Ocean Block', fn: generateOceanBlockHtml, badge: 'Navy Block Header', photoUrl: '/images/candidates/ocean_block.jpg', candidateName: 'Julian Hayes' },
  cambridge_rose        : { label: '✨ Cambridge Rose', fn: generateCambridgeRoseHtml, badge: 'Rose Duo-Tone', photoUrl: '/images/candidates/cambridge_rose.jpg', candidateName: 'Clara Cambridge' },
  stockholm_yellow      : { label: '✨ Stockholm Gold', fn: generateStockholmYellowHtml, badge: 'Gold Asymmetric', photoUrl: '/images/candidates/stockholm_yellow.jpg', candidateName: 'Astrid Lindqvist' },
  emerald_prestige      : { label: '✨ Emerald Prestige', fn: generateEmeraldPrestigeHtml, badge: 'Forest Badge Matrix', photoUrl: '/images/candidates/emerald_prestige.jpg', candidateName: 'Arthur Vance' },
  bordeaux_wine         : { label: '✨ Bordeaux Wine', fn: generateBordeauxWineHtml, badge: 'Wine Executive Split', photoUrl: '/images/candidates/bordeaux_wine.jpg', candidateName: 'Genevieve Bordeaux' },
  tokyo_ice_blue        : { label: '✨ Tokyo Ice Blue', fn: generateTokyoIceBlueHtml, badge: 'Steel Studio Cards', photoUrl: '/images/candidates/tokyo_ice_blue.jpg', candidateName: 'Kenji Takahashi' },
  vienna_crest          : { label: '✨ Vienna Crest', fn: generateViennaCrestHtml, badge: 'European Academic', photoUrl: '/images/candidates/vienna_crest.jpg', candidateName: 'Dr. Stefan Weber' },
  oslo_taupe            : { label: '✨ Oslo Taupe', fn: generateOsloTaupeHtml, badge: 'Warm Espresso Minimal', photoUrl: '/images/candidates/oslo_taupe.jpg', candidateName: 'Freja Lind' },
  kyoto_coral           : { label: '✨ Kyoto Coral', fn: generateKyotoCoralHtml, badge: 'Coral Minimalist Grid', photoUrl: '/images/candidates/kyoto_coral.jpg', candidateName: 'Hana Tanaka' },
  zurich_slate_block    : { label: '✨ Zurich Slate', fn: generateZurichSlateBlockHtml, badge: 'Slate Indigo Block', photoUrl: '/images/candidates/zurich_slate_block.jpg', candidateName: 'Dominik Weber' },
  barcelona_cyan        : { label: '✨ Barcelona Cyan', fn: generateBarcelonaCyanHtml, badge: 'Cyan Tech Modern', photoUrl: '/images/candidates/barcelona_cyan.jpg', candidateName: 'Javier Gomez' },
  geneva_charcoal       : { label: '✨ Geneva Charcoal', fn: generateGenevaCharcoalHtml, badge: 'Charcoal Gold Exec', photoUrl: '/images/candidates/geneva_charcoal.jpg', candidateName: 'Henri Laurent' },
  milan_blush           : { label: '✨ Milan Blush', fn: generateMilanBlushHtml, badge: 'Blush Peach Editorial', photoUrl: '/images/candidates/milan_blush.jpg', candidateName: 'Alessandra Rossi' },
  helsinki_navy         : { label: '✨ Helsinki Navy', fn: generateHelsinkiNavyHtml, badge: 'Navy Mint Tech', photoUrl: '/images/candidates/helsinki_navy.jpg', candidateName: 'Elias Lindqvist' },
  oxford_burgundy       : { label: '✨ Oxford Burgundy', fn: generateOxfordBurgundyHtml, badge: 'British Academic', photoUrl: '/images/candidates/oxford_burgundy.jpg', candidateName: 'Prof. Lawrence Sterling' },
  dublin_forest         : { label: '✨ Dublin Forest', fn: generateDublinForestHtml, badge: 'Forest Ochre Botanical', photoUrl: '/images/candidates/dublin_forest.jpg', candidateName: 'Ciara O’Connor' },
  manhattan_noir        : { label: '✨ Manhattan Noir', fn: generateManhattanNoirHtml, badge: 'Monochrome Wall St', photoUrl: '/images/candidates/manhattan_noir.jpg', candidateName: 'Alexander Vance' },
  montreal_frost        : { label: '✨ Montreal Frost', fn: generateMontrealFrostHtml, badge: 'Azure Frost Cards', photoUrl: '/images/candidates/montreal_frost.jpg', candidateName: 'Camille Beaulieu' },
  florence_terracotta   : { label: '✨ Florence Terracotta', fn: generateFlorenceTerracottaHtml, badge: 'Terracotta Linen', photoUrl: '/images/candidates/florence_terracotta.jpg', candidateName: 'Matteo Moretti' },
  copenhagen_sand       : { label: '✨ Copenhagen Sand', fn: generateCopenhagenSandHtml, badge: 'Nordic Sand Minimal', photoUrl: '/images/candidates/copenhagen_sand.jpg', candidateName: 'Signe Møller' },
  seoul_neon            : { label: '✨ Seoul Neon', fn: generateSeoulNeonHtml, badge: 'Midnight Violet Matrix', photoUrl: '/images/candidates/seoul_neon.jpg', candidateName: 'Ji-hoon Park' },
  austin_amber          : { label: '✨ Austin Amber', fn: generateAustinAmberHtml, badge: 'Teal Amber Startup', photoUrl: '/images/candidates/austin_amber.jpg', candidateName: 'Wyatt Sterling' },
  edinburgh_navy        : { label: '✨ Edinburgh Navy', fn: generateEdinburghNavyHtml, badge: 'Royal Navy Classic', photoUrl: '/images/candidates/edinburgh_navy.jpg', candidateName: 'Alistair MacLeod' },
  kyiv_golden           : { label: '✨ Kyiv Golden', fn: generateKyivGoldenHtml, badge: 'Golden Wheat Split', photoUrl: '/images/candidates/kyiv_golden.jpg', candidateName: 'Oksana Kovalenko' },
  singapore_ruby        : { label: '✨ Singapore Ruby', fn: generateSingaporeRubyHtml, badge: 'Ruby Crimson Fintech', photoUrl: '/images/candidates/singapore_ruby.jpg', candidateName: 'Derrick Chen' },
  venice_sand_split     : { label: '✨ Venice Sand', fn: generateVeniceSandSplitHtml, badge: 'Sand Espresso Luxury', photoUrl: '/images/candidates/venice_sand_split.jpg', candidateName: 'Gianna Bellini' },
  boston_crimson        : { label: '✨ Boston Crimson', fn: generateBostonCrimsonHtml, badge: 'Ivy League Crimson', photoUrl: '/images/candidates/boston_crimson.jpg', candidateName: 'Harrison Ford' },
  madrid_sun            : { label: '✨ Madrid Sun', fn: generateMadridSunHtml, badge: 'Solar Gold High-Contrast', photoUrl: '/images/candidates/madrid_sun.jpg', candidateName: 'Carlos Vega' },
  osaka_minimal         : { label: '✨ Osaka Minimal', fn: generateOsakaMinimalHtml, badge: 'Technical Monospace', photoUrl: '/images/candidates/osaka_minimal.jpg', candidateName: 'Ren Sato' },
  san_francisco_skyline : { label: '✨ SF Skyline', fn: generateSanFranciscoSkylineHtml, badge: 'Sky Blue Tech', photoUrl: '/images/candidates/san_francisco_skyline.jpg', candidateName: 'Jordan Hayes' },
  amsterdam_orange      : { label: '✨ Amsterdam Orange', fn: generateAmsterdamOrangeHtml, badge: 'Indigo Orange Dutch', photoUrl: '/images/candidates/amsterdam_orange.jpg', candidateName: 'Lars van der Meer' },
  stockholm_monochrome  : { label: '✨ Stockholm Mono', fn: generateStockholmMonochromeHtml, badge: 'Nordic Pure Mono Grid', photoUrl: '/images/candidates/stockholm_monochrome.jpg', candidateName: 'Frederik Lind' },
  prague_brass          : { label: '✨ Prague Brass', fn: generatePragueBrassHtml, badge: 'Olive Brass Academic', photoUrl: '/images/candidates/prague_brass.jpg', candidateName: 'Václav Dvořák' },
  cairo_gold            : { label: '✨ Cairo Gold', fn: generateCairoGoldHtml, badge: 'Obsidian Gold Luxury', photoUrl: '/images/candidates/cairo_gold.jpg', candidateName: 'Tarek Mansour' },
  reykjavik_slate       : { label: '✨ Reykjavik Slate', fn: generateReykjavikSlateHtml, badge: 'Glacial Ice Nordic', photoUrl: '/images/candidates/reykjavik_slate.jpg', candidateName: 'Astrid Jónsdóttir' },
  buenos_aires_tango    : { label: '✨ Buenos Aires Tango', fn: generateBuenosAiresTangoHtml, badge: 'Plum Champagne Arts', photoUrl: '/images/candidates/buenos_aires_tango.jpg', candidateName: 'Valentina Soler' },
  vancouver_pine        : { label: '✨ Vancouver Pine', fn: generateVancouverPineHtml, badge: 'Pine Timber CleanTech', photoUrl: '/images/candidates/vancouver_pine.jpg', candidateName: 'Liam MacIntyre' },
  lyon_lavender         : { label: '✨ Lyon Lavender', fn: generateLyonLavenderHtml, badge: 'Lavender Creative Studio', photoUrl: '/images/candidates/lyon_lavender.jpg', candidateName: 'Amélie Laurent' },
  seattle_emerald       : { label: '✨ Seattle Emerald', fn: generateSeattleEmeraldHtml, badge: 'Emerald Teal Cloud', photoUrl: '/images/candidates/seattle_emerald.jpg', candidateName: 'Noah Vance' },
  cape_town_sunset      : { label: '✨ Cape Town Sunset', fn: generateCapeTownSunsetHtml, badge: 'Terracotta Gold Coastal', photoUrl: '/images/candidates/cape_town_sunset.jpg', candidateName: 'Thabo Ndlovu' },
  helsinki_frost        : { label: '✨ Helsinki Frost', fn: generateHelsinkiFrostHtml, badge: 'Frosted Ice Exec Classic', photoUrl: '/images/candidates/helsinki_frost.jpg', candidateName: 'Matti Virtanen' },
"""

entries = {}
for line in keys_raw.strip().split('\n'):
    line = line.strip()
    if not line: continue
    m = re.match(r'([a-z0-9_]+)\s*:\s*(\{.*\}),?', line)
    if m:
        entries[m.group(1)] = m.group(2)

print(f"Parsed {len(entries)} templates.")

# Flagship 16
crown_keys = [
    'adeline_palmerston', 'adora_montminy', 'adam_fletcher', 'richard_sanchez',
    'sebastian_bennett', 'lorna_alvarado', 'donna_stroupe', 'isabel_schumacher',
    'howard_ong', 'terracotta_arch', 'korina_villanueva', 'isabel_mercado',
    'jonathan_patterson', 'alfredo_torres', 'marcus_vance', 'arthur_pendelton'
]

# Top tier ✨
featured_keys = [
    'diagonal_wedge', 'floating_card_matrix', 'split_dual_block', 'overlapping_badge',
    'card_matrix', 'date_capsule', 'berlin_two_tone', 'geneva_charcoal',
    'tokyo_ice_blue', 'manhattan_noir', 'dublin_forest', 'florence_terracotta',
    'seoul_neon', 'cairo_gold', 'venice_sand_split', 'emerald_prestige'
]

other_keys = [k for k in entries if k not in crown_keys and k not in featured_keys]

print(f"Crown: {len(crown_keys)}, Featured: {len(featured_keys)}, Other: {len(other_keys)}")

# Let's create an interleaved list
shuffled = []
c_idx, f_idx, o_idx = 0, 0, 0

# Total is 85. We can create groups of 5: [Crown, Featured, Other, Other, Other] or [Crown, Other, Featured, Other, Other]
while c_idx < len(crown_keys) or f_idx < len(featured_keys) or o_idx < len(other_keys):
    if c_idx < len(crown_keys):
        shuffled.append(crown_keys[c_idx])
        c_idx += 1
    if o_idx < len(other_keys):
        shuffled.append(other_keys[o_idx])
        o_idx += 1
    if f_idx < len(featured_keys):
        shuffled.append(featured_keys[f_idx])
        f_idx += 1
    if o_idx < len(other_keys):
        shuffled.append(other_keys[o_idx])
        o_idx += 1
    if o_idx < len(other_keys):
        shuffled.append(other_keys[o_idx])
        o_idx += 1
    if o_idx < len(other_keys) and c_idx >= len(crown_keys):
        shuffled.append(other_keys[o_idx])
        o_idx += 1

print(f"Total shuffled keys: {len(shuffled)}")
assert len(shuffled) == len(entries)
assert len(set(shuffled)) == len(entries)
print("✓ All 85 unique templates perfectly preserved and interleaved!")

# Format output
output_code = "const TEMPLATE_MAP = {\n"
for k in shuffled:
    output_code += f"  {k.ljust(22)}: {entries[k]},\n"
output_code += "};"

with open('scratch/shuffled_template_map.js', 'w', encoding='utf-8') as f:
    f.write(output_code)

print("Saved to scratch/shuffled_template_map.js")
