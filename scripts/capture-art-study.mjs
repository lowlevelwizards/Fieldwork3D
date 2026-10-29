/**
 * Build 051: capture real standalone art study at phone and desktop scale.
 * No fake graphics or mocked player state.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import('playwright');
const dir=resolve('study-051-captures');
await mkdir(dir,{recursive:true});
const PORT=4188,url=`http://127.0.0.1:${PORT}/study.html`;
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(PORT),'--strictPort'],{
    stdio:'ignore',env:{...process.env,CI:'true'},
  });
let browser;
try{
  let ready=false;
  for(let i=0;i<100;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(ok=>setTimeout(ok,150));
  }
  if(!ready)throw Error('Art study preview did not start');
  browser=await chromium.launch({headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader']});
  const phone=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:2,
    hasTouch:true,isMobile:true,
  });
  const errors=[];phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(url,{waitUntil:'domcontentloaded'});
  await phone.locator('#stateLabel').waitFor();
  await phone.waitForTimeout(850);
  const dimensions=await phone.locator('#studyCanvas').evaluate(el=>({
    width:el.width,height:el.height,clientWidth:el.clientWidth,clientHeight:el.clientHeight,
  }));
  if(dimensions.width<390||dimensions.height<844)
    throw Error('Phone renderer not properly sized: '+JSON.stringify(dimensions));
  if(await phone.locator('#helpPanel').isVisible())
    throw Error('Help overlays the opening composition');
  await phone.screenshot({path:resolve(dir,'01-phone-opening.png')});
  await phone.locator('#crouchButton').click();
  if(await phone.locator('#crouchButton').getAttribute('aria-pressed')!=='true')
    throw Error('Crouch toggle did not apply');
  await phone.waitForTimeout(340);
  await phone.screenshot({path:resolve(dir,'02-phone-crouched.png')});
  await phone.locator('#crouchButton').click();
  const cdp=await phone.context().newCDPSession(phone);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',
    touchPoints:[{id:1,x:86,y:631}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',
    touchPoints:[{id:1,x:96,y:575}]});
  await phone.waitForTimeout(730);
  if(!await phone.locator('#joystick').evaluate(el=>el.classList.contains('visible')))
    throw Error('Floating touch locomotion does not appear');
  const moving=await phone.locator('#stateLabel').innerText();
  if(!moving.includes('MOVING'))throw Error('Touch drive failed: '+moving);
  await phone.screenshot({path:resolve(dir,'03-phone-moving.png')});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  if(await phone.locator('#joystick').evaluate(el=>el.classList.contains('visible')))
    throw Error('Touch joystick remains after finger release');
  await phone.locator('#helpButton').click();
  if(!await phone.locator('#helpPanel').isVisible())
    throw Error('Optional help did not open');
  await phone.locator('#closeHelp').click();
  if(await phone.locator('#helpPanel').isVisible())
    throw Error('Optional help did not close');
  const desktop=await browser.newPage({
    viewport:{width:1280,height:800},deviceScaleFactor:1,
  });
  desktop.on('pageerror',e=>errors.push(e.message));
  await desktop.goto(url,{waitUntil:'domcontentloaded'});
  await desktop.locator('#stateLabel').waitFor();
  await desktop.waitForTimeout(450);
  await desktop.screenshot({path:resolve(dir,'04-desktop-opening.png')});
  await desktop.keyboard.down('w');await desktop.waitForTimeout(550);
  const desktopMoving=await desktop.locator('#stateLabel').innerText();
  await desktop.keyboard.up('w');
  if(!desktopMoving.includes('MOVING'))
    throw Error('Desktop movement not working: '+desktopMoving);
  await desktop.screenshot({path:resolve(dir,'05-desktop-walk.png')});
  if(errors.length)throw Error('Browser errors: '+errors.join('; '));
  const manifest={dimensions,moving,desktopMoving,errors,
    intent:'visual-reference-only; must pass human artistic review'};
  await writeFile(resolve(dir,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Fieldwork art study captured:',manifest);
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
