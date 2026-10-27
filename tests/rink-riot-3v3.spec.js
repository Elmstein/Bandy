import { test, expect } from '@playwright/test';

test('Rink Riot 3v3 loads six skaters with three roles per team @smoke', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/rink-riot/v03/');
  await page.waitForFunction(() => typeof window.__rinkRiotQA === 'function');
  const initial = await page.evaluate(() => window.__rinkRiotQA());

  expect(initial.phase).toBe('ready');
  expect(initial.skaters).toHaveLength(6);
  expect(initial.skaters.filter(p => p.team === 0).map(p => p.role)).toEqual(['dangler','cannon','enforcer']);
  expect(initial.skaters.filter(p => p.team === 1).map(p => p.role)).toEqual(['dangler','cannon','enforcer']);
  expect(initial.controlled).toBe(0);
  expect(pageErrors).toEqual([]);

  await page.evaluate(() => document.querySelector('#overlayButton').click());
  await page.waitForTimeout(1250);
  const playing = await page.evaluate(() => window.__rinkRiotQA());
  expect(playing.phase).toBe('playing');
  expect(pageErrors).toEqual([]);
});

test('Rink Riot 3v3 can switch players and hold / release a shot @smoke', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/rink-riot/v03/');
  await page.evaluate(() => document.querySelector('#overlayButton').click());
  await page.waitForFunction(() => window.__rinkRiotQA?.().freeze <= 0, null, { timeout: 12000 });

  // iPhone and Android have touch controls; desktop uses the documented keyboard keys.
  const mobile = test.info().project.name !== 'desktop-chromium';
  if (mobile) {
    await page.locator('[data-action="switch"]').tap();
  } else {
    await page.keyboard.press('Space');
  }
  const swapped = await page.evaluate(() => window.__rinkRiotQA());
  expect(swapped.controlled).toBe(1);
  expect(swapped.skaters[swapped.controlled].role).toBe('cannon');

  if (mobile) {
    await page.locator('[data-action="shoot"]').dispatchEvent('pointerdown', { pointerId: 11, pointerType: 'touch' });
  } else {
    await page.keyboard.down('j');
  }
  await page.waitForTimeout(200);
  const charging = await page.evaluate(() => window.__rinkRiotQA());
  expect(charging.shotPlayer).toBe(1);
  expect(charging.skaters[1].charge).toBeGreaterThan(0.04);
  if (mobile) {
    await page.locator('[data-action="shoot"]').dispatchEvent('pointerup', { pointerId: 11, pointerType: 'touch' });
  } else {
    await page.keyboard.up('j');
  }
  const released = await page.evaluate(() => window.__rinkRiotQA());
  expect(released.shotPlayer).toBeNull();
  expect(pageErrors).toEqual([]);
});
