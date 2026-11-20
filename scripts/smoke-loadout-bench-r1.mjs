/** Bench R1/R4: iPhone-sized proof of one operator, two edit modes,
 * inline gear shelves, readiness drawer and one active physical carrier.
 */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const port=4296,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,130));
 }
 assert.ok(ready,'Development server must respond');
 const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  for(const width of [320,390]){
   const page=await browser.newPage({viewport:{width,height:844},
    isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
   await page.locator('.campaign-landing-primary').waitFor({timeout:30000});
   await page.locator('.campaign-landing-primary').click();
   await page.getByRole('button',{name:/^DISPATCH —/}).click();
   await page.getByRole('button',{name:'CREATE DISPATCH',exact:true}).click();
   await page.locator('#campaign-tab-personnel').waitFor({timeout:30000});
   await page.locator('#campaign-tab-personnel').click();
   const person=page.locator('.campaign-person').first();
   await person.locator('.campaign-person-expand > summary').click();
   await person.getByRole('button',{name:/^Open .* loadout$/}).click();
   const armory=page.locator('.campaign-armory-screen');
   await armory.waitFor({timeout:30000});
   const nav=armory.locator('.campaign-kit-workspace-nav');
   assert.equal(await nav.locator('button').count(),2,'Only two editing modes');
   assert.ok(await armory.locator('.campaign-kit-preview canvas').count(),
    'One real operator model remains on-screen');
   const readiness=armory.locator('.campaign-kit-readiness-drawer');
   assert.equal(await readiness.evaluate(el=>el.open),false);
   await readiness.locator(':scope > summary').click();
   assert.ok(await readiness.locator('.campaign-kit-readiness-panel').isVisible());
   await readiness.locator(':scope > summary').click();
   await armory.locator('.campaign-kit-bench-zone[data-slot="head"]').click();
   assert.equal(await armory.getAttribute('data-bench-slot'),'head');
   const row=armory.locator('.campaign-kit-choice[data-bench-slot="head"]');
   assert.ok(await row.isVisible());
   const preview=armory.locator('.campaign-kit-preview');
   assert.equal(await preview.evaluate(el=>getComputedStyle(el).position),'static',
    'Single in-place operator stage, no floating duplicate');
   await row.locator('.campaign-kit-picker-trigger').click();
   const shelf=row.locator('.campaign-gear-picker-inline');
   await shelf.waitFor({timeout:20000});
   assert.ok(await shelf.isVisible(),'Gear choices appear next to selected slot');
   assert.equal(await page.locator('.campaign-gear-picker-backdrop').count(),0,
    'No blocking modal');
   assert.equal(await page.evaluate(()=>document.body.style.overflow),'',
    'Gear browsing does not freeze page scroll');
   await shelf.getByRole('button',{name:'CLOSE'}).click();
   await armory.locator('.campaign-kit-bench-zone[data-slot="primary"]').click();
   const weapon=armory.locator('.campaign-kit-choice[data-bench-slot="primary"]');
   await weapon.locator('.campaign-kit-selected-model[data-model="real"] img')
    .waitFor({timeout:15000});
   const visibility=await weapon.locator('.campaign-kit-selected-model img').evaluate(img=>{
    const canvas=document.createElement('canvas');
    canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    let bright=0,min=255,max=0;
    for(let i=0;i<data.length;i+=4){
     const value=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];
     if(value>70)bright++;
     min=Math.min(min,value);max=Math.max(max,value);
    }
    return {brightFraction:bright/(data.length/4),max,min};
   });
   assert.ok(visibility.max>75&&visibility.brightFraction>.0015,
    'True rendered item image has legible illuminated pixels '+JSON.stringify(visibility));
   await nav.getByRole('button',{name:'ARRANGE CARRY'}).click();
   const board=armory.locator('.fw-field-inventory');
   assert.ok(await board.isVisible());
   assert.equal(await board.locator('.fw-field-inventory-slot:visible').count(),1,
    'Only one carrying location is expanded on mobile');
   await board.locator('.fw-field-inventory-zone-jump[data-location="belt"]').click();
   assert.equal(await board.getAttribute('data-active-location'),'belt');
   assert.equal(await board.locator('.fw-field-inventory-slot:visible').count(),1);
   assert.ok(await board.locator('.fw-field-inventory-slot[data-location="belt"]').isVisible());
   assert.equal(await board.locator('.fw-field-inventory-issue').evaluate(el=>el.open),false);
   assert.equal(await board.locator('.fw-field-inventory-advanced').evaluate(el=>el.open),false);
   assert.deepEqual(errors,[],'No runtime exceptions at '+width+'px');
   console.log('BENCH R1 phone UX PASS',width,visibility);
   await page.close();
  }
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
