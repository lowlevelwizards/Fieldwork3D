/** L2.14: actual WebGL physical inspection, single phone-sized browser gate. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4198,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const out='equipment-l214-captures';
await mkdir(out,{recursive:true});
try{
 let live=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-lab.html')).ok){live=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,140));
 }
 if(!live)throw Error('Vite server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/operator-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#preview')?.dataset.ready==='true',
   null,{timeout:30000});
  await page.locator('#equipmentInspection').evaluate(e=>e.open=true);
  await page.locator('#inspectionSampleKit').click();
  async function real(id,location){
   await page.locator('#inspectionItem').selectOption(id);
   await page.locator('#inspectionLocation').selectOption(location);
   await page.waitForFunction(({id,location})=>{
    const d=document.querySelector('#preview')?.dataset;
    return d?.inspectionItem===(id.includes(':')?id.split(':')[1]:id)&&
      d?.inspectionLocation===location.toUpperCase()&&
      d?.inspectionVisible==='true';
   },{id,location},{timeout:10000});
  }
  await real('field:flashbang','rig');
  await page.locator('[data-inspection-view="front"]').click();
  await page.screenshot({path:out+'/flash-front-phone.png'});
  await real('field:wedge','belt');
  await page.locator('#inspectionPose').selectOption('crouch');
  await page.locator('[data-inspection-view="side"]').click();
  await page.screenshot({path:out+'/wedge-crouch-side-phone.png'});
  await real('field:zip-tie','backpack');
  await page.locator('[data-inspection-view="back"]').click();
  await page.screenshot({path:out+'/cuffs-back-phone.png'});
  await page.locator('#inspectionPose').selectOption('walk');
  await page.waitForFunction(()=>document.querySelector('#preview')?.dataset.track==='walk');
  if(!(await page.locator('#inspectionStatus').textContent())?.includes('ACTUAL MESH'))
   throw Error('Inspection status is not resolved to actual geometry');
  await page.locator('#inspectionClear').click();
  await page.waitForFunction(()=>document.querySelector('#preview')?.dataset.inspectionItem==='all');
  if(errors.length)throw Error('Browser page errors: '+errors.join('; '));
  console.log('L2.14 physical WebGL inspection PASS');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
