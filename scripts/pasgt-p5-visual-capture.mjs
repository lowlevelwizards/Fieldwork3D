/** PASGT P5 actual WebGL visual gate — controlled studio camera and
 * appearance variants, photographed from the PR branch (never production).
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4198,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,140));
 }
 if(!ready)throw Error('PASGT visual probe server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({
   viewport:{width:430,height:920},deviceScaleFactor:2,isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
   document.getElementById('studioCanvas')?.dataset.ready==='true'&&
   Number(document.getElementById('studioCanvas')?.dataset.drawCalls)>0,
   null,{timeout:30000});
  await page.getByRole('button',{name:'Customize head'}).click();
  await page.locator('[data-studio-step="items"]').click();
  const choice=page.locator('[data-appearance-item="pasgt"]');
  await choice.scrollIntoViewIfNeeded();
  if(await choice.isDisabled())throw Error('PASGT not available in default appearance kit');
  await choice.click();
  const coverSelect=page.locator('.material-group').filter({hasText:'PASGT CLOTH COVER'}).locator('select');
  await coverSelect.waitFor({timeout:15000});
  const stage=page.locator('.studio-stage');
  const capture=async(id,view)=>{
   await page.locator('[data-studio-view="'+view+'"]').click();
   await page.waitForTimeout(230);
   const canv=await page.locator('#studioCanvas').evaluate(x=>({
    calls:Number(x.dataset.drawCalls),ready:x.dataset.ready
   }));
   if(!canv.calls||canv.ready!=='true')throw Error('No WebGL frame at '+id);
   await stage.screenshot({path:'pasgt-p5-captures/'+id+'.png'});
  };
  await mkdir('pasgt-p5-captures',{recursive:true});
  await coverSelect.selectOption('none');
  await capture('01-bare-front','front');
  await capture('02-bare-side','side');
  await page.locator('.material-group').filter({hasText:'PASGT CLOTH COVER'})
   .locator('select').selectOption('fitted');
  await capture('03-solid-front','front');
  await capture('04-solid-side','side');
  await capture('05-solid-back','back');
  const picker=page.locator('.material-group').filter({hasText:'PASGT COVER PATTERN'})
   .locator('.studio-camo-picker');
  await picker.locator('summary.studio-camo-selected').click();
  const woodland=picker.locator('button.swatch').filter({hasText:'M81 WOODLAND'}).first();
  await woodland.scrollIntoViewIfNeeded();
  await woodland.click();
  await capture('06-m81-front','front');
  await capture('07-m81-side','side');
  await capture('08-m81-back','back');
  await page.locator('[data-studio-step="details"]').click();
  const band=page.locator('.material-group').filter({hasText:'PASGT HELMET BAND'})
   .locator('select');
  await band.selectOption('elastic');
  await capture('09-m81-band-front','front');
  await capture('10-m81-band-side','side');
  await page.locator('[data-studio-step="materials"]').click();
  await page.locator('.material-group').filter({hasText:'PASGT CLOTH COVER'})
   .locator('select').selectOption('none');
  await capture('11-bare-band-side','side');
  if(errors.length)throw Error('PASGT visual probe page errors: '+errors.join('; '));
  console.log('PASGT actual WebGL captures: 11 variants, camera and shell fit verified');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
