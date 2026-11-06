/** Phone-size actual WebGL AR/AK pose fit review.
 * Captures the SAME rig + solver used by Studio/gameplay. No mock meshes.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4196,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/operator-lab.html?poseFit=1')).ok){
   ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 if(!ready)throw Error('Pose Fit Lab did not start');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/operator-lab.html?poseFit=1',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('preview')?.
   dataset.ready==='true',null,{timeout:30000});
  const pickers=page.locator('#poseFitPanel select');
  if(await pickers.count()!==4)throw Error('Pose Fit controls missing');
  await mkdir('breach-pose-fit-captures',{recursive:true});
  // Eight intentionally difficult but plausible outfits. A one-handed
  // fallback is a FAILURE here, even if it reports numerical clearance.
  const fixtures=[
   {id:'ar-m4a1',armor:'plate-slick',rig:'full-chest',top:'smock-jacket',required:'clear'},
   {id:'ar-m4a1',armor:'soft-flak',rig:'full-chest',top:'smock-jacket',required:'clear'},
   {id:'ar-m4a1',armor:'plate-legacy',rig:'full-chest',top:'smock-jacket',required:'clear'},
   {id:'ar-m4a1',armor:'plate-heavy',rig:'full-chest',top:'smock-jacket',required:'clear'},
   {id:'ak-aks74u',armor:'plate-slick',rig:'full-chest',top:'smock-jacket',required:'clear'},
   {id:'ak-aks74u',armor:'soft-flak',rig:'full-chest',top:'smock-jacket',required:'clear'},
   {id:'ak-rpk74',armor:'soft-flak',rig:'full-chest',top:'smock-jacket',required:'clear'},
   {id:'ak-akm',armor:'plate-legacy',rig:'full-chest',top:'smock-jacket',required:'clear'}
  ];
  const panel=page.locator('#poseFitPanel');
  const errorsInFits=[];
  for(const f of fixtures){
   await panel.evaluate(node=>{node.open=true;});
   for(const [i,value] of [f.id,f.armor,f.rig,f.top].entries())
    await pickers.nth(i).selectOption(value);
   // Must verify the ACTUAL normalized model, not just the selection label:
   // incompatible armor previously downgraded invisibly to a bare kit.
   await page.waitForFunction(f=>{
    const data=document.getElementById('preview')?.dataset;
    return data?.poseFitWeapon===f.id&&data?.poseFitArmor===f.armor&&
     data?.poseFitRig===f.rig&&data?.poseFitTop===f.top&&
     ['clear','guard-fallback'].includes(data?.lowReadyFit??'');
   },f,{timeout:14000});
   const status=await page.locator('#preview').getAttribute('data-low-ready-fit');
   const mode=await page.locator('#preview').getAttribute('data-low-ready-mode');
   if(status==='clear'&&mode==='one-hand-guard')
    throw Error('Incorrect two-hand success status for '+f.id);
   if(f.required&&status!==f.required)
    errorsInFits.push(f.id+'/'+f.armor+': '+status);
   // The inspector must not obscure the chest and arms in the screenshot.
   await panel.evaluate(node=>{node.open=false;});
   for(const view of ['front','side','iso','top']){
    await page.evaluate(v=>{
     const b=document.querySelector('button[data-view="'+v+'"]');
     if(!b)throw Error('No camera '+v);
     b.click();
    },view);
    await page.waitForTimeout(120);
    await page.locator('#preview').screenshot({
     path:'breach-pose-fit-captures/'+f.id+'-'+f.armor+'-'+view+'.png'
    });
   }
   console.log('POSE-FIT PHONE',f.id,f.armor,f.rig,f.top,status);
  }
  if(errors.length)throw Error(errors.join('; '));
  if(errorsInFits.length)throw Error(
   'Full eight-kit mobile two-hand gate: '+errorsInFits.join('; '));
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
