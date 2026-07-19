import nltk
from nltk.corpus import wordnet as wn
import spacy

try:
    wn.synsets('compress')
except LookupError:
    nltk.download('wordnet')
    nltk.download('omw-1.4')

nlp = spacy.load('en_core_web_sm')

verbs = ['merge', 'split', 'compress', 'protect', 'unlock', 'rotate', 'sign']

print("WORDNET VERB EXPANSIONS:")
for verb in verbs:
    syns = set()
    defs = set()
    for synset in wn.synsets(verb, pos=wn.VERB):
        definition = synset.definition()
        defs.add(definition)
        for lemma in synset.lemmas():
            word = lemma.name().replace('_', ' ').lower()
            doc = nlp(word)
            if all(t.pos_ in ['VERB', 'NOUN', 'PROPN', 'ADJ'] for t in doc):
                syns.add(word)
    print(f"\nVerb: '{verb}'")
    print(f"  Synonyms: {sorted(list(syns))[:10]}")
    print(f"  Definitions: {list(defs)[:3]}")
