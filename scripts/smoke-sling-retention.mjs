/** SR18 — actual iPhone-size WebGL captures, intentionally not a substitute
 * for human art review. No external services or production changes. */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4198,origin='http://127.0.0.1:'+port,out='sling-retention-captures';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let live=false;
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/operator-lab.html')).ok){live=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 if(!live)throw Error('Lab server unavailable');
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{})});
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/operator-lab.html?tab=poses',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.getElementById('preview')?.dataset.ready==='true',{},{timeout:45000});
 await page.locator('#retentionLab').evaluate(e=>e.open=true);
 await page.locator('#poseAnimation').selectOption('high-ready');
 const seek=async(value)=>page.locator('#timeline').evaluate((e,v)=>{e.value=String(v);e.dispatchEvent(new Event('input',{bubbles:true}));},value);
 const cases=[
  ['ar-m4a1','armor-bare','no-rig','combat-shirt','sling-two-point'],
  ['hk-mp5a3','plate-heavy','full-chest','gorka-jacket','sling-two-point'],
  ['ak-akm','plate-jpc','chest-placard','bdu-shirt','sling-traditional'],
  ['ar-m4a1','soft-slick','light-rig','smock-jacket','sling-single-point']
 ];
 const report=[];
 for(const [weapon,armor,rig,uniform,sling] of cases){
  await page.locator('#poseWeapon').selectOption(weapon);
  await page.locator('#poseArmor').selectOption(armor);
  await page.locator('#poseRig').selectOption(rig);
  await page.locator('#poseUniform').selectOption(uniform);
  await page.locator('#retentionSling').selectOption(sling);
  for(const mode of sling==='sling-single-point'?['front-slung']:['front-slung','side-slung','back-slung']){
   await page.locator('#retentionMode').selectOption(mode);
   await page.locator('#retentionSettled').click();
   await seek(500);
   await page.waitForFunction(({mode,armor,rig,weapon})=>{
    const d=document.getElementById('preview')?.dataset;
    return d?.ready==='true'&&d.retentionMode===mode&&d.retentionWeight==='1'&&
      Number(d.retentionWebbing)>0&&d.poseFitArmor===armor&&d.poseFitRig===rig&&d.poseFitWeapon===weapon;
   },{mode,armor,rig,weapon},{timeout:20000});
   for(const view of ['front','side','iso','game']){
    await page.locator('[data-view="'+view+'"]').click();
    const name=[weapon,armor,rig,sling,mode,view].join('-');
    await page.locator('#preview').screenshot({path:out+'/'+name+'.png'});
   }
   report.push({weapon,armor,rig,uniform,sling,mode,data:await page.locator('#preview').evaluate(e=>({...e.dataset}))});
  }
 }
 await page.locator('#retentionRoute').click();
 await page.locator('#retentionCycle').check();
 await seek(250);
 const cycle=await page.locator('#retentionWeight').inputValue();
 const status=await page.locator('#retentionStatus').textContent();
 if(!Number.isFinite(Number(cycle))||!status?.includes(Math.round(Number(cycle)*100)+'%'))throw Error('Loop thumb/status mismatch: '+cycle+' '+status);
 await page.screenshot({path:out+'/mobile-loop-and-diagnostics.png'});
 await writeFile(out+'/report.json',JSON.stringify({report,errors},null,2));
 if(errors.length)throw Error(errors.join('; '));
 console.log('SR18 capture matrix complete:',report.length,'retention states');
}finally{await browser?.close();server.kill();}
