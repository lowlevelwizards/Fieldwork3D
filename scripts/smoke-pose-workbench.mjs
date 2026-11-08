/** Focused mobile WebGL runtime check for the independent pose workbench. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4208,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'],{stdio:'ignore'});
const output='pose-workbench-captures';
await mkdir(output,{recursive:true});
const pause=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));
try{
 let live=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(origin+'/pose-workbench.html')).ok){live=true;break;}}
  catch{}
  await pause(140);
 }
 if(!live)throw Error('Pose Workbench Vite entry did not start');
 const browser=await chromium.launch({headless:true,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:2,
   isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/pose-workbench.html',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{
   const d=document.querySelector('#preview')?.dataset;
   return d?.ready==='true'&&Number(d.drawCalls)>0;
  },null,{timeout:40000});
  if(!await page.locator('#wbTargets').isVisible())
   throw Error('XYZ handle selection not visible on phone');
  if(!await page.locator('#xyzControls input[type=range]').first().isVisible())
   throw Error('XYZ sliders are not visible');
  if(await page.locator('[data-target]').count()!==9)
   throw Error('Missing stock, shoulders, hands, elbows, torso or weapon angle');
  await page.screenshot({path:output+'/phone-default.png'});
  // Slider must remain mounted across repeated input events, or the
  // iPhone's touch drag loses capture after a single update.
  const slider=page.locator('#xyzControls input[type=range]').first();
  const before=await slider.evaluate(e=>e.value);
  await slider.evaluate(e=>{
   e.value=String(Number(e.value)-3);
   e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  const after=await slider.evaluate(e=>e.value);
  if(!(Number(after)<Number(before)))
   throw Error('Slider input did not change authored stock');
  await slider.evaluate(e=>{
   e.value=String(Number(e.value)-1);
   e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  if(Number(await slider.inputValue())>=Number(after))
   throw Error('XYZ slider DOM reset or drag could not continue');
  await page.locator('[data-target=firingElbow]').click();
  if(await page.locator('#xyzControls input[type=range]').count()!==3)
   throw Error('Firing elbow editor missing XYZ sliders');
  await page.locator('[data-target=torso]').click();
  if(!(await page.locator('#wbAxisHint').innerText()).includes('degrees'))
   throw Error('Upper-body rotation not in degrees');
  await page.locator('[data-target=weaponRotation]').click();
  await page.locator('#xyzControls input[type=range]').last().evaluate(e=>{
   e.value='-12';e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.locator('[data-target=stock]').click();
  // Static sample that a user can share later; not live short-stock data.
  await page.locator('#wbSnap').click();
  await page.screenshot({path:output+'/phone-authored.png'});
  await page.locator('#wbExport').click();
  const recipe=JSON.parse(await page.locator('#poseJson').inputValue());
  if(recipe.version!==1||recipe.preset!=='ar-m4a1'||
    !recipe.targets.stock||!recipe.targets.firingElbow)
   throw Error('Exported pose JSON omitted authored model targets');
  await page.locator('#wbSave').click();
  await page.locator('#wbReset').click();
  await page.locator('#wbLoad').click();
  await page.locator('#wbExport').click();
  const loaded=JSON.parse(await page.locator('#poseJson').inputValue());
  if(JSON.stringify(loaded)!==JSON.stringify(recipe))
   throw Error('Local save/load did not roundtrip pose recipe');
  await page.locator('#wbPreviewDetails').evaluate(e=>e.open=true);
  await page.locator('#blend').evaluate(e=>{
   e.value='40';e.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForFunction(()=>
   document.querySelector('#preview')?.dataset.poseBlend==='0.400');
  await page.locator('#wbEnd').click();
  await page.locator('#wbWeapon').selectOption('ak-akm');
  await page.waitForFunction(()=>
   document.querySelector('#preview')?.dataset.workbenchWeapon==='rifle');
  if(errors.length)throw Error('Runtime errors: '+errors.join('; '));
  console.log('Pose Workbench iPhone WebGL PASS',JSON.stringify({
   targets:9,preset:recipe.preset,blend:'0.400',weaponSwitch:'ak-akm'
  }));
  await page.setViewportSize({width:1120,height:820});
  await page.screenshot({path:output+'/desktop-workbench.png'});
 }finally{await browser.close();}
}finally{
 server.kill('SIGTERM');
}
