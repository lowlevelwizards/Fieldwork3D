/** A3.H3 optic-material WebGL capture smoke. Produces a single PNG contact sheet plus inventory.
 * Requires optional Playwright, like other Fieldwork visual smoke scripts.
 * Run: node scripts/capture-arsenal-a3.mjs
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=4259,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/arsenal-a1-capture.html?h3=1')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('Arsenal A3 Vite capture route unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:980},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{
   if(msg.type()==='error')errors.push(msg.text());
  });
  await page.goto(origin+'/arsenal-a1-capture.html?h3=1',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
   document.body.dataset.a1Complete==='true'||Boolean(document.body.dataset.a1Failed),
   null,{timeout:120000});
  const outcome=await page.evaluate(()=>({
   failed:document.body.dataset.a1Failed||'',
   count:Number(document.body.dataset.a1Count||0),
   rows:document.querySelectorAll('.preset').length,
   equipped:Number(document.body.dataset.a3EquippedCount||0),
   views:document.querySelectorAll('.view img').length,
   loaded:[...document.querySelectorAll('.view img')].every(image=>
    image instanceof HTMLImageElement&&image.complete&&image.naturalWidth===480),
   names:[...document.querySelectorAll('.preset')].map(row=>row.dataset.presetId),
   accepted:[...document.querySelectorAll('.preset')].map(row=>row.dataset.acceptedAccessories)
  }));
  if(outcome.failed||outcome.rows!==9||outcome.count!==9||outcome.equipped!==9||
     outcome.views!==36||!outcome.loaded||
     new Set(outcome.names).size!==9||outcome.accepted.some(x=>!x?.includes('optic-')))
   throw Error('A3.H3 optic sheet incomplete: '+JSON.stringify(outcome));
  if(errors.length)throw Error('A3 WebGL failures: '+errors.join(' | '));
  await mkdir('reports',{recursive:true});
  await page.screenshot({path:'reports/arsenal-a3-h3-optic-sheet.png',
   fullPage:true,animations:'disabled',timeout:120000});
  console.log('Arsenal A3 WebGL equipped sheet: 9 accepted real equipped models, 36 zoomed optic views');
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
