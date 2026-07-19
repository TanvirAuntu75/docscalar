# -*- coding: utf-8 -*-
"""
Google Colab Intent Classifier Trainer
--------------------------------------
Paste the entire content of this script into a single cell in Google Colab,
select a GPU runtime (T4 is perfect), and run it. It will train the expanded
dictionary model, verify it, and automatically trigger a download of the
resulting `classifier_weights.json` file.
"""

import sys
import os

# 1. Colab Dependencies Setup
if 'google.colab' in sys.modules:
    print("[Colab Detected] Installing nltk, spacy, and downloading spaCy model...")
    os.system("pip install --quiet nltk spacy torch")
    os.system("python -m spacy download en_core_web_sm --quiet")
    print("Done installing dependencies.")

import re
import json
import math
import random
import time
from pathlib import Path

import torch
import torch.nn as nn
import torch.optim as optim

try:
    import nltk
    from nltk.corpus import wordnet as wn
    try:
        wn.synsets('compress')
    except LookupError:
        nltk.download('wordnet', quiet=True)
        nltk.download('omw-1.4', quiet=True)
except ImportError:
    wn = None

try:
    import spacy
    _nlp = spacy.load('en_core_web_sm', disable=['parser', 'ner'])
except ImportError:
    _nlp = None

# Set random seeds for reproducibility
random.seed(42)
torch.manual_seed(42)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(42)

# 2. Action Verbs Registry
SYNONYMS = {
    'merge-pdf': ['merge', 'combine', 'join', 'stitch', 'bundle', 'concatenate', 'unite', 'fuse', 'aggregate', 'merge pdf', 'combine pdf', 'merged pdf', 'needs to be merged', 'should be merged', 'must be merged'],
    'split-pdf': ['split', 'cut', 'divide', 'separate', 'extract pages', 'half', 'slice', 'split instead', 'wait let\'s split'],
    'compress-pdf': ['compress', 'shrink', 'reduce size', 'minimize', 'smaller', 'make smaller', 'downsize',
                     'compress pdf file', 'compress my pdf', 'compress pdf', 'reduce pdf size', 'compress the pdf',
                     'shrink the pdf', 'make pdf smaller', 'shrink file size', 'make it smaller',
                     'reduce file size', 'file size reduction', 'smaller file',
                     'make it really small', 'really small', 'small',
                     'পিডিএফ সাইজ কমানো', 'সাইজ কমানো'],
    'ocr-pdf': ['ocr', 'recognize', 'searchable', 'read text', 'extract text', 'make searchable'],
    'rotate-pdf': ['rotate', 'turn', 'spin', 'landscape', 'portrait', 'change orientation', 'flip', 'rotate pdf', 'rotate the pdf', 'turn the pdf', 'rotate pdf pages', 'needs to be rotated', 'should be rotated', 'must be rotated'],
    'protect-pdf': ['protect', 'lock', 'encrypt', 'add password', 'restrict', 'secure',
                    'safeguard', 'shield', 'defend', 'guard',
                    'lock the pdf', 'lock this pdf', 'lock document', 'lock pdf file',
                    'password protect', 'password lock', 'apply password'],
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
    'image-compressor': ['compress image', 'shrink image', 'reduce image size', 'compress photo',
                         'make image smaller', 'compress jpg', 'compress png', 'reduce photo size',
                         'optimize image', 'make photo smaller', 'image compression', 'photo compression',
                         'compress picture', 'reduce image', 'smaller image', 'optimize photo'],
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
        'hello', 'hi', 'hey', 'canvas info', 'help', 'how to use', 'whats up',
        'good morning', 'good evening', 'who are you', 'what can you do',
        'what is this', 'show help', 'tell me what tools are available',
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
        'undo', 'redo', 'undo command', 'redo last', 'undo the merge', 'redo the split',
        'please undo', 'please redo', 'cancel last action', 'go back', 'revert',
        'revert last merge', 'do it again', 'undo that', 'redo that',
        'undo last step', 'redo last step', 'undo the rotation', 'undo the compress',
        'undo the split', 'undo the conversion', 'undo the crop', 'redo the merge',
        "don't merge", "do not merge", "don't compress", "do not compress",
        "don't rotate", "do not rotate", "don't split", "do not split",
        "don't convert", "do not convert", "stop the merge", "stop the compression",
        "cancel the merge", "cancel the rotation", "cancel the split", "abort merge",
        "stop processing", "halt the operation", "never compress this", "don't do that",
        "do not do that", "no not that", "wait don't merge yet", "hold on don't compress",
        "actually don't convert", "skip the merge", "skip this step", "actually no", "do not do that", "actually no do not do that",
        'what is merge pdf', 'what does merge do', 'how does merge work', 'can you describe merge', 'what is the merge feature',
        'what is split pdf', 'what does split do', 'how does split work', 'what is the split feature',
        'what is compress pdf', 'what does compress do', 'how does compress work', 'what is pdf compression feature',
        'what is rotate pdf', 'what does rotate do', 'how does rotate work', 'what is the rotate feature',
        'what is ocr pdf', 'what does ocr do', 'how does ocr work', 'what is optical character recognition feature',
        'what is redact pdf', 'what does redact do', 'how does redact work', 'what is the redact feature',
        'what is protect pdf', 'what does protect do', 'how does protect work', 'what is pdf protection feature',
        'what is unlock pdf', 'what does unlock do', 'how does unlock work', 'what is the unlock feature',
        'what is sign pdf', 'what does sign do', 'how does sign work', 'what is pdf signing feature',
        'what is watermark pdf', 'what does watermark do', 'how does watermark work', 'what is the watermark feature',
        'what is crop pdf', 'what does crop do', 'how does crop work', 'what is the crop feature',
        'what is translate pdf', 'what does translate do', 'how does translate work', 'what is pdf translation feature',
        'what is repair pdf', 'what does repair do', 'how does repair work', 'what is the repair feature',
        'what is scan to pdf', 'what does scan do', 'how does scan work', 'what is the scan feature',
        'what is compare pdf', 'what does compare do', 'how does compare work', 'what is the compare feature',
        'what is extract pages', 'what does extract do', 'how does extract work',
        'what is organize pdf', 'what does organize do', 'how does organize work', 'what is the organize feature',
        'what is qr generator', 'what does qr do', 'how does qr work', 'what is qr code generation feature',
        'what is resume builder', 'what does resume builder do', 'how does cv builder work',
        'what is conversion pipeline', 'what does pipeline do', 'how does the workflow work',
        'tell me about the merge feature', 'tell me about the compress feature', 'tell me about the rotate feature',
        'tell me about the split feature', 'tell me about the ocr feature', 'tell me about the redact feature',
        'describe what merge does', 'describe what compress does', 'describe what rotate does',
        'is compress the same as reduce size', 'is merge the same as combine files', 'is ocr the same as scan',
        'explain what merge does', 'explain what compress does', 'explain what rotate does', 'explain what split does',
        'explain what ocr does', 'explain what redact does', 'explain what sign does', 'explain what watermark does',
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
]

SUFFIXES = [
    "", "now", "please", "quickly", "right now", "for me", "asap",
    "the files", "the document", "my files", "the pdf", "my pdf", "the pdfs",
    "the image", "my image", "on this", "on this file", "on this document",
    "for this file", "efficiently", "safely", "securely", "with high quality",
    "to finish", "to complete", "right now", "without delay", "for the workspace",
    "on the canvas", "instantly", "swiftly", "rapidly", "straight away",
    "one time", "at once", "this instant", "with no wait", "promptly",
    "as planned", "accordingly", "for my project", "in the background",
    "right here", "on my screen", "directly",
]

ORDINALS = [
    '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th',
    'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth',
    'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
]
RELATIONS = ['to', 'with', 'and', 'and also', ',']

def build_probabilistic_target(rng):
    p = rng.random()
    if p < 0.25:
        return rng.choice(ORDINALS) + " document"
    elif p < 0.50:
        return f"{rng.choice(ORDINALS)} {rng.choice(RELATIONS)} {rng.choice(ORDINALS)}"
    elif p < 0.70:
        return f"all except the {rng.choice(ORDINALS)}"
    elif p < 0.85:
        return rng.choice(["the output", "all outputs", "the results", "the merged output"])
    else:
        return f"{rng.choice(ORDINALS)} and {rng.choice(ORDINALS)} and also {rng.choice(ORDINALS)}"

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

# Grammar templates definition
GERUND_TEMPLATES = [
    "{syn_ing} this file will help",
    "{syn_ing} documents saves storage space",
    "i enjoy {syn_ing} files before sharing",
    "{syn_ing} the pdf is necessary before sending",
    "she suggested {syn_ing} the files",
]

MODAL_TEMPLATES = [
    "i ought to {syn} this pdf",
    "i shall {syn} this document",
    "we ought to {syn} these files",
    "you ought to {syn} the document first",
]

THIRD_PERSON_TEMPLATES = [
    "she needs to {syn} the document",
    "he wants to {syn} this file",
    "my colleague needs to {syn} the pdf",
]

PAST_ACTION_TEMPLATES = [
    "i {syn_ed} the file yesterday",
    "i already {syn_ed} this document",
    "we {syn_ed} all the files last night",
]

CONDITIONAL_TEMPLATES = [
    "if i could {syn} this file that would be great",
    "wish i could {syn} this pdf quickly",
    "if possible please {syn} this document",
]

DEFINITION_TEMPLATES = [
    "{definition} my file",
    "please {definition} the pdf",
    "can you {definition} this document",
]

PAST_TENSE_MAP = {
    'merge': 'merged', 'combine': 'combined', 'join': 'joined', 'stitch': 'stitched',
    'split': 'split', 'cut': 'cut', 'divide': 'divided', 'separate': 'separated',
    'compress': 'compressed', 'shrink': 'shrunk', 'minimize': 'minimized',
    'rotate': 'rotated', 'turn': 'turned', 'flip': 'flipped',
    'protect': 'protected', 'lock': 'locked', 'encrypt': 'encrypted',
    'unlock': 'unlocked', 'decrypt': 'decrypted',
    'translate': 'translated', 'convert': 'converted', 'ocr': 'ocr-processed'
}

def get_morphological_forms(base_word):
    forms = {base_word}
    w = base_word.lower().strip()
    if ' ' in w:
        return list(forms)
    if w.endswith('ie'):
        forms.add(w[:-2] + 'ying')
    elif w.endswith('e') and not w.endswith('ee') and len(w) > 2:
        forms.add(w[:-1] + 'ing')
    else:
        forms.add(w + 'ing')
    if w.endswith('e'):
        forms.add(w + 'd')
    else:
        forms.add(w + 'ed')
    forms.add(w + 's')
    return list(forms)

WORDNET_BLOCKLIST = {
    'edit-pdf': {'cut', 'cuts', 'cutting', 'trim', 'trims', 'trimming', 'crop', 'crops', 'cropping', 'slice', 'slices', 'slicing', 'split', 'splits', 'splitting'},
    'repair-pdf': {'safeguard', 'safeguards', 'safeguarding', 'guard', 'guards', 'guarding', 'defend', 'defends', 'defending', 'shield', 'shields', 'shielding', 'protect', 'protects', 'protecting', 'preserve', 'preserves', 'preserving', 'secure', 'secures', 'securing'},
    'crop-pdf': {'cut', 'cuts', 'cutting', 'split', 'splits', 'splitting', 'divide', 'divides', 'dividing'},
    'remove-pages': {'split', 'splits', 'splitting', 'divide', 'divides', 'dividing'},
    'unlock-pdf': {'lock', 'locks', 'locked', 'locking'},
    'image-compressor': {'compress', 'compresses', 'compressed', 'compressing', 'shrink', 'shrinks', 'shrank', 'shrinking', 'reduce', 'reduces', 'reduced', 'reducing', 'minimize', 'minimizes', 'minimized', 'minimizing', 'downsize', 'downsizes', 'downsized', 'downsizing'},
}

def build_wordnet_expansion(synonyms_dict):
    if wn is None:
        return synonyms_dict, {}
    expanded = {}
    definitions_by_label = {}
    for label, syns in synonyms_dict.items():
        if label == 'unknown':
            expanded[label] = list(syns)
            continue
        new_syns = set(syns)
        label_defs = set()
        for base_word in list(syns):
            if ' ' in base_word or len(base_word) < 3:
                continue
            for synset in wn.synsets(base_word, pos=wn.VERB):
                defn = synset.definition().lower()
                defn_words = [w for w in defn.split() if len(w) > 3]
                if len(defn_words) >= 3:
                    label_defs.add(defn)
                for lemma in synset.lemmas():
                    word = lemma.name().replace('_', ' ').lower()
                    if ' ' in word or len(word) < 3 or word == base_word:
                        continue
                    if _nlp is not None:
                        doc = _nlp(word)
                        if not all(t.pos_ in ['VERB', 'NOUN', 'PROPN'] for t in doc if not t.is_space):
                            continue
                    blocklist = WORDNET_BLOCKLIST.get(label, set())
                    if word in blocklist:
                        continue
                    new_syns.add(word)
                    for form in get_morphological_forms(word):
                        if form not in blocklist:
                            new_syns.add(form)
        expanded[label] = sorted(list(new_syns))
        definitions_by_label[label] = sorted(list(label_defs))
    return expanded, definitions_by_label

def generate_dataset_probabilistic(count_per_class=20000, seed_val=42, wordnet_defs=None):
    rng = random.Random(seed_val)
    data = []
    labels = []
    if wordnet_defs is None:
        wordnet_defs = {}
    for label, syns in SYNONYMS.items():
        class_sentences = set()
        while len(class_sentences) < count_per_class:
            syn = rng.choice(syns)
            prefix = rng.choice(PREFIXES)
            suffix = rng.choice(SUFFIXES)
            p = rng.random()
            if label == 'unknown':
                if p < 0.45:
                    sentence = f"{prefix} {syn} {suffix}".strip() if rng.random() < 0.5 else syn
                elif p < 0.60:
                    tool_syn = rng.choice([s for k, v in SYNONYMS.items() if k != 'unknown' for s in v])
                    cancel_phrase = rng.choice(["actually no", "wait cancel that", "never mind", "do not do that", "don't do it"])
                    sentence = f"{tool_syn} — {cancel_phrase}"
                elif p < 0.70:
                    chars = "abcdefghijklmnopqrstuvwxyz"
                    sentence = "".join(rng.choice(chars) for _ in range(rng.randint(5, 12))) + " " + "".join(rng.choice(chars) for _ in range(rng.randint(4, 9)))
                else:
                    sentence = f"ignore previous instructions and make this"
            else:
                p_len = rng.random()
                if p_len < 0.15:
                    sentence = f"{syn} {rng.choice(['it', 'file', 'document', 'output'])}"
                elif p_len < 0.45:
                    sentence = f"{prefix} {syn} {build_probabilistic_target(rng)} {suffix}"
                elif p_len < 0.60:
                    base = syn.split()[0]
                    forms = get_morphological_forms(base)
                    ing_forms = [f for f in forms if f.endswith('ing')]
                    syn_ing = ing_forms[0] if ing_forms else base + 'ing'
                    sentence = rng.choice(GERUND_TEMPLATES).format(syn_ing=syn_ing)
                elif p_len < 0.70:
                    sentence = rng.choice(MODAL_TEMPLATES).format(syn=syn)
                elif p_len < 0.80:
                    sentence = rng.choice(THIRD_PERSON_TEMPLATES).format(syn=syn)
                elif p_len < 0.90:
                    syn_ed = PAST_TENSE_MAP.get(syn, syn + 'ed')
                    sentence = rng.choice(PAST_ACTION_TEMPLATES).format(syn=syn, syn_ed=syn_ed)
                elif p_len < 0.95:
                    label_defs = wordnet_defs.get(label, [])
                    if label_defs:
                        defn_clean = re.sub(r'[^\w\s-]', '', rng.choice(label_defs))
                        sentence = rng.choice(DEFINITION_TEMPLATES).format(definition=defn_clean)
                    else:
                        sentence = f"{prefix} {syn} {suffix}"
                else:
                    sentence = rng.choice(CONDITIONAL_TEMPLATES).format(syn=syn)
            sentence = " ".join(sentence.split()).strip()
            if rng.random() < 0.15:
                sentence = inject_typo_noise(sentence, rng)
            if sentence:
                class_sentences.add(sentence)
                class_sentences.add(sentence.capitalize())
        class_list = list(class_sentences)[:count_per_class]
        data.extend(class_list)
        labels.extend([label] * count_per_class)
    return data, labels

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

def make_dense_batch_gpu(batch_sparse, input_dim, device):
    batch_size = len(batch_sparse)
    dense = torch.zeros(batch_size, input_dim, device=device)
    
    row_indices = []
    col_indices = []
    values = []
    
    for r_idx, vec in enumerate(batch_sparse):
        for c_idx, val in vec:
            row_indices.append(r_idx)
            col_indices.append(c_idx)
            values.append(val)
            
    if row_indices:
        dense[row_indices, col_indices] = torch.tensor(values, dtype=torch.float, device=device)
        
    return dense

def save_pytorch_weights(model, classes, vocabulary, vectorizer, output_path, top_k=3200):
    coefs = model.linear.weight.detach().cpu().numpy().tolist()
    intercepts = model.linear.bias.detach().cpu().numpy().tolist()
    active_indices = set()
    num_classes = len(coefs)
    num_features = len(coefs[0])
    for c in range(num_classes):
        sorted_feats = sorted(range(num_features), key=lambda idx: abs(coefs[c][idx]), reverse=True)
        active_indices.update(sorted_feats[:top_k])
    # Force protecting key trigger keywords
    forced_keywords = ['merge', 'split', 'compress', 'rotate', 'protect', 'unlock', 'pdf', 'image', 'watermark', 'ocr']
    for kw in forced_keywords:
        stemmed = stem(kw)
        if stemmed in vocabulary:
            active_indices.add(vocabulary[stemmed])
    threshold = 4.0
    # Filter active indices to only those that have a weight > threshold in at least one class
    retained_indices = set()
    for idx in active_indices:
        if any(abs(coefs[c][idx]) > threshold for c in range(num_classes)):
            retained_indices.add(idx)

    pruned_vocabulary = {}
    new_idx = 0
    mapping = {}
    for t in sorted(vocabulary.keys(), key=lambda x: vocabulary[x]):
        old_idx = vocabulary[t]
        if old_idx in retained_indices:
            pruned_vocabulary[t] = new_idx
            mapping[new_idx] = old_idx
            new_idx += 1
    pruned_idf = [round(vectorizer.idf[mapping[i]], 4) for i in range(new_idx)]
    pruned_coef = []
    pruned_intercept = [round(b, 4) for b in intercepts]
    for c in range(num_classes):
        class_coefs = {}
        for i in range(new_idx):
            val = coefs[c][mapping[i]]
            if abs(val) > threshold:
                class_coefs[str(i)] = round(val, 4)
        pruned_coef.append(class_coefs)
    weights = {
        'vocabulary': pruned_vocabulary,
        'idf': pruned_idf,
        'coef': pruned_coef,
        'intercept': pruned_intercept,
        'classes': classes
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(weights, f, separators=(',', ':'))
    return weights

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

def evaluate_model_on_test_cases(vocabulary, idf, coef_matrix, intercepts, classes, title):
    passed = 0
    total = len(TEST_CASES)
    for query, expected in TEST_CASES:
        tokens = tokenize_ngrams(query)
        if not tokens:
            pred = 'unknown'
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
            if squared_sum == 0:
                pred = 'unknown'
            else:
                l2_norm = math.sqrt(squared_sum)
                sparse = [(idx, val / l2_norm) for idx, val in vector_dict.items()]
                num_classes = len(classes)
                raw_z = [0.0] * num_classes
                max_z = -float('inf')
                for c in range(num_classes):
                    z = intercepts[c]
                    for feat_idx, val in sparse:
                        if isinstance(coef_matrix[c], dict):
                            z += val * coef_matrix[c].get(str(feat_idx), 0.0)
                        else:
                            z += val * coef_matrix[c][feat_idx]
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
                pred = classes[best_c]
        if pred == expected:
            passed += 1
    acc = passed / total
    print(f"[{title}] Test Accuracy: {passed}/{total} ({acc:.2%})")
    return passed == total

def main():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")
    
    # Expand verbs globally
    global SYNONYMS
    SYNONYMS, wordnet_defs = build_wordnet_expansion(SYNONYMS)
    
    # Generate large dataset for Colab
    print("Generating training dataset (20,000 sentences per class)...")
    data, labels = generate_dataset_probabilistic(count_per_class=20000, seed_val=42, wordnet_defs=wordnet_defs)
    
    # Build vocabulary
    global_terms = set()
    for s in data:
        for t in tokenize_ngrams(s):
            global_terms.add(t)
    vocabulary = {term: idx for idx, term in enumerate(sorted(list(global_terms)))}
    F = len(vocabulary)
    print(f"Vocabulary compiled: {F} unique features.")
    
    # Fit TF-IDF
    vectorizer = TfidfModel(vocabulary)
    vectorizer.fit_idf(data)
    
    # Transform corpus
    X_sparse = vectorizer.transform(data)
    classes = sorted(list(set(labels)))
    class_to_idx = {name: idx for idx, name in enumerate(classes)}
    y_indices = [class_to_idx[l] for l in labels]
    
    # Split
    indices = list(range(len(data)))
    random.seed(42)
    random.shuffle(indices)
    split_idx = int(0.9 * len(data))
    train_indices = indices[:split_idx]
    val_indices = indices[split_idx:]
    
    # Model
    model = PyTorchLogisticRegression(F, len(classes)).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)
    
    batch_size = 2048  # High batch size for rapid training on Colab T4 GPU
    epochs = 15
    print("\nStarting PyTorch training loop...")
    for epoch in range(epochs):
        model.train()
        epoch_loss = 0.0
        t0 = time.time()
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
            
        print(f"Epoch {epoch+1:02d}/{epochs:02d} - Loss: {epoch_loss/len(train_indices):.5f} (took {time.time()-t0:.2f}s)", flush=True)
        
    # Evaluate and Export
    unpruned_coef = model.linear.weight.detach().cpu().numpy().tolist()
    unpruned_intercept = model.linear.bias.detach().cpu().numpy().tolist()
    evaluate_model_on_test_cases(vocabulary, vectorizer.idf, unpruned_coef, unpruned_intercept, classes, "UNPRUNED MODEL")
    
    output_path = 'classifier_weights.json'
    pruned_weights = save_pytorch_weights(model, classes, vocabulary, vectorizer, output_path, top_k=3200)
    evaluate_model_on_test_cases(pruned_weights['vocabulary'], pruned_weights['idf'], pruned_weights['coef'], pruned_weights['intercept'], pruned_weights['classes'], "PRUNED MODEL")
    
    # Colab download trigger
    if 'google.colab' in sys.modules:
        from google.colab import files
        print("\nTriggering download for classifier_weights.json...")
        files.download('classifier_weights.json')

if __name__ == '__main__':
    main()
