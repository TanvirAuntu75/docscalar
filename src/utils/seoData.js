/* SEO and Structured Data definitions for all DocScalar tools */

export const TOOL_SEO_DATA = {
  'merge-pdf': {
    title: 'Merge PDF Files Online Free — Combine Multiple PDFs | DocScalar',
    description: 'Merge multiple PDF files into one single document in seconds. Fast, secure processing with total data privacy and lossless quality.',
    keywords: 'merge pdf, combine pdf, join pdf files, merge pdf online free, merge documents securely',
    howTo: [
      { step: '1', title: 'Upload PDF Files', desc: 'Select or drag & drop two or more PDF documents into the workspace.' },
      { step: '2', title: 'Reorder Documents', desc: 'Drag and arrange the PDF thumbnails in your preferred sequence.' },
      { step: '3', title: 'Merge & Save', desc: 'Click Merge PDF to assemble into a single high fidelity PDF and download immediately.' }
    ],
    faqs: [
      { q: 'Is there a limit on how many PDFs I can merge?', a: 'You can merge dozens of PDF files simultaneously with high-speed parallel throughput.' },
      { q: 'Are my merged documents private and secure?', a: 'Yes. DocScalar processes your files with strict privacy protections. Documents are processed in isolated transient memory and never persisted or shared.' },
      { q: 'Does merging affect document quality or bookmarks?', a: 'DocScalar preserves all vector graphics, embedded fonts, forms, and page structures losslessly.' }
    ]
  },
  'split-pdf': {
    title: 'Split PDF Online Free — Extract Pages & Separate Files | DocScalar',
    description: 'Split PDF files into individual pages or custom page ranges instantly. Fast, private, and precise.',
    keywords: 'split pdf, extract pdf pages, separate pdf, cut pdf pages online, split pdf free',
    howTo: [
      { step: '1', title: 'Select Your PDF', desc: 'Upload the PDF document you wish to divide.' },
      { step: '2', title: 'Define Page Ranges', desc: 'Specify individual pages (e.g., 1, 3, 5) or ranges (e.g., 2 to 8), or split every page.' },
      { step: '3', title: 'Download Split Pages', desc: 'Receive your separated PDF files or a bundled ZIP archive instantly.' }
    ],
    faqs: [
      { q: 'Can I extract specific non consecutive pages?', a: 'Yes, you can enter any custom comma separated list of page numbers or ranges.' },
      { q: 'How fast is PDF splitting on DocScalar?', a: 'Because processing is executed directly in optimized memory pipelines, splitting is near instant.' }
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
      { q: 'Will my Word fonts and layout shift?', a: 'No. The conversion pipeline strictly adheres to standard OpenXML geometry and typographical metrics.' },
      { q: 'Can I convert docx to pdf without installing Microsoft Word?', a: 'Yes. DocScalar compiles Word files natively using serverless OpenXML parsers without requiring any Microsoft Office installation.' }
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
      { q: 'What encryption standard does DocScalar use?', a: 'DocScalar applies industry standard AES encryption compatible with all PDF viewers including Adobe Acrobat.' },
      { q: 'Can a password protected PDF be opened on smartphones?', a: 'Yes. Standard AES-256 PDF encryption is universally supported by iOS, Android, macOS, Windows, and Linux built-in readers.' }
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
      { q: 'Can I unlock a PDF without knowing the owner password?', a: 'If the document only has restriction permissions (print/copy restrictions), it can often be unlocked directly.' },
      { q: 'Is it legal to remove passwords from PDF files?', a: 'You may remove passwords from any documents you own or have explicit authorization from the copyright holder to modify.' }
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
      { q: 'Is signing a PDF in DocScalar legally recognized?', a: 'Yes, electronic signatures created via DocScalar comply with standard esignature frameworks for business documents.' },
      { q: 'Can I save multiple signature profiles for reuse?', a: 'Yes. You can store your handwritten or typed signature stamps in your active session for quick reuse across contracts.' }
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
      { q: 'What languages does the OCR engine support?', a: 'DocScalar supports English, Spanish, French, German, and multiple global scripts.' },
      { q: 'Does OCR change the original layout or fonts of the document?', a: 'No. DocScalar superimposes a transparent text layer over your scan so the visual appearance remains 100% identical while text becomes selectable.' }
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
      { q: 'Does comparison detect both text and image changes?', a: 'Yes. DocScalar features both structural text diffing and high resolution pixel overlay comparison.' },
      { q: 'Can I export a summary report of all detected differences?', a: 'Yes. You can export a consolidated comparison report highlighting all added, deleted, and modified text passages.' }
    ]
  },
  'rotate-pdf': {
    title: 'Rotate PDF Online Free — Permanently Change PDF Orientation | DocScalar',
    description: 'Rotate PDF pages 90, 180, or 270 degrees clockwise or counterclockwise. Save permanent orientation changes per page or for entire documents.',
    keywords: 'rotate pdf, change pdf orientation, turn pdf pages, rotate pdf online free, permanent pdf rotation',
    howTo: [
      { step: '1', title: 'Upload PDF Document', desc: 'Drop your PDF file into the rotation canvas.' },
      { step: '2', title: 'Rotate Individual or All Pages', desc: 'Click rotation buttons to turn single pages or apply 90°/180° rotation across all pages.' },
      { step: '3', title: 'Apply & Download', desc: 'Click Save & Download to export your properly oriented PDF file immediately.' }
    ],
    faqs: [
      { q: 'Does rotating a PDF degrade image or vector quality?', a: 'No, rotation only updates the PDF viewport metadata and matrix transformations without recompressing images.' },
      { q: 'Can I rotate just portrait pages to landscape?', a: 'Yes, our visual grid preview lets you selectively rotate only specific individual pages.' }
    ]
  },
  'crop-pdf': {
    title: 'Crop PDF Online Free — Trim PDF Margins & Page Dimensions | DocScalar',
    description: 'Crop PDF pages visually with precision bounding boxes. Remove unwanted white margins, headers, or footers for printing and digital reading.',
    keywords: 'crop pdf, trim pdf margins, resize pdf page, crop pdf online free, remove pdf white borders',
    howTo: [
      { step: '1', title: 'Select PDF to Crop', desc: 'Upload your PDF document into the interactive cropping studio.' },
      { step: '2', title: 'Adjust Crop Boundaries', desc: 'Drag the handles to frame your desired page area or enter exact margin dimensions.' },
      { step: '3', title: 'Crop & Export', desc: 'Apply the crop to the current page or all pages and download the trimmed document.' }
    ],
    faqs: [
      { q: 'Will cropping remove hidden text or just visually trim it?', a: 'DocScalar updates the PDF MediaBox and CropBox parameters so viewers only display your cropped boundary.' },
      { q: 'Can I apply different crop margins to even and odd pages?', a: 'Yes, you can customize crop boxes per page or synchronize across the entire document.' }
    ]
  },
  'edit-pdf': {
    title: 'Edit PDF Online Free — Full-Featured PDF Document Editor | DocScalar',
    description: 'Edit PDF text, add annotations, draw vectors, insert images, and add shapes with zero document distortions.',
    keywords: 'edit pdf, pdf editor online, edit pdf text, annotate pdf, fill out pdf free',
    howTo: [
      { step: '1', title: 'Open PDF in Editor', desc: 'Upload any PDF file to load into the high-precision visual editor.' },
      { step: '2', title: 'Edit Text & Add Elements', desc: 'Click text blocks to modify copy, highlight sections, or insert shapes and images.' },
      { step: '3', title: 'Save & Download', desc: 'Export your modified PDF with intact vector typography and layout integrity.' }
    ],
    faqs: [
      { q: 'Can I edit existing text in a PDF?', a: 'Yes, DocScalar allows direct inline text modifications, font styling, and typographic adjustments.' },
      { q: 'Does the editor work on mobile devices?', a: 'DocScalar is fully responsive and supports touch gestures for annotations on tablets and mobile screens.' }
    ]
  },
  'pdf-forms': {
    title: 'PDF Form Filler & Creator Online — Fill & Sign PDF Forms | DocScalar',
    description: 'Fill out interactive PDF forms, text inputs, radio buttons, and checkboxes online. Flatten form fields or export dynamic AcroForms.',
    keywords: 'fill pdf form, interactive pdf forms, pdf form filler online, acroforms editor, sign pdf form',
    howTo: [
      { step: '1', title: 'Upload PDF Form', desc: 'Select your government, corporate, or tax PDF form.' },
      { step: '2', title: 'Fill Fields & Checkboxes', desc: 'Type into input fields, toggle checkboxes, and select dropdown options seamlessly.' },
      { step: '3', title: 'Download or Flatten', desc: 'Export the filled interactive form or flatten it into a read-only document for submission.' }
    ],
    faqs: [
      { q: 'Can I save and resume filling out my form later?', a: 'Form data is retained in your active session memory until you download or clear the session.' },
      { q: 'Are digital signatures accepted in filled forms?', a: 'Yes, you can append verified signature stamps directly onto form signature blocks.' }
    ]
  },
  'redact-pdf': {
    title: 'Redact PDF Online — Permanently Black Out Sensitive Data | DocScalar',
    description: 'Permanently remove and sanitize sensitive text, SSNs, credit card numbers, and confidential records from PDF files. True cryptographic redaction.',
    keywords: 'redact pdf, black out pdf text, sanitize pdf, permanently remove sensitive info pdf, pdf privacy tool',
    howTo: [
      { step: '1', title: 'Upload Document to Redact', desc: 'Select the confidential PDF document requiring sanitization.' },
      { step: '2', title: 'Select Text or Areas', desc: 'Drag black-out boxes over confidential names, financial numbers, or addresses.' },
      { step: '3', title: 'Apply Permanent Redaction', desc: 'Click Redact to purge the underlying vector text and rasterize protected areas permanently.' }
    ],
    faqs: [
      { q: 'Is redaction reversible or can someone copy the text underneath?', a: 'DocScalar permanently deletes the underlying characters from the PDF byte stream. The text cannot be copied or recovered.' },
      { q: 'Does redaction also scrub document metadata?', a: 'Yes, author names, creation dates, revision history, and hidden metadata streams are sanitized upon export.' }
    ]
  },
  'pdf-to-image': {
    title: 'Convert PDF to Images Online — PDF to JPG, PNG & WebP | DocScalar',
    description: 'Convert PDF pages into high-resolution JPG, PNG, or WebP images. Extract embedded pictures or render full page raster scans at 300 DPI.',
    keywords: 'pdf to image, pdf to jpg, pdf to png, convert pdf to high res pictures, pdf to webp online',
    howTo: [
      { step: '1', title: 'Upload PDF File', desc: 'Drop your PDF file into the converter interface.' },
      { step: '2', title: 'Choose Image Format & DPI', desc: 'Select between PNG, JPG, or WebP, and pick your target resolution up to 300 DPI.' },
      { step: '3', title: 'Download Images', desc: 'Download individual page images or a bundled ZIP archive containing all pages.' }
    ],
    faqs: [
      { q: 'What is the maximum resolution for rendered images?', a: 'You can render crisp pages up to 300 DPI, ideal for high-definition print and presentations.' },
      { q: 'Can I convert only specific pages of a multi-page PDF?', a: 'Yes, select custom page ranges to convert only the exact pages you need.' }
    ]
  },
  'pdf-to-excel': {
    title: 'Convert PDF to Excel Online Free — Extract Tables to XLSX | DocScalar',
    description: 'Extract tabular data and financial statements from PDF files into editable Microsoft Excel XLSX or CSV spreadsheets with column auto-detection.',
    keywords: 'pdf to excel, convert pdf to xlsx, extract tables from pdf, pdf to spreadsheet online free, pdf to csv',
    howTo: [
      { step: '1', title: 'Upload PDF with Tables', desc: 'Select your financial report, bank statement, or tabular document.' },
      { step: '2', title: 'Detect Tabular Grid', desc: 'Our table parsing engine identifies cell boundaries, headers, and numeric values.' },
      { step: '3', title: 'Download Excel Spreadsheet', desc: 'Open your clean, editable XLSX file directly in Excel, Numbers, or Google Sheets.' }
    ],
    faqs: [
      { q: 'Does the converter handle multi-page continuous tables?', a: 'Yes, our table engine links split headers and recurring table rows across consecutive pages.' },
      { q: 'Are numbers converted to real calculation cells?', a: 'DocScalar parses numbers, currency symbols, and decimals into native numerical formats ready for formulas.' }
    ]
  },
  'pdf-to-powerpoint': {
    title: 'Convert PDF to PowerPoint Online Free — PDF to PPTX | DocScalar',
    description: 'Convert PDF slide decks and presentations into editable Microsoft PowerPoint PPTX files. Retains slide layouts, shapes, images, and text boxes.',
    keywords: 'pdf to powerpoint, convert pdf to pptx, pdf to slides online, pdf to presentation free',
    howTo: [
      { step: '1', title: 'Select PDF Deck', desc: 'Upload the PDF presentation or document you want to convert.' },
      { step: '2', title: 'Deconstruct Slides', desc: 'DocScalar maps each page into slide master layouts, text frames, and graphic layers.' },
      { step: '3', title: 'Download PPTX Presentation', desc: 'Download and present your presentation in Microsoft PowerPoint or Keynote.' }
    ],
    faqs: [
      { q: 'Can I edit the text on the generated PowerPoint slides?', a: 'Yes, text is reconstructed into editable text frames rather than static flat screenshots.' },
      { q: 'Are high-resolution graphics preserved?', a: 'All vector graphics and embedded bitmap illustrations are preserved at their original resolutions.' }
    ]
  },
  'pdf-to-pdfa': {
    title: 'Convert PDF to PDF/A Online — Long-Term Archival Standard | DocScalar',
    description: 'Convert standard PDF documents into ISO-compliant PDF/A (PDF/A-1b, PDF/A-2b) for legal archiving, government compliance, and long-term storage.',
    keywords: 'pdf to pdfa, convert pdf to pdf/a online, iso 19005 compliance, pdf archival format, legal document archive',
    howTo: [
      { step: '1', title: 'Upload PDF Document', desc: 'Drop your contract, patent, or compliance record into the archiver.' },
      { step: '2', title: 'Embed Standards & Fonts', desc: 'The engine embeds all missing font glyphs, color profiles (ICC), and metadata.' },
      { step: '3', title: 'Download PDF/A Archive', desc: 'Receive a fully validated PDF/A compliant document ready for legal depository submission.' }
    ],
    faqs: [
      { q: 'What is the benefit of PDF/A over standard PDF?', a: 'PDF/A guarantees that documents can be accurately reproduced decades into the future regardless of software evolution.' },
      { q: 'Are color spaces standardized during conversion?', a: 'Yes, device-dependent color spaces are mapped to calibrated device-independent ICC profiles.' }
    ]
  },
  'image-to-pdf': {
    title: 'Convert Image to PDF Online Free — JPG, PNG to PDF | DocScalar',
    description: 'Convert JPG, PNG, WebP, GIF, and TIFF images into a polished, multi-page PDF document. Custom margins, page orientations, and image reordering.',
    keywords: 'image to pdf, jpg to pdf, png to pdf, convert photos to pdf online, merge images into pdf',
    howTo: [
      { step: '1', title: 'Upload Images', desc: 'Select or drag multiple image files into the upload zone.' },
      { step: '2', title: 'Arrange & Configure', desc: 'Reorder image tiles and choose page orientation (portrait/landscape) and margin padding.' },
      { step: '3', title: 'Generate & Download PDF', desc: 'Click Convert to compile all photos into a standardized, printable PDF file.' }
    ],
    faqs: [
      { q: 'Can I combine different image formats into one single PDF?', a: 'Yes, you can mix JPG, PNG, WebP, BMP, and TIFF files into one compiled PDF.' },
      { q: 'Is image compression applied automatically?', a: 'You can choose between original lossless resolution or auto-compression for smaller file sizes.' }
    ]
  },
  'image-compressor': {
    title: 'Compress Images Online Free — Reduce JPG, PNG & WebP Size | DocScalar',
    description: 'Reduce image file size up to 90% without visible loss in quality. Batch compress JPG, PNG, and WebP images for faster web performance.',
    keywords: 'image compressor, compress jpg, compress png, reduce image size online, photo compressor free',
    howTo: [
      { step: '1', title: 'Select Images', desc: 'Upload one or multiple images you want to compress.' },
      { step: '2', title: 'Adjust Compression Preset', desc: 'Choose balanced, high-compression, or custom quality settings.' },
      { step: '3', title: 'Download Optimized Images', desc: 'Download your lightweight images individually or as a single ZIP archive.' }
    ],
    faqs: [
      { q: 'How much storage can image compression save?', a: 'Most web images see a 60% to 85% size reduction while maintaining crisp visual fidelity.' },
      { q: 'Is transparency preserved in PNG images?', a: 'Yes, alpha transparency channels in PNG and WebP files are strictly preserved.' }
    ]
  },
  'image-resizer': {
    title: 'Resize Images Online Free — Change Photo Dimensions & DPI | DocScalar',
    description: 'Resize images to exact pixel dimensions, percentages, or aspect ratios. Maintain aspect ratio lock and optimize for social media, print, or web.',
    keywords: 'resize image, image resizer online, change photo dimensions, scale image pixels, resize picture free',
    howTo: [
      { step: '1', title: 'Upload Image', desc: 'Drop in the photo or graphic you wish to resize.' },
      { step: '2', title: 'Set Dimensions', desc: 'Enter target width and height in pixels or select popular social media aspect ratio presets.' },
      { step: '3', title: 'Resize & Save', desc: 'Download your resized image with high-quality Lanczos bicubic resampling.' }
    ],
    faqs: [
      { q: 'Will resizing distort the proportion of my image?', a: 'With aspect ratio lock enabled, height and width scale proportionally to prevent stretching.' },
      { q: 'Can I batch resize multiple images at once?', a: 'Yes, apply identical dimension rules across multiple photos simultaneously.' }
    ]
  },
  'image-converter': {
    title: 'Image Converter Online Free — Convert JPG, PNG, WebP, AVIF | DocScalar',
    description: 'Convert between popular image formats including PNG, JPG, WebP, GIF, BMP, and SVG. Fast, lossless conversion with transparent background support.',
    keywords: 'image converter, convert png to jpg, convert jpg to png, convert to webp, online image format converter',
    howTo: [
      { step: '1', title: 'Select Source Files', desc: 'Upload the images you want to convert into new formats.' },
      { step: '2', title: 'Choose Output Format', desc: 'Pick your target format: PNG, JPG, WebP, BMP, or TIFF.' },
      { step: '3', title: 'Convert & Download', desc: 'Instantly receive your converted image files with optimized color palettes.' }
    ],
    faqs: [
      { q: 'What happens to transparency when converting PNG to JPG?', a: 'Because JPG does not support alpha channels, transparent areas are filled with a clean white background.' },
      { q: 'Why should I convert to WebP?', a: 'WebP provides 25-34% smaller file sizes compared to JPEG at equivalent visual quality.' }
    ]
  },
  'remove-pages': {
    title: 'Remove Pages from PDF Online Free — Delete PDF Pages | DocScalar',
    description: 'Delete unwanted or blank pages from your PDF documents with one click. Visual thumbnail selector ensures you remove only the exact pages.',
    keywords: 'remove pages from pdf, delete pdf pages, delete blank pages pdf, remove page online free',
    howTo: [
      { step: '1', title: 'Upload Document', desc: 'Drop your PDF file into the visual page organizer.' },
      { step: '2', title: 'Select Pages to Delete', desc: 'Click on the page thumbnails you wish to eliminate or enter page numbers.' },
      { step: '3', title: 'Apply & Download', desc: 'Download the streamlined PDF with deleted pages cleanly excised.' }
    ],
    faqs: [
      { q: 'Can I delete multiple non-consecutive pages at once?', a: 'Yes, select any combination of individual pages or ranges to remove.' },
      { q: 'Does removing pages break bookmarks or internal hyperlinks?', a: 'DocScalar updates the document page tree and table of contents to maintain navigation integrity.' }
    ]
  },
  'extract-pages': {
    title: 'Extract Pages from PDF Online Free — Save Specific Pages | DocScalar',
    description: 'Extract selected pages from a large PDF document into a brand new PDF file. Fast, simple, and lossless extraction without re-encoding.',
    keywords: 'extract pdf pages, pull pages from pdf, save single page pdf, extract pages online free',
    howTo: [
      { step: '1', title: 'Choose PDF File', desc: 'Load the PDF document containing the pages you need.' },
      { step: '2', title: 'Pick Pages to Extract', desc: 'Click the specific page thumbnails or provide comma-separated page indices.' },
      { step: '3', title: 'Export New PDF', desc: 'Download a standalone PDF containing only your selected pages.' }
    ],
    faqs: [
      { q: 'Can I extract each page as its own separate PDF?', a: 'Yes, choose between extracting selected pages into one combined file or individual single-page PDFs.' },
      { q: 'Is original text and resolution maintained?', a: 'Extraction is lossless; the original vector streams and image assets are preserved byte-for-byte.' }
    ]
  },
  'organize-pdf': {
    title: 'Organize PDF Pages Online — Reorder, Sort & Rearrange | DocScalar',
    description: 'Rearrange and sort pages in your PDF document visually. Drag and drop thumbnails to reorganize page order, duplicate pages, or delete sheets.',
    keywords: 'organize pdf, reorder pdf pages, rearrange pdf online, sort pdf pages, change pdf page order',
    howTo: [
      { step: '1', title: 'Upload PDF Document', desc: 'Drop your file into the visual layout grid.' },
      { step: '2', title: 'Drag to Rearrange', desc: 'Drag page thumbnails into your desired sequence or use sorting presets.' },
      { step: '3', title: 'Save Reordered PDF', desc: 'Click Organize & Download to export your document with the new page order.' }
    ],
    faqs: [
      { q: 'Can I insert blank pages or duplicate pages?', a: 'Yes, you can duplicate key pages or insert blank separator sheets directly from the toolbar.' },
      { q: 'Is there an undo option if I make a mistake?', a: 'Yes, full undo and redo controls are available throughout the visual editing session.' }
    ]
  },
  'add-watermark': {
    title: 'Add Watermark to PDF Online Free — Text & Image Stamps | DocScalar',
    description: 'Add confidential text watermarks or company logo stamps to your PDF documents. Customize opacity, angle, font, color, and page positioning.',
    keywords: 'add watermark to pdf, pdf watermark online, stamp pdf, confidential watermark pdf, brand pdf document',
    howTo: [
      { step: '1', title: 'Select PDF File', desc: 'Upload the PDF document you want to brand or protect.' },
      { step: '2', title: 'Configure Watermark', desc: 'Enter custom text or upload a PNG logo, then adjust angle, transparency, and size.' },
      { step: '3', title: 'Apply & Download', desc: 'Stamp all pages or selected ranges and download your watermarked document.' }
    ],
    faqs: [
      { q: 'Can watermarks be placed underneath document text?', a: 'Yes, you can choose between stamping over text or behind text as a subtle background pattern.' },
      { q: 'Can users easily remove the watermark?', a: 'DocScalar bakes the watermark into the page content stream for robust security.' }
    ]
  },
  'add-page-numbers': {
    title: 'Add Page Numbers to PDF Online — Header & Footer Numbering | DocScalar',
    description: 'Insert professional page numbers, headers, and footers into your PDF files. Custom numbering formats (Page 1 of N, Roman numerals), fonts, and placement.',
    keywords: 'add page numbers to pdf, number pdf pages online, pdf footer numbering, bates numbering, page n of m pdf',
    howTo: [
      { step: '1', title: 'Upload Document', desc: 'Drop in the PDF requiring pagination.' },
      { step: '2', title: 'Choose Position & Format', desc: 'Select header or footer placement, alignment (left/center/right), and number styling.' },
      { step: '3', title: 'Number & Download', desc: 'Apply numbering across all pages or skip title pages, then download.' }
    ],
    faqs: [
      { q: 'Can I skip numbering on the first page or cover page?', a: 'Yes, you can specify a starting page number and offset numbering past cover sheets.' },
      { q: 'What numbering styles are supported?', a: 'Numeric (1, 2, 3), Roman (i, ii, iii), and contextual formats like "Page X of Y".' }
    ]
  },
  'bates-numbering': {
    title: 'Bates Numbering PDF Online — Legal Document Indexing | DocScalar',
    description: 'Apply sequential Bates numbering and custom legal prefixes/suffixes to legal discovery documents. Precision position calibration for trial preparation.',
    keywords: 'bates numbering pdf, legal bates stamping, bates stamp online, discovery document numbering, legal indexing',
    howTo: [
      { step: '1', title: 'Upload Legal Documents', desc: 'Select single or multiple PDF documents requiring legal indexing.' },
      { step: '2', title: 'Set Prefix & Number Sequence', desc: 'Specify your legal case prefix, start number, digit padding (e.g., DOC-000001), and position.' },
      { step: '3', title: 'Apply Bates Stamp', desc: 'Process and download indexed documents with audit-ready sequential numbering.' }
    ],
    faqs: [
      { q: 'Does Bates stamping comply with legal discovery standards?', a: 'Yes, DocScalar adheres to standard federal and civil litigation Bates formatting protocols.' },
      { q: 'Can I process multiple separate files with a continuous counter?', a: 'Yes, batch mode carries the sequential counter across all queued documents seamlessly.' }
    ]
  },
  'repair-pdf': {
    title: 'Repair Corrupt PDF Files Online Free — Fix Broken PDFs | DocScalar',
    description: 'Recover damaged, corrupt, or unreadable PDF files. Rebuild broken xref tables, repair damaged headers, and salvage lost document text and data.',
    keywords: 'repair pdf, fix corrupt pdf online, recover damaged pdf, broken pdf file repair, restore pdf data',
    howTo: [
      { step: '1', title: 'Upload Damaged PDF', desc: 'Select the corrupted or unopenable PDF file.' },
      { step: '2', title: 'Reconstruct Structure', desc: 'Our diagnostic engine parses raw streams and rebuilds corrupted object catalogs.' },
      { step: '3', title: 'Download Repaired PDF', desc: 'Save the restored, fully readable PDF document.' }
    ],
    faqs: [
      { q: 'Can all corrupt PDF files be repaired?', a: 'Files with intact internal byte streams can be recovered; severe disk corruption with zero bytes may have data loss.' },
      { q: 'Will the repaired PDF open in Adobe Acrobat and standard readers?', a: 'Yes, DocScalar recompiles the document into a strict, standards-compliant PDF file.' }
    ]
  },
  'un-ocr-pdf': {
    title: 'Un-OCR PDF Online — Remove Invisible OCR Text Layer | DocScalar',
    description: 'Remove invisible or inaccurate OCR text layers from scanned PDF documents. Restore pure clean scans without phantom text or OCR artifacts.',
    keywords: 'un ocr pdf, remove ocr layer, strip pdf text layer, clean scanned pdf, remove phantom text pdf',
    howTo: [
      { step: '1', title: 'Upload Scanned PDF', desc: 'Select the PDF document containing flawed or unwanted OCR text.' },
      { step: '2', title: 'Strip Hidden Text Layers', desc: 'DocScalar isolates the background raster scans and purges invisible font glyphs.' },
      { step: '3', title: 'Download Clean PDF', desc: 'Receive a clean, pristine scan free from corrupted text overlays.' }
    ],
    faqs: [
      { q: 'Why would I want to remove an OCR layer?', a: 'Faulty OCR layers can cause inaccurate keyword searches, misaligned copy-paste, or confusing screen reader output.' },
      { q: 'Are the underlying visual images modified?', a: 'No, the visual scan imagery remains completely untouched and lossless.' }
    ]
  },
  'scan-to-pdf': {
    title: 'Scan to PDF Online Free — Camera & Scanner to PDF | DocScalar',
    description: 'Capture documents with your webcam, phone camera, or hardware scanner and compile them directly into professional PDF documents with perspective crop.',
    keywords: 'scan to pdf online, camera to pdf, mobile document scanner, photo to pdf document, scan documents free',
    howTo: [
      { step: '1', title: 'Activate Camera or Connect Scanner', desc: 'Grant browser camera access or upload captured photo snapshots.' },
      { step: '2', title: 'Auto-Detect Edges & Enhance', desc: 'Use automatic corner detection to straighten perspective and apply black & white document filters.' },
      { step: '3', title: 'Compile into PDF', desc: 'Combine multi-page captures into a high-contrast, clean PDF file.' }
    ],
    faqs: [
      { q: 'Does the scanner apply automatic contrast enhancement?', a: 'Yes, our document filter enhances ink sharpness while removing shadows and desk textures.' },
      { q: 'Can I scan multi-page booklets?', a: 'Yes, keep snapping consecutive pages; they compile into a single organized document.' }
    ]
  },
  'text-to-pdf': {
    title: 'Convert TXT to PDF Online Free — Plain Text to PDF | DocScalar',
    description: 'Convert plain text files (.txt) and source code into beautifully styled PDF documents. Customizable monospaced fonts, line numbers, and page margins.',
    keywords: 'text to pdf, convert txt to pdf, plain text to pdf online, format text as pdf, code to pdf',
    howTo: [
      { step: '1', title: 'Upload Text File or Paste Copy', desc: 'Drop a .txt file or paste raw text into the input console.' },
      { step: '2', title: 'Customize Typography', desc: 'Choose font family (sans, serif, monospace), font size, line spacing, and margins.' },
      { step: '3', title: 'Generate & Download PDF', desc: 'Export your formatted text document with clean page wraps and header pagination.' }
    ],
    faqs: [
      { q: 'Does the converter handle large text files with thousands of lines?', a: 'Yes, our layout engine automatically computes page splits and line wraps efficiently.' },
      { q: 'Are non-ASCII and international Unicode characters supported?', a: 'Yes, full UTF-8 Unicode encoding is supported with extensive font coverage.' }
    ]
  },
  'html-to-pdf': {
    title: 'Convert HTML to PDF Online Free — Web Code to PDF | DocScalar',
    description: 'Convert HTML code, CSS stylesheets, and web archives into pixel-perfect PDF documents. Preserves flexbox, CSS grid, images, and custom web fonts.',
    keywords: 'html to pdf, convert html to pdf online, html code to pdf, save webpage as pdf, web code converter',
    howTo: [
      { step: '1', title: 'Upload HTML File or Paste Markup', desc: 'Upload an .html file with assets or paste raw HTML/CSS markup.' },
      { step: '2', title: 'Configure Page Layout', desc: 'Select target paper size (A4, Letter), orientation, and print background graphics.' },
      { step: '3', title: 'Render to PDF', desc: 'Download an exact vector reproduction of your rendered web layout.' }
    ],
    faqs: [
      { q: 'Are external CSS styles and Google Fonts rendered?', a: 'Yes, inline stylesheets and standard web fonts are resolved during PDF compilation.' },
      { q: 'Can I control where page breaks occur in my HTML?', a: 'Yes, standard CSS break-after: page and page-break-inside: avoid rules are fully respected.' }
    ]
  },
  'excel-to-pdf': {
    title: 'Convert Excel to PDF Online Free — XLS & XLSX to PDF | DocScalar',
    description: 'Convert Microsoft Excel spreadsheets (.xlsx, .xls) to clean, printable PDF documents. Fit all columns to single page width, preserve cell formulas and borders.',
    keywords: 'excel to pdf, convert xlsx to pdf, spreadsheet to pdf online, fit excel sheet on one page pdf, xls to pdf free',
    howTo: [
      { step: '1', title: 'Select Excel Workbook', desc: 'Upload your .xlsx, .xls, or .csv financial model or data table.' },
      { step: '2', title: 'Configure Print Area', desc: 'Choose whether to convert the active sheet or all worksheets, and set auto-fit scaling.' },
      { step: '3', title: 'Download PDF Report', desc: 'Save your professional PDF spreadsheet with crisp cell lines and aligned figures.' }
    ],
    faqs: [
      { q: 'Will wide spreadsheets be cut off on standard paper?', a: 'Our smart scaling option fits all columns neatly across a single page width.' },
      { q: 'Are charts and graph graphics preserved in the PDF?', a: 'Yes, embedded Excel charts, sparklines, and graphics are rendered with vector precision.' }
    ]
  },
  'powerpoint-to-pdf': {
    title: 'Convert PowerPoint to PDF Online Free — PPTX to PDF | DocScalar',
    description: 'Convert Microsoft PowerPoint presentations (.pptx, .ppt) into high-definition PDF slide handouts. Exact typography, shapes, and slide animations frozen in place.',
    keywords: 'powerpoint to pdf, convert pptx to pdf, slides to pdf online free, ppt to pdf converter, presentation to pdf',
    howTo: [
      { step: '1', title: 'Upload PowerPoint Presentation', desc: 'Drop your .pptx or .ppt deck into the upload area.' },
      { step: '2', title: 'Compile Slide Geometry', desc: 'DocScalar processes master slides, vector icons, embedded fonts, and media.' },
      { step: '3', title: 'Download PDF Presentation', desc: 'Receive a universal PDF slide deck compatible with any device or projector.' }
    ],
    faqs: [
      { q: 'Are custom fonts preserved if the recipient does not have them installed?', a: 'Yes, all typographic assets are permanently embedded into the PDF file structure.' },
      { q: 'Can I print multiple slides per page (handout format)?', a: 'Yes, choose 1, 2, 4, or 6 slides per page layouts for meeting handouts.' }
    ]
  },
  'url-to-pdf': {
    title: 'Convert URL to PDF Online Free — Webpage to PDF | DocScalar',
    description: 'Convert live webpages into high-fidelity PDF documents by URL. Captures full-page scrolling screenshots, articles, blog posts, and receipts cleanly.',
    keywords: 'url to pdf, convert webpage to pdf, link to pdf online, save web page as pdf, html link to pdf',
    howTo: [
      { step: '1', title: 'Enter Webpage URL', desc: 'Paste the full web link (https://...) of the page you wish to capture.' },
      { step: '2', title: 'Configure Options', desc: 'Select viewport width, ad-blocking, print stylesheet, or full-length scrolling capture.' },
      { step: '3', title: 'Capture & Download PDF', desc: 'Click Convert URL to generate and download your clean PDF snapshot.' }
    ],
    faqs: [
      { q: 'Does the converter capture lazy-loaded images?', a: 'Yes, the headless browser scrolls through the document to trigger all lazy image assets before generating the PDF.' },
      { q: 'Can I remove popups and cookie banners automatically?', a: 'Our capture engine automatically suppresses standard cookie overlays and modal dialogs.' }
    ]
  },
  'qr-generator': {
    title: 'QR Code Generator Online Free — Vector QR with Custom Logo | DocScalar',
    description: 'Generate high-resolution vector QR codes for websites, Wi-Fi networks, vCards, text, and payments. Customize colors, add logos, and download SVG or PNG.',
    keywords: 'qr code generator, create qr code online free, custom qr code with logo, vector qr code svg, wifi qr code',
    howTo: [
      { step: '1', title: 'Select Data Type', desc: 'Choose URL, Wi-Fi credentials, vCard contact, or plain text.' },
      { step: '2', title: 'Design & Brand', desc: 'Pick your brand colors, corner dot shapes, and upload your company logo.' },
      { step: '3', title: 'Download QR Code', desc: 'Export in vector SVG for print packaging or high-res PNG for digital display.' }
    ],
    faqs: [
      { q: 'Do the generated QR codes ever expire?', a: 'No, DocScalar creates direct static QR codes that never expire and require no third-party redirection.' },
      { q: 'Can I download the QR code in scalable vector format?', a: 'Yes, download in crisp SVG format for billboards, packaging, and commercial printing.' }
    ]
  },
  'unzip-file': {
    title: 'Unzip Files Online Free — Extract ZIP, RAR, 7Z Archives | DocScalar',
    description: 'Extract and view files from ZIP, 7Z, TAR, and GZ archives. Fast, secure file decompression with instant download.',
    keywords: 'unzip online, extract zip file free, open rar online, unpack 7z archive, uncompress zip in browser',
    howTo: [
      { step: '1', title: 'Select Archive File', desc: 'Upload your .zip, .7z, or .tar archive file into the unzipper.' },
      { step: '2', title: 'Browse Contents', desc: 'View file directory trees, inspect file sizes, and preview text or images.' },
      { step: '3', title: 'Extract & Save', desc: 'Download individual extracted files or unpack everything to your local computer.' }
    ],
    faqs: [
      { q: 'Are my archive files uploaded to an external server?', a: 'DocScalar processes archives in isolated transient memory buffers with immediate post-download purge.' },
      { q: 'What archive formats are supported?', a: 'ZIP, 7-Zip (.7z), TAR, GZ, and standard multi-file compressed containers.' }
    ]
  },
  'resume-builder': {
    title: 'Free Resume Builder Online — Professional ATS-Friendly CV Maker | DocScalar',
    description: 'Build job-winning, ATS-friendly resumes and CVs with real-time preview. Professional executive templates, direct canvas editing, and one-click PDF export.',
    keywords: 'resume builder, free cv maker online, ats resume builder, professional cv templates, curriculum vitae builder',
    howTo: [
      { step: '1', title: 'Choose an Executive Template', desc: 'Select from Harvard Classic, Modern Minimal, Tech Lead, or Creative layouts.' },
      { step: '2', title: 'Fill or Direct-Edit Details', desc: 'Input your work experience, education, and skills or edit directly on the live document canvas.' },
      { step: '3', title: 'Download ATS-Ready PDF', desc: 'Export a pixel-perfect, ATS-parseable vector PDF ready for job applications.' }
    ],
    faqs: [
      { q: 'Are the exported resumes compliant with ATS scanners?', a: 'Yes, our templates use clean semantic headings, standard font metrics, and single-column text streams that ATS systems parse flawlessly.' },
      { q: 'Can I customize font sizes, colors, and line spacing?', a: 'Yes, the Resume Studio provides granular typography, margins, and section reordering controls.' }
    ]
  },
  'document-viewer': {
    title: 'Universal Document Viewer Online Free — Open PDF, DOCX, XLSX, PPTX | DocScalar',
    description: 'Open, inspect, and read PDF, Word DOCX, Excel XLSX, and PowerPoint PPTX documents with high-fidelity formatting. No software installation or login required.',
    keywords: 'document viewer online, free pdf reader, open docx online, view excel spreadsheet in browser, pptx viewer free',
    howTo: [
      { step: '1', title: 'Select Any Document', desc: 'Drag and drop your PDF, DOCX, XLSX, or PPTX file into the viewer.' },
      { step: '2', title: 'Inspect & Navigate', desc: 'Zoom, search text, switch pages, and inspect document properties in high resolution.' },
      { step: '3', title: 'Print or Export', desc: 'Print cleanly with optimized media stylesheets or export to standardized formats.' }
    ],
    faqs: [
      { q: 'Do I need Microsoft Office installed to view Word or Excel files?', a: 'No, DocScalar renders Office documents natively in the browser without any third-party plugins.' },
      { q: 'Are my confidential documents kept private?', a: 'All rendering happens in isolated memory buffers; your documents are never logged or stored.' }
    ]
  }
};

export const getSeoDataForTool = (toolId, fallbackTitle, fallbackDesc) => {
  if (TOOL_SEO_DATA[toolId]) {
    return TOOL_SEO_DATA[toolId];
  }
  return {
    title: `${fallbackTitle || 'Tool'} Online Free — Secure & Private | DocScalar`,
    description: fallbackDesc || 'Fast, private, and secure document processing. Enterprise-grade confidentiality and zero data persistence.',
    keywords: `${fallbackTitle?.toLowerCase() || 'pdf tool'}, document converter, free online tool, private pdf`,
    howTo: [
      { step: '1', title: 'Upload Document', desc: 'Drag and drop your file into the secure dropzone.' },
      { step: '2', title: 'Configure Options', desc: 'Select your preferred settings or adjustments.' },
      { step: '3', title: 'Process & Download', desc: 'Click process to generate and download your completed file instantly.' }
    ],
    faqs: [
      { q: 'Are my files stored or uploaded to a cloud server?', a: 'No. Files are processed in isolated transient sandboxes with zero permanent storage for complete confidentiality.' },
      { q: 'Is DocScalar completely free to use?', a: 'Yes, standard document processing is free with no registration required.' }
    ]
  };
};
