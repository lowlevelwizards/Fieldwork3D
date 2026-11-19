/** Browser-backed production R870 silhouette acceptance, not a mock model. */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4297,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/arsenal-r870-p07-capture.html')).ok){
   ready=true;break;
  }}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 if(!ready)throw Error('R870 real WebGL capture page unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1510,height:1100},
   deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(origin+'/arsenal-r870-p07-capture.html',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.r870P07Complete==='true',
   null,{timeout:90000});
  const stats=await page.evaluate(()=>JSON.parse(
   document.body.dataset.r870P07Stats||'[]'));
  if(stats.length!==3||new Set(stats.map(x=>x.view)).size!==3||
   stats.some(x=>x.occupiedPixels<3000||x.triangles<=0||x.calls<=0))
   throw Error('Incomplete R870 production views: '+JSON.stringify(stats));
  if(errors.length)throw Error('Browser errors: '+errors.join(' | '));
  await mkdir('reports',{recursive:true});
  const png=await page.screenshot({path:'reports/arsenal-r870-p07-production.png',
   fullPage:true,animations:'disabled'});
  if(png.length<14000)throw Error('Blank R870 production capture');
  await writeFile('reports/arsenal-r870-p07-production.json',
   JSON.stringify(stats,null,2)+'\n');
  console.log('R870 P07 real Arsenal geometry views:',JSON.stringify(stats));
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
