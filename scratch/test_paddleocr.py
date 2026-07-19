import sys
import os
os.environ["FLAGS_use_mkldnn"] = "0"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
import cv2
import numpy as np

def test_paddleocr():
    try:
        from paddleocr import PaddleOCR
        import paddle
        print("Import successful!")
        gpu_available = paddle.device.is_compiled_with_cuda()
        print(f"GPU available: {gpu_available}")
        
        # Load reader
        print("Loading PaddleOCR reader...")
        paddle.set_device('gpu' if gpu_available else 'cpu')
        reader = PaddleOCR(use_textline_orientation=True, lang='en')
        print("Reader loaded successfully!")
        
        # Create a dummy white image with some text
        img = np.ones((300, 800, 3), dtype=np.uint8) * 255
        cv2.putText(img, "DocForge OCR Stress Test 1.442 deg", (50, 150), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
        
        # Ensure scratch directory exists in workspace
        os.makedirs("scratch", exist_ok=True)
        img_path = "scratch/dummy_test_paddle.png"
        cv2.imwrite(img_path, img)
        print(f"Created test image at: {img_path}")
        
        print("Running OCR on dummy image (numpy array)...")
        results = reader.predict(img)
        print("Raw results received.")
        
        if results and results[0] and 'rec_texts' in results[0]:
            print("\nDetections:")
            res_dict = results[0]
            for i in range(len(res_dict['rec_texts'])):
                text = res_dict['rec_texts'][i]
                score = res_dict['rec_scores'][i]
                bbox = res_dict['rec_polys'][i]
                print(f"Detected: '{text}' | Conf: {score:.4f} | BBox: {bbox.tolist()}")
        else:
            print("\nNo text detected.")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_paddleocr()
