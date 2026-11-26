/** Real production build browser smoke, no device FPS assertion. */
import {spawn} from 'node:child_process';
import {existsSync,mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4403,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/enemy-ai-lab.html')).ok){ready=true;break;}}catch{}await wait(150);}
 if(!ready)throw Error('EA lab preview unavailable');
 const executablePath=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable'].find(existsSync);
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 mkdirSync('artifacts/ea',{recursive:true});
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/enemy-ai-lab.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#actor')?.options.length>0,null,{timeout:60000});
   await page.locator('#step').click();
   await page.waitForFunction(()=>document.querySelector('#perf')?.textContent?.includes('1 ticks'));
   await page.locator('#play').click();
   await page.waitForFunction(()=>!document.querySelector('#perf')?.textContent?.includes('1 ticks'));
   await page.locator('#play').click();
   await page.locator('#geometry').check();
   const detail=await page.locator('#details').textContent();
   if(!detail?.includes('IDENTITY')||!detail.includes('SUSPICION'))throw Error('Missing real NPC inspection');
   const png=await page.locator('#map').screenshot({path:'artifacts/ea/lab-'+viewport.width+'.png'});
   if(png.length<1000||errors.length)throw Error('EA browser smoke '+errors.join(';'));
   await page.locator('#group').selectOption('regular-force');
   await page.locator('#tier').selectOption('trained');
   await page.locator('#reset').click();
   await page.waitForFunction(()=>document.querySelector('#perf')?.textContent==='No samples');
   const overridden=await page.locator('#details').textContent();
   if(!overridden?.includes('GROUP regular-force')||!overridden.includes('IDENTITY trained'))throw Error('EA lab profile override not applied');
   await page.locator('#quality').selectOption('low');
   const low=await page.locator('#dossier').textContent();
   if(low?.includes('Regular forces'))throw Error('Low threat report leaked affiliation');
   await page.locator('#quality').selectOption('high');
   const high=await page.locator('#dossier').textContent();
   if(!high?.includes('Regular forces')||!high.includes('reported weapons'))throw Error('High report missing issued profile');
   await page.locator('#sample-ticks').fill('10');
   await page.locator('#sample').click();
   await page.locator('#pin').click();
   if(!(await page.locator('#comparison').textContent())?.includes('Matched scenario'))throw Error('Comparison reference missing');
   if(!(await page.locator('#details').textContent())?.includes('ISSUED WEAPON'))throw Error('Kit inspector missing');
   console.log('EA/EB lab browser',viewport.width,'PASS');
  }finally{await page.close();}
 }
}finally{await browser?.close();server.kill('SIGTERM');}
