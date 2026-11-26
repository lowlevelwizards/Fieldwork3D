/** A1 real-WebGL capture smoke. Produces a single PNG contact sheet plus inventory.
 * Requires optional Playwright, like other Fieldwork visual smoke scripts.
 * Run: node scripts/capture-arsenal-a1.mjs
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
const expected=ARSENAL_REFERENCES.length;

const port=4259,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/arsenal-a1-capture.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('Arsenal A1 Vite capture route unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:980},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{
   if(msg.type()==='error')errors.push(msg.text());
  });
  await page.goto(origin+'/arsenal-a1-capture.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
   document.body.dataset.a1Complete==='true'||Boolean(document.body.dataset.a1Failed),
   null,{timeout:120000});
  const outcome=await page.evaluate(()=>({
   failed:document.body.dataset.a1Failed||'',
   count:Number(document.body.dataset.a1Count||0),
   rows:document.querySelectorAll('.preset').length,
   views:document.querySelectorAll('.view img').length,
   loaded:[...document.querySelectorAll('.view img')].every(image=>
    image instanceof HTMLImageElement&&image.complete&&image.naturalWidth===480),
   names:[...document.querySelectorAll('.preset')].map(row=>row.dataset.presetId)
  }));
  if(outcome.failed||outcome.rows!==expected||outcome.count!==expected||
     outcome.views!==expected*4||!outcome.loaded||
     new Set(outcome.names).size!==expected||ARSENAL_REFERENCES.some(r=>!outcome.names.includes(r.id)))
   throw Error('A1 contact-sheet incomplete: '+JSON.stringify(outcome));
  if(errors.length)throw Error('A1 WebGL failures: '+errors.join(' | '));
  await mkdir('reports',{recursive:true});
  await page.screenshot({path:'reports/arsenal-a1-contact-sheet.png',
   fullPage:true,animations:'disabled',timeout:120000});
  console.log('Arsenal A1 WebGL contact sheet: '+expected+' real factory models, '+expected*4+' fixed-view panels');
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
