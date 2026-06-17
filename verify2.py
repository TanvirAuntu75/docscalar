import time
import os
from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Navigate to the Image Compressor tool
        page.goto('http://localhost:5173/image-compressor', wait_until='networkidle')

        # Create dummy image files
        with open("test_image.png", "wb") as f:
            f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa75\x81\x84\x00\x00\x00\x00IEND\xaeB`\x82')
        with open("test_image2.png", "wb") as f:
            f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa75\x81\x84\x00\x00\x00\x00IEND\xaeB`\x82')

        # Select the file input and upload the files
        file_input = page.locator('input[type="file"]')
        file_input.set_input_files(['test_image.png', 'test_image2.png'])

        # Wait for options panel to show up
        page.wait_for_selector('text="Compress 2 Images"')

        # Change the quality slider
        slider = page.locator('input[type="range"]')
        slider.fill('50')

        page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

        # Click the compress button
        page.locator('text="Compress 2 Images"').click()

        # Give it a few seconds and check if there's an error displayed
        time.sleep(3)
        page.screenshot(path='screenshot_after_click.png')

        browser.close()

if __name__ == '__main__':
    verify()
