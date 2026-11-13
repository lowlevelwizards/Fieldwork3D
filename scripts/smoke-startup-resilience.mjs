import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4219,url='http://127.0.0.1:'+port+'/';
const server=spawn(process.execPath,
 ['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1',
  '--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let reachable=false;
 for(let n=0;n<110;n++){
  try{if((await fetch(url)).ok){reachable=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!reachable)throw Error('Production preview did not start');
 browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 const options={viewport:{width:390,height:844},
   deviceScaleFactor:1,isMobile:true,hasTouch:true};
 const healthy=await browser.newPage(options),errors=[];
 healthy.on('pageerror',e=>errors.push(e.message));
 await healthy.goto(url+'?quick=1&seed=23&civilians=0',
   {waitUntil:'domcontentloaded'});
 await healthy.waitForFunction(()=>
   document.documentElement.dataset.fieldworkAppReady==='1',
   null,{timeout:25000});
 await healthy.waitForFunction(()=>
   document.documentElement.dataset.fieldworkFirstSceneFrame==='1',
   null,{timeout:35000});
 const status=await healthy.evaluate(()=>({
  canvas:!!document.querySelector('#breach3dCanvas'),
  hud:!!document.querySelector('#liveMatchPerf'),
  problem:!!document.querySelector('#fieldwork-startup-issue')
 }));
 if(!status.hud||status.problem||errors.length)
   throw Error('Healthy bootstrap failed '+JSON.stringify({status,errors}));
 const broken=await browser.newPage(options);
 await broken.route('**/assets/*.js',route=>route.abort('failed'));
 await broken.goto(url+'?quick=1&seed=24',
   {waitUntil:'domcontentloaded'});
 await broken.locator('#fieldwork-startup-issue').waitFor({timeout:20000});
 const label=await broken.locator('#fieldwork-startup-issue').innerText();
 if(!label.includes('LOAD LATEST BUILD')||!label.includes('COULD NOT START'))
   throw Error('Missing bundle did not show recovery: '+label);
 console.log('Production bootstrap and blocked-JS recovery PASS',status);
}finally{
 await browser?.close();server.kill();
}
