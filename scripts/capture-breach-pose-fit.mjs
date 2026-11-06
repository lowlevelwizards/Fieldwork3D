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
  const fixtures=[
   {id:'ar-m4a1',armor:'plate-jpc',rig:'no-rig',top:'bdu-shirt',required:'clear'},
   {id:'ar-m16a4',armor:'plate-standard',rig:'full-chest',top:'acu-shirt'},
   {id:'ak-akm',armor:'plate-standard',rig:'chicom-rig',top:'bdu-shirt'},
   {id:'ak-aks74u',armor:'plate-jpc',rig:'no-rig',top:'smock-jacket'}
  ];
  for(const f of fixtures){
   for(const [i,value] of [f.id,f.armor,f.rig,f.top].entries())
    await pickers.nth(i).selectOption(value);
   await page.waitForFunction(()=>['clear','guard-fallback'].includes(
    document.getElementById('preview')?.dataset.lowReadyFit??''),
    null,{timeout:14000});
   const status=await page.locator('#preview').getAttribute('data-low-ready-fit');
   if(f.required&&status!==f.required)
    throw Error('Expected '+f.id+' clear two-hand pose, got '+status);
   for(const view of ['front','side','iso']){
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
   console.log('POSE-FIT PHONE',f.id,f.armor,f.rig,status);
  }
  if(errors.length)throw Error(errors.join('; '));
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
