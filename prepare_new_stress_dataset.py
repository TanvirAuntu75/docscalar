import os
import random
import yaml
import fitz  # PyMuPDF
import cv2
import numpy as np

# 1. Paths
pdf_path = "/content/drive/MyDrive/OCR_Training/stress_excel_for_pdf_tool.pdf"
output_dir = "/content/train_data/stress_excel"
crops_dir = os.path.join(output_dir, "crops")
os.makedirs(crops_dir, exist_ok=True)

if not os.path.exists(pdf_path):
    raise FileNotFoundError(f"Source PDF not found at {pdf_path}. Please verify Google Drive is mounted and the path exists.")

# 2. Extract and crop text lines
print("Opening PDF and starting image extraction...")
doc = fitz.open(pdf_path)
lines = []
unique_chars = set()

# Render pages at 300 DPI for high-resolution text line images (matches OCR expectations)
zoom = 300 / 72.0
mat = fitz.Matrix(zoom, zoom)

for page_idx in range(len(doc)):
    page = doc.load_page(page_idx)
    pix = page.get_pixmap(matrix=mat)
    
    # Convert pixmap to numpy BGR image
    img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.h, pix.w, pix.n)
    if pix.n == 4:
        img = cv2.cvtColor(img_data, cv2.COLOR_RGBA2BGR)
    elif pix.n == 3:
        img = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
    else:
        img = cv2.cvtColor(img_data, cv2.COLOR_GRAY2BGR)
        
    img_h, img_w = img.shape[:2]
    pdf_w, pdf_h = float(page.rect.width), float(page.rect.height)
    scale_x = img_w / pdf_w
    scale_y = img_h / pdf_h
    
    # Extract structural dict containing individual spans
    text_dict = page.get_text("dict")
    line_idx = 0
    
    for block in text_dict.get("blocks", []):
        for line in block.get("lines", []):
            line_text = "".join([span["text"] for span in line.get("spans", [])]).strip()
            if not line_text:
                continue
                
            # Collect unique characters for custom dictionary building
            for char in line_text:
                unique_chars.add(char)
                
            # Scale coordinates and crop
            bbox = line["bbox"]  # (x0, y0, x1, y1)
            
            ix0 = int(round(bbox[0] * scale_x))
            iy0 = int(round(bbox[1] * scale_y))
            ix1 = int(round(bbox[2] * scale_x))
            iy1 = int(round(bbox[3] * scale_y))
            
            # Apply padding to prevent character clipping (very important for OCR accuracy!)
            pad_y = 3
            pad_x = 4
            ix0_pad = max(0, ix0 - pad_x)
            iy0_pad = max(0, iy0 - pad_y)
            ix1_pad = min(img_w, ix1 + pad_x)
            iy1_pad = min(img_h, iy1 + pad_y)
            
            crop = img[iy0_pad:iy1_pad, ix0_pad:ix1_pad]
            
            if crop.size > 0:
                crop_name = f"page_{page_idx+1:03d}_line_{line_idx:04d}.png"
                crop_path = os.path.join(crops_dir, crop_name)
                cv2.imwrite(crop_path, crop)
                
                # Record line details (Format: relative_path\tlabel)
                relative_path = f"crops/{crop_name}"
                lines.append(f"{relative_path}\t{line_text}")
                line_idx += 1
                
    print(f"  Processed Page {page_idx+1}/{len(doc)}: Extracted {line_idx} text lines.")

doc.close()

# 3. Create Custom Character Dictionary
dict_dir = "/content/PaddleOCR/ppocr/utils"
os.makedirs(dict_dir, exist_ok=True)
dict_path = os.path.join(dict_dir, "custom_dict.txt")

with open(dict_path, "w", encoding="utf-8") as f:
    for char in sorted(list(unique_chars)):
        f.write(f"{char}\n")
print(f"\nCreated custom_dict.txt with {len(unique_chars)} unique characters.")

# 4. Shuffle and split datasets (95% Train, 5% Validation)
random.seed(42)
random.shuffle(lines)
split_idx = int(len(lines) * 0.95)
train_lines = lines[:split_idx]
val_lines = lines[split_idx:]

with open("/content/PaddleOCR/train_list.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(train_lines))

with open("/content/PaddleOCR/val_list.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(val_lines))

print(f"Saved train_list.txt ({len(train_lines)} samples) and val_list.txt ({len(val_lines)} samples).")

# 5. Configure configs/rec/PP-OCRv4/en_PP-OCRv4_rec.yml
config_path = "/content/PaddleOCR/configs/rec/PP-OCRv4/en_PP-OCRv4_rec.yml"
with open(config_path, "r", encoding="utf-8") as f:
    config = yaml.safe_load(f)

# Update training config parameters to start from our previous best checkpoint
config["Global"]["pretrained_model"] = "/content/drive/MyDrive/OCR_Training/output/rec_ppocr_v4_stress_finetuned/latest"
config["Global"]["save_model_dir"] = "/content/drive/MyDrive/OCR_Training/output/rec_ppocr_v4_stress_finetuned_v2"
config["Global"]["epoch_num"] = 20  # Fine-tune for 20 epochs
config["Global"]["save_epoch_step"] = 1
config["Global"]["eval_epoch_step"] = 1
config["Global"]["character_dict_path"] = "ppocr/utils/custom_dict.txt"

# Enable Automatic Mixed Precision (AMP) for faster training
config["Global"]["use_amp"] = True
config["Global"]["amp_level"] = "O1"

# Set data loaders
config["Train"]["dataset"]["data_dir"] = "/content/train_data/stress_excel"
config["Train"]["dataset"]["label_file_list"] = ["/content/PaddleOCR/train_list.txt"]

config["Eval"]["dataset"]["data_dir"] = "/content/train_data/stress_excel"
config["Eval"]["dataset"]["label_file_list"] = ["/content/PaddleOCR/val_list.txt"]

with open(config_path, "w", encoding="utf-8") as f:
    yaml.dump(config, f, default_flow_style=False)

print("Configuration YAML successfully configured for progressive fine-tuning!")
