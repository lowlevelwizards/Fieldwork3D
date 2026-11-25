/** Critical browser smoke and actual WebGL draw comparison, no claimed device FPS. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const output='artifacts/veh-lab-browser';
mkdirSync(output,{recursive:true});
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4498','--strictPort'],{stdio:'ignore'});
const url='http://127.0.0.1:4498/vehicle-lab.html';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let browser;const report=[];
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await wait(150);}
 if(!ready)throw Error('Vehicle Lab server unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|GL_INVALID/i.test(m.text()))errors.push(m.text());});
  try{
   await page.goto(url);await page.locator('#diagnostics').waitFor();
   await page.waitForFunction(()=>document.getElementById('diagnostics').textContent.includes('vehicle triangles'));
   const controls=await page.locator('#family option').count();assert.equal(controls,6);
   for(let i=0;i<6;i++){
    await page.locator('#family').selectOption(String(i));
    await page.locator('#paint').selectOption('6');
    await page.locator('#view').selectOption('iso');
    await page.screenshot({path:output+'/'+viewport.width+'-family-'+i+'-iso.png'});
    await page.locator('#view').selectOption('side');
    await page.screenshot({path:output+'/'+viewport.width+'-family-'+i+'-side.png'});
   }
   await page.locator('#count').selectOption('6');await page.locator('#view').selectOption('iso');
   await page.screenshot({path:output+'/'+viewport.width+'-lineup.png'});
   await page.locator('#family').selectOption('0');
   await page.locator('#count').selectOption('50');
   await page.locator('#batch').selectOption('individual');
   const individual=await page.locator('#diagnostics').innerText();
   await page.locator('#batch').selectOption('instanced');
   const instanced=await page.locator('#diagnostics').innerText();
   assert.match(individual,/50 vehicle draws/);assert.match(instanced,/1 vehicle draws/);
   await page.screenshot({path:output+'/'+viewport.width+'-50-instanced.png'});
   await page.locator('#footprint').selectOption('on');await page.locator('#count').selectOption('1');
   await page.locator('#view').selectOption('top');
   await page.screenshot({path:output+'/'+viewport.width+'-footprint.png'});
   assert.deepEqual(errors,[]);
   report.push({viewport,individual,instanced,errors});
  }finally{await page.close();}
 }
 writeFileSync(output+'/summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server.kill();}
