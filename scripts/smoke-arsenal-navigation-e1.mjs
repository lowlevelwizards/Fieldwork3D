/** E1.O real Chromium Workbench navigation lifetime + focus regression.
 * Exercises the actual Arsenal UI and renderSelection, not a DOM mock.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4271,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/arsenal.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,160));
 }
 if(!ready)throw Error('E1 Arsenal server unavailable');
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({
  viewport:{width:430,height:930},deviceScaleFactor:1,
  isMobile:true,hasTouch:true
 });
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/arsenal.html',{waitUntil:'domcontentloaded'});
 await page.locator('.arsenal-search').fill('FNC');
 await page.getByRole('button',{name:'Select FN FNC'}).click();
 await page.locator('.arsenal-hero-open').click();
 await page.locator('.arsenal-wb-category').first().waitFor({state:'visible'});
 const initial=await page.locator('.arsenal-wb-category').count();
 if(initial!==7)throw Error('Workbench category count changed: '+initial);
 const front=page.locator('.arsenal-wb-category').filter({hasText:'Front End'});
 await front.click();
 const slots=page.locator('.arsenal-wb-subslot');
 if(await slots.count()!==2)throw Error('Front End must have two subslots');
 await page.evaluate(()=>{
  const cats=[...document.querySelectorAll('.arsenal-wb-category')];
  window.__e1CategoryRefs=cats;
  window.__e1SlotRefs=[...document.querySelectorAll('.arsenal-wb-subslot')];
 });
 // Changing an existing subslot must keep its actual DOM node (and focus).
 await slots.nth(1).click();
 const subslot=await page.evaluate(()=>
  document.activeElement===window.__e1SlotRefs[1]&&
  [...document.querySelectorAll('.arsenal-wb-subslot')]
   .every((el,i)=>el===window.__e1SlotRefs[i])&&
  window.__e1SlotRefs[1].getAttribute('aria-pressed')==='true');
 if(!subslot)throw Error('Subslot selection rebuilt DOM or lost keyboard focus');
 // Toggling incompatible parts calls renderSelection but does not change
 // the category/slot set; the controls must survive it.
 await page.locator('.arsenal-wb-show-all').click();
 const afterToggle=await page.evaluate(()=>
  document.activeElement?.classList.contains('arsenal-wb-show-all')&&
  [...document.querySelectorAll('.arsenal-wb-category')]
   .every((el,i)=>el===window.__e1CategoryRefs[i])&&
  [...document.querySelectorAll('.arsenal-wb-subslot')]
   .every((el,i)=>el===window.__e1SlotRefs[i]));
 if(!afterToggle)throw Error('Workbench refresh unnecessarily remounted navigation');
 await page.locator('.arsenal-wb-category').filter({hasText:'Furniture'}).click();
 const acrossCategories=await page.evaluate(()=>
  [...document.querySelectorAll('.arsenal-wb-category')]
   .every((el,i)=>el===window.__e1CategoryRefs[i])&&
  document.querySelectorAll('.arsenal-wb-subslot').length===2&&
  document.querySelector('.arsenal-wb-category[aria-pressed="true"]')
   ?.textContent==='Furniture');
 if(!acrossCategories)throw Error('Category switch lost navigation or selected state');
 if(errors.length)throw Error('Workbench errors: '+errors.join(' | '));
 console.log('E1 Arsenal mobile persistent navigation and focus passed');
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
