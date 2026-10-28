/**
 * Build 032: actual iPhone-sized regional terrain visual/interaction audit.
 * This captures world.html, not the 10m laboratory. The lab's state and
 * stored water must remain untouched.
 *
 * npm install --no-save --package-lock=false playwright@1.56.1
 * npx playwright install chromium
 * node scripts/capture-region.mjs
 */
import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const {chromium}=await import('playwright');
const directory=resolve('region-032-captures');
await mkdir(directory,{recursive:true});
const PORT=4182,url=`http://127.0.0.1:${PORT}/world.html`;
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(PORT),'--strictPort',
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
try{
  let ready=false;
  for(let i=0;i<100;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(done=>setTimeout(done,140));
  }
  if(!ready)throw Error('World preview server unavailable');
  browser=await chromium.launch({
    headless:true,args:['--use-gl=angle','--use-angle=swiftshader'],
  });
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
    hasTouch:true,isMobile:true,
  });
  page.setDefaultTimeout(15000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:25000});
  await page.locator('#coords').waitFor();
  await page.locator('#regionStatus').getByText('REGION 03 / 06').waitFor();
  const canvas=page.locator('#worldCanvas');
  const canvasInfo=await canvas.evaluate(el=>{
    const bounds=el.getBoundingClientRect();
    return {width:el.width,height:el.height,rect:{width:bounds.width,
      height:bounds.height}};
  });
  if(canvasInfo.width<300||canvasInfo.height<700)
    throw Error('Regional WebGL canvas is not properly sized');
  await page.waitForTimeout(500);
  await page.screenshot({path:resolve(directory,'cutwoods-full-region-mobile.png')});

  await page.locator('#regionMenuButton').click();
  await page.locator('#regionMenu:not([hidden])').waitFor();
  const enabled=await page.locator('.region-choice:not([disabled])').count();
  const disabled=await page.locator('.region-choice[disabled]').count();
  if(enabled!==1||disabled!==5)
    throw Error('Region selector exposed nonimplemented terrain: '+
      enabled+'/'+disabled);
  await page.screenshot({path:resolve(directory,'six-region-selector-mobile.png')});
  await page.locator('#closeRegions').click();
  await page.locator('#regionMenu').waitFor({state:'hidden'});

  // Wheel zoom verifies the near patch, detail labels and geographic
  // dimensions. Use real input rather than swapping a fake mock scene.
  await page.mouse.move(210,405);
  await page.mouse.wheel(0,-2300);
  await page.waitForTimeout(550);
  const closeStatus=await page.locator('#detailStatus').innerText();
  if(!closeStatus.includes('LOCAL DETAIL'))
    throw Error('Regional detail patch did not activate: '+closeStatus);
  await page.screenshot({path:resolve(directory,'cutwoods-detail-mobile.png')});
  await page.mouse.click(170,410);
  await page.waitForTimeout(200);
  const coords=await page.locator('#coords').innerText();
  if(!coords.startsWith('PROBE')||!coords.includes('ASL'))
    throw Error('Geographic terrain probe failed: '+coords);
  await page.screenshot({path:resolve(directory,'cutwoods-terrain-probe-mobile.png')});

  await page.locator('#resetView').click();
  const resetStatus=await page.locator('#detailStatus').innerText();
  if(!resetStatus.includes('REGIONAL DETAIL'))
    throw Error('Reset failed to return to whole-region view');
  // Real two-touch Chromium gesture, not synthetic DOM events: ensures
  // pan and pinch work on iPhone-class pointer inputs.
  const cdp=await page.context().newCDPSession(page);
  const beforeGesture=await page.locator('#coords').innerText();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[
    {id:1,x:143,y:362},{id:2,x:231,y:362},
  ]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[
    {id:1,x:119,y:404},{id:2,x:267,y:414},
  ]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await page.waitForTimeout(180);
  const afterGesture=await page.locator('#coords').innerText();
  if(beforeGesture===afterGesture)
    throw Error('Two-finger gesture did not update the camera target');
  await page.screenshot({path:resolve(directory,'cutwoods-two-finger-mobile.png')});
  await page.locator('#regionMenuButton').click();
  const lab=await page.locator('a[href="./index.html"]').count();
  if(lab!==1)throw Error('Original Environment Lab entry is missing');

  // The standalone 10m lab must still initialize without missing
  // controls, runtime WebGL errors or changing its entrypoint.
  await page.goto(`http://127.0.0.1:${PORT}/index.html`,{
    waitUntil:'domcontentloaded',
  });
  await page.locator('#waterLabel').waitFor();
  await page.locator('#regionToggle').click();
  if(await page.locator('a[href="./world.html"]').count()!==1)
    throw Error('Lab cannot open the new regional world');
  if(errors.length)throw Error('Browser runtime errors: '+errors.join('; '));
  const manifest={canvasInfo,enabled,disabled,closeStatus,coords,resetStatus,
    beforeGesture,afterGesture,
    errors,region:'cutwoods'};
  await writeFile(resolve(directory,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Build 032 regional scene and preserved lab validated:',manifest);
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
