import { pipeline } from '@xenova/transformers';

async function testOpus() {
  console.log('Loading lightweight opus-mt model...');
  const start = Date.now();
  // This will download the model files from Hugging Face Xenova repository
  const translator = await pipeline('translation', 'Xenova/opus-mt-en-es');
  console.log('Model loaded in', ((Date.now() - start)/1000).toFixed(2), 's');
  
  const res = await translator('Hello world!', { src_lang: 'en', tgt_lang: 'es' });
  console.log('Translation:', res);
}

testOpus().catch(console.error);
