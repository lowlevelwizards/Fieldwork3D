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
   if(width<=700&&height>=481){
     const initial=await page.evaluate(()=>{
       const root=document.querySelector('#v4-stage3-qa');
       const body=root.querySelector('#afterActionBody').getBoundingClientRect();
       const model=root.querySelector('.fw-v4-squad-model').getBoundingClientRect();
       const rows=[...root.querySelectorAll('.fw-v4-rank-row')];
       return {bodyBottom:body.bottom,modelTop:model.top,
         modelBottom:model.bottom,
         rankBottom:Math.max(...rows.map(row=>row.getBoundingClientRect().bottom)),
         scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth};
     });
     // V6 moved to one real scroll owner rather than shrinking a WebGL
     // viewer below useful size on a 320px phone. Require all four ranked
     // choices at the top and no horizontal clipping; then prove the full
     // mounted model can be scrolled into view, not merely present in DOM.
     check(initial.rankBottom<=initial.bodyBottom+8&&
       initial.scrollWidth<=initial.viewport+2,
       'Initial phone ranks clipped or horizontal overflow '+
         label+' '+JSON.stringify(initial));
   }
   await root.screenshot({
     path:'artifacts/after-action-v4-stage3/initial-'+label+'.png'
   });
   if(width<=700&&height>=481){
     const old=await page.evaluate(()=>{
       const root=document.querySelector('#v4-stage3-qa');
       const body=root.querySelector('#afterActionBody');
       return {scrollTop:body.scrollTop,
         modelBottom:root.querySelector('.fw-v4-squad-model').getBoundingClientRect().bottom,
         bodyBottom:body.getBoundingClientRect().bottom};
     });
     await root.locator('.fw-v4-squad-model').scrollIntoViewIfNeeded();
     const visible=await page.evaluate(()=>{
       const root=document.querySelector('#v4-stage3-qa');
       const body=root.querySelector('#afterActionBody');
       const viewport=body.getBoundingClientRect();
       const model=root.querySelector('.fw-v4-squad-model').getBoundingClientRect();
       return {modelTop:model.top,modelBottom:model.bottom,
         bodyTop:viewport.top,bodyBottom:viewport.bottom,
         scrollTop:body.scrollTop,scrollHeight:body.scrollHeight,
         clientHeight:body.clientHeight};
     });
     check(visible.modelTop>=visible.bodyTop-2&&
       visible.modelBottom<=visible.bodyBottom+2&&
       (old.modelBottom<=old.bodyBottom+2||visible.scrollTop>old.scrollTop),
       'Retained WebGL viewer not fully reachable in phone debrief scroll '+
         label+' '+JSON.stringify({old,visible}));
     await root.screenshot({
       path:'artifacts/after-action-v4-stage3/model-visible-'+label+'.png'
     });
   }
   await root.locator('.fw-v4-rank-row')
     .filter({hasText:'MOSS'}).click();
   check(await page.evaluate(()=>window.__v4Stage3Canvas===
     document.querySelector('#v4-stage3-qa .fw-v4-model-canvas')),
     'Selection rebuilt the WebGL canvas '+label);
   check(await root.locator('#afterActionOperatorRecord').count()===1,
     'Full operator record did not open '+label);
   check(await page.evaluate(()=>window.__v4Stage3Canvas===
     document.querySelector('#v4-stage3-qa #afterActionOperatorRecord .fw-v4-model-canvas')),
     'Full record rebuilt the WebGL canvas '+label);
   await root.locator('.fw-v4-record-back').click();
   await root.locator('[data-after-tab="combat"]').click();
   // Current V6 defaults Combat to 3D. Its viewer is intentionally visible,
   // but the original Squad canvas must be reused rather than duplicated.
   await visibleCanvas().waitFor({state:'attached',timeout:60000});
   check(await root.locator('.fw-v4-model-canvas').count()===1&&
     await page.evaluate(()=>window.__v4Stage3Canvas===
       document.querySelector('#v4-stage3-qa .fw-v4-model-canvas')),
     'Default Combat 3D must reuse exactly one Squad renderer '+label);
   // Switching to the authoritative 2D paper view must detach the live
   // canvas while keeping the WebGL context cached for a subsequent 3D opt-in.
   await root.locator('.fw-v4-inspection-switch .fw-v3-small-button')
     .filter({hasText:'2D'}).click();
   check(await root.locator('.fw-v4-model-canvas').count()===0,
     'Combat 2D left the WebGL canvas mounted '+label);
   await root.locator('.fw-v4-inspection-switch .fw-v3-small-button')
     .filter({hasText:'3D'}).click();
   await visibleCanvas().waitFor({state:'attached',timeout:60000});
   check(await root.locator('.fw-v4-model-canvas').count()===1&&
     await page.evaluate(()=>window.__v4Stage3Canvas===
       document.querySelector('#v4-stage3-qa .fw-v4-model-canvas')),
     'Combat paper-to-3D rebuilt or duplicated renderer '+label);
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
   if(width===1280){
     // A context can be lost by Safari/Chrome even when the mission is intact.
     // Losing it must not make the next tab show a permanent "LOADING" label.
     await page.evaluate(()=>window.__v4Stage3Canvas.dispatchEvent(
       new Event('webglcontextlost',{cancelable:true})));
     check((await root.locator('.fw-v4-squad-model').textContent())
       .includes('3D VIEW UNAVAILABLE'),
       'WebGL loss did not expose fallback '+label);
     // V6 Combat defaults to 3D and may automatically retry a lost
     // graphics context. A genuine replacement is a success; an explicit
     // unavailable state or paper fallback is also correct. Never silently
     // accept a permanent LOADING label or a duplicate WebGL canvas.
     await root.locator('[data-after-tab="combat"]').click();
     await page.waitForFunction(()=>{
       const root=document.querySelector('#v4-stage3-qa');
       const model=root.querySelector('[data-after-model]');
       const active=root.querySelector(
         '.fw-v4-inspection-switch button[aria-pressed="true"]');
       const paper=active?.textContent?.trim()==='2D';
       return !!model?.querySelector('.fw-v4-model-canvas')||
         !!model?.textContent?.includes('3D VIEW UNAVAILABLE')||
         !!model?.textContent?.includes('3D MODULE COULD NOT LOAD')||paper;
     },{timeout:25000});
     const combatStatus=await page.evaluate(()=>{
       const root=document.querySelector('#v4-stage3-qa');
       const model=root.querySelector('[data-after-model]');
       const canvas=model?.querySelector('.fw-v4-model-canvas');
       return {canvas:!!canvas,unique:root.querySelectorAll(
         '.fw-v4-model-canvas').length===1,
         replaced:canvas!==window.__v4Stage3Canvas,
         fallback:!!model?.textContent?.includes('3D VIEW UNAVAILABLE')||
           !!model?.textContent?.includes('3D MODULE COULD NOT LOAD'),
         paper:root.querySelector(
           '.fw-v4-inspection-switch button[aria-pressed="true"]'
         )?.textContent?.trim()==='2D'};
     });
     check(combatStatus.canvas&&combatStatus.unique&&combatStatus.replaced||
       combatStatus.fallback||combatStatus.paper,
       'Lost graphics caused an invisible/stale Combat viewer '+
         label+' '+JSON.stringify(combatStatus));
     await root.locator('[data-after-tab="squad"]').click();
     await page.waitForFunction(()=>{
       const host=document.querySelector(
         '#v4-stage3-qa [data-after-squad-model]');
       return !!host?.querySelector('.fw-v4-model-canvas')||
         !!host?.textContent?.includes('3D VIEW UNAVAILABLE')||
         !!host?.textContent?.includes('3D MODULE COULD NOT LOAD');
     },{timeout:25000});
     const squadStatus=await page.evaluate(()=>{
       const root=document.querySelector('#v4-stage3-qa');
       const host=root.querySelector('[data-after-squad-model]');
       const canvas=host?.querySelector('.fw-v4-model-canvas');
       return {canvas:!!canvas,unique:root.querySelectorAll(
         '.fw-v4-model-canvas').length===1,
         replaced:canvas!==window.__v4Stage3Canvas,
         fallback:!!host?.textContent?.includes('3D VIEW UNAVAILABLE')||
           !!host?.textContent?.includes('3D MODULE COULD NOT LOAD')};
     });
     check(squadStatus.canvas&&squadStatus.unique&&squadStatus.replaced||
       squadStatus.fallback,
       'Squad lost WebGL recovery/fallback after Combat '+label+' '+
         JSON.stringify(squadStatus));
   }
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
