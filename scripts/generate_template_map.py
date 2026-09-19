import sys
sys.stdout.reconfigure(encoding='utf-8')

MAP_ENTRIES = [
    # 👑 EXACT CANVA REPLICAS (13)
    ("adeline_palmerston",   "👑 Adeline Palmerston",     "generateAdelinePalmerstonHtml",     "Exact Slate & Bronze",            "Adeline Palmerston"),
    ("adora_montminy",       "👑 Adora Montminy",         "generateAdoraMontminyHtml",         "Exact Gradient Blue & Slate",     "Adora Montminy"),
    ("adam_fletcher",        "👑 Adam Fletcher",          "generateAdamFletcherHtml",          "Exact Charcoal Bar Header",       "Adam Fletcher"),
    ("richard_sanchez",      "👑 Richard Sanchez",        "generateRichardSanchezHtml",        "Exact Royal Blue Banner",         "Richard Sanchez"),
    ("sebastian_bennett",    "👑 Sebastian Bennett",      "generateSebastianBennettHtml",      "Exact Executive Rounded Card",    "Sebastian Bennett"),
    ("lorna_alvarado",       "👑 Lorna Alvarado",         "generateLornaAlvaradoHtml",         "Exact 3D Folded Ribbon",          "Lorna Alvarado"),
    ("donna_stroupe",        "👑 Donna Stroupe",          "generateDonnaStroupeHtml",          "Exact Espresso Banner & Taupe",   "Donna Stroupe"),
    ("isabel_schumacher",    "👑 Isabel Schumacher",      "generateIsabelSchumacherHtml",      "Exact Charcoal Halo & Nodes",     "Isabel Schumacher"),
    ("howard_ong",           "👑 Howard Ong",             "generateHowardOngHtml",             "Exact Burgundy Banner & Headroom","Howard Ong"),
    ("terracotta_arch",      "👑 Terracotta Arch",        "generateTerracottaArchHtml",        "Exact Terracotta & Sage Overview","Harper Montgomery"),
    ("korina_villanueva",    "👑 Korina Villanueva",      "generateKorinaVillanuevaHtml",      "Exact Chevron Pennant & Dots",    "Korina Villanueva"),
    ("isabel_mercado",       "👑 Isabel Mercado",         "generateIsabelMercadoHtml",         "Exact Framed Portrait & Pills",   "Isabel Mercado"),
    ("jonathan_patterson",   "👑 Jonathan Patterson",     "generateJonathanPattersonHtml",     "Exact Navy Arch Dome & Donut",    "Jonathan Patterson"),

    # ✨ EXPANDED TEMPLATE CATALOG (28)
    ("diagonal_wedge",       "✨ Diagonal Wedge",         "generateDiagonalWedgeHtml",         "Polygon Cut & 5-Dots",            "Marcus Sterling"),
    ("floating_card_matrix", "✨ Floating Cards",         "generateFloatingCardMatrixHtml",    "Modular Cards & Bars",            "Clara Oswald"),
    ("split_dual_block",     "✨ Split Dual Block",       "generateSplitDualBlockHtml",        "Forest & Peach Box",              "Evelyn St. Claire"),
    ("overlapping_badge",    "✨ Overlap Badge",          "generateOverlappingBadgeHtml",      "Navy Banner Halo Badge",          "Alexander Hayes"),
    ("mariana",              "✨ Mariana",                "generateMarianaHtml",               "Premium Headshot",                "Mariana Anderson"),
    ("olivia",               "✨ Olivia",                 "generateOliviaHtml",                "Premium Bronze",                  "Olivia Sterling"),
    ("jonathan",             "✨ Jonathan",               "generateJonathanHtml",              "Classic Serif",                   "Jonathan Brewer"),
    ("emma",                 "✨ Emma",                   "generateEmmaHtml",                  "Balanced Split",                  "Emma Sinclair"),
    ("charles",              "✨ Charles",                "generateCharlesHtml",               "Ocean Teal",                      "Charles Rodriguez"),
    ("kathleen",             "✨ Kathleen",               "generateKathleenHtml",              "Modern Accent",                   "Kathleen Jenkins"),
    ("richard",              "✨ Richard",                "generateRichardHtml",               "Split Band",                      "Richard Fowler"),
    ("sanchez_dark",         "✨ Sanchez Dark",           "generateSanchezDarkHtml",           "Timeline Sidebar",                "Mateo Sanchez"),
    ("wilson_light",         "✨ Wilson Light",           "generateWilsonLightHtml",           "Modern Navy",                     "Marcus Wilson"),
    ("sanchez_mono",         "✨ Sanchez Mono",           "generateSanchezMonoHtml",           "Minimalist Timeline",             "Yuki Sanchez"),
    ("sanchez_wave",         "✨ Sanchez Wave",           "generateSanchezWaveHtml",           "Elegant Waves",                   "Mei Sanchez"),
    ("ong_burgundy",         "✨ Howard Burgundy",        "generateOngBurgundyHtml",           "Burgundy Classic",                "David Howard"),
    ("schumacher_charcoal",  "✨ Schumacher Charcoal",    "generateSchumacherCharcoalHtml",    "Curved Headshot",                 "Layla Schumacher"),
    ("ziv_olive",            "✨ Catrine Olive",          "generateZivOliveHtml",              "Sage Split",                      "Catrine Olive"),
    ("adora_diagonal",       "✨ Adora Diagonal",         "generateAdoraDiagonalHtml",         "Diagonal Waves",                  "Adora Sharma"),
    ("wilson_minimal",       "✨ Wilson Minimal",         "generateWilsonMinimalHtml",         "Elegant Border",                  "Mariana Wilson"),
    ("alvarado_slate",       "✨ Lorna Slate",            "generateAlvaradoSlateHtml",         "Slate Ribbon",                    "Lorna Slate"),
    ("kelly_mint",           "✨ Kelly Mint",             "generateKellyMintHtml",             "Mint Highlight",                  "Kelly Blackwell"),
    ("berlin_two_tone",      "✨ Berlin Two-Tone",        "generateBerlinTwoToneHtml",         "Warm Tan Card",                   "David Berlin"),
    ("card_matrix",          "✨ Card Matrix",            "generateCardMatrixHtml",            "Boxed Tech Cards",                "Alex Mercer"),
    ("violet_modern",        "✨ Violet Modern",          "generateVioletModernHtml",          "Electric Violet",                 "Elena Rostova"),
    ("date_capsule",         "✨ Date Capsule",           "generateDateCapsuleHtml",           "Capsule Timeline",                "Jason Vance"),
    ("sage_pastel",          "✨ Sage Mist",              "generateSagePastelHtml",            "Pastel Sage",                     "Claire Laurent"),
    ("lilac_sidebar",        "✨ Lilac Harmony",          "generateLilacSidebarHtml",          "Lavender Sidebar",                "Chloe Bennett"),

    # ✨ GLOBAL EXPANDED PORTFOLIO (41)
    ("ocean_block",          "✨ Ocean Block",            "generateOceanBlockHtml",            "Navy Block Header",               "Julian Hayes"),
    ("cambridge_rose",       "✨ Cambridge Rose",         "generateCambridgeRoseHtml",         "Rose Duo-Tone",                   "Clara Cambridge"),
    ("stockholm_yellow",     "✨ Stockholm Gold",         "generateStockholmYellowHtml",       "Gold Asymmetric",                 "Astrid Lindqvist"),
    ("emerald_prestige",     "✨ Emerald Prestige",       "generateEmeraldPrestigeHtml",       "Forest Badge Matrix",             "Arthur Vance"),
    ("bordeaux_wine",        "✨ Bordeaux Wine",          "generateBordeauxWineHtml",          "Wine Executive Split",            "Genevieve Bordeaux"),
    ("tokyo_ice_blue",       "✨ Tokyo Ice Blue",         "generateTokyoIceBlueHtml",          "Steel Studio Cards",              "Kenji Takahashi"),
    ("vienna_crest",         "✨ Vienna Crest",           "generateViennaCrestHtml",           "European Academic",               "Dr. Stefan Weber"),
    ("oslo_taupe",           "✨ Oslo Taupe",             "generateOsloTaupeHtml",             "Warm Espresso Minimal",           "Freja Lind"),
    ("kyoto_coral",          "✨ Kyoto Coral",            "generateKyotoCoralHtml",            "Coral Minimalist Grid",           "Hana Tanaka"),
    ("zurich_slate_block",   "✨ Zurich Slate",           "generateZurichSlateBlockHtml",      "Slate Indigo Block",              "Dominik Weber"),
    ("barcelona_cyan",       "✨ Barcelona Cyan",         "generateBarcelonaCyanHtml",         "Cyan Tech Modern",                "Javier Gomez"),
    ("geneva_charcoal",      "✨ Geneva Charcoal",        "generateGenevaCharcoalHtml",        "Charcoal Gold Exec",              "Henri Laurent"),
    ("milan_blush",          "✨ Milan Blush",            "generateMilanBlushHtml",            "Blush Peach Editorial",           "Alessandra Rossi"),
    ("helsinki_navy",        "✨ Helsinki Navy",          "generateHelsinkiNavyHtml",          "Navy Mint Tech",                  "Elias Lindqvist"),
    ("oxford_burgundy",      "✨ Oxford Burgundy",        "generateOxfordBurgundyHtml",        "British Academic",                "Prof. Arthur Pendelton"),
    ("dublin_forest",        "✨ Dublin Forest",          "generateDublinForestHtml",          "Forest Ochre Botanical",          "Ciara O’Connor"),
    ("manhattan_noir",       "✨ Manhattan Noir",         "generateManhattanNoirHtml",         "Monochrome Wall St",              "Alexander Vance"),
    ("montreal_frost",       "✨ Montreal Frost",         "generateMontrealFrostHtml",         "Azure Frost Cards",               "Camille Beaulieu"),
    ("florence_terracotta",  "✨ Florence Terracotta",    "generateFlorenceTerracottaHtml",    "Terracotta Linen",                "Matteo Moretti"),
    ("copenhagen_sand",      "✨ Copenhagen Sand",        "generateCopenhagenSandHtml",        "Nordic Sand Minimal",             "Signe Møller"),
    ("seoul_neon",           "✨ Seoul Neon",             "generateSeoulNeonHtml",             "Midnight Violet Matrix",          "Ji-hoon Park"),
    ("austin_amber",         "✨ Austin Amber",           "generateAustinAmberHtml",           "Teal Amber Startup",              "Wyatt Sterling"),
    ("edinburgh_navy",       "✨ Edinburgh Navy",         "generateEdinburghNavyHtml",         "Royal Navy Classic",              "Alistair MacLeod"),
    ("kyiv_golden",          "✨ Kyiv Golden",            "generateKyivGoldenHtml",            "Golden Wheat Split",              "Oksana Kovalenko"),
    ("singapore_ruby",       "✨ Singapore Ruby",         "generateSingaporeRubyHtml",         "Ruby Crimson Fintech",            "Derrick Chen"),
    ("venice_sand_split",    "✨ Venice Sand",            "generateVeniceSandSplitHtml",       "Sand Espresso Luxury",            "Gianna Bellini"),
    ("boston_crimson",       "✨ Boston Crimson",         "generateBostonCrimsonHtml",         "Ivy League Crimson",              "Harrison Ford"),
    ("madrid_sun",           "✨ Madrid Sun",             "generateMadridSunHtml",             "Solar Gold High-Contrast",        "Carlos Vega"),
    ("osaka_minimal",        "✨ Osaka Minimal",          "generateOsakaMinimalHtml",          "Technical Monospace",             "Ren Sato"),
    ("san_francisco_skyline","✨ SF Skyline",             "generateSanFranciscoSkylineHtml",   "Sky Blue Tech",                   "Jordan Hayes"),
    ("amsterdam_orange",     "✨ Amsterdam Orange",       "generateAmsterdamOrangeHtml",       "Indigo Orange Dutch",             "Lars van der Meer"),
    ("stockholm_monochrome", "✨ Stockholm Mono",         "generateStockholmMonochromeHtml",   "Nordic Pure Mono Grid",           "Frederik Lind"),
    ("prague_brass",         "✨ Prague Brass",           "generatePragueBrassHtml",           "Olive Brass Academic",            "Václav Dvořák"),
    ("cairo_gold",           "✨ Cairo Gold",             "generateCairoGoldHtml",             "Obsidian Gold Luxury",            "Tarek Mansour"),
    ("reykjavik_slate",      "✨ Reykjavik Slate",        "generateReykjavikSlateHtml",        "Glacial Ice Nordic",              "Astrid Jónsdóttir"),
    ("buenos_aires_tango",   "✨ Buenos Aires Tango",     "generateBuenosAiresTangoHtml",      "Plum Champagne Arts",             "Valentina Soler"),
    ("vancouver_pine",       "✨ Vancouver Pine",         "generateVancouverPineHtml",         "Pine Timber CleanTech",           "Liam MacIntyre"),
    ("lyon_lavender",        "✨ Lyon Lavender",          "generateLyonLavenderHtml",          "Lavender Creative Studio",        "Amélie Laurent"),
    ("seattle_emerald",      "✨ Seattle Emerald",        "generateSeattleEmeraldHtml",        "Emerald Teal Cloud",              "Noah Vance"),
    ("cape_town_sunset",     "✨ Cape Town Sunset",       "generateCapeTownSunsetHtml",        "Terracotta Gold Coastal",         "Thabo Ndlovu"),
    ("helsinki_frost",       "✨ Helsinki Frost",         "generateHelsinkiFrostHtml",         "Frosted Ice Exec Classic",        "Matti Virtanen"),
]

print(f"Total entries: {len(MAP_ENTRIES)}")

out_lines = ["const TEMPLATE_MAP = {"]
for key, lbl, fn, badge, cand in MAP_ENTRIES:
    out_lines.append(f"  {key:22s}: {{ label: '{lbl}', fn: {fn}, badge: '{badge}', photoUrl: '/images/candidates/{key}.jpg', candidateName: '{cand}' }},")
out_lines.append("};")

with open('scratch/template_map_generated.js', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out_lines))

print("Wrote scratch/template_map_generated.js successfully!")
