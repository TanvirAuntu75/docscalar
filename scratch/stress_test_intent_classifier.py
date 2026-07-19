import re
import json
import math
import sys
import time
import random
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

def get_levenshtein_distance(a, b):
    if len(a) == 0: return len(b)
    if len(b) == 0: return len(a)
    dp = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1):
        dp[i][0] = i
    for j in range(len(b) + 1):
        dp[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            if a[i-1] == b[j-1]:
                dp[i][j] = dp[i-1][j-1]
            else:
                dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[len(a)][len(b)]

vocab_unigrams = [k for k in vocabulary.keys() if ' ' not in k]
corrections_cache = {}

# Common English words that should never be spelling-corrected to avoid false-positive keyword collisions
STOPWORDS = {
    "would", "could", "should", "mind", "have", "with", "this", "that", "them", "then", 
    "their", "there", "some", "from", "your", "want", "need", "about", "here", "work", 
    "make", "does", "even", "more", "really", "please", "file", "page", "document", "pdf"
}

def correct_word(word):
    if len(word) <= 3:
        return word
    if word in STOPWORDS:
        return word
    if word in vocabulary:
        return word
    if word in corrections_cache:
        return corrections_cache[word]
        
    best_word = word
    # Strict thresholds: length <= 5 requires distance = 1. Length >= 6 allows distance <= 2.
    max_allowed = 1 if len(word) <= 5 else 2
    min_dist = max_allowed + 1
    
    for v_word in vocab_unigrams:
        if abs(len(v_word) - len(word)) >= min_dist:
            continue
        # Most typos preserve the first or last character. If both differ, skip to save CPU.
        if not (v_word[0] == word[0] or v_word[-1] == word[-1]):
            continue
            
        dist = get_levenshtein_distance(word, v_word)
        if dist < min_dist:
            min_dist = dist
            best_word = v_word
            
    corrections_cache[word] = best_word
    return best_word

def tokenize_ngrams(text):
    text = text.lower().strip()
    text = text.replace('—', ' ').replace('–', ' ')
    text = re.sub(r'[^\w\s-]', '', text)
    words = []
    for w in text.split():
        if w:
            s_word = stem(w)
            words.append(correct_word(s_word))
    
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
            
    # Apply confidence threshold
    effective_pred = 'unknown' if (top_class != 'unknown' and max_score < 0.65) else top_class
    return effective_pred, max_score

# Define base templates for tool classes to synthesize queries
TEMPLATES = {
    "merge-pdf": [
        "merge these pdfs together",
        "can you combine them",
        "please join these documents",
        "merge the files",
        "i want to merge these pdfs"
    ],
    "compress-pdf": [
        "shrink file size",
        "make it smaller please",
        "compress this pdf document",
        "decrease the pdf size",
        "reduce file size of this pdf"
    ],
    "docx-to-pdf": [
        "convert docx to pdf",
        "word to pdf",
        "docx to pdf conversion",
        "convert word document to pdf format",
        "change docx into pdf"
    ],
    "protect-pdf": [
        "password restrict my document",
        "protect pdf now",
        "add a password lock to this file",
        "encrypt my pdf",
        "restrict access with password"
    ],
    "unlock-pdf": [
        "unlock pdf with key",
        "remove password from pdf",
        "decrypt my document",
        "unlock the file",
        "remove restriction from this pdf"
    ],
    "ai-translator": [
        "translate language in document",
        "translate file",
        "translate this pdf to spanish",
        "convert text to french",
        "translate this document"
    ],
    "image-converter": [
        "png to jpg format converter",
        "convert png to webp",
        "change image format to jpeg",
        "convert this photo",
        "convert jpg to png"
    ],
    "unzip-file": [
        "unzip folder",
        "extract zip archive",
        "decompress zip file",
        "extract files from zip",
        "unarchive this zip file"
    ],
    "add-watermark": [
        "add watermark on my document",
        "watermark this pdf",
        "place confidential watermark on pages",
        "add text watermark to my file",
        "insert draft watermark logo"
    ],
    "add-page-numbers": [
        "paginate file",
        "add page numbers to pdf",
        "insert page numbering",
        "put page numbers on pages",
        "paginate this document"
    ],
    "remove-pages": [
        "delete pages",
        "remove page 3 and 4",
        "delete page from pdf",
        "cut pages from document",
        "remove specific pages"
    ],
    "crop-pdf": [
        "crop this document",
        "crop the margin borders of my pdf",
        "trim pdf pages",
        "crop pdf file",
        "cut the outer margins of pdf"
    ],
    "html-to-pdf": [
        "convert html to pdf",
        "html file to pdf document",
        "render html code into pdf pages",
        "convert index.html to pdf",
        "compile html to pdf"
    ],
    "url-to-pdf": [
        "convert website to pdf",
        "save web page as pdf",
        "url link to pdf file",
        "render webpage address to pdf",
        "convert website link"
    ],
    "text-to-pdf": [
        "convert text to pdf",
        "txt to pdf",
        "render plain text file to pdf pages",
        "convert text document to pdf",
        "compile text string to pdf"
    ],
    "compare-pdf": [
        "compare documents",
        "compare two pdf files",
        "check difference between pdfs",
        "diff these two documents",
        "find changes between files"
    ],
    "pdf-forms": [
        "pdf forms fill in",
        "fill out interactive fields in pdf",
        "fill form fields",
        "add text to forms",
        "complete pdf form"
    ],
    "sign-pdf": [
        "sign document online",
        "add my signature to the pdf",
        "sign this file",
        "apply signature to pages",
        "place digital signature"
    ],
    "split-pdf": [
        "i want to split this document",
        "split pdf into separate pages",
        "split the file",
        "divide pdf pages",
        "extract split pages"
    ],
    "ocr-pdf": [
        "make this pdf searchable using ocr",
        "ocr scan document",
        "apply ocr text recognition",
        "run ocr on my scanned pdf",
        "make scanned pages readable"
    ],
    "rotate-pdf": [
        "rotate my pdf pages",
        "rotate pages 90 degrees",
        "turn pages clockwise",
        "rotate orientation of pdf",
        "flip document page direction"
    ],
    "powerpoint-to-pdf": [
        "convert powerpoint to pdf",
        "pptx to pdf",
        "save slides as pdf",
        "convert presentation files to pdf",
        "powerpoint document to pdf conversion"
    ],
    "pdf-to-word": [
        "pdf to word document",
        "convert pdf to docx",
        "change pdf into editable word file",
        "save pdf pages as word doc",
        "extract pdf content to word"
    ],
    "image-to-pdf": [
        "convert images to pdf",
        "png to pdf compilation",
        "make pdf from pictures",
        "convert jpg files to pdf doc",
        "bundle photos into pdf"
    ],
    "image-resizer": [
        "resize my photo",
        "change image dimensions",
        "resize picture pixels",
        "scale down photo size",
        "resize image width and height"
    ],
    "redact-pdf": [
        "redact sensitive info from pdf",
        "blackout text in document",
        "redact private information",
        "mask sensitive numbers",
        "apply redaction black box"
    ],
    "qr-generator": [
        "generate a qr code",
        "create qr code for website url",
        "generate barcode qr link",
        "make qr code",
        "qr code generator tool"
    ],
    "organize-pdf": [
        "reorder my pdf pages",
        "rearrange page ordering in pdf",
        "organize pages in document",
        "change page sequence",
        "re-order pages"
    ],
    "scan-to-pdf": [
        "scan this document with webcam",
        "trigger a scanner to scan document to pdf",
        "webcam scan pages to pdf",
        "capture paper scan using camera",
        "scan pages from webcam feed"
    ],
    "conversion-pipeline": [
        "execute batch conversion workflow pipeline",
        "sequential pipeline process",
        "run pipeline conversion",
        "batch pipeline execution workflow",
        "process multiple conversions sequentially"
    ],
    "resume-builder": [
        "create a resume from templates",
        "please build cv",
        "make professional resume online",
        "resume builder templates",
        "create clean resume document"
    ]
}

# 1. Load & Throughput Test
def run_throughput_test():
    print("\n--- Test 1: Load & Throughput Test ---")
    random.seed(42)
    classes_list = list(TEMPLATES.keys())
    
    # Synthesize 20,000 queries
    sentences = []
    prefixes = ["", "please ", "can you ", "i want to ", "could you please ", "i need to ", "would you mind to "]
    suffixes = ["", " now", " please", " immediately", " for my project", " asap", " quickly"]
    
    for _ in range(20000):
        cls = random.choice(classes_list)
        base = random.choice(TEMPLATES[cls])
        prefix = random.choice(prefixes)
        suffix = random.choice(suffixes)
        sentences.append(prefix + base + suffix)
        
    print(f"Generated {len(sentences)} single-intent queries for throughput test.")
    
    latencies = []
    start_time = time.perf_counter()
    for sentence in sentences:
        p_start = time.perf_counter()
        predict_intent(sentence)
        p_end = time.perf_counter()
        latencies.append((p_end - p_start) * 1000.0) # in ms
    end_time = time.perf_counter()
    
    total_time = end_time - start_time
    throughput = len(sentences) / total_time
    avg_latency = total_time / len(sentences) * 1000.0
    
    latencies.sort()
    p50 = latencies[int(len(latencies) * 0.50)]
    p90 = latencies[int(len(latencies) * 0.90)]
    p95 = latencies[int(len(latencies) * 0.95)]
    p99 = latencies[int(len(latencies) * 0.99)]
    
    print(f"Total Time: {total_time:.4f} seconds")
    print(f"Throughput: {throughput:.2f} predictions/second")
    print(f"Avg Latency: {avg_latency:.4f} ms")
    print(f"p50 Latency: {p50:.4f} ms")
    print(f"p90 Latency: {p90:.4f} ms")
    print(f"p95 Latency: {p95:.4f} ms")
    print(f"p99 Latency: {p99:.4f} ms")
    
    return {
        "total_time": total_time,
        "throughput": throughput,
        "avg_latency": avg_latency,
        "p50": p50,
        "p90": p90,
        "p95": p95,
        "p99": p99
    }

# 2. Adversarial & Typos Test
def mutate_word(word):
    if len(word) <= 3:
        return word
    chars = list(word)
    mutation_type = random.choice(['swap', 'delete', 'insert', 'substitute'])
    idx = random.randint(0, len(chars) - 1)
    if mutation_type == 'swap' and idx < len(chars) - 1:
        chars[idx], chars[idx+1] = chars[idx+1], chars[idx]
    elif mutation_type == 'delete':
        chars.pop(idx)
    elif mutation_type == 'insert':
        chars.insert(idx, random.choice('abcdefghijklmnopqrstuvwxyz'))
    elif mutation_type == 'substitute':
        chars[idx] = random.choice('abcdefghijklmnopqrstuvwxyz')
    return "".join(chars)

def inject_heavy_typos(sentence, word_prob=0.4):
    words = sentence.split()
    mutated_words = []
    for w in words:
        if random.random() < word_prob:
            mutated_words.append(mutate_word(w))
        else:
            mutated_words.append(w)
    return " ".join(mutated_words)

def run_adversarial_test():
    print("\n--- Test 2: Adversarial & Typos Test ---")
    random.seed(42)
    classes_list = list(TEMPLATES.keys())
    
    # Synthesize 2,000 queries with typos
    adversarial_samples = []
    for _ in range(2000):
        cls = random.choice(classes_list)
        base = random.choice(TEMPLATES[cls])
        noisy = inject_heavy_typos(base, word_prob=0.5) # Heavy typo injection
        adversarial_samples.append((noisy, cls))
        
    print(f"Generated {len(adversarial_samples)} adversarial queries with typos.")
    
    passed = 0
    failures_by_class = {}
    class_totals = {}
    
    for noisy, expected in adversarial_samples:
        class_totals[expected] = class_totals.get(expected, 0) + 1
        pred, conf = predict_intent(noisy)
        if pred == expected:
            passed += 1
        else:
            failures_by_class[expected] = failures_by_class.get(expected, 0) + 1
            
    accuracy = (passed / len(adversarial_samples)) * 100.0
    print(f"Overall Typos Accuracy: {passed}/2000 ({accuracy:.2f}%)")
    
    print("\nTop 5 classes with highest failure rate under typos:")
    failure_rates = []
    for cls, count in failures_by_class.items():
        total = class_totals[cls]
        rate = (count / total) * 100.0
        failure_rates.append((cls, count, total, rate))
    failure_rates.sort(key=lambda x: x[3], reverse=True)
    for cls, count, total, rate in failure_rates[:5]:
        print(f"  {cls}: {count}/{total} failed ({rate:.2f}%)")
        
    # Print some examples
    print("\nSample adversarial classifications:")
    sampled = random.sample(adversarial_samples, 5)
    for noisy, expected in sampled:
        pred, conf = predict_intent(noisy)
        status = "PASS" if pred == expected else "FAIL"
        print(f"  [{status}] \"{noisy}\" -> Expected: '{expected}', Got: '{pred}' (Conf: {conf:.1%})")
        
    return {
        "accuracy": accuracy,
        "passed": passed,
        "failed": len(adversarial_samples) - passed,
        "failure_rates": failure_rates[:10]
    }

# 3. Out-of-Vocabulary (OOV) Test
GIBBERISH_WORDS = [
    "flibber-gaster", "snarf-blast", "plumbus", "scranch", "wubba-lubba", 
    "gromflomite", "schleem", "dingle-bop", "fleeb", "gazorpazorp", 
    "glip-glop", "squanchy", "shwifty", "bumbly", "zib-zob", "krinkle", 
    "flim-flam", "gargle-blaster", "snoof", "wumpus"
]

def generate_oov_sentence():
    # 50% fully fabricated gibberish, 50% structured gibberish
    if random.random() < 0.5:
        # Fully fabricated
        words = [random.choice(GIBBERISH_WORDS) for _ in range(random.randint(3, 6))]
        return " ".join(words)
    else:
        # Structured gibberish
        structures = [
            "please {} the {}",
            "can you {} my doc",
            "how do i {} this {} file",
            "{} this document now",
            "would you mind to {} the {} asap"
        ]
        struct = random.choice(structures)
        n_args = struct.count("{}")
        args = [random.choice(GIBBERISH_WORDS) for _ in range(n_args)]
        return struct.format(*args)

def run_oov_test():
    print("\n--- Test 3: Out-of-Vocabulary (OOV) Test ---")
    random.seed(42)
    
    oov_sentences = [generate_oov_sentence() for _ in range(1000)]
    print(f"Generated {len(oov_sentences)} OOV/gibberish queries.")
    
    unknown_count = 0
    hallucinations = {}
    
    for sentence in oov_sentences:
        pred, conf = predict_intent(sentence)
        if pred == 'unknown':
            unknown_count += 1
        else:
            hallucinations[pred] = hallucinations.get(pred, 0) + 1
            print(f"DEBUG HALLUCINATION: \"{sentence}\" -> Tokens: {tokenize_ngrams(sentence)} -> Predicted: '{pred}' (Conf: {conf:.1%})")
            
    safety_rate = (unknown_count / len(oov_sentences)) * 100.0
    print(f"OOV Safety Rate (Classified as 'unknown'): {unknown_count}/1000 ({safety_rate:.2f}%)")
    
    if hallucinations:
        print("\nHallucination targets (predicted classes instead of 'unknown'):")
        sorted_h = sorted(hallucinations.items(), key=lambda x: x[1], reverse=True)
        for cls, count in sorted_h[:5]:
            print(f"  {cls}: {count} occurrences")
            
    # Print some examples
    print("\nSample OOV classifications:")
    sampled = random.sample(oov_sentences, 5)
    for sentence in sampled:
        pred, conf = predict_intent(sentence)
        status = "SAFE" if pred == 'unknown' else "HALLUCINATED"
        print(f"  [{status}] \"{sentence}\" -> Predicted: '{pred}' (Conf: {conf:.1%})")
        
    return {
        "safety_rate": safety_rate,
        "unknown_count": unknown_count,
        "hallucinations": sorted(hallucinations.items(), key=lambda x: x[1], reverse=True)[:5]
    }

# 4. Chained Prompt Stress Test
def run_chained_prompt_test():
    print("\n--- Test 4: Chained Prompt Stress Test ---")
    random.seed(42)
    classes_list = [c for c in TEMPLATES.keys() if c != 'unknown']
    transitions = [" then ", " and then ", " after that ", " followed by ", " and finally "]
    
    chained_samples = []
    for _ in range(1000):
        k = random.randint(3, 5) # 3 to 5 steps
        selected_intents = random.sample(classes_list, k)
        
        parts = []
        for i, intent in enumerate(selected_intents):
            part = random.choice(TEMPLATES[intent])
            parts.append(part)
            
        # Join with transitions
        prompt = ""
        for i in range(k):
            prompt += parts[i]
            if i < k - 1:
                prompt += random.choice(transitions)
                
        chained_samples.append((prompt, selected_intents))
        
    print(f"Generated {len(chained_samples)} chained prompts (length 3-5).")
    
    # Latency tracking for chained prompts
    chained_latencies = []
    predictions = []
    
    for prompt, intents in chained_samples:
        p_start = time.perf_counter()
        pred, conf = predict_intent(prompt)
        p_end = time.perf_counter()
        chained_latencies.append((p_end - p_start) * 1000.0)
        predictions.append((pred, conf, intents))
        
    avg_chained_latency = sum(chained_latencies) / len(chained_latencies)
    chained_latencies.sort()
    c_p50 = chained_latencies[int(len(chained_latencies) * 0.50)]
    c_p99 = chained_latencies[int(len(chained_latencies) * 0.99)]
    
    # Analyze alignment
    # Did it predict the first intent? Last intent? Other? Unknown?
    first_intent_match = 0
    last_intent_match = 0
    middle_intent_match = 0
    unknown_count = 0
    other_match = 0
    
    for pred, conf, intents in predictions:
        if pred == 'unknown':
            unknown_count += 1
        elif pred == intents[0]:
            first_intent_match += 1
        elif pred == intents[-1]:
            last_intent_match += 1
        elif pred in intents[1:-1]:
            middle_intent_match += 1
        else:
            other_match += 1
            
    total = len(predictions)
    print(f"Prediction breakdown on chained prompts:")
    print(f"  First intent matched: {first_intent_match}/{total} ({first_intent_match/total*100.0:.2f}%)")
    print(f"  Last intent matched: {last_intent_match}/{total} ({last_intent_match/total*100.0:.2f}%)")
    print(f"  Middle intent matched: {middle_intent_match}/{total} ({middle_intent_match/total*100.0:.2f}%)")
    print(f"  Classified as 'unknown': {unknown_count}/{total} ({unknown_count/total*100.0:.2f}%)")
    print(f"  Other (unrelated) class: {other_match}/{total} ({other_match/total*100.0:.2f}%)")
    
    print(f"\nLatency on Chained Prompts (compared to single-intent):")
    print(f"  Avg Latency: {avg_chained_latency:.4f} ms")
    print(f"  p50 Latency: {c_p50:.4f} ms")
    print(f"  p99 Latency: {c_p99:.4f} ms")
    
    # Latency comparison with single intents (using a fresh sample of 1,000 single intents to get an exact comparison)
    single_samples = []
    for _ in range(1000):
        cls = random.choice(classes_list)
        single_samples.append(random.choice(TEMPLATES[cls]))
        
    single_latencies = []
    for s in single_samples:
        p_start = time.perf_counter()
        predict_intent(s)
        p_end = time.perf_counter()
        single_latencies.append((p_end - p_start) * 1000.0)
        
    avg_single_latency = sum(single_latencies) / len(single_latencies)
    print(f"  Single-Intent Avg Latency: {avg_single_latency:.4f} ms")
    ratio = avg_chained_latency / avg_single_latency
    print(f"  Latency ratio (Chained / Single): {ratio:.2f}x (showing complexity scale)")
    
    # Print some examples
    print("\nSample chained classifications:")
    sampled = random.sample(predictions, 5)
    for pred, conf, intents in sampled:
        # rebuild a sample matching prompt
        # let's just find the prompt in the chained_samples
        idx = [p[0] for p in predictions].index(pred) # simple lookup
        prompt = chained_samples[idx][0]
        # Truncate prompt if too long for display
        display_prompt = prompt if len(prompt) < 100 else prompt[:97] + "..."
        print(f"  Query: \"{display_prompt}\"")
        print(f"    Intents in chain: {intents}")
        print(f"    Predicted Intent: '{pred}' (Conf: {conf:.1%})")
        
    return {
        "avg_chained_latency": avg_chained_latency,
        "avg_single_latency": avg_single_latency,
        "first_match_pct": first_intent_match / total * 100.0,
        "last_match_pct": last_intent_match / total * 100.0,
        "middle_match_pct": middle_intent_match / total * 100.0,
        "unknown_pct": unknown_count / total * 100.0,
        "other_pct": other_match / total * 100.0,
        "c_p50": c_p50,
        "c_p99": c_p99
    }

def main():
    print("=" * 60)
    print("DOCFORGE LINEAR INTENT CLASSIFIER COMPREHENSIVE STRESS TEST")
    print("=" * 60)
    print(f"Loading weights from {weights_path}")
    print(f"Vocabulary size: {len(vocabulary)} terms")
    print(f"Number of classes: {len(classes)} classes")
    
    results = {}
    results["throughput"] = run_throughput_test()
    results["adversarial"] = run_adversarial_test()
    results["oov"] = run_oov_test()
    results["chained"] = run_chained_prompt_test()
    
    print("\n" + "=" * 60)
    print("STRESS TEST SUMMARY")
    print("=" * 60)
    print(f"1. Throughput: {results['throughput']['throughput']:.2f} pred/sec (Avg Latency: {results['throughput']['avg_latency']:.4f} ms)")
    print(f"2. Adversarial (Typos) Accuracy: {results['adversarial']['accuracy']:.2f}%")
    print(f"3. OOV Safety Rate: {results['oov']['safety_rate']:.2f}% classified as 'unknown'")
    print(f"4. Chained Prompt Lead Intent: First ({results['chained']['first_match_pct']:.1f}%), Last ({results['chained']['last_match_pct']:.1f}%), Middle ({results['chained']['middle_match_pct']:.1f}%)")
    print(f"   Chained Latency Ratio: {results['chained']['avg_chained_latency']:.4f} ms vs {results['chained']['avg_single_latency']:.4f} ms single ({results['chained']['avg_chained_latency']/results['chained']['avg_single_latency']:.2f}x)")
    print("=" * 60)

if __name__ == '__main__':
    main()
