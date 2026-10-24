import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const {chromium}=await import('playwright');
const directory=resolve('operation-captures');
await mkdir(directory,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
  '--host','127.0.0.1','--port','4179','--strictPort'],{stdio:'ignore'});
let browser;
try{
  let ready=false;
  for(let i=0;i<100;i++){
    try{
      const resp=await fetch('http://127.0.0.1:4179/operation.html');
      if(resp.ok){ready=true;break;}
    }catch{}
    await new Promise(done=>setTimeout(done,150));
  }
  if(!ready)throw Error('Mission preview failed to launch');
  browser=await chromium.launch({
    headless:true,args:['--use-gl=angle','--use-angle=swiftshader'],
  });
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
  });
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:4179/operation.html',{
    waitUntil:'domcontentloaded',timeout:20000,
  });
  await page.locator('canvas#operationCanvas').waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({path:resolve(directory,'operation-opening-mobile.png')});
  await page.locator('#team').click();
  await page.mouse.click(218,360);
  await page.waitForTimeout(1100);
  await page.screenshot({path:resolve(directory,'operation-after-orders-mobile.png')});
  if(errors.length)throw Error('Browser errors: '+errors.join('; '));
  console.log('Captured playable operation startup and command screenshots');
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
