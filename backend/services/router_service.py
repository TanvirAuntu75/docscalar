import json
import logging
import os
from pathlib import Path

import numpy as np

from backend import config

logger = logging.getLogger("uvicorn.error")

try:
    import onnxruntime as ort
    from transformers import AutoTokenizer

    HAS_ONNX = True
except ImportError:
    ort = None
    AutoTokenizer = None
    HAS_ONNX = False

MODEL_DIR = config.BASE_DIR / "models" / "docforge-intent"
MODEL_PATH = str(MODEL_DIR / "model_quantized.onnx")
LABELS_PATH = MODEL_DIR / "labels.json"

# Lazy-loaded session, tokenizer & label mappings
_session = None
_tokenizer = None
_id2label = {}
_exemplar_embeddings = {}  # {actionId: [embedding, ...]}
_engine_available = False

TOOL_EXEMPLARS = {
    "merge-pdf": [
        "merge pdf",
        "combine pdf files",
        "bundle documents together",
        "join files",
        "combine images to pdf",
        "merge pages",
        "stitch files together",
        "merge doc",
    ],
    "compress-pdf": [
        "compress pdf",
        "make file size smaller",
        "shrink document",
        "reduce size",
        "compress image",
        "smaller files",
        "minimize size",
        "shrink pdf",
    ],
    "split-pdf": [
        "split pdf",
        "extract pages range",
        "cut pdf pages",
        "divide document",
        "separate chapters",
        "extract select pages",
    ],
    "ocr-pdf": [
        "ocr pdf",
        "recognize text",
        "make searchable",
        "extract scanned text",
        "read text from pdf",
        "run text recognition",
        "convert scanned to searchable text",
    ],
    "rotate-pdf": [
        "rotate pdf",
        "turn page sideways",
        "spin page orientation",
        "rotate all pages clockwise",
        "turn document landscape",
    ],
    "protect-pdf": [
        "protect pdf",
        "lock file with password",
        "encrypt document",
        "add password protection",
        "restrict copying",
        "secure pdf",
    ],
    "unlock-pdf": [
        "unlock pdf",
        "remove password protection",
        "decrypt document",
        "bypass lock",
        "remove security",
    ],
    "docx-to-pdf": [
        "convert word to pdf",
        "docx to pdf",
        "convert docx document",
        "word file to pdf",
    ],
    "image-converter": [
        "convert image format",
        "png to jpg",
        "jpeg to webp",
        "change image format",
    ],
}


def _load_engine():
    global _session, _tokenizer, _id2label, _engine_available
    if _session is not None and _tokenizer is not None and _id2label:
        return True

    if not HAS_ONNX:
        logger.warning("ONNX runtime or transformers not available.")
        _engine_available = False
        return False

    if not os.path.exists(MODEL_PATH) or not os.path.exists(str(LABELS_PATH)):
        logger.warning(f"Neural intent model or labels not found at {MODEL_PATH}")
        _engine_available = False
        return False

    try:
        # Load labels from MODEL_DIR / "labels.json"
        with open(LABELS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            _id2label = data.get("id2label", data)

        # Load tokenizer locally from str(MODEL_DIR) with local_files_only=True (fallback gracefully if offline)
        try:
            _tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR), local_files_only=True)
        except Exception as tok_err:
            logger.warning(
                f"Failed to load tokenizer with local_files_only=True: {tok_err}. Retrying default loader."
            )
            _tokenizer = AutoTokenizer.from_pretrained(str(MODEL_DIR))

        # Create ort.InferenceSession(MODEL_PATH)
        _session = ort.InferenceSession(MODEL_PATH)
        _engine_available = True
        return True
    except Exception as e:
        logger.warning(f"Failed to initialize neural intent engine: {e}")
        _engine_available = False
        return False


def init_onnx_engine():
    """Backward compatibility alias for _load_engine."""
    return _load_engine()


def classify_intent(query: str):
    """
    Classifies user intent using the DocForge Neural Intent Model (ONNX).
    Returns dict: {"action_id": tool_id, "score": score, "is_ambiguous": is_ambiguous, "engine": "neural-onnx"}
    """
    if not query or not query.strip():
        return {
            "action_id": "unknown",
            "score": 0.0,
            "is_ambiguous": True,
            "engine": "neural-onnx",
        }

    if not _load_engine():
        return {
            "action_id": "unknown",
            "score": 0.0,
            "is_ambiguous": True,
            "engine": "none",
        }

    try:
        # Tokenize query: inputs = _tokenizer(query, return_tensors="np", padding=True, truncation=True, max_length=64)
        inputs = _tokenizer(
            query,
            return_tensors="np",
            padding=True,
            truncation=True,
            max_length=64,
        )

        # Pass input_ids and attention_mask as np.int64 to _session.run(None, ort_inputs)
        ort_inputs = {
            "input_ids": inputs["input_ids"].astype(np.int64),
            "attention_mask": inputs["attention_mask"].astype(np.int64),
        }

        input_names = [i.name for i in _session.get_inputs()]
        if "token_type_ids" in input_names and "token_type_ids" in inputs:
            ort_inputs["token_type_ids"] = inputs["token_type_ids"].astype(np.int64)

        output = _session.run(None, ort_inputs)
        logits = output[0]

        # Compute softmax probabilities
        exp_logits = np.exp(logits - np.max(logits, axis=-1, keepdims=True))
        probs = exp_logits / np.sum(exp_logits, axis=-1, keepdims=True)

        # Find best_idx = np.argmax(probs[0]), score = float(probs[0][best_idx]), tool_id = id2label[str(best_idx)]
        best_idx = np.argmax(probs[0])
        score = float(probs[0][best_idx])
        tool_id = _id2label.get(str(best_idx), "unknown")

        # If tool_id == 'unsupported' or score < 0.25: mark action_id = "unknown", is_ambiguous = True
        action_id = tool_id
        is_ambiguous = False
        if tool_id == "unsupported" or score < 0.25:
            action_id = "unknown"
            is_ambiguous = True

        effective_action_id = action_id if tool_id == "unsupported" else tool_id

        # Return {"action_id": tool_id, "score": score, "is_ambiguous": is_ambiguous, "engine": "neural-onnx"}
        return {
            "action_id": effective_action_id,
            "score": score,
            "is_ambiguous": is_ambiguous,
            "engine": "neural-onnx",
        }
    except Exception as e:
        logger.error(f"Error classifying intent: {e}")
        return {
            "action_id": "unknown",
            "score": 0.0,
            "is_ambiguous": True,
            "engine": "neural-onnx",
        }


def match_semantic_intent(query_text: str):
    """
    High-level compatibility wrapper for existing callers (e.g. backend/main.py).
    Returns (action_id, score) where action_id is None if unknown or ambiguous.
    """
    res = classify_intent(query_text)
    if not res:
        return None, 0.0
    action = res.get("action_id")
    score = res.get("score", 0.0)
    if action == "unknown" or action == "unsupported":
        return None, score
    return action, score
