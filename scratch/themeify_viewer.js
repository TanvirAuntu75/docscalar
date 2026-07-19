const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/utility/DocumentViewer.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace background and text classes
content = content.replaceAll('bg-[#090b0f] text-[#f8fafc]', 'bg-primary text-on-background');
content = content.replaceAll('bg-[#090b0f]', 'bg-primary');
content = content.replaceAll('bg-[#0b0c13]', 'bg-secondary');
content = content.replaceAll('bg-[#0f111a]', 'bg-tertiary');
content = content.replaceAll('from-[#090b0f]', 'from-primary');
content = content.replaceAll('to-[#090b0f]/0', 'to-primary/0');

// Replace border classes
content = content.replaceAll('border-white/5', 'border-outline-variant/40');
content = content.replaceAll('border-white/10', 'border-outline-variant/60');
content = content.replaceAll('border-white/20', 'border-outline-variant/80');

fs.writeFileSync(filePath, content, 'utf8');
console.log('DocumentViewer theme mapping successfully completed.');
