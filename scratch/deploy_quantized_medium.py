import os
import shutil
import onnx
from onnxruntime.quantization import quantize_dynamic, QuantType

home_dir = os.path.expanduser("~")
medium_onnx_dir = os.path.join(home_dir, ".paddlex", "official_models", "PP-OCRv6_medium_rec_onnx")
medium_model = os.path.join(medium_onnx_dir, "inference.onnx")

custom_rec = r"backend/models/ocr/rec"
handwriting_dir = os.path.join(custom_rec, "handwriting")
public_models = r"public/models"

def main():
    if os.path.exists(medium_model):
        bak_path = medium_model + ".bak"
        temp_conv = medium_model + ".conv_init"
        temp_quant = medium_model + ".quant"
        
        # 1. Back up original to .onnx.bak
        print(f"Backing up {medium_model} to {bak_path}")
        shutil.copy2(medium_model, bak_path)
        
        # 2. Convert Constant nodes to Initializers
        print("Converting Constants to Initializers...")
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
        
        # 3. Quantize
        print("Quantizing to INT8...")
        quantize_dynamic(
            model_input=temp_conv,
            model_output=temp_quant,
            weight_type=QuantType.QUInt8
        )
        
        # 4. Overwrite cached model
        if os.path.exists(medium_model):
            os.remove(medium_model)
        shutil.move(temp_quant, medium_model)
        
        if os.path.exists(temp_conv):
            os.remove(temp_conv)
            
        print("Medium model successfully quantized in-place in cache folder.")
        
        # 5. Distribute the quantized model to the project folders
        dests = [
            os.path.join(custom_rec, "rec_handwriting.onnx"),
            os.path.join(handwriting_dir, "inference.onnx"),
            os.path.join(public_models, "rec_handwriting.onnx"),
            os.path.join(public_models, "rec_handwriting_web.onnx")
        ]
        
        for dest in dests:
            # Backup original destination if it exists and doesn't have a backup yet
            if os.path.exists(dest):
                dest_bak = dest + ".bak"
                if not os.path.exists(dest_bak):
                    print(f"Backing up destination {dest} to {dest_bak}")
                    shutil.copy2(dest, dest_bak)
                os.remove(dest)
                
            print(f"Copying quantized model to {dest}")
            shutil.copy2(medium_model, dest)
            
        print("\nQuantized medium model successfully deployed to all backend and frontend paths!")
    else:
        print(f"Error: Medium model not found at {medium_model}")

if __name__ == "__main__":
    main()
