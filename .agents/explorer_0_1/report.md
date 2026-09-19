# 85-Template Catalog Deep Investigation Report

**Project**: DocForge CV & Resume Builder Catalog  
**Date**: 2026-08-30  
**Investigator**: Explorer 1  
**Target Path**: `src/engines/utility/templates/`  
**Status**: Comprehensive Read-Only Audit Complete (85/85 Verified)

---

## 1. Executive Summary & Verdict

DocForge contains exactly **85 distinct resume template generator engines** located in `src/engines/utility/templates/`. Every template file is exported through `src/engines/utility/resumeTemplates.js` and registered with live metadata inside `src/pages/utility/ResumeBuilder.jsx`'s `TEMPLATE_MAP`.

### Core Verification Metrics:
- **Total Template Files on Disk**: `85` (100% present, `.js` format)
- **Total Registered Exports in `resumeTemplates.js`**: `85` (100% matched)
- **Total Registered Mappings in `ResumeBuilder.jsx` (`TEMPLATE_MAP`)**: `85` (100% matched)
- **Orphaned / Missing Template Files**: `0` (Zero discrepancies across filesystem, barrel export, and UI map)
- **Candidate Portrait Assets (`public/images/candidates/`)**: `84` photo-enabled templates have dedicated 1:1 matching high-resolution assets (`jonathan` is text-only by design)
- **WYSIWYG DOM Stamping (`data-df-field`)**: `1,511` attributes stamped across all 85 templates
- **Multi-Page Pagination Status (`computeTwoPagePartition`)**: `5` templates currently implement universal greedy bin-packing pagination (`mariana`, `olivia`, `jonathan`, `diagonal_wedge`, `adeline_palmerston`); `80` templates currently use fixed single-page canvas containers (`.resume-canvas` / `.cv-page` at `794px x 1123px`)
- **Zero-Mock Data Sanitization**: `84` templates currently contain default fallback strings (such as `'Candidate Name'` or persona names like `'Adam Fletcher'`, `'Adeline Palmerston'`) when rendered with an empty data payload `{}`.

---

## 2. Template Registry & Loading Pipeline

### Architectural Topology

```
┌────────────────────────────────────────────────────────────────────────┐
│                        src/engines/utility/templates/                  │
│                     (85 Individual Template Generators)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 src/engines/utility/resumeTemplates.js                 │
│                 (Master Barrel Export for all 85 Functions)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌──────────────────────────────────────┐    ┌──────────────────────────────────┐
│ src/pages/utility/ResumeBuilder.jsx  │    │ src/components/LandingPage.jsx   │
│ - TEMPLATE_MAP (85 items)            │    │ - 17 Core Demo Templates         │
│ - Progressive Disclosure (10 at time)│    │ - Hero Mockup Data               │
│ - WYSIWYG Editor Bridge              │    └──────────────────────────────────┘
│ - Client PDF / HTML Exporter         │
└──────────────────┬───────────────────┘
                   │
    ┌──────────────┴──────────────┐
    ▼                             ▼
┌────────────────────────┐  ┌────────────────────────────────────┐
│ wysiwygStateEngine.js  │  │ paginationEngine.js / printUtils.js│
│ - applyInlineFieldEdit │  │ - computeTwoPagePartition          │
│ - cleanUnicodeText     │  │ - injectPrintStyles / Crop         │
└────────────────────────┘  └────────────────────────────────────┘
```

### Registry Components
1. **Barrel Registry (`src/engines/utility/resumeTemplates.js`)**:
   - Centralizes named exports for all 85 generator functions (`generateMarianaHtml`, `generateAdamFletcherHtml`, etc.).
   - *Note*: Header comment contains a minor historical note `(73 Distinct Templates)` which was written before batch expansion; the actual code exports all 85.
2. **UI State & Metadata Registry (`TEMPLATE_MAP` in `ResumeBuilder.jsx`)**:
   - Maps each template slug to its label, generator function, badge, candidate photo URL, and canonical candidate name.
   - Powers the progressive disclosure template picker (`Show 10 More Templates`), live iframe rendering, and JSON backup export.
3. **Shared Helper Engines**:
   - `paginationEngine.js`: Subpixel height estimation (`estimateJobHeight`, `estimateProjHeight`, `computeHeaderHeight`) and greedy bin-packing into Page 1 and Page 2.
   - `wysiwygStateEngine.js`: Pure reducer applying inline edits from the iframe bridge into React state with separator parsing (` · `, ` | `, date ranges `2020 – 2022`).
   - `printUtils.js`: Injects `@page { size: A4 portrait; margin: 0; }`, `-webkit-print-color-adjust: exact`, and photo crop transform styles.

---

## 3. Complete 85-Template Catalog Enumeration

| # | Template Name / Label | Slug / File | Export Function | Category | Visual Family / Geometry | Avatar / Masking | Pagination Engine | Mock Name Fallback |
|---|---|---|---|---|---|---|---|---|
| 1 | 👑 Adam Fletcher | `adam_fletcher` | `generateAdamFletcherHtml` | Exact 1:1 Canva Replica | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Adam Fletcher` |
| 2 | 👑 Adeline Palmerston | `adeline_palmerston` | `generateAdelinePalmerstonHtml` | Exact 1:1 Canva Replica | Interactive Timeline Grid | Circular (50% border-radius) | ✅ Yes | `Adeline Palmerston` |
| 3 | ✨ Adora Diagonal | `adora_diagonal` | `generateAdoraDiagonalHtml` | Radical Geometric | Diagonal / Polygon Geometric | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 4 | 👑 Adora Montminy | `adora_montminy` | `generateAdoraMontminyHtml` | Exact 1:1 Canva Replica | Diagonal / Polygon Geometric | Circular (50% border-radius) | ❌ Single-page | None |
| 5 | 👑 Alfredo Torres | `alfredo_torres` | `generateAlfredoTorresHtml` | Exact 1:1 Canva Replica | Sidebar + Main Column | Rounded Rectangle Card | ❌ Single-page | `Alfredo Torres` |
| 6 | ✨ Lorna Slate | `alvarado_slate` | `generateAlvaradoSlateHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 7 | ✨ Amsterdam Orange | `amsterdam_orange` | `generateAmsterdamOrangeHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 8 | 👑 Arthur Pendelton | `arthur_pendelton` | `generateArthurPendeltonHtml` | Exact 1:1 Canva Replica | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Arthur Pendelton` |
| 9 | ✨ Austin Amber | `austin_amber` | `generateAustinAmberHtml` | Tech & Engineering | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 10 | ✨ Barcelona Cyan | `barcelona_cyan` | `generateBarcelonaCyanHtml` | Tech & Engineering | Sidebar + Main Column | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 11 | ✨ Berlin Two-Tone | `berlin_two_tone` | `generateBerlinTwoToneHtml` | Modern | Modular Card Matrix | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 12 | ✨ Bordeaux Wine | `bordeaux_wine` | `generateBordeauxWineHtml` | Executive & Luxury | Split Dual-Tone Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 13 | ✨ Boston Crimson | `boston_crimson` | `generateBostonCrimsonHtml` | Academic & Classic Serif | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 14 | ✨ Buenos Aires Tango | `buenos_aires_tango` | `generateBuenosAiresTangoHtml` | Executive & Luxury | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 15 | ✨ Cairo Gold | `cairo_gold` | `generateCairoGoldHtml` | Executive & Luxury | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 16 | ✨ Cambridge Rose | `cambridge_rose` | `generateCambridgeRoseHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 17 | ✨ Cape Town Sunset | `cape_town_sunset` | `generateCapeTownSunsetHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 18 | ✨ Card Matrix | `card_matrix` | `generateCardMatrixHtml` | Tech & Engineering | Modular Card Matrix | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 19 | ✨ Charles | `charles` | `generateCharlesHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 20 | ✨ Copenhagen Sand | `copenhagen_sand` | `generateCopenhagenSandHtml` | Nordic & Minimalist | Minimalist Grid / Monospace | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 21 | ✨ Date Capsule | `date_capsule` | `generateDateCapsuleHtml` | Modern | Interactive Timeline Grid | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 22 | ✨ Diagonal Wedge | `diagonal_wedge` | `generateDiagonalWedgeHtml` | Radical Geometric | Diagonal / Polygon Geometric | Circular (50% border-radius) | ✅ Yes | `Candidate Name` |
| 23 | 👑 Donna Stroupe | `donna_stroupe` | `generateDonnaStroupeHtml` | Exact 1:1 Canva Replica | Header Banner Layout | Circular (50% border-radius) | ❌ Single-page | `Donna Stroupe` |
| 24 | ✨ Dublin Forest | `dublin_forest` | `generateDublinForestHtml` | Creative & Editorial | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 25 | ✨ Edinburgh Navy | `edinburgh_navy` | `generateEdinburghNavyHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 26 | ✨ Emerald Prestige | `emerald_prestige` | `generateEmeraldPrestigeHtml` | Tech & Engineering | Modular Card Matrix | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 27 | ✨ Emma | `emma` | `generateEmmaHtml` | Modern | Split Dual-Tone Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 28 | ✨ Floating Cards | `floating_card_matrix` | `generateFloatingCardMatrixHtml` | Tech & Engineering | Modular Card Matrix | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 29 | ✨ Florence Terracotta | `florence_terracotta` | `generateFlorenceTerracottaHtml` | Creative & Editorial | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 30 | ✨ Geneva Charcoal | `geneva_charcoal` | `generateGenevaCharcoalHtml` | Executive & Luxury | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 31 | ✨ Helsinki Frost | `helsinki_frost` | `generateHelsinkiFrostHtml` | Executive & Luxury | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 32 | ✨ Helsinki Navy | `helsinki_navy` | `generateHelsinkiNavyHtml` | Tech & Engineering | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 33 | 👑 Howard Ong | `howard_ong` | `generateHowardOngHtml` | Exact 1:1 Canva Replica | Header Banner Layout | Circular (50% border-radius) | ❌ Single-page | `Howard Ong` |
| 34 | 👑 Isabel Mercado | `isabel_mercado` | `generateIsabelMercadoHtml` | Exact 1:1 Canva Replica | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `ISABEL MERCADO` |
| 35 | 👑 Isabel Schumacher | `isabel_schumacher` | `generateIsabelSchumacherHtml` | Exact 1:1 Canva Replica | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Isabel Schumacher` |
| 36 | ✨ Jonathan | `jonathan` | `generateJonathanHtml` | Academic & Classic Serif | Sidebar + Main Column | No Avatar (Text Header) | ✅ Yes | `Candidate Name` |
| 37 | 👑 Jonathan Patterson | `jonathan_patterson` | `generateJonathanPattersonHtml` | Exact 1:1 Canva Replica | Arched Frame / Dome Header | Arched Dome Mask | ❌ Single-page | `Jonathan Patterson` |
| 38 | ✨ Kathleen | `kathleen` | `generateKathleenHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 39 | ✨ Kelly Mint | `kelly_mint` | `generateKellyMintHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Kelly Blackwell` |
| 40 | 👑 Korina Villanueva | `korina_villanueva` | `generateKorinaVillanuevaHtml` | Exact 1:1 Canva Replica | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Korina Villanueva` |
| 41 | ✨ Kyiv Golden | `kyiv_golden` | `generateKyivGoldenHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 42 | ✨ Kyoto Coral | `kyoto_coral` | `generateKyotoCoralHtml` | Creative & Editorial | Minimalist Grid / Monospace | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 43 | ✨ Lilac Harmony | `lilac_sidebar` | `generateLilacSidebarHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 44 | 👑 Lorna Alvarado | `lorna_alvarado` | `generateLornaAlvaradoHtml` | Exact 1:1 Canva Replica | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Lorna Alvarado` |
| 45 | ✨ Lyon Lavender | `lyon_lavender` | `generateLyonLavenderHtml` | Creative & Editorial | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 46 | ✨ Madrid Sun | `madrid_sun` | `generateMadridSunHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 47 | ✨ Manhattan Noir | `manhattan_noir` | `generateManhattanNoirHtml` | Executive & Luxury | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 48 | 👑 Marcus Vance | `marcus_vance` | `generateMarcusVanceHtml` | Exact 1:1 Canva Replica | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Marcus Vance` |
| 49 | ✨ Mariana | `mariana` | `generateMarianaHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ✅ Yes | `Candidate Name` |
| 50 | ✨ Milan Blush | `milan_blush` | `generateMilanBlushHtml` | Creative & Editorial | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 51 | ✨ Montreal Frost | `montreal_frost` | `generateMontrealFrostHtml` | Tech & Engineering | Modular Card Matrix | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 52 | ✨ Ocean Block | `ocean_block` | `generateOceanBlockHtml` | Modern | Header Banner Layout | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 53 | ✨ Olivia | `olivia` | `generateOliviaHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ✅ Yes | `Candidate Name` |
| 54 | ✨ Howard Burgundy | `ong_burgundy` | `generateOngBurgundyHtml` | Modern | Header Banner Layout | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 55 | ✨ Osaka Minimal | `osaka_minimal` | `generateOsakaMinimalHtml` | Tech & Engineering | Minimalist Grid / Monospace | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 56 | ✨ Oslo Taupe | `oslo_taupe` | `generateOsloTaupeHtml` | Nordic & Minimalist | Minimalist Grid / Monospace | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 57 | ✨ Overlap Badge | `overlapping_badge` | `generateOverlappingBadgeHtml` | Radical Geometric | Modular Card Matrix | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 58 | ✨ Oxford Burgundy | `oxford_burgundy` | `generateOxfordBurgundyHtml` | Academic & Classic Serif | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 59 | ✨ Prague Brass | `prague_brass` | `generatePragueBrassHtml` | Academic & Classic Serif | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 60 | ✨ Reykjavik Slate | `reykjavik_slate` | `generateReykjavikSlateHtml` | Nordic & Minimalist | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 61 | ✨ Richard | `richard` | `generateRichardHtml` | Modern | Split Dual-Tone Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 62 | 👑 Richard Sanchez | `richard_sanchez` | `generateRichardSanchezHtml` | Exact 1:1 Canva Replica | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Richard Sanchez` |
| 63 | ✨ Sage Mist | `sage_pastel` | `generateSagePastelHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 64 | ✨ SF Skyline | `san_francisco_skyline` | `generateSanFranciscoSkylineHtml` | Tech & Engineering | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 65 | ✨ Sanchez Dark | `sanchez_dark` | `generateSanchezDarkHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 66 | ✨ Sanchez Mono | `sanchez_mono` | `generateSanchezMonoHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 67 | ✨ Sanchez Wave | `sanchez_wave` | `generateSanchezWaveHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 68 | ✨ Schumacher Charcoal | `schumacher_charcoal` | `generateSchumacherCharcoalHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 69 | ✨ Seattle Emerald | `seattle_emerald` | `generateSeattleEmeraldHtml` | Tech & Engineering | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 70 | 👑 Sebastian Bennett | `sebastian_bennett` | `generateSebastianBennettHtml` | Exact 1:1 Canva Replica | Sidebar + Main Column | Rounded Rectangle Card | ❌ Single-page | `Sebastian Bennett` |
| 71 | ✨ Seoul Neon | `seoul_neon` | `generateSeoulNeonHtml` | Tech & Engineering | Modular Card Matrix | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 72 | ✨ Singapore Ruby | `singapore_ruby` | `generateSingaporeRubyHtml` | Modern | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 73 | ✨ Split Dual Block | `split_dual_block` | `generateSplitDualBlockHtml` | Tech & Engineering | Split Dual-Tone Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 74 | ✨ Stockholm Mono | `stockholm_monochrome` | `generateStockholmMonochromeHtml` | Nordic & Minimalist | Minimalist Grid / Monospace | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 75 | ✨ Stockholm Gold | `stockholm_yellow` | `generateStockholmYellowHtml` | Nordic & Minimalist | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 76 | 👑 Terracotta Arch | `terracotta_arch` | `generateTerracottaArchHtml` | Exact 1:1 Canva Replica | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 77 | ✨ Tokyo Ice Blue | `tokyo_ice_blue` | `generateTokyoIceBlueHtml` | Tech & Engineering | Modular Card Matrix | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |
| 78 | ✨ Vancouver Pine | `vancouver_pine` | `generateVancouverPineHtml` | Tech & Engineering | Interactive Timeline Grid | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 79 | ✨ Venice Sand | `venice_sand_split` | `generateVeniceSandSplitHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 80 | ✨ Vienna Crest | `vienna_crest` | `generateViennaCrestHtml` | Academic & Classic Serif | Minimalist Grid / Monospace | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 81 | ✨ Violet Modern | `violet_modern` | `generateVioletModernHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 82 | ✨ Wilson Light | `wilson_light` | `generateWilsonLightHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 83 | ✨ Wilson Minimal | `wilson_minimal` | `generateWilsonMinimalHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 84 | ✨ Catrine Olive | `ziv_olive` | `generateZivOliveHtml` | Modern | Sidebar + Main Column | Circular (50% border-radius) | ❌ Single-page | `Candidate Name` |
| 85 | ✨ Zurich Slate | `zurich_slate_block` | `generateZurichSlateBlockHtml` | Modern | Minimalist Grid / Monospace | Rounded Rectangle Card | ❌ Single-page | `Candidate Name` |

---

## 4. Key Findings & Detailed Analysis Against Requirements

### Requirement 1: Zero-Pollution Cleansing (Zero Mock Fallbacks)
- **Current State**: 84 of 85 templates insert default mock names or strings when user fields are empty or cleared.
  - **15 Canva Replica Templates** explicitly fall back to their replica persona names:
    `adam_fletcher`, `adeline_palmerston`, `alfredo_torres`, `arthur_pendelton`, `donna_stroupe`, `howard_ong`, `isabel_mercado`, `isabel_schumacher`, `jonathan_patterson`, `kelly_mint`, `korina_villanueva`, `lorna_alvarado`, `marcus_vance`, `richard_sanchez`, `sebastian_bennett`.
  - **69 Templates** fall back to `'Candidate Name'` if `data.name` is falsy.
  - **Name Parsing Fallback Bugs**: In templates using `(data.name || 'Sample Name').split(' ')`, if the user sets `data.name = ''`, the first name variable defaults to the mock first name.
  - **Recommendation**: Replace all mock name/company/role/date fallbacks with clean string interpolation `${data.name || ''}` and conditional rendering `${data.title ? ... : ''}` to guarantee zero resurrection of sample data.

### Requirement 2: Vector Geometry & Shape Protection
- **Current State**: Templates employ complex vector geometries:
  - `diagonal_wedge`: SVG polygon cuts and 5-dot alignment matrices.
  - `adeline_palmerston`: Slate/bronze two-tone split bars.
  - `jonathan_patterson`: Arched dome SVG masks.
  - `korina_villanueva`: Chevron pennant header badge.
  - `lorna_alvarado`: 3D folded ribbon vectors.
  - `floating_card_matrix`: Modular floating card tiles.
- **Dimensional Parity**: All templates declare explicit A4 canvas boundaries ($794\text{px} \times 1123\text{px}$). However, templates using fixed `height: 1123px; overflow: hidden;` on single-page `.resume-canvas` containers truncate long text instead of generating Page 2 sheets.

### Requirement 3: WYSIWYG Attribute Stamping (`data-df-field`) & Print Parity
- **Current State**:
  - `1,511` total `data-df-field` stamps exist across the 85 templates.
  - All 85 templates stamp `name`, `exp:idx:...`, and contact fields.
  - All 85 templates include standard `@media print` rules enforcing `-webkit-print-color-adjust: exact` and `.cv-page:last-child { break-after: avoid; }`.
- **Opportunities**: Standardize section container headings (`custom:csId:title`, `proj:idx:name`, `ref:idx:name`, `edu:idx:degree`) across all 80 un-paginated templates to ensure 100% attribute parity with `wysiwygStateEngine.js`.

### Requirement 4: Circular Avatar Zoom-Overflow Masking
- **Current State**:
  - 84 photo templates contain dedicated avatar containers.
  - Masking styles (`overflow: hidden; border-radius: 50%` or `border-radius: 12px` / arched masks) are implemented across containers.
  - `printUtils.js` provides `injectPhotoCropStyles(html, data)` to handle CSS zoom transforms `scale(...) translate(...)`.
  - All 84 corresponding avatar JPEG files exist in `public/images/candidates/` with zero missing files.

### Requirement 5: Universal Pagination Engine Integration
- **Current State**:
  - Only **5 templates** currently call `computeTwoPagePartition` (`mariana`, `olivia`, `jonathan`, `diagonal_wedge`, `adeline_palmerston`).
  - The remaining **80 templates** are implemented as single-page fixed canvas layouts ($794\text{px} \times 1123\text{px}$).
  - Upgrading all 85 templates to invoke `computeTwoPagePartition` and output `<div class="cv-page" id="page-1">` and optional `<div class="cv-page" id="page-2">` will unlock universal multi-page export across the entire catalog.

---

## 5. Architectural Recommendations for Implementation Phase

1. **Cleanse Mock Defaults Across 85 Files**:
   Ensure `data.name || ''`, `data.title || ''`, `data.summary || ''`, and wrap all conditional sections with `data.items && data.items.length ? ... : ''`.
2. **Integrate Universal Two-Page Partitioning**:
   Import `computeTwoPagePartition` in the remaining 80 templates, estimating section budgets dynamically and rendering clean Page 2 continuation sheets when content exceeds Page 1 budget.
3. **Harmonize `resumeTemplates.js` Header Comment**:
   Update line 2 in `src/engines/utility/resumeTemplates.js` to reflect the true count: `(85 Distinct Templates)`.
4. **Automate 30-to-100 Test Suite Verification**:
   Execute automated test scripts checking both empty `{}` and massive 10+ item payloads across all 85 templates to prove zero mock leakage and zero runtime exceptions.
