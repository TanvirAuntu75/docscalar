import os
import shutil
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

# Paths
custom_rec = r"backend/models/ocr/rec"
handwriting_dir = os.path.join(custom_rec, "handwriting")
multilingual_dir = os.path.join(custom_rec, "multilingual")
public_models = r"public/models"

# Source files to clean and quantize
models_to_process = [
    # (Source path, Destination path)
    (os.path.join(custom_rec, "rec_handwriting .onnx"), os.path.join(custom_rec, "rec_handwriting.onnx")),
    (os.path.join(custom_rec, "rec_multilingual.onnx"), os.path.join(custom_rec, "rec_multilingual.onnx")),
    (os.path.join(public_models, "rec_handwriting.onnx"), os.path.join(public_models, "rec_handwriting.onnx")),
    (os.path.join(public_models, "rec_handwriting_web.onnx"), os.path.join(public_models, "rec_handwriting_web.onnx")),
    (os.path.join(public_models, "rec_multilingual.onnx"), os.path.join(public_models, "rec_multilingual.onnx")),
    (os.path.join(public_models, "rec_multilingual_web.onnx"), os.path.join(public_models, "rec_multilingual_web.onnx"))
]

def clean_and_quantize(src_path, dest_path):
    if not os.path.exists(src_path):
        print(f"Skipping: {src_path} does not exist.")
        return
        
    bak_path = dest_path + ".bak"
    temp_conv = dest_path + ".conv_init"
    temp_quant = dest_path + ".quant"
    
    # 1. Back up original to .onnx.bak
    print(f"Backing up {src_path} to {bak_path}")
    shutil.copy2(src_path, bak_path)
    
    # 2. Convert Constant nodes to Initializers
    print(f"Converting Constants to Initializers for {dest_path}...")
    model = onnx.load(bak_path)
    nodes_to_remove = []
    for node in list(model.graph.node):
        if node.op_type == "Constant":
            tensor = None
            for attr in node.attribute:
                if attr.name == "value":
                    tensor = attr.t
                    break
            if tensor is not None:
                tensor.name = node.output[0]
                model.graph.initializer.append(tensor)
                nodes_to_remove.append(node)
                
    for node in nodes_to_remove:
        model.graph.node.remove(node)
        
    onnx.save(model, temp_conv)
    
    # 3. Run Dynamic Quantization to INT8
    print(f"Quantizing {dest_path} to INT8...")
    quantize_dynamic(
        model_input=temp_conv,
        model_output=temp_quant,
        weight_type=QuantType.QUInt8
    )
    
    # 4. Cleanup temporary files and overwrite dest_path
    if os.path.exists(dest_path):
        os.remove(dest_path)
    shutil.move(temp_quant, dest_path)
    
    if os.path.exists(temp_conv):
        os.remove(temp_conv)
        
    # If the source file was the one with the trailing space, delete it to clean up the space!
    if src_path != dest_path and os.path.exists(src_path):
        os.remove(src_path)
        
    orig_size = os.path.getsize(bak_path) / (1024 * 1024)
    quant_size = os.path.getsize(dest_path) / (1024 * 1024)
    print(f"Finished {os.path.basename(dest_path)}: {orig_size:.2f} MB -> {quant_size:.2f} MB (Saved {orig_size - quant_size:.2f} MB)\n")

def main():
    print("Starting Post-Training Quantization for all OCR models...\n")
    
    # Process all models
    for src, dest in models_to_process:
        clean_and_quantize(src, dest)
        
    # Synchronize the active backend directories
    print("Synchronizing active backend subdirectories...")
    
    h_src = os.path.join(custom_rec, "rec_handwriting.onnx")
    h_dest = os.path.join(handwriting_dir, "inference.onnx")
    if os.path.exists(h_src):
        shutil.copy2(h_src, h_dest)
        print(f"Copied {h_src} -> {h_dest}")
        
    m_src = os.path.join(custom_rec, "rec_multilingual.onnx")
    m_dest = os.path.join(multilingual_dir, "inference.onnx")
    if os.path.exists(m_src):
        shutil.copy2(m_src, m_dest)
        print(f"Copied {m_src} -> {m_dest}")
        
    print("\nAll models successfully quantized and synchronized!")

if __name__ == "__main__":
    main()
