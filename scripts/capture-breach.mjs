/**
 * Real-browser verification of the new tactical prototype, in both portrait
 * touch and desktop, with screenshots for art/UX review.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import('playwright');
const folder=resolve('breach-052-captures');
await mkdir(folder,{recursive:true});
const port=4189,url=`http://127.0.0.1:${port}/breach.html`;
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort',
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
try{
  let ready=false;
  for(let i=0;i<100;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(done=>setTimeout(done,140));
  }
  if(!ready)throw Error('Breach preview unavailable');
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader',
  ]});
  const phone=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:2,
    hasTouch:true,isMobile:true,
  });
  phone.setDefaultTimeout(12000);
  const errors=[];
  phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(url,{waitUntil:'domcontentloaded'});
  await phone.locator('#breachCanvas').waitFor();
  await phone.waitForTimeout(320);
  const dims=await phone.locator('#breachCanvas').evaluate(c=>({
    width:c.width,height:c.height,rect:c.getBoundingClientRect().toJSON(),
  }));
  if(dims.width<390||dims.height<844)
    throw Error('Tactics canvas is not full screen: '+JSON.stringify(dims));
  if((await phone.locator('#phase').innerText())!=='PLANNING')
    throw Error('Opening frame is not paused/plannable');
  await phone.screenshot({path:resolve(folder,'01-phone-planning.png')});
  // Screen projection is intentionally identical on touch and desktop.
  const screen=(x,y,width,height)=>{
    const scale=Math.min((width-20)/640,(height-172)/740);
    return {x:width/2-640*scale/2+x*scale,
      y:height/2-740*scale/2-11+y*scale};
  };
  await phone.locator('#rook').click();
  const point=screen(303,491,390,844);
  await phone.touchscreen.tap(point.x,point.y);
  await phone.waitForTimeout(180);
  await phone.locator('#moss').click();
  const mossPoint=screen(342,509,390,844);
  await phone.touchscreen.tap(mossPoint.x,mossPoint.y);
  await phone.screenshot({path:resolve(folder,'02-phone-two-routes.png')});
  await phone.locator('#play').click();
  await phone.waitForTimeout(950);
  const elapsed=await phone.locator('#clock').innerText();
  if(elapsed==='00:00')throw Error('GO did not advance tactical time');
  await phone.locator('#play').click();
  if((await phone.locator('#phase').innerText())!=='PLANNING')
    throw Error('Pause did not return to planning');
  const paused=await phone.locator('#clock').innerText();
  await phone.waitForTimeout(350);
  if((await phone.locator('#clock').innerText())!==paused)
    throw Error('Tactical clock continued while paused');
  await phone.screenshot({path:resolve(folder,'03-phone-paused-after-advance.png')});
  await phone.locator('#aim').click();
  if(await phone.locator('#aim').getAttribute('aria-pressed')!=='true')
    throw Error('LOOK mode did not activate');
  await phone.touchscreen.tap(point.x+20,point.y-32);
  if(await phone.locator('#aim').getAttribute('aria-pressed')!=='false')
    throw Error('LOOK mode not consumed by map tap');
  await phone.locator('#restart').click();
  if(await phone.locator('#clock').innerText()!=='00:00')
    throw Error('Mission reset did not reset the clock');
  const pc=await browser.newPage({
    viewport:{width:1220,height:810},deviceScaleFactor:1,
  });
  pc.on('pageerror',e=>errors.push(e.message));
  await pc.goto(url,{waitUntil:'domcontentloaded'});
  await pc.locator('#phase').waitFor();
  await pc.screenshot({path:resolve(folder,'04-desktop-opening.png')});
  await pc.keyboard.press('Space');
  await pc.waitForTimeout(280);
  if(await pc.locator('#phase').innerText()!=='EXECUTING')
    throw Error('Space should start execution on desktop');
  await pc.keyboard.press('Space');
  if(await pc.locator('#phase').innerText()!=='PLANNING')
    throw Error('Space should pause on desktop');
  if(errors.length)throw Error('Browser console exceptions: '+errors.join('; '));
  const manifest={dims,elapsed,paused,errors};
  await writeFile(resolve(folder,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Breach 052 touch & desktop verification passed',manifest);
}finally{await browser?.close();server.kill('SIGTERM');}
