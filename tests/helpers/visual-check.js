import { expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export async function visualPage(page, url) {
  await page.goto(url);
  await expect(page.locator('#stage')).toBeVisible();
  await page.addStyleTag({content: [
    '*,*::before,*::after { animation-duration:0s!important; transition-duration:0s!important; caret-color:transparent!important; }',
    '#stageStatus { visibility:hidden!important; }'
  ].join('\n')});
}
export async function comparison(info, previous, current, label) {
  const options={animations:'disabled',caret:'hide',fullPage:false,scale:'css'};
  const oldBytes=await previous.screenshot(options);
  const newBytes=await current.screenshot(options);
  const old=PNG.sync.read(oldBytes),now=PNG.sync.read(newBytes);
  expect([now.width,now.height]).toEqual([old.width,old.height]);
  const output=new PNG({width:old.width,height:old.height});
  const count=pixelmatch(old.data,now.data,output.data,old.width,old.height,{threshold:.12,includeAA:false});
  const rate=count/(old.width*old.height);
  if(rate>.0025){
    await info.attach(label+'-previous.png',{body:oldBytes,contentType:'image/png'});
    await info.attach(label+'-current.png',{body:newBytes,contentType:'image/png'});
    await info.attach(label+'-diff.png',{body:PNG.sync.write(output),contentType:'image/png'});
  }
  expect(rate,label+': '+count+' pixels differ.').toBeLessThanOrEqual(.0025);
}
export async function importData(page,data) {
  await page.locator('#importJson').setInputFiles({name:'visual-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await expect(page.locator('#stageStatus')).toContainText('Projekt importerat');
}
export const previousURL='http://127.0.0.1:4174/';
