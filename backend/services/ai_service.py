import httpx
import os
from backend import config

# Target local AI server endpoints
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
# Specifically set default Ollama model to gemma-3-4b
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3") 

LM_STUDIO_URL = os.getenv("LM_STUDIO_URL", "http://localhost:1234/v1/chat/completions")

async def generate_ai_enhancement(text: str, mode: str, target_lang: str = None) -> str:
    """
    Generate document transformations using the local Google Gemma-3-4B model.
    Auto-detects active local servers:
      1. LM Studio (http://localhost:1234) loaded with Gemma-3-4B
      2. Ollama (http://localhost:11434) running imported Gemma-3-4B (gemma3)
      3. Fallback instructions
    """
    prompts = {
        "summarize": (
            "You are a professional assistant. Summarize the following document content clearly and concisely in bullet points using Google Gemma-3-4B capabilities. "
            "IMPORTANT: Output ONLY the bulleted summary. Do NOT include any introduction, conversational preamble, "
            "explanations, or closing remarks. Start directly with the summary:\n\n"
        ),
        "clean": (
            "You are a text formatter. Clean up the formatting of the following text. Fix spelling typos, correct broken paragraph breaks, and align the headings. "
            "IMPORTANT: Output ONLY the cleaned text. Do NOT include any introduction, conversational preamble, "
            "explanations, or closing remarks. Start directly with the cleaned text:\n\n"
        ),
        "translate": (
            "You are a professional translator. Translate the following text. If it is in English, translate to Bengali. If it is in Bengali, translate to English. "
            "IMPORTANT: Output ONLY the translated text. Do NOT include any introduction, conversational preamble, "
            "explanations, or closing remarks. Start directly with the translation:\n\n"
        ),
        "extract_tables": (
            "You are a data extraction assistant. Extract all data tables from the following text and output them in standard Markdown table format. "
            "IMPORTANT: Output ONLY the Markdown tables. Do NOT include any introduction, conversational preamble, "
            "explanations, or closing remarks. If there are no tables, output 'No tables found.' Start directly with the tables:\n\n"
        )
    }

    if mode == "translate" and target_lang:
        system_prompt = (
            f"You are a professional translator. Translate the following text strictly into {target_lang}. "
            "IMPORTANT: Output ONLY the translated text. Do NOT include any introduction, conversational preamble, "
            "explanations, or closing remarks. Start directly with the translation:\n\n"
        )
    else:
        system_prompt = prompts.get(mode, prompts["clean"])
        
    full_prompt = f"{system_prompt}{text}"

    # Step 1: Try LM Studio (Standard GGUF runner for desktop)
    try:
        payload = {
            "messages": [
                {"role": "user", "content": full_prompt}
            ],
            "temperature": 0.1,
            "stream": False
        }
        # Short connect timeout prevents stalling if LM Studio is offline
        async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=1.5)) as client:
            response = await client.post(LM_STUDIO_URL, json=payload, headers={"Content-Type": "application/json"})
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices:
                    return choices[0].get("message", {}).get("content", "Error: Empty response from LM Studio.")
    except (httpx.ConnectError, httpx.ConnectTimeout):
        # LM Studio is offline, proceed to check Ollama
        pass

    # Step 2: Try Ollama (runs dynamic model or fallback)
    try:
        active_model = OLLAMA_MODEL
        try:
            async with httpx.AsyncClient(timeout=1.0) as client:
                res_tags = await client.get("http://localhost:11434/api/tags")
                if res_tags.status_code == 200:
                    models_data = res_tags.json().get("models", [])
                    downloaded_models = [m.get("name") for m in models_data]
                    if downloaded_models:
                        found = False
                        for pref in ["qwen3", "qwen2.5", "qwen", "gemma3", "gemma"]:
                            for m in downloaded_models:
                                if pref in m.lower():
                                    active_model = m
                                    found = True
                                    break
                            if found:
                                break
                        if not found:
                            active_model = downloaded_models[0]
        except Exception:
            pass

        payload = {
            "model": active_model,
            "prompt": full_prompt,
            "stream": False,
            "options": {
                "temperature": 0.1
            }
        }
        # Short connect timeout prevents stalling if Ollama is offline
        async with httpx.AsyncClient(timeout=httpx.Timeout(45.0, connect=1.5)) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("response", f"Error: Empty response from local Ollama model {active_model}.")
    except (httpx.ConnectError, httpx.ConnectTimeout):
        # Ollama is also offline
        pass

    # Step 3: No local server detected, return friendly setup guide with GPU configuration
    return (
        "🪄 [DocForge Local Formatting Config]\n"
        "No active local formatting engine detected (LM Studio or Ollama).\n\n"
        "Please launch the formatting model engine on your GPU using one of these options:\n\n"
        "Option A: LM Studio (Recommended - Easiest GPU Setup)\n"
        "1. Open LM Studio.\n"
        "2. Load your model file:\n"
        "   - C:/Users/Tanvir Alam/Desktop/New folder (3)/models/google_gemma-3-4b-it-Q4_K_M.gguf\n"
        "3. In the right-hand sidebar under 'Hardware Settings':\n"
        "   - Check 'GPU Offload'.\n"
        "   - Move the slider to 'Max' (or enter -1) to load 100% of the model layers into GPU VRAM.\n"
        "4. Go to the Developer Tab (Server Icon) on the left sidebar and click 'Start Server' (Port 1234).\n\n"
        "Option B: Ollama (Automatic GPU detection)\n"
        "1. Install Ollama (https://ollama.com). It automatically detects NVIDIA/AMD GPUs.\n"
        "2. Create a file named 'Modelfile' containing:\n"
        "   FROM \"C:/Users/Tanvir Alam/Desktop/New folder (3)/models/google_gemma-3-4b-it-Q4_K_M.gguf\"\n"
        "3. In command prompt, run: ollama create gemma3 -f Modelfile\n"
        "4. Start the model: ollama run gemma3\n"
    )
