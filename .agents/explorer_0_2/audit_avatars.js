import fs from 'fs';
import path from 'path';

const templatesDir = path.resolve('src/engines/utility/templates');
const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.js'));

const avatarAnalysis = [];

for (const file of files) {
  const filePath = path.join(templatesDir, file);
  const code = fs.readFileSync(filePath, 'utf-8');

  // Look for <img> tags
  const imgTags = code.match(/<img[^>]*>/gi) || [];
  
  // Look for avatar containers
  const avatarContainers = code.match(/<div[^>]*class=["'][^"']*(?:avatar|photo|headshot|portrait)[^"']*["'][^>]*>/gi) || [];

  // Check if there is an avatar-mask class
  const hasAvatarMask = code.includes('avatar-mask');

  // Check if img is styled directly with border-radius vs inside overflow:hidden container
  const imgHasBorderRadius = code.includes('img.avatar') || code.includes('.avatar img') || code.includes('.profile-photo');

  avatarAnalysis.push({
    file,
    imgCount: imgTags.length,
    sampleImg: imgTags[0] || null,
    avatarContainers,
    hasAvatarMask,
    hasPhotoCondition: code.includes('data.photoUrl ?') || code.includes('photoSrc ?') || code.includes('data.photoUrl &&')
  });
}

fs.writeFileSync('.agents/explorer_0_2/avatar_analysis.json', JSON.stringify(avatarAnalysis, null, 2));

console.log('=== AVATAR AUDIT ===');
console.log(`Templates with <img>: ${avatarAnalysis.filter(a => a.imgCount > 0).length}`);
console.log(`Templates with .avatar-mask: ${avatarAnalysis.filter(a => a.hasAvatarMask).length}`);
console.log(`Templates with photo conditions: ${avatarAnalysis.filter(a => a.hasPhotoCondition).length}`);
console.log('\nSample avatar implementations:');
avatarAnalysis.slice(0, 10).forEach(a => {
  console.log(`- ${a.file}: hasMask=${a.hasAvatarMask}, img=${a.sampleImg}`);
});
