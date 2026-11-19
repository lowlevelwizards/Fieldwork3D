/** Visual Armory V1: verify TRUE 3D model cards in one Campaign phone session. */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4286,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ok=false;
 for(let i=0;i<140;i++){
  try{if((await fetch(origin+'/index.html')).ok){ok=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,120));
 }
 assert.ok(ok,'Armory preview server responds');
 const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('.campaign-landing-primary').waitFor({timeout:30000});
  await page.locator('.campaign-landing-primary').click();
  await page.getByRole('button',{name:/^DISPATCH —/}).click();
  await page.getByRole('button',{name:'CREATE DISPATCH',exact:true}).click();
  await page.locator('#campaign-tab-personnel').waitFor({timeout:30000});
  await page.locator('#campaign-tab-personnel').click();
  const person=page.locator('.campaign-person').first();
  await person.locator('.campaign-person-expand > summary').click();
  await person.getByRole('button',{name:/^Open .* loadout$/}).click();
  const armory=page.locator('.campaign-armory-screen');
  await armory.waitFor({timeout:30000});
  assert.ok(await armory.locator('.campaign-kit-preview canvas').count(),
   'Must use actual shared WebGL operator rig');
  await armory.getByRole('button',{name:'PHYSICAL CARRY'}).click();
  const carried=armory.locator('.fw-field-inventory-slot[data-location="rig"]');
  const row=carried.locator('.fw-field-inventory-carry-tile').filter({hasText:'Flashbang'});
  await row.scrollIntoViewIfNeeded();
  await row.locator('.fw-field-inventory-model[data-model="real"] img')
   .waitFor({timeout:18000});
  const real=await row.locator('.fw-field-inventory-model img').evaluate(img=>({
   width:img.naturalWidth,height:img.naturalHeight,
   prefix:img.getAttribute('src')?.slice(0,22)
  }));
  assert.ok(real.width>100&&real.height>100,'Real 3D model screenshot is populated');
  assert.ok(real.prefix?.startsWith('data:image/png'),'Uses WebGL model, not icon URLs');
  await mkdir('visual-armory-captures',{recursive:true});
  await page.screenshot({path:'visual-armory-captures/carry-3d-390.png'});
  await row.locator('button').click();
  assert.equal(await armory.locator('.campaign-kit-preview')
   .getAttribute('data-inspected-item'),'flashbang',
   'Selecting physical item focuses exact on-body 3D mesh');
  await armory.getByRole('button',{name:'EQUIPMENT',exact:true}).click();
  await armory.getByRole('tab',{name:'PROTECTION'}).click();
  const gear=armory.locator('.fw-loadout-group[data-loadout-group="protection"]')
   .locator('.campaign-kit-visual-trigger').first();
  await gear.locator('.campaign-kit-selected-model[data-model="real"] img')
   .waitFor({timeout:16000});
  await gear.click();
  const options=page.locator('.campaign-gear-picker-option');
  assert.ok(await options.count()>=2,'Visual options are populated');
  await options.locator('.campaign-gear-picker-model[data-model="real"] img').first()
   .waitFor({timeout:18000});
  await page.screenshot({path:'visual-armory-captures/gear-options-3d-390.png'});
  assert.ok(!errors.length,'Browser exceptions: '+errors.join('; '));
  console.log('Visual Armory genuine 3D carry and gear thumbnails PASS',real);
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
