import { test, expect } from '@playwright/test';

// Product state is read for assertions only. Every mutation below uses a visible
// control or a real pointer/touch interaction; the tests do not inject app state.
const snapshot = page => page.evaluate(() => window.bandyMatchSnapshot());

async function worldToScreen(page, point) {
  return page.locator('#stage').evaluate((stage, p) => {
    const pt = stage.createSVGPoint();
    pt.x = p.x; pt.y = p.y;
    const s = pt.matrixTransform(stage.getScreenCTM());
    return { x: s.x, y: s.y };
  }, point);
}

async function inputAt(page, point, touch = false) {
  const p = await worldToScreen(page, point);
  if (touch) await page.touchscreen.tap(Math.round(p.x), Math.round(p.y));
  else await page.mouse.click(p.x, p.y);
}

async function drawWorldPath(page, start, end) {
  const a = await worldToScreen(page, start);
  const b = await worldToScreen(page, end);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 24 });
  await page.mouse.up();
}

function player(project, number) {
  const result = project.objects.find(o => o.type === 'player' && o.label === String(number));
  expect(result, 'Spelaren måste ha lagts till via gränssnittet').toBeTruthy();
  return result;
}

const errors = new WeakMap();
test.beforeEach(async ({ page }) => {
  errors.set(page, []);
  page.on('pageerror', e => errors.get(page).push(e.message));
  await page.goto('/');
  await expect(page.locator('#stage')).toBeVisible();
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page), 'Inga okontrollerade JavaScript-undantag').toEqual([]);
});

test('desktop: create two players, skate, pass, shoot and play from visible controls', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop editor workflow');

  await page.locator('.palette [data-add="player"]').click();
  await page.locator('.palette [data-add="player"]').click();
  const created = await snapshot(page);
  expect(created.objects.filter(o => o.type === 'player')).toHaveLength(2);
  const p1 = player(created, 1), p2 = player(created, 2);

  await page.locator('#directAnimate').click();
  const expectedEnd = { x: p1.x + 110, y: p1.y - 110 };
  await drawWorldPath(page, p1, expectedEnd);
  await expect.poll(async () => (await snapshot(page)).tracks[p1.id]?.length ?? 0).toBe(1);
  const moved = await snapshot(page);
  const track = moved.tracks[p1.id][0];
  expect(track.points.length).toBeGreaterThan(2);
  expect(Math.hypot(track.points.at(-1).x - expectedEnd.x, track.points.at(-1).y - expectedEnd.y)).toBeLessThan(18);

  await page.locator('#passModeDesktop').click();
  await inputAt(page, track.points.at(-1));
  await inputAt(page, p2);
  await expect.poll(async () => (await snapshot(page)).actions.length).toBe(1);
  const passed = await snapshot(page);
  expect(passed.actions[0]).toMatchObject({ type: 'pass', from: p1.id, to: p2.id, ownershipMismatch: false });

  await page.locator('#shotModeDesktop').click();
  await inputAt(page, p2);
  await expect.poll(async () => (await snapshot(page)).actions.length).toBe(2);
  const beforePlay = await snapshot(page);
  expect(beforePlay.actions.map(a => a.type)).toEqual(['pass', 'shot']);
  expect(beforePlay.actions.every(a => a.ownershipMismatch === false)).toBe(true);
  expect(beforePlay.actions[1].start).toBeGreaterThanOrEqual(
    beforePlay.actions[0].start + beforePlay.actions[0].duration - .001
  );

  await page.locator('#speed').selectOption('1.5');
  await page.locator('#play').click();
  await expect(page.locator('#stageStatus')).toContainText('Övningen klar.', { timeout: 15000 });
  const afterPlay = await snapshot(page);
  expect(afterPlay.actions.map(a => a.id)).toEqual(beforePlay.actions.map(a => a.id));
  expect(afterPlay.tracks[p1.id][0].points).toEqual(track.points);
});

test('desktop: freehand path and undo are reversible without deleting the player', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop editor tools');
  await page.locator('.palette [data-add="player"]').click();
  const p1 = player(await snapshot(page), 1);
  await page.locator('#pathModeDesktop').click();
  await expect(page.locator('#drawMenu')).toHaveClass(/open/);
  await page.locator('#drawMenu [data-draw-freehand]').click();
  await drawWorldPath(page, p1, { x: p1.x + 95, y: p1.y + 95 });
  await expect.poll(async () => (await snapshot(page)).tracks[p1.id]?.length ?? 0).toBe(1);
  const track = (await snapshot(page)).tracks[p1.id][0];
  expect(track.points.length).toBeGreaterThan(2);
  await page.locator('#undo').click();
  await expect.poll(async () => (await snapshot(page)).tracks[p1.id]?.length ?? 0).toBe(0);
  expect((await snapshot(page)).objects.filter(o => o.type === 'player')).toHaveLength(1);
});

test('mobile: tap to add two players, pass, shoot and complete playback', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop-chromium', 'Touch-only mobile editor journey');
  for (let i = 0; i < 2; i++) {
    await page.locator('#mobileAddMenu').tap();
    await expect(page.locator('#mobileAddPopover')).toBeVisible();
    await page.locator('#mobileAddPopover [data-add="player"]').tap();
  }
  const created = await snapshot(page);
  expect(created.objects.filter(o => o.type === 'player')).toHaveLength(2);
  const p1 = player(created, 1), p2 = player(created, 2);

  await page.locator('#mobilePass').tap();
  await inputAt(page, p1, true);
  await inputAt(page, p2, true);
  await expect.poll(async () => (await snapshot(page)).actions.length).toBe(1);

  await page.locator('#mobileShot').tap();
  await inputAt(page, p2, true);
  await expect.poll(async () => (await snapshot(page)).actions.length).toBe(2);
  const createdActions = (await snapshot(page)).actions;
  expect(createdActions.map(a => a.type)).toEqual(['pass', 'shot']);
  expect(createdActions[0]).toMatchObject({ from: p1.id, to: p2.id, ownershipMismatch: false });
  expect(createdActions[1].ownershipMismatch).toBe(false);
  expect(createdActions[1].start).toBeGreaterThanOrEqual(
    createdActions[0].start + createdActions[0].duration - .001
  );
  await page.locator('#speed').selectOption('1.5');
  await page.locator('#play').tap();
  await expect(page.locator('#stageStatus')).toContainText('Övningen klar.', { timeout: 15000 });
});
