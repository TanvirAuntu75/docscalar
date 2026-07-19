import os
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

MODEL_PATH = r"c:\Users\Tanvir Alam\Downloads\model_quantized.onnx"
TOKENIZER_NAME = "sentence-transformers/all-MiniLM-L6-v2"

# Lazy-loaded session & embeddings cache
_session = None
_tokenizer = None
_exemplar_embeddings = {} # {actionId: [embedding, ...]}

TOOL_EXEMPLARS = {
    'merge-pdf': [
        "merge pdf", "combine pdf files", "bundle documents together", "join files",
        "combine images to pdf", "merge pages", "stitch files together", "merge doc"
    ],
    'compress-pdf': [
        "compress pdf", "make file size smaller", "shrink document", "reduce size",
        "compress image", "smaller files", "minimize size", "shrink pdf"
    ],
    'split-pdf': [
        "split pdf", "extract pages range", "cut pdf pages", "divide document",
        "separate chapters", "extract select pages"
    ],
    'ocr-pdf': [
        "ocr pdf", "recognize text", "make searchable", "extract scanned text",
        "read text from pdf", "run text recognition", "convert scanned to searchable text"
    ],
    'rotate-pdf': [
        "rotate pdf", "turn page sideways", "spin page orientation", "rotate all pages clockwise",
        "turn document landscape"
    ],
    'protect-pdf': [
        "protect pdf", "lock file with password", "encrypt document", "add password protection",
        "restrict copying", "secure pdf"
    ],
    'unlock-pdf': [
        "unlock pdf", "remove password protection", "decrypt document", "bypass lock",
        "remove security"
    ],
    'docx-to-pdf': [
        "convert word to pdf", "docx to pdf", "convert docx document", "word file to pdf"
    ],
    'image-converter': [
        "convert image format", "png to jpg", "jpeg to webp", "change image format"
    ]
}

def init_onnx_engine():
    global _session, _tokenizer, _exemplar_embeddings
    if _session is not None:
        return
        
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"ONNX model not found at {MODEL_PATH}")
        
    # Load session and tokenizer
    _session = ort.InferenceSession(MODEL_PATH)
    _tokenizer = AutoTokenizer.from_pretrained(TOKENIZER_NAME)
    
    # Pre-calculate exemplar embeddings
    for action_id, phrases in TOOL_EXEMPLARS.items():
        embeddings = _get_embeddings_batch(phrases)
        _exemplar_embeddings[action_id] = embeddings

def _get_embeddings_batch(texts):
    global _session, _tokenizer
    # Tokenize input sentences
    inputs = _tokenizer(texts, padding=True, truncation=True, return_tensors="np")
    
    # Cast to int64 for ONNX graph compatibility
    ort_inputs = {
        "input_ids": inputs["input_ids"].astype(np.int64),
        "attention_mask": inputs["attention_mask"].astype(np.int64),
    }
    # Check if graph expects token_type_ids
    input_names = [i.name for i in _session.get_inputs()]
    if "token_type_ids" in input_names:
        ort_inputs["token_type_ids"] = inputs["token_type_ids"].astype(np.int64)
        
    outputs = _session.run(None, ort_inputs)
    token_embeddings = outputs[0] # Shape: (batch_size, seq_len, hidden_dim)
    
    # Mean pooling
    attention_mask = inputs["attention_mask"]
    input_mask_expanded = np.expand_dims(attention_mask, -1).astype(float)
    sum_embeddings = np.sum(token_embeddings * input_mask_expanded, 1)
    sum_mask = np.clip(input_mask_expanded.sum(1), a_min=1e-9, a_max=None)
    embeddings = sum_embeddings / sum_mask
    
    # Normalize embeddings
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    return embeddings / np.clip(norms, a_min=1e-9, a_max=None)

def match_semantic_intent(query_text: str):
    init_onnx_engine()
    
    # Embed query
    query_emb = _get_embeddings_batch([query_text])[0]
    
    best_action = None
    best_score = -1.0
    
    # Calculate similarity with all exemplars
    for action_id, exemplar_embs in _exemplar_embeddings.items():
        # Cosine similarity for normalized vectors is just the dot product
        similarities = np.dot(exemplar_embs, query_emb)
        max_similarity = float(np.max(similarities))
        
        if max_similarity > best_score:
            best_score = max_similarity
            best_action = action_id
            
    return best_action, best_score
