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
// C9: build reproducible acceptance data with the published domain transitions.
// These are synthetic test operation reports, never claims about a real player's
// campaign. Persist through the actual Dispatch save slot and reload normally.
async function seedCareerScenario(page){
 return page.evaluate(async()=>{
  const domain=await import('/src/campaign-state.ts');
  const key='fieldwork3d.dispatch-campaign.v1';
  const raw=localStorage.getItem(key);
  let campaign=domain.readCampaign(raw);
  if(!campaign||campaign.rules?.template!=='dispatch')
   throw Error('C9 requires a valid saved Dispatch campaign');
  for(let i=0;i<10;i++){
   const contract=campaign.contracts.find(k=>k.status==='available'&&k.deadline>=campaign.day);
   if(!contract)throw Error('No open case for simulated operation '+i);
   const accepted=domain.acceptContract(campaign,contract.id);
   campaign=domain.resolveOperation(accepted,{
    id:'c9-acceptance-'+i,contractId:contract.id,day:campaign.day,
    outcome:'success',grade:i%2?'A':'B',elapsed:90+i*7,
    participatingIds:[...campaign.squadIds],casualties:[],objective:true,events:[]
   });
   if(campaign.history.length!==i+1)
    throw Error('Domain did not settle simulated operation '+i);
  }
  for(let i=0;i<4;i++){
   const previous=campaign.operators.length;
   campaign=domain.hireRecruit(campaign);
   if(campaign.operators.length!==previous+1)
    throw Error('Could not populate reserves '+i);
  }
  campaign={
   ...campaign,
   supplies:{...campaign.supplies,ammo:0,medical:0,flash:0},
   operators:campaign.operators.map((operator,i)=>i===0?
    {...operator,recoveryDays:3,injuries:1}:operator)
  };
  if(!domain.readCampaign(JSON.stringify(campaign)))
   throw Error('Synthesized C9 campaign failed save validation');
  localStorage.setItem(key,JSON.stringify(campaign));
  localStorage.setItem('fieldwork3d.campaign-active-slot.v1','dispatch');
  return {day:campaign.day,total:campaign.history.length,
   operators:campaign.operators.length,open:campaign.contracts.filter(c=>
    c.status==='available'&&c.deadline>=campaign.day).length};
 });
}
async function acceptSavedScenario(page){
 return page.evaluate(async()=>{
  const domain=await import('/src/campaign-state.ts');
  const key='fieldwork3d.dispatch-campaign.v1';
  const campaign=domain.readCampaign(localStorage.getItem(key));
  if(!campaign)throw Error('Saved scenario unavailable');
  const contract=campaign.contracts.find(c=>c.status==='available'&&c.deadline>=campaign.day);
  if(!contract)throw Error('No open contract to accept');
  const next=domain.acceptContract(campaign,contract.id);
  if(next.activeContractId!==contract.id)throw Error('Domain contract acceptance failed');
  localStorage.setItem(key,JSON.stringify(next));
  return contract.id;
 });
}
// C9.2: exercise a saved, nonempty campaign after full-page reload.
async function assessEstablishedCareer(page,name,mobile){
 const expected=await seedCareerScenario(page);
 check(expected.total===10&&expected.operators===8,
  name+' fixture should contain ten resolved operations and eight operators');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Continue DISPATCH CAMPAIGN'}).click();
 await page.locator('#campaign-tab-overview').waitFor({timeout:30000});
 check((await page.locator('.campaign-day').textContent())?.includes(String(expected.day)),
  name+' saved campaign day did not survive reload');
 for(const tab of ['overview','personnel','contracts','logistics','chronicle']){
  await page.locator('#campaign-tab-'+tab).click();
  const dimensions=await page.locator('.campaign-screen').evaluate(el=>({
   width:el.clientWidth,scroll:el.scrollWidth
  }));
  check(dimensions.scroll<=dimensions.width+3,
   name+' established '+tab+' horizontal overflow');
  if(tab==='overview'){
   check(await page.locator('.campaign-readiness-warning').count()>=2,
    name+' depleted supplies or recovery warnings missing');
  }
  if(tab==='personnel'){
   check(await page.locator('.campaign-person-expand').count()===8,
    name+' full roster did not render');
   check(await page.locator('.campaign-person-expand').first()
    .locator(':scope > summary').isVisible(),name+' roster summary unreachable');
   check(await page.locator('.campaign-assignment select').count()===4,
    name+' tactical slot pickers missing');
  }
  if(tab==='contracts'){
   check(await page.locator('.campaign-contract-review').count()>0,
    name+' continuing campaign has no reviewable cases');
  }
  if(tab==='logistics'){
   const stock=await page.locator('.campaign-logistics-stat strong')
    .allTextContents();
   check(stock.length===3&&stock.every(count=>count.trim()==='0'),
    name+' exhausted reserves were not restored');
   check(await page.locator('.campaign-logistics-stat.is-low').count()===3,
    name+' empty stock alerts missing');
  }
  if(tab==='chronicle'){
   const recent=page.locator('.campaign-chronicle>.campaign-operation-board');
   check(await recent.locator('.campaign-operation-record').count()===8,
    name+' Records should show only eight recent operations');
   const earlier=page.locator('.campaign-operation-more');
   check(await earlier.count()===1,name+' missing older record disclosure');
   check(await earlier.locator('.campaign-operation-record').count()===0,
    name+' earlier records should be lazy before opening');
   await earlier.locator(':scope > summary').click();
   // Native details toggles dispatch asynchronously after the click. Await the
   // lazy-rendered cards rather than reading the DOM in the same event turn.
   await earlier.locator('.campaign-operation-record').nth(1)
    .waitFor({state:'attached',timeout:5000});
   check(await earlier.locator('.campaign-operation-record').count()===2,
    name+' earlier history failed to load remaining two records');
   const detail=recent.locator('.campaign-operation-detail').first();
   await detail.locator(':scope > summary').click();
   check(await detail.locator('.campaign-operation-participants').isVisible(),
    name+' saved operation participants inaccessible');
   await detail.locator(':scope > summary').click();
   const milestones=page.locator('.campaign-career-timeline');
   check(await milestones.count()===1,name+' recorded milestones missing');
   await milestones.locator(':scope > summary').click();
   check(await milestones.locator('.campaign-career-event').count()>0,
    name+' saved personnel milestones inaccessible');
  }
  if(mobile){
   const tabs=page.locator('.campaign-tab');
   const heights=await tabs.evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
   check(heights.every(h=>h>=44),name+' established tab target below 44px');
  }
 }
 await page.screenshot({path:out+'/'+name+'-established-records.png',animations:'disabled'});
 return expected;
}
// C9.3: a second reload must resume an accepted case without unlocking squad edits.
async function assessActiveDeployment(page,name,expected){
 const acceptedId=await acceptSavedScenario(page);
 await page.reload({waitUntil:'domcontentloaded'});
 check(await page.locator('.campaign-landing-status').getByText(
  'Deployment in progress').isVisible(),name+' active deployment notice missing');
 await page.getByRole('button',{name:'Continue DISPATCH CAMPAIGN'}).click();
 await page.locator('#campaign-tab-overview').waitFor({timeout:30000});
 check((await page.locator('.campaign-overview-primary-action').textContent())
  ?.includes('CONTINUE DEPLOYMENT'),name+' active mission resume action missing');
 await page.locator('#campaign-tab-personnel').click();
 const disabled=await page.locator('.campaign-assignment select')
  .evaluateAll(els=>els.length===4&&els.every(el=>el.disabled));
 check(disabled,name+' squad slots editable during an active deployment');
 await page.locator('#campaign-tab-chronicle').click();
 check(await page.locator('.campaign-chronicle>.campaign-operation-board .campaign-operation-record')
  .count()===expected.total,name+' accepting a contract altered past reports');
 check((await page.locator('.campaign-funds .campaign-day').textContent())
  ?.includes(String(expected.day)),name+' active deployment changed saved day');
 await page.screenshot({path:out+'/'+name+'-active-deployment.png',animations:'disabled'});
 console.log(name+' passed: 8-operator saved career, 10 reports, depleted reserves, active '+acceptedId);
}
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
    // A campaign context opened by the player must survive later purchases.
    const contextDisclosure=page.locator('.campaign-context');
    await contextDisclosure.locator(':scope > summary').click();
    check(await contextDisclosure.getAttribute('open')!==null,
     name+' campaign context did not expand');
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
    // Keep the case open so the logistics action can test persistent state.
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
    const purchase=page.locator('.campaign-supply-offer button:enabled').first();
    if(await purchase.count()){
     await purchase.click();
     check(await page.locator('.campaign-context').getAttribute('open')!==null,
      name+' campaign context collapsed after purchase');
     check(await page.locator('.campaign-contract-intelligence').first().getAttribute('open')!==null,
      name+' case information collapsed after purchase');
     check(await page.locator('.campaign-procurement-eligibility').first().getAttribute('open')!==null,
      name+' armory requirements collapsed after purchase');
    }
    await page.locator('.campaign-procurement-eligibility').first()
     .locator(':scope > summary').click();
   }
   if(tab==='chronicle'){
    const history=page.locator('.campaign-operation-record').first();
    if(await history.count()){
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
    }else{
     check(await page.locator('.campaign-chronicle').getByText(
      'Your unit history will appear here after its first operation.').isVisible(),
      name+' empty campaign history state missing');
    }
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
  const established=await assessEstablishedCareer(page,name,mobile);
  await assessActiveDeployment(page,name,established);
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
