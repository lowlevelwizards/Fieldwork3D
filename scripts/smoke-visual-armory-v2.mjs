/** VA2 release gate: genuine category-aware 3D thumbnails and zero
 * intersecting gear cards at iPhone widths, using live Campaign UI. */
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4291,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ok=false;
 for(let i=0;i<140;i++){
  try{if((await fetch(origin+'/index.html')).ok){ok=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,120));
 }
 assert.ok(ok,'Armory preview server responds');
 const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 try{
  await mkdir('visual-armory-v2-captures',{recursive:true});
  for(const width of [320,390]){
   const page=await browser.newPage({viewport:{width,height:844},
    deviceScaleFactor:1,isMobile:true,hasTouch:true});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
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
   assert.ok(await armory.locator('.campaign-kit-preview canvas').count());
   const openGroup=async group=>{
    await armory.getByRole('button',{name:'EQUIPMENT',exact:true}).click();
    await armory.getByRole('tab',{name:group}).click();
   };
   const inspectSheet=async (item,expectedKind)=>{
    await armory.locator('.campaign-kit-visual-trigger')
     .filter({hasText:item}).first().click();
    const sheet=page.locator('.campaign-gear-picker-panel');
    await sheet.waitFor({timeout:10000});
    const available=sheet.locator('.campaign-gear-picker-list').first();
    assert.equal(await available.getAttribute('data-layout'),expectedKind);
    return sheet;
   };
   await openGroup('WEAPON');
   let sheet=await inspectSheet('Service Carbine','gallery');
   const selectedWeapon=sheet.locator('.campaign-gear-picker-option[aria-current="true"]');
   await selectedWeapon.locator('.campaign-gear-picker-model[data-model="real"] img')
    .waitFor({timeout:18000});
   const dimensions=await selectedWeapon.locator('img').evaluate(img=>({
    width:img.naturalWidth,height:img.naturalHeight
   }));
   assert.ok(dimensions.width/dimensions.height>1.7,
    'Weapon thumbnail uses landscape side profile');
   await sheet.screenshot({path:'visual-armory-v2-captures/weapon-'+width+'.png'});
   await sheet.getByRole('button',{name:'CLOSE'}).click();
   await openGroup('PROTECTION');
   sheet=await inspectSheet('Soft Armor Vest','gallery');
   const armor=sheet.locator('.campaign-gear-picker-option[aria-current="true"]');
   await armor.locator('.campaign-gear-picker-model[data-model="real"] img')
    .waitFor({timeout:18000});
   assert.equal(await armor.locator('.campaign-gear-picker-model').getAttribute('data-model'),'real',
    'Actual wardrobe armor mesh is found instead of empty generic shell');
   await sheet.screenshot({path:'visual-armory-v2-captures/armor-'+width+'.png'});
   await sheet.getByRole('button',{name:'CLOSE'}).click();
   await openGroup('UTILITIES');
   sheet=await inspectSheet('Team Radio','rows');
   const details=sheet.locator('.campaign-gear-picker-unissued');
   await details.evaluate(e=>e.open=true);
   await sheet.locator('.campaign-gear-picker-option').last().scrollIntoViewIfNeeded();
   const overlaps=await sheet.evaluate(panel=>{
    const rows=[...panel.querySelectorAll('.campaign-gear-picker-option')];
    const intersects=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&
     a.top<b.bottom-1&&a.bottom>b.top+1;
    const groups=[...panel.querySelectorAll('.campaign-gear-picker-list')];
    const errors=[];
    for(const group of groups){
     const cards=[...group.querySelectorAll('.campaign-gear-picker-option')];
     for(let i=1;i<cards.length;i++){
      const previous=cards[i-1].getBoundingClientRect();
      const current=cards[i].getBoundingClientRect();
      if(intersects(previous,current))errors.push('row overlap '+i);
     }
     for(const card of cards){
      const box=card.getBoundingClientRect();
      const content=card.querySelector('.campaign-gear-picker-copy')?.getBoundingClientRect();
      if(content&&content.bottom>box.bottom+2)errors.push('overflow '+card.dataset.optionId);
     }
    }
    return errors;
   });
   assert.deepEqual(overlaps,[],'Utility cards must not overlap or clip at '+width+'px');
   await sheet.screenshot({path:'visual-armory-v2-captures/utility-'+width+'.png'});
   await sheet.getByRole('button',{name:'CLOSE'}).click();
   assert.deepEqual(errors,[],'No browser errors at '+width+'px');
   console.log('VA2 genuine 3D side/armor, no overlap PASS',width,dimensions);
   await page.close();
  }
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
