import { test, expect } from '@playwright/test';

const rink = '#stage';
const ink = '#sketchLayer > path';

function point(rect, x, y) {
  return { x: rect.x + rect.width * x, y: rect.y + rect.height * y };
}

async function focusMode(page) {
  await page.locator('#presentMode').click();
  await expect(page.locator('.app')).toHaveClass(/presentation/);
  await expect(page.locator('#presentSketch')).toBeVisible();
}

async function sketchLine(page, y = 0.40) {
  const rect = await page.locator(rink).boundingBox();
  if (!rect) throw new Error('Bandyplanen saknar synliga koordinater');
  const start = point(rect, 0.30, y);
  const mid = point(rect, 0.45, y);
  const end = point(rect, 0.60, y);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(mid.x, mid.y, { steps: 8 });
  await page.mouse.move(end.x, end.y, { steps: 8 });
  await page.mouse.up();
  return mid;
}

const pageErrors = new WeakMap();

test.beforeEach(async ({ page }) => {
  const errors = [];
  pageErrors.set(page, errors);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator(rink)).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page), 'Ohanterade JavaScript-fel').toEqual([]);
});

test('@smoke starts on an empty rink', async ({ page }) => {
  await expect(page).toHaveTitle(/Bandyövningar/);
  await expect(page.locator('#objects .obj')).toHaveCount(0);
  const rect = await page.locator(rink).boundingBox();
  expect(rect?.width).toBeGreaterThan(100);
  expect(rect?.height).toBeGreaterThan(100);
});

test('draws a dashed coloured sketch with no player in focus mode', async ({ page }) => {
  await focusMode(page);
  await page.locator('#presentSketch').click();
  await expect(page.locator('.app')).toHaveClass(/focusEditing/);
  await page.locator('#focusInkColor').fill('#e31818');
  await page.locator('#focusInkStyle').selectOption('dashed');

  await sketchLine(page);

  await expect(page.locator(ink)).toHaveCount(1);
  await expect(page.locator(ink)).toHaveAttribute('stroke', '#e31818');
  await expect(page.locator(ink)).toHaveAttribute('stroke-dasharray', '11 10');
  await expect(page.locator('#objects .obj')).toHaveCount(0);
});

test('erases only the selected sketch and undo restores it', async ({ page }) => {
  await focusMode(page);
  await page.locator('#presentSketch').click();
  const pointA = await sketchLine(page, 0.34);
  await sketchLine(page, 0.53);
  await expect(page.locator(ink)).toHaveCount(2);

  await page.locator('#focusErase').click();
  await page.mouse.click(pointA.x, pointA.y);
  await expect(page.locator(ink)).toHaveCount(1);

  await page.locator('#focusUndo').click();
  await expect(page.locator(ink)).toHaveCount(2);
});

test('undo removes only the latest sketch', async ({ page }) => {
  await focusMode(page);
  await page.locator('#presentSketch').click();
  await sketchLine(page, 0.32);
  await sketchLine(page, 0.54);
  await expect(page.locator(ink)).toHaveCount(2);

  await page.locator('#focusUndo').click();
  await expect(page.locator(ink)).toHaveCount(1);
});

test('focus toolbar remains on screen in a mobile viewport', async ({ page }) => {
  const viewport = page.viewportSize();
  test.skip(!viewport || viewport.width > 760, 'Enbart mobil viewport');

  await focusMode(page);
  const toolbar = page.locator('.presentationBar');
  const rect = await toolbar.boundingBox();
  expect(rect).not.toBeNull();
  expect(rect.y).toBeGreaterThan(viewport.height / 2);
  expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height + 2);
  await expect(page.locator('#focusErase')).toBeVisible();
  await expect(page.locator('#focusUndo')).toBeVisible();
});
