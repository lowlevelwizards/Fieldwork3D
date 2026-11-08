/** UOP short-stock release gate: real phone WebGL, no mock operator.
 * Capture current ready->short and interrupted short->ADS presentation.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4205,origin='http://127.0.0.1:'+port;
const folder='breach-shortstock-phone-captures';
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
const fixtures=[
 {id:'ar-m4a1',armor:'plate-slick',rig:'full-chest',top:'smock-jacket'},
 {id:'ak-akm',armor:'plate-legacy',rig:'full-chest',top:'smock-jacket'}
];
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/operator-lab.html?poseFit=1')).ok){
   ready=true;break;
  }}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('Operator Lab development server unavailable');
 await mkdir(folder,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/operator-lab.html?poseFit=1&poseV3=1',
    {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('preview')?.
   dataset.ready==='true',null,{timeout:30000});
  const preview=page.locator('#preview'),animation=page.locator('#poseAnimation');
  const view=page.locator('[data-view="front"]').first();
  const captures=[];
  for(const fixture of fixtures){
   for(const [id,value] of [
     ['poseWeapon',fixture.id],['poseArmor',fixture.armor],
     ['poseRig',fixture.rig],['poseUniform',fixture.top]
   ])await page.locator('#'+id).selectOption(value);
   await page.waitForFunction(f=>{
    const d=document.getElementById('preview')?.dataset;
    return d?.poseFitWeapon===f.id&&d?.poseFitArmor===f.armor&&
      d?.poseFitRig===f.rig&&d?.poseFitTop===f.top;
   },fixture,{timeout:14000});
   await view.click();
   const capture=async label=>{
    await page.waitForTimeout(85);
    const d=await preview.evaluate(el=>el.dataset);
    if(!Number.isFinite(Number(d.gripError)))
      throw Error('Nonfinite grip in '+fixture.id+'/'+label);
    const file=folder+'/'+fixture.id+'-'+fixture.armor+'-'+label+'.png';
    await preview.screenshot({path:file});
    captures.push({fixture,label,track:d.track,
      gripError:Number(d.gripError),
      firingElbowDrop:Number(d.firingElbowDrop),
      firingElbowFlare:Number(d.firingElbowFlare)});
   };
   await animation.selectOption('ready');
   await page.waitForTimeout(420);
   await capture('01-ready');
   await animation.selectOption('short-stock');
   await capture('02-short-entry');
   await page.waitForTimeout(185);
   await capture('03-short-settled');
   if(process.env.UOP_R2==='1'){
    await page.locator('[data-view="side"]').first().click();
    await capture('03b-short-side');
    await page.locator('[data-view="back"]').first().click();
    await capture('03c-short-back');
    await view.click();
   }
   await animation.selectOption('active-aim');
   await capture('04-ads-retarget');
   await page.waitForTimeout(300);
   await capture('05-ads-settled');
   if(process.env.UOP_R2==='1'){
    await page.locator('[data-view="side"]').first().click();
    await capture('05b-ads-side-stock-height');
    await animation.selectOption('strafe-left');
    await page.waitForTimeout(200);
    await capture('06-strafe-elbow');
    await page.waitForTimeout(200);
    await capture('07-strafe-elbow-continuity');
    await view.click();
   }
  }
  if(errors.length)throw Error('Lab runtime errors: '+errors.join('; '));
  await writeFile(folder+'/diagnostics.json',
    JSON.stringify(captures,null,2));
  console.log('SHORT-STOCK MOBILE captures='+captures.length+
    ' fixtures='+fixtures.length);
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
