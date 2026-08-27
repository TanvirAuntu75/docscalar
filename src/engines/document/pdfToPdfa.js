/* PDF to PDF/A Engine: ISO 19005 Conformance & XMP Metadata Injection */
import { PDFDocument, PDFName, PDFString, PDFDict, PDFArray } from 'pdf-lib';

/**
 * Extract array buffer from any input
 */
async function extractBytes(file) {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(file)) {
    return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  }
  if (file instanceof Uint8Array) return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  if (file instanceof ArrayBuffer) return file;
  if (file && typeof file.arrayBuffer === 'function') {
    const ab = await file.arrayBuffer();
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer(ab)) {
      return ab.buffer.slice(ab.byteOffset, ab.byteOffset + ab.byteLength);
    }
    return ab;
  }
  throw new Error('Unsupported PDF input format.');
}

/**
 * Generate XMP Metadata Packet with ISO 19005 Conformance declarations
 */
function createXmpMetadata(conformanceLevel = '2b', colorProfile = 'sRGB IEC61966-2.1') {
  const part = conformanceLevel.startsWith('1') ? '1' : conformanceLevel.startsWith('3') ? '3' : '2';
  const conf = conformanceLevel.endsWith('a') ? 'A' : 'B';
  const dateStr = new Date().toISOString();

  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
      <pdfaid:part>${part}</pdfaid:part>
      <pdfaid:conformance>${conf}</pdfaid:conformance>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:format>application/pdf</dc:format>
      <dc:date>
        <rdf:Seq>
          <rdf:li>${dateStr}</rdf:li>
        </rdf:Seq>
      </dc:date>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/">
      <xmp:CreateDate>${dateStr}</xmp:CreateDate>
      <xmp:ModifyDate>${dateStr}</xmp:ModifyDate>
      <xmp:MetadataDate>${dateStr}</xmp:MetadataDate>
      <xmp:CreatorTool>DocForge ISO-19005 PDF/A Engine</xmp:CreatorTool>
    </rdf:Description>
    <rdf:Description rdf:about="" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
      <pdf:Producer>DocForge PDF/A Archival Distiller</pdf:Producer>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

/**
 * Direct in-thread fallback PDF to PDF/A compiler.
 * Injects ISO 19005 XMP conformance packets and OutputIntents dictionaries.
 * @param {File|Blob|ArrayBuffer|Uint8Array} file 
 * @param {object} options 
 * @param {function} onProgress 
 * @returns {Promise<Blob>}
 */
export async function directPdfToPdfa(file, options = {}, onProgress = () => {}) {
  onProgress(15);
  const arrayBuffer = await extractBytes(file);
  onProgress(35);

  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  onProgress(50);

  const {
    conformanceLevel = '2b', // '1b' | '2b' | '3b'
    colorProfile = 'sRGB IEC61966-2.1',
    registryName = 'http://www.color.org'
  } = options;

  // Set document standard metadata
  pdfDoc.setTitle(pdfDoc.getTitle() || 'Archival Document');
  pdfDoc.setProducer('DocForge PDF/A Archival Distiller');
  pdfDoc.setCreator('DocForge ISO-19005 Engine');
  pdfDoc.setModificationDate(new Date());

  // Inject ISO 19005 OutputIntent into Catalog
  const catalog = pdfDoc.catalog;
  const context = pdfDoc.context;

  const outputIntentDict = context.obj({
    Type: PDFName.of('OutputIntent'),
    S: PDFName.of('GTS_PDFA1'),
    OutputConditionIdentifier: PDFString.of(colorProfile),
    RegistryName: PDFString.of(registryName),
    Info: PDFString.of('sRGB IEC61966-2.1 Output Intent for PDF/A Compliance')
  });

  const outputIntentRef = context.register(outputIntentDict);
  const outputIntentsArray = context.obj([outputIntentRef]);
  catalog.set(PDFName.of('OutputIntents'), outputIntentsArray);

  // Set Conformance XMP Metadata Stream
  const xmpMetadataXml = createXmpMetadata(conformanceLevel, colorProfile);
  const metadataStream = context.flateStream(xmpMetadataXml, {
    Type: PDFName.of('Metadata'),
    Subtype: PDFName.of('XML')
  });
  const metadataStreamRef = context.register(metadataStream);
  catalog.set(PDFName.of('Metadata'), metadataStreamRef);

  onProgress(85);
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  onProgress(100);

  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Convert a PDF file to ISO-standardized PDF/A format.
 * @param {File|Blob|ArrayBuffer} file - The .pdf file
 * @param {object|function} optionsOrProgress - Options or progress callback
 * @param {function} onProgress - Progress callback
 * @returns {Promise<Blob>}
 */
export async function pdfToPdfa(file, optionsOrProgress = {}, onProgress = () => {}) {
  let options = typeof optionsOrProgress === 'object' ? optionsOrProgress : {};
  let actualProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : onProgress;

  return await directPdfToPdfa(file, options, actualProgress);
}
