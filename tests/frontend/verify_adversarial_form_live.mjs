import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('--- Starting Live Adversarial Form Verification ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:5173/pdf-forms...');
  await page.goto('http://localhost:5173/pdf-forms');
  await page.waitForLoadState('networkidle');

  console.log('2. Uploading complex_adversarial_intake_form.pdf...');
  const fileInput = await page.locator('input[type="file"]');
  await fileInput.setInputFiles('c:/Users/Tanvir Alam/Downloads/complex_adversarial_intake_form.pdf');

  console.log('3. Waiting for PDF canvas and auto-detection on Page 1...');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(3500);

  const outDir = 'C:/Users/Tanvir Alam/.gemini/antigravity/brain/691be86e-de7b-4a10-aff3-5882cfcfaabf';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Page 1 initial screenshot
  const page1Path = path.join(outDir, 'live_adversarial_page1_detected.png');
  await page.screenshot({ path: page1Path });
  console.log('Saved Page 1 detected screenshot to:', page1Path);

  // Canvas element screenshot
  const canvasWrapper = page.locator('.relative.my-auto.bg-white, .relative.shadow-2xl').first();
  const page1CanvasPath = path.join(outDir, 'live_adversarial_page1_canvas.png');
  if (await canvasWrapper.count() > 0) {
    await canvasWrapper.screenshot({ path: page1CanvasPath });
    console.log('Saved Page 1 canvas screenshot to:', page1CanvasPath);
  }

  // Count detected inputs strictly inside the canvas
  const canvasInputs = canvasWrapper.locator('input[type="text"], textarea');
  const inputCount = await canvasInputs.count();
  console.log(`Page 1 Canvas: Found ${inputCount} text/textarea inputs.`);

  const radios = canvasWrapper.locator('input[type="radio"]');
  const radioCount = await radios.count();
  console.log(`Page 1 Canvas: Found ${radioCount} radio buttons.`);

  // Test filling inputs on Page 1
  console.log('4. Populating form fields on Page 1...');
  for (let i = 0; i < Math.min(inputCount, 12); i++) {
    const input = canvasInputs.nth(i);
    const ariaLabel = await input.getAttribute('aria-label') || '';
    const classList = await input.getAttribute('class') || '';
    
    if (classList.includes('tracking-') || ariaLabel.toLowerCase().includes('comb')) {
      await input.fill('987654321', { force: true });
    } else if (ariaLabel.toLowerCase().includes('underline')) {
      await input.fill('Jane Doe (Signature)', { force: true });
    } else {
      await input.fill(`Verified Field ${i + 1}`, { force: true });
    }
  }

  // Check radio button
  if (radioCount > 0) {
    await radios.first().click({ force: true });
    console.log('Clicked first radio button.');
  }

  await page.waitForTimeout(1000);

  const page1FilledPath = path.join(outDir, 'live_adversarial_page1_filled.png');
  await page.screenshot({ path: page1FilledPath });
  console.log('Saved Page 1 filled screenshot to:', page1FilledPath);

  if (await canvasWrapper.count() > 0) {
    const page1FilledCanvasPath = path.join(outDir, 'live_adversarial_page1_filled_canvas.png');
    await canvasWrapper.screenshot({ path: page1FilledCanvasPath });
    console.log('Saved Page 1 filled canvas screenshot to:', page1FilledCanvasPath);
  }

  // 5. Navigate to Page 2
  console.log('5. Navigating to Page 2...');
  const page2Thumb = page.locator('button:has-text("Page 2")').first();
  if (await page2Thumb.count() > 0) {
    await page2Thumb.click({ force: true });
  } else {
    const nextBtn = page.locator('button[aria-label="Next Page"]').first();
    await nextBtn.click({ force: true });
  }

  await page.waitForTimeout(4000);

  const page2Path = path.join(outDir, 'live_adversarial_page2_detected.png');
  await page.screenshot({ path: page2Path });
  console.log('Saved Page 2 detected screenshot to:', page2Path);

  if (await canvasWrapper.count() > 0) {
    const page2CanvasPath = path.join(outDir, 'live_adversarial_page2_canvas.png');
    await canvasWrapper.screenshot({ path: page2CanvasPath });
    console.log('Saved Page 2 canvas screenshot to:', page2CanvasPath);
  }

  const p2Inputs = canvasWrapper.locator('input[type="text"], textarea');
  const p2InputCount = await p2Inputs.count();
  console.log(`Page 2 Canvas: Found ${p2InputCount} text/textarea inputs.`);

  for (let i = 0; i < Math.min(p2InputCount, 8); i++) {
    const input = p2Inputs.nth(i);
    await input.fill(`Ledger Entry ${i + 1}`, { force: true });
  }

  await page.waitForTimeout(1000);
  const page2FilledPath = path.join(outDir, 'live_adversarial_page2_filled.png');
  await page.screenshot({ path: page2FilledPath });
  console.log('Saved Page 2 filled screenshot to:', page2FilledPath);

  if (await canvasWrapper.count() > 0) {
    const page2FilledCanvasPath = path.join(outDir, 'live_adversarial_page2_filled_canvas.png');
    await canvasWrapper.screenshot({ path: page2FilledCanvasPath });
    console.log('Saved Page 2 filled canvas screenshot to:', page2FilledCanvasPath);
  }

  await browser.close();
  console.log('--- Adversarial Live Verification Completed Successfully! ---');
}

run().catch(err => {
  console.error('Error running live verification:', err);
  process.exit(1);
});
