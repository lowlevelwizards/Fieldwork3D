/** H2: actual Chromium WebGL study acceptance at fixed-angle and mobile sizes. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4258,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/g36-h2-handguard-lab.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('H2 lab HTML unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1180,height:1180},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto(origin+'/g36-h2-handguard-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.g36H2Mode==='h2'&&
   document.body.dataset.g36H2View==='side',null,{timeout:30000});
  await mkdir('g36-h2-captures',{recursive:true});
  const snap=async(name,min=1800)=>{
   const b=await page.locator('#render').screenshot({path:'g36-h2-captures/'+name+'.png'});
   if(b.length<min)throw Error('H2 WebGL blank at '+name+' ('+b.length+')');
   return b;
  };
  const h2=await snap('h2-side');
  await page.locator('#h1').click();
  await page.waitForFunction(()=>document.body.dataset.g36H2Mode==='h1');
  const h1=await snap('h1-side');
  if(h2.equals(h1))throw Error('H2 visual identical to H1');
  await page.locator('#h2').click();
  for(const id of ['quarter','front','top','opposite']){
   await page.locator('#'+id).click();
   await page.waitForFunction(v=>document.body.dataset.g36H2View===v,id);
   const b=await snap('h2-'+id,1300);
   if(b.equals(h2))throw Error('H2 camera view unchanged: '+id);
  }
  await page.locator('#side').click();
  const withDetails=await snap('h2-detailed-side');
  for(const id of ['vents','boss','mouth'])await page.locator('#'+id).uncheck();
  const silhouette=await snap('h2-primary-mass-only');
  if(silhouette.equals(withDetails))throw Error('H2 secondary forms not toggleable');
  await page.locator('#width').evaluate(input=>{
   input.value='1.2';input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  const wide=await snap('h2-width-120');
  if(wide.equals(silhouette))throw Error('H2 width adjustment ineffective');
  await page.locator('#width').evaluate(input=>{
   input.value='1';input.dispatchEvent(new Event('input',{bubbles:true}));
  });
  for(const id of ['vents','boss','mouth'])await page.locator('#'+id).check();
  await page.setViewportSize({width:390,height:820});
  await snap('h2-mobile-side',1000);
  for(const id of ['thumb64','thumb128']){
   const b=await page.locator('#'+id).screenshot({path:'g36-h2-captures/'+id+'.png'});
   if(b.length<300)throw Error('Missing H2 tiny side silhouette');
  }
  if(errors.length)throw Error('H2 browser errors: '+errors.join('; '));
  console.log('G36 H2 isolated WebGL H1/H2/view/toggle/mobile checks passed');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
