import random
import re
import math

# Use the registries from the GPU script
ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth']
RELATIONS = ['to', 'with', 'and', 'and also', ',', 'then', 'after that']
VERBS = ['merge', 'combine', 'join', 'stitch', 'bundle', 'concatenate']
PAST_PARTICIPLE = ['merged', 'combined', 'joined', 'stitched', 'compressed', 'shrunk', 'rotated', 'converted']

PREFIXES = [
    "", "please", "can you", "could you", "i want to", "i need to",
    "help me to", "go ahead and", "run", "execute", "trigger", "start",
    "process", "apply", "perform", "do", "let's", "kindly",
    "can you access my uploaded files and please",
    "i have a couple of documents from my client and i want to",
    "my manager asked me if it is possible to",
    "as part of my daily document management pipeline i must"
]

SUFFIXES = [
    "", "now", "please", "immediately", "right away", "quickly", "asap",
    "this file", "this document", "these files", "the document", "the file",
    "on all the selected document nodes in the workspace grid",
    "without losing any text formatting or formatting styles",
    "because my boss requested to have this done as soon as possible",
    "and then output the result as a new node on the canvas layout"
]

def stem(word):
    w = word.lower().strip()
    if w.endswith('ing'): w = w[:-3]
    elif w.endswith('ed'): w = w[:-2]
    elif w.endswith('ies'): w = w[:-3] + 'y'
    elif w.endswith('s') and not w.endswith('ss'): w = w[:-1]
    return w

def tokenize_ngrams(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    words = [stem(w) for w in text.split() if w]
    tokens = list(words)
    for i in range(len(words) - 1):
        tokens.append(f"{words[i]} {words[i+1]}")
    return tokens

def generate_sample(rng):
    # Probabilistic structure
    prefix = rng.choice(PREFIXES)
    verb = rng.choice(VERBS)
    suffix = rng.choice(SUFFIXES)
    
    # Criss-cross targeting
    targets1 = f"{rng.choice(ORDINALS)} and {rng.choice(ORDINALS)}"
    targets2 = f"{rng.choice(ORDINALS)} and {rng.choice(ORDINALS)}"
    nested = f"the {targets2} {rng.choice(PAST_PARTICIPLE)}"
    
    sentence = f"{prefix} {verb} {targets1} and then merge with {nested} {suffix}"
    return " ".join(sentence.split()).strip()

def main():
    rng = random.Random(42)
    sentences = set()
    
    # Simulate generating unique merge-pdf sentences
    target_count = 50000
    while len(sentences) < target_count:
        sentences.add(generate_sample(rng))
        
    vocab = set()
    for s in sentences:
        for t in tokenize_ngrams(s):
            vocab.add(t)
            
    print(f"Generated {len(sentences)} unique merge sentences.")
    print(f"Unique features (vocabulary size): {len(vocab)}")
    
    # Mathematical projection for 1,000,000 sentences
    estimated_vocab_1m = int(len(vocab) * math.log(1000000) / math.log(50000))
    print(f"Estimated vocabulary size for 1M sentences: {estimated_vocab_1m}")
    
    # Total parameter projection (38 classes)
    classes = 38
    params_1m = estimated_vocab_1m * classes
    print(f"Estimated parameters for 1M dataset: {params_1m:,}")
    print(f"Estimated weights file size (JSON): {params_1m * 10 / (1024 * 1024):.2f} MB")

if __name__ == '__main__':
    main()
