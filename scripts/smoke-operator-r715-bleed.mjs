/** R7.15 actual mobile WebGL proof for chunky backlit soft-gear/skin
 * silhouette and restored original. No screenshot mocks.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4219,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,150));
 }
 if(!ready)throw Error('R7.15 Studio server unavailable');
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
   await page.goto(origin+'/operator-studio.html?operatorLightingToon=2&operatorRim=dual',
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.ready==='true',
    null,{timeout:40000});
   await page.locator('#studioLightLab > summary').click();
   const width=page.locator('#studioRimWidth');
   if(await width.inputValue()!=='2.5')
    throw Error('R7.15 hard glint should open at 250%');
   if(await page.locator('#studioRimFabricWidth').inputValue()!=='2.8')
    throw Error('R7.15 gear silhouette should open at 280%');
   const canvas=page.locator('#studioCanvas');
   const rim=page.locator('#studioLightRim');
   const exposed=page.locator('#studioRimFabric');
   await page.locator('[data-studio-view="side"]').click();
   await page.waitForTimeout(200);
   const normal=await canvas.screenshot();
   await exposed.evaluate(el=>{
    el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForTimeout(260);
   const noGear=await canvas.screenshot();
   if(normal.equals(noGear))
    throw Error('Soft gear silhouette controls do not change real GPU pixels');
   await exposed.evaluate(el=>{
    el.value='.28';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForTimeout(220);
   const gear=await canvas.screenshot();
   if(gear.equals(noGear))
    throw Error('Widened cream silhouette not visible on real Studio');
   await page.locator('#studioRimMask').selectOption('on');
   await page.waitForTimeout(180);
   const mask=await canvas.screenshot();
   if(mask.equals(gear))throw Error('Highlight mask debug does not render');
   await page.locator('#studioRimMask').selectOption('off');
   await rim.selectOption('off');
   await page.waitForTimeout(200);
   const off=await canvas.screenshot();
   if(gear.equals(off))throw Error('R7.15 original identical to audition');
   await rim.selectOption('dual');
   await page.waitForTimeout(180);
   await page.locator('#studioLightCompare').click();
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.operatorRimMode==='off');
   await page.locator('#studioLightCompare').click();
   await page.waitForFunction(()=>
    document.getElementById('studioCanvas')?.dataset.operatorRimMode==='dual');
   if(await exposed.inputValue()!=='.28')
    throw Error('Compare Original did not preserve gear outline values');
   if(errors.length)throw Error('WebGL shader errors: '+errors.join(' | '));
   console.log('R7.15 actual mobile Studio soft silhouette, mask, A/B and controls passed');
  }finally{await page.close();}
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
