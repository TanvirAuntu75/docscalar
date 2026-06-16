import time
from pathlib import Path
from PIL import Image

def test_image_conversions():
    print("==================================================")
    print("DocForge Image Format Conversion Test Run")
    print("==================================================")
    
    input_path = Path("C:/Users/Tanvir Alam/Desktop/cinematic_map_1971_recording.webp")
    if not input_path.exists():
        print(f"Error: Test image not found at: {input_path}")
        return
        
    output_dir = Path(__file__).parent / "test_output"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"1. Loading test image: {input_path.name} ({input_path.stat().st_size} bytes)...")
    try:
        start_time = time.time()
        with Image.open(input_path) as img:
            print(f"   Success! Image format: {img.format}, Size: {img.width}x{img.height} px")
            
            # Target formats to test
            targets = [
                ("jpeg", "jpg"),
                ("png", "png"),
                ("webp", "webp")
            ]
            
            for fmt, ext in targets:
                print(f"\n2. Converting to {fmt.upper()}...")
                conv_start = time.time()
                
                # Convert RGBA to RGB for JPEG compliance
                output_img = img.convert("RGB") if fmt == "jpeg" else img
                
                out_file = output_dir / f"test_converted_{int(time.time())}.{ext}"
                
                # Save image
                if fmt in ["jpeg", "webp"]:
                    output_img.save(out_file, fmt.upper(), quality=90)
                else:
                    output_img.save(out_file, fmt.upper())
                    
                conv_duration = time.time() - conv_start
                print(f"   Success! Saved to {out_file.name} ({out_file.stat().st_size} bytes)")
                print(f"   Duration: {conv_duration:.2f} seconds")
                
        total_duration = time.time() - start_time
        print(f"\nSuccess: All image format conversions succeeded in {total_duration:.2f} seconds!")
        
    except Exception as e:
        print(f"   Image processing failed: {e}")
        
    print("==================================================")

if __name__ == "__main__":
    test_image_conversions()
