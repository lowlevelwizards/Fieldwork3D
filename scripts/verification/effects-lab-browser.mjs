import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:4476',dir='artifacts/effects-lab';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4476','--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 assert.ok(ready);
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // Validate the actual delivered HTML menu entry before opening the lab.
  const markup=await (await page.request.get(origin+'/index.html')).text();
  assert.match(markup,/<a[^>]+href="\.\/breach-visual-lab\.html"[^>]*>EFFECTS LAB<\/a>/);
  await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('.campaign-landing-more').click({timeout:60000});
  await page.locator('.campaign-landing-labs > summary').click();
  const link=page.locator('.campaign-landing-labs').getByRole('link',{name:'EFFECTS LAB',exact:true});
  await link.waitFor({state:'visible'});
  await page.screenshot({path:dir+'/'+viewport.width+'-dev-menu.png'});
  await link.click();
  await page.waitForURL('**/breach-visual-lab.html');
  await page.locator('body[data-ready=true]').waitFor({state:'attached',timeout:60000});
  await page.locator('#breach3dCanvas').waitFor({state:'visible'});
  await page.locator('#speed').selectOption('.25');
  for(const id of ['hit','pool','stabilize','stone','wood','metal','dust','flash','muzzle','glass','vegetation','reset']){
   await page.locator('#'+id).click();await page.waitForTimeout(id==='pool'?2500:180);
   assert.ok((await page.locator('#status').innerText()).length>10);
   if(['hit','pool','stone','glass','vegetation'].includes(id))await page.screenshot({path:dir+'/'+viewport.width+'-'+id+'.png'});
  }
  // Inspect all three stages on a freshly reset exterior pane.
  await page.locator('#vegetation').click();
  await page.locator('#reset').click();
  for(let i=1;i<=3;i++){
   await page.locator('#glass').click();
   const status=await page.locator('#status').innerText();
   assert.match(status,i<3?new RegExp('damaged '+i+'/3'):/shattered/);
   await page.screenshot({path:dir+'/'+viewport.width+'-glass-stage-'+i+'.png'});
  }
  for(const id of ['glass-door','collapse']){
   await page.locator('#'+id).click();
   assert.match(await page.locator('#status').innerText(),/fractured leaf|collapsed/);
   await page.screenshot({path:dir+'/'+viewport.width+'-'+id+'-burst.png'});
  }
  await page.locator('.casing-controls summary').click();
  await page.locator('#casingCount').fill('12');
  await page.locator('#casingDebug').check();
  await page.locator('#casings').click();
  assert.match(await page.locator('#status').innerText(),/Spent casings · 12 planned/);
  await page.locator('#casingDebugOverlay path').first().waitFor({state:'attached'});
  assert.equal(await page.locator('#casingDebugOverlay path').count(),12);
  await page.locator('#speed').selectOption('1');
  await page.waitForTimeout(2500);
  await page.screenshot({path:dir+'/'+viewport.width+'-casings.png'});
  await page.locator('#casingWeapon').selectOption('glock');
  await page.locator('#casingObstacle').selectOption('wall');
  await page.locator('#casings').click();
  assert.match(await page.locator('#status').innerText(),/Glock/);
  await page.screenshot({path:dir+'/'+viewport.width+'-casing-glock-barrier.png'});
  await page.locator('.casing-controls summary').click();
  await page.locator('#pause').click();await page.locator('#step').click();await page.locator('#gameZoom').click();
  assert.deepEqual(errors,[]);assert.equal(await page.locator('#breach3dCanvas').count(),1);
  await page.close();
 }
}finally{await browser?.close();server.kill();}
