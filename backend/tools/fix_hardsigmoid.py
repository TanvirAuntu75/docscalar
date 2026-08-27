"""
fix_hardsigmoid.py
Replaces all HardSigmoid nodes in the ONNX model with
equivalent Mul + Add + Clip operations that onnxruntime-web supports.

HardSigmoid(x, alpha=0.2, beta=0.5) == Clip(alpha * x + beta, 0.0, 1.0)

Run:
  .venv\\Scripts\\python fix_hardsigmoid.py
"""

import os

import numpy as np
import onnx
import onnx.numpy_helper
from onnx import helper, numpy_helper

MODELS = [
    (
        "public/models/rec_handwriting_web.onnx",
        "public/models/rec_handwriting_web.onnx",
    ),
    (
        "public/models/rec_multilingual_web.onnx",
        "public/models/rec_multilingual_web.onnx",
    ),
]


def replace_hardsigmoid(model):
    """Walk the graph and replace every HardSigmoid node with Mul+Add+Clip."""
    graph = model.graph
    new_nodes = []
    new_initializers = list(graph.initializer)
    replaced = 0

    for node in graph.node:
        if node.op_type != "HardSigmoid":
            new_nodes.append(node)
            continue

        replaced += 1
        inp = node.input[0]
        out = node.output[0]

        # Read alpha/beta attributes (defaults per ONNX spec)
        alpha = 0.2
        beta = 0.5
        for attr in node.attribute:
            if attr.name == "alpha":
                alpha = attr.f
            elif attr.name == "beta":
                beta = attr.f

        # Create scalar constant tensors for alpha and beta
        alpha_name = f"__hs_alpha_{replaced}__"
        beta_name = f"__hs_beta_{replaced}__"

        alpha_tensor = numpy_helper.from_array(
            np.array([alpha], dtype=np.float32), name=alpha_name
        )
        beta_tensor = numpy_helper.from_array(
            np.array([beta], dtype=np.float32), name=beta_name
        )
        new_initializers.append(alpha_tensor)
        new_initializers.append(beta_tensor)

        mul_out = f"__hs_mul_{replaced}__"
        add_out = f"__hs_add_{replaced}__"

        # Mul: y = x * alpha
        mul_node = helper.make_node(
            "Mul",
            inputs=[inp, alpha_name],
            outputs=[mul_out],
            name=f"__hs_mul_node_{replaced}__",
        )

        # Add: z = y + beta
        add_node = helper.make_node(
            "Add",
            inputs=[mul_out, beta_name],
            outputs=[add_out],
            name=f"__hs_add_node_{replaced}__",
        )

        # Clip: out = clip(z, 0, 1)
        clip_min_name = f"__hs_clip_min_{replaced}__"
        clip_max_name = f"__hs_clip_max_{replaced}__"
        clip_min = numpy_helper.from_array(
            np.array([0.0], dtype=np.float32), name=clip_min_name
        )
        clip_max = numpy_helper.from_array(
            np.array([1.0], dtype=np.float32), name=clip_max_name
        )
        new_initializers.append(clip_min)
        new_initializers.append(clip_max)

        clip_node = helper.make_node(
            "Clip",
            inputs=[add_out, clip_min_name, clip_max_name],
            outputs=[out],
            name=f"__hs_clip_node_{replaced}__",
        )

        new_nodes.extend([mul_node, add_node, clip_node])
        print(f"  Replaced HardSigmoid node '{node.name}' (alpha={alpha}, beta={beta})")

    # Rebuild the graph with patched nodes and new initializers
    new_graph = helper.make_graph(
        new_nodes,
        graph.name,
        list(graph.input),
        list(graph.output),
        initializer=new_initializers,
    )

    new_model = helper.make_model(new_graph, opset_imports=model.opset_import)
    new_model.ir_version = model.ir_version
    return new_model, replaced


for src, dst in MODELS:
    print(f"\nProcessing: {src}")
    if not os.path.exists(src):
        print("  SKIP - file not found")
        continue

    model = onnx.load(src)
    fixed_model, count = replace_hardsigmoid(model)
    print(f"  Total HardSigmoid nodes replaced: {count}")

    if count == 0:
        print("  No HardSigmoid nodes found - model already compatible!")

    # Validate with onnx checker
    onnx.checker.check_model(fixed_model)
    print("  ONNX checker passed.")

    onnx.save(fixed_model, dst)
    print(f"  Saved: {dst} ({os.path.getsize(dst) / 1024 / 1024:.2f} MB)")

    # Validate with onnxruntime
    import onnxruntime as ort

    sess = ort.InferenceSession(dst)
    print(f"  onnxruntime validation OK - input: {sess.get_inputs()[0].shape}")

print(
    "\nDone! All HardSigmoid operators removed. Models are now onnxruntime-web compatible."
)
