/** FAL P1 — actual Vite/Three.js comparison captures at original art scale.
 * Read-only inspection: never mutates weapon catalog or live loadout.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=4241,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/fal-stage1-lab.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('FAL comparison lab is unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000},
   deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{
   if(msg.type()==='error'&&/WebGL|Shader Error|INVALID_OPERATION/i.test(msg.text()))
    errors.push(msg.text());
  });
  await page.goto(origin+'/fal-stage1-lab.html',{waitUntil:'domcontentloaded'});
  const canvas=page.locator('#view');
  await canvas.waitFor({state:'visible'});
  await page.waitForFunction(()=>{
   const canvas=document.querySelector('#view');
   return canvas instanceof HTMLCanvasElement&&canvas.width>=400&&canvas.height>=650;
  },null,{timeout:30000});
  if(!(await page.locator('#factory').isChecked()))
   throw Error('Comparison must show the real factory FAL by default');
  if((await page.locator('#carry').isDisabled())!==true)
   throw Error('Factory carry handle must be active, not lab-only override');
  await mkdir('fal-p1-captures',{recursive:true});
  const capture=async name=>{
   const path='fal-p1-captures/'+name+'.png';
   const bytes=await page.locator('.lab').screenshot({path});
   if(bytes.length<11000)throw Error('Blank WebGL capture '+name);
  };
  await capture('m4-g3-fal-factory-side');
  await page.getByRole('button',{name:'THREE-QUARTER'}).click();
  await capture('m4-g3-fal-factory-three-quarter');
  await page.getByRole('button',{name:'LEFT SIDE'}).click();
  await capture('m4-g3-fal-factory-left-side');
  await page.getByRole('button',{name:'THREE-QUARTER'}).click();
  await page.locator('#factory').uncheck();
  await page.locator('#carry').check();
  await capture('fal-core-with-carry-three-quarter');
  await page.locator('#carry').uncheck();
  await page.getByRole('button',{name:'SIDE',exact:true}).click();
  await capture('fal-core-without-carry-side');
  // The factory FAL must also render in a mobile-sized review frame.
  await page.locator('#factory').check();
  await page.setViewportSize({width:430,height:920});
  await page.waitForFunction(()=>document.querySelector('#view')?.width>0);
  await capture('m4-g3-fal-mobile-side');
  if(errors.length)throw Error('3D FAL lab errors: '+errors.join(' | '));
  console.log('FAL P4: 6 actual Three.js right/left/three-quarter/mobile comparison captures passed.');
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
