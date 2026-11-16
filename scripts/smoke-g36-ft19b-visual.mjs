/** Run manually / in an available Playwright browser environment for FT1.9B art gate.
 * Real Vite WebGL, same model source as the future production path; no image stub.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4252,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/g36-ft19b-lab.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('FT1.9B lab unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1220,height:1810},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto(origin+'/g36-ft19b-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.g36LabReady==='true'&&
   document.body.dataset.g36LabCount==='7',{timeout:30000});
  await mkdir('g36-ft19b-captures',{recursive:true});
  const snap=async name=>{
   const b=await page.locator('.lab').screenshot({path:'g36-ft19b-captures/'+name+'.png'});
   if(b.length<10000)throw Error('Blank lab: '+name);
  };
  await snap('g36-peers-side');
  for(const [button,file] of [
   ['THREE-QUARTER','g36-peers-three-quarter'],
   ['OPPOSITE SIDE','g36-peers-opposite'],
   ['TOP','g36-master-top'],['FRONT','g36-master-front']
  ]){
   await page.getByRole('button',{name:button,exact:true}).click();
   await snap(file);
  }
  await page.getByRole('button',{name:'SIDE',exact:true}).click();
  for(const [id,name] of [['thumb128','g36-master-128px'],['thumb64','g36-master-64px']]){
   const bytes=await page.locator('#'+id).screenshot({path:'g36-ft19b-captures/'+name+'.png'});
   if(bytes.length<300)throw Error('Missing small silhouette: '+name);
  }
  await page.setViewportSize({width:430,height:1260});
  await snap('g36-peers-mobile');
  if(errors.length)throw Error('G36 browser errors: '+errors.join('; '));
  console.log('FT1.9B real WebGL images saved. Human art review still required.');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
