import {spawn} from 'node:child_process';import {mkdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';import {chromium} from 'playwright';import assert from 'node:assert/strict';
const dir='artifacts/st-lab-browser';mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4499','--strictPort'],{stdio:'ignore'});
const url='http://127.0.0.1:4499/street-lab.html';let browser;
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}assert.ok(ready);
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>document.getElementById('diagnostics').textContent.includes('draws'));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  for(const type of ['proposal','legacy']){
   await page.locator('#layout').selectOption(type);
   for(const view of ['iso','top']){await page.locator('#view').selectOption(view);await page.screenshot({path:dir+'/'+viewport.width+'-'+type+'-'+view+'.png'});}
  }
  await page.locator('#layout').selectOption('proposal');await page.locator('#kind').selectOption('industrial');
  assert.deepEqual(errors,[]);await page.close();
 }
}finally{await browser?.close();server.kill();}
