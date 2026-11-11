/** Stage 5 acceptance: real browser mission sheet and lossless event links.
 * Four Chrome viewports; not a physical iOS Safari claim.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4315,url='http://127.0.0.1:'+port+'/?quick=1&seed=2505';
const sizes=[[320,568],[390,844],[844,390],[1280,800]];
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const check=(value,message)=>{if(!value)throw Error(message);};
let browser;
try{
 let ready=false;for(let i=0;i<150;i++){
  try{if((await fetch(url)).ok){ready=true;break;}}catch{}
  await pause(150);
 }
 check(ready,'Vite unavailable');
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader',
   '--enable-unsafe-swiftshader']
 });
 await mkdir('artifacts/after-action-v4-stage5',{recursive:true});
 for(const [width,height] of sizes){
  const label=width+'x'+height;
  const page=await browser.newPage({viewport:{width,height},
    deviceScaleFactor:1,isMobile:width<=900,hasTouch:width<=900});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(url,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#debrief',{state:'attached',timeout:60000});
   await page.evaluate(async()=>{
    const [{renderMissionDebrief},{newSession},
      nav]=await Promise.all([
      import('/src/ui/breach-mission-debrief.ts'),
      import('/src/breach-game.ts'),
      import('/src/ui/breach-after-action-controller.ts')
    ]);
    const root=document.querySelector('#debrief').cloneNode(true);
    root.id='v4-stage5-qa';root.hidden=false;
    document.body.append(root);
    const actors=['rook','moss','ash','vale'].map((id,i)=>({
      id,name:id.toUpperCase(),side:'blue',appearanceSeed:i+1,
      weapon:'carbine'
    })).concat([{id:'guard',name:'GUARD',side:'red',
      appearanceSeed:10,weapon:'rifle'}]);
    const evt=(id,t,kind,actor,text,meta)=>({
      id,t,kind,actor,text,p:{x:12,y:20},meta
    });
    const events=[
      evt(1,2,'intel','rook','GUARD SPOTTED',
        {action:'spot',targetId:'guard'}),
      evt(2,9,'door','moss','DOOR OPENED',
        {action:'door-open',objectId:'front'}),
      evt(3,20,'shot','rook','ROOK FIRED'),
      evt(4,21,'wound','guard','GUARD WOUNDED'),
      evt(5,23,'objective','rook','OBJECTIVE SECURED',
        {action:'objective-secure',contributorId:'rook'}),
      evt(6,47,'down','guard','GUARD DOWN')
    ];
    const shots=[{id:41,recordedAt:20,shooterId:'rook',targetId:'guard',
      hit:true,healthBefore:4,healthAfter:3,down:false,hitRegion:'arm',
      start:{x:0,y:0},end:{x:12,y:20}},
      {id:42,recordedAt:47,shooterId:'rook',targetId:'guard',
      hit:true,healthBefore:3,healthAfter:0,down:true,hitRegion:'torso',
      start:{x:0,y:0},end:{x:12,y:20}}];
    const rec={
      manifest:{actors},duration:91,
      completeness:{complete:true,truncatedAt:null,reason:null},
      frames:[{t:0,actors:actors.filter(a=>a.side==='blue')
        .map(a=>({id:a.id,health:4,injuryStage:0,suppression:0})),
        shots:[]},
        {t:91,actors:actors.filter(a=>a.side==='blue')
        .map(a=>({id:a.id,health:4,injuryStage:0,suppression:0})),
        shots:[]}],
      ballistics:{shots},events,
      executionEvents:[{id:7,t:10,kind:'waiting',actor:'moss',
        text:'WAITING FOR CLEAR LANE',orderId:2,reason:'door'},
        {id:8,t:14,kind:'resumed',actor:'moss',
         text:'MOVEMENT RESUMED',orderId:2,reason:'clear'}],
      plans:{revisions:[]}
    };
    window.__v4stage5={root,rec,nav,requests:[]};
    root.addEventListener('fw-after-action-replay',event=>
      window.__v4stage5.requests.push(event.detail));
    const state=newSession(0,418);
    state.phase='won';state.mission='done';state.seconds=83;
    const keys=['debriefIntelBlock','debriefIntelText','debriefTitle',
       'debriefGrade','debriefSurvivors','debriefAccuracy',
       'debriefObjective','debriefStats'];
    const ui=Object.fromEntries(keys.map(key=>[
      key,root.querySelector('#'+key)]));
    renderMissionDebrief({ui,state,brief:{name:'EAST WING'},
      recorder:rec,campaign:null,campaignMode:'quick',
      operationsLogged:0});
   });
   const root=page.locator('#v4-stage5-qa');
   await root.locator('#afterActionDetailsToggle').click();
   check(await root.locator('#afterActionDetails').isVisible(),
     'Details did not open '+label);
   const summary=await root.locator('#afterActionMissionDetails').textContent();
   check(summary.includes('EAST WING')&&summary.includes('SCORE')&&
     summary.includes('RECORDED MISSION PACING')&&
     summary.includes('QUICK PLAY'),
     'Structured authoritative summary missing '+label);
   check(await root.locator('.fw-v5-timeline-marker').count()>0,
     'No historical markers '+label);
   const markers=await root.locator('.fw-v5-timeline-marker').evaluateAll(
     nodes=>nodes.map(node=>({
       w:node.getBoundingClientRect().width,
       h:node.getBoundingClientRect().height})));
   check(markers.every(m=>m.w>=43&&m.h>=43),
     'Touch markers too small '+label+' '+JSON.stringify(markers));
   await root.locator('.fw-v5-timeline-filter').filter({
     hasText:'CONTACT'}).click();
   check((await root.locator('.fw-v5-timeline-heading').textContent())
     .includes('1 OF'),
     'Contact filter lost recorded event '+label);
   await root.locator('.fw-v5-timeline-filter')
     .filter({hasText:'ALL EVENTS'}).click();
   await root.locator('.fw-v5-timeline-ledger-toggle').click();
   check(await root.locator('.fw-v5-timeline-ledger-item').count()>=8,
     'Chronological event ledger lost events '+label);
   await root.locator('.fw-v5-timeline-ledger-item')
     .filter({hasText:'DAMAGING HIT'}).first().click();
   check((await root.locator('.fw-v5-timeline-inspect').getAttribute(
     'data-timeline-selected-key'))==='shot:41',
     'Ballistic event selection lost shot ID '+label);
   const stateBefore=await page.evaluate(()=>{
     const {root,nav}=window.__v4stage5;
     return nav.afterActionSnapshot(root);
   });
   check(stateBefore.detailsOpen&&
     stateBefore.timelineSelectedKey==='shot:41'&&
     stateBefore.timelineLedgerOpen,
     'Selected incident not persisted '+label);
   await root.locator('.fw-v5-timeline-primary').click();
   const request=await page.evaluate(()=>window.__v4stage5.requests.at(-1));
   check(request.surface==='timeline'&&request.shotId===41&&
     request.contactId==='guard'&&request.time===20,
     'Watch Clip used wrong historical anchor '+label);
   const restored=await page.evaluate(()=>{
     const {root,nav}=window.__v4stage5;
     const ctx=nav.afterActionSnapshot(root);
     return nav.restoreAfterActionWorkspace(root,ctx);
   });
   check(restored,'Timeline origin restoration failed '+label);
   check((await root.locator('.fw-v5-timeline-inspect').getAttribute(
     'data-timeline-selected-key'))==='shot:41',
     'Timeline selected event lost on replay return '+label);
   await root.screenshot({path:'artifacts/after-action-v4-stage5/'+label+'.png'});
   await root.locator('.fw-v5-timeline-actions button')
     .filter({hasText:'INSPECT COMBAT'}).click();
   check(!(await root.locator('#afterActionDetails').isVisible()),
     'Inspect Combat failed to return to primary debrief '+label);
   check(await root.locator('[data-after-tab="combat"]')
     .getAttribute('aria-pressed')==='true',
     'Inspect Combat did not select Combat tab '+label);
   check(await root.locator('.fw-v3-shot-details').textContent()
     .then(s=>s.includes('SHOT #41')),
     'Inspect Combat lost exact selected shot '+label);
   await root.locator('#afterActionDetailsToggle').click();
   check((await root.locator('.fw-v5-timeline-inspect').getAttribute(
     'data-timeline-selected-key'))==='shot:41',
     'Reopened Details lost selected event '+label);
   const overflow=await page.evaluate(()=>({
     full:document.documentElement.scrollWidth,viewport:innerWidth
   }));
   check(overflow.full<=overflow.viewport+2,
     'Horizontal page overflow '+label+' '+JSON.stringify(overflow));
   await root.locator('#afterActionDetailsClose').click();
   check(!(await root.locator('#afterActionDetails').isVisible()),
     'Details Close did not dismiss dialog '+label);
   check(!errors.length,'Runtime error '+label+': '+errors.join('; '));
   await page.evaluate(()=>window.__v4stage5.nav.disposeAfterActionPresentation(
     window.__v4stage5.root));
   console.log('V4-5 TIMELINE PASS '+label+' '+JSON.stringify(overflow));
  }finally{await page.close();}
 }
}finally{await browser?.close();server.kill('SIGTERM');}
