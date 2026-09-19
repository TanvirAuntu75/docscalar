/* SEO and Structured Data definitions for all DocScalar tools */

export const TOOL_SEO_DATA = {
  'merge-pdf': {
    title: 'Merge PDF Files Online Free — Combine Multiple PDFs | DocScalar',
    description: 'Merge multiple PDF files into one single document in seconds. 100% private, client side processing directly in your browser without uploading to any remote server.',
    keywords: 'merge pdf, combine pdf, join pdf files, merge pdf online free, merge documents client side',
    howTo: [
      { step: '1', title: 'Upload PDF Files', desc: 'Select or drag & drop two or more PDF documents into the workspace.' },
      { step: '2', title: 'Reorder Documents', desc: 'Drag and arrange the PDF thumbnails in your preferred sequence.' },
      { step: '3', title: 'Merge & Save', desc: 'Click Merge PDF to assemble into a single high fidelity PDF and download immediately.' }
    ],
    faqs: [
      { q: 'Is there a limit on how many PDFs I can merge?', a: 'You can merge dozens of PDF files simultaneously directly on your device without upload delays.' },
      { q: 'Are my merged documents private and secure?', a: 'Yes. DocScalar processes your files directly in your web browser memory. Your documents never touch external cloud servers.' },
      { q: 'Does merging affect document quality or bookmarks?', a: 'DocScalar preserves all vector graphics, embedded fonts, forms, and page structures losslessly.' }
    ]
  },
  'split-pdf': {
    title: 'Split PDF Online Free — Extract Pages & Separate Files | DocScalar',
    description: 'Split PDF files into individual pages or custom page ranges instantly. Zero server uploads, completely private and fast.',
    keywords: 'split pdf, extract pdf pages, separate pdf, cut pdf pages online, split pdf free',
    howTo: [
      { step: '1', title: 'Select Your PDF', desc: 'Upload the PDF document you wish to divide.' },
      { step: '2', title: 'Define Page Ranges', desc: 'Specify individual pages (e.g., 1, 3, 5) or ranges (e.g., 2 to 8), or split every page.' },
      { step: '3', title: 'Download Split Pages', desc: 'Receive your separated PDF files or a bundled ZIP archive instantly.' }
    ],
    faqs: [
      { q: 'Can I extract specific non consecutive pages?', a: 'Yes, you can enter any custom comma separated list of page numbers or ranges.' },
      { q: 'How fast is PDF splitting on DocScalar?', a: 'Because processing happens entirely in client memory via WebAssembly, splitting is near instant.' }
    ]
  },
  'compress-pdf': {
    title: 'Compress PDF Online Free — Reduce PDF File Size | DocScalar',
    description: 'Reduce PDF file size without sacrificing readability or graphic clarity. Optimize documents for email, job portals, and web publishing.',
    keywords: 'compress pdf, reduce pdf size, shrink pdf online, compress pdf for email, compress pdf to 200kb',
    howTo: [
      { step: '1', title: 'Choose PDF to Compress', desc: 'Drag and drop your oversized PDF file into the dropzone.' },
      { step: '2', title: 'Select Compression Level', desc: 'Choose between Extreme, Recommended, or High Quality compression presets.' },
      { step: '3', title: 'Download Compact PDF', desc: 'Get your lightweight PDF with file size reduction up to 85%.' }
    ],
    faqs: [
      { q: 'How much can I reduce my PDF file size?', a: 'Depending on the image resolution and embedded assets, files are commonly compressed by 40% to 85%.' },
      { q: 'Will my text become blurry after compression?', a: 'No. DocScalar preserves all vector text and typography while intelligently optimizing images and removing redundant streams.' }
    ]
  },
  'pdf-to-word': {
    title: 'Convert PDF to Word Online Free — DOCX Converter | DocScalar',
    description: 'Convert PDF documents into fully editable Microsoft Word DOCX files. Preserves tables, headers, columns, fonts, and layouts accurately.',
    keywords: 'pdf to word, convert pdf to docx, pdf to word editable, pdf to word converter online free, scan to word',
    howTo: [
      { step: '1', title: 'Upload PDF Document', desc: 'Select the PDF contract, report, or paper you need to edit.' },
      { step: '2', title: 'Analyze & Convert', desc: 'DocScalar extracts typography, paragraph alignments, and tabular grids.' },
      { step: '3', title: 'Download Word DOCX', desc: 'Open and edit the resulting Word document in Microsoft Word, Google Docs, or LibreOffice.' }
    ],
    faqs: [
      { q: 'Are tables and multi column layouts preserved?', a: 'Yes. Our layout reconstruction engine detects tabular borders, merged cells, and text flow accurately.' },
      { q: 'Can I convert scanned PDFs into editable text?', a: 'Yes, DocScalar incorporates neural OCR to recognize text characters even from image scans.' }
    ]
  },
  'docx-to-pdf': {
    title: 'Convert Word to PDF Online Free — DOCX to PDF | DocScalar',
    description: 'Convert Microsoft Word DOCX and DOC files to high fidelity PDF documents. Exact font rendering, page margins, and vector graphics.',
    keywords: 'word to pdf, convert docx to pdf, doc to pdf online free, save word as pdf',
    howTo: [
      { step: '1', title: 'Select Word Document', desc: 'Drop your .docx or .doc file into the converter.' },
      { step: '2', title: 'Compile to PDF', desc: 'DocScalar renders vector typography and formatting with pixel precision.' },
      { step: '3', title: 'Download PDF', desc: 'Save your print ready, standardized PDF file immediately.' }
    ],
    faqs: [
      { q: 'Will my Word fonts and layout shift?', a: 'No. The conversion pipeline strictly adheres to standard OpenXML geometry and typographical metrics.' }
    ]
  },
  'protect-pdf': {
    title: 'Protect PDF with Password Online — Encrypt PDF | DocScalar',
    description: 'Encrypt your PDF documents with military grade AES 256 password protection. Restrict printing, editing, and copying.',
    keywords: 'protect pdf, password protect pdf, encrypt pdf online, lock pdf, aes 256 pdf encryption',
    howTo: [
      { step: '1', title: 'Upload Confidential PDF', desc: 'Select the sensitive document you want to secure.' },
      { step: '2', title: 'Set Strong Password', desc: 'Enter and confirm your chosen encryption password.' },
      { step: '3', title: 'Download Encrypted PDF', desc: 'Get your AES encrypted PDF that requires a password to open on any reader.' }
    ],
    faqs: [
      { q: 'What encryption standard does DocScalar use?', a: 'DocScalar applies industry standard AES encryption compatible with all PDF viewers including Adobe Acrobat.' }
    ]
  },
  'unlock-pdf': {
    title: 'Unlock PDF Online Free — Remove PDF Password | DocScalar',
    description: 'Remove password protection and permission restrictions from your PDF documents safely and instantly.',
    keywords: 'unlock pdf, remove pdf password, decrypt pdf online, unlock protected pdf',
    howTo: [
      { step: '1', title: 'Select Locked PDF', desc: 'Upload the encrypted document.' },
      { step: '2', title: 'Provide Password', desc: 'Input the authorized decryption password.' },
      { step: '3', title: 'Download Unlocked PDF', desc: 'Save a clean, unencrypted version for unrestricted printing and editing.' }
    ],
    faqs: [
      { q: 'Can I unlock a PDF without knowing the owner password?', a: 'If the document only has restriction permissions (print/copy restrictions), it can often be unlocked directly.' }
    ]
  },
  'sign-pdf': {
    title: 'Sign PDF Online Free — Add Digital Signature | DocScalar',
    description: 'Sign PDF documents electronically with drawn, typed, or uploaded signatures. Create professional, legally binding documents in seconds.',
    keywords: 'sign pdf, esign pdf online, electronic signature, draw signature on pdf, sign document free',
    howTo: [
      { step: '1', title: 'Open Document to Sign', desc: 'Load your contract, NDA, or agreement into the interactive Sign Studio.' },
      { step: '2', title: 'Create Your Signature', desc: 'Draw with mouse/pen, type your name in elegant script, or upload a signature image.' },
      { step: '3', title: 'Place & Export', desc: 'Position and resize your signature stamp on any page, then export your signed PDF.' }
    ],
    faqs: [
      { q: 'Is signing a PDF in DocScalar legally recognized?', a: 'Yes, electronic signatures created via DocScalar comply with standard esignature frameworks for business documents.' }
    ]
  },
  'ocr-pdf': {
    title: 'OCR PDF Online Free — Make Scanned PDFs Searchable | DocScalar',
    description: 'Extract text from scanned PDF documents and images using optical character recognition. Search and copy text directly.',
    keywords: 'ocr pdf, optical character recognition pdf, scanned pdf to text, make pdf searchable online',
    howTo: [
      { step: '1', title: 'Upload Scanned PDF', desc: 'Drop in your scanned document or image based PDF.' },
      { step: '2', title: 'Run Text Recognition', desc: 'Neural OCR processes characters, headings, and numerical tables.' },
      { step: '3', title: 'Download Searchable PDF', desc: 'Receive a PDF with an invisible selectable text layer superimposed over the scan.' }
    ],
    faqs: [
      { q: 'What languages does the OCR engine support?', a: 'DocScalar supports English, Spanish, French, German, and multiple global scripts.' }
    ]
  },
  'compare-pdf': {
    title: 'Compare PDF Files Online — Side by Side Visual Diff | DocScalar',
    description: 'Compare two versions of a PDF document to find changes, insertions, deletions, and visual differences instantly.',
    keywords: 'compare pdf, pdf diff online, compare two pdf files, find differences in pdf',
    howTo: [
      { step: '1', title: 'Upload Both Versions', desc: 'Select the Original PDF and the Modified PDF.' },
      { step: '2', title: 'Analyze Differences', desc: 'DocScalar highlights altered paragraphs, typography changes, and layout shifts.' },
      { step: '3', title: 'Review Diff Report', desc: 'Inspect side by side or overlay view with synchronized scrolling.' }
    ],
    faqs: [
      { q: 'Does comparison detect both text and image changes?', a: 'Yes. DocScalar features both structural text diffing and high resolution pixel overlay comparison.' }
    ]
  },
  'ai-summarizer': {
    title: 'AI Document Summarizer Online Free — Executive Summaries | DocScalar',
    description: 'Summarize PDF documents and research papers with AI graph centrality. Extract key highlights, executive briefs, and concepts 100% client side.',
    keywords: 'summarize pdf, ai pdf summarizer, summarize document online, executive summary generator, textrank summarizer free',
    howTo: [
      { step: '1', title: 'Upload Document', desc: 'Drag and drop your PDF, DOCX, or text file into the dropzone.' },
      { step: '2', title: 'Select Summary Mode', desc: 'Choose between Executive Brief, Key Highlights, Bullets, or Abstract.' },
      { step: '3', title: 'Export PDF Brief', desc: 'Download a beautifully formatted Executive Brief PDF with compression telemetry.' }
    ],
    faqs: [
      { q: 'How does the AI summarizer work without cloud servers?', a: 'DocScalar uses client side TextRank graph centrality running in WebAssembly and JavaScript directly inside your browser.' },
      { q: 'Are my confidential research papers private?', a: 'Yes. Processing happens 100% in your local browser memory with zero server uploads.' }
    ]
  },
  'ai-translator': {
    title: 'AI Document Translator Online Free — Translate PDFs | DocScalar',
    description: 'Translate PDF documents into Spanish, French, German, Japanese, and 30+ languages. Fast, accurate, and private vector PDF translation.',
    keywords: 'translate pdf, pdf translator online, translate document to spanish, free document translator, translate pdf without losing format',
    howTo: [
      { step: '1', title: 'Upload PDF Document', desc: 'Select or drag & drop the PDF document you wish to translate.' },
      { step: '2', title: 'Select Target Language', desc: 'Choose from 17+ world languages including Spanish, French, German, and Japanese.' },
      { step: '3', title: 'Download Translated PDF', desc: 'Receive a freshly typeset vector PDF with translated paragraphs and page boundaries intact.' }
    ],
    faqs: [
      { q: 'Does PDF translation preserve document layout?', a: 'Yes, translated documents maintain page breaks, paragraph alignments, and clean vector typography.' },
      { q: 'Can I translate multi page documents?', a: 'Yes, DocScalar translates all pages sequentially with live page progress.' }
    ]
  }
};

export const getSeoDataForTool = (toolId, fallbackTitle, fallbackDesc) => {
  if (TOOL_SEO_DATA[toolId]) {
    return TOOL_SEO_DATA[toolId];
  }
  return {
    title: `${fallbackTitle || 'Tool'} Online Free — 100% Private | DocScalar`,
    description: fallbackDesc || 'Fast, private, client side document processing in your browser. No files uploaded to external servers.',
    keywords: `${fallbackTitle?.toLowerCase() || 'pdf tool'}, document converter, free online tool, private pdf`,
    howTo: [
      { step: '1', title: 'Upload Document', desc: 'Drag and drop your file into the secure dropzone.' },
      { step: '2', title: 'Configure Options', desc: 'Select your preferred settings or adjustments.' },
      { step: '3', title: 'Process & Download', desc: 'Click process to generate and download your completed file instantly.' }
    ],
    faqs: [
      { q: 'Are my files stored or uploaded to a cloud server?', a: 'No. All client side tools run in your web browser memory for 100% data confidentiality.' },
      { q: 'Is DocScalar completely free to use?', a: 'Yes, standard document processing is free with no registration required.' }
    ]
  };
};
