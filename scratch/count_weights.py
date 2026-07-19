import json
from pathlib import Path

base_dir = Path(__file__).resolve().parent.parent
weights_path = base_dir / 'src' / 'utils' / 'classifier_weights.json'

with open(weights_path, 'r', encoding='utf-8') as f:
    weights = json.load(f)

vocab = weights['vocabulary']
coef = weights['coef']

print(f"Vocabulary size: {len(vocab)}")
print(f"Number of classes: {len(coef)}")

total_coefs = 0
for idx, c_w in enumerate(coef):
    print(f"Class {idx} ({weights['classes'][idx]}): {len(c_w)} sparse weights")
    total_coefs += len(c_w)

print(f"Total non-zero weights: {total_coefs}")
