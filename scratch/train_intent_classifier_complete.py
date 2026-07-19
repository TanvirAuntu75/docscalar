import re
import json
import math
import sys
import random
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim

# Set random seeds for reproducibility
random.seed(42)
torch.manual_seed(42)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(42)

# 1. Action Verbs Registry
SYNONYMS = {
    'merge-pdf': ['merge', 'combine', 'join', 'stitch', 'bundle', 'concatenate', 'unite', 'fuse', 'aggregate', 'merge pdf', 'combine pdf', 'merged pdf', 'needs to be merged', 'should be merged', 'must be merged'],
    'split-pdf': ['split', 'cut', 'divide', 'separate', 'extract pages', 'half', 'slice', 'split instead', 'wait let\'s split'],
    'compress-pdf': ['compress', 'shrink', 'reduce size', 'minimize', 'smaller', 'make smaller', 'downsize', 'compress pdf file', 'reduce pdf size', 'compress the pdf', 'shrink the pdf', 'make pdf smaller', 'make it really small', 'really small', 'small', 'পিডিএফ সাইজ কমানো', 'সাইজ কমানো'],
    'ocr-pdf': ['ocr', 'recognize', 'searchable', 'read text', 'extract text', 'make searchable'],
    'rotate-pdf': ['rotate', 'turn', 'spin', 'landscape', 'portrait', 'change orientation', 'flip', 'rotate pdf', 'rotate the pdf', 'turn the pdf', 'rotate pdf pages', 'needs to be rotated', 'should be rotated', 'must be rotated'],
    'protect-pdf': ['protect', 'lock', 'encrypt', 'add password', 'restrict', 'secure'],
    'unlock-pdf': ['unlock', 'decrypt', 'remove password', 'bypass lock', 'remove lock'],
    'docx-to-pdf': ['word to pdf', 'docx to pdf', 'convert docx', 'convert word', 'word file to pdf'],
    'excel-to-pdf': ['excel to pdf', 'xlsx to pdf', 'csv to pdf', 'sheet to pdf', 'spreadsheet to pdf'],
    'powerpoint-to-pdf': ['powerpoint to pdf', 'ppt to pdf', 'pptx to pdf', 'slides to pdf', 'slideshow to pdf'],
    'html-to-pdf': ['html to pdf', 'convert html', 'website to pdf', 'web page to pdf', 'save website as pdf'],
    'pdf-to-word': ['pdf to word', 'pdf to docx', 'to word', 'to docx', 'convert pdf to word'],
    'pdf-to-excel': ['pdf to excel', 'pdf to sheet', 'to excel', 'to xlsx', 'pdf to xlsx', 'convert pdf to excel'],
    'pdf-to-powerpoint': ['pdf to powerpoint', 'pdf to ppt', 'to powerpoint', 'to ppt', 'convert pdf to powerpoint'],
    'image-converter': ['convert image format', 'png to jpg', 'jpeg to webp', 'change format', 'image format', 'image converter'],
    'image-to-pdf': ['images to pdf', 'photos to pdf', 'pictures to pdf', 'image to pdf', 'jpg to pdf', 'png to pdf'],
    'image-compressor': ['compress image', 'shrink image', 'reduce image size', 'compress photo', 'make image smaller', 'compress jpg', 'compress png', 'reduce photo size', 'optimize image', 'make photo smaller', 'image compression', 'photo compression', 'compress picture'],
    'image-resizer': ['resize image', 'scale image', 'change dimensions', 'resize photo', 'scale photo', 'change image size'],
    'unzip-file': ['unzip', 'extract zip', 'decompress', 'expand zip', 'unzip archive', 'extract zip file'],
    'add-watermark': ['watermark', 'stamp', 'add stamp', 'add watermark', 'watermark pdf', 'add watermark to pdf'],
    'add-page-numbers': ['page number', 'paginate', 'add page numbers', 'paginate pdf', 'insert page numbers'],
    'remove-pages': ['remove page', 'delete page', 'exclude page', 'remove pdf pages', 'delete page from pdf', 'remove specific pages', 'delete pages from document', 'strip pages', 'cut pages from pdf'],
    'crop-pdf': ['crop', 'crop pdf', 'crop document', 'cut margins', 'trim pdf', 'trim page margins', 'adjust margins'],
    'edit-pdf': ['edit', 'edit pdf', 'modify pdf', 'annotate pdf', 'draw on pdf', 'write on pdf', 'pdf editor'],
    'qr-generator': ['qr', 'barcode', 'generate qr', 'create qr code', 'make qr code', 'barcode generator', 'qr code generator'],
    'redact-pdf': ['redact', 'blackout', 'hide sensitive info', 'redact pdf', 'black out text', 'censor pdf'],
    'compare-pdf': ['compare', 'diff pdf', 'compare documents', 'compare pdfs', 'pdf comparison', 'compare two pdfs'],
    'pdf-to-pdfa': ['pdf to pdfa', 'archive pdf', 'pdf/a', 'convert pdf to pdfa', 'make pdfa compliant'],
    'url-to-pdf': ['url to pdf', 'convert website', 'website to pdf', 'convert webpage to pdf', 'link to pdf'],
    'pdf-to-image': ['pdf to image', 'pdf to images', 'pdf to jpg', 'pdf to png', 'convert pdf to image'],
    'ai-translator': ['translate', 'translate file', 'language translation', 'translate pdf', 'translate document'],
    'text-to-pdf': ['text to pdf', 'txt to pdf', 'convert text', 'txt to pdf converter', 'convert text file to pdf'],
    'sign-pdf': ['sign', 'signature', 'sign document', 'sign pdf', 'add signature', 'draw signature', 'e-sign pdf'],
    'extract-pages': ['extract page', 'select page', 'extract pages from pdf', 'select pages from pdf', 'pull pages from pdf'],
    'organize-pdf': ['organize', 'reorder pages', 'arrange pages', 'organize pdf', 'reorder pdf pages', 'rearrange pdf pages'],
    'pdf-forms': ['fill form', 'pdf form', 'form fields', 'fill pdf form', 'interactive form', 'add form fields'],
    'repair-pdf': ['repair', 'fix pdf', 'restore pdf', 'repair corrupted pdf', 'fix broken pdf', 'restore damaged pdf'],
    'scan-to-pdf': ['scan', 'scanner', 'scan to pdf', 'scan document', 'webcam scan', 'camera scan', 'scan pdf', 'capture document', 'scan to document'],
    'conversion-pipeline': ['pipeline', 'conversion pipeline', 'workflow', 'batch process', 'pipeline queue', 'conversion workflow', 'sequential process', 'convert batch', 'batch conversion workflow'],
    'resume-builder': ['resume', 'cv', 'resume builder', 'cv builder', 'create resume', 'make cv', 'write resume', 'cv templates', 'templates resume', 'build cv', 'create cv', 'make resume', 'build resume'],
    'unknown': [
        # Greetings & help
        'hello', 'hi', 'hey', 'canvas info', 'help', 'how to use', 'whats up',
        'good morning', 'good evening', 'who are you', 'what can you do',
        'what is this', 'show help', 'tell me what tools are available',
        # Canvas UI control commands
        'clear', 'wipe', 'reset canvas', 'clear the canvas', 'wipe the grid', 'wipe canvas',
        'zoom in', 'zoom out', 'zoom to fit', 'zoom to selection', 'fit to screen',
        'scroll down', 'scroll up', 'scroll left', 'scroll right',
        'select all', 'select all nodes', 'deselect all', 'deselect', 'unselect all',
        'delete this node', 'remove this card', 'remove node', 'delete card',
        'delete the node', 'remove the node', 'delete this card', 'remove the card',
        'delete node from canvas', 'remove card from canvas', 'delete this from canvas',
        'download my file', 'download result', 'download the output', 'save file',
        'upload a file', 'upload file', 'add file', 'drop a file',
        'show settings', 'open settings', 'go to settings', 'change theme',
        'toggle dark mode', 'toggle light mode', 'switch theme',
        # Undo/redo actions
        'undo', 'redo', 'undo command', 'redo last', 'undo the merge', 'redo the split',
        'please undo', 'please redo', 'cancel last action', 'go back', 'revert',
        'revert last merge', 'do it again', 'undo that', 'redo that',
        'undo last step', 'redo last step', 'undo the rotation', 'undo the compress',
        'undo the split', 'undo the conversion', 'undo the crop', 'redo the merge',
        # Negative intents (CRITICAL: these must NOT map to any tool)
        "don't merge", "do not merge", "don't compress", "do not compress",
        "don't rotate", "do not rotate", "don't split", "do not split",
        "don't convert", "do not convert", "stop the merge", "stop the compression",
        "cancel the merge", "cancel the rotation", "cancel the split", "abort merge",
        "stop processing", "halt the operation", "never compress this", "don't do that",
        "do not do that", "no not that", "wait don't merge yet", "hold on don't compress",
        "actually don't convert", "skip the merge", "skip this step",
        # Informational / meta
        'what is this tool', 'explain this', 'how does this work', 'tell me more',
        'describe the canvas', 'what is docforge', 'who built this'
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

# 2. Probability-based Dynamic Target Builders
ORDINALS = [
    '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
    '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th', '19th', '20th',
    'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
    'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'
]
RELATIONS = ['to', 'with', 'and', 'and also', ',']

def build_probabilistic_target(rng):
    """Generates a DIT (Document Index Targeting) target clause based on probability rules."""
    p = rng.random()
    if p < 0.25:
        # Single ordinal
        return rng.choice(ORDINALS) + " document"
    elif p < 0.50:
        # Ordinal range or pair (e.g. "1st to 3rd", "2nd and 4th")
        return f"{rng.choice(ORDINALS)} {rng.choice(RELATIONS)} {rng.choice(ORDINALS)}"
    elif p < 0.70:
        # Exclusion (e.g. "all except the 2nd", "everything but 4th")
        return f"all except the {rng.choice(ORDINALS)}"
    elif p < 0.85:
        # Output chain target (e.g. "the output", "all outputs", "the results")
        return rng.choice(["the output", "all outputs", "the results", "the merged output"])
    else:
        # Complex multi-group (e.g. "1st and 3rd and also the 5th")
        return f"{rng.choice(ORDINALS)} and {rng.choice(ORDINALS)} and also {rng.choice(ORDINALS)}"

def build_nested_participle(rng):
    """Generates a nested past-participle dependency target (e.g. 'the 4th and 3rd merged')."""
    targets = f"{rng.choice(ORDINALS)} and {rng.choice(ORDINALS)}"
    verb_ed = rng.choice(['merged', 'combined', 'joined', 'shrunk', 'compressed', 'rotated', 'converted'])
    return f"the {targets} {verb_ed}"

# Stemming and tokenization functions (identical to JS behavior)
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

def inject_typo_noise(sentence, rng):
    words = sentence.split()
    new_words = []
    for word in words:
        if len(word) > 3 and rng.random() < 0.15:
            typos = get_systematic_typos(word)
            word = rng.choice(typos)
        new_words.append(word)
    return " ".join(new_words)

# 3. Dataset Generator
HALLUCINATIONS = [
    "the weather is clear today", "yesterday we had some connection issues", "i think the layout looks clean",
    "my manager is waiting on this final dashboard update", "make sure the formatting complies with standard rules",
    "the pdf file size limit should be respected", "we had a system warning on line 42", "please check the active nodes pool",
    "the output is produced in the wrong color scheme", "we need to secure the files for compliance tomorrow",
    "i am testing the new user interface features", "let's verify the layout grid coordinate offsets",
    "the client-side engine runs completely offline", "make a report about our document stitch progress",
    "without any loss of vector graphics and fonts", "we need to present this to the client as soon as possible",
    "to clean up the temporary database records", "the storage quota on the server is almost full"
]

# Question-form templates (GAP 2)
QUESTION_TEMPLATES = [
    "can you tell me how to {syn} these?",
    "is there a way to {syn} this file?",
    "how do i {syn} my document?",
    "what is the best way to {syn} this?",
    "do you know how to {syn} pdfs?",
    "could you explain how to {syn} these files?",
    "is it possible to {syn} this document?",
    "any idea how to {syn} this?",
    "i'm wondering if i can {syn} this file?",
    "would it be okay to {syn} this pdf?"
]

# Passive-voice templates (GAP 3) — explicitly document/pdf-scoped to prevent ambiguity
PASSIVE_TEMPLATES = [
    "this pdf needs to be {syn_ed}",
    "the pdf should be {syn_ed}",
    "my pdf file needs to be {syn_ed}",
    "these pdf documents need to be {syn_ed}",
    "this document should be {syn_ed} before sending",
    "the document has to be {syn_ed}",
    "can this pdf be {syn_ed}?",
    "this pdf must be {syn_ed}",
    "the file needs to be {syn_ed} now",
    "my document needs to be {syn_ed} right away"
]

# SMS/abbreviation and broken-English forms (GAPS 5 & 6)
INFORMAL_FORMS = [
    "pls {syn}", "plz {syn}", "pls {syn} this", "plz {syn} this file",
    "need 2 {syn} this", "wanna {syn} it", "gotta {syn} this pdf",
    "make it more {syn_adj} plz", "help me {syn}", "quick {syn} pls",
    "{syn} asap", "{syn} urgently", "{syn} it now thx",
    "yo {syn} this for me", "hey can u {syn} this"
]

PAST_TENSE_MAP = {
    'merge': 'merged', 'combine': 'combined', 'join': 'joined', 'stitch': 'stitched',
    'split': 'split', 'cut': 'cut', 'divide': 'divided', 'separate': 'separated',
    'compress': 'compressed', 'shrink': 'shrunk', 'minimize': 'minimized',
    'rotate': 'rotated', 'turn': 'turned', 'flip': 'flipped',
    'protect': 'protected', 'lock': 'locked', 'encrypt': 'encrypted',
    'unlock': 'unlocked', 'decrypt': 'decrypted',
    'translate': 'translated', 'convert': 'converted', 'ocr': 'ocr-processed',
    'sign': 'signed', 'watermark': 'watermarked', 'paginate': 'paginated',
    'crop': 'cropped', 'edit': 'edited', 'redact': 'redacted',
    'extract': 'extracted', 'organize': 'organized', 'repair': 'repaired',
    'resize': 'resized', 'scale': 'scaled', 'compress image': 'compressed',
    'unzip': 'unzipped', 'compare': 'compared'
}

SYN_ADJ_MAP = {
    'compress': 'small', 'shrink': 'small', 'minimize': 'small',
    'merge': 'combined', 'join': 'joined', 'split': 'split',
    'rotate': 'rotated', 'translate': 'translated'
}

def generate_dataset_probabilistic(count_per_class=12000, seed_val=42):
    rng = random.Random(seed_val)
    data = []
    labels = []

    for label, syns in SYNONYMS.items():
        class_sentences = set()
        
        while len(class_sentences) < count_per_class:
            syn = rng.choice(syns)
            prefix = rng.choice(PREFIXES)
            suffix = rng.choice(SUFFIXES)
            
            p = rng.random()
            if label == 'unknown':
                # Unknown class gets custom greetings, undo/redo, canvas actions, and random gibberish
                if p < 0.20:
                    sentence = syn
                elif p < 0.50:
                    sentence = f"{prefix} {syn} {suffix}"
                elif p < 0.80:
                    sentence = f"{syn} {rng.choice(SUFFIXES)}"
                else:
                    # Pure hallucination chatter to make the model robust to non-action requests
                    sentence = rng.choice(HALLUCINATIONS)
            else:
                # Regular tools: generate Small, Medium, Large, Hallucinated + new variations
                p_len = rng.random()
                if p_len < 0.12:
                    # 1. SMALL PROMPT (1-4 words)
                    target = rng.choice(["them", "it", "file", "output", "results", "docs"])
                    sentence = f"{syn} {target}"
                    if rng.random() < 0.5:
                        sentence = f"please {sentence}"
                elif p_len < 0.35:
                    # 2. MEDIUM PROMPT (5-14 words)
                    target = build_probabilistic_target(rng)
                    sentence = f"{prefix} {syn} {target} {suffix}"
                elif p_len < 0.58:
                    # 3. LARGE PROMPT (15-35 words - criss-cross combinations)
                    target = build_probabilistic_target(rng)
                    nested = build_nested_participle(rng)
                    connector = rng.choice(["and also", "and then make the output", "and stitch it with"])
                    sentence = f"{prefix} {syn} {target} {connector} {nested} {suffix}"
                elif p_len < 0.68:
                    # 4. HALLUCINATED PROMPT (Injected conversational noise)
                    target = build_probabilistic_target(rng)
                    noise = rng.choice(HALLUCINATIONS)
                    placement = rng.random()
                    if placement < 0.33:
                        sentence = f"{noise} so please {syn} {target} {suffix}"
                    elif placement < 0.66:
                        sentence = f"{prefix} {syn} {target} because {noise} {suffix}"
                    else:
                        sentence = f"{prefix} {syn} {target} {suffix} and by the way {noise}"
                elif p_len < 0.76:
                    # 5. GAP 2 — QUESTION-FORM PROMPT
                    tmpl = rng.choice(QUESTION_TEMPLATES)
                    sentence = tmpl.format(syn=syn)
                elif p_len < 0.84:
                    # 6. GAP 3 — PASSIVE-VOICE PROMPT
                    syn_ed = PAST_TENSE_MAP.get(syn, syn + 'ed')
                    tmpl = rng.choice(PASSIVE_TEMPLATES)
                    sentence = tmpl.format(syn_ed=syn_ed)
                elif p_len < 0.91:
                    # 7. GAP 5+6 — SMS / INFORMAL / BROKEN-ENGLISH PROMPT
                    tmpl = rng.choice(INFORMAL_FORMS)
                    syn_adj = SYN_ADJ_MAP.get(syn, syn)
                    sentence = tmpl.format(syn=syn, syn_adj=syn_adj)
                else:
                    # 8. GAP 1 — MULTI-STEP CHAIN PROMPT (classifier picks primary intent)
                    secondary_tool_syns = [s for k, v in SYNONYMS.items() if k != label and k != 'unknown' for s in v]
                    secondary = rng.choice(secondary_tool_syns)
                    target = build_probabilistic_target(rng)
                    chain_template = rng.choice([
                        f"{prefix} {syn} {target} and then {secondary} the output {suffix}",
                        f"first {secondary} {target} then {syn} the result {suffix}",
                        f"{prefix} {syn} {target} {suffix} after that {secondary} it"
                    ])
                    sentence = chain_template

            # Clean whitespace
            sentence = " ".join(sentence.split()).strip()
            
            # Stochastic typo noise injection
            if rng.random() < 0.15:
                sentence = inject_typo_noise(sentence, rng)
                
            if sentence:
                class_sentences.add(sentence)
                class_sentences.add(sentence.capitalize())

        class_list = list(class_sentences)[:count_per_class]
        data.extend(class_list)
        labels.extend([label] * count_per_class)

    return data, labels

# TF-IDF Encoder
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

class PyTorchLogisticRegression(nn.Module):
    def __init__(self, input_dim, output_dim):
        super(PyTorchLogisticRegression, self).__init__()
        self.linear = nn.Linear(input_dim, output_dim)
        
    def forward(self, x):
        return self.linear(x)

def save_pytorch_weights(model, classes, vocabulary, vectorizer, output_path, top_k=350):
    """Exports model weights to a highly compacted JSON structure by keeping the top K features per class with force-protection."""
    coefs = model.linear.weight.detach().cpu().numpy().tolist()
    intercepts = model.linear.bias.detach().cpu().numpy().tolist()
    
    active_indices = set()
    num_classes = len(coefs)
    num_features = len(coefs[0])
    
    for c in range(num_classes):
        feat_weights = [(idx, abs(coefs[c][idx])) for idx in range(num_features)]
        feat_weights.sort(key=lambda x: x[1], reverse=True)
        for i in range(min(top_k, num_features)):
            active_indices.add(feat_weights[i][0])
            
    # Force-protect critical canvas control words and primary tool verbs
    protected_roots = ['undo', 'redo', 'clear', 'wipe', 'reset', 'rotate', 'merge', 'split', 'compress', 'shrink']
    for term, idx in vocabulary.items():
        parts = term.lower().split()
        if any(root in parts or stem(root) in [stem(p) for p in parts] for root in protected_roots):
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
        for old_idx in active_indices:
            w = class_w[old_idx]
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
        
    print(f"\nWeights file saved to {output_path.name} ({len(active_indices)} active features retained).", flush=True)

# 4. Verification Test Cases
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
    # New categories validation cases
    ("scan this document with webcam", "scan-to-pdf"),
    ("trigger a scanner to scan document to pdf", "scan-to-pdf"),
    ("execute batch conversion workflow pipeline", "conversion-pipeline"),
    ("sequential pipeline process", "conversion-pipeline"),
    ("create a resume from templates", "resume-builder"),
    ("please build cv", "resume-builder"),
]

def evaluate_model_on_test_cases(vocabulary, idf, coef_matrix, intercepts, classes, title):
    passed = 0
    total = len(TEST_CASES)
    
    for query, expected in TEST_CASES:
        tokens = tokenize_ngrams(query)
        if not tokens:
            pred, conf = 'unknown', 1.0
        else:
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
                
            sparse_vector = []
            if squared_sum > 0:
                l2_norm = math.sqrt(squared_sum)
                sparse_vector = [(idx, val / l2_norm) for idx, val in vector_dict.items()]
            
            if not sparse_vector:
                pred, conf = 'unknown', 1.0
            else:
                num_classes = len(classes)
                raw_z = [0.0] * num_classes
                max_z = -float('inf')
                
                for c in range(num_classes):
                    z = intercepts[c]
                    for feat_idx, val in sparse_vector:
                        if isinstance(coef_matrix[c], dict):
                            z += val * coef_matrix[c].get(str(feat_idx), 0.0)
                        else:
                            z += val * coef_matrix[c][feat_idx]
                    raw_z[c] = z
                    if z > max_z:
                        max_z = z
                        
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
                pred, conf = top_class, max_score
                
        effective_pred = 'unknown' if (pred != 'unknown' and conf < 0.65) else pred
        if pred == expected or (expected == 'unknown' and effective_pred == 'unknown'):
            passed += 1
            
    acc = passed / total
    print(f"[{title}] Accuracy: {passed}/{total} ({acc:.2%})", flush=True)
    return passed

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"CUDA Available: {torch.cuda.is_available()}")
    print(f"Executing on hardware device: {device}\n", flush=True)
    
    output_path = Path(__file__).resolve().parent.parent / 'src' / 'utils' / 'classifier_weights.json'
    
    print("Generating massive probabilistic target dataset...", flush=True)
    data, labels = generate_dataset_probabilistic(count_per_class=12000, seed_val=42)
    N = len(data)
    print(f"Generated {N} sentences across tool categories and unknown class.", flush=True)
    
    # Build vocabulary
    print("\nBuilding Global Vocab...", flush=True)
    global_terms = set()
    for sentence in data:
        for term in tokenize_ngrams(sentence):
            global_terms.add(term)
            
    vocabulary = {token: idx for idx, token in enumerate(sorted(list(global_terms)))}
    F = len(vocabulary)
    print(f"Global Vocabulary compiled: {F} unique features.", flush=True)
    
    vectorizer = TfidfModel(vocabulary)
    print("Fitting TF-IDF and calculating IDF values...", flush=True)
    vectorizer.fit_idf(data)
    
    print("Encoding corpus to TF-IDF sparse structure...", flush=True)
    X_sparse = vectorizer.transform(data)
    
    classes = sorted(list(set(labels)))
    class_to_idx = {c: idx for idx, c in enumerate(classes)}
    y_indices = [class_to_idx[l] for l in labels]
    
    # Deterministic Stratified Split (90% Train, 10% Validation)
    rng = random.Random(42)
    train_indices = []
    val_indices = []
    label_to_indices = {}
    for idx, label in enumerate(labels):
        label_to_indices.setdefault(label, []).append(idx)
        
    for label, idxs in label_to_indices.items():
        idxs_copy = list(idxs)
        rng.shuffle(idxs_copy)
        split_point = int(len(idxs_copy) * 0.9)
        train_indices.extend(idxs_copy[:split_point])
        val_indices.extend(idxs_copy[split_point:])
        
    rng.shuffle(train_indices)
    rng.shuffle(val_indices)
    
    print(f"Dataset split: Train = {len(train_indices)} samples, Val = {len(val_indices)} samples.", flush=True)
    
    # PyTorch Model Setup
    model = PyTorchLogisticRegression(F, len(classes)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    batch_size = 2048
    epochs = 15  # Fast GPU convergence
    print(f"\nStarting PyTorch training loop on {device} ({epochs} epochs)...", flush=True)
    
    for epoch in range(epochs):
        model.train()
        epoch_loss = 0.0
        t0 = time.time()
        
        # Training batch loop
        for batch_start in range(0, len(train_indices), batch_size):
            batch_idx_list = train_indices[batch_start:batch_start+batch_size]
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
            
        # Validation loop
        model.eval()
        val_loss = 0.0
        val_correct = 0
        with torch.no_grad():
            for batch_start in range(0, len(val_indices), batch_size):
                batch_idx_list = val_indices[batch_start:batch_start+batch_size]
                batch_sparse = [X_sparse[i] for i in batch_idx_list]
                batch_labels = [y_indices[i] for i in batch_idx_list]
                
                X_batch = make_dense_batch_gpu(batch_sparse, F, device)
                y_batch = torch.tensor(batch_labels, dtype=torch.long, device=device)
                
                outputs = model(X_batch)
                loss = criterion(outputs, y_batch)
                val_loss += loss.item() * len(batch_idx_list)
                
                preds = torch.argmax(outputs, dim=1)
                val_correct += (preds == y_batch).sum().item()
                
        avg_train_loss = epoch_loss / len(train_indices)
        avg_val_loss = val_loss / len(val_indices)
        val_acc = val_correct / len(val_indices)
        
        print(f"Epoch {epoch+1:02d}/{epochs:02d} - TrainLoss: {avg_train_loss:.5f} - ValLoss: {avg_val_loss:.5f} - ValAcc: {val_acc:.2%} (took {time.time() - t0:.2f}s)", flush=True)
        
    print("\nTraining completed successfully! Running inline test evaluation on unpruned model...", flush=True)
    unpruned_coef = model.linear.weight.detach().cpu().numpy().tolist()
    unpruned_intercept = model.linear.bias.detach().cpu().numpy().tolist()
    
    unpruned_passed = evaluate_model_on_test_cases(vocabulary, vectorizer.idf, unpruned_coef, unpruned_intercept, classes, "UNPRUNED MODEL")
    
    print("\nCompacting and exporting weights...", flush=True)
    pruned_weights = save_pytorch_weights(model, classes, vocabulary, vectorizer, output_path, top_k=350)
    
    print("\nRunning inline test evaluation on pruned model...", flush=True)
    pruned_passed = evaluate_model_on_test_cases(
        pruned_weights['vocabulary'],
        pruned_weights['idf'],
        pruned_weights['coef'],
        pruned_weights['intercept'],
        pruned_weights['classes'],
        "PRUNED MODEL"
    )
    
    diff = unpruned_passed - pruned_passed
    print(f"\n[DIFF ANALYSIS] Verification difference (Unpruned Passed - Pruned Passed): {diff} test case mismatch.", flush=True)
    if diff > 0:
        print("WARNING: Pruning removed key features, causing accuracy degradation on validation test cases!", flush=True)
    else:
        print("SUCCESS: Pruned model matches or exceeds unpruned validation performance cleanly.", flush=True)

if __name__ == '__main__':
    main()
