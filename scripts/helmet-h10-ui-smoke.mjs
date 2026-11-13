/** H10.5 — actual mobile editor progressive-disclosure acceptance. */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const port=4211,url='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let started=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(url+'/operator-studio.html')).ok){started=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,150));
 }
 assert.ok(started,'H10 Studio did not start');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({
   viewport:{width:430,height:920},deviceScaleFactor:2,isMobile:true,hasTouch:true
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('studioCanvas')?.dataset.ready==='true',
   null,{timeout:30000});
  await page.getByRole('button',{name:'Customize head'}).click();
  await page.locator('#studioWorkflow [data-studio-step="items"]').click();
  const item=page.locator('[data-appearance-item="ach"]');
  await item.scrollIntoViewIfNeeded();await item.click();
  await page.locator('#studioWorkflow [data-studio-step="details"]').click();
  const enabled=async(name,want)=>{
   const b=page.getByRole('button',{name,exact:true});
   if((await b.getAttribute('aria-pressed'))!==String(want))await b.click();
  };
  const section=(title)=>page.locator('.material-group').filter({hasText:title});
  await enabled('ELASTIC BAND',false);
  assert.equal(await section('BAND COLOR').count(),0,'hidden band color is clutter');
  await enabled('ELASTIC BAND',true);
  assert.equal(await section('BAND COLOR').count(),1);
  await section('BAND COLOR').locator('select').selectOption('tan');
  await enabled('ELASTIC BAND',false);
  assert.equal(await section('BAND COLOR').count(),0);
  await enabled('ELASTIC BAND',true);
  assert.equal(await section('BAND COLOR').locator('select').inputValue(),'tan',
   'band swatch preference must survive off/on');
  await enabled('CAMERA',false);
  assert.equal(await section('CAMERA MOUNT').count(),0);
  await enabled('CAMERA',true);
  await section('CAMERA MOUNT').locator('select').selectOption('left');
  await enabled('CAMERA',false);
  assert.equal(await section('CAMERA MOUNT').count(),0);
  await enabled('CAMERA',true);
  assert.equal(await section('CAMERA MOUNT').locator('select').inputValue(),'left');
  await enabled('HELMET LIGHT',true);
  assert.equal(await section('HELMET LIGHT MOUNT').count(),1);
  await enabled('CHEMLIGHT',true);
  assert.equal(await section('CHEMLIGHT MOUNT').count(),1);
  assert.deepEqual(errors,[],'mobile UI has no runtime errors');
  console.log('H10.5 progressive disclosure and saved mounting preferences passed');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
