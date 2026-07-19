"""
fix_hardsigmoid_v2.py
Replaces HardSigmoid nodes IN-PLACE without rebuilding the graph.
This preserves ALL original shape metadata / value_info / doc_strings.

HardSigmoid(x, alpha, beta) == Clip(alpha*x + beta, 0, 1)
"""
import onnx
import onnx.numpy_helper as nph
from onnx import helper, numpy_helper
import numpy as np, os, copy

MODELS = [
    ("public/models/rec_handwriting_web.onnx",  "public/models/rec_handwriting_web.onnx"),
    ("public/models/rec_multilingual_web.onnx", "public/models/rec_multilingual_web.onnx"),
]


def patch_inplace(model):
    graph = model.graph
    replaced = 0

    # Collect existing node indices to replace
    nodes_to_remove = []
    nodes_to_insert = []   # (index, [new_nodes])
    new_inits = []

    for idx, node in enumerate(graph.node):
        if node.op_type != "HardSigmoid":
            continue

        replaced += 1
        inp = node.input[0]
        out = node.output[0]

        alpha = 0.16666667
        beta  = 0.5
        for a in node.attribute:
            if a.name == "alpha": alpha = a.f
            if a.name == "beta":  beta  = a.f

        pfx = f"_hs{replaced}_"

        # Scalar initializer tensors
        a_t = nph.from_array(np.array([alpha], np.float32), name=pfx+"alpha")
        b_t = nph.from_array(np.array([beta],  np.float32), name=pfx+"beta")
        mn_t= nph.from_array(np.array([0.0],   np.float32), name=pfx+"min")
        mx_t= nph.from_array(np.array([1.0],   np.float32), name=pfx+"max")
        new_inits += [a_t, b_t, mn_t, mx_t]

        mul = helper.make_node("Mul", [inp, pfx+"alpha"], [pfx+"mul"])
        add = helper.make_node("Add", [pfx+"mul", pfx+"beta"], [pfx+"add"])
        clp = helper.make_node("Clip", [pfx+"add", pfx+"min", pfx+"max"], [out])

        nodes_to_remove.append(idx)
        nodes_to_insert.append((idx, [mul, add, clp]))
        print(f"  HardSigmoid at index {idx} (alpha={alpha:.4f}, beta={beta}) -> Mul+Add+Clip")

    # Apply replacements in reverse order so indices stay valid
    for idx, new_nodes in reversed(nodes_to_insert):
        del graph.node[idx]
        for ni, n in enumerate(new_nodes):
            graph.node.insert(idx + ni, n)

    # Add new scalar initializers
    for t in new_inits:
        graph.initializer.append(t)

    return model, replaced


for src, dst in MODELS:
    print(f"\nProcessing: {src}")
    if not os.path.exists(src):
        print("  SKIP - not found")
        continue

    model = onnx.load(src)

    # Print current input shape BEFORE patching
    for inp in model.graph.input:
        dims = [d.dim_value if d.dim_value != 0 else d.dim_param if d.dim_param else "?"
                for d in inp.type.tensor_type.shape.dim]
        print(f"  Input before patch: {inp.name} {dims}")

    model, count = patch_inplace(model)
    print(f"  Replaced {count} HardSigmoid nodes")

    # Print input shape AFTER patching
    for inp in model.graph.input:
        dims = [d.dim_value if d.dim_value != 0 else d.dim_param if d.dim_param else "?"
                for d in inp.type.tensor_type.shape.dim]
        print(f"  Input after patch:  {inp.name} {dims}")

    onnx.checker.check_model(model)
    print("  ONNX checker passed")

    onnx.save(model, dst)
    print(f"  Saved {dst} ({os.path.getsize(dst)/1024/1024:.2f} MB)")

    import onnxruntime as ort
    sess = ort.InferenceSession(dst)
    inp_meta = sess.get_inputs()[0]
    print(f"  onnxruntime input: {inp_meta.name} shape={inp_meta.shape}")
    import numpy as np
    dummy = np.random.randn(1, 3, 48, 320).astype(np.float32)
    out = sess.run(None, {inp_meta.name: dummy})
    print(f"  Inference test [1,3,48,320] -> output {out[0].shape} - PASSED")

print("\nDone.")
