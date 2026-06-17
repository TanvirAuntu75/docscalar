import time
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

        page.wait_for_selector('.result-title')

        # Click the download button
        with page.expect_download() as download_info:
            page.locator('text="Download All (ZIP)"').click()
        download = download_info.value
        download.save_as('downloaded.zip')

        browser.close()

if __name__ == '__main__':
    verify()
