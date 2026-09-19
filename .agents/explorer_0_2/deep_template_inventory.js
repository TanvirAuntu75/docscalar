import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const inventory = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const code = fs.readFileSync(filePath, 'utf-8');

  // Find exported function name
  const fnMatch = code.match(/export\s+function\s+(\w+)/);
  const fnName = fnMatch ? fnMatch[1] : 'unknown';

  // Layout architecture
  const isTwoColumn = code.includes('sidebar') || code.includes('left-col') || code.includes('grid-template-columns: 3') || code.includes('grid-template-columns: 2') || code.includes('width: 3');
  const isSingleColumn = !isTwoColumn;

  // Header geometry/decorations
  const hasSvgPolygon = code.includes('<polygon') || code.includes('<path d=') || code.includes('<svg');
  const hasDiagonalWedge = code.includes('clip-path') || code.includes('polygon(') || code.includes('transform: skew');
  const hasArchFrame = code.includes('border-radius: 1') || code.includes('border-radius: 200px') || code.includes('arch');
  
  // Avatar implementation details
  const avatarMaskMatches = code.match(/class=["'][^"']*avatar-mask[^"']*["']/g);
  const avatarImgMatches = code.match(/<img[^>]*class=["'][^"']*avatar[^"']*["'][^>]*>/gi);
  const photoContainerMatches = code.match(/class=["'][^"']*photo-container[^"']*["']/g);

  // Fallback checks
  const rawNameFallback = (code.match(/(?:data\.)?name\s*\|\|\s*['"`]([^'"`]+)['"`]/) || [])[1] || null;
  const rawTitleFallback = (code.match(/(?:data\.)?title\s*\|\|\s*['"`]([^'"`]+)['"`]/) || [])[1] || null;
  const rawEmailFallback = (code.match(/(?:data\.)?email\s*\|\|\s*['"`]([^'"`]+)['"`]/) || [])[1] || null;
  const rawPhoneFallback = (code.match(/(?:data\.)?phone\s*\|\|\s*['"`]([^'"`]+)['"`]/) || [])[1] || null;
  const rawSummaryFallback = (code.match(/(?:data\.)?(?:summary|profile|about)\s*\|\|\s*['"`]([^'"`]+)['"`]/) || [])[1] || null;

  // Array handling: check if array fields are guarded with (data.arr && data.arr.length)
  const expGuarded = code.includes('data.experience && data.experience.length') || code.includes('experience && experience.length') || code.includes('data.experience?.length');
  const eduGuarded = code.includes('data.education && data.education.length') || code.includes('education && education.length') || code.includes('data.education?.length');
  const skillsGuarded = code.includes('data.skills && data.skills.length') || code.includes('skills && skills.length') || code.includes('data.skills?.length');
  const projGuarded = code.includes('data.projects && data.projects.length') || code.includes('projects && projects.length') || code.includes('data.projects?.length');
  const certGuarded = code.includes('data.certifications && data.certifications.length') || code.includes('certifications && certifications.length') || code.includes('data.certifications?.length');
  const refGuarded = code.includes('data.references && data.references.length') || code.includes('references && references.length') || code.includes('data.references?.length');

  // Contact wrapper guarded
  const contactGuarded = code.includes('data.phone || data.email || data.location') || code.includes('data.phone || data.email') || code.includes('phoneText || emailText');

  inventory.push({
    file,
    fnName,
    layoutType: isTwoColumn ? 'Two-Column / Sidebar' : 'Single-Column Full-Width',
    geometry: {
      hasSvgPolygon,
      hasDiagonalWedge,
      hasArchFrame
    },
    avatar: {
      hasMaskDiv: !!avatarMaskMatches,
      hasPhotoContainer: !!photoContainerMatches,
      imgTag: avatarImgMatches ? avatarImgMatches[0] : null
    },
    fallbacks: {
      name: rawNameFallback,
      title: rawTitleFallback,
      email: rawEmailFallback,
      phone: rawPhoneFallback,
      summary: rawSummaryFallback
    },
    guards: {
      experience: expGuarded,
      education: eduGuarded,
      skills: skillsGuarded,
      projects: projGuarded,
      certifications: certGuarded,
      references: refGuarded,
      contact: contactGuarded
    }
  });
}

fs.writeFileSync('.agents/explorer_0_2/full_inventory.json', JSON.stringify(inventory, null, 2));

console.log('Full Inventory Generated.');
const unGuardedContact = inventory.filter(i => !i.guards.contact);
console.log(`Templates with unguarded contact sections (renders empty contact wrapper): ${unGuardedContact.length} / ${inventory.length}`);
