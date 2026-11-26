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
  // Distinguish real 3D facets/material hierarchy from a flat silhouette.
  await page.setViewportSize({width:1280,height:1000});
  await page.locator('#shaded').check();
  await page.getByRole('button',{name:'THREE-QUARTER'}).click();
  await capture('m4-g3-fal-shaded-three-quarter');
  await page.getByRole('button',{name:'LEFT SIDE'}).click();
  await capture('m4-g3-fal-shaded-left-side');
  // Render the three NEW real factory models in the shipped Arsenal, not
  // a synthetic lab-only builder; retain a review capture for each.
  await page.goto(origin+'/arsenal.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('searchbox',{name:'Find weapon model',exact:true}).fill('FAL');
  const variants=[
   ['FN FAL 50.00 · Wood','wood-5000'],
   ['FN FAL 50.61 Para','para-5061'],
   ['FN FAL 50.63 Para','para-5063']
  ];
  for(const [name,file] of variants){
   await page.getByRole('button',{name:'Select '+name}).click();
   await page.waitForFunction(expected=>
    document.querySelector('section[aria-label="Selected weapon"] .arsenal-hero-copy h2')?.textContent===expected&&
    document.querySelector('section[aria-label="Selected weapon"] .arsenal-hero-media img')?.naturalWidth>=400,
    name,{timeout:30000});
   const photo=await page.getByRole('region',{name:'Selected weapon',exact:true}).screenshot({
    path:'fal-p1-captures/arsenal-'+file+'.png'});
   if(photo.length<7000)throw Error('Blank Arsenal '+name+' hero');
  }
  // The short Para must also open in the actual mobile Workbench without
  // an unsupported-parts exception.
  await page.setViewportSize({width:430,height:920});
  await page.getByRole('region',{name:'Selected weapon',exact:true}).locator('.arsenal-hero-open').click();
  await page.waitForFunction(()=>document.body.textContent?.includes('FN FAL 50.63 Para')&&
   !!document.querySelector('canvas'),null,{timeout:30000});
  const paraWorkbench=await page.screenshot({path:'fal-p1-captures/arsenal-para-5063-mobile-workbench.png'});
  if(paraWorkbench.length<11000)throw Error('Blank Para Workbench');
  if(errors.length)throw Error('3D FAL lab/Arsenal errors: '+errors.join(' | '));
  console.log('FAL P5: 8 Three.js right/left/shaded/three-quarter/mobile comparison captures passed.');
  await page.close();
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
