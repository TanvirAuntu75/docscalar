const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/utility/DocumentViewer.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Wrapper flex layout and scrollable viewport p-4
content = content.replaceAll(
  'className="w-full h-full flex items-center justify-center overflow-auto"',
  'className="w-full h-full flex overflow-auto p-4"'
);

// 2. PDF Renderer container and canvas sizes
content = content.replaceAll(
  'className="relative border border-outline-variant/60 rounded-xl overflow-hidden bg-white shadow-xl max-h-full max-w-full"',
  'className="relative border border-outline-variant/60 rounded-xl overflow-hidden bg-white shadow-xl m-auto"'
);
content = content.replaceAll(
  'className="block max-h-full max-w-full"',
  'className="block"'
);

// 3. DOCX Renderer
content = content.replaceAll(
  'className="w-full max-w-[800px] bg-white text-black p-8 border border-outline-variant/60 rounded-xl shadow-xl overflow-y-auto max-h-full leading-normal"',
  'className="w-full max-w-[800px] bg-white text-black p-8 border border-outline-variant/60 rounded-xl shadow-xl overflow-y-auto max-h-full leading-normal m-auto"'
);

// 4. Excel & CSV
content = content.replaceAll(
  'className="w-full h-full flex flex-col bg-secondary rounded-xl subtle-border border-outline-variant/40 overflow-hidden"',
  'className="w-full h-full flex flex-col bg-secondary rounded-xl subtle-border border-outline-variant/40 overflow-hidden m-auto"'
);

// 5. PPTX Slider
content = content.replaceAll(
  'className="flex flex-col items-center gap-4 max-w-full"',
  'className="flex flex-col items-center gap-4 max-w-full m-auto"'
);

// 6. PPTX PDF Preview
content = content.replaceAll(
  'className="w-full h-full flex items-center justify-center"',
  'className="w-full h-full flex items-center justify-center m-auto"'
);

// 7. ZIP explorer
content = content.replaceAll(
  'className="w-full h-full flex bg-secondary rounded-xl subtle-border border-outline-variant/40 overflow-hidden"',
  'className="w-full h-full flex bg-secondary rounded-xl subtle-border border-outline-variant/40 overflow-hidden m-auto"'
);

// 8. Plain Text
content = content.replaceAll(
  'className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto leading-relaxed max-h-full select-text text-text-secondary whitespace-pre-wrap"',
  'className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto leading-relaxed max-h-full select-text text-text-secondary whitespace-pre-wrap m-auto"'
);

// 9. Markdown
content = content.replaceAll(
  'className="w-full max-w-[800px] text-left p-8 bg-secondary border border-outline-variant/40 rounded-xl font-sans text-xs overflow-auto max-h-full select-text leading-relaxed"',
  'className="w-full max-w-[800px] text-left p-8 bg-secondary border border-outline-variant/40 rounded-xl font-sans text-xs overflow-auto max-h-full select-text leading-relaxed m-auto"'
);

// 10. Code View
content = content.replaceAll(
  'className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto max-h-full leading-relaxed select-text"',
  'className="w-full max-w-[800px] text-left p-6 bg-secondary border border-outline-variant/40 rounded-xl font-mono text-xs overflow-auto max-h-full leading-relaxed select-text m-auto"'
);

// 11. Sandboxed HTML frame
content = content.replaceAll(
  'className="w-full h-full border border-outline-variant/40 rounded-xl overflow-hidden bg-white"',
  'className="w-full h-full border border-outline-variant/40 rounded-xl overflow-hidden bg-white m-auto"'
);

// 12. Video Player
content = content.replaceAll(
  'className="relative max-h-full max-w-4xl border border-outline-variant/60 rounded-xl overflow-hidden shadow-2xl"',
  'className="relative max-h-full max-w-4xl border border-outline-variant/60 rounded-xl overflow-hidden shadow-2xl m-auto"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('DocumentViewer layout centering and scroll parameters successfully updated.');
