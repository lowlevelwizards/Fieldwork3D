/** MF-1E: critical real-WebGL opt-in/off presentation smoke.
 * Does not assert performance or physical iPhone Safari approval.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4247,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<110;i++){
  try{if((await fetch(origin+'/breach.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('MF-1 Vite unavailable');
 const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  const frames=[];
  for(const variant of ['off','subtle','mask','default']){
   const page=await browser.newPage({viewport:{width:390,height:844},
     deviceScaleFactor:1.5,hasTouch:true,isMobile:true});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{
    if(m.type()==='error'&&
      /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))
      errors.push(m.text());
   });
   try{
    const params=variant==='off'?'&focusFx=off':
     variant==='subtle'?'&focusFx=subtle':
     variant==='mask'?'&focusFx=subtle&focusDebug=mask':'';
    await page.goto(origin+'/breach.html?quick=1&seed=23'+params,
      {waitUntil:'domcontentloaded'});
    await page.locator('#breach3dCanvas').waitFor({
      state:'visible',timeout:50000});
    await page.waitForFunction(()=>document.querySelector('#phase')?.
      textContent?.includes('PLANNING'),null,{timeout:50000});
    await page.waitForTimeout(650);
    const canvas=page.locator('#breach3dCanvas');
    const frame=await canvas.screenshot();
    if(frame.byteLength<4000)
      throw Error('Blank tactical frame for '+variant);
    if(errors.length)throw Error(variant+': '+errors.join(' | '));
    const hdr=await page.evaluate(()=>{
      const c=document.getElementById('breach3dCanvas');
      const gl=c?.getContext('webgl2');
      return !!gl?.getExtension('EXT_color_buffer_float');
    });
    frames.push({variant,frame,hdr});
    if(variant==='default'){
      const openPreferences=async()=>{
        await page.locator('#siteSettingsToggle').click();
        await page.locator('[data-site-tab="preferences"]').click();
      };
      await openPreferences();
      if(await page.locator('[data-miniature-focus="subtle"]')
        .getAttribute('aria-pressed')!=='true')
        throw Error('Subtle is not selected by default');
      await page.locator('[data-miniature-focus="off"]').click();
      if(await page.evaluate(()=>localStorage.getItem(
        'fieldwork3d.graphics.miniature-focus'))!=='off')
        throw Error('Off setting was not saved');
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#phase')?.
        textContent?.includes('PLANNING'),null,{timeout:50000});
      await openPreferences();
      if(await page.locator('[data-miniature-focus="off"]')
        .getAttribute('aria-pressed')!=='true')
        throw Error('Saved Off choice was not restored after reload');
      await page.locator('[data-miniature-focus="replay"]').click();
      if(await page.evaluate(()=>localStorage.getItem(
        'fieldwork3d.graphics.miniature-focus'))!=='replay')
        throw Error('Replay Only setting was not saved');
      console.log('MF-1 default, live Preferences toggle and persistence passed');
    }
    console.log('MF-1 '+variant+' WebGL frame succeeded; HDR support='+hdr);
   }finally{await page.close();}
  }
  if(frames[2].hdr&&frames[0].frame.equals(frames[2].frame))
    throw Error('Focus debug mask did not reach the final WebGL canvas');
  console.log('MF-1 direct fallback, opt-in scene and mask smoke passed');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
