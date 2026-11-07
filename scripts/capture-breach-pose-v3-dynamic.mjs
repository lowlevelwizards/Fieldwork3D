/** V3 action-time phone evidence using the actual Operator Lab model. */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4198,origin='http://127.0.0.1:'+port;
const folder='breach-pose-v3-dynamic-captures';
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
const fixtures=[
 {id:'ar-m4a1',armor:'plate-heavy',rig:'full-chest',top:'smock-jacket'},
 {id:'ak-akm',armor:'plate-legacy',rig:'full-chest',top:'smock-jacket'},
 {id:'ak-aks74u',armor:'soft-flak',rig:'full-chest',top:'smock-jacket'}
];
const actions=['active-aim','reload-emergency'];
const times=[.35,.95,1.45];
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-lab.html?poseFit=1')).ok){
   ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 if(!ready)throw Error('Operator Lab did not start');
 await mkdir(folder,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+
   '/operator-lab.html?poseFit=1&poseV3=1&poseV3Action=1',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
   document.getElementById('preview')?.dataset.ready==='true',null,
   {timeout:30000});
  const selectors=page.locator('#poseFitPanel select');
  if(await selectors.count()!==4)throw Error('Pose Fit selector mismatch');
  const records=[];
  for(const fixture of fixtures){
   await page.locator('#poseFitPanel').evaluate(e=>{e.open=true;});
   for(const [i,value] of [fixture.id,fixture.armor,
      fixture.rig,fixture.top].entries())
    await selectors.nth(i).selectOption(value);
   for(const track of actions){
    await page.evaluate(t=>{
     const b=document.querySelector('[data-pose="'+t+'"]');
     if(!b)throw Error('Missing track '+t);
     b.click();
    },track);
    for(const time of times){
     await page.locator('#timeline').evaluate((el,value)=>{
      el.value=String(Math.round(value*1000));
      el.dispatchEvent(new Event('input',{bubbles:true}));
     },time);
     await page.waitForFunction(([name,t])=>{
      const d=document.getElementById('preview')?.dataset;
      return d?.track===name&&Math.abs(Number(d?.time)-t)<.002&&
       d?.poseV3Preview==='true'&&!!d?.poseV3DynamicReport;
     },[track,time],{timeout:12000});
     const report=await page.locator('#preview').evaluate(el=>{
      const d=el.dataset;
      return {arms:JSON.parse(d.poseV3DynamicReport||'[]'),
       gripError:Number(d.gripError),weapon:d.poseFitWeapon,
       armor:d.poseFitArmor,rig:d.poseFitRig,top:d.poseFitTop};
     });
     if(report.arms.length!==2||report.arms.some(a=>
       !['clear','unresolved'].includes(a.status)||
       !Number.isFinite(a.quality)||!Number.isFinite(a.hardDepth)))
      throw Error('Invalid V3 diagnostics '+fixture.id+'/'+track+'/'+time);
     if(!Number.isFinite(report.gripError))
      throw Error('Invalid grip error '+fixture.id+'/'+track+'/'+time);
     if(report.weapon!==fixture.id||report.armor!==fixture.armor||
        report.rig!==fixture.rig||report.top!==fixture.top)
      throw Error('Selected physical outfit normalized away: '+JSON.stringify({
        expected:fixture,observed:{weapon:report.weapon,armor:report.armor,
          rig:report.rig,top:report.top},track,time}));
     records.push({fixture,track,time,...report});
     await page.locator('#poseFitPanel').evaluate(e=>{e.open=false;});
     for(const view of ['front','iso']){
      await page.evaluate(v=>{
       const b=document.querySelector('[data-view="'+v+'"]');
       if(!b)throw Error('Missing camera '+v);
       b.click();
      },view);
      await page.locator('#preview').screenshot({path:
       folder+'/'+fixture.id+'-'+fixture.armor+'-'+track+'-'+time+'-'+view+'.png'});
     }
    }
   }
  }
  if(errors.length)throw Error(errors.join('; '));
  await writeFile(folder+'/diagnostics.json',
   JSON.stringify(records,null,2));
  const clear=records.flatMap(r=>r.arms).filter(a=>a.status==='clear').length;
  console.log('POSE-V3-DYNAMIC-PHONE samples='+records.length+
   ' arms='+records.length*2+' valid='+clear+
   ' unresolved='+(records.length*2-clear));
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
