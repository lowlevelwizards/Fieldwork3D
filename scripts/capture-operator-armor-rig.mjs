/** Real phone-size front + 3/4 capture of the authored armor/rig matrix. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4198,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/operator-armor-rig-lab.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,160));
 }
 if(!ready)throw Error('Armor & Rig Lab did not launch');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  await page.goto(origin+'/operator-armor-rig-lab.html',{
   waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('armorCanvas')?.dataset.ready==='true',
   null,{timeout:25000});
  await mkdir('operator-armor-rig-captures',{recursive:true});
  const samples=[
   ['plate-standard','chest-placard'],
   ['plate-jpc','micro-rig'],
   ['soft-vest','light-rig'],
   ['plate-legacy','split-front'],
   ['armor-bare','light-rig'],
   ['plate-standard','split-front'],
   ['plate-legacy','no-rig'],
   ['plate-jpc','chest-placard'],
   ['soft-flak','chicom-rig'],
   ['plate-legacy','sadf-webbing'],
   ['soft-slick','bandolier'],
   ['armor-bare','micro-rig'],
   ['plate-standard','field-webbing'],
   ['plate-standard','lbv'],
   ['plate-heavy','full-chest'],
   ['soft-vest','split-front']
  ];
  // R1 grayscale cut review: no pouch layout can conceal a bad armor silhouette.
  // Capture each wearable with no rig from the canonical 3/4, front and side.
  for(const armor of ['soft-slick','soft-vest','soft-flak','plate-slick',
   'plate-jpc','plate-standard','plate-heavy','plate-legacy']){
   await page.locator('#armorChoice').selectOption(armor);
   await page.locator('#rigChoice').selectOption('no-rig');
   await page.waitForFunction(id=>{
    const c=document.getElementById('armorCanvas');
    return c?.dataset.armor===id&&c?.dataset.rig==='no-rig';
   },armor);
   for(const view of ['fit','front','side']){
    await page.locator('button[data-view="'+view+'"]').click();
    await page.waitForFunction(v=>
     document.getElementById('armorCanvas')?.dataset.view===v,view);
    await page.locator('#armorCanvas').screenshot({
     path:'operator-armor-rig-captures/r1-'+armor+'-'+view+'.png'
    });
   }
  }
  for(const [armor,rig] of samples){
   await page.locator('#armorChoice').selectOption(armor);
   await page.locator('#rigChoice').selectOption(rig);
   await page.waitForFunction(([a,b])=>{
    const c=document.getElementById('armorCanvas');
    return c?.dataset.armor===a&&c?.dataset.rig===b;
   },[armor,rig]);
   for(const view of ['fit','front']){
    await page.locator('button[data-view="'+view+'"]').click();
    await page.waitForFunction(v=>
     document.getElementById('armorCanvas')?.dataset.view===v,view);
    await page.locator('#armorCanvas').screenshot({
     path:'operator-armor-rig-captures/'+armor+'-'+rig+'-'+view+'.png'
    });
   }
  }
  // Worst-case SIDE silhouettes catch belts that would appear seated
  // from the front while floating behind the arm or beside the pelvis.
  for(const [armor,rig] of [
   ['plate-standard','field-webbing'],
   ['plate-legacy','sadf-webbing'],
   ['soft-vest','split-front']
  ]){
   await page.locator('#armorChoice').selectOption(armor);
   await page.locator('#rigChoice').selectOption(rig);
   await page.waitForFunction(([a,b])=>{
    const c=document.getElementById('armorCanvas');
    return c?.dataset.armor===a&&c?.dataset.rig===b;
   },[armor,rig]);
   await page.locator('button[data-view="side"]').click();
   await page.waitForFunction(()=>
    document.getElementById('armorCanvas')?.dataset.view==='side');
   await page.locator('#armorCanvas').screenshot({
    path:'operator-armor-rig-captures/r5-'+armor+'-'+rig+'-side.png'
   });
  }
  // R2: all forty distinct armor/uniform pairings, deliberately without a
  // rig hiding bad connections. Includes thick smock/Gorka and light combat.
  const tops=['combat-shirt','bdu-shirt','acu-shirt','smock-jacket','gorka-jacket'];
  const armors=['soft-slick','soft-vest','soft-flak','plate-slick',
   'plate-jpc','plate-standard','plate-heavy','plate-legacy'];
  await page.locator('#rigChoice').selectOption('no-rig');
  await page.locator('button[data-view="fit"]').click();
  for(const top of tops)for(const armor of armors){
   await page.locator('#topChoice').selectOption(top);
   await page.locator('#armorChoice').selectOption(armor);
   await page.waitForFunction(([a,t])=>{
    const c=document.getElementById('armorCanvas');
    return c?.dataset.armor===a&&c?.dataset.top===t&&c?.dataset.rig==='no-rig';
   },[armor,top]);
   await page.locator('#armorCanvas').screenshot({
    path:'operator-armor-rig-captures/r2-'+top+'-'+armor+'-fit.png'
   });
  }
  // Five real phone-size debug views expose shoulder/contact points and
  // assert that the envelope fitter found no major collisions.
  await page.locator('#fitDebugChoice').check();
  for(const [top,armor] of [
   ['combat-shirt','plate-jpc'],['bdu-shirt','plate-standard'],
   ['acu-shirt','soft-vest'],['smock-jacket','plate-heavy'],
   ['gorka-jacket','plate-legacy']
  ]){
   await page.locator('#topChoice').selectOption(top);
   await page.locator('#armorChoice').selectOption(armor);
   await page.waitForFunction(([a,t])=>{
    const c=document.getElementById('armorCanvas');
    return c?.dataset.armor===a&&c?.dataset.top===t;
   },[armor,top]);
   const status=await page.locator('#fitStatus').innerText();
   if(status.includes('WARNINGS'))throw Error(top+' '+armor+': '+status);
   await page.locator('button[data-view="fit"]').click();
   await page.locator('#armorCanvas').screenshot({
    path:'operator-armor-rig-captures/r2-debug-'+top+'-'+armor+'.png'
   });
  }
  if(errors.length)throw Error('Lab runtime: '+errors.join('; '));
  console.log('Captured targeted normal-game-zoom armor/rig, fit and overlay previews on phone viewport.');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
