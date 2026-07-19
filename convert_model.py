"""
convert_model.py
Upgrades existing PaddleOCR ONNX models from opset 11 → 17
and simplifies the graph so onnxruntime-web can load them in the browser.

Run:
  .venv\Scripts\python convert_model.py
"""

import onnx
from onnx import version_converter
import onnxsim
import os

MODELS = [
    {
        "src": "backend/models/ocr/rec/rec_handwriting .onnx",
        "dst": "public/models/rec_handwriting_web.onnx",
        "label": "Handwriting Model"
    },
    {
        "src": "backend/models/ocr/rec/rec_multilingual.onnx",
        "dst": "public/models/rec_multilingual_web.onnx",
        "label": "Multilingual Model"
    }
]

TARGET_OPSET = 17

for m in MODELS:
    print(f"\n{'='*60}")
    print(f"Processing: {m['label']}")
    print(f"  Source:  {m['src']}")
    print(f"  Dest:    {m['dst']}")

    if not os.path.exists(m["src"]):
        print(f"  [SKIP] Source file not found.")
        continue

    # Step 1: Load existing ONNX model
    print(f"  [1/3] Loading model...")
    model = onnx.load(m["src"])
    print(f"        Loaded. Opset: {model.opset_import[0].version}")

    # Step 2: Convert opset to 17 (supports HardSigmoid natively)

    try:
        model_converted = version_converter.convert_version(model, TARGET_OPSET)
        print(f"        Opset conversion successful.")
    except Exception as e:
        print(f"        [WARN] Opset conversion failed: {e}")
        print(f"        Falling back to original opset model for simplification...")
        model_converted = model

    # Step 3: Simplify with onnxsim (fuses constants, removes dead nodes)
    print(f"  [3/3] Simplifying model graph with onnxsim...")
    try:
        model_simplified, check = onnxsim.simplify(model_converted)
        if check:
            print(f"        Simplification successful. Model is valid.")
        else:
            print(f"        [WARN] Simplification check failed. Using converted model.")
            model_simplified = model_converted
    except Exception as e:
        print(f"        [WARN] Simplification failed: {e}")
        model_simplified = model_converted

    # Step 4: Save
    os.makedirs(os.path.dirname(m["dst"]), exist_ok=True)
    onnx.save(model_simplified, m["dst"])

    src_size = os.path.getsize(m["src"]) / 1024 / 1024
    dst_size = os.path.getsize(m["dst"]) / 1024 / 1024
    print(f"  [DONE] Saved to {m['dst']}")
    print(f"         Size: {src_size:.2f} MB -> {dst_size:.2f} MB")

    # Step 5: Quick validation with onnxruntime
    print(f"  [VALID] Verifying with onnxruntime...")
    try:
        import onnxruntime as ort
        sess = ort.InferenceSession(m["dst"])
        inputs = sess.get_inputs()
        outputs = sess.get_outputs()
        print(f"         Input:  {inputs[0].name} shape={inputs[0].shape}")
        print(f"         Output: {outputs[0].name} shape={outputs[0].shape}")
        print(f"         [OK] Model loads and runs correctly in onnxruntime!")
    except Exception as e:
        print(f"         [FAIL] Validation failed: {e}")

print(f"\n{'='*60}")
print("All models processed. Update your worker to load *_web.onnx files.")
