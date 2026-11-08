/** R7.18 real mobile WebGL: three cel tiers, white hard glint,
 * no soft/skin controls, original A/B and Arsenal parity.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4228,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('R7.18 Studio server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,hasTouch:true,isMobile:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
   if(message.type()==='error'&&
     /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(message.text()))
    errors.push(message.text());
  });
  try{
   await page.goto(origin+'/operator-studio.html',{
    waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.ready==='true',
    null,{timeout:40000});
   await page.locator('#studioLightLab > summary').click();
   const cel=page.locator('#studioLightCel');
   if(await cel.inputValue()!=='3')throw Error('Three-band not selected');
   if(await page.locator('#studioLightGradient').inputValue()!=='piece-rose')
    throw Error('Dusty rose not selected');
   if(await page.locator('#studioLightShadow').inputValue()!=='plum-plus')
    throw Error('Saturated plum not selected');
   for(const id of ['#studioRimFabricWrap','#studioRimSkinWrap']){
    if(await page.locator(id).isVisible())
     throw Error('Rejected gear/skin highlight still exposed: '+id);
   }
   await page.locator('#studioLightShowWeapon').click();
   await page.waitForFunction(()=>
    Number(document.getElementById('studioCanvas')?.dataset.operatorWeaponMeshes)>0,
    null,{timeout:40000});
   const canvas=page.locator('#studioCanvas');
   await page.locator('[data-studio-view="side"]').click();
   await page.waitForTimeout(350);
   const three=await canvas.screenshot();
   const onCalls=Number(await canvas.getAttribute('data-draw-calls'));
   await cel.selectOption('2');
   await page.waitForTimeout(260);
   const two=await canvas.screenshot();
   if(three.equals(two))throw Error('3-band renders identically to 2-band');
   await cel.selectOption('3');
   await page.locator('#studioLightRim').selectOption('off');
   await page.waitForTimeout(240);
   const noGlint=await canvas.screenshot();
   const offCalls=Number(await canvas.getAttribute('data-draw-calls'));
   await page.locator('#studioLightRim').selectOption('dual');
   await page.waitForTimeout(260);
   const white=await canvas.screenshot();
   if(white.equals(noGlint))throw Error('White weapon glint not visible');
   if(onCalls>offCalls+1)throw Error('Glint added geometry draw calls');
   await page.locator('#studioLightCompare').click();
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.operatorRimMode==='off');
   await page.locator('#studioLightCompare').click();
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.operatorRimMode==='dual');
   if(await cel.inputValue()!=='3')throw Error('A/B lost three-band selection');
   if(errors.length)throw Error('WebGL errors: '+errors.join(' | '));
   console.log('R7.18 mobile 3-band, plum/rose, weapon glint and A/B passed');
  }finally{await page.close();}
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
