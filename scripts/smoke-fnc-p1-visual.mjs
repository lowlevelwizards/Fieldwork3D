/** Browser-level FNC P1 visual review: actual Vite Three.js canvas at native art scale. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=4247,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/fnc-stage1-lab.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('FNC P1 comparison lab unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1220,height:1260},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',msg=>{
   if(msg.type()==='error'&&/WebGL|Shader Error|INVALID_OPERATION/i.test(msg.text()))
    errors.push(msg.text());
  });
  await page.goto(origin+'/fnc-stage1-lab.html',{waitUntil:'domcontentloaded'});
  const canvas=page.locator('#view');
  await canvas.waitFor({state:'visible'});
  await page.waitForFunction(()=>{
   const c=document.querySelector('#view');
   return c instanceof HTMLCanvasElement&&c.width>=450&&c.height>=850;
  },null,{timeout:30000});
  await mkdir('fnc-p1-captures',{recursive:true});
  const capture=async label=>{
   const png=await page.locator('.lab').screenshot({path:'fnc-p1-captures/'+label+'.png'});
   if(png.length<12000)throw Error('Empty FNC P1 WebGL capture '+label);
  };
  await capture('fnc-fal-g3-ak74-m16a2-side');
  await page.getByRole('button',{name:'THREE-QUARTER'}).click();
  if(await page.getByRole('button',{name:'THREE-QUARTER'}).getAttribute('aria-pressed')!=='true')
   throw Error('Quarter view button did not change camera');
  await capture('fnc-fal-g3-ak74-m16a2-three-quarter');
  await page.getByRole('button',{name:'OPPOSITE SIDE'}).click();
  await capture('fnc-fal-g3-ak74-m16a2-opposite');
  await page.setViewportSize({width:430,height:960});
  await page.getByRole('button',{name:'SIDE',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#view')?.width>0);
  await capture('fnc-fal-g3-ak74-m16a2-mobile');
  if(errors.length)throw Error('FNC P1 lab had Three.js errors: '+errors.join(' | '));
  console.log('FNC P1 actual WebGL lab: side / quarter / opposite / mobile captures passed');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
