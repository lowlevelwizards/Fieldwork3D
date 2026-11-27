/** Arsenal live mobile smoke. Historical filename retained for CI callers.
 * R17: contrast matte, readable real weapon surfaces, part dots fading
 * during inspection, no obsolete lab, no cyan selection box.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';

const capture=(name,bytes)=>{
 if(process.env.FW_F5_CAPTURE!=='1')return;
 mkdirSync('visual-foundation-f5-captures',{recursive:true});
 writeFileSync('visual-foundation-f5-captures/'+name,bytes);
};
const port=4224,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let n=0;n<100;n++){
  try{if((await fetch(origin+'/arsenal.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 if(!ready)throw Error('Arsenal Vite server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,hasTouch:true,isMobile:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{
   if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))
    errors.push(m.text());
  });
  try{
   await page.goto(origin+'/arsenal.html',{waitUntil:'domcontentloaded'});
   // User-facing bug: dark FAL/G3 silhouettes disappear against charcoal.
   // New neutral light inspection matte must yield dark, legible foreground.
   // Sample the real generated WebP hero, not screenshot text or CSS borders.
   await page.waitForFunction(()=>{
    const image=document.querySelector('.arsenal-hero-media img');
    return image instanceof HTMLImageElement&&image.complete&&image.naturalWidth>=400;
   },null,{timeout:25000});
   const contrast=await page.evaluate(()=>{
    const image=document.querySelector('.arsenal-hero-media img');
    if(!(image instanceof HTMLImageElement))throw Error('No M4 hero thumbnail');
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('No screenshot pixel inspection context');
    ctx.drawImage(image,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    // Background #a1aaa0. Ignore compression noise <=6 channels and
    // measure actual nonbackground 3D-model pixels.
    const bg=[161,170,160],luma=(r,g,b)=>.2126*r+.7152*g+.0722*b;
    const baseline=luma(...bg);
    let foreground=0,dark=0;
    for(let i=0;i<pixels.length;i+=4){
     const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
     if(Math.max(Math.abs(r-bg[0]),Math.abs(g-bg[1]),
       Math.abs(b-bg[2]))<=6)continue;
     foreground++;
     const y=luma(r,g,b);
     if(y<baseline-32)dark++;
    }
    return {foreground,dark,darkFraction:dark/Math.max(1,foreground)};
   });
   // Require substantial DARK foreground, not just the pale port; the
   // gallery and Workbench share the same scene and matte color.
   if(contrast.foreground<250||contrast.darkFraction<.50)
    throw Error('Dark M4 still lacks separation from light matte: '+
     JSON.stringify(contrast));
   capture('arsenal-lit-m4-gallery-hero.png',
    await page.locator('.arsenal-hero-media:has(img)').screenshot());
   await page.locator('.arsenal-hero-open:not(.arsenal-glock-open)').click();
   const canvas=page.locator('.arsenal-wb-canvas');
   await canvas.waitFor({state:'visible'});
   await page.waitForFunction(()=>
    document.querySelector('.arsenal-wb-canvas')?.width>150,null,{timeout:25000});
   await page.waitForFunction(()=>
    document.querySelectorAll('.arsenal-wb-socket:not([hidden])').length>=6);
   if(await page.locator('.arsenal-lighting-lab').count()!==0)
    throw Error('Deleted lighting lab reappeared');
   if(await page.locator('canvas').count()===0)
    throw Error('No weapon canvas');
   const dots=page.locator('.arsenal-wb-socket:not([hidden])');
   if(await dots.count()<6)throw Error('Missing major part sockets');
   const first=await canvas.screenshot();
   if(first.length<3000)throw Error('Blank real WebGL viewport');
   capture('arsenal-light-matte.png',first);
   // The active marker changes the existing category controls, not a box.
   await page.getByRole('button',{name:'Select stock'}).click();
   if(await page.locator('.arsenal-wb-socket[aria-pressed="true"]').count()!==1)
    throw Error('Active dot selection not synchronized');
   if(await page.locator('.arsenal-wb-category[aria-pressed="true"]').textContent()!=='Furniture')
    throw Error('White dot did not select the corresponding part category');
   const r=await canvas.boundingBox();
   if(!r)throw Error('No canvas bounding box');
   const px=r.x+r.width*.84,py=r.y+r.height*.68;
   await page.mouse.move(px,py);
   await page.mouse.down();
   await page.mouse.move(px-75,py-24,{steps:4});
   await page.waitForFunction(()=>
    document.querySelector('.arsenal-wb-sockets')?.classList.contains('is-inspecting'));
   capture('arsenal-sockets-hidden.png',await canvas.screenshot());
   await page.mouse.up();
   await page.waitForFunction(()=>
    !document.querySelector('.arsenal-wb-sockets')?.classList.contains('is-inspecting'));
   if(await page.locator('.arsenal-wb-socket:not([hidden])').count()<6)
    throw Error('White dots failed to restore after orbiting');
   await page.locator('.arsenal-wb-back').click();
   await page.locator('.arsenal-card').nth(1).click();
   await page.locator('.arsenal-hero-open:not(.arsenal-glock-open)').click();
   await page.waitForFunction(()=>
    document.querySelectorAll('.arsenal-wb-socket:not([hidden])').length>=6);
   if(errors.length)throw Error('Arsenal WebGL error: '+errors.join(' | '));
   console.log('Arsenal mobile smoke passed: real weapon, contrasting matte, white socket taps and fade');
  }finally{await page.close();}
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
