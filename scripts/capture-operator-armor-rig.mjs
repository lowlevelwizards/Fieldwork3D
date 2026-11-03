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
   ['soft-slick','bandolier']
  ];
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
  if(errors.length)throw Error('Lab runtime: '+errors.join('; '));
  console.log('Captured 22 normal-game-zoom silhouette previews on phone viewport.');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
