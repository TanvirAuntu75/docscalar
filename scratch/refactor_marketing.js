import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.match(/\.(js|jsx|json)$/)) {
      results.push(file);
    }
  });
  return results;
};

const files = walk('./src');
files.push(path.resolve('./scratch/compile_knowledge.js'));

let totalModified = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Protect code-level occurrences by temporarily substituting them
  content = content.replace(/addEventListener\('offline'/g, "addEventListener('__PROTECTED_OFFLINE__'");
  content = content.replace(/removeEventListener\('offline'/g, "removeEventListener('__PROTECTED_OFFLINE__'");
  content = content.replace(/handleOffline/g, "__PROTECTED_HANDLE__");
  content = content.replace(/icon: 'offline_pin'/g, "icon: '__PROTECTED_ICON_1__'");
  content = content.replace(/icon: 'cloud_off'/g, "icon: '__PROTECTED_ICON_2__'");

  // Specific Marketing Phrase Replacements (Case Insensitive using regex 'gi')
  content = content.replace(/100% offline/gi, "100% Local First");
  content = content.replace(/offline AI/gi, "On Device AI");
  content = content.replace(/offline-first/gi, "Local First");
  content = content.replace(/offline document/gi, "Client Side document");
  content = content.replace(/offline tools/gi, "Local Compute tools");
  content = content.replace(/offline cache/gi, "Local browser cache");
  content = content.replace(/offline processing/gi, "Client Side processing");
  content = content.replace(/completely offline/gi, "completely Local Compute");
  content = content.replace(/fully offline/gi, "fully Client Side");
  content = content.replace(/works offline/gi, "features Zero Latency");
  content = content.replace(/runs offline/gi, "runs Locally");
  content = content.replace(/Offline Capability/gi, "Local Compute Capability");
  content = content.replace(/Offline Engine Active/gi, "Local Engine Active");
  content = content.replace(/Conversion Server Offline/gi, "Conversion Server Disconnected");
  content = content.replace(/offline converter/gi, "Client Side converter");
  content = content.replace(/offline translation/gi, "On Device translation");
  content = content.replace(/offline translator/gi, "On Device translator");
  content = content.replace(/offline history/gi, "Local browser history");

  // Fallback for any remaining "offline" occurrences (excluding the protected ones)
  content = content.replace(/\boffline\b/gi, "Client Side");

  // Also remove hyphens from specific marketing buzzwords that might exist
  content = content.replace(/Privacy-by-Design/gi, "Privacy by Design");
  content = content.replace(/Privacy-first/gi, "Privacy First");
  content = content.replace(/Miro-style/gi, "Miro style");
  content = content.replace(/boardroom-ready/gi, "boardroom ready");
  content = content.replace(/server-side/gi, "Server Side");
  content = content.replace(/client-side/gi, "Client Side");

  // Restore protected code-level occurrences
  content = content.replace(/__PROTECTED_OFFLINE__/g, "offline");
  content = content.replace(/__PROTECTED_HANDLE__/g, "handleOffline");
  content = content.replace(/__PROTECTED_ICON_1__/g, "offline_pin");
  content = content.replace(/__PROTECTED_ICON_2__/g, "cloud_off");

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${path.relative(process.cwd(), file)}`);
    totalModified++;
  }
});

console.log(`\nRefactoring complete. ${totalModified} files updated.`);
