/** Real mobile + desktop Arsenal smoke for integrated FN FNC factory card. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4259,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/arsenal.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,150));
 }
 if(!ready)throw Error('Arsenal unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:940},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/arsenal.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('searchbox',{name:'Find weapon model',exact:true}).fill('FNC');
  const button=page.getByRole('button',{name:'Select FN FNC'});
  await button.waitFor({state:'visible'});
  await button.click();
  await page.waitForFunction(()=>document.querySelector('.arsenal-hero-copy h2')?.textContent==='FN FNC'&&
   (document.querySelector('.arsenal-hero-media img')?.naturalWidth??0)>=400,null,{timeout:30000});
  await mkdir('fnc-arsenal-captures',{recursive:true});
  await page.locator('.arsenal-hero').screenshot({path:'fnc-arsenal-captures/fnc-arsenal-desktop.png'});
  await page.setViewportSize({width:430,height:930});
  await page.locator('.arsenal-hero-open').click();
  await page.waitForFunction(()=>!!document.querySelector('canvas')&&
   document.body.textContent?.includes('FN FNC'),null,{timeout:30000});
  await page.screenshot({path:'fnc-arsenal-captures/fnc-mobile-workbench.png'});
  if(errors.length)throw Error('Arsenal FNC page errors: '+errors.join(' | '));
  console.log('FN FNC Arsenal hero and mobile Workbench passed');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
