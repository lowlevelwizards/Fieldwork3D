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
   const roster=armory.locator('.campaign-outfitter-operator-select');
   assert.ok(await roster.isVisible(),'Compact operator selector visible');
   assert.ok(await armory.locator('.campaign-outfitter-metrics').isVisible());
   const stage=armory.locator('.campaign-kit-summary');
   const drawer=armory.locator('.campaign-kit-editor');
   const screen=await armory.evaluate(el=>{
    const bounds=node=>{const r=node.getBoundingClientRect();return {
     top:r.top,bottom:r.bottom,left:r.left,right:r.right,
     width:r.width,height:r.height};
    };
    return {viewport:{width:innerWidth,height:innerHeight},
     root:bounds(el),stage:bounds(el.querySelector('.campaign-kit-summary')),
     drawer:bounds(el.querySelector('.campaign-kit-editor')),
     rail:bounds(el.querySelector('.campaign-kit-bench-zones')),
     style:getComputedStyle(el).position};
   });
   assert.equal(screen.style,'fixed','Whole outfitter owns one stable viewport');
   assert.ok(screen.root.bottom<=screen.viewport.height+2&&
    screen.root.top>=-2&&screen.root.height<=screen.viewport.height+2,
    'No vertical page length outside screen '+JSON.stringify(screen));
   assert.ok(screen.stage.bottom<=screen.drawer.top+3&&
    screen.drawer.bottom<=screen.viewport.height+2,
    'Stage and drawer occupy separate non-overlapping viewport bands '+JSON.stringify(screen));
   assert.equal(await armory.locator('.campaign-kit-bench-zone:visible').count(),8,
    'Every category is available along the two icon rails');
   assert.equal(await armory.locator('.campaign-kit-bench-zone svg:visible').count(),8,
    'All eight category buttons have real icons');
   await armory.locator('.campaign-kit-bench-zone[data-slot="head"]').click();
   assert.equal(await armory.getAttribute('data-bench-slot'),'head');
   const row=armory.locator('.campaign-kit-choice[data-bench-slot="head"]');
   assert.ok(await row.isVisible());
   const preview=armory.locator('.campaign-kit-preview');
   assert.equal(await preview.evaluate(el=>getComputedStyle(el).position),'relative',
    'Operator overlay must use the WebGL viewport as its containing block');
   const layout=await preview.evaluate(el=>{
    const bounds=node=>{const r=node.getBoundingClientRect();return {
     x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};
    };
    const host=bounds(el),canvas=bounds(el.querySelector('canvas'));
    const layer=bounds(el.querySelector('.campaign-kit-hotspots'));
    const controls=[...el.querySelectorAll(
     '.campaign-kit-hotspot:not([hidden]),.campaign-kit-zoom button,.campaign-kit-preview-pose-toggle')]
     .map(node=>({label:node.getAttribute('aria-label'),...bounds(node)}));
    return {host,canvas,layer,controls,allHotspots:el.querySelectorAll(
     '.campaign-kit-hotspot').length,visibleHotspots:el.querySelectorAll(
     '.campaign-kit-hotspot:not([hidden])').length};
   });
   assert.ok(layout.canvas.width>=layout.host.width-4 &&
    layout.canvas.height>=layout.host.height-4,'Canvas fills operator stage '+JSON.stringify(layout));
   assert.ok(Math.abs(layout.layer.x-layout.host.x)<3&&
    Math.abs(layout.layer.y-layout.host.y)<3&&
    Math.abs(layout.layer.width-layout.host.width)<4&&
    Math.abs(layout.layer.height-layout.host.height)<4,
    'Hotspot coordinate space must equal the stage, not the sticky summary '+JSON.stringify(layout));
   assert.equal(await preview.locator('.campaign-kit-hotspot:visible').count(),0,
    'The clean operator model has no permanent floating category pips');
   for(const control of layout.controls){
    if(control.width===0||control.height===0)continue;
    assert.ok(control.width<=Math.max(155,layout.host.width*.55)&&
     control.height<=44,'Overlay button must not stretch into an unreadable bar '+
     JSON.stringify(control));
    assert.ok(control.x>=layout.host.x-3&&control.right<=layout.host.right+3&&
     control.y>=layout.host.y-3&&control.bottom<=layout.host.bottom+3,
     'Visible overlay controls stay inside the preview '+JSON.stringify(control));
   }
   assert.equal(await armory.getAttribute('data-bench-slot'),'head',
    'Head icon routes to the actual equipment editor');
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
   await armory.locator('.campaign-kit-bench-zone[data-slot="backpack"]').click();
   assert.equal(await armory.getAttribute('data-bench-slot'),'backpack');
   await nav.getByRole('button',{name:'ARRANGE CARRY'}).click();
   const board=armory.locator('.fw-field-inventory');
   assert.ok(await board.isVisible());
   assert.equal(await board.locator('.fw-field-inventory-slot:visible').count(),1,
    'Only one carrying location is expanded on mobile');
   await board.locator('.fw-field-inventory-zone-jump[data-location="belt"]').click();
   assert.equal(await board.getAttribute('data-active-location'),'belt');
   assert.equal(await board.locator('.fw-field-inventory-slot:visible').count(),1);
   assert.ok(await board.locator('.fw-field-inventory-slot[data-location="belt"]').isVisible());
   assert.equal(await board.locator('.fw-carry-bodymap').evaluate(el=>el.open),false,
    'Precision diagram is optional and collapsed by default');
   assert.equal(await board.locator('.fw-field-inventory-issue').evaluate(el=>el.open),false);
   assert.equal(await board.locator('.fw-field-inventory-advanced').evaluate(el=>el.open),false);
   assert.deepEqual(errors,[],'No runtime exceptions at '+width+'px');
   console.log('BENCH R1 phone UX PASS',width,visibility);
   await page.close();
  }
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
