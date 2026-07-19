import inspect
import paddleocr

print("paddleocr module file:", paddleocr.__file__)
try:
    from paddleocr import PaddleOCR
    print("PaddleOCR class file:", inspect.getfile(PaddleOCR))
except Exception as e:
    print("Error getting source file:", e)
