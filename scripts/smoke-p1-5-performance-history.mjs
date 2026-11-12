/** P1.5 mobile WebGL performance history smoke.
 * Chromium/SwiftShader is a functional test, not an iPhone FPS benchmark.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4292,base='http://127.0.0.1:'+port;
const dir='artifacts/performance-p1-5';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const pause=ms=>new Promise(done=>setTimeout(done,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(base+'/breach.html')).ok){ready=true;break;}}catch{}
  await pause(150);
 }
 if(!ready)throw Error('P1.5 Vite server unavailable');
 const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME?{executablePath:binary}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader']});
 for(const policy of ['default','always','planning']){
  const effectivePolicy=policy==='default'?'planning':policy;
  const policyQuery=policy==='default'?'':'&presentationSight='+policy;
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',e=>{
   if(e.type()==='error'&&
      /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(e.text()))
    errors.push(e.text());
  });
  try{
   await page.goto(base+'/breach.html?quick=1&seed=23&perf=1'+
    '&presentationSight='+policy,{waitUntil:'domcontentloaded'});
   await page.locator('#breach3dCanvas').waitFor({state:'visible',timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#phase')?.
    textContent==='PLANNING',null,{timeout:60000});
   await page.waitForFunction(()=>[...document.querySelectorAll('div')]
    .some(e=>e.style.zIndex==='9999'&&
     e.textContent?.includes('P1.5 SCENE ENV/CAM/VIS')&&
     e.textContent?.includes('POLICY '+window.location.search.split('presentationSight=')[1])),
    null,{timeout:60000});
   const panel=page.locator('div[aria-label="Fieldwork 60-second performance timeline"]');
   await panel.waitFor({state:'visible'});
   const chart=panel.locator('canvas');
   if(!(await chart.isVisible()))throw Error('P1.5 graph hidden');
   await page.waitForTimeout(1400);
   await panel.screenshot({path:dir+'/'+policy+'-planning.png'});
   // Read historical spike by touching the chart, not by pausing simulation.
   await chart.click({position:{x:92,y:50}});
   if(!(await panel.innerText()).includes('SELECTED'))
    throw Error('P1.5 tapping chart did not select a bucket');
   await page.evaluate(()=>{
    Object.defineProperty(navigator,'clipboard',{configurable:true,
      value:{writeText:async str=>{window.__p15Copied=str;}}});
   });
   await panel.getByRole('button',{name:'COPY'}).click();
   await page.waitForFunction(()=>typeof window.__p15Copied==='string');
   const report=await page.evaluate(()=>window.__p15Copied);
   if(!report.includes('PERFORMANCE HISTORY')||
      !report.includes('t_sec,raf_peak_ms'))
    throw Error('P1.5 report missing summary or history CSV');
   writeFileSync(dir+'/'+policy+'-report.txt',report);
   await page.locator('#play').click();
   await page.waitForFunction(()=>document.querySelector('#phase')?.
    textContent==='EXECUTING',null,{timeout:30000});
   await page.waitForFunction(()=>[...document.querySelectorAll('div')]
    .some(e=>e.style.zIndex==='9999'&&
     e.textContent?.includes('P1.5 POSE/FX/FOG')&&
     e.textContent?.includes('POLICY '+window.location.search.split('presentationSight=')[1])),
    null,{timeout:30000});
   await page.waitForTimeout(1800);
   const text=await panel.textContent();
   const match=text.match(/P1 750ms Q\/H\/M\/B (\d+)\/(\d+)\/(\d+)\/(\d+)/);
   if(!match)throw Error('P1.5 missing recent cache interval');
   const detail=match.slice(1).map(Number);
   // An opt-in planning-only strategy must bypass active execution queries.
   if(policy==='planning'&&!/P1 VISIBLE Q\/H\/M\/B/.test(text))
    throw Error('P1.5 no stable total cache counters');
   await panel.screenshot({path:dir+'/'+policy+'-execution.png'});
   if(errors.length)throw Error('P1.5 WebGL error '+policy+': '+errors.join(';'));
   console.log('P1.5 mobile WebGL',JSON.stringify({policy,recent:detail,
    reportBytes:report.length,active:true}));
  }finally{await page.close();}
 }
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
