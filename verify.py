import time
import os
from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Navigate to the Image Compressor tool
        page.goto('http://localhost:5173/image-compressor', wait_until='networkidle')

        # Wait a bit for everything to settle
        time.sleep(2)

        # Take a screenshot of the initial state
        page.screenshot(path='screenshot_initial.png')

        # Create a dummy image file to test upload
        with open("test_image.png", "wb") as f:
            # simple 1x1 png file
            f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa75\x81\x84\x00\x00\x00\x00IEND\xaeB`\x82')

        with open("test_image2.png", "wb") as f:
            f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDAT\x08\xd7c\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa75\x81\x84\x00\x00\x00\x00IEND\xaeB`\x82')

        # Select the file input and upload the files
        # The input[type="file"] might be hidden, so we need to find it and force upload
        file_input = page.locator('input[type="file"]')
        file_input.set_input_files(['test_image.png', 'test_image2.png'])

        # Wait for options panel to show up
        page.wait_for_selector('.options-panel')

        # Take a screenshot of the settings state
        page.screenshot(path='screenshot_settings.png')

        # Change the quality slider
        slider = page.locator('input[type="range"]')
        slider.fill('50')

        # Click the compress button
        page.locator('button.btn-primary').click()

        # Wait for result area to show up
        page.wait_for_selector('.result-area')

        # Take a screenshot of the final state
        page.screenshot(path='screenshot_result.png')

        browser.close()

if __name__ == '__main__':
    verify()
