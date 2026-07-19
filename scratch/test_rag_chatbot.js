import fs from 'fs';
import path from 'path';
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = true;
env.localModelPath = './public/models/';

function getDotProduct(vecA, vecB) {
  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
}

const randomQueries = [
  // 1-25: Unrelated General Knowledge & Conversational
  "what is the capital of France?",
  "how to bake a chocolate cake?",
  "who won the superbowl last year?",
  "tell me a funny joke",
  "what is the meaning of life?",
  "do you like pizza?",
  "can you write a python script for me?",
  "how do I tie a tie?",
  "what is the best programming language?",
  "how far is the moon?",
  "can you translate this to Spanish?",
  "what's your favorite movie?",
  "do you have feelings?",
  "what time is it?",
  "how is the weather today?",
  "play some music",
  "what is 2 + 2?",
  "how do I boil an egg?",
  "who is the president of the united states?",
  "tell me a story",
  "what is the price of bitcoin?",
  "can you sing a song?",
  "where do babies come from?",
  "are you a robot or human?",
  "how to fix a flat tire?",
  
  // 26-50: Other Software / SaaS / Workflows not supported
  "can you edit my video?",
  "how do I make a 3D model?",
  "do you support photoshop files?",
  "can I connect this to my google drive?",
  "how do I host a website?",
  "can you design a logo for me?",
  "do you have an iOS app?",
  "can I use this to send emails?",
  "how to schedule a calendar meeting?",
  "is there a slack integration?",
  "can you generate an image with AI?",
  "do you support CAD files?",
  "how do I record my screen?",
  "can you do speech to text?",
  "do you have a CRM built in?",
  "can I connect my bank account?",
  "how do I pay my taxes?",
  "can you write an essay for my school?",
  "do you support multiplayer gaming?",
  "how do I stream on twitch?",
  "can I upload music to spotify?",
  "do you have a dark web browser?",
  "can you hack a wifi password?",
  "how do I install windows 11?",
  "can you recover my deleted photos?",
  
  // 51-75: Gibberish, Typos, and Edge Cases
  "asdfasdfasdf",
  "123456789",
  "???!!!",
  "make it go brrrrr",
  "I am very angry",
  "test test test 123",
  "hello world",
  "null",
  "undefined",
  "drop table users;",
  "<script>alert('hack')</script>",
  "p d f m r g e",
  "how do I make the thing do the other thing?",
  "where is the any key?",
  "my computer is broken",
  "plz hlp me",
  "wut",
  "huh?",
  "nope",
  "yes",
  "ok",
  "cancel",
  "stop",
  "exit",
  "qweqweqwe",
  
  // 76-100: Tangentially related but out of scope or weirdly phrased
  "how do I make my CV look more professional?",
  "what font should I use for a resume?",
  "is it safe to upload my medical records?",
  "can I use this on a public library computer?",
  "does it work if my internet goes out during processing?",
  "what happens if my computer crashes?",
  "can you make the pdf 3 megabytes exactly?",
  "how do I remove the background from an image?",
  "can you convert this pdf into a 3d interactive book?",
  "do you support epub formats for kindle?",
  "can I sign with a real pen?",
  "how do I fax this document?",
  "can you print this for me?",
  "where do I buy printer ink?",
  "can you scan this with my phone camera?",
  "do you have a desktop app for linux?",
  "can I use this on internet explorer?",
  "what is the maximum ram needed?",
  "is this open source?",
  "can I self host this on docker?",
  "how do I get a refund?",
  "can I share my pro account with 10 people?",
  "does the watermark have to be ugly?",
  "can you make the document look vintage?",
  "how do I un-blur a photo?"
];

async function runStressTest() {
  console.log('[RAG Stress Test] Loading knowledge base...');
  const kbPath = path.resolve('public/models/website_knowledge.json');
  const knowledgeBase = JSON.parse(fs.readFileSync(kbPath, 'utf-8'));
  console.log(`[RAG Stress Test] Loaded ${knowledgeBase.length} chunks.`);

  console.log('[RAG Stress Test] Loading feature-extraction pipeline...');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  console.log(`[RAG Stress Test] Running ${randomQueries.length} random queries...`);
  
  const MATCH_THRESHOLD = 0.40;
  
  let fallbacks = 0;
  let matches = 0;
  let falsePositives = [];

  for (let i = 0; i < randomQueries.length; i++) {
    const query = randomQueries[i];
    const output = await extractor(query, { pooling: 'mean', normalize: true });
    const queryVector = Array.from(output.data);

    let bestMatch = null;
    let highestSim = -Infinity;

    for (const item of knowledgeBase) {
      const sim = getDotProduct(queryVector, item.vector);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatch = item;
      }
    }

    if (highestSim >= MATCH_THRESHOLD) {
      matches++;
      // Since these are mostly random/unrelated queries, matches might be false positives!
      falsePositives.push({ query, score: highestSim.toFixed(4), matchText: bestMatch.text.split('\n')[0] });
    } else {
      fallbacks++;
    }
  }

  console.log('\n=============================================');
  console.log(`[RAG Stress Test] Results Overview:`);
  console.log(`Total Queries: ${randomQueries.length}`);
  console.log(`Matched (Score >= ${MATCH_THRESHOLD}): ${matches}`);
  console.log(`Safely Rejected/Fallback (Score < ${MATCH_THRESHOLD}): ${fallbacks}`);
  
  if (falsePositives.length > 0) {
    console.log('\n[RAG Stress Test] Inspecting Matches (Potential False Positives):');
    // Sort by highest score first
    falsePositives.sort((a, b) => b.score - a.score);
    falsePositives.forEach((fp, idx) => {
      console.log(`${idx + 1}. Query: "${fp.query}"`);
      console.log(`   Match: ${fp.matchText}`);
      console.log(`   Score: ${fp.score}\n`);
    });
  }
}

runStressTest().catch(console.error);
