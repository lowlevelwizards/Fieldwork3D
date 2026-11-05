/** UX R3 iPhone smoke: Campaign preparation owns functional kit;
 * canonical Studio owns looks. No arbitrary map generation or gameplay timing.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4194,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('Fieldwork preview server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'NEW CAMPAIGN'}).waitFor({timeout:30000});
  await page.getByRole('button',{name:'NEW CAMPAIGN'}).click();
  await page.locator('#campaign-tab-personnel').waitFor({timeout:15000});
  await page.locator('#campaign-tab-personnel').click();
  const person=page.locator('.campaign-person').first();
  await person.getByRole('button',{name:'LOADOUT'}).click();
  const armory=page.locator('.campaign-kit-editor');
  await armory.waitFor({timeout:15000});
  const groups=armory.locator(':scope > .fw-loadout-group');
  if(await groups.count()!==5)throw Error('Campaign kit must have five clear groups');
  if(await page.locator('.campaign-wardrobe').count())
   throw Error('Legacy duplicate campaign wardrobe remains present');
  if(await page.locator('.campaign-readiness-details').count()!==1)
   throw Error('Readiness technical data is not available on request');
  if(await page.locator('.campaign-kit-presets').count()!==1)
   throw Error('Saved campaign kit presets were lost');
  const protection=armory.locator('[data-loadout-group="protection"]');
  await protection.locator(':scope > summary').click();
  if(!await protection.getByLabel(/Select armor for/i).isVisible())
   throw Error('Armor equipment selector is not reachable');
  const carry=armory.locator('[data-loadout-group="carry"]');
  await carry.locator(':scope > summary').click();
  if(!await carry.getByLabel(/Select rig for/i).isVisible())
   throw Error('Carry equipment selector is not reachable');
  await page.getByRole('button',{name:'APPEARANCE · OPEN STUDIO'}).click();
  await page.locator('#operatorStudioOverlay:visible').waitFor({timeout:15000});
  const frame=await page.locator('#operatorStudioOverlay iframe').getAttribute('src');
  if(!frame?.includes('mode=campaign')||!frame.includes('embedded=1'))
   throw Error('Campaign did not open canonical Studio');
  if(errors.length)throw Error('Campaign UI runtime errors: '+errors.join('; '));
  console.log('UX R3 Campaign phone smoke passed: roster → kit → Studio');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
