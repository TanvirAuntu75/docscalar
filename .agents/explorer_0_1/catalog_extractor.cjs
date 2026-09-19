const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const rootDir = path.resolve('.');
const templatesDir = path.join(rootDir, 'src', 'engines', 'utility', 'templates');
const resumeBuilderFile = path.join(rootDir, 'src', 'pages', 'utility', 'ResumeBuilder.jsx');
const resumeTemplatesFile = path.join(rootDir, 'src', 'engines', 'utility', 'resumeTemplates.js');

async function generateCatalog() {
  const resumeBuilderContent = fs.readFileSync(resumeBuilderFile, 'utf8');
  const resumeTemplatesContent = fs.readFileSync(resumeTemplatesFile, 'utf8');
  const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js')).sort();

  // Extract TEMPLATE_MAP
  const templateMap = {};
  const mapLines = resumeBuilderContent.split('\n');
  let insideMap = false;
  for (const line of mapLines) {
    if (line.includes('const TEMPLATE_MAP = {')) {
      insideMap = true;
      continue;
    }
    if (insideMap) {
      if (line.trim().startsWith('};')) {
        insideMap = false;
        break;
      }
      const m = line.match(/^\s*(\w+)\s*:\s*\{\s*label:\s*['"]([^'"]+)['"],\s*fn:\s*(\w+),\s*badge:\s*['"]([^'"]+)['"],\s*photoUrl:\s*['"]([^'"]+)['"],\s*candidateName:\s*['"]([^'"]+)['"]/);
      if (m) {
        templateMap[m[1]] = {
          slug: m[1],
          label: m[2],
          fn: m[3],
          badge: m[4],
          photoUrl: m[5],
          candidateName: m[6]
        };
      }
    }
  }

  // Extract batches / sections from resumeTemplates.js
  const batchMapping = {};
  let currentBatch = 'Core Templates';
  const rtLines = resumeTemplatesContent.split('\n');
  for (const line of rtLines) {
    if (line.startsWith('//')) {
      const batchTitle = line.replace(/^\/\/\s*=*\s*/, '').replace(/\s*=*\s*$/, '').trim();
      if (batchTitle && !batchTitle.includes('DocForge Professional')) {
        currentBatch = batchTitle;
      }
    }
    const expMatch = line.match(/export\s+\{\s*(\w+)\s*\}\s+from\s+['"]\.\/templates\/(\w+)['"]/);
    if (expMatch) {
      batchMapping[expMatch[2]] = {
        batch: currentBatch,
        exportName: expMatch[1]
      };
    }
  }

  const catalog = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const slug = file.replace('.js', '');
    const content = fs.readFileSync(path.join(templatesDir, file), 'utf8');
    const map = templateMap[slug] || {};
    const batchInfo = batchMapping[slug] || { batch: 'Unknown', exportName: 'Unknown' };

    // Detect Category / Visual Archetype
    let category = 'Modern';
    const lowerBadge = (map.badge || '').toLowerCase();
    const lowerLabel = (map.label || '').toLowerCase();
    const lowerContent = content.toLowerCase();

    if (lowerBadge.includes('exact') || map.label?.includes('👑')) {
      category = 'Exact 1:1 Canva Replica';
    } else if (lowerBadge.includes('academic') || lowerBadge.includes('serif') || lowerBadge.includes('european') || lowerBadge.includes('british') || lowerBadge.includes('ivy league')) {
      category = 'Academic & Classic Serif';
    } else if (lowerBadge.includes('exec') || lowerBadge.includes('luxury') || lowerBadge.includes('bronze') || lowerBadge.includes('monochrome wall st') || lowerBadge.includes('champagne')) {
      category = 'Executive & Luxury';
    } else if (lowerBadge.includes('tech') || lowerBadge.includes('matrix') || lowerBadge.includes('cards') || lowerBadge.includes('monospace') || lowerBadge.includes('cloud') || lowerBadge.includes('startup')) {
      category = 'Tech & Engineering';
    } else if (lowerBadge.includes('creative') || lowerBadge.includes('arts') || lowerBadge.includes('editorial') || lowerBadge.includes('linen') || lowerBadge.includes('peach') || lowerBadge.includes('botanical') || lowerBadge.includes('violet')) {
      category = 'Creative & Editorial';
    } else if (lowerBadge.includes('nordic') || lowerBadge.includes('minimal') || lowerBadge.includes('sand') || lowerBadge.includes('frost') || lowerBadge.includes('glacial')) {
      category = 'Nordic & Minimalist';
    } else if (lowerBadge.includes('polygon') || lowerBadge.includes('diagonal') || lowerBadge.includes('wedge') || lowerBadge.includes('badge') || lowerBadge.includes('split dual') || lowerBadge.includes('fold')) {
      category = 'Radical Geometric';
    }

    // Determine Visual Family & Geometry
    let visualFamily = 'Sidebar + Main Column';
    if (content.includes('header-banner') || content.includes('full-width') || content.includes('banner-bg') || content.includes('top-banner') || /banner/i.test(map.badge)) {
      visualFamily = 'Header Banner Layout';
    } else if (content.includes('clip-path') || /polygon|wedge|diagonal/i.test(map.badge)) {
      visualFamily = 'Diagonal / Polygon Geometric';
    } else if (/arch|dome/i.test(map.badge) || content.includes('arch-frame') || content.includes('dome')) {
      visualFamily = 'Arched Frame / Dome Header';
    } else if (/card|matrix|box/i.test(map.badge) || content.includes('card-grid') || content.includes('matrix')) {
      visualFamily = 'Modular Card Matrix';
    } else if (/timeline/i.test(map.badge) || content.includes('timeline')) {
      visualFamily = 'Interactive Timeline Grid';
    } else if (/split|two-tone|dual/i.test(map.badge) || content.includes('split-container')) {
      visualFamily = 'Split Dual-Tone Column';
    } else if (/minimal|mono/i.test(map.badge)) {
      visualFamily = 'Minimalist Grid / Monospace';
    }

    // Photo Masking Type
    let photoMasking = 'Circular (50% border-radius)';
    if (content.includes('border-radius: 12px') || content.includes('border-radius: 8px') || /rounded card/i.test(map.badge)) {
      photoMasking = 'Rounded Rectangle Card';
    } else if (/arch|dome/i.test(map.badge) || content.includes('border-radius: 90px 90px 0 0')) {
      photoMasking = 'Arched Dome Mask';
    } else if (slug === 'jonathan') {
      photoMasking = 'No Avatar (Text Header)';
    }

    const usesPagination = content.includes('computeTwoPagePartition');
    const dfFieldMatches = (content.match(/data-df-field="([^"]+)"/g) || []).length;

    // Detect mock fallback in name
    const nameFallbackMatch = content.match(/data\.(?:name|fullName)\s*\|\|\s*['"]([^'"]+)['"]/);
    const mockNameFallback = nameFallbackMatch ? nameFallbackMatch[1] : 'NONE';

    catalog.push({
      index: i + 1,
      file,
      slug,
      exportName: batchInfo.exportName || 'generate' + slug,
      label: map.label || slug,
      badge: map.badge || 'N/A',
      batch: batchInfo.batch,
      category,
      visualFamily,
      candidateName: map.candidateName || 'N/A',
      photoUrl: map.photoUrl || 'N/A',
      photoMasking,
      usesPagination,
      dfFieldCount: dfFieldMatches,
      mockNameFallback,
      fileSizeBytes: content.length,
      lineCount: content.split('\n').length
    });
  }

  fs.writeFileSync(path.join(rootDir, '.agents', 'explorer_0_1', 'catalog_complete.json'), JSON.stringify(catalog, null, 2));
  console.log(`Successfully compiled catalog for ${catalog.length} templates.`);
}

generateCatalog();
