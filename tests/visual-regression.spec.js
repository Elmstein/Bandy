import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Compare real rendered pixels against the PR base or previous release.
// The reference is loaded from Git, never the candidate being tested.
const referenceURL = 'http://127.0.0.1:4174/';
const maxDifferenceRatio = 0.0025; // 0.25% of screen pixels
const stableCSS = [
  '*, *::before, *::after {',
  '  animation-duration: 0s !important;',
  '  animation-delay: 0s !important;',
  '  transition-duration: 0s !important;',
  '  transition-delay: 0s !important;',
  '  caret-color: transparent !important;',
  '}',
  '#stageStatus { visibility: hidden !important; }',
].join('\n');

async function setup(page, url) {
  await page.goto(url);
  await expect(page.locator('#stage')).toBeVisible();
  await page.addStyleTag({ content: stableCSS });
}

async function compare(testInfo, before, after, name) {
  const options = { animations: 'disabled', caret: 'hide', fullPage: false, scale: 'css' };
  const oldBytes = await before.screenshot(options);
  const newBytes = await after.screenshot(options);
  const oldImage = PNG.sync.read(oldBytes);
  const newImage = PNG.sync.read(newBytes);
  expect([newImage.width, newImage.height], 'Viewport screenshot dimensions').toEqual([oldImage.width, oldImage.height]);

  const diffImage = new PNG({ width: oldImage.width, height: oldImage.height });
  const changed = pixelmatch(
    oldImage.data, newImage.data, diffImage.data,
    oldImage.width, oldImage.height,
    { threshold: 0.12, includeAA: false }
  );
  const ratio = changed / (oldImage.width * oldImage.height);
  if (ratio > maxDifferenceRatio) {
    await testInfo.attach(name + '-old.png', { body: oldBytes, contentType: 'image/png' });
    await testInfo.attach(name + '-new.png', { body: newBytes, contentType: 'image/png' });
    await testInfo.attach(name + '-diff.png', { body: PNG.sync.write(diffImage), contentType: 'image/png' });
  }
  expect(ratio, name + ': ' + changed + ' changed pixels; review screenshot diff if above threshold.')
    .toBeLessThanOrEqual(maxDifferenceRatio);
}

test('desktop rink and panels with two players remain visually consistent', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Desktop baseline');
  const old = await page.context().newPage();
  try {
    await setup(old, referenceURL);
    await setup(page, '/');
    for (const p of [old, page]) {
      await p.locator('.palette [data-add="player"]').click();
      await p.locator('.palette [data-add="player"]').click();
      await expect(p.locator('#objects .obj')).toHaveCount(2);
    }
    await compare(info, old, page, 'desktop-players');
  } finally { await old.close(); }
});

test('half-rink boundaries and markings match previous release', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Desktop baseline');
  const old = await page.context().newPage();
  try {
    await setup(old, referenceURL);
    await setup(page, '/');
    for (const p of [old, page]) {
      await p.locator('#rinkMode').selectOption('half');
      await expect(p.locator('#rinkViewport')).toBeVisible();
    }
    await compare(info, old, page, 'half-rink');
  } finally { await old.close(); }
});

test('focus mode toolbar stays visually stable', async ({ page }, info) => {
  const old = await page.context().newPage();
  try {
    await setup(old, referenceURL);
    await setup(page, '/');
    for (const p of [old, page]) {
      await p.locator('#presentMode').click();
      await expect(p.locator('.app')).toHaveClass(/presentation/);
      await p.locator('#presentSketch').click();
      await expect(p.locator('.app')).toHaveClass(/focusEditing/);
      await expect(p.locator('#focusUndo')).toBeVisible();
      await expect(p.locator('#focusErase')).toBeVisible();
    }
    await compare(info, old, page, 'focus-toolbar');
  } finally { await old.close(); }
});

test('mobile add-object picker fits and matches previous version', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop-chromium', 'Mobile-only visual baseline');
  const old = await page.context().newPage();
  try {
    await setup(old, referenceURL);
    await setup(page, '/');
    for (const p of [old, page]) {
      await p.locator('#mobileAddMenu').tap();
      await expect(p.locator('#mobileAddPopover')).toBeVisible();
    }
    const viewport = page.viewportSize();
    const popup = await page.locator('#mobileAddPopover').boundingBox();
    expect(popup).not.toBeNull();
    expect(popup.x).toBeGreaterThanOrEqual(-1);
    expect(popup.x + popup.width).toBeLessThanOrEqual(viewport.width + 1);
    await compare(info, old, page, 'mobile-add-menu');
  } finally { await old.close(); }
});
