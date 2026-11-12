/** P1 exact render-only visibility A/B. Chromium is mobile emulation,
 * NOT an iPhone GPU benchmark. Records both screenshots and counter samples.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';

const port=4291,base='http://127.0.0.1:'+port;
const output='artifacts/performance-p1';
mkdirSync(output,{recursive:true});
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(base+'/breach.html')).ok){ready=true;break;}}catch{}
  await pause(150);
 }
 if(!ready)throw Error('P1 Vite tactical server unavailable');
 const installed=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME?{executablePath:installed}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader']});
 const samples=[];
 for(const mode of ['memo','legacy']){
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:1,hasTouch:true,isMobile:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{
   if(m.type()==='error'&&
    /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))
    errors.push(m.text());
  });
  try{
   await page.goto(base+'/breach.html?quick=1&seed=23&perf=1'+
    (mode==='legacy'?'&presentationSight=legacy':''),
    {waitUntil:'domcontentloaded'});
   await page.locator('#breach3dCanvas').waitFor({state:'visible',
    timeout:60000});
   await page.waitForFunction(()=>document.querySelector('#phase')?.
    textContent?.includes('PLANNING'),null,{timeout:60000});
   // The renderer must submit real WebGL frames and populate the P1 overlay.
   await page.waitForFunction(()=>{
    const element=[...document.querySelectorAll('div')].find(
     e=>e.style.zIndex==='9999');
    return /P1 VISIBLE Q\/H\/M\/B \d+\/\d+\/\d+\/\d+/.test(
     element?.textContent??'');
   },null,{timeout:45000});
   await page.waitForTimeout(1750);
   const text=await page.evaluate(()=>[...document.querySelectorAll('div')]
    .find(e=>e.style.zIndex==='9999')?.textContent??'');
   const match=text.match(/P1 VISIBLE Q\/H\/M\/B (\d+)\/(\d+)\/(\d+)\/(\d+)/);
   if(!match)throw Error('Missing P1 counters on '+mode);
   const [queries,hits,misses,bypasses]=match.slice(1).map(Number);
   const image=await page.locator('#breach3dCanvas').screenshot();
   if(image.byteLength<2500)throw Error('Blank WebGL tactical '+mode);
   writeFileSync(output+'/'+mode+'.png',image);
   const result={mode,queries,hits,misses,bypasses,
    phase:await page.locator('#phase').textContent()};
   samples.push(result);
   if(mode==='memo'&&hits<1)
    throw Error('P1 memo should reuse sight on a stationary planning scene: '+
      JSON.stringify(result));
   if(mode==='legacy'&&(hits!==0||bypasses<1))
    throw Error('P1 legacy must bypass all lookups: '+JSON.stringify(result));
   if(errors.length)throw Error('WebGL errors '+mode+': '+errors.join(' | '));
   console.log('P1 live WebGL',JSON.stringify(result));
  }finally{await page.close();}
 }
 writeFileSync(output+'/diagnostics.json',JSON.stringify(samples,null,2));
 console.log('P1 memo/legacy browser A/B passed; no FPS claim from SwiftShader');
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
