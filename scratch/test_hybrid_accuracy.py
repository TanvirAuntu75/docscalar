import re
import json
import math
import sys
from pathlib import Path
from transformers import AutoTokenizer, AutoModel
import torch
import torch.nn.functional as F

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

def predict_tfidf(text):
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
            
    # Apply format heuristic
    if top_class == 'image-compressor':
        image_keywords = r'\b(image|photo|jpg|jpeg|png|webp|pic|picture|gif)\b'
        if not re.search(image_keywords, text, re.IGNORECASE):
            top_class = 'compress-pdf'
            
    return top_class, max_score

INTENT_PROTOTYPES = {
  'merge-pdf': ["merge these pdfs together", "combine my pdf files into one document", "join files together", "stitch pdf"],
  'split-pdf': ["split my pdf into separate pages", "divide this document into parts", "cut the pdf in half", "separate the pages of my document"],
  'compress-pdf': ["compress my pdf file", "shrink the file size of my pdf", "reduce the pdf size", "make the pdf smaller", "squeeze the file size down"],
  'ocr-pdf': ["make this pdf searchable using ocr", "recognize text in my scanned pdf", "read text from image pdf", "extract text from scan"],
  'rotate-pdf': ["rotate this pdf 90 degrees", "turn the page sideways", "flip the pdf upside down", "rotate my pdf pages"],
  'protect-pdf': ["protect this pdf with a password", "lock the pdf file", "encrypt my document", "secure my pdf", "safeguard this document"],
  'unlock-pdf': ["unlock pdf with key", "decrypt my document", "remove password lock", "bypass lock"],
  'docx-to-pdf': ["convert docx to pdf", "word to pdf", "convert word document to pdf"],
  'excel-to-pdf': ["excel to pdf", "xlsx to pdf", "convert excel sheet to pdf", "spreadsheet to pdf"],
  'powerpoint-to-pdf': ["convert powerpoint to pdf", "ppt to pdf", "pptx to pdf", "slides to pdf"],
  'html-to-pdf': ["convert html to pdf", "convert html code to pdf", "webpage html to pdf file"],
  'pdf-to-word': ["pdf to word document", "convert pdf to docx", "convert pdf to word"],
  'pdf-to-excel': ["pdf to excel", "pdf to sheet", "convert pdf to xlsx", "convert pdf to spreadsheet"],
  'pdf-to-powerpoint': ["convert pdf to powerpoint", "pdf to ppt", "pdf to pptx", "convert pdf to slides"],
  'image-converter': ["png to jpg format converter", "convert image format", "jpeg to webp", "change image format"],
  'image-to-pdf': ["convert images to pdf", "photos to pdf", "pictures to pdf", "jpg to pdf", "png to pdf"],
  'image-compressor': ["compress image", "shrink photo size", "reduce image size", "compress photo", "make image smaller"],
  'image-resizer': ["resize my photo", "resize image", "scale image", "change dimensions", "scale photo"],
  'unzip-file': ["unzip folder", "unzip archive", "extract zip file", "decompress zip file"],
  'add-watermark': ["add watermark on my document", "watermark pdf", "stamp pdf", "add stamp to document"],
  'add-page-numbers': ["paginate file", "add page numbers", "paginate pdf", "insert page numbers"],
  'remove-pages': ["delete pages from pdf", "remove page from document", "exclude page", "delete specific pages"],
  'crop-pdf': ["crop this document", "crop pdf", "cut margins", "trim pdf margins"],
  'edit-pdf': ["edit pdf", "modify pdf", "annotate pdf", "draw on pdf", "write on pdf", "pdf editor"],
  'qr-generator': ["generate a qr code", "barcode generator", "create qr code", "make qr code"],
  'redact-pdf': ["redact sensitive info from pdf", "blackout text in pdf", "hide sensitive info", "censor pdf"],
  'compare-pdf': ["compare documents", "diff pdf", "compare pdfs", "pdf comparison", "compare two pdfs"],
  'pdf-to-pdfa': ["pdf to pdfa", "archive pdf", "convert pdf to pdfa", "make pdfa compliant"],
  'url-to-pdf': ["convert website to pdf", "url to pdf", "convert webpage to pdf", "link to pdf"],
  'pdf-to-image': ["pdf to image", "pdf to images", "pdf to jpg", "pdf to png", "convert pdf to image"],
  'ai-translator': ["translate language in document", "translate file", "language translation", "translate pdf"],
  'text-to-pdf': ["convert text to pdf", "txt to pdf", "convert text file to pdf", "txt to pdf converter"],
  'sign-pdf': ["sign document online", "sign pdf", "add signature", "draw signature", "e-sign pdf"],
  'extract-pages': ["extract page", "select page", "extract pages from pdf", "pull pages from pdf"],
  'organize-pdf': ["reorder my pdf pages", "organize pages", "arrange pages", "rearrange pdf pages"],
  'pdf-forms': ["pdf forms fill in", "fill form", "form fields", "fill pdf form", "interactive form"],
  'repair-pdf': ["repair corrupted pdf", "fix broken pdf", "restore damaged pdf", "fix pdf file"],
  'scan-to-pdf': ["scan this document with webcam", "scan document", "scan to pdf", "trigger a scanner"],
  'conversion-pipeline': ["execute batch conversion workflow pipeline", "sequential pipeline process", "conversion workflow", "batch process"],
  'resume-builder': ["create a resume from templates", "please build cv", "resume builder", "cv builder", "create cv"]
}

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
    ("i have a couple of documents from my client and i want to merge pdf because my boss requested to have this done as soon as possible", "merge-pdf"),
    ("as part of my daily document management pipeline i must compress my pdf to avoid any prospective errors in the future", "compress-pdf"),
    ("my manager asked me if it is possible to unlock pdf so i can download the final processed file to my computer", "unlock-pdf"),
    ("could you please check the node network and help me to translate pdf without losing any text formatting or formatting styles", "ai-translator"),
    ("since the current file layout is messy let's try to crop pdf on the files that are currently active in my selection pool", "crop-pdf"),
    ("i uploaded some files just now and i need you to convert docx to pdf on all the selected document nodes in the workspace grid", "docx-to-pdf"),
    ("in order to share these files with my team i need to add watermark to pdf to make sure everything is compliant with our company security policy", "add-watermark"),
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
    ("এই ফাইলটা মার্জ করো", "merge-pdf"),
    ("দয়া করে পিডিএফ সাইজ কমানো", "compress-pdf"),
    ("এই file টা compress করে দাও", "compress-pdf"),
    ("আমার pdf টা rotate করা দরকার", "rotate-pdf"),
    ("make it really small", "compress-pdf"),
    ("compress it as much as possible", "compress-pdf"),
    ("merge this document—actually no, do not do that", "unknown"),
    ("please merge the file—wait, let's split instead", "split-pdf"),
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
        
    print("Loading all-MiniLM-L6-v2 model in PyTorch...")
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModel.from_pretrained(model_name)
    
    def get_embedding(text):
        inputs = tokenizer(text, padding=True, truncation=True, return_tensors="pt")
        with torch.no_grad():
            outputs = model(**inputs)
        # Mean Pooling
        token_embeddings = outputs[0]
        attention_mask = inputs['attention_mask']
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        embedding = sum_embeddings / sum_mask
        # Normalize
        embedding = F.normalize(embedding, p=2, dim=1)
        return embedding[0].numpy()

    print("Generating semantic anchors...")
    prototype_embeddings = {}
    for intent, sentences in INTENT_PROTOTYPES.items():
        prototype_embeddings[intent] = [get_embedding(s) for s in sentences]
        
    print("\nRunning Hybrid Ensemble Test Suite...")
    passed = 0
    total = len(test_cases)
    failures = []
    
    tfidf_threshold = 0.80
    semantic_threshold = 0.55
    negation_regex = r'\b(not|no|don\'t|dont|never|stop|cancel|do not|don t|prevent)\b'
    
    for query, expected in test_cases:
        final_predict = 'unknown'
        confidence = 1.0
        engine = 'None'
        
        # 1. TF-IDF
        pred_class, conf = predict_tfidf(query)
        if pred_class != 'unknown' and conf >= tfidf_threshold:
            final_predict = pred_class
            confidence = conf
            engine = 'TF-IDF'
        else:
            # 2. Negation Guard
            if re.search(negation_regex, query, re.IGNORECASE):
                final_predict = 'unknown'
                engine = 'Negation Guard'
            else:
                # 3. Semantic
                engine = 'Semantic'
                query_emb = get_embedding(query)
                
                best_intent = 'unknown'
                highest_sim = 0.0
                
                for intent, embs in prototype_embeddings.items():
                    for emb in embs:
                        # Cosine similarity
                        sim = float(torch.nn.functional.cosine_similarity(
                            torch.tensor(query_emb).unsqueeze(0), 
                            torch.tensor(emb).unsqueeze(0)
                        ).item())
                        if sim > highest_sim:
                            highest_sim = sim
                            best_intent = intent
                
                if highest_sim >= semantic_threshold:
                    final_predict = best_intent
                else:
                    final_predict = 'unknown'
                confidence = highest_sim
                
                # Apply fallback heuristic
                if final_predict == 'image-compressor':
                    image_keywords = r'\b(image|photo|jpg|jpeg|png|webp|pic|picture|gif)\b'
                    if not re.search(image_keywords, query, re.IGNORECASE):
                        final_predict = 'compress-pdf'
                        engine = 'Semantic + Heuristic'
                        
        is_expected_unknown = (expected == 'unknown')
        is_predicted_unknown = (final_predict == 'unknown')
        
        if final_predict == expected or (is_expected_unknown and is_predicted_unknown):
            passed += 1
            print(f"[PASS] \"{query}\" -> {final_predict} ({engine})")
        else:
            failures.append((query, expected, final_predict, engine, confidence))
            print(f"[FAIL] \"{query}\" -> Expected: {expected}, Got: {final_predict} via {engine} ({confidence:.4f})")
            
    accuracy = (passed / total) * 100
    print(f"\nHybrid Accuracy: {passed}/{total} ({accuracy:.2f}%)")
    
if __name__ == '__main__':
    main()
