/** Operations R21 browser smoke: layout, overflow, keyboard navigation and screenshots. */
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4195, origin='http://127.0.0.1:'+port;
const out=process.env.OPERATIONS_ACCEPTANCE_DIR??'artifacts/operations-room';
mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
const check=(condition,message)=>{if(!condition)throw Error(message);};
async function assess(browser,{name,width,height,mobile}){
 const context=await browser.newContext({
  viewport:{width,height},deviceScaleFactor:mobile?2:1,
  isMobile:mobile,hasTouch:mobile
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 try{
  await page.goto(origin+'/index.html',{waitUntil:'domcontentloaded'});
  await page.locator('.campaign-landing:not(.campaign-landing-subpage)').waitFor({timeout:30000});
  const hero=await page.locator('.campaign-landing-hero').boundingBox();
  const actions=await page.locator('.campaign-landing-actions').boundingBox();
  check(hero&&actions,name+' main-menu components are missing');
  check(mobile?hero.y+hero.height<=actions.y+8:
   hero.x+hero.width<=actions.x+8,name+' main-menu panels overlap');
  await page.screenshot({path:out+'/'+name+'-menu.png',animations:'disabled'});
  // Main menu's accessible primary name is deliberately 'Create a new campaign';
  // the visible NEW CAMPAIGN heading is not the button's accessible name.
  await page.locator('.campaign-landing-primary').click();
  await page.getByRole('button',{name:/^DISPATCH —/}).click();
  await page.getByRole('button',{name:'CREATE DISPATCH',exact:true}).click();
  await page.locator('#campaign-tab-overview').waitFor({timeout:30000});
  for(const tab of ['overview','personnel','contracts','logistics','chronicle']){
   const trigger=page.locator('#campaign-tab-'+tab);
   await trigger.click();
   check(await trigger.getAttribute('aria-selected')==='true',name+' '+tab+' selection failed');
   const d=await page.locator('.campaign-screen').evaluate(el=>({
    scroll:el.scrollWidth,width:el.clientWidth,
    panel:el.querySelector('.campaign-grid>.campaign-section:not([hidden])')
     ?.getBoundingClientRect().width
   }));
   check(d.scroll<=d.width+3,name+' '+tab+' horizontal overflow '+d.scroll+'/'+d.width);
   check((d.panel??0)>0,name+' '+tab+' panel hidden or zero width');
   if(mobile){
    const rect=await trigger.boundingBox();
    check(rect&&rect.height>=44,name+' '+tab+' tap target too short');
   }
   const pair=tab==='overview'?['.campaign-overview-priority','.campaign-overview-support']:
    tab==='personnel'?['.campaign-assignment','.campaign-personnel-roster-panel']:
    tab==='logistics'?['.campaign-logistics-supply-panel','.campaign-logistics-workspace>.campaign-armory']:null;
   if(pair){
    const a=await page.locator(pair[0]).boundingBox();
    const b=await page.locator(pair[1]).boundingBox();
    check(a&&b,name+' '+tab+' workspace missing');
    check(mobile?b.y>=a.y+a.height-8:b.x>=a.x+a.width-8,
     name+' '+tab+' layout is not '+(mobile?'stacked':'two-column'));
   }
   // C1–C4 progressive-disclosure regressions: information stays accessible
   // without forcing every roster and case detail into the initial scroll.
   if(tab==='overview'){
    check(await page.locator('.campaign-context:not([open])').count()===1,
     name+' campaign settings must start collapsed');
    check(await page.locator('.campaign-funds .campaign-day').count()===1,
     name+' current day must remain visible');
   }
   if(tab==='personnel'){
    const row=page.locator('.campaign-person-expand').first();
    check(await row.count()===1,name+' missing operator disclosures');
    check(await row.getAttribute('open')===null,name+' operator starts expanded');
    await row.locator(':scope > summary').click();
    check(await row.getAttribute('open')!==null,name+' operator did not expand');
    check(await row.locator('.campaign-person-actions button').first().isVisible(),
     name+' operator loadout action inaccessible');
    await row.locator(':scope > summary').click();
   }
   if(tab==='contracts'){
    const caseInfo=page.locator('.campaign-contract-intelligence').first();
    check(await caseInfo.count()===1,name+' no case intelligence disclosure');
    check(await caseInfo.getAttribute('open')===null,name+' case starts expanded');
    await caseInfo.locator('summary').click();
    check(await caseInfo.getAttribute('open')!==null,name+' case intelligence did not expand');
    await caseInfo.locator('summary').click();
   }
   if(tab==='logistics'){
    check(await page.locator('.campaign-logistics-stat').count()===3,
     name+' logistics stock ledger missing');
    check(await page.locator('.campaign-supply-offer button').count()===3,
     name+' replenishment actions missing');
    const procurement=page.locator('.campaign-procurement-item').first();
    check(await procurement.count()===1,name+' procurement item missing');
    check(await procurement.locator('button').count()===1,
     name+' purchase action missing');
    const requirements=procurement.locator('.campaign-procurement-eligibility');
    check(await requirements.count()===1,name+' requirements disclosure missing');
    check(await requirements.getAttribute('open')===null,
     name+' requirements should start collapsed');
    await requirements.locator(':scope > summary').click();
    check(await requirements.getAttribute('open')!==null,
     name+' requirements did not expand');
    check(await requirements.locator('.campaign-procurement-status').isVisible(),
     name+' purchase authorization explanation inaccessible');
    await requirements.locator(':scope > summary').click();
   }
   if(tab==='chronicle'){
    const history=page.locator('.campaign-operation-record').first();
    check(await history.count()===1,name+' missing operation history');
    check(await history.locator('.campaign-operation-outcome').isVisible(),
     name+' operation outcome invisible');
    const record=history.locator('.campaign-operation-detail');
    check(await record.count()===1,name+' operation disclosure missing');
    check(await record.getAttribute('open')===null,
     name+' operation details should start collapsed');
    await record.locator(':scope > summary').click();
    check(await record.getAttribute('open')!==null,
     name+' operation details failed to expand');
    check(await record.locator('.campaign-operation-participants').isVisible(),
     name+' participating operators missing');
    await record.locator(':scope > summary').click();
    const milestones=page.locator('.campaign-career-timeline');
    if(await milestones.count()){
     check(await milestones.getAttribute('open')===null,
      name+' milestones should start collapsed');
     await milestones.locator(':scope > summary').click();
     check(await milestones.locator('.campaign-career-event').count()>0,
      name+' milestone history inaccessible');
     await milestones.locator(':scope > summary').click();
    }
   }
   await page.screenshot({path:out+'/'+name+'-'+tab+'.png',animations:'disabled'});
  }
  const last=page.locator('#campaign-tab-chronicle');
  await last.focus();
  await last.press('Home');
  const first=page.locator('#campaign-tab-overview');
  check(await first.getAttribute('aria-selected')==='true',name+' Home navigation failed');
  check(await first.evaluate(el=>el===document.activeElement),name+' Home focus failed');
  await first.press('End');
  check(await last.getAttribute('aria-selected')==='true',name+' End navigation failed');
  await last.press('ArrowRight');
  check(await first.getAttribute('aria-selected')==='true',name+' Arrow wrap failed');
  check(!errors.length,name+' runtime errors: '+errors.join('; '));
  console.log(name+' passed: main menu, five Operations panels, responsive layout, navigation');
 }finally{await context.close();}
}
try{
 let ready=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 check(ready,'Vite server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  await assess(browser,{name:'desktop',width:1440,height:900,mobile:false});
  await assess(browser,{name:'phone',width:390,height:844,mobile:true});
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
