/** Phone-sized real WebGL evidence for shoulder/armhole posture variants. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4201,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'],{stdio:'ignore'});
await mkdir('operator-armhole-captures',{recursive:true});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-lab.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,140));
 }
 if(!ready)throw Error('Vite unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/operator-lab.html?tab=poses',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
   document.getElementById('preview')?.dataset.ready==='true',
   null,{timeout:30000});
  await page.locator('#poseInspector').evaluate(e=>e.open=true);
  const outfits=[
   ['m16a1-legacy','ar-m16a1','plate-legacy','full-chest'],
   ['m16a1-flak','ar-m16a1','soft-flak','full-chest'],
   ['m16a1-heavy','ar-m16a1','plate-heavy','full-chest'],
   ['mk18-heavy','ar-mk18','plate-heavy','full-chest'],
   ['aks74u-flak','ak-aks74u','soft-flak','full-chest']
  ];
  const evidence=[];
  for(const [label,weapon,armor,rig] of outfits){
   await page.locator('#poseWeapon').selectOption(weapon);
   await page.locator('#poseArmor').selectOption(armor);
   await page.locator('#poseRig').selectOption(rig);
   await page.locator('#poseAnimation').selectOption('low-ready');
   await page.locator('.pose-workspace button[data-view="front"]').click();
   await page.waitForFunction(([w,a])=>{
    const d=document.getElementById('preview')?.dataset;
    return d?.ready==='true'&&d.poseFitWeapon===w&&
     d.poseFitArmor===a&&d.track==='low-ready'&&
     Number(d.drawCalls)>0;
   },[weapon,armor],{timeout:14000});
   const state=await page.locator('#preview').evaluate(c=>({
    weapon:c.dataset.poseFitWeapon,armor:c.dataset.poseFitArmor,
    rig:c.dataset.poseFitRig,fit:c.dataset.lowReadyFit,
    firingDrop:c.dataset.firingElbowDrop,
    firingFlare:c.dataset.firingElbowFlare,
    torsoAssist:c.dataset.torsoAssistYaw,
    drawCalls:c.dataset.drawCalls,
    report:document.getElementById('poseInspectorReport')?.textContent
   }));
   evidence.push({label,...state});
   if(label==='m16a1-heavy'&&
     (!Number.isFinite(Number(state.firingDrop))||
       Number(state.firingDrop)<2.5))
    throw Error('Heavy M16 firing elbow remains winged: '+JSON.stringify(state));
   await page.screenshot({path:'operator-armhole-captures/'+label+'-front.png'});
   await page.locator('.pose-workspace button[data-view="side"]').click();
   await page.screenshot({path:'operator-armhole-captures/'+label+'-side.png'});
  }
  if(errors.length)throw Error('Console errors: '+errors.join('; '));
  console.log('ARMHOLE-MOBILE-VISUAL',JSON.stringify(evidence));
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
