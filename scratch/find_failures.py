"""
Diagnostic: Load the freshly trained classifier_weights.json and run all
TEST_CASES from the training script, printing the FAILING ones.
"""
import json
import math
import re
import sys
from pathlib import Path

# ── Load weights ──────────────────────────────────────────────────────────────
weights_path = Path(__file__).resolve().parent.parent / 'src' / 'utils' / 'classifier_weights.json'
with open(weights_path, encoding='utf-8') as f:
    w = json.load(f)

vocabulary = w['vocabulary']       # token -> idx
idf        = w['idf']              # list[float] indexed by vocabulary idx
coef_matrix= w['coef']            # list[dict[str,float]] per class
intercepts = w['intercept']        # list[float]
classes    = w['classes']          # list[str]

# ── Tokeniser (must match training exactly) ────────────────────────────────────
def stem(word):
    w2 = word.lower().strip()
    if w2.endswith('ing'): w2 = w2[:-3]
    elif w2.endswith('ed'): w2 = w2[:-2]
    elif w2.endswith('ies'): w2 = w2[:-3] + 'y'
    elif w2.endswith('s') and not w2.endswith('ss'): w2 = w2[:-1]
    elif w2.endswith('ment'): w2 = w2[:-4]
    return w2

def tokenize_ngrams(text):
    text = text.lower().strip()
    text = text.replace('—', ' ').replace('–', ' ')
    text = re.sub(r'[^\w\s-]', '', text)
    words = [stem(w) for w in text.split() if w]
    tokens = list(words)
    for i in range(len(words) - 1):
        tokens.append(f"{words[i]} {words[i+1]}")
    return tokens

def predict(query):
    tokens = tokenize_ngrams(query)
    if not tokens:
        return 'unknown', 1.0
    tf = {}
    for t in tokens:
        if t in vocabulary:
            tf[t] = tf.get(t, 0) + 1
    vector_dict = {}
    squared_sum = 0.0
    for t, tf_val in tf.items():
        feat_idx = vocabulary[t]
        val = tf_val * idf[feat_idx]
        vector_dict[feat_idx] = val
        squared_sum += val ** 2
    if squared_sum == 0:
        return 'unknown', 1.0
    l2_norm = math.sqrt(squared_sum)
    sparse = [(idx, val / l2_norm) for idx, val in vector_dict.items()]
    num_classes = len(classes)
    raw_z = [0.0] * num_classes
    max_z = -float('inf')
    for c in range(num_classes):
        z = intercepts[c]
        for feat_idx, val in sparse:
            z += val * coef_matrix[c].get(str(feat_idx), 0.0)
        raw_z[c] = z
        if z > max_z:
            max_z = z
    sum_exp = sum(math.exp(raw_z[c] - max_z) for c in range(num_classes))
    best_c, best_prob = 0, 0.0
    for c in range(num_classes):
        p = math.exp(raw_z[c] - max_z) / sum_exp
        if p > best_prob:
            best_prob = p
            best_c = c
    return classes[best_c], best_prob

# ── Complete TEST_CASES from training script (all 68 cases) ────────────────────
TEST_CASES = [
    ("please merge these pdfs together", "merge-pdf"),
    ("can you combine them", "merge-pdf"),
    ("shrink file size", "compress-pdf"),
    ("make it smaller please", "compress-pdf"),
    ("convert docx to pdf", "docx-to-pdf"),
    ("word to pdf", "docx-to-pdf"),
    ("password restrict my document", "protect-pdf"),
    ("protect pdf now", "protect-pdf"),
    ("unlock pdf with key", "unlock-pdf"),
    ("translate language in document", "ai-translator"),
    ("translate file", "ai-translator"),
    ("png to jpg format converter", "image-converter"),
    ("unzip folder", "unzip-file"),
    ("add watermark on my document", "add-watermark"),
    ("paginate file", "add-page-numbers"),
    ("delete pages", "remove-pages"),
    ("crop this document", "crop-pdf"),
    ("convert html to pdf", "html-to-pdf"),
    ("convert website to pdf", "url-to-pdf"),
    ("convert text to pdf", "text-to-pdf"),
    ("compare documents", "compare-pdf"),
    ("pdf forms fill in", "pdf-forms"),
    ("sign document online", "sign-pdf"),
    ("i want to split this document", "split-pdf"),
    ("make this pdf searchable using ocr", "ocr-pdf"),
    ("rotate my pdf pages", "rotate-pdf"),
    ("convert powerpoint to pdf", "powerpoint-to-pdf"),
    ("pdf to word document", "pdf-to-word"),
    ("convert images to pdf", "image-to-pdf"),
    ("resize my photo", "image-resizer"),
    ("redact sensitive info from pdf", "redact-pdf"),
    ("generate a qr code", "qr-generator"),
    ("reorder my pdf pages", "organize-pdf"),
    ("hello, how can you assist me?", "unknown"),
    ("who designed you?", "unknown"),
    ("wipe the canvas clear", "unknown"),
    ("undo", "unknown"),
    ("redo", "unknown"),
    ("undo the merge", "unknown"),
    ("redo the split", "unknown"),
    ("clear canvas", "unknown"),
    ("don't merge these files", "unknown"),
    ("do not compress this pdf", "unknown"),
    ("stop the merge please", "unknown"),
    ("cancel the rotation", "unknown"),
    ("never compress this file", "unknown"),
    ("wait don't merge yet", "unknown"),
    ("zoom in", "unknown"),
    ("select all nodes", "unknown"),
    ("download my file", "unknown"),
    ("delete this node", "unknown"),
    ("toggle dark mode", "unknown"),
    ("is there a way to merge this file?", "merge-pdf"),
    ("how do i compress my document?", "compress-pdf"),
    ("can you tell me how to rotate these?", "rotate-pdf"),
    ("is it possible to translate this pdf?", "ai-translator"),
    ("this needs to be merged", "merge-pdf"),
    ("the pdf should be compressed", "compress-pdf"),
    ("my pdf file needs to be rotated", "rotate-pdf"),
    ("pls merge this", "merge-pdf"),
    ("plz compress this file", "compress-pdf"),
    ("need 2 split this", "split-pdf"),
    ("scan this document with webcam", "scan-to-pdf"),
    ("trigger a scanner to scan document to pdf", "scan-to-pdf"),
    ("execute batch conversion workflow pipeline", "conversion-pipeline"),
    ("sequential pipeline process", "conversion-pipeline"),
    ("create a resume from templates", "resume-builder"),
    ("please build cv", "resume-builder"),
]

print("\n=== FAILING TEST CASES DIAGNOSTIC ===\n")
passed = 0
failed = []
for query, expected in TEST_CASES:
    pred, conf = predict(query)
    ok = (pred == expected)
    if not ok:
        failed.append((query, expected, pred, f"{conf:.1%}"))
    else:
        passed += 1

print(f"Passed: {passed}/{len(TEST_CASES)}")
print(f"\nFailed cases:")
for q, exp, got, conf in failed:
    print(f"  Query : '{q}'")
    print(f"  Expect: {exp}")
    print(f"  Got   : {got} ({conf})")
    print()
