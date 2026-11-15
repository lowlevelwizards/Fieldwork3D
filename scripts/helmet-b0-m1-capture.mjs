/** B0: controlled source-of-truth Studio captures, not a release gate.
 * Run with the project's Playwright dev dependencies installed:
 * node scripts/helmet-b0-m1-capture.mjs
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4287,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const out=process.env.HELMET_CAPTURE_DIR??'helmet-b0-captures';
const faces=['front','side','back','fit'];
try{
 let ready=false;
 for(let i=0;i<110;i++){
  try{if((await fetch(base+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(ok=>setTimeout(ok,140));
 }
 if(!ready)throw Error('B0 Studio server not ready');
 await mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:430,height:920},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('studioCanvas')?.
   dataset.ready==='true',null,{timeout:35000});
  await page.getByRole('button',{name:'Customize head'}).click();
  const items=page.locator('#studioWorkflow [data-studio-step="items"]');
  const details=page.locator('#studioWorkflow [data-studio-step="details"]');
  const stage=page.locator('.studio-stage'),records=[];
  const shoot=async label=>{
   for(const view of faces){
    await page.locator('[data-studio-view="'+view+'"]').click();
    await page.waitForTimeout(180);
    const calls=Number(await page.locator('#studioCanvas').evaluate(x=>x.dataset.drawCalls||0));
    if(calls<=0)throw Error('No WebGL draws: '+label+' '+view);
    const file=label+'-'+view+'.png';
    await stage.screenshot({path:out+'/'+file});
    records.push({file,drawCalls:calls,view,label});
   }
  };
  for(const id of ['m1-steel','pasgt','soviet-steel','ddr-m56','ach','mich-2002']){
   await items.click();
   const button=page.locator('[data-appearance-item="'+id+'"]');
   await button.scrollIntoViewIfNeeded();await button.click();
   await shoot(id+'-as-saved');
  }
  await items.click();await page.locator('[data-appearance-item="m1-steel"]').click();
  for(const cover of ['none','fitted','loose']){
   await details.click();
   const group=page.locator('.material-group').filter({hasText:'M1 HELMET COVER'});
   await group.locator('select').selectOption(cover);
   await shoot('m1-'+cover);
  }
  if(errors.length)throw Error('Runtime errors: '+errors.join(' | '));
  await writeFile(out+'/manifest.json',JSON.stringify({
   note:'Source-authoritative screenshots; FIT is a Studio camera preset',
   viewport:'430x920 @ 2dpr',frames:records.length,captures:records
  },null,2));
  console.log('B0 capture complete:',records.length,'frames in',out);
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
