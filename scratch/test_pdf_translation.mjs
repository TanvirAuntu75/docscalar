import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { jsPDF } from 'jspdf';
import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';

// Prevent downloading from huggingface, use local if possible
env.allowLocalModels = true;
env.localModelPath = './public/models/';

async function runPdfTranslation() {
  console.log('--- Phase 1: Reading and Parsing Original PDF ---');
  console.log('Initial RSS Memory:', (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB');
  
  const data = new Uint8Array(fs.readFileSync('./test_dummy.pdf'));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  console.log('Original PDF Loaded.');
  console.log('Total Pages:', pdf.numPages);
  
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const originalText = textContent.items.map(item => item.str).join(' ');
  console.log('Original Extracted Text:', `"${originalText}"`);
  
  console.log('\n--- Phase 2: Loading Translator Model (RAM Tracking) ---');
  const start = Date.now();
  const translator = await pipeline('translation', 'Xenova/m2m100_418M', {
    model_file_names: {
      'encoder': 'encoder_model_q4f16.onnx',
      'decoder': 'decoder_with_past_model_q4f16.onnx'
    }
  });
  console.log('Translator Loaded in:', ((Date.now() - start)/1000).toFixed(2), 'seconds');
  console.log('Memory After Loading Model:', (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB');

  console.log('\n--- Phase 3: Translating Text (English -> Spanish) ---');
  const translationRes = await translator(originalText, { src_lang: 'en', tgt_lang: 'es' });
  const translatedText = translationRes[0].translation_text;
  console.log('Translated Text Preview:', `"${translatedText}"`);
  console.log('Memory During Active Inference:', (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB');

  console.log('\n--- Phase 4: Compiling New PDF ---');
  // Re-create the PDF client-side using jsPDF
  const doc = new jsPDF('p', 'mm', 'a4');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(14);
  // Add original text
  doc.text('Original Text (English):', 15, 20);
  doc.setFontSize(12);
  doc.text(originalText, 15, 30);
  
  // Add translated text
  doc.setFontSize(14);
  doc.text('Translated Text (Spanish):', 15, 50);
  doc.setFontSize(12);
  doc.text(translatedText, 15, 60);

  const pdfOutputArray = doc.output('arraybuffer');
  fs.writeFileSync('./test_dummy_translated.pdf', new Uint8Array(pdfOutputArray));
  console.log('Compiled and saved translated PDF to: ./test_dummy_translated.pdf');

  console.log('\n--- Phase 5: Simulating Garbage Collection/Disposal ---');
  // In a real worker, we do worker.terminate(). 
  // Here we simulate cleanup by nullifying the instance and forcing garbage collection if enabled.
  await translator.dispose();
  console.log('Pipeline disposed. Memory reclaimed.');
  console.log('Final Memory State:', (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB');
}

runPdfTranslation().catch(console.error);
