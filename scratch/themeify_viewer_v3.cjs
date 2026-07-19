const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/utility/DocumentViewer.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace root container bg-primary
content = content.replaceAll(
  'className={`flex flex-col bg-primary text-on-background select-none ${',
  'className={`flex flex-col bg-background text-on-background select-none ${'
);

// Replace workspace container z-index and bg-background to cover navbar
content = content.replaceAll(
  'className={`flex-1 flex flex-col ${fullscreen ? \'fixed inset-0 z-50 bg-primary\' : \'relative\'}`}',
  'className="flex-1 flex flex-col fixed inset-0 z-[60] bg-background"'
);

// Replace viewport container bg-primary with bg-tertiary for nice contrast
content = content.replaceAll(
  'className="flex-1 flex flex-col bg-primary overflow-auto items-center justify-center p-4 relative" ref={viewportRef}',
  'className="flex-1 flex flex-col bg-tertiary overflow-auto items-center justify-center p-4 relative" ref={viewportRef}'
);

// Replace loading backdrop bg-primary/80 with bg-background/80
content = content.replaceAll(
  'className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-primary/80 gap-3"',
  'className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 gap-3"'
);

// Replace code view wrapper bg-primary with bg-background
content = content.replaceAll(
  'className="flex-1 bg-primary flex items-center justify-center p-4 overflow-auto"',
  'className="flex-1 bg-background flex items-center justify-center p-4 overflow-auto"'
);

// Replace video player gradient from-primary to from-background
content = content.replaceAll(
  'bg-gradient-to-t from-primary to-primary/0',
  'bg-gradient-to-t from-background to-background/0'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('DocumentViewer backgrounds successfully updated to theme variables.');
