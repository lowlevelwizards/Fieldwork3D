/** EQA3.16H: actual Chrome SwiftShader WebGL camera images and readback.
 * Scripted visual-state gallery, NOT a live encounter. Live behavior remains
 * validated by EQA3.16 organic session tests. No production gameplay edits.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const output='artifacts/eqa3-16h';
await mkdir(output,{recursive:true});
const port=4286,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
try{
 let ready=false;
 for(let i=0;i<110;i++){
  try{if((await fetch(origin+'/tests/fixtures/eqa3-16h-presentation.html')).ok){
   ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,170));
 }
 if(!ready)throw Error('NPC visual review fixture did not start');
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader',
  '--enable-unsafe-swiftshader'
 ]});
 const page=await browser.newPage({
  viewport:{width:1150,height:900},deviceScaleFactor:1
 });
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin+'/tests/fixtures/eqa3-16h-presentation.html',{
  waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.body.dataset.eqa316Ready==='true',
  null,{timeout:90000});
 const reports=await page.evaluate(()=>window.__eqa316.reports);
 if(reports.length!==15)throw Error('Missing 10 civilians + 5 hostile real rigs');
 const views=[];
 for(const view of ['iso','overhead']){
  const current=await page.evaluate(view=>window.__eqa316.render(view),view);
  if(current.view!==view||!current.poseFinite||
    current.actors!==15||current.drawCalls<15||
    current.triangles<=0||current.occupancy<400||
    current.headEvidence<2||current.guarding<1)
   throw Error('Actual WebGL rig presentation invalid: '+JSON.stringify(current));
  await page.screenshot({path:output+'/npc-'+view+'.png',
   animations:'disabled',fullPage:true});
  views.push(current);
 }
 if(errors.length)throw Error('Browser/renderer errors: '+errors.slice(0,7).join(' | '));
 await writeFile(output+'/camera-metrics.json',
  JSON.stringify({format:'EQA3.16H-scripted-camera-audit',
   note:'Scripted poses; not evidence of natural scenario frequency',
   views,reports},null,2)+'\n');
 console.log('EQA3_16H_CAMERA',JSON.stringify(views));
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
