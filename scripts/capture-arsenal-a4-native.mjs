/** A4.8 actual production WebGL readability at native small-scale preview.
 * Factory catalog is identical to A1, but the browser downsizes rendered
 * 480px panels to actual 128/64px presentation before capture.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4261,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/arsenal-a1-capture.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('A4 visual comparison route unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1350,height:900},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(origin+'/arsenal-a1-capture.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.a1Complete==='true'||
   Boolean(document.body.dataset.a1Failed),null,{timeout:120000});
  const status=await page.evaluate(()=>({
   failure:document.body.dataset.a1Failed||'',
   count:Number(document.body.dataset.a1Count||0),
   panels:document.querySelectorAll('.view img').length,
   unique:new Set([...document.querySelectorAll('.preset')].map(x=>x.dataset.presetId)).size
  }));
  if(errors.length||status.failure||status.count!==35||status.panels!==140||
   status.unique!==35)
   throw Error('A4 browser factory capture incomplete: '+JSON.stringify({status,errors}));
  await mkdir('reports',{recursive:true});
  for(const width of [128,64]){
   await page.addStyleTag({content:`
     .view img {width:${width}px!important;height:${width/2}px!important;
       image-rendering:pixelated!important;object-fit:contain!important}
     .views {display:grid!important;grid-template-columns:repeat(4,${width}px)!important;
       gap:8px!important}
     .preset {margin:4px 0!important;padding:4px!important}
     .view {width:${width}px!important;margin:0!important}
     .view figcaption {font-size:10px!important}
   `});
   await page.screenshot({path:`reports/arsenal-a4-native-${width}px.png`,
    fullPage:true,animations:'disabled',timeout:120000});
  }
  console.log('A4 native-scale WebGL: 35 factory models / 140 panels at 128px and 64px');
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
