/** EQA3.16J: REAL WebGL Operator Lab preview, with mobile touch controls,
 * actual character rigs and 1/60 frame seeking. No mock canvas or AI.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4295,root='http://127.0.0.1:'+port;
const output='artifacts/eqa3-16j';
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
try{
 let up=false;
 for(let i=0;i<95;i++){
  try{if((await fetch(root+'/operator-lab.html?tab=npc')).ok){
   up=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,160));
 }
 if(!up)throw Error('Operator Lab preview did not start');
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 const page=await browser.newPage({viewport:{width:390,height:844},
  isMobile:true,hasTouch:true,deviceScaleFactor:1});
 page.setDefaultTimeout(35000);
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(root+'/operator-lab.html?tab=npc',{
  waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>
  document.getElementById('preview')?.dataset.ready==='true'&&
  document.getElementById('preview')?.dataset.npcTrack==='civ-idle'&&
  Number(document.getElementById('preview')?.dataset.drawCalls)>0,
  null,{timeout:60000});
 if(await page.locator('main').getAttribute('data-lab-active')!=='npc')
  throw Error('NPC category deep link did not open');
 const options=await page.locator('#npcLabTrack option').count();
 if(options<35)throw Error('Incomplete NPC catalog: '+options);
 if(!await page.locator('#npcLabTrack').isVisible())
  throw Error('NPC track picker inaccessible on mobile');
 const pose=async(id,time,file)=>{
  await page.locator('#npcLabTrack').selectOption(id);
  await page.locator('#timeline').evaluate((e,t)=>{
   e.value=String(t);
   e.dispatchEvent(new Event('input',{bubbles:true}));
  },Math.round(time*1000));
  await page.waitForFunction(({id,time})=>{
   const c=document.getElementById('preview');
   return c?.dataset.npcTrack===id&&
    Math.abs(Number(c.dataset.time)-time)<.021&&
    Number(c.dataset.drawCalls)>1&&
    Number(c.dataset.triangles)>500&&
    Number.isFinite(Number(c.dataset.npcHeadYaw));
  },{id,time},{timeout:20000});
  const result=await page.locator('#preview').evaluate(e=>({
   track:e.dataset.npcTrack,pose:e.dataset.npcPose,
   model:e.dataset.npcModel,yaw:Number(e.dataset.npcHeadYaw),
   pitch:Number(e.dataset.npcHeadPitch),
   calls:Number(e.dataset.drawCalls),triangles:Number(e.dataset.triangles)
  }));
  if(file)await page.screenshot({path:output+'/'+file+'.png',
   animations:'disabled'});
  return result;
 };
 await mkdir(output,{recursive:true});
 const shots=[];
 shots.push(await pose('civ-frozen',2,'01-civilian-frozen'));
 shots.push(await pose('civ-hiding',2,'02-civilian-hiding'));
 shots.push(await pose('civ-secure',1.2,'03-civilian-secure'));
 shots.push(await pose('civ-restrained',2,'04-civilian-restrained'));
 shots.push(await pose('civ-flee',2,'05-civilian-flee'));
 shots.push(await pose('host-suppressed',2,'06-hostile-suppressed'));
 shots.push(await pose('host-lookback',1.5,'07-hostile-withdrawal'));
 if(shots.filter(s=>s.model==='civilian').length!==5||
    shots.filter(s=>s.model==='hostile').length!==2)
  throw Error('Lab did not switch real civilian and hostile rigs');
 // Same loop, pause, timeline and frame stepping as operator animation.
 await page.locator('#npcFrameBack').click();
 if(await page.locator('#playPause').textContent()!=='PLAY')
  throw Error('NPC 1/60 frame step must pause playback');
 await page.locator('[data-lab-tab="motion"]').click();
 await page.waitForFunction(()=>document.getElementById('preview')?.dataset.npcTrack==='');
 if(!await page.locator('[data-pose="strafe-stop"]').isVisible())
  throw Error('Existing movement category was displaced by NPC library');
 await page.locator('[data-pose="strafe-stop"]').click();
 await page.waitForFunction(()=>document.getElementById('preview')?.dataset.track==='strafe-stop');
 await page.locator('[data-lab-tab="npc"]').click();
 const back=await pose('civ-heard',1.5,'08-return-to-civilian');
 if(back.model!=='civilian'||Math.abs(back.yaw)<.02)
  throw Error('Returning to NPC category did not rebuild real evidence gaze');
 if(errors.length)throw Error('Lab browser errors: '+errors.slice(0,5).join(' | '));
 console.log('EQA3_16J_OPERATOR_LAB',JSON.stringify({
  options,actualWebGL:true,phone:true,records:shots,afterReturn:back,
  ordinaryOperatorTracksRetained:true,frameStep:true
 }));
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
