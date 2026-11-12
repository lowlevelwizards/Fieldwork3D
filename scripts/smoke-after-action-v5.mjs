/** V5 critical browser smoke: compact navigation, evidence and mobile overflow.
 * Real browser DOM + authentic V4 rendering pipeline, synthetic event fixture.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4299,base='http://127.0.0.1:'+port+'/?quick=1&seed=23';
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
  try{if((await fetch(base)).ok){ready=true;break;}}catch{}
  await pause(180);
 }
 check(ready,'Vite preview did not start');
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 await mkdir('artifacts/after-action-v5',{recursive:true});
 for(const [width,height] of [[390,844],[844,390],[1280,800]]){
  const name=width+'x'+height;
  const page=await browser.newPage({viewport:{width,height},
   deviceScaleFactor:1,isMobile:width<900,hasTouch:width<900});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#debrief',{state:'attached',timeout:60000});
   await page.evaluate(async()=>{
    const mod=await import('/src/ui/breach-after-action-controller.ts');
    const original=document.querySelector('#debrief');
    const root=original.cloneNode(true);root.id='v5-qa';root.hidden=false;
    document.body.append(root);
    const actors=['rook','moss','ash','vale'].map((id,i)=>({
     id,name:id.toUpperCase(),side:'blue',appearanceSeed:i+1,weapon:'carbine'
    })).concat([{id:'guard',name:'GUARD',side:'red',
     appearanceSeed:9,weapon:'rifle'}]);
    const shot=(id,t,shooter,target,before,after,down)=>({
     id,recordedAt:t,shooterId:shooter,targetId:target,
     hit:true,hitRegion:'arm',healthBefore:before,healthAfter:after,
     down,surface:'blood',start:{x:0,y:0},end:{x:20,y:1}
    });
    const rec={duration:49,completeness:{complete:true},manifest:{actors},
     frames:[{t:49,actors:actors.filter(a=>a.side==='blue')
      .map(a=>({id:a.id,health:a.id==='vale'?0:4,injuryStage:0}))}],
     ballistics:{shots:[
      shot(1,31,'rook','guard',4,2,false),
      shot(2,32,'rook','guard',2,0,true)
     ]},
     events:[
      {id:1,t:30,kind:'intel',actor:'rook',text:'CONTACT SPOTTED',
       p:{x:1,y:2},meta:{action:'spot',targetId:'guard'}},
      {id:2,t:32,kind:'down',actor:'guard',text:'GUARD INCAPACITATED',
       p:{x:2,y:3}},
      {id:3,t:42,kind:'objective',actor:'moss',text:'OBJECTIVE SECURED',
       p:{x:4,y:4},meta:{action:'objective-secure'}},
      {id:4,t:45,kind:'unknown',actor:'ash',text:'UNCATEGORIZED RECORD',
       p:{x:3,y:3}}
     ],executionEvents:[]};
    window.__v5Rec=rec;
    mod.renderAfterActionWorkspace(root,rec,{showIntel:false});
   });
   const root=page.locator('#v5-qa');
   check(await root.locator('.fw-v4-rank-row').count()===4,
    'Squad roster missing '+name);
   await root.locator('#afterActionSummaryToggle').click();
   check(await root.evaluate(e=>e.classList.contains('fw-v5-summary-compact')),
    'Result cannot collapse '+name);
   await root.screenshot({path:'artifacts/after-action-v5/'+name+'-squad.png'});
   // Where WebGL is available, model selection must keep the original canvas.
   if(await root.locator('[data-after-squad-model] canvas').count()){
     await root.locator('[data-after-squad-model] canvas').evaluate(
       canvas=>canvas.setAttribute('data-v6-retained','yes'));
     await root.locator('.fw-v4-rank-row').first().click();
     await root.locator('.fw-v4-rank-row').nth(1).click();
     check(await root.locator('canvas[data-v6-retained="yes"]').count()===1,
       'Selection remounted WebGL canvas '+name);
   }
   await root.locator('[data-after-tab="combat"]').click();
   check(await root.locator('.fw-v3-contact-chip').count()===1,
    'Recorded hostile unavailable '+name);
   check(await root.locator('.fw-v5-outcome-label').count()===1,
    'Final condition missing '+name);
   check(await root.locator('.fw-v5-shot-position').count()===1,
    'Shot position missing '+name);
   if(width>700&&height<=480){
    const visible=await root.evaluate(node=>{
     const model=node.querySelector('.fw-v3-combat-figure');
     const footer=node.querySelector('.fw-after-footer');
     if(!model||!footer)return 0;
     const m=model.getBoundingClientRect(),f=footer.getBoundingClientRect();
     return Math.max(0,Math.min(m.bottom,f.top)-m.top);
    });
    check(visible>=70,'Landscape combat model obscured '+name+' ('+visible+' px)');
   }
   await root.screenshot({path:'artifacts/after-action-v5/'+name+'-combat.png'});
   if(width<=700&&height>=481){
     await root.locator('.fw-v4-inspection-switch button').first().click();
     const anatomy=await root.locator('.fw-v3-paper svg').evaluate(svg=>{
       const r=svg.getBoundingClientRect();
       const figure=svg.closest('.fw-v3-combat-figure').getBoundingClientRect();
       return {height:r.height,width:r.width,bottom:r.bottom,
         figureBottom:figure.bottom};
     });
     check(anatomy.height>=200&&anatomy.width>=140&&
       anatomy.bottom<=anatomy.figureBottom+2,
       'Portrait anatomy collapsed or clipped '+name+' '+
       JSON.stringify(anatomy));
     await root.screenshot({path:'artifacts/after-action-v5/'+name+'-anatomy.png'});
   }
   await root.locator('#afterActionDetailsToggle').click();
   check(await root.locator('.fw-v5-timeline-filter').count()>=4,
    'Timeline filter controls missing '+name);
   check((await root.locator('#afterActionTimeline').textContent()).includes('OTHER'),
    'Unclassified events unavailable '+name);
   await root.locator('#afterActionDetailsClose').click();
   await root.locator('[data-after-tab="highlights"]').click();
   check(await root.locator('.fw-v3-highlights').count()===1,
    'Highlights page missing '+name);
   check(await root.locator('.fw-v6-moments #afterActionTimeline').count()===1,
    'Moments did not retain the shared timeline '+name);
   await root.screenshot({path:'artifacts/after-action-v5/'+name+'-highlights.png'});
   await root.locator('[data-after-tab="squad"]').click();
   if(await root.locator('.fw-v4-model-canvas').count()){
     await root.locator('.fw-v4-model-canvas').evaluate(canvas=>
       canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
     check(await root.locator('.fw-v7-model-retry').count()===1,
       'Lost WebGL context has no retry action '+name);
     await root.locator('.fw-v7-model-retry').click();
     await root.locator('.fw-v4-model-canvas').waitFor({
       state:'attached',timeout:30000});
     check(await root.locator('.fw-v7-model-retry').count()===0,
       'Retry did not restore model canvas '+name);
   }
   const overflow=await root.evaluate(e=>
    e.scrollWidth>e.clientWidth+5);
   check(!overflow,'Root-level horizontal overflow '+name);
   check(errors.length===0,'Browser errors '+name+': '+errors.join('; '));
  }finally{await page.close();}
 }
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
