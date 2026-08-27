import os
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont


def create_stressed_pdf(output_filename, text_content):
    # 1. Initialize the digital canvas (white background)
    width, height = 800, 400
    image = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(image)

    # 2. Render the Text
    # It attempts to use a standard font. If unavailable, it falls back to the default.
    try:
        font = ImageFont.truetype("arial.ttf", 40)
    except OSError:
        print("Standard font not found, using default.")
        font = ImageFont.load_default()

    # Draw the text roughly in the center
    draw.text((50, 150), text_content, fill=(0, 0, 0), font=font)

    # 3. Apply Visual Stress (Salt-and-Pepper Noise)
    # This iterates through pixels and randomly scrambles them to create visual static.
    print("Applying noise...")
    pixels = image.load()
    noise_probability = (
        0.15  # 15% of pixels will be randomized. Tweak this to increase stress.
    )

    for x in range(width):
        for y in range(height):
            if random.random() < noise_probability:
                pixels[x, y] = (
                    random.randint(0, 255),
                    random.randint(0, 255),
                    random.randint(0, 255),
                )

    # 4. Apply Gaussian Blur
    # This smears the hard edges of the text into the noisy background.
    print("Applying blur...")
    blur_radius = 2  # Increase this to make it unreadable to humans and machines alike.
    image = image.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # 5. Export directly to PDF
    print(f"Exporting to {output_filename}...")
    image.save(output_filename, "PDF", resolution=100.0)
    print("Done.")


# --- Execution ---
if __name__ == "__main__":
    target_text = (
        "This is a rudimentary obfuscation test. Cloud OCR will likely still read this."
    )

    # Resolving path to the Downloads folder
    user_profile = os.environ.get("USERPROFILE", r"C:\Users\Tanvir Alam")
    downloads_folder = os.path.join(user_profile, "Downloads")
    output_path = os.path.join(downloads_folder, "stressed_document.pdf")

    create_stressed_pdf(output_path, target_text)
