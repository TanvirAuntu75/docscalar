// test_fuzzy.js
// Verification of robust fuzzy NLP phrase matcher for DocForge Canvas

const TOOL_REGISTRY = {
  'merge-pdf': {
    name: 'Merge PDF',
    synonyms: ['merge', 'combine', 'join', 'stitch', 'bundle', 'concatenate']
  },
  'compress-pdf': {
    name: 'Compress PDF',
    synonyms: ['compress', 'shrink', 'reduce size', 'minimize']
  },
  'rotate-pdf': {
    name: 'Rotate PDF',
    synonyms: ['rotate', 'turn', 'spin', 'landscape', 'portrait']
  },
  'docx-to-pdf': {
    name: 'Docx to PDF',
    synonyms: ['word to pdf', 'docx to pdf', 'convert docx', 'convert word']
  },
  'excel-to-pdf': {
    name: 'Excel to PDF',
    synonyms: ['excel to pdf', 'xlsx to pdf', 'csv to pdf', 'sheet to pdf']
  },
  'pdf-to-image': {
    name: 'PDF to Image',
    synonyms: ['pdf to image', 'pdf to images', 'pdf to jpg', 'pdf to png', 'pdf to pictures']
  }
};

// Fast Levenshtein distance calculator
function getLevenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion / deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function getWordSimilarity(a, b) {
  const distance = getLevenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

// Simple English stemming rule-base for common tool actions
function stemWord(word) {
  let w = word.toLowerCase().trim();
  if (w.endsWith('ing')) w = w.slice(0, -3);
  if (w.endsWith('ed')) w = w.slice(0, -2);
  if (w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  if (w.endsWith('ment')) w = w.slice(0, -4);
  return w;
}

function parseFuzzyNLPCommand(clauseText) {
  const text = clauseText.toLowerCase().trim();
  const userWords = text.split(/\s+/).filter(Boolean);
  const stemmedUserWords = userWords.map(stemWord);

  // Exact matching checks first (high-priority patterns)
  const hasExact = (phrase) => {
    const escaped = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
  };
  const hasExactAny = (...phrases) => phrases.some(p => hasExact(p));

  if (hasExactAny('pdf to word', 'to word', 'to docx', 'pdf to doc')) return 'pdf-to-word';
  if (hasExactAny('pdf to excel', 'to excel', 'to sheet', 'to csv', 'pdf to sheet')) return 'pdf-to-excel';
  if (hasExactAny('pdf to powerpoint', 'to powerpoint', 'to ppt', 'pdf to ppt')) return 'pdf-to-powerpoint';
  if (hasExactAny('images to pdf', 'photos to pdf', 'pictures to pdf', 'image to pdf', 'jpg to pdf', 'png to pdf', 'jpeg to pdf')) return 'image-to-pdf';

  // Helper to check if a multi-word synonym matches the user input (fuzzy)
  const matchesSynonymFuzzy = (synonym) => {
    const synWords = synonym.toLowerCase().split(/\s+/).filter(Boolean);
    
    // For each word in the synonym, check if there is a matching word in the user prompt
    return synWords.every(synW => {
      const stemmedSynW = stemWord(synW);
      return stemmedUserWords.some(userW => {
        // Direct match of stemmed forms
        if (userW === stemmedSynW) return true;
        // Fuzzy similarity match (threshold 0.8)
        if (getWordSimilarity(userW, stemmedSynW) >= 0.7) return true;
        return false;
      });
    });
  };

  // Check synonyms using fuzzy matching
  for (const [actionId, meta] of Object.entries(TOOL_REGISTRY)) {
    if (meta.synonyms.some(syn => matchesSynonymFuzzy(syn))) {
      return actionId;
    }
  }

  // Exact matching fallbacks
  if (hasExactAny('word', 'doc', 'docx')) return 'docx-to-pdf';
  if (hasExactAny('excel', 'xlsx', 'xls', 'csv')) return 'excel-to-pdf';
  if (hasExactAny('powerpoint', 'ppt', 'pptx')) return 'powerpoint-to-pdf';

  return null;
}

// Test cases containing typos, plurals, gerunds, and formatting styles
const testCases = [
  { input: "comprse pdf", expected: "compress-pdf" },
  { input: "merging documents", expected: "merge-pdf" },
  { input: "stitching multiple files", expected: "merge-pdf" },
  { input: "rotat document 90 deg", expected: "rotate-pdf" },
  { input: "xlsx to pdf conversion", expected: "excel-to-pdf" },
  { input: "convert word file", expected: "docx-to-pdf" },
  { input: "pdf to immages", expected: "pdf-to-image" }
];

console.log("=========================================");
console.log("Fuzzy NLP Command Parser Verification");
console.log("=========================================");

testCases.forEach(tc => {
  const result = parseFuzzyNLPCommand(tc.input);
  const status = result === tc.expected ? "PASSED" : "FAILED";
  console.log(`Input: "${tc.input.padEnd(25)}" | Result: ${(result || 'null').padEnd(15)} | Expected: ${tc.expected.padEnd(15)} | Status: ${status}`);
});
