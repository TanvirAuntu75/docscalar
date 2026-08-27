import { chromium } from 'playwright';
import fs from 'fs';

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
];

const executablePath = chromePaths.find(p => p && fs.existsSync(p));

(async () => {
  const browser = await chromium.launch({ 
    headless: true,
    executablePath: executablePath || undefined
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type().toUpperCase()}]: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[PAGE ERROR]: ${err.stack || err.message}`);
  });

  try {
    console.log('Navigating to http://localhost:5100 ...');
    await page.goto('http://localhost:5100', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    const hasErrorModal = await page.$('.bg-glass');
    if (hasErrorModal) {
      const errorText = await page.innerText('.bg-glass');
      console.log('--- ERROR MODAL DETECTED ---');
      console.log(errorText);
    } else {
      console.log('No error modal detected. Page rendered properly.');
    }
  } catch (error) {
    console.error('Error during test execution:', error);
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
})();
