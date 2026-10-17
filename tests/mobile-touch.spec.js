import { test, expect } from '@playwright/test';

const ink = '#sketchLayer > path';
const point = (rect, x, y) => ({
  x: Math.round(rect.x + rect.width * x),
  y: Math.round(rect.y + rect.height * y),
});

async function focusSketch(page) {
  await page.locator('#presentMode').tap();
  await expect(page.locator('.app')).toHaveClass(/presentation/);
  await page.locator('#presentSketch').tap();
  await expect(page.locator('.app')).toHaveClass(/focusEditing/);
}

async function swipeWithTouchProtocol(page, a, b) {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ ...a, id: 1 }],
    });
    for (let i = 1; i <= 16; i++) {
      const p = {
        x: Math.round(a.x + (b.x - a.x) * i / 16),
        y: Math.round(a.y + (b.y - a.y) * i / 16),
        id: 1,
      };
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [p],
      });
      await page.waitForTimeout(12);
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd', touchPoints: [],
    });
  } finally { await cdp.detach(); }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#stage')).toBeVisible();
});

test('mobile touchscreen taps select and deselect the sketch tool', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'Requires mobile touch context');
  await focusSketch(page);
  await expect(page.locator('#presentSketch')).toHaveClass(/active/);
  await page.locator('#presentSketch').tap();
  await expect(page.locator('#presentSketch')).not.toHaveClass(/active/);
});

test('real Chromium touch swipe draws a correctly positioned diagonal line', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'android-chromium', 'CDP touch swipe requires mobile Chromium');
  await focusSketch(page);
  const rect = await page.locator('#stage').boundingBox();
  if (!rect) throw new Error('SVG rink not visible');
  const from = point(rect, .30, .58), to = point(rect, .62, .30);
  await swipeWithTouchProtocol(page, from, to);
  await expect(page.locator(ink)).toHaveCount(1);
  const b = await page.locator(ink).evaluate(path => {
    const bounds = path.getBBox(), box = document.querySelector('#stage').viewBox.baseVal;
    return { left: (bounds.x - box.x) / box.width,
      right: (bounds.x + bounds.width - box.x) / box.width,
      top: (bounds.y - box.y) / box.height,
      bottom: (bounds.y + bounds.height - box.y) / box.height };
  });
  expect(b.left).toBeGreaterThan(.25);
  expect(b.left).toBeLessThan(.35);
  expect(b.right).toBeGreaterThan(.57);
  expect(b.right).toBeLessThan(.67);
  expect(b.top).toBeGreaterThan(.25);
  expect(b.top).toBeLessThan(.35);
  expect(b.bottom).toBeGreaterThan(.53);
  expect(b.bottom).toBeLessThan(.63);

  await page.locator('#focusErase').tap();
  await page.touchscreen.tap(point(rect, .45, .45).x, point(rect, .45, .45).y);
  await expect(page.locator(ink)).toHaveCount(0);
  await page.locator('#focusUndo').tap();
  await expect(page.locator(ink)).toHaveCount(1);
});

test('two-finger touch pinch zooms the rink without moving player data', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'android-chromium', 'CDP multi-touch requires mobile Chromium');
  const stage = page.locator('#stage');
  const rect = await stage.boundingBox();
  if (!rect) throw new Error('SVG rink not visible');
  const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
  const before = await stage.getAttribute('viewBox');
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart',
      touchPoints: [{ x: cx - 28, y: cy, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart',
      touchPoints: [{ x: cx - 28, y: cy, id: 1 }, { x: cx + 28, y: cy, id: 2 }] });
    for (let i = 1; i <= 10; i++) {
      const dx = 28 + 7 * i;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove',
        touchPoints: [{ x: cx - dx, y: cy, id: 1 }, { x: cx + dx, y: cy, id: 2 }] });
      await page.waitForTimeout(12);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
  await expect.poll(async () => stage.getAttribute('viewBox')).not.toBe(before);
  const widthBefore = Number(before.trim().split(/\s+/)[2]);
  const widthAfter = Number((await stage.getAttribute('viewBox')).trim().split(/\s+/)[2]);
  expect(widthAfter).toBeLessThan(widthBefore * .85);
});
