import re
import json
import math
import sys
import random
import time
from pathlib import Path
import importlib.util, os

# Load curated training data from sibling file
def _load_training_data():
    spec = importlib.util.spec_from_file_location(
        "training_data",
        os.path.join(os.path.dirname(__file__), "training_data.py")
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.TRAINING_DATA

TRAINING_DATA = _load_training_data()
import torch
import torch.nn as nn
import torch.optim as optim

# Set random seeds
random.seed(42)
torch.manual_seed(42)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(42)

# 1. Core Synonyms Registry
SYNONYMS = {
    'merge-pdf': [
        'merge', 'combine', 'join', 'stitch', 'bundle', 'concatenate', 
        'merge pdf', 'combine pdfs', 'join pdf files', 'stitch documents', 'bundle pdfs'
    ],
    'split-pdf': [
        'split', 'cut', 'divide', 'separate', 'extract pages', 'half', 
        'split pdf', 'cut pdf', 'divide document', 'separate pages'
    ],
    'compress-pdf': [
        'compress', 'shrink', 'reduce size', 'minimize', 'smaller', 'make smaller', 
        'compress pdf', 'shrink pdf file', 'reduce pdf size'
    ],
    'ocr-pdf': [
        'ocr', 'recognize', 'searchable', 'read text', 'extract text', 
        'ocr pdf', 'run ocr', 'make pdf searchable', 'recognize text'
    ],
    'rotate-pdf': [
        'rotate', 'turn', 'spin', 'landscape', 'portrait', 
        'rotate pdf', 'turn page', 'rotate pages', 'change orientation'
    ],
    'protect-pdf': [
        'protect', 'lock', 'encrypt', 'add password', 'restrict', 
        'protect pdf', 'lock pdf', 'password protect', 'secure pdf'
    ],
    'unlock-pdf': [
        'unlock', 'decrypt', 'remove password', 'bypass lock', 
        'unlock pdf', 'decrypt pdf', 'remove pdf password'
    ],
    'docx-to-pdf': [
        'word to pdf', 'docx to pdf', 'convert docx', 'convert word', 
        'word to pdf converter', 'docx to pdf convert', 'word file to pdf'
    ],
    'excel-to-pdf': [
        'excel to pdf', 'xlsx to pdf', 'csv to pdf', 'sheet to pdf', 
        'excel to pdf convert', 'xlsx to pdf converter', 'spreadsheet to pdf'
    ],
    'powerpoint-to-pdf': [
        'powerpoint to pdf', 'ppt to pdf', 'pptx to pdf', 'slides to pdf', 
        'ppt to pdf convert', 'powerpoint to pdf converter', 'slideshow to pdf'
    ],
    'html-to-pdf': [
        'html to pdf', 'html', 'convert html', 'web to pdf', 
        'html to pdf converter', 'website to pdf', 'web page to pdf'
    ],
    'pdf-to-word': [
        'pdf to word', 'pdf to docx', 'to word', 'to docx', 'convert pdf to word', 
        'pdf to docx converter', 'convert pdf to docx'
    ],
    'pdf-to-excel': [
        'pdf to excel', 'pdf to sheet', 'to excel', 'to xlsx', 'pdf to xlsx', 
        'convert pdf to excel', 'pdf to spreadsheet', 'pdf to xlsx converter'
    ],
    'pdf-to-powerpoint': [
        'pdf to powerpoint', 'pdf to ppt', 'to powerpoint', 'to ppt', 
        'convert pdf to powerpoint', 'pdf to pptx', 'pdf to powerpoint converter'
    ],
    'image-converter': [
        'convert image format', 'png to jpg', 'jpeg to webp', 'change format', 
        'image format', 'image converter', 'convert image file', 'change image format'
    ],
    'image-to-pdf': [
        'images to pdf', 'photos to pdf', 'pictures to pdf', 'image to pdf', 
        'jpg to pdf', 'png to pdf', 'convert image to pdf'
    ],
    'image-compressor': [
        'compress image', 'shrink image', 'reduce image size', 'compress photo', 
        'make image smaller', 'shrink photo size'
    ],
    'image-resizer': [
        'resize image', 'scale image', 'change dimensions', 'resize photo', 
        'scale photo', 'change image size'
    ],
    'unzip-file': [
        'unzip', 'extract zip', 'decompress', 'expand zip', 'unzip archive', 
        'extract zip file', 'decompress zip'
    ],
    'add-watermark': [
        'watermark', 'stamp', 'add stamp', 'add watermark', 'watermark pdf', 
        'add watermark to pdf', 'stamp pdf'
    ],
    'add-page-numbers': [
        'page number', 'paginate', 'add page numbers', 'paginate pdf', 
        'insert page numbers', 'add numbers to pages'
    ],
    'remove-pages': [
        'remove page', 'delete page', 'exclude page', 'remove pdf pages', 
        'delete page from pdf', 'exclude page from pdf'
    ],
    'crop-pdf': [
        'crop', 'crop pdf', 'crop document', 'cut margins', 'trim pdf', 
        'trim page margins', 'adjust margins', 'crop page bounds'
    ],
    'edit-pdf': [
        'edit', 'edit pdf', 'modify pdf', 'annotate pdf', 'draw on pdf', 
        'write on pdf', 'change pdf content', 'pdf editor'
    ],
    'qr-generator': [
        'qr', 'barcode', 'generate qr', 'create qr code', 'make qr code', 
        'barcode generator', 'qr code generator'
    ],
    'redact-pdf': [
        'redact', 'blackout', 'hide sensitive info', 'redact pdf', 
        'black out text', 'censor pdf', 'hide pdf text'
    ],
    'compare-pdf': [
        'compare', 'diff pdf', 'compare documents', 'compare pdfs', 
        'pdf comparison', 'compare two pdfs', 'find differences in pdf'
    ],
    'pdf-to-pdfa': [
        'pdf to pdfa', 'archive pdf', 'pdf/a', 'convert pdf to pdfa', 
        'make pdfa compliant', 'pdf to pdf/a'
    ],
    'url-to-pdf': [
        'url to pdf', 'convert website', 'website to pdf', 
        'convert webpage to pdf', 'save website as pdf', 'link to pdf'
    ],
    'pdf-to-image': [
        'pdf to image', 'pdf to images', 'pdf to jpg', 'pdf to png', 
        'pdf to pictures', 'pdf to photos', 'convert pdf to image'
    ],
    'ai-translator': [
        'translate', 'translate file', 'language translation', 
        'translate pdf', 'translate document', 'translate text'
    ],
    'text-to-pdf': [
        'text to pdf', 'txt to pdf', 'convert text', 'txt to pdf converter', 
        'convert text file to pdf'
    ],
    'sign-pdf': [
        'sign', 'signature', 'sign document', 'sign pdf', 'add signature', 
        'draw signature', 'e-sign pdf'
    ],
    'extract-pages': [
        'extract page', 'select page', 'extract pages from pdf', 
        'select pages from pdf', 'pull pages from pdf'
    ],
    'organize-pdf': [
        'organize', 'reorder pages', 'arrange pages', 'organize pdf', 
        'reorder pdf pages', 'rearrange pdf pages'
    ],
    'pdf-forms': [
        'fill form', 'pdf form', 'form fields', 'fill pdf form', 
        'interactive form', 'add form fields'
    ],
    'repair-pdf': [
        'repair', 'fix pdf', 'restore pdf', 'repair corrupted pdf', 
        'fix broken pdf', 'restore damaged pdf'
    ],
    'unknown': [
        'hello', 'hi', 'hey', 'canvas info', 'help', 'clear', 'wipe', 
        'how to use', 'test', 'blah', 'whats up', 'what can you do', 
        'who are you', 'how does this work', 'good morning', 'good afternoon', 
        'what tools do you have', 'explain the canvas', 'clear everything', 'reset canvas'
    ]
}

PREFIXES = [
    "", "please", "can you", "could you", "i want to", "i need to", "would you",
    "help me to", "go ahead and", "run", "execute", "trigger", "start", "begin",
    "process", "apply", "perform", "do", "let's", "make sure to", "kindly",
    "would you mind", "is it possible to", "could you please", "i would like to",
    "i'm looking to", "try to", "will you", "please try to", "please go ahead and",
    "force", "automatically", "instantly", "quickly", "safely", "securely",
    "system", "agent", "command", "action", "can we", "could we", "i'd like to",
    "i shall", "now let's", "please do a", "let us", "i require to", "assist me to",
    "help with", "can you access my uploaded files and please",
    "i have a couple of documents from my client and i want to",
    "my manager asked me if it is possible to",
    "for my school project i need to quickly",
    "i am preparing a report for the meeting and need to",
    "to clean up my digital workspace i would like to",
    "could you please check the node network and help me to",
    "as part of my daily document management pipeline i must",
    "i uploaded some files just now and i need you to",
    "i'm trying to figure out how to",
    "since the current file layout is messy let's try to",
    "without causing any format issues please go ahead and",
    "in order to share these files with my team i need to",
    "i demand to", "i urge you to", "make a request to", "do not hesitate to",
    "it is necessary to", "let's attempt to", "be sure to", "please proceed to",
    "i want you to", "instantly trigger", "begin processing to", "take action and",
    "help by", "i am obliged to", "we should start to", "go and", "quickly run",
    "securely process and", "can you help me by trying to", "i am hoping to",
    "i am planning to", "please run the following action to", "be so kind as to",
    "i have uploaded the files so now please", "without delay please"
]

SUFFIXES = [
    "", "now", "please", "immediately", "right away", "quickly", "asap",
    "for me", "for me please", "this file", "this document", "these files",
    "the document", "the file", "my file", "my document", "my pdf", "the pdf",
    "the image", "my image", "on this", "on this file", "on this document",
    "for this file", "efficiently", "safely", "securely", "with high quality",
    "to finish", "to complete", "right now", "without delay", "for the workspace",
    "on the canvas", "instantly", "swiftly", "rapidly", "straight away",
    "one time", "at once", "this instant", "with no wait", "promptly",
    "as planned", "accordingly", "for my project", "in the background",
    "right here", "on my screen", "directly",
    "because the file size is too big to send over email",
    "so that we can present it to the stakeholders tomorrow morning",
    "right now before the deadline at the end of the day",
    "on all the selected document nodes in the workspace grid",
    "without losing any text formatting or formatting styles",
    "to make sure everything is compliant with our company security policy",
    "because my boss requested to have this done as soon as possible",
    "and then output the result as a new node on the canvas layout",
    "to avoid any prospective errors or layout issues in the future",
    "so i can download the final processed file to my computer",
    "on the files that are currently active in my selection pool",
    "as a final step of our document processing pipeline",
    "without any complications", "with zero layout shifts", "directly from the browser",
    "using the client-side engine", "safely and securely", "without uploading to external servers",
    "using the offline web assembly tools", "so i can share it with my team",
    "with maximum compression standard", "retaining all structure and margins",
    "for professional delivery", "to clean up my desktop", "on the selected canvas nodes",
    "so that it looks professional", "right now please", "with no further delay",
    "without any warning", "to avoid layout jank", "for final submission", "straight away please"
]

SPECIFIC_PARAMETERS = [
    "the first two",
    "only the first two pages of that",
    "the last three",
    "only the first page of",
    "all except the first two",
    "the first half of",
    "the second half of",
    "only pages 1 to 5 of",
    "pages 1, 3, and 5 of",
    "the even pages of",
    "the odd pages of",
    "the top two active",
    "the bottom two active",
    "the leftmost two",
    "the rightmost two",
    "the first two output files of",
    "the last two compressed",
    "the first two matching",
    "the initial two nodes of",
    "the first two uploaded",
    "only page number 2 of",
    "the first three"
]

CATEGORIES = [
    'short_synonyms',
    'long_conversational',
    'systematic_typos',
    'anaphora_pronouns',
    'interrogative_questions',
    'conditional_constraints',
    'polite_greetings',
    'professional_jargon',
    'casual_slang',
    'chained_pipelines',
    'formatting_conversions',
    'interactive_forms',
    'comparative_diffs',
    'summarization_qa',
    'paragraph_instructions',
    'general_parameters_1',
    'general_parameters_2',
    'general_parameters_3',
    'general_parameters_4'
]

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
    tokens = list(words)
    for i in range(len(words) - 1):
        tokens.append(f"{words[i]} {words[i+1]}")
    return tokens

def get_systematic_typos(word):
    if len(word) <= 3:
        return [word]
    typos = set([word])
    for i in range(len(word)):
        typos.add(word[:i] + word[i+1:])
    for i in range(len(word)):
        typos.add(word[:i] + word[i] + word[i:])
    for i in range(len(word) - 1):
        typos.add(word[:i] + word[i+1] + word[i] + word[i+2:])
    replacements = {'a': 'e', 'e': 'u', 'i': 'o', 'o': 'u', 'u': 'o'}
    for i, char in enumerate(word):
        if char in replacements:
            typos.add(word[:i] + replacements[char] + word[i+1:])
    return sorted(list(typos))

def inject_noise(sentence, rng, heavy=False):
    words = sentence.split()
    drop_chance = 0.15 if heavy else 0.08
    if rng.random() < drop_chance:
        words = [w for w in words if w.lower() not in ['to', 'a', 'an', 'the', 'please', 'my', 'i', 'you']]
    new_words = []
    typo_chance = 0.35 if heavy else 0.18
    for word in words:
        if len(word) > 3 and rng.random() < typo_chance:
            typos = get_systematic_typos(word)
            word = rng.choice(typos)
        if rng.random() < (0.10 if heavy else 0.05):
            new_words.append(word)
        new_words.append(word)
    return " ".join(new_words)

def generate_unknown_samples(count, category_name, seed_val):
    rng = random.Random(seed_val + hash(category_name) + 42)
    
    greetings = [
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening", 
        "whats up", "how are you", "who are you", "what is your name",
        "what can you do", "help me", "how to use this", "explain the canvas"
    ]
    noise = ["asdfasdf", "qwerty", "ghjkl", "nonsense text", "12345", "test test test", "invalid command"]
    layout = ["rearrange nodes", "align active cards", "wipe canvas grid", "optimize columns", "clean layout"]
    negations = ["do not", "don't", "never", "please do not", "please don't", "stop trying to", "refuse to"]
    negated_verbs = ["merge", "compress", "split", "crop", "protect", "translate", "unlock", "rotate"]
    admin = ["log out", "delete user account", "reset application storage", "change settings"]

    unique_set = set()
    
    for _ in range(50000):
        if 'parameters' in category_name:
            verb = rng.choice(negated_verbs)
            prefix = rng.choice(negations)
            unique_set.add(f"{prefix} {verb}")
        elif category_name == 'short_synonyms':
            g = rng.choice(greetings)
            extra = rng.choice(["", "there", "please", "now", "buddy", "my friend"])
            unique_set.add(" ".join(f"{g} {extra}".split()))
        elif category_name == 'systematic_typos':
            g = rng.choice(greetings)
            noisy_greet = inject_noise(g, rng, heavy=True)
            unique_set.add(noisy_greet)
        elif category_name == 'polite_greetings':
            unique_set.add(rng.choice(greetings) + " " + rng.choice(greetings))
        else:
            source = rng.choice([greetings, noise, layout, admin])
            unique_set.add(rng.choice(source) + " " + rng.choice(noise))
            
        if len(unique_set) >= count:
            break
            
    sentences_list = list(unique_set)
    if len(sentences_list) < count:
        while len(sentences_list) < count:
            sentences_list.append(rng.choice(sentences_list) if sentences_list else "hello")
            
    rng.shuffle(sentences_list)
    return sentences_list[:count]

def generate_dataset_with_seed(seed_val, category_name, count=5000):
    data = []
    labels = []
    
    for label, syns in SYNONYMS.items():
        if label == 'unknown':
            continue
            
        class_sentences = set()
        rng = random.Random(seed_val + hash(label) + hash(category_name))
        
        run_prefixes = [""]
        run_suffixes = [""]
        heavy_noise = False
        
        if category_name == 'short_synonyms':
            run_prefixes = ["", "please", "can you", "could you", "would you", "let's", "kindly", "go ahead and"]
            run_suffixes = ["", "now", "please", "immediately", "right away", "quickly", "asap", "for me"]
        elif category_name == 'long_conversational':
            run_prefixes = [p for p in PREFIXES if len(p.split()) >= 4]
            run_suffixes = [s for s in SUFFIXES if len(s.split()) >= 4]
        elif category_name == 'systematic_typos':
            run_prefixes = PREFIXES[:35]
            run_suffixes = SUFFIXES[:35]
            heavy_noise = True
        elif category_name == 'anaphora_pronouns':
            run_prefixes = [
                "take it and", "do it to", "apply this on those", "use the output and",
                "grab the merged file and", "select those files and", "take the result and"
            ]
            run_suffixes = [
                "on it", "on them", "on those", "for the output file", "on the generated node"
            ]
        elif category_name == 'interrogative_questions':
            run_prefixes = [
                "how do i", "is there a way to", "where do i go to", "how do we",
                "can you show me how to", "could you tell me how to", "how can we"
            ]
            run_suffixes = ["easily", "properly", "locally", "in docforge", "offline"]
        elif category_name == 'conditional_constraints':
            run_prefixes = ["", "please", "can you", "could you", "make sure to"]
            run_suffixes = [
                "only pages 1 to 5", "with 60% quality", "watermark with text 'DRAFT'",
                "using password '1234'", "with high resolution", "retaining all structures"
            ]
        elif category_name == 'polite_greetings':
            run_prefixes = [
                "good morning please", "good afternoon kindly", "hope you are well can you",
                "thank you so much now please", "if you don't mind kindly"
            ]
            run_suffixes = ["thank you", "thanks", "have a nice day", "much appreciated", "cheers"]
        elif category_name == 'code_switching_banglish':
            run_prefixes = ["apni ki", "amake ektu", "please ektu", "tumi ki", "eta ektu", "eta", ""]
            run_suffixes = ["koren", "korben", "korte hobe", "kore din", "chaitechi", "korte chai", "chai", "koren please"]
        elif category_name == 'professional_jargon':
            run_prefixes = ["PII compliance audit requires us to", "under GDPR regulations please", "for archival long term storage make sure to"]
            run_suffixes = ["retaining structure tags", "for legal validation compliance", "matching enterprise specs"]
        elif category_name == 'casual_slang':
            run_prefixes = ["go ahead and smash", "dump", "throw", "let's do some magic to", "kick off"]
            run_suffixes = ["asap", "like right now", "right away buddy", "on the fly"]
        elif category_name == 'chained_pipelines':
            run_prefixes = ["first merge then", "after converting you should", "once unzipped go and"]
            run_suffixes = ["and then finally download it", "and afterwards archive it"]
        elif category_name == 'formatting_conversions':
            run_prefixes = ["reformat to", "save target as", "export format to"]
            run_suffixes = ["extension", "standard layout representation"]
        elif category_name == 'interactive_forms':
            run_prefixes = ["fill interactive", "populate fields of", "set checkbox entries inside"]
            run_suffixes = ["document inputs", "target page constraints"]
        elif category_name == 'comparative_diffs':
            run_prefixes = ["inspect differences between", "perform document diff on", "find structural changes in"]
            run_suffixes = ["visual layout sheets", "source node files"]
        elif category_name == 'summarization_qa':
            run_prefixes = ["explain the contents of", "generate text summary for", "give a quick overview of"]
            run_suffixes = ["text paragraphs", "document details"]
        elif category_name == 'paragraph_instructions':
            run_prefixes = ["i have uploaded my files and i need a report. could you please check the node network and help me to"]
            run_suffixes = ["because my boss requested to have this done as soon as possible before the end of the day"]
        elif 'general_parameters' in category_name:
            run_prefixes = ["", "please", "can you", "could you", "only"]
            run_suffixes = SPECIFIC_PARAMETERS
            
        combinations_pool = []
        for syn in syns:
            for prefix in run_prefixes:
                for suffix in run_suffixes:
                    sentence = " ".join(f"{prefix} {syn} {suffix}".split())
                    combinations_pool.append(sentence)
                    combinations_pool.append(sentence.capitalize())
                    
        rng.shuffle(combinations_pool)
        
        for raw_sentence in combinations_pool:
            if len(class_sentences) >= count:
                break
            noisy_sentence = inject_noise(raw_sentence, rng, heavy=heavy_noise)
            class_sentences.add(noisy_sentence)
            
        class_list = sorted(list(class_sentences))
        if len(class_list) < count:
            while len(class_list) < count:
                class_list.append(rng.choice(class_list) if class_list else "hello")
        else:
            class_list = rng.sample(class_list, count)
            
        data.extend(class_list)
        labels.extend([label] * count)
        
    unknown_samples = generate_unknown_samples(count, category_name, seed_val)
    data.extend(unknown_samples)
    labels.extend(['unknown'] * count)
    
    return data, labels

# TF-IDF Model
class TfidfModel:
    def __init__(self, vocab_dict):
        self.vocabulary = vocab_dict
        self.idf = []
        
    def fit_idf(self, docs):
        N = len(docs)
        df_counts = {}
        for d in docs:
            tokens = tokenize_ngrams(d)
            unique_tokens = set(tokens)
            for t in unique_tokens:
                if t in self.vocabulary:
                    df_counts[t] = df_counts.get(t, 0) + 1
        
        self.idf = []
        for t in sorted(self.vocabulary.keys(), key=lambda x: self.vocabulary[x]):
            df_t = df_counts.get(t, 0)
            val = math.log((1 + N) / (1 + df_t)) + 1
            self.idf.append(val)
            
    def transform(self, docs):
        vectors = []
        for d in docs:
            tokens = tokenize_ngrams(d)
            tf = {}
            for t in tokens:
                if t in self.vocabulary:
                    tf[t] = tf.get(t, 0) + 1
            
            vector_dict = {}
            squared_sum = 0.0
            for t, tf_val in tf.items():
                feat_idx = self.vocabulary[t]
                val = tf_val * self.idf[feat_idx]
                vector_dict[feat_idx] = val
                squared_sum += val ** 2
                
            if squared_sum > 0:
                l2_norm = math.sqrt(squared_sum)
                vectors.append([(idx, val / l2_norm) for idx, val in vector_dict.items()])
            else:
                vectors.append([])
        return vectors

# PyTorch Multi-Class Softmax Classifier
class PyTorchLogisticRegression(nn.Module):
    def __init__(self, input_dim, output_dim):
        super(PyTorchLogisticRegression, self).__init__()
        self.linear = nn.Linear(input_dim, output_dim)
        
    def forward(self, x):
        return self.linear(x)

def save_pytorch_checkpoint(model, classes, vocabulary, vectorizer, output_path, threshold=0.08):
    coefs = model.linear.weight.detach().cpu().numpy().tolist()
    intercepts = model.linear.bias.detach().cpu().numpy().tolist()
    
    active_indices = set()
    for class_w in coefs:
        for idx, w in enumerate(class_w):
            if abs(w) > threshold:
                active_indices.add(idx)
                
    active_indices = sorted(list(active_indices))
    
    new_vocab = {}
    new_idf = []
    old_to_new_idx = {}
    idx_to_term = {v: k for k, v in vocabulary.items()}
    
    for new_idx, old_idx in enumerate(active_indices):
        term = idx_to_term[old_idx]
        new_vocab[term] = new_idx
        new_idf.append(round(vectorizer.idf[old_idx], 4))
        old_to_new_idx[old_idx] = new_idx
        
    coefs_sparse = []
    for class_w in coefs:
        class_dict = {}
        for old_idx, w in enumerate(class_w):
            if abs(w) > threshold:
                new_idx = old_to_new_idx[old_idx]
                class_dict[str(new_idx)] = round(w, 4)
        coefs_sparse.append(class_dict)
        
    weights_data = {
        'vocabulary': new_vocab,
        'idf': new_idf,
        'coef': coefs_sparse,
        'intercept': [round(b, 4) for b in intercepts],
        'classes': classes
    }
    
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(weights_data, f, ensure_ascii=False, indent=2)
        
    print(f"Final Weights Checkpoint saved: {len(active_indices)} active features retained in {output_path.name}.", flush=True)

# Optimized GPU index scatter batch creation
def make_dense_batch_gpu(sparse_batch, F, device):
    rows = []
    cols = []
    vals = []
    for i, doc in enumerate(sparse_batch):
        for feat_idx, val in doc:
            rows.append(i)
            cols.append(feat_idx)
            vals.append(val)
            
    r = torch.tensor(rows, dtype=torch.long, device=device)
    c = torch.tensor(cols, dtype=torch.long, device=device)
    v = torch.tensor(vals, dtype=torch.float32, device=device)
    
    batch_tensor = torch.zeros((len(sparse_batch), F), dtype=torch.float32, device=device)
    batch_tensor[r, c] = v
    return batch_tensor

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"CUDA Available: {torch.cuda.is_available()}", flush=True)
    print(f"Using device: {device}", flush=True)
    
    output_path = Path(__file__).resolve().parent.parent / 'src' / 'utils' / 'classifier_weights.json'
    
    # ── STEP 1: Build vocab from BOTH curated data and generated synonyms ──
    print("Pre-building Global Vocabulary from curated + generated sources...", flush=True)
    global_terms = set()
    
    # Curated data vocabulary (primary)
    for label, phrases in TRAINING_DATA.items():
        for phrase in phrases:
            for term in tokenize_ngrams(phrase):
                global_terms.add(term)
                for typo in get_systematic_typos(term):
                    global_terms.add(typo)

    # Synonyms-based vocabulary (supplementary)
    for label, syns in SYNONYMS.items():
        for syn in syns:
            for term in tokenize_ngrams(syn):
                global_terms.add(term)
                for typo in get_systematic_typos(term):
                    global_terms.add(typo)
            for w in syn.split():
                for typo in get_systematic_typos(w):
                    global_terms.add(stem(typo))
                    
    for p in PREFIXES:
        if p:
            for term in tokenize_ngrams(p):
                global_terms.add(term)
                for typo in get_systematic_typos(term):
                    global_terms.add(typo)
                    
    for s in SUFFIXES:
        if s:
            for term in tokenize_ngrams(s):
                global_terms.add(term)
                for typo in get_systematic_typos(term):
                    global_terms.add(typo)
                    
    for param in SPECIFIC_PARAMETERS:
        for term in tokenize_ngrams(param):
            global_terms.add(term)
            for typo in get_systematic_typos(term):
                global_terms.add(typo)
                
    global_vocab = sorted(list(global_terms))
    vocabulary = {token: idx for idx, token in enumerate(global_vocab)}
    F = len(vocabulary)
    print(f"Global vocabulary size: {F} terms", flush=True)
    
    # ── STEP 2: Classes from the union of both sources ──
    all_labels = set(SYNONYMS.keys()) | set(TRAINING_DATA.keys())
    classes = sorted(list(all_labels))
    num_classes = len(classes)
    class_to_idx = {c: idx for idx, c in enumerate(classes)}
    
    model = PyTorchLogisticRegression(F, num_classes).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.005)
    
    vectorizer = TfidfModel(vocabulary)
    
    X_sparse = []
    y_indices = []
    
    # ── STEP 3: Add curated training data first (high quality, real phrases) ──
    print("\n--- Loading Curated Training Dataset (Phase 1/2) ---", flush=True)
    curated_data = []
    curated_labels = []
    for label, phrases in TRAINING_DATA.items():
        if label not in class_to_idx:
            continue
        for phrase in phrases:
            curated_data.append(phrase)
            curated_labels.append(label)
    
    # Repeat curated data 5x to give it strong weight
    for _ in range(5):
        curated_data_ext = curated_data[:]
        curated_labels_ext = curated_labels[:]
        combined = list(zip(curated_data_ext, curated_labels_ext))
        random.shuffle(combined)
        curated_data_ext, curated_labels_ext = zip(*combined)
        
        # Fit IDF on first pass
        if not vectorizer.idf:
            print("Fitting TF-IDF on curated dataset...", flush=True)
            vectorizer.fit_idf(list(curated_data_ext))
        
        X_sparse.extend(vectorizer.transform(list(curated_data_ext)))
        y_indices.extend([class_to_idx[l] for l in curated_labels_ext])
    
    print(f"Curated data loaded: {len(curated_data)} unique phrases × 5 = {len(X_sparse)} samples", flush=True)
    
    # ── STEP 4: Add generated data (diversity/robustness) ──
    print("\n--- Constructing Generated Joint Dataset (Phase 2/2) ---", flush=True)
    for run_idx, category_name in enumerate(CATEGORIES):
        print(f"Generating category {run_idx+1}/{len(CATEGORIES)}: [{category_name}]...", flush=True)
        data_cat, labels_cat = generate_dataset_with_seed(5000 + run_idx * 1400, category_name, count=5000)
        
        print("Transforming and appending to global matrix...", flush=True)
        X_sparse.extend(vectorizer.transform(data_cat))
        # Map generated labels to indices (keep only known classes)
        for l in labels_cat:
            if l in class_to_idx:
                y_indices.append(class_to_idx[l])
            else:
                y_indices.append(class_to_idx.get('unknown', 0))
        
    N = len(X_sparse)
    print(f"\nFull Dataset complete: {N} samples total. Shuffling...", flush=True)
    indices = list(range(N))
    random.shuffle(indices)
    
    batch_size = 1024
    print("Training PyTorch model jointly on all categories...", flush=True)
    
    global_start_time = time.time()
    model.train()
    
    for epoch in range(3):
        epoch_loss = 0.0
        t0 = time.time()
        
        for batch_start in range(0, N, batch_size):
            batch_idx_list = indices[batch_start:batch_start+batch_size]
            batch_sparse = [X_sparse[i] for i in batch_idx_list]
            batch_labels = [y_indices[i] for i in batch_idx_list]
            
            X_batch = make_dense_batch_gpu(batch_sparse, F, device)
            y_batch = torch.tensor(batch_labels, dtype=torch.long, device=device)
            
            optimizer.zero_grad()
            outputs = model(X_batch)
            loss = criterion(outputs, y_batch)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item() * len(batch_idx_list)
            
        print(f"Epoch {epoch+1}/3 - Avg Loss: {epoch_loss / N:.4f} (took {time.time() - t0:.2f}s)", flush=True)
        save_pytorch_checkpoint(model, classes, vocabulary, vectorizer, output_path, threshold=0.08)
        
    global_duration = time.time() - global_start_time
    print(f"\nJoint PyTorch GPU/CPU Training completed in {global_duration:.2f} seconds!", flush=True)

if __name__ == '__main__':
    main()
