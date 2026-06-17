import asyncio
import sys
import time
from pathlib import Path
import shutil

# Add backend directory to path so we can import modules
sys.path.append(str(Path(__file__).parent.parent))

from backend.services.libreoffice import convert_with_libreoffice
from backend.services.smart_service import process_smart_convert
from backend import config

async def run_tests():
    print("==================================================")
    print("DocForge Backend Engine Test Suite")
    print("==================================================")
    
    # 1. Setup paths
    input_docx = Path("test_dummy_real2.docx")
    if not input_docx.exists():
        print(f"Error: Test document not found at: {input_docx}")
        return
        
    output_dir = Path(__file__).parent / "test_output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Found test document: {input_docx.name} ({input_docx.stat().st_size} bytes)")
    print(f"Output directory: {output_dir.resolve()}\n")
    
    # 2. Test LibreOffice head-less PDF conversion
    print("[Test 1] Testing LibreOffice head-less PDF conversion...")
    start_time = time.time()
    result = convert_with_libreoffice(str(input_docx), "pdf")
    duration = time.time() - start_time
    
    if result.success and result.output_path:
        out_path = Path(result.output_path)
        # Copy to test_output folder
        target_path = output_dir / f"test_converted_{int(time.time())}.pdf"
        shutil.copy2(out_path, target_path)
        print(f"Success! Converted PDF size: {target_path.stat().st_size} bytes")
        print(f"Conversion duration: {duration:.2f} seconds")
    else:
        print(f"Failed: {result.error_message}")
        
    print("\n--------------------------------------------------")
    
    # 3. Test AI Summarization (Gemma-3-4B Local GGUF via Ollama)
    print("[Test 2] Testing local AI Summarize (Gemma-3-4B) + PDF compiler pipeline...")
    start_time = time.time()
    
    # Mock clean name for test output
    test_job_input = output_dir / f"temp_{int(time.time())}.docx"
    shutil.copy2(input_docx, test_job_input)
    
    ai_result = await process_smart_convert(str(test_job_input), "summarize")
    duration = time.time() - start_time
    
    # Clean up temp input file
    if test_job_input.exists():
        test_job_input.unlink()
        
    if ai_result.success and ai_result.output_path:
        out_path = Path(ai_result.output_path)
        target_path = output_dir / f"test_ai_summarized_{int(time.time())}.pdf"
        shutil.copy2(out_path, target_path)
        print(f"Success! AI Summarized PDF size: {target_path.stat().st_size} bytes")
        print(f"AI processing duration: {duration:.2f} seconds")
    else:
        print(f"Failed: {ai_result.error_message}")
        
    print("==================================================")
    print("DocForge Engine Test Suite Complete.")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(run_tests())
