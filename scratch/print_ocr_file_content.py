import inspect
from paddleocr import PaddleOCR

# Print lines 50 to 180 of ocr.py
source = inspect.getsource(PaddleOCR.__init__)
print(source[1400:3000])
