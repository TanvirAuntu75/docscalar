import os
import sys
import argparse

def get_file_size_mb(path):
    return os.path.getsize(path) / (1024 * 1024)

def main():
    parser = argparse.ArgumentParser(
        description="Compress FP32 ONNX models (like PaddleOCR recognition models) to INT8 using ONNX Runtime Quantization."
    )
    parser.add_argument("-i", "--input", required=True, help="Path to the input FP32 ONNX model file")
    parser.add_argument("-o", "--output", required=True, help="Path to save the output quantized INT8 ONNX model file")
    parser.add_argument(
        "--type", 
        choices=["uint8", "int8"], 
        default="uint8", 
        help="Weight type for quantization (default: uint8)"
    )

    args = parser.parse_args()

    input_path = os.path.abspath(args.input)
    output_path = os.path.abspath(args.output)

    if not os.path.exists(input_path):
        print(f"Error: Input file '{input_path}' does not exist.")
        sys.exit(1)

    print("Checking dependencies...")
    try:
        import onnx
        from onnxruntime.quantization import quantize_dynamic, QuantType
    except ImportError:
        print("Error: Required packages 'onnx' or 'onnxruntime' are not installed.")
        print("Please install them by running: pip install onnx onnxruntime")
        sys.exit(1)

    print(f"Input model: {input_path} ({get_file_size_mb(input_path):.2f} MB)")
    print("Quantizing weights... (this might take a few moments depending on model size)")

    weight_type = QuantType.QUInt8 if args.type == "uint8" else QuantType.QInt8

    try:
        quantize_dynamic(
            model_input=input_path,
            model_output=output_path,
            weight_type=weight_type
        )
        
        if os.path.exists(output_path):
            input_sz = get_file_size_mb(input_path)
            output_sz = get_file_size_mb(output_path)
            reduction = (1 - (output_sz / input_sz)) * 100
            
            print("\nQuantization successfully completed!")
            print(f"Output model: {output_path} ({output_sz:.2f} MB)")
            print(f"Size reduction: {reduction:.2f}% (Saved {input_sz - output_sz:.2f} MB)")
            print("\nTo deploy this to DocForge, rename this file and place it in the appropriate model directory.")
        else:
            print("Error: Quantization finished but output file was not created.")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error during quantization: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
