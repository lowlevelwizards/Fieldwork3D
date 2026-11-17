/** R4 release gate: actual phone and desktop menu/campaign journeys.
 * Protects viewport layout, tab ownership and canonical Studio handoff.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=4197, origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('R4 preview server unavailable');
 await mkdir('artifacts/ux-r4',{recursive:true});
 browser=await chromium.launch({headless:true});
 for(const width of [390,416,1280]){
  const context=await browser.newContext({
   viewport:{width,height:844},deviceScaleFactor:1,
   isMobile:width<600,hasTouch:width<600
  });
  const page=await context.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try{
   await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
   const landing=page.locator('.campaign-landing:not(.campaign-landing-subpage):visible');
   await landing.waitFor({timeout:30000});
   const more=page.locator('.campaign-landing-more:visible');
   if(!await more.isVisible())throw Error('MORE is not visible at '+width);
   await more.click();
   await page.locator('.campaign-landing-subpage:visible').waitFor();
   await page.locator('.campaign-landing-back:visible').click();
   await landing.waitFor();
   await assertWidth(page,width,'landing');
   await page.screenshot({path:'artifacts/ux-r4/landing-'+width+'.png',fullPage:true});

   await page.locator('.campaign-landing-primary:visible').click();
   const newCampaign=page.locator('.campaign-landing-subpage:visible');
   await newCampaign.waitFor();
   await newCampaign.locator('.campaign-landing-option')
    .filter({hasText:'CLASSIC CAMPAIGN'}).first().click();
   await page.locator('#campaign-tab-personnel').waitFor({timeout:30000});
   for(const tab of ['overview','personnel','contracts','logistics','chronicle']){
    await page.locator('#campaign-tab-'+tab).click();
    const active=page.locator('#campaign-panel-'+tab);
    if(!await active.isVisible())throw Error('Missing '+tab+' panel at '+width);
    const selected=await page.locator('#campaign-tab-'+tab).getAttribute('aria-selected');
    if(selected!=='true')throw Error('Incorrect selected tab '+tab+' at '+width);
    await assertWidth(page,width,tab);
   }
   await page.locator('#campaign-tab-personnel').click();
   await page.screenshot({path:'artifacts/ux-r4/personnel-'+width+'.png',fullPage:true});
   const person=page.locator('.campaign-person').first();
   await person.getByRole('button',{name:'LOADOUT'}).click();
   await page.locator('.campaign-kit-editor').waitFor({timeout:20000});
   await page.getByRole('button',{name:'APPEARANCE · OPEN STUDIO'}).click();
   await page.locator('#operatorStudioOverlay:visible').waitFor({timeout:15000});
   const frame=await page.locator('#operatorStudioOverlay iframe').getAttribute('src');
   if(!frame?.includes('embedded=1')||!frame?.includes('mode=campaign'))
    throw Error('Studio handoff is not canonical at '+width);
   if(errors.length)throw Error('Browser exceptions at '+width+': '+errors.join('; '));
   console.log('R4 verified '+width+'px menu, five campaign tabs, layout and Studio');
  }finally{await context.close();}
 }
}finally{
 if(browser)await browser.close();
 server.kill('SIGTERM');
}
async function assertWidth(page,width,where){
 const result=await page.evaluate(()=>{
  const shell=document.querySelector('.campaign-shell:not([hidden])');
  return shell?{actual:shell.scrollWidth,available:shell.clientWidth}:null;
 });
 if(!result)throw Error('No campaign shell at '+where+' / '+width);
 if(result.actual>result.available+14)
  throw Error('Horizontal overflow at '+where+' / '+width+
   ': '+result.actual+' > '+result.available);
}
