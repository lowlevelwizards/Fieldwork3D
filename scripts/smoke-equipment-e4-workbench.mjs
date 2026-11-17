/** Equipment E4: real mobile Campaign Arsenal preview, scroll, and commit smoke.
 * Runs against the existing Campaign adapter fixture, not mocked transactions. */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const port=4279,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(origin+'/arsenal-m28-apply-smoke.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('Arsenal E4 fixture unavailable');
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({
  viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true
 });
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/arsenal-m28-apply-smoke.html?mode=campaign',
  {waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.body.dataset.m28Ready==='true',
  null,{timeout:30000});
 const screen=page.locator('.arsenal-wb-screen');
 const model=page.locator('.arsenal-wb-viewport');
 const apply=page.getByRole('button',{name:'EQUIP BUILD',exact:true});
 const layout=await page.evaluate(()=>{
  const screen=document.querySelector('.arsenal-wb-screen');
  const model=document.querySelector('.arsenal-wb-viewport');
  const action=document.querySelector('.arsenal-wb-apply');
  return {
   sticky:getComputedStyle(model).position,
   dock:getComputedStyle(action).position,
   context:screen.classList.contains('arsenal-wb-has-apply'),
   modelCount:document.querySelectorAll('.arsenal-wb-canvas').length
  };
 });
 assert.equal(layout.sticky,'sticky','phone model must remain visible during editing');
 assert.equal(layout.dock,'fixed','campaign Apply must remain accessible');
 assert.equal(layout.context,true,'campaign commit state missing');
 assert.equal(layout.modelCount,1,'workbench duplicated weapon canvas');
 // Factory browsing must filter by platform and inspect changes without
 // committing to Campaign or discarding the current live draft.
 await page.getByRole('button',{name:'CHOOSE MODEL',exact:true}).click();
 const factory=page.getByRole('dialog',{name:'CHOOSE FACTORY MODEL'});
 await factory.waitFor({state:'visible'});
 assert.equal(await factory.locator('.arsenal-wb-platform-chip[aria-pressed="true"]')
  .getAttribute('data-platform'),'ar15','Factory platform default drifted');
 await factory.locator('.arsenal-wb-platform-chip[data-platform="g36"]').click();
 assert.equal(await factory.locator('.arsenal-wb-platform-chip[aria-pressed="true"]')
  .getAttribute('data-platform'),'g36','Platform filter failed');
 if(!await factory.locator('.arsenal-wb-load-option').count())
  throw Error('G36 factory variants are not discoverable');
 await factory.locator('.arsenal-wb-platform-chip[data-platform="ar15"]').click();
 const alternate=factory.locator('.arsenal-wb-load-option').filter({hasText:/CHANGES/}).first();
 await alternate.waitFor({state:'visible'});
 await alternate.click();
 assert.match(await factory.locator('.arsenal-wb-load-changes').innerText(),
  /REVIEW [0-9]+ CHANGES/,'Factory chooser does not explain modifications');
 assert.equal(await page.evaluate(()=>document.body.dataset.m28Applied),undefined,
  'Factory model preview mutated Campaign');
 await factory.getByRole('button',{name:'CANCEL',exact:true}).click();
 await page.getByRole('button',{name:'Accessories',exact:true}).click();
 await page.getByRole('button',{name:'Light',exact:true}).click();
 const mount=page.locator('.arsenal-wb-mounting');
 await mount.waitFor({state:'visible'});
 await mount.getByRole('button',{name:/Mount on left/i}).click();
 assert.match(await page.locator('.arsenal-wb-commit-hint').innerText(),/PREVIEW ONLY/);
 assert.equal(await page.evaluate(()=>document.body.dataset.m28Applied),undefined,
  'view-only mount selection must not mutate Campaign');
 await screen.evaluate(element=>{element.scrollTop=260});
 await page.waitForTimeout(80);
 const boxes=await page.evaluate(()=>{
  const model=document.querySelector('.arsenal-wb-viewport').getBoundingClientRect();
  const apply=document.querySelector('.arsenal-wb-apply').getBoundingClientRect();
  return {modelTop:model.top,modelBottom:model.bottom,
   applyTop:apply.top,applyBottom:apply.bottom,height:innerHeight,
   scrollX:document.documentElement.scrollWidth-innerWidth};
 });
 assert.ok(boxes.modelBottom>0&&boxes.modelTop>=-2,
  'scrolling controls hid the live weapon model');
 assert.ok(boxes.applyTop>=0&&boxes.applyBottom<=boxes.height+2,
  'Equip action is outside the phone viewport');
 assert.ok(boxes.scrollX<=2,'phone workbench causes horizontal overflow');
 await apply.click();
 await page.waitForFunction(()=>Boolean(document.body.dataset.m28Applied),
  null,{timeout:30000});
 const after=JSON.parse(await page.evaluate(()=>document.body.dataset.m28Applied));
 assert.equal(after.face,'left','committed left-side mounting was not persisted');
 assert.equal(after.sameSave,true,'Campaign adapter did not retain the mount');
 assert.deepEqual(errors,[],'workbench browser runtime errors');
 console.log('Equipment E4 phone model continuity and authoritative Apply passed');
 await page.close();
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
