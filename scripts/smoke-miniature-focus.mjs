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
  for(const variant of ['off','subtle','mask','band','attention','default']){
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
     variant==='mask'?'&focusFx=subtle&focusDebug=mask':
     variant==='band'?'&focusFx=subtle&focusDebug=band':
     variant==='attention'?'&focusFx=subtle&focusDebug=attention':'';
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
      if(await page.locator('.miniature-focus-preference').isVisible())
        throw Error('Shelved focus controls remain visible');
      if(await page.locator('[data-miniature-focus="off"]')
        .getAttribute('aria-pressed')!=='true')
        throw Error('Shelved focus default is not Off');
      // Returning devices may have Subtle or Strong stored from the
      // experiment. Neither must reactivate the pass.
      await page.evaluate(()=>localStorage.setItem(
        'fieldwork3d.graphics.miniature-focus','strong'));
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.querySelector('#phase')?.
        textContent?.includes('PLANNING'),null,{timeout:50000});
      await openPreferences();
      if(await page.locator('[data-miniature-focus="off"]')
        .getAttribute('aria-pressed')!=='true')
        throw Error('Old saved Strong reactivated shelved focus');
      if(await page.locator('.miniature-focus-preference').isVisible())
        throw Error('Shelved controls became visible after reload');
      console.log('MF-shelved: Off default, saved Strong ignored, UI hidden');
    }
    console.log('MF-1 '+variant+' WebGL frame succeeded; HDR support='+hdr);
   }finally{await page.close();}
  }
  if(frames[2].hdr&&frames[0].frame.equals(frames[2].frame))
    throw Error('Focus debug mask did not reach the final WebGL canvas');
  console.log('MF-1 direct fallback, opt-in scene and mask smoke passed');
  // Static scene: test native color parity and actual optical output rather
  // than trusting a dynamic game screenshot or a shader-compile-only test.
  const fixture=await browser.newPage({viewport:{width:390,height:844},
    deviceScaleFactor:1});
  const gpuErrors=[];
  fixture.on('pageerror',e=>gpuErrors.push(e.message));
  fixture.on('console',m=>{
    if(m.type()==='error'&&
      /WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))
      gpuErrors.push(m.text());
  });
  try{
    await fixture.goto(origin+'/tests/fixtures/miniature-focus-framebuffer.html',
      {waitUntil:'domcontentloaded'});
    await fixture.waitForFunction(()=>window.miniatureFixtureReady===true,
      null,{timeout:30000});
    const center={x:157,y:388,width:76,height:68};
    const corner={x:2,y:2,width:100,height:105};
    const bottom={x:290,y:730,width:99,height:110};
    const shot=async box=>fixture.screenshot({clip:box});
    const centerOff=await shot(center);
    const cornerOff=await shot(corner);
    const bottomOff=await shot(bottom);
    await fixture.evaluate(()=>window.miniatureFixtureDraw('zero'));
    if(!centerOff.equals(await shot(center))||
       !cornerOff.equals(await shot(corner)))
      throw Error('MF-2 zero-strength pass altered original framebuffer colors');
    await fixture.evaluate(()=>window.miniatureFixtureDraw('focus'));
    if(!centerOff.equals(await shot(center)))
      throw Error('MF-2 changed protected center brightness/tone');
    if(cornerOff.equals(await shot(corner)))
      throw Error('MF-3 tilt-shift is missing above the focus band');
    if(bottomOff.equals(await shot(bottom)))
      throw Error('MF-3 tilt-shift is missing below the focus band');
    const firstOn=await shot(corner);
    await fixture.evaluate(()=>window.miniatureFixtureDraw('focus'));
    if(!firstOn.equals(await shot(corner)))
      throw Error('MF-3 same frame changed between identical render calls');
    // The protected region must exactly reproduce the native scene,
    // even though the rest of the frame remains miniaturized.
    await fixture.evaluate(()=>window.miniatureFixtureDraw('attention'));
    if(!cornerOff.equals(await shot(corner)))
      throw Error('MF-4 tactical attention did not completely protect the active patch');
    if(bottomOff.equals(await shot(bottom)))
      throw Error('MF-4 attention mask incorrectly disabled the whole lens');
    if(gpuErrors.length)throw Error('MF-4 WebGL errors: '+gpuErrors.join(' | '));
    await fixture.evaluate(()=>window.miniatureFixtureDraw('band'));
    if(centerOff.equals(await shot(center)))
      throw Error('MF-3 debug band not rendered');
    console.log('MF-3 screen-wide top/bottom tilt-shift, center parity, stability and debug band passed');
  }finally{await fixture.close();}
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
