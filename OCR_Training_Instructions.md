# Google Colab PaddleOCR Training Guide

This guide will walk you through training your custom PaddleOCR text recognition model using the 3 datasets you uploaded to Google Drive: `handwriting.zip`, `tables.zip`, and `distorted_text.zip`.

---

## Step 1: Set up Google Colab
1. Go to [Google Colab](https://colab.research.google.com/).
2. Click **New Notebook**.
3. Change the runtime to use a GPU:
   - Go to **Runtime** > **Change runtime type**.
   - Select **T4 GPU** (under Hardware accelerator).
   - Click **Save**.

---

## Step 2: Run Setup Code
Create a code cell in Colab, paste the following code, and run it. This installs PaddlePaddle with GPU support and clones the PaddleOCR code repository directly onto Google's servers.

```python
# 1. Install PaddlePaddle with GPU support
!pip install paddlepaddle-gpu -i https://pypi.tuna.tsinghua.edu.cn/simple

# 2. Clone the PaddleOCR GitHub repository
!git clone https://github.com/PaddlePaddle/PaddleOCR.git
%cd PaddleOCR

# 3. Install other required packages
!pip install -r requirements.txt
!pip install paddle2onnx
```

---

## Step 3: Mount Google Drive & Extract Data
Create a new code cell and run this to connect to your Google Drive and unzip the datasets.

```python
from google.colab import drive
import os

# 1. Mount Google Drive
drive.mount('/content/drive')

# 2. Create local directory for raw data
!mkdir -p /content/data

# 3. Extract the 3 datasets from your Google Drive (assuming folder name is OCR_Training)
print("Extracting datasets...")
!unzip -q "/content/drive/MyDrive/OCR_Training/handwriting.zip" -d /content/data/handwriting
!unzip -q "/content/drive/MyDrive/OCR_Training/tables.zip" -d /content/data/tables
!unzip -q "/content/drive/MyDrive/OCR_Training/distorted_text.zip" -d /content/data/distorted_text
print("Extraction complete!")
```

---

## Step 4: Format Annotations for PaddleOCR
PaddleOCR expects annotation files where each line is formatted as:
`image_path\ttext_label`

Create a new code cell and run this script to automatically parse the files, split them into 90% Training and 10% Validation, and write the labels files:

```python
import os
import glob
import random

train_lines = []
val_lines = []

# --- 1. Distorted Synthetic Text ---
distorted_dir = "/content/data/distorted_text"
if os.path.exists(distorted_dir):
    # Try looking for a labels file or extract labels from filenames (e.g. 0_hello.png)
    label_file = os.path.join(distorted_dir, "labels.txt")
    if os.path.exists(label_file):
        with open(label_file, 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split('\t')
                if len(parts) == 2:
                    img_name, label = parts
                    full_path = os.path.join(distorted_dir, img_name)
                    if os.path.exists(full_path):
                        train_lines.append(f"{full_path}\t{label}")
    else:
        # Fallback to filename parsing
        for img_path in glob.glob(os.path.join(distorted_dir, "*.*")):
            basename = os.path.basename(img_path)
            if "_" in basename:
                label = basename.split("_", 1)[1].rsplit(".", 1)[0]
                train_lines.append(f"{img_path}\t{label}")

# --- 2. Handwriting Dataset ---
handwriting_dir = "/content/data/handwriting"
if os.path.exists(handwriting_dir):
    # IAM datasets usually have a label file, check for text files or labels.txt
    labels_path = glob.glob(os.path.join(handwriting_dir, "*.txt")) + glob.glob(os.path.join(handwriting_dir, "*.csv"))
    if labels_path:
        with open(labels_path[0], 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split('\t')
                if len(parts) == 2:
                    img_name, label = parts
                    full_path = os.path.join(handwriting_dir, img_name)
                    if os.path.exists(full_path):
                        train_lines.append(f"{full_path}\t{label}")

# --- 3. Tables Dataset ---
tables_dir = "/content/data/tables"
if os.path.exists(tables_dir):
    labels_path = glob.glob(os.path.join(tables_dir, "*.txt"))
    if labels_path:
        with open(labels_path[0], 'r', encoding='utf-8') as f:
            for line in f:
                parts = line.strip().split('\t')
                if len(parts) == 2:
                    img_name, label = parts
                    full_path = os.path.join(tables_dir, img_name)
                    if os.path.exists(full_path):
                        train_lines.append(f"{full_path}\t{label}")

# Shuffle and split (90% training, 10% validation)
random.seed(42)
random.shuffle(train_lines)
split_idx = int(len(train_lines) * 0.9)
val_lines = train_lines[split_idx:]
train_lines = train_lines[:split_idx]

print(f"Total training samples: {len(train_lines)}")
print(f"Total validation samples: {len(val_lines)}")

# Save list files
with open("/content/PaddleOCR/train_list.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(train_lines))

with open("/content/PaddleOCR/val_list.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(val_lines))

print("Created train_list.txt and val_list.txt successfully!")
```

---

## Step 5: Download Pre-trained Weights
Download the pre-trained PP-OCRv4 English recognition weights so we don't train from scratch:

```python
# Download pre-trained English recognition weights
!wget -P ./pretrain_models/ https://paddleocr.bj.bcebos.com/PP-OCRv4/english/en_PP-OCRv4_rec_train.tar
%cd ./pretrain_models/
!tar -xf en_PP-OCRv4_rec_train.tar
%cd ..
```

---

## Step 6: Configure Training YAML
We need to update the configuration file `configs/rec/PP-OCRv4/en_PP-OCRv4_rec.yml` to point to our newly generated datasets. Execute this Python script in Colab to configure the file:

```python
import yaml

config_path = "configs/rec/PP-OCRv4/en_PP-OCRv4_mobile_rec.yml"

with open(config_path, 'r', encoding='utf-8') as f:
    config = yaml.safe_load(f)

# Update parameters
config['Global']['pretrained_model'] = './pretrain_models/en_PP-OCRv4_rec_train/best_accuracy'
config['Global']['epoch_num'] = 30  # Fine-tune for 30 epochs to maximize accuracy
config['Global']['save_epoch_step'] = 2
config['Global']['eval_epoch_step'] = 1

# Update train dataset path
config['Train']['dataset']['data_dir'] = '/'
config['Train']['dataset']['label_file_list'] = ['/content/PaddleOCR/train_list.txt']

# Update validation dataset path
config['Eval']['dataset']['data_dir'] = '/'
config['Eval']['dataset']['label_file_list'] = ['/content/PaddleOCR/val_list.txt']

# Write configuration back
with open(config_path, 'w', encoding='utf-8') as f:
    yaml.dump(config, f, default_flow_style=False)

print("Updated config YAML file successfully!")
```

---

## Step 7: Train the Model
Run the fine-tuning process. This might take anywhere from 10 to 45 minutes depending on the size of your datasets:

```python
!python tools/train.py -c configs/rec/PP-OCRv4/en_PP-OCRv4_mobile_rec.yml
```

---

## Step 8: Export the Model to ONNX
Export the trained model to Paddle inference format, and then convert it to ONNX so it can run inside DocForge.

```python
# 1. Export trained model to inference format
!python tools/export_model.py \
    -c configs/rec/PP-OCRv4/en_PP-OCRv4_mobile_rec.yml \
    -o Global.pretrained_model=output/rec_ppocr_v4/best_accuracy \
    Global.save_inference_dir=./inference/rec/

# 2. Convert Paddle model to ONNX format
!paddle2onnx \
    --model_dir ./inference/rec/ \
    --model_filename inference.pdmodel \
    --params_filename inference.pdiparams \
    --save_file ./inference/rec/model.onnx \
    --opset_version 11 \
    --enable_onnx_checker True

# 3. Copy the ONNX model files back to your Google Drive
!mkdir -p /content/drive/MyDrive/OCR_Training/custom_rec
!cp -r ./inference/rec/* /content/drive/MyDrive/OCR_Training/custom_rec/
print("ONNX model exported and saved to Google Drive under 'OCR_Training/custom_rec'!")
```

---

## Step 9: Install the Custom Model in DocForge
1. Once Colab finishes and saves the model, open your Google Drive.
2. Go to `OCR_Training/custom_rec/` and download all files inside it.
3. Put those files (specifically `model.onnx`) into the folder in your project workspace:
   `c:\Users\Tanvir Alam\Downloads\New folder upscaled\backend\models\ocr\rec\`
4. The local DocForge app will automatically detect and load your custom fine-tuned model!
