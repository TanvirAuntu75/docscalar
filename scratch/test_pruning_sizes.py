import json
import math
import re
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
weights_path = base_dir / 'src' / 'utils' / 'classifier_weights.json'

with open(weights_path, 'r', encoding='utf-8') as f:
    weights = json.load(f)

# The current loaded file has sparse coefs (dictionaries)
# Let's recreate the original dense representation from it to do the experiment
vocab = weights['vocabulary']
idf = weights['idf']
coef_sparse = weights['coef']
intercept = weights['intercept']
classes = weights['classes']

F = len(vocab)
coef_dense = []
for c_dict in coef_sparse:
    w = [0.0] * F
    for k, v in c_dict.items():
        w[int(k)] = v
    coef_dense.append(w)

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

def evaluate_accuracy(vocab_p, idf_p, coef_p, query_test_cases):
    passed = 0
    total = len(query_test_cases)
    
    for query, expected in query_test_cases:
        tokens = tokenize_ngrams(query)
        if not tokens:
            pred = 'unknown'
        else:
            # TF-IDF sparse vector transform using pruned vocab
            tf = {}
            for t in tokens:
                if t in vocab_p:
                    tf[t] = tf.get(t, 0) + 1
            
            sparse_vector = []
            squared_sum = 0.0
            for t, tf_val in tf.items():
                feat_idx = vocab_p[t]
                val = tf_val * idf_p[feat_idx]
                sparse_vector.append((feat_idx, val))
                squared_sum += val ** 2
                
            if squared_sum > 0:
                l2_norm = math.sqrt(squared_sum)
                sparse_vector = [(idx, val / l2_norm) for idx, val in sparse_vector]
            else:
                sparse_vector = []
                
            if not sparse_vector:
                pred = 'unknown'
            else:
                num_classes = len(classes)
                raw_z = [0.0] * num_classes
                max_z = -float('inf')
                
                for c in range(num_classes):
                    z = intercept[c]
                    for feat_idx, val in sparse_vector:
                        z += val * coef_p[c].get(str(feat_idx), 0.0)
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

for threshold in [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5]:
    # 1. Find active feature indices
    active_indices = set()
    for class_w in coef_dense:
        for idx, w in enumerate(class_w):
            if abs(w) > threshold:
                active_indices.add(idx)
                
    active_indices = sorted(list(active_indices))
    
    # 2. Build contiguous mapping
    new_vocab = {}
    new_idf = []
    old_to_new_idx = {}
    
    # Map term string to old_idx helper
    idx_to_term = {v: k for k, v in vocab.items()}
    
    for new_idx, old_idx in enumerate(active_indices):
        term = idx_to_term[old_idx]
        new_vocab[term] = new_idx
        new_idf.append(round(idf[old_idx], 4))
        old_to_new_idx[old_idx] = new_idx
        
    # 3. Map sparse coefficients
    coef_pruned = []
    for class_w in coef_dense:
        class_dict = {}
        for old_idx, w in enumerate(class_w):
            if abs(w) > threshold:
                new_idx = old_to_new_idx[old_idx]
                class_dict[str(new_idx)] = round(w, 4)
        coef_pruned.append(class_dict)
        
    # 4. Serialize to JSON string to measure actual size
    weights_json = {
        'vocabulary': new_vocab,
        'idf': new_idf,
        'coef': coef_pruned,
        'intercept': [round(b, 4) for b in intercept],
        'classes': classes
    }
    serialized = json.dumps(weights_json, ensure_ascii=False)
    actual_size_kb = len(serialized.encode('utf-8')) / 1024
    
    acc = evaluate_accuracy(new_vocab, new_idf, coef_pruned, test_cases)
    print(f"Threshold: {threshold:.2f} | Active Terms: {len(new_vocab)} | Actual JSON Size: {actual_size_kb:.2f} KB | Accuracy: {acc:.2f}%")
