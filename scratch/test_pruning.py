import json
import math
import re
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
weights_path = base_dir / 'src' / 'utils' / 'classifier_weights.json'

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

# Test cases
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
    ("hello, how can you assist me?", "unknown"),
    ("who designed you?", "unknown"),
    ("wipe the canvas clear", "unknown"),
]

def evaluate_accuracy(coef_pruned):
    passed = 0
    total = len(test_cases)
    
    for query, expected in test_cases:
        tokens = tokenize_ngrams(query)
        if not tokens:
            pred = 'unknown'
        else:
            sparse_vector = get_sparse_tfidf_vector(tokens)
            if not sparse_vector:
                pred = 'unknown'
            else:
                num_classes = len(classes)
                raw_z = [0.0] * num_classes
                max_z = -float('inf')
                
                for c in range(num_classes):
                    z = intercept[c]
                    for feat_idx, val in sparse_vector:
                        z += val * coef_pruned[c].get(str(feat_idx), 0.0)
                    raw_z[c] = z
                    if z > max_z:
                        max_z = z
                        
                sum_exp = 0.0
                probs = [0.0] * num_classes
                for c in range(num_classes):
                    probs[c] = math.exp(raw_z[c] - max_z)
                    sum_exp += probs[c]
                    
                max_score = 0.0
                pred = 'unknown'
                for c in range(num_classes):
                    prob = probs[c] / sum_exp
                    if prob > max_score:
                        max_score = prob
                        pred = classes[c]
                        
        if pred == expected:
            passed += 1
            
    return (passed / total) * 100

for threshold in [0.01, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5]:
    # Prune coef
    pruned = []
    total_weights = 0
    for class_dict in coef:
        new_dict = {}
        for k, v in class_dict.items():
            if abs(v) > threshold:
                new_dict[k] = v
                total_weights += 1
        pruned.append(new_dict)
        
    acc = evaluate_accuracy(pruned)
    # Estimate size in KB
    # Est size: vocabulary (~100KB), idf (~30KB), intercepts (~1KB), coef (varies)
    # Each sparse weight in JSON takes approx 20 chars (e.g. '"1234":0.1234,')
    est_coef_size = total_weights * 20 / 1024
    est_total_size = 130 + est_coef_size
    print(f"Threshold: {threshold:.2f} | Non-zero weights: {total_weights} | Estimated size: {est_total_size:.1f} KB | Test Suite Accuracy: {acc:.2f}%")
