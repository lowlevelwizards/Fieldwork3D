/** R7.14: actual mobile Chromium WebGL smoke through the shared Arsenal viewer. */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
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
   await page.goto(origin+'/arsenal.html?lightingLab=1',{waitUntil:'domcontentloaded'});
   await page.locator('.arsenal-hero-open').click();
   const canvas=page.locator('.arsenal-wb-canvas');
   await canvas.waitFor({state:'visible'});
   await page.waitForFunction(()=>
    document.querySelector('.arsenal-wb-canvas')?.width>150,null,{timeout:25000});
   const lab=page.locator('.arsenal-lighting-lab');
   if(!await lab.evaluate(el=>el.open))throw Error('Arsenal Lab query did not open');
   await page.waitForTimeout(250);
   const on=await canvas.screenshot();
   await page.getByLabel('HIGHLIGHT').selectOption('off');
   await page.waitForTimeout(250);
   const off=await canvas.screenshot();
   if(on.byteLength<3000||off.byteLength<3000)
    throw Error('Blank real weapon WebGL canvas');
   if(on.equals(off))
    throw Error('Arsenal glint did not change real weapon pixels');
   await page.getByLabel('HIGHLIGHT').selectOption('dual');
   await page.locator('input[aria-label="GLINT THICKNESS"]').evaluate(el=>{
    el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));
   });
   await page.waitForFunction(()=>document.querySelector(
    '.arsenal-lighting-range output')!==null);
   await page.locator('.arsenal-lighting-actions button').first().click();
   await page.waitForTimeout(150);
   await page.locator('.arsenal-lighting-actions button').first().click();
   await page.waitForTimeout(150);
   await page.locator('.arsenal-wb-back').click();
   await page.locator('.arsenal-card').nth(1).click();
   await page.locator('.arsenal-hero-open').click();
   await page.locator('.arsenal-wb-canvas').waitFor({state:'visible'});
   await page.waitForTimeout(300);
   if(errors.length)throw Error('Arsenal actual WebGL error: '+errors.join(' | '));
   console.log('R7.14 real Arsenal weapons, thickness controls, glint A/B and mobile WebGL passed');
  }finally{await page.close();}
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
