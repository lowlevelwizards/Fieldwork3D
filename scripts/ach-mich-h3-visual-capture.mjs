/** H3: real phone-sized WebGL proof for three shell cuts, bare/fabric/
 * printed material, front/side/back, plus a deliberate menu persistence gate.
 * Captures only; never writes to production or mutates test snapshots.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4197,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let started=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){started=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,160));
 }
 if(!started)throw Error('ACH/MICH H3 Studio unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({
   viewport:{width:430,height:920},deviceScaleFactor:2,isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('studioCanvas')?.dataset.ready==='true'&&
   Number(document.getElementById('studioCanvas')?.dataset.drawCalls)>0,
   null,{timeout:30000});
  const shadow=await page.locator('#studioQualityShadowSize').inputValue();
  if(shadow!=='1024')throw Error('Studio H3 must default to 1024² shadow map, got '+shadow);
  await page.getByRole('button',{name:'Customize head'}).click();
  await mkdir('ach-mich-h3-captures',{recursive:true});
  const materialTab=page.locator('#studioWorkflow [data-studio-step="materials"]');
  const itemTab=page.locator('#studioWorkflow [data-studio-step="items"]');
  const stage=page.locator('.studio-stage');
  const capture=async(label,view)=>{
   await page.locator('[data-studio-view="'+view+'"]').click();
   await page.waitForTimeout(260);
   const status=await page.locator('#studioCanvas').evaluate(e=>({
    calls:Number(e.dataset.drawCalls),ready:e.dataset.ready
   }));
   if(!status.calls||status.ready!=='true')throw Error('No WebGL render '+label);
   await stage.screenshot({path:'ach-mich-h3-captures/'+label+'.png'});
  };
  for(const id of ['ach','mich-2001','mich-2002']){
   await itemTab.click();
   const selection=page.locator('[data-appearance-item="'+id+'"]');
   await selection.scrollIntoViewIfNeeded();
   if(await selection.isDisabled())throw Error('Helmet not equipable '+id);
   await selection.click();
   await materialTab.click();
   const cover=page.locator('.material-group')
    .filter({hasText:'One fitted fabric cover or an exposed painted shell.'}).locator('select');
   await cover.waitFor({timeout:15000});
   await cover.selectOption('none');
   for(const view of ['front','side','back'])
    await capture(id+'-bare-'+view,view);
   const colors=page.locator('.material-group')
    .filter({hasText:'Painted composite shell finish — remains selected underneath'});
   const swatches=colors.locator('button.swatch');
   const initial=await swatches.allTextContents();
   await swatches.filter({hasText:'Desert Tan'}).first().click();
   if((await swatches.allTextContents()).join('|')!==initial.join('|'))
    throw Error('Picking shell solid reordered swatches '+id);
   if(await materialTab.getAttribute('aria-pressed')!=='true')
    throw Error('Solid selection left material tab '+id);
   await page.locator('.material-group')
    .filter({hasText:'One fitted fabric cover or an exposed painted shell.'})
    .locator('select').selectOption('fitted');
   for(const view of ['front','side','back'])
    await capture(id+'-plain-'+view,view);
   const section=page.locator('.material-group')
    .filter({hasText:'Only the fabric receives camouflage'});
   const picker=section.locator('.studio-camo-picker');
   if(!(await picker.isVisible()))throw Error('Cover pattern picker hidden '+id);
   // Previous shell selection can leave this same library open; only
   // expand if currently closed, never toggle it shut accidentally.
   if(await picker.getAttribute('open')===null)
    await picker.locator('summary.studio-camo-selected').click();
   const woodland=picker.locator('button.swatch')
    .filter({hasText:'M81 WOODLAND'}).first();
   await woodland.scrollIntoViewIfNeeded();await woodland.click();
   if(await materialTab.getAttribute('aria-pressed')!=='true')
    throw Error('Camo selection left material tab '+id);
   const restored=page.locator('.material-group')
    .filter({hasText:'Only the fabric receives camouflage'})
    .locator('.studio-camo-picker');
   if(!(await restored.getAttribute('open')!==null))
    throw Error('Camo selector collapsed on selection '+id);
   for(const view of ['front','side','back'])
    await capture(id+'-woodland-'+view,view);
   await capture(id+'-woodland-fit','fit');
  }
  if(errors.length)throw Error('Studio runtime errors: '+errors.join('; '));
  console.log('ACH/MICH H3: 30 actual phone WebGL comparison images and UX assertions');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
