import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('.qa', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const failures = [];
page.on('pageerror', error => failures.push(error.message));
page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
const report = [];
try {
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
  const assets = await page.locator('img').evaluateAll(images => images.map(image => ({ src: image.getAttribute('src'), loaded: image.complete && image.naturalWidth > 0, width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height })));
  assert.ok(assets.every(asset => asset.loaded && asset.width > 0 && asset.height > 0), 'Every visible image must load with nonzero geometry');
  const front = page.locator('.dashboard-layer-front');
  const back = page.locator('.dashboard-layer-back');
  const middle = page.locator('.dashboard-layer-middle');
  const initialFront = await front.boundingBox();
  const initialBack = await back.boundingBox();
  const initialMiddle = await middle.boundingBox();
  await page.screenshot({ path: '.qa/desktop.png', fullPage: true });
  await page.mouse.move(800, 800);
  await page.waitForTimeout(1150);
  const hoveredBack = await back.boundingBox();
  const hoveredMiddle = await middle.boundingBox();
  assert.deepEqual(await front.boundingBox(), initialFront, 'The dashboard front must remain stationary');
  assert.ok(Math.abs(hoveredBack.y - initialBack.y - 73.6883) < .1, 'Back layer should reveal by the Figma offset');
  assert.ok(Math.abs(hoveredBack.x - initialBack.x + 12) < .1, 'Back layer should move left by 12px');
  assert.ok(Math.abs(hoveredMiddle.y - initialMiddle.y - 39.6883) < .1, 'Middle layer should reveal by the Figma offset');
  await page.screenshot({ path: '.qa/desktop-hover.png', fullPage: true });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(1150);
  assert.ok(Math.abs((await back.boundingBox()).y - initialBack.y) < .1, 'Hover exit should restore the stacked layers');
  await page.locator('.dashboard').focus();
  await page.waitForTimeout(1150);
  const focusOffset = await back.evaluate(node => parseFloat(getComputedStyle(node).translate.split(' ')[1]));
  assert.ok(focusOffset > 70, 'Keyboard focus should reveal layers');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'FAQ', exact: true }).click();
  assert.ok(await page.locator('dialog').isVisible(), 'FAQ should open');
  await page.keyboard.press('Escape');
  assert.ok(!await page.locator('dialog').isVisible(), 'Escape should close FAQ');
  await page.getByRole('link', { name: 'Pricing', exact: true }).click();
  await page.waitForTimeout(600);
  assert.ok(Math.abs((await page.locator('#pricing').boundingBox()).y) < 50, 'Pricing navigation should reach its section');

  for (const width of [1440, 1280, 900, 768, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    const metrics = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, headings: [...document.querySelectorAll('h1, h2, .feature-card h3')].map(node => { const rect = node.getBoundingClientRect(); return { text: node.textContent, left: rect.left, right: rect.right }; }) }));
    assert.ok(metrics.scrollWidth <= width, `No horizontal overflow at ${width}px`);
    assert.ok(metrics.headings.every(heading => heading.left >= 0 && heading.right <= width), `Headings fit at ${width}px`);
    report.push({ width, ...metrics });
    if ([1440, 768, 390, 320].includes(width)) await page.screenshot({ path: `.qa/viewport-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.menu-toggle').click();
  assert.ok(await page.locator('.nav-links').isVisible(), 'Mobile menu should open');
  await page.getByRole('button', { name: 'FAQ', exact: true }).click();
  assert.ok(await page.locator('dialog').isVisible(), 'Mobile FAQ should open');
  assert.ok(!await page.locator('.nav-links').isVisible(), 'Mobile menu should close after navigation');
  await page.keyboard.press('Escape');
  await page.locator('.dashboard').evaluate(node => node.click());
  assert.equal(await page.locator('.dashboard').getAttribute('aria-pressed'), 'true');
  await page.locator('.dashboard').evaluate(node => node.click());
  assert.equal(await page.locator('.dashboard').getAttribute('aria-pressed'), 'false');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await back.evaluate(node => getComputedStyle(node).transitionDuration), '0s');
  assert.deepEqual(failures, [], 'No browser errors or failed requests');
  await writeFile('.qa/report.json', JSON.stringify({ assets, viewports: report, browserErrors: failures, hover: 'passed', keyboard: 'passed', navigation: 'passed', reducedMotion: 'passed' }, null, 2));
  console.log('Passed: assets, dashboard hover and reset, keyboard focus, FAQ, navigation, mobile menu, reduced motion, and seven responsive widths. Screenshots: .qa/');
} finally {
  await browser.close();
}
