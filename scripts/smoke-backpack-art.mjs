/** BP4/5 iPhone-size production-geometry preview capture matrix. */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4199,origin='http://127.0.0.1:'+port,out='backpack-art-captures';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let live=false;
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/operator-lab.html')).ok){live=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 if(!live)throw Error('Lab server unavailable');
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/operator-lab.html?tab=poses&packArtCapture=1',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('preview')?.dataset.ready==='true',{},{timeout:45000});
 await page.locator('#poseArmor').selectOption('plate-jpc');
 await page.locator('#poseRig').selectOption('chest-placard');
 await page.locator('#poseUniform').selectOption('combat-shirt');
 await page.locator('#poseAnimation').selectOption('high-ready');
 const report=[];
 for(const [style,id] of [['hydration','hydration'],['admin-pack','assault-panel'],['day-pack','day-pack'],['assault-pack','assault-pack']]){
  await page.locator('#posePack').selectOption(style);
  await page.waitForFunction(id=>document.getElementById('preview')?.dataset.authoredPack===id,id,{timeout:20000});
  for(const view of ['front','back','side','iso','game']){
   await page.locator('[data-lab-group="poses"] [data-view="'+view+'"]').click();
   await page.locator('#preview').screenshot({path:out+'/'+id+'-'+view+'.png'});
  }
  for(const view of ['back','side','iso','front']){
   const png=await page.evaluate(view=>window.fieldworkCapturePack(view),view);
   await writeFile(out+'/'+id+'-'+view+'-native.png',Buffer.from(png.split(',')[1],'base64'));
  }
  report.push({id,data:await page.locator('#preview').evaluate(e=>({...e.dataset}))});
 }
 await page.locator('#poseArmor').selectOption('armor-bare');
 await page.waitForFunction(()=>document.getElementById('preview')?.dataset.poseFitArmor==='armor-bare');
 if(!(await page.locator('#posePack option[value="admin-pack"]').evaluate(e=>e.disabled)))throw Error('Incompatible panel not disabled');
 await writeFile(out+'/report.json',JSON.stringify({report,errors},null,2));
 if(errors.length)throw Error(errors.join('; '));
}finally{await browser?.close();server.kill();}
