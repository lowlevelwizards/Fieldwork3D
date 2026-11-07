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
  await page.goto(origin+'/operator-lab.html?poseFit=1'+
    (process.env.POSE_V3==='1'?'&poseV3=1':''),
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('preview')?.
   dataset.ready==='true',null,{timeout:30000});
  // Pose Fit was folded into the normal Poses workspace. Use stable
  // semantic IDs rather than the removed #poseFitPanel wrapper.
  const selectors=['#poseWeapon','#poseArmor','#poseRig','#poseUniform'];
  const pickers=selectors.map(id=>page.locator(id));
  for(const [index,picker] of pickers.entries())
   if(await picker.count()!==1)throw Error('Missing Pose selector '+selectors[index]);
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
  const errorsInFits=[];
  for(const f of fixtures){
   for(const [i,value] of [f.id,f.armor,f.rig,f.top].entries())
    await pickers[i].selectOption(value);
   // This is the real low-ready operator pose, not an unrelated idle.
   await page.locator('#poseAnimation').selectOption('low-ready');
   await page.locator('#timeline').evaluate(el=>{
    el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   // Must verify the ACTUAL normalized model, not just the selection label:
   // incompatible armor previously downgraded invisibly to a bare kit.
   await page.waitForFunction(f=>{
    const data=document.getElementById('preview')?.dataset;
    return data?.poseFitWeapon===f.id&&data?.poseFitArmor===f.armor&&
     data?.poseFitRig===f.rig&&data?.poseFitTop===f.top&&
     data?.track==='low-ready'&&
     ['clear','guard-fallback','unresolved'].includes(data?.lowReadyFit??'');
   },f,{timeout:14000});
   const status=await page.locator('#preview').getAttribute('data-low-ready-fit');
   const yaw=Number(await page.locator('#preview').getAttribute('data-torso-assist-yaw'));
   // The new UI publishes *actual* assisted torso yaw. Constrain it to
   // the fitter's documented +/-0.16rad range, not the deleted camera yaw.
   if(!Number.isFinite(yaw)||Math.abs(yaw)>.161)
    throw Error('Pose Fit torso accommodation out of bounds: '+yaw);
   if(f.required&&status!==f.required)
    errorsInFits.push(f.id+'/'+f.armor+': '+status);
   // Capture the actual WebGL canvas; the collapsed inspector cannot
   // obscure its pixels. The current view vocabulary uses "game", not "top".
   for(const view of ['front','side','iso','game']){
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
