import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5173/pdf-forms...');
  await page.goto('http://localhost:5173/pdf-forms');
  await page.waitForLoadState('networkidle');

  console.log('Uploading clean images-combined (3).pdf...');
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('c:/Users/Tanvir Alam/Downloads/images-combined (3).pdf');

  console.log('Waiting for PDF canvas to render...');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(3000);

  const fullPath = 'C:/Users/Tanvir Alam/.gemini/antigravity/brain/691be86e-de7b-4a10-aff3-5882cfcfaabf/live_clean_page1_full.png';
  await page.screenshot({ path: fullPath });
  console.log('Saved full screenshot to:', fullPath);

  const canvasWrapper = page.locator('.relative.my-auto.bg-white');
  const canvasPath = 'C:/Users/Tanvir Alam/.gemini/antigravity/brain/691be86e-de7b-4a10-aff3-5882cfcfaabf/live_clean_page1_canvas.png';
  if (await canvasWrapper.count() > 0) {
    await canvasWrapper.first().screenshot({ path: canvasPath });
    console.log('Saved canvas wrapper screenshot to:', canvasPath);
  }

  const textInputs = page.locator('input[type="text"]');
  const count = await textInputs.count();
  console.log('Found ' + count + ' text inputs on page.');

  if (count > 0) {
    await textInputs.nth(0).click();
    await textInputs.nth(0).fill('Eleanor Vance');
    if (count > 1) {
      await textInputs.nth(1).click();
      await textInputs.nth(1).fill('Nell');
    }
    await page.waitForTimeout(800);
    const focusedPath = 'C:/Users/Tanvir Alam/.gemini/antigravity/brain/691be86e-de7b-4a10-aff3-5882cfcfaabf/live_clean_page1_focused.png';
    await page.screenshot({ path: focusedPath });
    console.log('Saved focused screenshot to:', focusedPath);
  }

  await browser.close();
  console.log('Verification completed successfully!');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
