"""
Download Script for all-MiniLM-L6-v2
------------------------------------
Downloads the quantized all-MiniLM-L6-v2 ONNX model files from Hugging Face
and saves them to the public/models directory for offline-ready, local inference.
"""
import os
import urllib.request

MODEL_DIR = os.path.join("public", "models", "Xenova", "all-MiniLM-L6-v2")
ONNX_DIR = os.path.join(MODEL_DIR, "onnx")

FILES_TO_DOWNLOAD = {
    "config.json": "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/config.json",
    "tokenizer.json": "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer.json",
    "tokenizer_config.json": "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/tokenizer_config.json",
    "special_tokens_map.json": "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/special_tokens_map.json",
    "onnx/model_quantized.onnx": "https://huggingface.co/Xenova/all-MiniLM-L6-v2/resolve/main/onnx/model_quantized.onnx"
}

def main():
    print("Creating directories...")
    os.makedirs(ONNX_DIR, exist_ok=True)
    
    for relative_path, url in FILES_TO_DOWNLOAD.items():
        destination = os.path.join(MODEL_DIR, relative_path.replace("/", os.sep))
        print(f"Downloading {relative_path} from {url}...")
        
        # Simple download helper with progress
        try:
            def report_hook(block_num, block_size, total_size):
                read_so_far = block_num * block_size
                if total_size > 0:
                    percent = read_so_far * 1e2 / total_size
                    print(f"\rProgress: {percent:.1f}%", end="")
                else:
                    print(f"\rDownloaded {read_so_far} bytes", end="")
            
            urllib.request.urlretrieve(url, destination, reporthook=report_hook)
            print("\nDownload complete.")
        except Exception as e:
            print(f"\nError downloading {relative_path}: {e}")
            
    print("\nAll model files downloaded successfully!")

if __name__ == "__main__":
    main()
