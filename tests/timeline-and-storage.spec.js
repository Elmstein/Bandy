import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { exampleProject } from './helpers/project-fixture.js';

const snapshot = page => page.evaluate(() => window.bandyMatchSnapshot());

async function importProject(page, project) {
  await page.locator('#importJson').setInputFiles({
    name: 'quality-fixture.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  });
  await expect(page.locator('#stageStatus')).toContainText('Projekt importerat.');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#stage')).toBeVisible();
});

test('pass, pass, shot are causal and retain fixed anchors', async ({ page }) => {
  await importProject(page, exampleProject());
  const project = await snapshot(page);
  expect(project.actions.map(a => a.id)).toEqual(['a1', 'a2', 'a3']);
  expect(project.actions.map(a => a.type)).toEqual(['pass', 'pass', 'shot']);
  expect(project.actions.every(a => a.ownershipMismatch === false)).toBe(true);
  const [one, two, three] = project.actions;
  expect(two.start).toBeGreaterThanOrEqual(one.start + one.duration - 0.001);
  expect(three.start).toBeGreaterThanOrEqual(two.start + two.duration - 0.001);
  expect(one.fromAnchor).toEqual({ x: 170, y: 550 });
  expect(one.toAnchor).toEqual({ x: 350, y: 550 });
  expect(two.fromAnchor).toEqual({ x: 350, y: 550 });
  expect(two.toAnchor).toEqual({ x: 530, y: 550 });
  expect(project.eventNodes[one.toNodeId]).toMatchObject({ playerId: 'o2', x: 350, y: 550 });
});

test('an impossible pass cannot steal possession or delay a valid pass', async ({ page }) => {
  await importProject(page, exampleProject({ invalidFirstPass: true }));
  const p = await snapshot(page);
  expect(p.actions.map(a => a.id)).toEqual(['invalid', 'a1', 'a2', 'a3']);
  expect(p.actions[0].ownershipMismatch).toBe(true);
  expect(p.actions.slice(1).every(a => a.ownershipMismatch === false)).toBe(true);
  expect(p.actions[1].start).toBeCloseTo(0, 5);
  expect(p.actions[2].start).toBeGreaterThanOrEqual(p.actions[1].start + p.actions[1].duration - .001);
  expect(p.actions[3].start).toBeGreaterThanOrEqual(p.actions[2].start + p.actions[2].duration - .001);
});

test('export and re-import preserve the pass sequence and exact fixed points', async ({ page }) => {
  await importProject(page, exampleProject());
  const before = await snapshot(page);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#exportJson').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  expect(exported.actions.map(a => a.id)).toEqual(before.actions.map(a => a.id));
  expect(exported.actions.map(a => a.toAnchor)).toEqual(before.actions.map(a => a.toAnchor));
  expect(exported.eventNodes).toEqual(before.eventNodes);
  await importProject(page, exported);
  const after = await snapshot(page);
  expect(after.actions.map(a => a.id)).toEqual(before.actions.map(a => a.id));
  expect(after.actions.map(a => a.toAnchor)).toEqual(before.actions.map(a => a.toAnchor));
  expect(after.actions.map(a => a.start)).toEqual(before.actions.map(a => a.start));
});

test('invalid JSON import leaves the existing exercise intact', async ({ page }) => {
  await importProject(page, exampleProject());
  const before = await snapshot(page);
  await page.locator('#importJson').setInputFiles({
    name: 'invalid.json', mimeType: 'application/json',
    buffer: Buffer.from('{"version":99,"objects":[]}'),
  });
  await expect(page.locator('#stageStatus')).toContainText('Importen avvisades');
  const after = await snapshot(page);
  expect(after.objects).toEqual(before.objects);
  expect(after.actions.map(a => a.id)).toEqual(before.actions.map(a => a.id));
  expect(after.actions.map(a => a.toAnchor)).toEqual(before.actions.map(a => a.toAnchor));
});

test('saved exercise survives reload and can be opened from local storage', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop save/open controls');
  await importProject(page, exampleProject());
  await page.locator('#projectName').fill('Test sparat bibliotek');
  await page.locator('#saveProject').click();
  await expect(page.locator('#stageStatus')).toContainText('Sparade');
  const before = await snapshot(page);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('bandyEditor:v10:last')));
  expect(stored.objects).toEqual(before.objects);
  expect(stored.actions.map(a => a.id)).toEqual(['a1', 'a2', 'a3']);
  await page.reload();
  await page.locator('#openProject').click();
  const after = await snapshot(page);
  expect(after.name).toBe('Test sparat bibliotek');
  expect(after.objects).toEqual(before.objects);
  expect(after.actions.map(a => a.id)).toEqual(['a1', 'a2', 'a3']);
  expect(after.actions.map(a => a.toAnchor)).toEqual(before.actions.map(a => a.toAnchor));
});
