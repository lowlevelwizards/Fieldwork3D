/** M2.5I live-browser production mesh contact-sheet acceptance.
 * npm install --no-save --package-lock=false playwright@1.56.1
 * npx playwright install chromium
 * node scripts/smoke-arsenal-m25-visual.mjs
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4274,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/arsenal-m25-capture.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,180));
 }
 if(!ready)throw Error('Arsenal M2.5 capture page unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1580,height:1160},
   deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{
   if(m.type()==='error')errors.push(m.text());
  });
  await page.goto(origin+'/arsenal-m25-capture.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.m25Complete==='true',
   null,{timeout:90000});
  const result=await page.evaluate(()=>JSON.parse(document.body.dataset.m25Stats||'[]'));
  if(result.length!==4||result.some(x=>x.unresolved.length||
   !x.mounted.some(m=>m.id==='foregrip-vertical')||
   !x.mounted.some(m=>m.id==='light-compact')||
   x.triangles<=0||x.drawCalls<=0||
   !Number.isFinite(x.triangles)))
   throw Error('Unresolved accessory or blank WebGL scene: '+JSON.stringify(result));
  if(errors.length)throw Error('WebGL browser errors: '+errors.join(' | '));
  await mkdir('reports',{recursive:true});
  const image=await page.screenshot({path:'reports/arsenal-m25-mounted-desktop.png',
   fullPage:true,animations:'disabled'});
  if(image.length<14000)throw Error('Blank desktop WebGL sheet');
  await page.setViewportSize({width:430,height:900});
  const mobile=await page.screenshot({path:'reports/arsenal-m25-mounted-mobile.png',
   fullPage:true,animations:'disabled'});
  if(mobile.length<14000)throw Error('Blank mobile WebGL sheet');
  await writeFile('reports/arsenal-m25-mesh-stats.json',
   JSON.stringify(result,null,2)+'\n');
  console.log('M2.5 real WebGL AR/MP5 mounted accessories:',JSON.stringify(result));
  await page.close();
 }finally{await browser.close()}
}finally{server.kill('SIGTERM')}
