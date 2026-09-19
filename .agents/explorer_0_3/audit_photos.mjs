import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const testDataWithPhoto = {
  name: 'Test Candidate',
  photoUrl: '/images/candidates/mariana.jpg',
  title: 'Engineer',
  email: 'test@example.com'
};

const photoAudits = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  const hasPhotoHandling = content.includes('photoUrl') || content.includes('photoSrc');
  
  // Find photo CSS classes
  const photoWrapperMatch = content.match(/\.(?:avatar-container|avatar-mask|avatar-wrapper|photo-wrapper|photo-container|avatar-frame|profile-photo-container|photo-box)\s*\{([^}]+)\}/i);
  const photoImgMatch = content.match(/\.(?:avatar|profile-photo|photo)\s*\{([^}]+)\}/i);
  
  // Find photo HTML markup in template
  const photoMarkupMatch = content.match(/\$\{[^}]*photo(?:Url|Src)[^}]*\?[\s\S]*?:\s*['"][^'"]*['"]\s*\}/i);

  // Check if img is wrapped in a container with overflow:hidden and border-radius
  const hasDedicatedWrapper = /\<(?:div|span)[^>]*class=["'][^"']*(?:mask|wrapper|container|frame|box)[^"']*["'][^>]*>[\s\S]*?<img/i.test(content);
  
  // Check if wrapper has overflow: hidden
  const wrapperHasOverflowHidden = photoWrapperMatch ? photoWrapperMatch[1].includes('overflow: hidden') || photoWrapperMatch[1].includes('overflow:hidden') : false;
  
  // Check border-radius
  const wrapperBorderRadius = photoWrapperMatch ? (photoWrapperMatch[1].match(/border-radius:\s*([^;]+);/) || [])[1] : null;
  const imgBorderRadius = photoImgMatch ? (photoImgMatch[1].match(/border-radius:\s*([^;]+);/) || [])[1] : null;

  photoAudits.push({
    file,
    hasPhotoHandling,
    hasDedicatedWrapper,
    wrapperHasOverflowHidden,
    wrapperBorderRadius,
    imgBorderRadius,
    wrapperCSS: photoWrapperMatch ? photoWrapperMatch[1].replace(/\s+/g, ' ').trim() : 'NONE',
    imgCSS: photoImgMatch ? photoImgMatch[1].replace(/\s+/g, ' ').trim() : 'NONE'
  });
}

console.log(`\n--- PHOTO CONTAINER AUDIT (${photoAudits.length} templates) ---`);
console.log(`Templates with photo handling: ${photoAudits.filter(p => p.hasPhotoHandling).length} / ${photoAudits.length}`);
console.log(`Templates with dedicated photo wrapper: ${photoAudits.filter(p => p.hasDedicatedWrapper).length} / ${photoAudits.length}`);
console.log(`Templates with wrapper overflow:hidden: ${photoAudits.filter(p => p.wrapperHasOverflowHidden).length} / ${photoAudits.length}`);

const missingWrapper = photoAudits.filter(p => p.hasPhotoHandling && (!p.hasDedicatedWrapper || !p.wrapperHasOverflowHidden));
console.log(`Templates missing dedicated overflow:hidden wrapper (${missingWrapper.length}):`);
missingWrapper.forEach(m => console.log(`  - ${m.file} (wrapper: ${m.hasDedicatedWrapper}, overflow:hidden: ${m.wrapperHasOverflowHidden})`));

fs.writeFileSync('.agents/explorer_0_3/photo_container_audits.json', JSON.stringify(photoAudits, null, 2));
