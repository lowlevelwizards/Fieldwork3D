/** UX-R1: actual phone browser checks for Field Armory layout and authority.
 * One rendered operator; no kit mutations, purchases or stock changes.
 */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const port=4282,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,120));
 }
 assert.ok(ready,'Preview server must be available');
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390]){
   const page=await browser.newPage({viewport:{width,height:844},
    deviceScaleFactor:2,isMobile:true,hasTouch:true});
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
   await armory.waitFor({state:'visible'});
   const nav=armory.locator('.campaign-kit-workspace-nav');
   assert.equal(await nav.locator('button').count(),3);
   assert.equal(await armory.getAttribute('data-kit-workspace'),'equipment');
   await nav.getByRole('button',{name:'PHYSICAL CARRY'}).click();
   assert.equal(await armory.getAttribute('data-kit-workspace'),'physical');
   const board=armory.locator('.fw-field-inventory');
   assert.ok(await board.isVisible(),'Carrying inventory visible in physical workspace');
   assert.ok(await board.locator('.fw-field-inventory-item').filter({hasText:'Flex cuffs'}).count(),
    'Operational cuffs have an actual quantity control');
   assert.equal(await board.locator('.fw-field-inventory-future').evaluate(e=>e.open),false,
    'Unavailable equipment is initially hidden');
   assert.equal(await board.locator('.fw-field-inventory-copy-area').evaluate(e=>e.open),false,
    'Copy layout actions are contextual');
   const geometry=await board.evaluate(root=>{
    const slots=[...root.querySelectorAll('.fw-field-inventory-slot')];
    const bounds=root.getBoundingClientRect();
    const tiles=[...root.querySelectorAll('.fw-field-inventory-item-name')];
    return {width:bounds.width,
      columns:getComputedStyle(root.querySelector('.fw-field-inventory-capacity')).gridTemplateColumns,
      overflowing:slots.some(el=>el.scrollWidth>el.clientWidth+2),
      narrow:tiles.some(el=>el.clientWidth<65),
      names:tiles.map(el=>el.textContent)};
   });
   assert.ok(!geometry.overflowing,'Carrier sections must not overflow');
   assert.ok(!geometry.narrow,'Equipment names must not collapse into vertical characters');
   assert.ok(geometry.columns.trim().split(/\s+/).length===1,
    'Mobile carrier layout must occupy one full-width column');
   const dock=armory.getByRole('button',{name:'KEEP MODEL VISIBLE'});
   await dock.click();
   assert.equal(await armory.getAttribute('data-preview-docked'),'true');
   const position=await armory.locator('.campaign-kit-preview').evaluate(el=>
    getComputedStyle(el).position);
   assert.equal(position,'fixed','Pinned preview reuses the actual WebGL host');
   await armory.getByRole('button',{name:'CLOSE FLOATING MODEL'}).click();
   assert.equal(await armory.getAttribute('data-preview-docked'),'false');
   await nav.getByRole('button',{name:'READINESS'}).click();
   assert.equal(await armory.getAttribute('data-kit-workspace'),'readiness');
   assert.ok(await armory.locator('.campaign-kit-readiness-panel').isVisible());
   assert.ok(!await armory.locator('.campaign-kit-editor').isVisible());
   await nav.getByRole('button',{name:'EQUIPMENT',exact:true}).click();
   assert.equal(await armory.getAttribute('data-kit-workspace'),'equipment');
   assert.ok(await armory.locator('.campaign-kit-editor').isVisible());
   assert.ok(errors.length===0,'No page runtime errors: '+errors.join('; '));
   await page.close();
   console.log('UX-R1 Field Armory PASS '+width+'px',geometry.names.join(', '));
  }
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
