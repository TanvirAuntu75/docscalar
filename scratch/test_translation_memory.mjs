import { pipeline, env } from '@xenova/transformers';
import fs from 'fs';

// Prevent downloading from huggingface, use local if possible
env.allowLocalModels = true;
env.localModelPath = './public/models/';

async function testTranslation() {
  console.log('Initial Memory:', (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB');
  const start = Date.now();
  
  const translator = await pipeline('translation', 'Xenova/m2m100_418M', {
    quantized: true,
    model_file_names: {
      'encoder': 'encoder_model_q4f16.onnx',
      'decoder': 'decoder_with_past_model_q4f16.onnx'
    },
    session_options: {
      logSeverityLevel: 4,
      enableCpuMemArena: false,
      enableMemPattern: false
    }
  });
  
  console.log('Model loaded in', ((Date.now() - start)/1000).toFixed(2), 's');
  console.log('Memory after load:', (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB');
  
  const res = await translator('Hello world!', { src_lang: 'en', tgt_lang: 'es' });
  console.log('Translation:', res);
  console.log('Final Memory:', (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + ' MB');
}

testTranslation().catch(console.error);
