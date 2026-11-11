/** V3 browser acceptance: real compact DOM and recorded-evidence fixture.
 * A cloned debrief prevents any mutation of gameplay and campaign outcomes.
 * Browser viewports are emulated, not physical iOS Safari.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4294,base='http://127.0.0.1:'+port+'/?quick=1&seed=23';
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const check=(ok,message)=>{if(!ok)throw Error(message);};
let browser;
const sizes=[[320,568],[390,844],[844,390],[1280,800]];
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(base)).ok){ready=true;break;}}catch{}
  await pause(180);
 }
 check(ready,'Vite did not start');
 browser=await chromium.launch({headless:true,
  ...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 await mkdir('artifacts/after-action-v3',{recursive:true});
 for(const [width,height] of sizes){
  const name=width+'x'+height;
  const page=await browser.newPage({viewport:{width,height},
   deviceScaleFactor:1,isMobile:width<900,hasTouch:width<900});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#debrief',{state:'attached',timeout:60000});
   await page.evaluate(async()=>{
    const module=await import('/src/ui/breach-after-action-controller.ts');
    window.__v3Qa=module;
    const root=document.querySelector('#debrief').cloneNode(true);
    root.id='v3-qa';root.hidden=false;document.body.append(root);
    const actors=['rook','moss','ash','vale'].map((id,i)=>({
      id,name:id.toUpperCase(),side:'blue',appearanceSeed:i+1,weapon:'carbine'
    })).concat(['guard','sentry'].map((id,i)=>({
      id,name:id.toUpperCase(),side:'red',appearanceSeed:10+i,weapon:'rifle'
    })));
    const shot=(id,t,shooter,target,hit,before,after,down,region,surface)=>({
      id,recordedAt:t,shooterId:shooter,targetId:target,hit,
      healthBefore:before,healthAfter:after,down,hitRegion:region,surface,
      start:{x:0,y:0},end:{x:30,y:0},weaponAtFire:'carbine'
    });
    const rec={manifest:{actors},duration:90,
     completeness:{complete:true},frames:[{actors:actors.filter(a=>a.side==='blue')
       .map(a=>({id:a.id,health:4,injuryStage:0}))}],
     events:[
       {id:1,t:10,kind:'intel',actor:'rook',p:{x:10,y:10},
        text:'CONTACT',meta:{action:'spot',targetId:'guard'}},
       {id:2,t:17,kind:'shot',actor:'rook',p:{x:11,y:11},text:'FIRED'},
       {id:3,t:19,kind:'down',actor:'guard',p:{x:11,y:11},text:'DOWN'},
       {id:4,t:52,kind:'surrender',actor:'sentry',p:{x:45,y:40},text:'SURRENDER'}
     ],executionEvents:[],ballistics:{shots:[
       shot(1,17,'rook','guard',true,4,3,false,'torso','blood'),
       shot(2,18,'rook','guard',true,3,3,false,'torso','metal'),
       shot(3,19,'rook','guard',true,3,0,true,'torso','blood'),
       shot(4,20,'guard','moss',false,4,4,false,'head','dust'),
       shot(5,51,'rook','sentry',true,4,4,false,'arm','blood')
     ]}};
    window.__v4Rec=rec;
    module.renderAfterActionWorkspace(root,rec,{showIntel:false});
   });
   // Exercise actual buttons and after-action event binding with a stand-in
   // replay transport. The game Session never changes in this fixture.
   await page.evaluate(async()=>{
     const root=document.querySelector('#v3-qa');
     const module=window.__v3Qa;
     const {ReplayPlaybackController}=await import('/src/breach-replay-playback-controller.ts');
     const playback=new ReplayPlaybackController();
     const hud=document.getElementById('afterActionClipHud');
     const label=document.getElementById('afterActionClipLabel');
     const toggle=document.getElementById('afterActionClipToggle');
     let replaying=false,origin=null,failNext=false,attempts=0;
     const messages=[];
     const port={
       ui:{watchReplay:root.querySelector('#watchReplay'),debrief:root,
         afterActionClipHud:hud,afterActionClipLabel:label,
         afterActionClipToggle:toggle},
       getRecorder:()=>window.__v4Rec,isReplaying:()=>replaying,
       markDebriefEntry:()=>{},
       enterReplay:()=>{attempts++;if(failNext){failNext=false;return false;}
         replaying=true;return true;},
       exitReplay:()=>{
         if(!replaying)return;
         replaying=false;hud.hidden=true;playback.reset();
         const saved=origin;origin=null;
         if(saved)module.restoreAfterActionWorkspace(root,saved);
       },
       queueHighlights:()=>{},getStage:()=>null,getViewMode:()=> 'iso',
       cameraMode:()=>{},camera:{camMount:'chest',lens:'cam'},
       director:{camEligibleObservers:[]},bodycam:{observers:[]},
       knowledge:{observerId:null},startBodycam:()=>false,
       chooseCamera:()=>{},playback,presentReplay:()=>{},unlockAudio:()=>{},
       updateReplayHud:()=>{},showHelp:msg=>messages.push(msg),
       setReturn:ctx=>{origin=ctx;},getReturn:()=>origin
     };
     module.bindAfterActionReplayNavigation(port);
     window.__v4Mock={
       get state(){return {replaying,origin,attempts,
         incident:playback.incident,clipStored:!!playback.savedIncidentRange,
         messages:[...messages]};},
       exit:()=>port.exitReplay(),
       failNext:()=>{failNext=true;},
       failIncident:()=>{
         const start=playback.startIncident.bind(playback);
         playback.startIncident=()=>{playback.startIncident=start;return false;};
       },
       unclip:()=>toggle.click()
     };
   });
   // Verify the permanent banner against a REAL authoritative Session,
   // not a cloned replay's inferred outcome or hardcoded placeholder values.
   const outcomeEvidence=await page.evaluate(async()=>{
     const [{newSession,debrief},{renderMissionDebrief}]=await Promise.all([
       import('/src/breach-game.ts'),
       import('/src/ui/breach-mission-debrief.ts')
     ]);
     const root=document.querySelector('#v3-qa');
     const keys=['debriefIntelBlock','debriefIntelText','debriefTitle',
       'debriefGrade','debriefSurvivors','debriefAccuracy',
       'debriefObjective','debriefStats'];
     const ui=Object.fromEntries(keys.map(key=>[
       key,root.querySelector('#'+key)
     ]));
     const state=newSession(0,418);
     const render=()=>{
       const stats=debrief(state);
       renderMissionDebrief({ui,state,brief:{name:'TEST OPERATION'},
         recorder:window.__v4Rec,campaign:null,campaignMode:'quick',
         operationsLogged:0});
       return {
         grade:ui.debriefGrade.textContent,
         expectedGrade:stats.grade+' · '+stats.score,
         survivors:ui.debriefSurvivors.textContent,
         expectedSurvivors:stats.survived+' / '+stats.squad.length,
         accuracy:ui.debriefAccuracy.textContent,
         expectedAccuracy:stats.shots>0?stats.accuracy+'%':'—',
         objective:ui.debriefObjective.textContent,
         expectedObjective:stats.objective?'OBJECTIVE SECURED':'OBJECTIVE NOT COMPLETED',
         outcome:root.querySelector('#afterActionOutcome').textContent,
         time:root.querySelector('#afterActionMissionTime').textContent,
         name:root.querySelector('#afterActionMissionName').textContent
       };
     };
     state.phase='won';state.mission='done';state.seconds=83;
     const won=render();
     state.phase='lost';state.mission='clear';state.seconds=91;
     const lost=render();
     state.phase='won';state.mission='done';state.seconds=83;
     render();
     return {won,lost};
   });
   const accurate=record=>record.grade===record.expectedGrade&&
     record.survivors===record.expectedSurvivors&&
     record.accuracy===record.expectedAccuracy&&
     record.objective===record.expectedObjective&&
     record.name==='TEST OPERATION';
   check(accurate(outcomeEvidence.won)&&
     outcomeEvidence.won.outcome==='MISSION COMPLETE'&&
     outcomeEvidence.won.time==='TIME 1:23',
     'Success summary not derived from authoritative Session '+name+
       ' '+JSON.stringify(outcomeEvidence.won));
   check(accurate(outcomeEvidence.lost)&&
     outcomeEvidence.lost.outcome==='MISSION FAILED'&&
     outcomeEvidence.lost.time==='TIME 1:31',
     'Failure summary not derived from authoritative Session '+name+
       ' '+JSON.stringify(outcomeEvidence.lost));
   const root=page.locator('#v3-qa');
   check(await root.locator('[data-after-tab]').count()===3,
     'Wrong number of tabs '+name);
   check(await root.locator('#afterActionSummary').isVisible(),
     'Mission outcome strip not immediately visible '+name);
   check(await root.locator('#afterActionIntro').count()===0,
     'Blocking result overlay still present '+name);
   check(await root.locator('.fw-v4-rank-row').count()===4,
     'All four operators not ranked together '+name);
   check(await root.locator('.fw-v4-rank-row[aria-pressed=true]').count()===0,
     'Initial Squad silently selects an operator '+name);
   check(await root.locator('.fw-v3-miniature').count()===0,
     'Generic 2D operator artwork remained '+name);
   check((await root.locator('.fw-v4-rank-row').first().textContent()).includes('ROOK'),
     'Contribution ranking not highest-first '+name);
   check((await root.locator('.fw-v4-rank-row').nth(1).textContent()).includes('TIED #2'),
     'Equal-score ranks appear unequal '+name);
   const layout=()=>page.evaluate(()=>{
     const root=document.querySelector('#v3-qa'),body=root.querySelector('#afterActionBody');
     return {scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
       bodyBottom:body.getBoundingClientRect().bottom,
       contentBottom:body.firstElementChild?.lastElementChild?.getBoundingClientRect().bottom};
   });
   const fits=async screen=>{
    const metrics=await layout();
    check(metrics.scrollWidth<=metrics.viewport+2,
      'Horizontal overflow '+screen+name+' '+JSON.stringify(metrics));
    if(screen==='squad'){
      const rankBottom=await root.locator('.fw-v4-rank-row').last()
        .evaluate(node=>node.getBoundingClientRect().bottom);
      check(rankBottom<=metrics.bodyBottom+3,
        'Four ranked operators not visible without scrolling '+
         name+' '+JSON.stringify({rankBottom,...metrics}));
    }else check(metrics.contentBottom<=metrics.bodyBottom+3,
      'Content clips '+screen+name+' '+JSON.stringify(metrics));
   };
   await fits('squad');
   await root.locator('.fw-v4-rank-row').first().focus();
   await root.locator('.fw-v4-rank-row').first().press('Enter');
   check(await page.evaluate(()=>
     document.activeElement?.getAttribute('data-after-operator-id')==='rook'),
     'Keyboard selection lost focus after Squad redraw '+name);
   await root.locator('.fw-v4-overview-back').click();
   await root.locator('.fw-v4-rank-row').filter({hasText:'MOSS'}).click();
   check((await root.locator('.fw-v3-squad-name h2').textContent())==='MOSS',
     'Squad selection failed '+name);
   check(await root.locator('.fw-v4-rank-row[aria-pressed=true]').count()===1,
     'Selected operator not clearly identified '+name);
   check((await root.locator('.fw-v4-selected-overview').textContent())
     .includes('OBJECTIVE'),
     'Weighted category breakdown missing '+name);
   await root.locator('.fw-v4-overview-back').click();
   check(await root.locator('.fw-v4-rank-row[aria-pressed=true]').count()===0,
     'All Operators did not clear selection '+name);
   check(await root.locator('.fw-v4-team-overview').count()===1,
     'Squad overview not restored '+name);
   await root.locator('.fw-v4-rank-row').filter({hasText:'MOSS'}).click();
   await root.locator('.fw-v3-details-link').click();
   check(await root.locator('#afterActionOperatorRecord').count()===1,
     'Operator record not opened in Squad '+name);
   check((await root.locator('#afterActionOperatorRecord').textContent())
     .includes('MOSS / RECORDED CONTRIBUTIONS'),
     'Incorrect operator record '+name);
   check(!(await root.locator('#afterActionDetails').isVisible()),
     'Operator record wrongly opened Mission Details '+name);
   await root.locator('#afterActionDetailsToggle').click();
   await root.locator('#watchReplay').click();
   check((await page.evaluate(()=>window.__v4Mock.state)).origin.operatorRecordOpen,
     'Full replay discarded expanded operator record '+name);
   await page.evaluate(()=>window.__v4Mock.exit());
   check(await root.locator('#afterActionOperatorRecord').count()===1,
     'Full replay did not restore expanded operator record '+name);
   await root.locator('#afterActionDetailsClose').click();
   await root.locator('.fw-v4-record-back').click();
   await root.locator('#afterActionDetailsToggle').click();
   check(await root.locator('#afterActionDetails').isVisible(),
     'Mission Details unavailable '+name);
   await root.locator('#afterActionDetailsClose').click();
   await root.locator('[data-after-tab="combat"]').click();
   check(await root.locator('#afterActionSummary').isVisible(),
     'Switching tabs lost persistent mission result '+name);
   check(await root.locator('.fw-v3-contact-chip').count()===2,
     'Contacts unavailable '+name);
   check(await root.locator('.fw-v3-shot-chip').count()===3,
     'Shot chips unavailable '+name);
   await fits('combat');
   await root.locator('.fw-v3-shot-chip').first().click();
   await root.locator('.fw-v3-play').click();
   check((await page.evaluate(()=>window.__v4Mock.state)).origin.shotId===1,
     'Combat clip lost selected shot origin '+name);
   check((await page.evaluate(()=>window.__v4Mock.state)).incident!==null,
     'Selected shot did not create scoped incident '+name);
   await page.evaluate(()=>window.__v4Mock.unclip());
   check((await page.evaluate(()=>window.__v4Mock.state)).clipStored,
     'Unclip lost replay return address '+name);
   await page.evaluate(()=>window.__v4Mock.exit());
   check(await root.locator('.fw-v3-shot-chip[aria-pressed=true]').count()===1,
     'Combat clip did not restore shot selection '+name);
   await page.evaluate(()=>window.__v4Mock.failNext());
   await root.locator('.fw-v3-play').click();
   check(!(await page.evaluate(()=>window.__v4Mock.state)).replaying,
     'Failed clip entered replay '+name);
   check((await page.evaluate(()=>window.__v4Mock.state)).messages.some(x=>
     x.includes('REPLAY UNAVAILABLE')),
     'Failed launch did not explain the error '+name);
   check(await root.locator('.fw-v3-shot-chip[aria-pressed=true]').count()===1,
     'Failed clip changed selected shot '+name);
   await page.evaluate(()=>window.__v4Mock.failIncident());
   await root.locator('.fw-v3-play').click();
   check(!(await page.evaluate(()=>window.__v4Mock.state)).replaying,
     'Invalid transport window stranded the user in replay '+name);
   check((await page.evaluate(()=>window.__v4Mock.state)).messages.some(x=>
     x.includes('COULD NOT OPEN CLIP')),
     'Post-entry failure did not explain its rollback '+name);
   check(await root.locator('.fw-v3-shot-chip[aria-pressed=true]').count()===1,
     'Failed transport changed contact/shot state '+name);
   await page.evaluate(()=>{window.__v3Context=window.__v3Qa.afterActionSnapshot(
     document.querySelector('#v3-qa'));});
   await root.locator('[data-after-tab="highlights"]').click();
   check(await root.locator('.fw-v3-highlight-chip').count()>0,
     'Highlights unavailable '+name);
   check(await root.locator('.fw-v3-highlight-graphic').count()>0,
     'Schematic fallback missing '+name);
   await fits('highlights');
   await root.locator('.fw-v3-highlight-play').click();
   check((await page.evaluate(()=>window.__v4Mock.state)).origin.tab==='highlights',
     'Highlight clip lost originating tab '+name);
   await page.evaluate(()=>window.__v4Mock.exit());
   check(await root.locator('.fw-v3-highlight-chip[aria-pressed=true]').count()===1,
     'Highlight clip lost selection '+name);
   await root.locator('#afterActionDetailsToggle').click();
   await root.locator('#watchReplay').click();
   check((await page.evaluate(()=>window.__v4Mock.state)).origin.detailsOpen,
     'Full replay failed to preserve Details and its origin '+name);
   await page.evaluate(()=>window.__v4Mock.exit());
   check(await root.locator('#afterActionDetails').isVisible(),
     'Full replay failed to restore Details '+name);
   await root.locator('#afterActionDetailsClose').click();
   const restored=await page.evaluate(()=>
     window.__v3Qa.restoreAfterActionWorkspace(
       document.querySelector('#v3-qa'),window.__v3Context));
   check(restored,'Return context rejected '+name);
   check(await root.locator('.fw-v3-shot-chip[aria-pressed=true]').count()===1,
     'Return lost shot '+name);
   await root.screenshot({path:'artifacts/after-action-v3/'+name+'.png'});
   check(!errors.length,'Runtime errors '+name+': '+errors.join('; '));
   console.log('V3 BROWSER PASS '+name+' '+JSON.stringify(await layout()));
  }finally{await page.close();}
 }
}finally{await browser?.close();server.kill('SIGTERM');}
