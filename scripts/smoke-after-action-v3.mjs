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
 browser=await chromium.launch({headless:true,args:[
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
    module.renderAfterActionWorkspace(root,rec,{showIntel:false});
   });
   const root=page.locator('#v3-qa');
   check(await root.locator('[data-after-tab]').count()===3,
     'Wrong number of tabs '+name);
   await root.locator('#afterActionContinue').click();
   check(await root.locator('.fw-v3-roster-card').count()===4,
     'Squad roster missing '+name);
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
    check(metrics.contentBottom<=metrics.bodyBottom+3,
      'Content clips '+screen+name+' '+JSON.stringify(metrics));
   };
   await fits('squad');
   await root.locator('.fw-v3-roster-card').filter({hasText:'MOSS'}).click();
   check((await root.locator('.fw-v3-squad-name h2').textContent())==='MOSS',
     'Squad selection failed '+name);
   await root.locator('.fw-v3-details-link').click();
   check(await root.locator('#afterActionDetails').isVisible(),
     'Details unavailable '+name);
   await root.locator('#afterActionDetailsClose').click();
   await root.locator('[data-after-tab="combat"]').click();
   check(await root.locator('.fw-v3-contact-chip').count()===2,
     'Contacts unavailable '+name);
   check(await root.locator('.fw-v3-shot-chip').count()===3,
     'Shot chips unavailable '+name);
   await fits('combat');
   await root.locator('.fw-v3-shot-chip').first().click();
   await page.evaluate(()=>{window.__v3Context=window.__v3Qa.afterActionSnapshot(
     document.querySelector('#v3-qa'));});
   await root.locator('[data-after-tab="highlights"]').click();
   check(await root.locator('.fw-v3-highlight-chip').count()>0,
     'Highlights unavailable '+name);
   check(await root.locator('.fw-v3-highlight-graphic').count()>0,
     'Schematic fallback missing '+name);
   await fits('highlights');
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
