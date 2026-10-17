import {test,expect} from '@playwright/test';
import {visualPage,comparison,importData,previousURL} from './helpers/visual-check.js';
import {exampleProject} from './helpers/project-fixture.js';

function motionProject(){
  const p=exampleProject();
  p.actions=[];
  p.ballOwnerStart=null;
  p.name='Parallella åkbanor';
  p.tracks={
    o1:[{id:'s1',points:[{x:170,y:550},{x:170,y:460},{x:310,y:460}],speed:1,start:0,baseDelay:0}],
    o2:[{id:'s2',points:[{x:350,y:550},{x:420,y:550},{x:460,y:450}],speed:1,start:0,baseDelay:0}],
  };
  return p;
}
function position(transform){
  const match=/translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(transform||'');
  if(!match)throw Error('Missing player position: '+transform);
  return {x:Number(match[1]),y:Number(match[2])};
}
async function positions(page){
  const list=[];
  for(const id of ['o1','o2'])
    list.push(position(await page.locator('#objects .obj[data-id="'+id+'"]').getAttribute('transform')));
  return list;
}
test('two simultaneously skating players render the same paused frame as last release',async ({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Controlled desktop animation reference');
  const previous=await page.context().newPage();
  try {
    for(const p of [previous,page])
      await p.clock.install({time:new Date('2026-01-01T12:00:00Z')});
    for(const [p,url] of [[previous,previousURL],[page,'/']]){
      await visualPage(p,url);
      await importData(p,motionProject());
      const start=await positions(p);
      await p.locator('#play').click();
      await p.clock.runFor(650);
      await p.locator('#pause').click();
      const now=await positions(p);
      for(let i=0;i<2;i++){
        const delta=Math.hypot(now[i].x-start[i].x,now[i].y-start[i].y);
        expect(delta,'Player '+(i+1)+' did not move').toBeGreaterThan(20);
      }
    }
    await comparison(info,previous,page,'simultaneous-skating-paused');
  } finally {await previous.close();}
});
