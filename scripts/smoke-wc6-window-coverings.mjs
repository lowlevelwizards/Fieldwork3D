/** Real browser smoke and retained gallery evidence, no production side effects. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const port=4287,origin='http://127.0.0.1:'+port,root='artifacts/wc6';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore',env:{...process.env,CI:'true'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(origin+'/asset-lab.html')).ok){ready=true;break;}}catch{}await sleep(180);}
 assert.ok(ready,'Vite unavailable');await mkdir(root,{recursive:true});
 browser=await chromium.launch({headless:true,channel:'chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|linker/i.test(m.text()))errors.push(m.text());});
 await page.goto(origin+'/asset-lab.html',{waitUntil:'domcontentloaded'});
 await page.locator('#category option[value="Window Coverings"]').waitFor({state:'attached',timeout:90000});
 await page.locator('#category').selectOption('Window Coverings');
 await page.waitForFunction(()=>document.querySelector('#summary')?.textContent.includes('36 assets'));
 for(const family of ['curtain','vertical-blind','horizontal-blind','roller-shade','hinged-shutter','rolling-shutter']){
  await page.locator('#search').fill('window-covering:'+family+':');
  await page.waitForFunction(()=>document.querySelector('#summary')?.textContent.includes('6 assets'));
  assert.equal(await page.locator('#labels [data-asset-id]').count(),6);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:root+'/'+family+'.png'});
 }
 await page.goto(origin+'/?quick=1&seed=23',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#phase')?.textContent==='PLANNING'&&!!document.querySelector('#breach3dCanvas'),null,{timeout:90000});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:root+'/generated-map.png'});
 assert.deepEqual(errors,[]);console.log('WC6 gallery: 36 specimens, six captures and generated mission WebGL smoke passed');
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
