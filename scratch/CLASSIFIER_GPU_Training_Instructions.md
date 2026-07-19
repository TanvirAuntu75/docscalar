# Google Colab GPU Intent Classifier Training Guide

This guide details how to run the newly created probabilistic dataset generator and PyTorch training loop on Google Colab using a GPU (e.g. T4) to compile your upgraded `classifier_weights.json`.

---

## Step 1: Set up Google Colab
1. Open [Google Colab](https://colab.research.google.com/).
2. Create a **New Notebook**.
3. Enable GPU acceleration:
   - Go to **Runtime** > **Change runtime type**.
   - Select **T4 GPU** (or any available GPU).
   - Click **Save**.

---

## Step 2: Upload the Training Script
1. Look at the files sidebar in Google Colab (the folder icon on the left).
2. Click **Upload to session storage** (the paperclip/upload icon).
3. Upload `train_intent_classifier_gpu.py` from your local machine's project folder:
   `c:\Users\Tanvir Alam\Downloads\New folder upscaled\scratch\train_intent_classifier_gpu.py`

---

## Step 3: Run the Training
Create a new code cell in your Colab notebook, paste the following shell command, and run it:

```bash
!python train_intent_classifier_gpu.py
```

### What this will do:
1. Automatically verifies CUDA availability (should print `CUDA Available: True`).
2. Programmatically synthesizes **175,500 unique sentences** covering:
   - Conversational tool phrases
   - Multi-document index targets (e.g. `5th and 1st`, `all except the 2nd`)
   - Nested criss-cross pipelines (e.g. `4th and 3rd merged`)
   - Canvas actions (e.g. `undo`, `redo`, `clear`) mapped to `unknown` to resolve conflicts.
3. Pre-calculates global TF-IDF vectors in CPU memory to avoid GPU string-transfer bottlenecks.
4. Feeds vectors to a PyTorch Logistic Regression classifier on GPU over **15 epochs** using an optimized Adam optimizer.
5. Performs sparse weights pruning (threshold `0.03`) to save browser VRAM and packages the weights into a clean `classifier_weights.json` file.
6. The training finishes in **under 15 seconds**!

---

## Step 4: Download and Install
1. Refresh the Colab files panel.
2. You will see a folder named `src/utils/` created inside your session storage containing `classifier_weights.json`.
3. Hover over `classifier_weights.json`, click the three dots, and select **Download**.
4. Move this downloaded file into your local project workspace:
   `c:\Users\Tanvir Alam\Downloads\New folder upscaled\src\utils\classifier_weights.json`

Once replaced, run `npm run dev` to launch. The app will immediately load and run on the updated model weights!
