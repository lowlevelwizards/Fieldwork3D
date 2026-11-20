/** R3 phone acceptance: 1 contextual gallery, 8 direct category rails,
 * no workspace selector, second gear picker, or page scroll. */
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
  for(const {width,height} of [
   {width:320,height:844},{width:390,height:844},
   {width:667,height:375}
  ]){
   const page=await browser.newPage({viewport:{width,height},
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
   assert.ok(await armory.locator('.campaign-kit-preview canvas').count(),
    'One operator WebGL renderer');
   assert.ok(await armory.locator('.campaign-outfitter-operator-select').isVisible(),
    'Compact operator switcher');
   const gallery=armory.locator('.fw-outfitter-gallery');
   assert.ok(await gallery.isVisible(),'Exactly one direct gallery');
   assert.equal(await armory.locator('.fw-outfitter-gallery:visible').count(),1);
   assert.equal(await armory.locator('.campaign-kit-workspace-tab:visible').count(),0,
    'No Change Gear / Arrange Carry tabs');
   assert.equal(await armory.locator('.fw-loadout-group:visible').count(),0,
    'Legacy category accordions never appear in mobile flow');
   assert.equal(await armory.locator('.campaign-kit-category:visible').count(),0,
    'No duplicate Weapon / Protection / Utilities navigation');
   const bounds=await armory.evaluate(el=>{
    const rect=node=>{
     const r=node.getBoundingClientRect();
     return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};
    };
    return {position:getComputedStyle(el).position,root:rect(el),
     viewport:{width:innerWidth,height:innerHeight},
     header:rect(el.querySelector('.campaign-armory-head')),
     stage:rect(el.querySelector('.campaign-kit-summary')),
     drawer:rect(el.querySelector('.campaign-kit-editor'))};
   });
   assert.equal(bounds.position,'fixed','No full page scroll');
   assert.ok(bounds.root.bottom<=height+2 &&
    bounds.stage.bottom<=bounds.drawer.y+4 &&
    bounds.header.bottom<=bounds.stage.y+5 &&
    bounds.drawer.bottom<=height+2,
    'Header, model and gallery do not overlap '+JSON.stringify(bounds));
   const icons=armory.locator('.campaign-kit-bench-zone:visible');
   assert.equal(await icons.count(),8,'Eight side icon targets always accessible');
   const slots=['primary','head','armor','rig','belt','backpack','medical','utility'];
   for(const slot of slots){
    await armory.locator('.campaign-kit-bench-zone[data-slot="'+slot+'"]').click();
    assert.equal(await gallery.getAttribute('data-slot'),slot,
     'Icon immediately opens its category '+slot);
    assert.ok(await gallery.locator('.fw-outfitter-option:visible').count()>=1,
     'Direct visible item options for '+slot);
    assert.equal(await armory.locator('.campaign-kit-workspace-tab:visible').count(),0);
    assert.equal(await armory.locator('.campaign-gear-picker-inline:visible').count(),0);
    assert.equal(await armory.locator('.campaign-gear-picker-backdrop:visible').count(),0,
     'No second picker/modal for '+slot);
   }
   await armory.locator('.campaign-kit-bench-zone[data-slot="head"]').click();
   const head=gallery.locator('.fw-outfitter-option[data-equipped="true"]');
   assert.equal(await head.count(),1,'Equipped item marked within the gallery');
   const alternative=gallery.locator('.fw-outfitter-option:not([disabled]):not([data-equipped="true"])');
   if(await alternative.count()){
    const target=await alternative.first().getAttribute('data-item-id');
    await alternative.first().click();
    await page.locator('.campaign-armory-screen').waitFor();
    assert.equal(await page.locator('.fw-outfitter-option[data-equipped="true"]').first()
     .getAttribute('data-item-id'),target,
     'One tap commits an eligible item through the existing handler');
   }
   await armory.locator('.campaign-kit-bench-zone[data-slot="utility"]').click();
   assert.ok(await gallery.locator('.fw-outfitter-quantity-row').count()>=2,
    'Consumables and inline quantities are part of Tools, no separate carry mode');
   const flash=gallery.locator('.fw-outfitter-quantity-row').filter({hasText:'Flashbang'});
   assert.ok(await flash.count(),'Flashbang quantity exists');
   assert.ok(await flash.locator('button').count()===2);
   const capacity=gallery.locator('.fw-outfitter-content-row');
   await armory.locator('.campaign-kit-bench-zone[data-slot="rig"]').click();
   assert.ok(await capacity.count()>=1,'Chest shows actual carried contents');
   await gallery.locator('.fw-outfitter-more').click();
   assert.ok(await armory.locator('.fw-outfitter-advanced').isVisible(),
    'Advanced tools remain reachable but out of primary flow');
   await armory.locator('.fw-outfitter-advanced-head button').click();
   assert.ok(await gallery.isVisible(),'Return from advanced without leaving outfitter');
   const preview=armory.locator('.campaign-kit-preview');
   assert.equal(await preview.evaluate(el=>getComputedStyle(el).position),'relative');
   assert.equal(await preview.locator('.campaign-kit-hotspot:visible').count(),0,
    'No persistent floating pips');
   assert.deepEqual(errors,[],'No runtime errors at '+width+'px');
   console.log('OUTFITTER R3 PHONE PASS',width,bounds);
   await page.close();
  }
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
