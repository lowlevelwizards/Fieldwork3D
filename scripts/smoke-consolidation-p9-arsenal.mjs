/** P9: verify the shipping Arsenal page on real WebGL, not a mock gallery.
 * Only the active secondary tab should generate its pistol thumbnails.
 */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const port=4299,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(origin+'/arsenal.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 assert.ok(ready,'Arsenal page available');
 const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  for(const viewport of [{width:390,height:844},{width:1200,height:850}]){
   const page=await browser.newPage({viewport,isMobile:viewport.width<500,
    hasTouch:viewport.width<500});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/arsenal.html',{waitUntil:'domcontentloaded'});
   const tab=page.getByRole('button',{name:'SECONDARIES · GLOCK'});
   await tab.waitFor({timeout:20000});
   assert.equal(await page.locator('.arsenal-glock-card-preview img').count(),0,
    'hidden secondary gallery performs no eager thumbnail painting');
   await tab.click();
   const gallery=page.locator('.arsenal-glock-gallery');
   assert.equal(await gallery.isVisible(),true);
   await gallery.locator('.arsenal-glock-hero-visual img').waitFor({timeout:45000});
   await gallery.locator('.arsenal-glock-card-preview img').first().waitFor({timeout:45000});
   const image=gallery.locator('.arsenal-glock-card-preview img').first();
   assert.ok((await image.getAttribute('src'))?.startsWith('data:image/'));
   const search=gallery.locator('.arsenal-glock-search');
   // Rapidly replace card hosts: stale jobs must not paint wrong models.
   await search.fill('G19X');
   await search.fill('G26');
   await search.fill('G19X');
   await gallery.locator('.arsenal-glock-card').first().waitFor();
   assert.equal(await gallery.locator('.arsenal-glock-card').count(),1);
   await gallery.locator('.arsenal-glock-card').first().click();
   await gallery.locator('.arsenal-glock-model').filter({hasText:/19X/i}).waitFor();
   await gallery.locator('.arsenal-glock-card-preview img').first().waitFor({timeout:45000});
   assert.deepEqual(errors,[],'No JS errors after changing filters');
   await page.close();
  }
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
