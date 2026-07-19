import json
import re
import math

# Stemmer matching stemWord in canvasBrain.js
def stem(word):
    w = word.lower().strip()
    if w.endswith('ing'): w = w[:-3]
    elif w.endswith('ed'): w = w[:-2]
    elif w.endswith('ies'): w = w[:-3] + 'y'
    elif w.endswith('s') and not w.endswith('ss'): w = w[:-1]
    elif w.endswith('ment'): w = w[:-4]
    return w

# Tokenize and extract both Unigrams & Bigrams
def tokenize_ngrams(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    words = [stem(w) for w in text.split() if w]
    
    tokens = list(words)
    for i in range(len(words) - 1):
        tokens.append(f"{words[i]} {words[i+1]}")
    return tokens

def predict(text):
    with open('src/utils/classifier_weights.json', 'r', encoding='utf-8') as f:
        w = json.load(f)
        
    vocabulary = w['vocabulary']
    idf = w['idf']
    coef = w['coef']
    intercept = w['intercept']
    classes = w['classes']
    
    tokens = tokenize_ngrams(text)
    print("Tokens:", tokens)
    
    # TF-IDF transform
    tf = {}
    for t in tokens:
        if t in vocabulary:
            tf[t] = tf.get(t, 0) + 1
            
    vector = {}
    squared_sum = 0.0
    for t, tf_val in tf.items():
        feat_idx = vocabulary[t]
        val = tf_val * idf[feat_idx]
        vector[feat_idx] = val
        squared_sum += val ** 2
        
    if squared_sum > 0:
        l2_norm = math.sqrt(squared_sum)
        for idx in vector:
            vector[idx] /= l2_norm
            
    print("TF-IDF Vector:", {vocab_term: vector[idx] for vocab_term, idx in vocabulary.items() if idx in vector})
    
    # Predict logits
    scores = []
    for c_idx, class_label in enumerate(classes):
        class_coef = coef[c_idx]
        score = intercept[c_idx]
        contributions = []
        for feat_idx_str, weight in class_coef.items():
            feat_idx = int(feat_idx_str)
            if feat_idx in vector:
                contrib_val = weight * vector[feat_idx]
                score += contrib_val
                # Find term name
                term_name = idx_to_term = {v: k for k, v in vocabulary.items()}[feat_idx]
                contributions.append((term_name, weight, vector[feat_idx], contrib_val))
        scores.append((class_label, score, contributions))
        
    scores.sort(key=lambda x: x[1], reverse=True)
    print("\nTop 5 predictions:")
    for label, score, contribs in scores[:5]:
        print(f"  {label}: {score:.4f}")
        if label in ['unknown', 'merge-pdf', 'crop-pdf']:
            print("    Breakdown:")
            for term, w_val, tf_idf, c_val in sorted(contribs, key=lambda x: abs(x[3]), reverse=True):
                print(f"      '{term}': weight={w_val:.4f} * tfidf={tf_idf:.4f} = {c_val:.4f}")

predict("eta merge korte hobe")
predict("pdf ta translate koren please")
predict("compress korte chai")
