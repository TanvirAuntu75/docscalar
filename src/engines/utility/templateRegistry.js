// ═══════════════════════════════════════════════════════════════════════════════
// DocScalar 89-Template Dynamic Registry & On-Demand Module Loader
// ═══════════════════════════════════════════════════════════════════════════════

import { TEMPLATE_METADATA, DEFAULT_TEMPLATE_KEY, getTemplateMetadata } from './templateMetadata.js';
import { generateMarianaHtml } from './templates/mariana.js';

// In-memory cache for resolved generator functions with synchronous default fallback
const GENERATOR_CACHE = {
  mariana: generateMarianaHtml
};

// Dynamic on-demand template module loaders for all 89 templates
export const TEMPLATE_LOADERS = {
  harvard_classic       : () => import('./templates/harvard_classic.js'),
  silicon_valley_ats    : () => import('./templates/silicon_valley_ats.js'),
  wall_street_executive : () => import('./templates/wall_street_executive.js'),
  oxford_minimalist     : () => import('./templates/oxford_minimalist.js'),
  adeline_palmerston    : () => import('./templates/adeline_palmerston.js'),
  mariana               : () => import('./templates/mariana.js'),
  diagonal_wedge        : () => import('./templates/diagonal_wedge.js'),
  olivia                : () => import('./templates/olivia.js'),
  jonathan              : () => import('./templates/jonathan.js'),
  adora_montminy        : () => import('./templates/adora_montminy.js'),
  emma                  : () => import('./templates/emma.js'),
  floating_card_matrix  : () => import('./templates/floating_card_matrix.js'),
  charles               : () => import('./templates/charles.js'),
  kathleen              : () => import('./templates/kathleen.js'),
  adam_fletcher         : () => import('./templates/adam_fletcher.js'),
  richard               : () => import('./templates/richard.js'),
  split_dual_block      : () => import('./templates/split_dual_block.js'),
  sanchez_dark          : () => import('./templates/sanchez_dark.js'),
  wilson_light          : () => import('./templates/wilson_light.js'),
  richard_sanchez       : () => import('./templates/richard_sanchez.js'),
  sanchez_mono          : () => import('./templates/sanchez_mono.js'),
  overlapping_badge     : () => import('./templates/overlapping_badge.js'),
  sanchez_wave          : () => import('./templates/sanchez_wave.js'),
  ong_burgundy          : () => import('./templates/ong_burgundy.js'),
  sebastian_bennett     : () => import('./templates/sebastian_bennett.js'),
  schumacher_charcoal   : () => import('./templates/schumacher_charcoal.js'),
  card_matrix           : () => import('./templates/card_matrix.js'),
  ziv_olive             : () => import('./templates/ziv_olive.js'),
  adora_diagonal        : () => import('./templates/adora_diagonal.js'),
  lorna_alvarado        : () => import('./templates/lorna_alvarado.js'),
  wilson_minimal        : () => import('./templates/wilson_minimal.js'),
  date_capsule          : () => import('./templates/date_capsule.js'),
  alvarado_slate        : () => import('./templates/alvarado_slate.js'),
  kelly_mint            : () => import('./templates/kelly_mint.js'),
  donna_stroupe         : () => import('./templates/donna_stroupe.js'),
  violet_modern         : () => import('./templates/violet_modern.js'),
  berlin_two_tone       : () => import('./templates/berlin_two_tone.js'),
  sage_pastel           : () => import('./templates/sage_pastel.js'),
  lilac_sidebar         : () => import('./templates/lilac_sidebar.js'),
  isabel_schumacher     : () => import('./templates/isabel_schumacher.js'),
  ocean_block           : () => import('./templates/ocean_block.js'),
  geneva_charcoal       : () => import('./templates/geneva_charcoal.js'),
  cambridge_rose        : () => import('./templates/cambridge_rose.js'),
  stockholm_yellow      : () => import('./templates/stockholm_yellow.js'),
  howard_ong            : () => import('./templates/howard_ong.js'),
  bordeaux_wine         : () => import('./templates/bordeaux_wine.js'),
  tokyo_ice_blue        : () => import('./templates/tokyo_ice_blue.js'),
  vienna_crest          : () => import('./templates/vienna_crest.js'),
  oslo_taupe            : () => import('./templates/oslo_taupe.js'),
  terracotta_arch       : () => import('./templates/terracotta_arch.js'),
  kyoto_coral           : () => import('./templates/kyoto_coral.js'),
  manhattan_noir        : () => import('./templates/manhattan_noir.js'),
  zurich_slate_block    : () => import('./templates/zurich_slate_block.js'),
  barcelona_cyan        : () => import('./templates/barcelona_cyan.js'),
  korina_villanueva     : () => import('./templates/korina_villanueva.js'),
  milan_blush           : () => import('./templates/milan_blush.js'),
  dublin_forest         : () => import('./templates/dublin_forest.js'),
  helsinki_navy         : () => import('./templates/helsinki_navy.js'),
  oxford_burgundy       : () => import('./templates/oxford_burgundy.js'),
  isabel_mercado        : () => import('./templates/isabel_mercado.js'),
  montreal_frost        : () => import('./templates/montreal_frost.js'),
  florence_terracotta   : () => import('./templates/florence_terracotta.js'),
  copenhagen_sand       : () => import('./templates/copenhagen_sand.js'),
  austin_amber          : () => import('./templates/austin_amber.js'),
  jonathan_patterson    : () => import('./templates/jonathan_patterson.js'),
  edinburgh_navy        : () => import('./templates/edinburgh_navy.js'),
  seoul_neon            : () => import('./templates/seoul_neon.js'),
  kyiv_golden           : () => import('./templates/kyiv_golden.js'),
  singapore_ruby        : () => import('./templates/singapore_ruby.js'),
  alfredo_torres        : () => import('./templates/alfredo_torres.js'),
  boston_crimson        : () => import('./templates/boston_crimson.js'),
  cairo_gold            : () => import('./templates/cairo_gold.js'),
  madrid_sun            : () => import('./templates/madrid_sun.js'),
  osaka_minimal         : () => import('./templates/osaka_minimal.js'),
  marcus_vance          : () => import('./templates/marcus_vance.js'),
  san_francisco_skyline : () => import('./templates/san_francisco_skyline.js'),
  venice_sand_split     : () => import('./templates/venice_sand_split.js'),
  amsterdam_orange      : () => import('./templates/amsterdam_orange.js'),
  stockholm_monochrome  : () => import('./templates/stockholm_monochrome.js'),
  arthur_pendelton      : () => import('./templates/arthur_pendelton.js'),
  prague_brass          : () => import('./templates/prague_brass.js'),
  emerald_prestige      : () => import('./templates/emerald_prestige.js'),
  reykjavik_slate       : () => import('./templates/reykjavik_slate.js'),
  buenos_aires_tango    : () => import('./templates/buenos_aires_tango.js'),
  vancouver_pine        : () => import('./templates/vancouver_pine.js'),
  lyon_lavender         : () => import('./templates/lyon_lavender.js'),
  seattle_emerald       : () => import('./templates/seattle_emerald.js'),
  cape_town_sunset      : () => import('./templates/cape_town_sunset.js'),
  helsinki_frost        : () => import('./templates/helsinki_frost.js'),
};

/**
 * Asynchronously loads a template generator by key and caches it.
 * Falls back to Mariana generator if template is unknown or load fails.
 */
export async function loadTemplate(templateKey) {
  const key = templateKey || DEFAULT_TEMPLATE_KEY;
  if (GENERATOR_CACHE[key]) {
    return GENERATOR_CACHE[key];
  }
  const loader = TEMPLATE_LOADERS[key];
  if (!loader) {
    console.warn(`[templateRegistry] Unknown template key "${key}", falling back to default.`);
    return GENERATOR_CACHE[DEFAULT_TEMPLATE_KEY];
  }
  try {
    const mod = await loader();
    const fn = (typeof mod.default === 'function')
      ? mod.default
      : (Object.entries(mod).find(([k, v]) => typeof v === 'function' && k.startsWith('generate'))?.[1] ||
         Object.values(mod).find(v => typeof v === 'function'));
    if (typeof fn === 'function') {
      GENERATOR_CACHE[key] = fn;
      return fn;
    }
    console.warn(`[templateRegistry] Template module "${key}" did not export a generator function.`);
    return GENERATOR_CACHE[DEFAULT_TEMPLATE_KEY];
  } catch (err) {
    console.error(`[templateRegistry] Failed to dynamically load template "${key}":`, err);
    return GENERATOR_CACHE[DEFAULT_TEMPLATE_KEY];
  }
}

// Construct TEMPLATE_MAP using property getters for backwards compatibility
export const TEMPLATE_MAP = Object.fromEntries(
  Object.entries(TEMPLATE_METADATA).map(([key, meta]) => [
    key,
    {
      ...meta,
      get fn() {
        return GENERATOR_CACHE[key] || null;
      },
      set fn(customFn) {
        GENERATOR_CACHE[key] = customFn;
      }
    }
  ])
);

export { TEMPLATE_METADATA, DEFAULT_TEMPLATE_KEY, getTemplateMetadata };
