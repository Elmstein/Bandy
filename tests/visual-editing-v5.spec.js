import {test,expect} from '@playwright/test';
import {visualPage,comparison,importData,previousURL} from './helpers/visual-check.js';
import {exampleProject} from './helpers/project-fixture.js';

async function runPair(page,info,name,action){
  const old=await page.context().newPage();
  try {
    await visualPage(old,previousURL);
    await visualPage(page,'/');
    await action(old);
    await action(page);
    await comparison(info,old,page,name);
  } finally {await old.close();}
}

test('desktop: freehand/preset toolbar remains visually consistent',async ({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Desktop ribbon');
  await runPair(page,info,'desktop-drawing-menu',async p=>{
    await p.locator('.palette [data-add="player"]').click();
    await p.locator('#pathModeDesktop').click();
    await expect(p.locator('#drawMenu')).toHaveClass(/open/);
    await expect(p.locator('#drawMenu [data-draw-freehand]')).toBeVisible();
  });
});

test('mobile: More menu and options drawer are visible',async ({page},info)=>{
  test.skip(info.project.name==='desktop-chromium','Touch viewport only');
  await runPair(page,info,'mobile-options-drawer',async p=>{
    await p.locator('#mobileMoreMenu').tap();
    await expect(p.locator('#mobileMorePopover')).toBeVisible();
    await p.locator('#mobileProps').tap();
    await expect(p.locator('#properties')).toHaveClass(/open/);
  });
  const rect=await page.locator('#properties').boundingBox(),width=page.viewportSize().width;
  expect(rect).not.toBeNull();
  expect(rect.x).toBeGreaterThanOrEqual(-2);
  expect(rect.x+rect.width).toBeLessThanOrEqual(width+2);
});

test('pass and shot arrows match the baseline in the editing view',async ({page},info)=>{
  await runPair(page,info,'pass-and-shot-arrows',async p=>{
    await importData(p,exampleProject());
    await expect(p.locator('#flowItems .flowItem.pass')).toHaveCount(2);
    await expect(p.locator('#flowItems .flowItem.shot')).toHaveCount(1);
    expect(await p.locator('#actionLayer path').count()).toBeGreaterThan(0);
    if(info.project.name==='desktop-chromium'){
      await p.locator('#toggleProps').click();
      await expect(p.locator('#properties')).toHaveClass(/open/);
    }
  });
});
