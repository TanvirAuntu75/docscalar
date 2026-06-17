import time
import os
from playwright.sync_api import sync_playwright

def verify():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        page.goto('http://localhost:5173/image-compressor', wait_until='networkidle')

        file_input = page.locator('input[type="file"]')
        file_input.set_input_files(['test_real_image.png', 'test_real_image2.png'])

        page.wait_for_selector('text="Compress 2 Images"')
        page.locator('text="Compress 2 Images"').click()

        # Wait for result area to show up
        page.wait_for_selector('.result-title')
        page.screenshot(path='screenshot_success.png')
        browser.close()

if __name__ == '__main__':
    verify()
