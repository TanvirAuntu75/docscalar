import re
import json
import math
import sys
from pathlib import Path

# Load vocabulary and weights
base_dir = Path(__file__).resolve().parent.parent
weights_path = base_dir / 'src' / 'utils' / 'classifier_weights.json'

if not weights_path.exists():
    print(f"Weights file not found at {weights_path}!", file=sys.stderr)
    sys.exit(1)

with open(weights_path, 'r', encoding='utf-8') as f:
    weights = json.load(f)

vocabulary = weights['vocabulary']
idf = weights['idf']
coef = weights['coef']
intercept = weights['intercept']
classes = weights['classes']

def stem(word):
    w = word.lower().strip()
    if w.endswith('ing'): w = w[:-3]
    elif w.endswith('ed'): w = w[:-2]
    elif w.endswith('ies'): w = w[:-3] + 'y'
    elif w.endswith('s') and not w.endswith('ss'): w = w[:-1]
    elif w.endswith('ment'): w = w[:-4]
    return w

def tokenize_ngrams(text):
    text = text.lower().strip()
    text = text.replace('—', ' ').replace('–', ' ')
    text = re.sub(r'[^\w\s-]', '', text)
    words = [stem(w) for w in text.split() if w]
    
    # Add unigrams
    tokens = list(words)
    # Add bigrams
    for i in range(len(words) - 1):
        tokens.append(f"{words[i]} {words[i+1]}")
    return tokens

def get_sparse_tfidf_vector(tokens):
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
        
    if squared_sum > 0:
        l2_norm = math.sqrt(squared_sum)
        return [(idx, val / l2_norm) for idx, val in vector_dict.items()]
    return []

def predict_intent(text):
    tokens = tokenize_ngrams(text)
    if not tokens:
        return 'unknown', 1.0
        
    sparse_vector = get_sparse_tfidf_vector(tokens)
    if not sparse_vector:
        return 'unknown', 1.0
        
    num_classes = len(classes)
    raw_z = [0.0] * num_classes
    max_z = -float('inf')
    
    for c in range(num_classes):
        z = intercept[c]
        for feat_idx, val in sparse_vector:
            z += val * coef[c].get(str(feat_idx), 0.0)
        raw_z[c] = z
        if z > max_z:
            max_z = z
            
    # Softmax
    sum_exp = 0.0
    probs = [0.0] * num_classes
    for c in range(num_classes):
        exp_val = math.exp(raw_z[c] - max_z)
        probs[c] = exp_val
        sum_exp += exp_val
        
    top_class = 'unknown'
    max_score = 0.0
    for c in range(num_classes):
        prob = probs[c] / sum_exp
        if prob > max_score:
            max_score = prob
            top_class = classes[c]
            
    return top_class, max_score

# Validation Test Suite
test_cases = [
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
    # Additional English-only tool coverage
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
    # Long conversational context-rich examples (Stress testing)
    ("i have a couple of documents from my client and i want to merge pdf because my boss requested to have this done as soon as possible", "merge-pdf"),
    ("as part of my daily document management pipeline i must compress my pdf to avoid any prospective errors in the future", "compress-pdf"),
    ("my manager asked me if it is possible to unlock pdf so i can download the final processed file to my computer", "unlock-pdf"),
    ("could you please check the node network and help me to translate pdf without losing any text formatting or formatting styles", "ai-translator"),
    ("since the current file layout is messy let's try to crop pdf on the files that are currently active in my selection pool", "crop-pdf"),
    ("i uploaded some files just now and i need you to convert docx to pdf on all the selected document nodes in the workspace grid", "docx-to-pdf"),
    ("in order to share these files with my team i need to add watermark to pdf to make sure everything is compliant with our company security policy", "add-watermark"),
    # Negative examples (should classify as unknown)
    ("hello, how can you assist me?", "unknown"),
    ("who designed you?", "unknown"),
    ("wipe the canvas clear", "unknown"),
    ("undo", "unknown"),
    ("redo", "unknown"),
    ("undo the merge", "unknown"),
    ("redo the split", "unknown"),
    ("clear canvas", "unknown"),
    # GAP 4 — NEGATIVE INTENTS (must route to unknown, NOT tool actions!)
    ("don't merge these files", "unknown"),
    ("do not compress this pdf", "unknown"),
    ("stop the merge please", "unknown"),
    ("cancel the rotation", "unknown"),
    ("never compress this file", "unknown"),
    ("wait don't merge yet", "unknown"),
    # GAP 7 — CANVAS UI COMMANDS (must route to unknown)
    ("zoom in", "unknown"),
    ("select all nodes", "unknown"),
    ("download my file", "unknown"),
    ("delete this node", "unknown"),
    ("toggle dark mode", "unknown"),
    # GAP 2 — QUESTION-FORM INTENTS
    ("is there a way to merge this file?", "merge-pdf"),
    ("how do i compress my document?", "compress-pdf"),
    ("can you tell me how to rotate these?", "rotate-pdf"),
    ("is it possible to translate this pdf?", "ai-translator"),
    # GAP 3 — PASSIVE-VOICE INTENTS
    ("this needs to be merged", "merge-pdf"),
    ("the pdf should be compressed", "compress-pdf"),
    ("my pdf file needs to be rotated", "rotate-pdf"),
    # GAP 5+6 — SMS / INFORMAL / BROKEN-ENGLISH
    ("pls merge this", "merge-pdf"),
    ("plz compress this file", "compress-pdf"),
    ("need 2 split this", "split-pdf"),
    # New categories validation cases
    ("scan this document with webcam", "scan-to-pdf"),
    ("trigger a scanner to scan document to pdf", "scan-to-pdf"),
    ("execute batch conversion workflow pipeline", "conversion-pipeline"),
    ("sequential pipeline process", "conversion-pipeline"),
    ("create a resume from templates", "resume-builder"),
    ("please build cv", "resume-builder"),
    # Bengali script and switching
    ("এই ফাইলটা মার্জ করো", "merge-pdf"),
    ("দয়া করে পিডিএফ সাইজ কমানো", "compress-pdf"),
    ("এই file টা compress করে দাও", "compress-pdf"),
    ("আমার pdf টা rotate করা দরকার", "rotate-pdf"),
    # Vague parameters and self-corrections
    ("make it really small", "compress-pdf"),
    ("compress it as much as possible", "compress-pdf"),
    ("merge this document—actually no, do not do that", "unknown"),
    ("please merge the file—wait, let's split instead", "split-pdf"),
    # Frustration and meta questions
    ("ugh why won't this work, just merge them already", "merge-pdf"),
    ("just do the stupid compress already", "compress-pdf"),
    ("can this thing even rotate pdfs?", "rotate-pdf"),
    ("what is the maximum file size to compress?", "compress-pdf"),
]

def main():
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
    print("Running Linear Classifier Test Suite...", flush=True)
    passed = 0
    total = len(test_cases)
    
    for query, expected in test_cases:
        pred, conf = predict_intent(query)
        effective_pred = 'unknown' if (pred != 'unknown' and conf < 0.65) else pred
        if pred == expected or (expected == 'unknown' and effective_pred == 'unknown'):
            passed += 1
            print(f"[PASS] \"{query}\" -> Predicted: '{pred}' (Conf: {conf:.1%})", flush=True)
        else:
            print(f"[FAIL] \"{query}\" -> Expected: '{expected}', Got: '{pred}' (Conf: {conf:.1%})", flush=True)
            
    accuracy = (passed / total) * 100
    print(f"\nAccuracy: {passed}/{total} ({accuracy:.2f}%)", flush=True)
    if accuracy >= 95.0:
        print("Success! Model accuracy exceeds 95% threshold.", flush=True)
        sys.exit(0)
    else:
        print("Error: Model accuracy fell below 95% threshold.", file=sys.stderr, flush=True)
        sys.exit(1)

if __name__ == '__main__':
    main()
