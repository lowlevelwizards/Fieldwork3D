/** V4-4: real DOM, actual Three.js WebGL and recorded evidence parity.
 * Four responsive Chrome viewports, without touching production session data.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4304;
const url='http://127.0.0.1:'+port+'/?quick=1&seed=2404';
const sizes=[[320,568],[390,844],[844,390],[1280,800]];
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const check=(v,message)=>{if(!v)throw Error(message);};
let browser=null;
try{
 let ready=false;
 for(let i=0;i<140;i++){
   try{if((await fetch(url)).ok){ready=true;break;}}catch{}
   await sleep(150);
 }
 check(ready,'Vite server not ready');
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader']
 });
 await mkdir('artifacts/after-action-v4-stage4',{recursive:true});
 for(const [width,height] of sizes){
  const label=width+'x'+height;
  const page=await browser.newPage({viewport:{width,height},
    deviceScaleFactor:1,isMobile:width<=900,hasTouch:width<=900});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#debrief',{state:'attached',timeout:60000});
   await page.evaluate(async()=>{
    const {renderAfterActionWorkspace,afterActionSnapshot,
      restoreAfterActionWorkspace,disposeAfterActionPresentation}=
      await import('/src/ui/breach-after-action-controller.ts');
    const root=document.querySelector('#debrief').cloneNode(true);
    root.id='v4-stage4-qa';root.hidden=false;document.body.append(root);
    const people=['rook','moss','ash','vale'].map((id,i)=>({
      id,name:id.toUpperCase(),side:'blue',
      appearanceSeed:i+1,weapon:'carbine'
    }));
    people.push({id:'guard',name:'GUARD',side:'red',
      appearanceSeed:11,weapon:'rifle'});
    const side=(region,which)=>which==='unknown'?undefined:
      {schemaVersion:1,region,side:which,
       source:'trajectory-proxy',
       lateral:which==='left'?-0.6:0.6,forward:-0.8};
    const shot=(id,t,target,region,which,before,after,surface='blood')=>({
       id,recordedAt:t,shooterId:target==='guard'?'rook':'guard',
       targetId:target,hit:true,hitRegion:region,
       hitAnatomy:side(region,which),
       healthBefore:before,healthAfter:after,down:false,surface,
       start:{x:0,y:0},end:{x:12,y:2}
    });
    const shots=[
      shot(11,2,'guard','arm','left',4,3),
      shot(12,3,'guard','arm','right',3,3,'metal'),
      shot(13,4,'guard','leg','right',3,2),
      shot(14,5,'guard','arm','unknown',2,1),
      shot(15,6,'moss','arm','left',4,3)
    ];
    const rec={
      manifest:{actors:people},duration:9,
      completeness:{complete:true,truncatedAt:null,reason:null},
      frames:[{actors:people.filter(a=>a.side==='blue')
       .map(a=>({id:a.id,health:a.id==='moss'?3:4,
         injuryStage:a.id==='moss'?1:0,posture:'stand',
         suppression:0})),shots:[]}],
      ballistics:{shots},events:[],executionEvents:[],
      plans:{revisions:[]}
    };
    window.__v4Forensic={root,rec,afterActionSnapshot,
      restoreAfterActionWorkspace,disposeAfterActionPresentation,
      events:[]};
    root.addEventListener('fw-after-action-replay',event=>
      window.__v4Forensic.events.push(event.detail));
    renderAfterActionWorkspace(root,rec,{showIntel:false});
   });
   const root=page.locator('#v4-stage4-qa');
   await root.locator('[data-after-tab="combat"]').click();
   check(await root.locator('.fw-v3-shot-chip').count()===4,
      'Archived contact shot index not populated '+label);
   await root.locator('.fw-v3-shot-chip').nth(0).click();
   await root.locator('.fw-v4-scope-choice')
     .filter({hasText:'SELECTED SHOT'}).click();
   const paint=async slot=>root.locator(
     '[data-anatomy-part="'+slot+'"]').first().getAttribute('fill');
   check(await paint('arm-left')==='#ddc77c',
     'Left hit does not color left arm '+label);
   check(await paint('arm-right')==='#efeee8',
     'Left hit colors right arm '+label);
   await root.locator('.fw-v3-switch').filter({hasText:'BACK'}).last()
     .locator('button').filter({hasText:'BACK'}).click();
   check(await paint('arm-left')==='#ddc77c'&&
     await paint('arm-right')==='#efeee8',
     'Front/back perspective inverted anatomical laterality '+label);
   await root.locator('.fw-v3-shot-chip').nth(1).click();
   check(await paint('arm-left')==='#efeee8'&&
     await paint('arm-right')==='#efeee8',
     'Armor stop colored a wound on either arm '+label);
   check((await root.locator('.fw-v4-forensic-armor').textContent())
     .includes('NO TISSUE WOUND'),
     'Armor stop not labeled as separate evidence '+label);
   await root.locator('.fw-v3-shot-chip').nth(3).click();
   check(await paint('arm-left')==='#efeee8'&&
     await paint('arm-right')==='#efeee8',
     'Legacy unknown-side hit painted both limbs '+label);
   check((await root.locator('.fw-v4-forensic-uncertain').textContent())
     .includes('SIDE UNCERTAIN'),
     'Unknown side was presented as certain '+label);
   await root.locator('.fw-v4-scope-choice')
     .filter({hasText:'THROUGH SHOT'}).click();
   check(await paint('arm-left')==='#ddc77c',
     'Cumulative history lost earlier left arm wound '+label);
   check(await paint('leg-right')==='#ddc77c',
     'Cumulative history lost right leg wound '+label);
   await root.locator('.fw-v3-shot-chip').nth(0).click();
   await root.locator('.fw-v4-scope-choice')
     .filter({hasText:'SELECTED SHOT'}).click();
   await root.locator('.fw-v4-inspection-switch .fw-v3-small-button')
     .filter({hasText:'3D'}).click();
   await root.locator('.fw-v4-model-canvas')
     .waitFor({state:'attached',timeout:60000});
   check((await root.locator('.fw-v4-model-evidence-key').textContent())
      .includes('1 WOUND(S), 0 ARMOR STOP(S)'),
      '3D inspector did not receive 2D evidence selection '+label);
   const same=await page.evaluate(()=>{
     window.__v4Forensic.canvas=document.querySelector(
       '#v4-stage4-qa .fw-v4-model-canvas');
     return window.__v4Forensic.canvas.width>50;
   });
   check(same,'3D canvas not rendered '+label);
   await root.locator('.fw-v3-shot-chip').nth(1).click();
   check((await root.locator('.fw-v4-model-evidence-key').textContent())
     .includes('0 WOUND(S), 1 ARMOR STOP(S)'),
     '3D inspector painted armor stop as wound '+label);
   check(await page.evaluate(()=>window.__v4Forensic.canvas===
     document.querySelector('#v4-stage4-qa .fw-v4-model-canvas')),
     'Shot changed WebGL renderer instead of evidence overlays '+label);
   // Watch Clip uses the selected exact shot, not the last contact event.
   await root.locator('.fw-v3-play').click();
   const navigation=await page.evaluate(()=>window.__v4Forensic.events.at(-1));
   check(navigation.shotId===12&&navigation.contactId==='guard'&&
     navigation.time===3,
     'Watch Clip anchor lost shot ID/time/target '+label);
   const preserved=await page.evaluate(()=>{
     const {root,afterActionSnapshot,restoreAfterActionWorkspace}=window.__v4Forensic;
     const snapshot=afterActionSnapshot(root);
     return snapshot.forensicScope==='selected'&&
       snapshot.shotId===12&&
       restoreAfterActionWorkspace(root,snapshot);
   });
   check(preserved,'Replay return lost selected forensic mode '+label);
   await root.locator('.fw-v3-combat-top .fw-v3-small-button')
      .filter({hasText:'SQUAD'}).click();
   check(await root.locator('.fw-v3-contact-chip').filter({hasText:'MOSS'})
     .count()===1,'Wounded survivor absent from Squad Combat '+label);
   await root.locator('.fw-v3-contact-chip').filter({hasText:'MOSS'}).click();
   check(await root.locator('.fw-v3-shot-chip').count()===1,
     'Survivor incoming shot not selectable '+label);
   const evidence=await root.locator('.fw-v3-shot-details').textContent();
   check(evidence.includes('LEFT LIMB')&&evidence.includes('TRAJECTORY PROXY'),
     'Wounded survivor lost laterality/precision '+label);
   await root.screenshot({
      path:'artifacts/after-action-v4-stage4/'+label+'.png'
   });
   const overflow=await page.evaluate(()=>({
     scroll:document.documentElement.scrollWidth,viewport:innerWidth
   }));
   check(overflow.scroll<=overflow.viewport+2,
     'Page horizontal clipping '+label+' '+JSON.stringify(overflow));
   await page.evaluate(()=>window.__v4Forensic.disposeAfterActionPresentation(
     window.__v4Forensic.root));
   check(!errors.length,'Browser errors '+label+': '+errors.join('; '));
   console.log('V4-4 FORENSIC PASS '+label+' '+JSON.stringify(overflow));
  }finally{await page.close();}
 }
}finally{await browser?.close();server.kill('SIGTERM');}
