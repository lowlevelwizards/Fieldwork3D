/** Stage 3 WebGL acceptance: one genuine operator rig viewer for Squad and
 * Combat; four Chromium viewports. No physical iOS Safari claims.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4296;
const url='http://127.0.0.1:'+port+'/?quick=1&seed=23';
const sizes=[[320,568],[390,844],[844,390],[1280,800]];
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=(ok,message)=>{if(!ok)throw Error(message);};
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(url)).ok){ready=true;break;}}catch{}
  await pause(180);
 }
 check(ready,'Vite did not start');
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader']
 });
 await mkdir('artifacts/after-action-v4-stage3',{recursive:true});
 for(const [width,height] of sizes){
  const label=width+'x'+height;
  const page=await browser.newPage({viewport:{width,height},
   deviceScaleFactor:1,isMobile:width<900,hasTouch:width<900});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#debrief',{state:'attached',timeout:60000});
   await page.evaluate(async()=>{
    const module=await import('/src/ui/breach-after-action-controller.ts');
    window.__v4Stage3=module;
    const root=document.querySelector('#debrief').cloneNode(true);
    root.id='v4-stage3-qa';root.hidden=false;document.body.append(root);
    const actors=['rook','moss','ash','vale'].map((id,i)=>({
      id,name:id.toUpperCase(),side:'blue',appearanceSeed:i+1,
      weapon:'carbine'
    })).concat([{id:'guard',name:'GUARD',side:'red',
      appearanceSeed:11,weapon:'rifle'}]);
    const rec={
      manifest:{actors},duration:32,completeness:{complete:true},
      frames:[{actors:actors.filter(a=>a.side==='blue')
        .map(a=>({id:a.id,health:4,injuryStage:0,
          suppression:0})),shots:[]}],
      events:[{id:1,t:6,kind:'intel',actor:'rook',p:{x:0,y:0},
        text:'CONTACT',meta:{action:'spot',targetId:'guard'}}],
      executionEvents:[],ballistics:{shots:[]}
    };
    window.__v4Stage3Rec=rec;
    module.renderAfterActionWorkspace(root,rec,{showIntel:false});
   });
   const root=page.locator('#v4-stage3-qa');
   const visibleCanvas=()=>root.locator('.fw-v4-model-canvas');
   await visibleCanvas().waitFor({state:'attached',timeout:60000});
   check(await visibleCanvas().count()===1,
     'Expected exactly one authentic WebGL presenter '+label);
   const startup=await page.evaluate(()=>{
     const root=document.querySelector('#v4-stage3-qa');
     const canvas=root.querySelector('.fw-v4-model-canvas');
     window.__v4Stage3Canvas=canvas;
     const pane=root.querySelector('.fw-v4-squad-model');
     return {w:canvas.width,h:canvas.height,
       text:pane.textContent,roster:root.querySelectorAll(
        '.fw-v4-rank-row').length};
   });
   check(startup.w>50&&startup.h>40&&startup.roster===4,
     'Historical squad did not render '+label+' '+JSON.stringify(startup));
   check(await root.locator('[data-after-squad-model]').count()===1,
     'Squad historical lineup missing '+label);
   await root.locator('.fw-v4-rank-row')
     .filter({hasText:'MOSS'}).click();
   check(await page.evaluate(()=>window.__v4Stage3Canvas===
     document.querySelector('#v4-stage3-qa .fw-v4-model-canvas')),
     'Selection rebuilt the WebGL canvas '+label);
   await root.locator('.fw-v3-details-link').click();
   check(await root.locator('#afterActionOperatorRecord').count()===1,
     'Full operator record did not open '+label);
   check(await page.evaluate(()=>window.__v4Stage3Canvas===
     document.querySelector('#v4-stage3-qa #afterActionOperatorRecord .fw-v4-model-canvas')),
     'Full record rebuilt the WebGL canvas '+label);
   await root.locator('.fw-v4-record-back').click();
   await root.locator('[data-after-tab="combat"]').click();
   check(await root.locator('.fw-v4-model-canvas').count()===0,
     'Hidden Squad tab left active canvas in DOM '+label);
   await root.locator('.fw-v3-combat-figure .fw-v3-small-button')
     .filter({hasText:'3D'}).click();
   await visibleCanvas().waitFor({state:'attached',timeout:60000});
   check(await page.evaluate(()=>window.__v4Stage3Canvas===
     document.querySelector('#v4-stage3-qa .fw-v4-model-canvas')),
     'Combat 3D created a second renderer '+label);
   await root.locator('[data-after-tab="squad"]').click();
   check(await page.evaluate(()=>window.__v4Stage3Canvas===
     document.querySelector('#v4-stage3-qa .fw-v4-model-canvas')),
     'Returning from Combat rebuilt squad models '+label);
   // Recorder snapshot return recreates DOM but never the WebGL context.
   const restored=await page.evaluate(()=>{
     const root=document.querySelector('#v4-stage3-qa');
     const snapshot=window.__v4Stage3.afterActionSnapshot(root);
     return window.__v4Stage3.restoreAfterActionWorkspace(root,snapshot);
   });
   check(restored,'After Action state restoration failed '+label);
   check(await page.evaluate(()=>window.__v4Stage3Canvas===
     document.querySelector('#v4-stage3-qa .fw-v4-model-canvas')),
     'Replay return snapshot rebuilt the 3D viewer '+label);
   await root.screenshot({
     path:'artifacts/after-action-v4-stage3/'+label+'.png'
   });
   // A new recorder owns a new viewer; the previous context is explicitly lost.
   const replaced=await page.evaluate(async()=>{
     const root=document.querySelector('#v4-stage3-qa');
     const old=window.__v4Stage3Canvas;
     window.__v4Stage3.disposeAfterActionPresentation(root);
     const detached=!old.isConnected;
     const next=structuredClone(window.__v4Stage3Rec);
     next.duration=35;
     window.__v4Stage3.renderAfterActionWorkspace(
       root,next,{showIntel:false});
     return detached;
   });
   check(replaced,'Mission disposal left obsolete WebGL canvas mounted '+label);
   await visibleCanvas().waitFor({state:'attached',timeout:60000});
   check(await page.evaluate(()=>window.__v4Stage3Canvas!==
     document.querySelector('#v4-stage3-qa .fw-v4-model-canvas')),
     'New recording recycled stale 3D canvas '+label);
   await page.evaluate(()=>window.__v4Stage3.disposeAfterActionPresentation(
     document.querySelector('#v4-stage3-qa')));
   check(await visibleCanvas().count()===0,
     'GPU presentation not released after explicit disposal '+label);
   check(!errors.length,'Runtime errors '+label+': '+errors.join('; '));
   console.log('V4-3 WEBGL PASS '+label+' '+JSON.stringify(startup));
  }finally{await page.close();}
 }
}finally{await browser?.close();server.kill('SIGTERM');}
