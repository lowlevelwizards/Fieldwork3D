/** BT12 phone-size real WebGL captures of the same staged gameplay
 * renderer. Broad-phase contacts are diagnostics, not mesh intersection
 * proofs; preserve all reports rather than silently filtering them. */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4207,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-lab.html')).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,150));
 }
 if(!ready)throw Error('Operator Lab server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  const errors=[],reports=[];page.on('pageerror',e=>errors.push(e.message));
  await mkdir('unified-carry-captures',{recursive:true});
  await page.goto(origin+'/operator-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('preview')?.dataset.ready==='true',null,{timeout:25000});
  const select=(id,value)=>page.locator('#'+id).evaluate((el,v)=>{
   if(!Array.from(el.options).some(o=>o.value===v))throw Error('Missing option '+el.id+': '+v);
   el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
  const click=id=>page.locator('#'+id).evaluate(el=>el.click());
  await page.locator('#unifiedCarryAudit').evaluate(el=>{el.open=true;});
  await click('unifiedCarryVisual');await click('unifiedCarryClearance');
  await select('attachmentPreview','off');
  for(const role of ['plainclothes-leather','service-utility','modern-entry','recon-light','field-medic','bdu-field']){
   await select('wardrobeRecipe',role);await click('wardrobeApply');
   await select('kitMagazines','1');
   await select('weapon','carbine');
   for(const pose of ['idle','crouch','walk','crouch-walk']){
    await select('inspectionPose',pose);
    await page.waitForFunction(()=>document.getElementById('unifiedCarryAuditOutput')?.dataset.active==='true',null,{timeout:15000});
    for(const view of ['iso','side','back']){
     await page.locator('button[data-view="'+view+'"]').first().evaluate(el=>el.click());
     await page.waitForTimeout(180);
     await page.locator('#preview').screenshot({path:'unified-carry-captures/'+role+'-'+pose+'-'+view+'.png'});
     reports.push(await page.evaluate(({role,pose,view})=>{
      const fit=document.getElementById('unifiedCarryAuditOutput'),clearance=document.getElementById('unifiedCarryClearanceOutput');
      return {role,pose,view,valid:fit.dataset.valid==='true',placements:Number(fit.dataset.placements),unrendered:Number(fit.dataset.unrendered),fit:fit.textContent,clearance:clearance.textContent};
     },{role,pose,view}));
    }
   }
  }
  await writeFile('unified-carry-captures/report.json',JSON.stringify({reports,errors},null,2));
  if(errors.length)throw Error(errors.join('; '));
  if(!reports.some(r=>r.valid&&r.placements>0))throw Error('No nonempty valid unified carry outfit rendered');
  const missing=reports.filter(r=>r.valid&&r.unrendered>0);
  if(missing.length)throw Error('Valid fit contains unrendered visible items: '+missing.map(r=>r.role+'/'+r.pose).join(', '));
  console.log('Unified carry mobile pose capture: '+reports.length+' samples, '+reports.filter(r=>r.clearance.includes('POTENTIAL')).length+' potential broad-phase contacts (see report).');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
