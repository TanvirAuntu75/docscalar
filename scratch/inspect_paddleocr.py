import inspect
from paddleocr import PaddleOCR

sig = inspect.signature(PaddleOCR.__init__)
print("PaddleOCR constructor signature:")
for name, param in sig.parameters.items():
    print(f"  {name}: {param.default}")
