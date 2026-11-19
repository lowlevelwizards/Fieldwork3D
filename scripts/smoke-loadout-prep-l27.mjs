/** L2.7 real Chromium acceptance: compact equipment editor on phone and
 * desktop, including the actual THREE character preview where available.
 * Install playwright@1.56.1 and chromium in CI before running.
 */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4279,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(origin+'/loadout-prep-visual-smoke.html')).ok){ready=true;break}}
  catch{}
  await new Promise(r=>setTimeout(r,150));
 }
 assert.ok(ready,'Vite test page available');
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 await mkdir('reports',{recursive:true});
 const results=[];
 for(const [device,width,height] of [['phone',390,844],['desktop',1280,850]]){
  const page=await browser.newPage({viewport:{width,height},
   deviceScaleFactor:device==='phone'?2:1,
   isMobile:device==='phone',hasTouch:device==='phone'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/loadout-prep-visual-smoke.html',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.dataset.loadoutPrepReady==='1');
  const launch=page.getByRole('button',{name:'Prepare Campaign squad field equipment before GO'});
  await launch.click();
  const panel=page.getByRole('dialog',{name:'Campaign squad preparation'});
  await panel.waitFor({state:'visible'});
  const row=panel.locator('.fw-field-inventory-item').filter({hasText:'Flashbang'});
  assert.match(await row.locator('.fw-field-inventory-quantity').innerText(),/×1/);
  const rigMeter=panel.getByRole('meter',{name:'RIG occupied carrying spaces'});
  assert.equal(await panel.getByRole('meter').count(),4,'all four physical carriers have gauges');
  const rigItems=panel.locator('.fw-field-inventory-slot[data-location="rig"]')
   .locator('.fw-field-inventory-carry-tile');
  assert.ok(await rigItems.count()>0,'rig lists actual carried items');
  assert.equal(await rigItems.filter({hasText:'Flashbang'}).count(),1,
   'actual issued flashbang appears in its carrier');
  const before=Number(await rigMeter.getAttribute('aria-valuenow'));
  assert.ok(before>=1,'issued flash occupies a rig carrying space');
  const action=panel.getByRole('button',{name:'Add one Flashbang'});
  assert.ok((await action.boundingBox()).height>=38,'quantity touch target');
  await row.getByRole('button',{name:'Remove one Flashbang'}).click();
  assert.match(await row.locator('.fw-field-inventory-quantity').innerText(),/×0/);
  assert.equal(Number(await rigMeter.getAttribute('aria-valuenow')),before-1,
   'physical capacity gauge reflects removing one flashbang');
  await panel.getByRole('button',{name:'Undo last gadget change'}).click();
  assert.match(await row.locator('.fw-field-inventory-quantity').innerText(),/×1/);
  assert.equal(Number(await rigMeter.getAttribute('aria-valuenow')),before,
   'undo restores physical capacity gauge');
  await panel.getByRole('button',{name:'AUTO PACK'}).click();
  assert.match(await panel.getByRole('status').innerText(),/ALREADY PACKED/);
  assert.equal(Number(await rigMeter.getAttribute('aria-valuenow')),before,
   'no-op auto pack preserves the true physical carrying report');
  const pickOne=panel.getByRole('button',{name:'Select one Flashbang from RIG'});
  const preview=panel.locator('.fw-pre-go-preview');
  const previewHasWebGL=await preview.locator('canvas').count()>0;
  await pickOne.click();
  if(previewHasWebGL)
   assert.equal(await preview.getAttribute('data-carry-highlight'),'rig',
    'selecting a stored item marks its real 3D rig location');
  assert.equal(await pickOne.getAttribute('aria-pressed'),'true',
   'physical item selection is visible and keyboard accessible');
  const placeOne=panel.getByRole('button',{name:'Place selected item in BACKPACK'});
  assert.equal(await placeOne.isEnabled(),true,'real inventory fit is verified before placement');
  await placeOne.click();
  if(previewHasWebGL){
   assert.equal(await preview.getAttribute('data-carry-highlight'),'backpack',
    'successful placement retargets the same preview carry marker');
   assert.equal(await preview.locator('canvas').count(),1,
    'physical item transfer does not recreate the 3D renderer');
  }
  assert.equal(await panel.getByRole('button',{name:'Select one Flashbang from RIG'}).count(),0,
   'one flash leaves its source carrier');
  assert.equal(await panel.getByRole('button',{name:'Select one Flashbang from BACKPACK'}).count(),1,
   'the exact issued flash reaches the destination carrier');
  await panel.getByRole('button',{name:'Undo last gadget change'}).click();
  assert.equal(await panel.getByRole('button',{name:'Select one Flashbang from RIG'}).count(),1,
   'undo restores the original carrying position');
  if(device==='desktop'){
   const source=await panel.getByRole('button',{name:'Select one Flashbang from RIG'})
    .boundingBox();
   const target=await panel.locator('.fw-field-inventory-slot[data-location="backpack"]')
    .boundingBox();
   assert.ok(source&&target,'pointer target zones are visible');
   await page.mouse.move(source.x+source.width/2,source.y+source.height/2);
   await page.mouse.down();
   await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:6});
   await page.mouse.up();
   assert.equal(await panel.getByRole('button',{name:'Select one Flashbang from BACKPACK'}).count(),1,
    'pointer drag transfers exactly one physical flash');
   await panel.getByRole('button',{name:'Undo last gadget change'}).click();
   assert.equal(await panel.getByRole('button',{name:'Select one Flashbang from RIG'}).count(),1,
    'pointer drag transaction can be undone');
  }
  await panel.getByLabel('Operator to copy gadgets to').selectOption('moss');
  await panel.getByRole('button',{name:'Copy carried gadgets to selected operator'}).click();
  assert.match(await panel.locator('.fw-pre-go-note').innerText(),/copied/i);
  const dimensions=await page.evaluate(()=>{
   const panel=document.querySelector('.fw-pre-go-panel');
   const editor=document.querySelector('.fw-field-inventory');
   return {viewport:innerWidth,document:document.documentElement.scrollWidth,
    panel:Math.round(panel.getBoundingClientRect().width),
    panelScrollWidth:panel.scrollWidth,
    editor:Math.round(editor.getBoundingClientRect().width),
    editorScrollWidth:editor.scrollWidth,
    canisters:document.querySelectorAll('.fw-pre-go-preview canvas').length};
  });
  assert.ok(dimensions.document<=width+2,'page horizontal overflow');
  assert.ok(dimensions.editorScrollWidth<=dimensions.editor+3,
   'equipment editor horizontal overflow');
  await page.screenshot({path:'reports/loadout-prep-'+device+'.png',
   animations:'disabled'});
  await panel.getByRole('button',{name:'BACK TO BRIEFING'}).click();
  assert.equal(await panel.isVisible(),false);
  await page.evaluate(()=>window.loadoutPrepSmoke.stop());
  await launch.click();
  assert.equal(await panel.isVisible(),false,'cannot re-enter equipment prep after GO');
  assert.deepEqual(errors,[],'uncaught browser errors');
  results.push({device,...dimensions,errors});
  await page.close();
 }
 await writeFile('reports/loadout-prep-l27-acceptance.json',
  JSON.stringify(results,null,2)+'\n');
 console.log('Loadout Prep L2.7 browser acceptance PASS',JSON.stringify(results));
}finally{await browser?.close();server.kill('SIGTERM');}
