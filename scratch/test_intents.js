// test_intents.js
// Verification of robust NLP intent and parameter extraction in DocForge heuristic planner

const TOOL_REGISTRY = {
  'docx-to-pdf': { accept: ['.docx', '.doc'], minInputs: 1, maxInputs: 99, defaultParams: {} },
  'compress-pdf': { accept: ['.pdf'], minInputs: 1, maxInputs: 1, defaultParams: { quality: 0.65 } },
  'rotate-pdf': { accept: ['.pdf'], minInputs: 1, maxInputs: 99, defaultParams: { angle: 90 } },
  'protect-pdf': { accept: ['.pdf'], minInputs: 1, maxInputs: 99, defaultParams: { password: '' } },
  'ai-translator': { accept: ['.pdf', '.txt', '.docx'], minInputs: 1, maxInputs: 99, defaultParams: { target_language: 'Spanish' } },
  'image-resizer': { accept: ['.png', '.jpg', '.jpeg', '.webp'], minInputs: 1, maxInputs: 99, defaultParams: { percentage: 75, width: 800, height: 600 } }
};

// Replicate fuzzy matching and stemming
function stemWord(word) {
  let w = word.toLowerCase().trim();
  if (w.endsWith('ing')) w = w.slice(0, -3);
  if (w.endsWith('ed')) w = w.slice(0, -2);
  if (w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.endsWith('ment')) w = w.slice(0, -4);
  return w;
}

function parseLocalNLPCommand(clauseText) {
  const text = clauseText.toLowerCase().trim();
  const has = (phrase) => new RegExp(`\\b${phrase}\\b`, 'i').test(text);

  if (has('translate') || has('translation')) return 'ai-translator';
  if (has('protect') || has('lock') || has('encrypt')) return 'protect-pdf';
  if (has('resize') || has('scale') || has('dimensions')) return 'image-resizer';
  if (has('rotate') || has('turn') || has('spin')) return 'rotate-pdf';
  if (has('compress') || has('shrink')) return 'compress-pdf';
  if (has('word') || has('doc') || has('docx')) return 'docx-to-pdf';

  return null;
}

function extractParameters(clause, actionId) {
  const lowerClause = clause.toLowerCase();
  const parameters = { ...TOOL_REGISTRY[actionId]?.defaultParams };

  if (actionId === 'ai-translator') {
    // Extract target language
    const languages = ['spanish', 'french', 'bengali', 'german', 'hindi', 'arabic', 'chinese', 'japanese', 'italian'];
    for (const lang of languages) {
      if (lowerClause.includes(lang)) {
        parameters.target_language = lang.charAt(0).toUpperCase() + lang.slice(1);
        break;
      }
    }
  } else if (actionId === 'protect-pdf') {
    // Extract password (e.g. following 'password', 'key', or inside quotes)
    const quoteMatch = clause.match(/["']([^"']+)["']/);
    if (quoteMatch) {
      parameters.password = quoteMatch[1];
    } else {
      const passMatch = lowerClause.match(/password\s+(\S+)/);
      if (passMatch) {
        parameters.password = passMatch[1];
      }
    }
  } else if (actionId === 'image-resizer') {
    // Extract resize percentage or dimensions
    const pctMatch = lowerClause.match(/(\d+)\s*%/);
    if (pctMatch) {
      parameters.percentage = parseInt(pctMatch[1]);
      parameters.mode = 'percentage';
    } else {
      const dimMatch = lowerClause.match(/(\d+)\s*[x*]\s*(\d+)/);
      if (dimMatch) {
        parameters.width = parseInt(dimMatch[1]);
        parameters.height = parseInt(dimMatch[2]);
        parameters.mode = 'custom';
      }
    }
  } else if (actionId === 'rotate-pdf') {
    const angleMatch = lowerClause.match(/\b(90|180|270)\b/);
    if (angleMatch) {
      parameters.angle = parseInt(angleMatch[1]);
    }
  } else if (actionId === 'compress-pdf') {
    const qualMatch = lowerClause.match(/(\d+)\s*%/);
    if (qualMatch) {
      parameters.quality = parseInt(qualMatch[1]) / 100;
    }
  }

  return parameters;
}

// Test cases representing different user intentions
const testCases = [
  { clause: "translate report.docx to french", action: "ai-translator", expectedParams: { target_language: "French" } },
  { clause: "lock contract.pdf with password 'secret123'", action: "protect-pdf", expectedParams: { password: "secret123" } },
  { clause: "resize image.png to 50%", action: "image-resizer", expectedParams: { percentage: 50, mode: "percentage" } },
  { clause: "resize mockup.jpg to 1280x720", action: "image-resizer", expectedParams: { width: 1280, height: 720, mode: "custom" } },
  { clause: "rotate contract.pdf by 180 degrees", action: "rotate-pdf", expectedParams: { angle: 180 } }
];

console.log("=========================================");
console.log("Fuzzy NLP Parameter & Intent Extraction Test");
console.log("=========================================");

testCases.forEach(tc => {
  const actionId = parseLocalNLPCommand(tc.clause);
  const params = extractParameters(tc.clause, actionId);
  
  let passed = actionId === tc.action;
  if (passed) {
    for (const [k, v] of Object.entries(tc.expectedParams)) {
      if (params[k] !== v) {
        passed = false;
        break;
      }
    }
  }
  
  console.log(`Clause: "${tc.clause}"`);
  console.log(`Parsed Tool ID: ${actionId} (Expected: ${tc.action})`);
  console.log(`Parsed Params:  ${JSON.stringify(params)} (Expected: ${JSON.stringify(tc.expectedParams)})`);
  console.log(`Status:        ${passed ? "PASSED" : "FAILED"}\n`);
});
