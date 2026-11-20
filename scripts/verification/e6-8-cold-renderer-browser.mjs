/** E6.8: four independent cold Quick Play browser runs: seed 23/97,
 * compileAsync enabled/disabled. ANGLE SwiftShader is software rendering:
 * no physical GPU, Safari/iOS, GPU elapsed timer or FPS claim.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';

const port=4398,base='http://127.0.0.1:'+port;
const dir='artifacts/refactor-e6-8/cold-renderer';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<150;i++){
  try{if((await fetch(base+'/breach.html')).ok){ready=true;break;}}
  catch{}
  await wait(150);
 }
 if(!ready)throw Error('E6.8 Vite server unavailable');
 const binary=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 const freshBrowser=()=>chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME&&binary?{executablePath:binary}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader']});
 const evidence={
  schema:'fieldwork-e6.8-browser-cold-ab-v1',
  runner:'fresh Chromium process and mobile-emulated WebGL context per run; ANGLE SwiftShader',
  warning:'All GL call timings and compileAsync wall times are browser/driver CPU wall time. Fresh browser processes reduce but cannot eliminate shared OS/GPU shader cache and scheduling confounds. No GPU execution timing or iPhone FPS; not a statistical A/B.',
  runs:[]
 };
 for(const seed of [23,97]){
  for(const gpuWarmup of ['1','0']){
   // A fresh Chromium process per scenario avoids within-browser shader
   // caches contaminating warmup-on/off comparisons.
   browser=await freshBrowser();
   const page=await browser.newPage({viewport:{width:390,height:844},
    deviceScaleFactor:1,hasTouch:true,isMobile:true});
   const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   page.on('console',msg=>{
    if(msg.type()==='error'&&
      /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.
        test(msg.text()))errors.push(msg.text());
   });
   try{
    // Launch through the actual Quick Play creator, not ?quick=1:
    // the latter boots a legacy world directly and bypasses compileAsync.
    // Starting from the menu also keeps the renderer cold until setup.
    await page.goto(base+'/breach.html?gpuTrace=1&gpuWarmup='+gpuWarmup,
     {waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:'QUICK PLAY',exact:true}).
     click({timeout:60000});
    const dialog=page.getByRole('dialog',{name:'Quick Play mission setup'});
    await dialog.waitFor({state:'visible',timeout:60000});
    // The seed is a deliberate advanced choice in the compact setup UI.
    const advanced=dialog.locator('details.fw-quick-config-advanced');
    if(!(await advanced.evaluate(element=>element.open)))
     await advanced.locator(':scope > summary').click();
    await dialog.getByRole('spinbutton',{name:'Seed, blank for random'}).
     fill(String(seed));
    await dialog.getByRole('button',{name:'GENERATE MISSION'}).click();
    await page.waitForFunction(seed=>
      window.__fieldworkE68?.seed===seed,seed,{timeout:180000});
    const trace=await page.evaluate(()=>window.__fieldworkE68);
    if(trace.schema!=='fieldwork-e6.8-cold-renderer-v1')
     throw Error('Invalid cold renderer schema');
    if(trace.rendererConstructorMs<0||
       trace.captures.filter(c=>c.phase==='firstFrame').length!==1)
     throw Error('Missing first-frame capture');
    if(gpuWarmup==='1'&&!trace.captures.some(c=>c.phase==='compileAsync'))
     throw Error('Enabled compileAsync capture missing');
    if(gpuWarmup==='0'&&trace.captures.some(c=>c.phase==='compileAsync'))
     throw Error('Warmup disabled but compileAsync recorded');
    if(!trace.installedHooks.includes('linkProgram')||
       !trace.installedHooks.includes('texImage2D'))
     throw Error('Critical GL hook unavailable in Chromium');
    if(errors.length)throw Error('Browser shader/page errors: '+errors.join(' | '));
    const path=dir+'/seed-'+seed+'-warmup-'+gpuWarmup+'.json';
    writeFileSync(path,JSON.stringify(trace,null,2)+'\n');
    const first=trace.captures.find(c=>c.phase==='firstFrame');
    const warm=trace.captures.find(c=>c.phase==='compileAsync');
    const sum=(capture,names)=>names.reduce((t,k)=>
     t+(capture?.calls?.[k]?.cpuWallMs??0),0);
    evidence.runs.push({seed,gpuWarmup,
     constructorMs:trace.rendererConstructorMs,
     compileAsyncWallMs:warm?.wallMs??null,
     shaderWarmupSubmitMs:sum(warm,['compileShader','linkProgram',
      'getProgramParameter','getShaderParameter']),
     firstFrameWallMs:first.wallMs,
     shaderFirstFrameSubmitMs:sum(first,['compileShader','linkProgram',
      'getProgramParameter','getShaderParameter']),
     programInfoLogCpuMs:sum(first,['getProgramInfoLog','getShaderInfoLog']),
     programInfoLogCalls:(first.calls?.getProgramInfoLog?.count??0)+
       (first.calls?.getShaderInfoLog?.count??0),
     getExtensionCpuMs:sum(first,['getExtension']),
     resourceUploadCpuMs:sum(first,['bufferData','bufferSubData',
      'texImage2D','texSubImage2D','texImage3D','texSubImage3D',
      'compressedTexImage2D','compressedTexImage3D']),
     programsBeforeDraw:first.resourcesBefore.programs,
     programsAfterDraw:first.resourcesAfter.programs,
     browserErrors:errors.length,
     capture:path});
   }finally{
    await page.close();
    await browser.close();
    browser=undefined;
   }
  }
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('E6_8_COLD_RENDERER',JSON.stringify(evidence));
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
