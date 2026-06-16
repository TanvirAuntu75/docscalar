import asyncio
import sys
import time
from pathlib import Path

# Add backend directory to path so we can import modules
sys.path.append(str(Path(__file__).parent.parent))

from backend.services.smart_service import extract_text
from backend.services.ai_service import generate_ai_enhancement

async def test_ai():
    print("==================================================")
    print("DocForge Local AI (Gemma-3-4B) Test Run")
    print("==================================================")
    
    input_docx = Path("C:/Users/Tanvir Alam/Desktop/New folder/SOP_NZ3_Final.docx")
    if not input_docx.exists():
        print(f"Error: Test document not found at: {input_docx}")
        return
        
    print(f"1. Extracting text from {input_docx.name}...")
    try:
        text = extract_text(input_docx)
        word_count = len(text.split())
        print(f"   Success! Extracted {word_count} words.")
    except Exception as e:
        print(f"   Failed to extract text: {e}")
        return
        
    print("\n2. Sending text to local Gemma-3-4B (Ollama/LM Studio)...")
    print("   Please wait, this will run entirely on your local GPU...")
    start_time = time.time()
    try:
        # We only send the first 1000 characters to keep it quick
        sample_text = text[:1000]
        response = await generate_ai_enhancement(sample_text, "summarize")
        duration = time.time() - start_time
        print(f"   AI response generated in {duration:.2f} seconds.")
        print("\n==================================================")
        print("AI Response Preview:")
        print("==================================================")
        print(response)
    except Exception as e:
        print(f"   AI enhancement failed: {e}")

    print("==================================================")
    print("Test run complete.")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_ai())
