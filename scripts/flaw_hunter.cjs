const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

const targetFiles = [
  'src/components/LandingPage.jsx',
  'src/pages/Home.jsx',
  'src/pages/Pricing.jsx',
  'src/components/AIChatBot.jsx',
  'src/components/ToolPageLayout.jsx'
];

console.log('=== SCANNING LANDING/HOME/CHATBOT FOR HUMAN TEXT HYPHENS ===');

targetFiles.forEach(relPath => {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('import ')) return;

    // Match words with hyphens
    const matches = line.match(/[a-zA-Z]{2,}-[a-zA-Z]{2,}/g);
    if (matches) {
      matches.forEach(m => {
        const lower = m.toLowerCase();
        // Skip common tailwind / css / web standards
        if (
          lower.startsWith('material-') || lower.startsWith('cv-') || lower.startsWith('docforge-') ||
          lower.startsWith('react-') || lower.startsWith('bg-') || lower.startsWith('text-') ||
          lower.startsWith('border-') || lower.startsWith('grid-') || lower.startsWith('flex-') ||
          lower.startsWith('rounded-') || lower.startsWith('shadow-') || lower.startsWith('items-') ||
          lower.startsWith('justify-') || lower.startsWith('p-') || lower.startsWith('px-') ||
          lower.startsWith('py-') || lower.startsWith('m-') || lower.startsWith('mx-') ||
          lower.startsWith('my-') || lower.startsWith('w-') || lower.startsWith('h-') ||
          lower.startsWith('gap-') || lower.startsWith('col-') || lower.startsWith('row-') ||
          lower.startsWith('scale-') || lower.startsWith('translate-') || lower.startsWith('overflow-') ||
          lower.endsWith('-outlined') || lower.endsWith('-rounded') || lower.endsWith('-sharp') ||
          lower.endsWith('-down') || lower.endsWith('-up') || lower.endsWith('-left') || lower.endsWith('-right') ||
          lower.endsWith('-pdf') || lower.startsWith('pdf-') || lower.startsWith('docx-') ||
          lower.startsWith('pptx-') || lower.startsWith('excel-') || lower.startsWith('html-') ||
          lower.startsWith('image-') || lower.endsWith('-to-pdf') || lower.startsWith('to-') ||
          lower.includes('surface-') || lower.includes('outline-') || lower.includes('container-') ||
          lower.includes('font-') || lower.includes('leading-') || lower.includes('transition-') ||
          lower.includes('hover:') || lower.includes('group-') || lower.includes('duration-') ||
          lower.includes('delay-') || lower.includes('cursor-') || lower.includes('select-') ||
          lower.includes('space-') || lower.includes('ring-') || lower.includes('blur-') ||
          lower.includes('opacity-') || lower.includes('line-clamp') || lower.includes('ease-') ||
          lower.includes('animate-') || lower.includes('fade-') || lower.includes('zoom-') ||
          lower === 'sans-serif' || lower === 'monospace' || lower === 'utf-8' || lower === 'inline-flex' ||
          lower === 'inline-block' || lower === 'space-between' || lower === 'border-box' ||
          lower === 'drop-shadow' || lower === 'pointer-events' || lower === 'aria-label'
        ) {
          return;
        }

        // Check if inside JSX text or string
        console.log(`[${relPath}:${lineNum}] ${m} ===> ${trimmed.slice(0, 110)}`);
      });
    }
  });
});
