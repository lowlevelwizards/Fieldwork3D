/** R4 phone acceptance: 1 contextual gallery, 8 direct category rails,
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
   const before=await gallery.locator('.fw-outfitter-option').evaluateAll(
    nodes=>nodes.filter(n=>n.dataset.available==='true').map(n=>n.dataset.itemId));
   const alternative=gallery.locator('.fw-outfitter-option[data-available="true"]:not([data-equipped="true"])');
   if(await alternative.count()){
    const target=await alternative.first().getAttribute('data-item-id');
    await alternative.first().click();
    await page.locator('.campaign-armory-screen').waitFor();
    assert.equal(await page.locator('.fw-outfitter-option[data-equipped="true"]').first()
     .getAttribute('data-item-id'),target,
     'One tap commits an eligible item through the existing handler');
    assert.deepEqual(await page.locator('.fw-outfitter-option').evaluateAll(
     nodes=>nodes.map(n=>n.dataset.itemId)),before,
     'Equipping never reorders the horizontal palette');
   }
   await armory.locator('.campaign-kit-bench-zone[data-slot="utility"]').click();
   const rail=gallery.locator('.fw-outfitter-options');
   const layout=await gallery.evaluate(el=>{
    const scroller=el.querySelector('.fw-outfitter-gallery-scroll');
    const rail=el.querySelector('.fw-outfitter-options');
    const context=el.querySelector('.fw-outfitter-context');
    return {flow:getComputedStyle(rail).display,
     horizontal:scroller.scrollWidth>=scroller.clientWidth,
     vertical:scroller.scrollHeight-scroller.clientHeight,
     contextHeight:context.getBoundingClientRect().height,
     galleryHeight:el.getBoundingClientRect().height};
   });
   assert.equal(layout.flow,'flex','One horizontal row of catalog choices');
   assert.ok(layout.vertical<=3,'No vertical scrolling inside equipment row '+JSON.stringify(layout));
   assert.ok(layout.contextHeight>=45,'A fixed detail area remains visible');
   assert.equal(await gallery.locator('.fw-outfitter-unavailable').count(),0,
    'Unavailable items stay in the same row');
   assert.equal(await rail.locator('.fw-outfitter-option[data-kind="field"]').count(),0,
    'Physical consumables no longer masquerade as gear choices');
   assert.equal(await rail.locator('.fw-outfitter-option[data-kind="magazine"]').count(),0,
    'Magazine instances no longer appear in equipment option galleries');
   const carryAction=gallery.getByRole('button',{name:'ARRANGE MAGAZINES & TOOLS'});
   await carryAction.click();
   assert.ok(await armory.locator('.fw-outfitter-carry-panel').isVisible(),
    'Physical supplies use their original dedicated inventory editor');
   await armory.locator('.fw-outfitter-carry-back').click();
   assert.ok(await gallery.isVisible(),'Return directly to the same equipment row');
   await armory.locator('.campaign-kit-bench-zone[data-slot="primary"]').click();
   const restricted=gallery.locator('.fw-outfitter-option[data-available="false"]');
   assert.ok(await restricted.count()>0,'Restricted choices remain visible at the end');
   assert.equal(await restricted.evaluateAll(nodes=>nodes.every(n=>n.disabled)),true,
    'Disabled options cannot be selected or inspected');
   assert.equal(await gallery.locator('details').count(),0,
    'No unavailable drawer or second list');
   await armory.locator('.campaign-kit-bench-zone[data-slot="rig"]').click();
   assert.ok(await gallery.locator('.fw-outfitter-option:visible').count()>=1,
    'Chest equipment retains direct selection');
   await armory.locator('.campaign-outfitter-library-button').click();
   assert.ok(await armory.locator('.fw-outfitter-advanced:not(.fw-outfitter-carry-panel)').isVisible(),
    'Kit library accessible from header, not gallery More button');
   assert.equal(await gallery.locator('.fw-outfitter-more').count(),0,
    'No More link at the bottom of the equipment panel');
   await armory.locator('.fw-outfitter-advanced-head button').click();
   assert.ok(await gallery.isVisible(),'Return from kit library to same selection');
   const operator=armory.locator('.campaign-outfitter-operator-select');
   await operator.click();
   assert.ok(await page.locator('.fw-select-menu [role="option"]').count()>=2,
    'Custom operator roster picker replaces native dropdown');
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('.fw-select-menu').count(),0);
   assert.equal(await armory.locator('.campaign-armory-head select:visible').count(),0,
    'No iOS native operator picker');
   const preview=armory.locator('.campaign-kit-preview');
   assert.equal(await preview.evaluate(el=>getComputedStyle(el).position),'relative');
   assert.equal(await preview.locator('.campaign-kit-hotspot:visible').count(),0,
    'No persistent floating pips');
   const weaponToggle=preview.locator('.campaign-kit-preview-pose-toggle');
   assert.ok(await weaponToggle.isVisible(),'Explicit preview weapon toggle');
   await weaponToggle.click();
   assert.ok((await weaponToggle.textContent()).includes('SHOW'),
    'Hide returns to a neutral display stance');
   await weaponToggle.click();
   assert.ok((await weaponToggle.textContent()).includes('HIDE'),
    'Show restores low-ready weapon presentation');
   assert.ok(await preview.locator('.campaign-kit-selected-dot').count()===1,
    'Exactly one physical selection marker, never one per category');
   assert.deepEqual(errors,[],'No runtime errors at '+width+'px');
   console.log('OUTFITTER R4 PHONE PASS',width,bounds);
   if(width===390){
    // Regression for the *real* in-game Quick Play Squad > LOADOUT button.
    // The earlier R5 smoke only visited campaign and mission setup.
    await page.goto(origin+'/index.html?fixedSite=1',{waitUntil:'domcontentloaded'});
    await page.locator('#operationsBoardToggle:visible').waitFor({timeout:30000});
    await page.locator('#operationsBoardToggle').click();
    const board=page.locator('#operationsBoard');
    const operator=board.locator('.fw-squad-card').first();
    await operator.locator('.fw-squad-actions button').filter({hasText:'LOADOUT'}).click();
    const quickGallery=board.locator('.fw-quick-board-gallery .fw-outfitter-gallery');
    assert.ok(await quickGallery.isVisible(),
     'Actual in-game Squad Loadout opens the shared R5 gallery');
    assert.equal(await board.locator('.fw-loadout-group:visible').count(),0,
     'Old grouped equipment interface is not the visible loadout screen');
    // WebGL creation is intentionally deferred until the drawer is attached.
    // Wait for the first rendered frame instead of racing requestAnimationFrame.
    await board.locator('.fw-quick-board-model-stage canvas').waitFor({timeout:15000});
    assert.equal(await board.locator('.fw-quick-board-model-stage canvas').count(),1,
     'Operator still has one 3D preview renderer');
    await board.locator('.fw-quick-board-zone[data-slot="armor"]').click();
    assert.equal(await quickGallery.getAttribute('data-slot'),'armor');
    const alternative=quickGallery.locator(
     '.fw-outfitter-option[data-available="true"]:not([data-equipped="true"])').first();
    if(await alternative.count()){
     const item=await alternative.getAttribute('data-item-id');
     await alternative.click();
     assert.equal(await board.locator('.fw-quick-board-gallery .fw-outfitter-option[data-equipped="true"]')
      .first().getAttribute('data-item-id'),item,
      'Shared gallery commits gear through the actual Quick Play roster');
    }
    await board.locator('.fw-quick-board-zone[data-slot="rig"]').click();
    await board.getByRole('button',{name:'ARRANGE MAGAZINES & TOOLS'}).click();
    assert.ok(await board.locator('.fw-quick-board-carry:visible .fw-field-inventory').count()>0,
     'Real physical magazine and gadget editor opens separately');
    await board.locator('.fw-quick-board-return').click();
    assert.ok(await quickGallery.isVisible(),'Returning from carry restores the gallery');
    const restricted=quickGallery.locator('.fw-outfitter-option[data-available="false"]');
    if(await restricted.count())
     assert.ok(await restricted.evaluateAll(nodes=>nodes.every(x=>x.disabled)),
      'Unavailable items are not clickable');
    await board.locator('.fw-prep-squad-tab').nth(1).click();
    assert.ok(await board.locator('.fw-quick-board-gallery .fw-outfitter-gallery').isVisible(),
     'Switching operators retains shared loadout presentation');
    await board.locator('.fw-quick-board-model-stage canvas').waitFor({timeout:15000});
    assert.equal(await board.locator('.fw-quick-board-model-stage canvas').count(),1,
     'Operator switch reuses the single preview canvas');
    assert.deepEqual(errors,[],'Quick Play Loadout has no runtime errors');
    console.log('QUICK PLAY SQUAD R5 REAL ENTRY PASS');
   }
   await page.close();
  }
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
