/** D2-R visual checkpoint: 18 genuine WebGL orthographic mask captures,
 * plus six 3D-card thumbnails. One deterministic mobile browser session.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4208,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('D2-R Operator Studio never became ready');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:1.5,
   isMobile:true,hasTouch:true
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mkdir('operator-d2-mask-review',{recursive:true});
  await page.goto(origin+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>{
   const c=document.getElementById('studioCanvas');
   return c?.dataset.ready==='true'&&Number(c.dataset.drawCalls)>0;
  },null,{timeout:30000});
  await page.getByRole('button',{name:'Customize head'}).click();
  await page.locator('#studioSubcategories button').filter({hasText:'FACE'}).click();
  const ids=[
   'half-mask','respirator-half','gas-gp5',
   'gas-m17','gas-m40','gas-m50'
  ];
  for(const id of ids){
   const card=page.locator('[data-appearance-item="'+id+'"]');
   await card.scrollIntoViewIfNeeded();
   await card.click();
   await page.waitForTimeout(250);
   for(const view of ['front','side','back']){
    await page.locator('[data-studio-view="'+view+'"]').click();
    await page.waitForTimeout(150);
    await page.locator('#studioCanvas').screenshot({
     path:'operator-d2-mask-review/'+id+'-'+view+'.png'
    });
   }
   const thumbnail=card.locator('canvas').first();
   if(await thumbnail.count()){
    await thumbnail.screenshot({
     path:'operator-d2-mask-review/'+id+'-thumbnail.png'
    });
   }
   const draws=Number(await page.locator('#studioCanvas').getAttribute('data-draw-calls'));
   if(!Number.isFinite(draws)||draws<1)throw Error(id+' has no 3D render calls');
  }
  if(errors.length)throw Error('D2-R browser errors: '+errors.join('; '));
  console.log('D2-R: 18 front/side/back real WebGL mask captures and six item previews');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
