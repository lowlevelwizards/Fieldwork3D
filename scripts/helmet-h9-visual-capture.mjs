/** H9 staged helmet art WebGL review: actual switches, physical parts, save/refresh
 * persistence, PASGT historical limits and game-scale visual legibility.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4207,url='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let started=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(url+'/operator-studio.html')).ok){started=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,160));
 }
 if(!started)throw Error('H9 Studio unavailable');
 await mkdir('helmet-h9-captures',{recursive:true});
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:430,height:920},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('studioCanvas')?.dataset.ready==='true'&&
   Number(document.getElementById('studioCanvas')?.dataset.drawCalls)>0,
   null,{timeout:30000});
  await page.getByRole('button',{name:'Customize head'}).click();
  const stage=page.locator('.studio-stage');
  const itemTab=page.locator('#studioWorkflow [data-studio-step="items"]');
  const detailTab=page.locator('#studioWorkflow [data-studio-step="details"]');
  const matTab=page.locator('#studioWorkflow [data-studio-step="materials"]');
  const capture=async(label,view)=>{
   await page.locator('[data-studio-view="'+view+'"]').click();
   await page.waitForTimeout(240);
   if(!Number(await page.locator('#studioCanvas').evaluate(x=>x.dataset.drawCalls)))
    throw Error('No live WebGL draw calls for '+label);
   await stage.screenshot({path:'helmet-h9-captures/'+label+'.png'});
  };
  const toggle=async(label)=>{
   const b=page.getByRole('button',{name:label,exact:true});
   // Per-operator field choices intentionally persist between shell families.
   // If the previous shell enabled this option, don't toggle it back off.
   if(await b.getAttribute('aria-pressed')!=='true')await b.click();
   if(await b.getAttribute('aria-pressed')!=='true')throw Error('No active toggle '+label);
   if(await detailTab.getAttribute('aria-pressed')!=='true')
    throw Error('Helmet toggle lost DETAILS step '+label);
  };
  for(const id of ['ach','mich-2001','mich-2002','pasgt']){
   await page.getByRole('button',{name:'Customize head'}).click();
   await itemTab.click();
   const item=page.locator('[data-appearance-item="'+id+'"]');
   await item.scrollIntoViewIfNeeded();await item.click();
   await matTab.click();
   const cover=page.locator('.material-group')
    .filter({hasText:id==='pasgt'?'One fitted cover. NO COVER exposes painted composite':
     'One fitted fabric cover or an exposed painted shell.'}).locator('select');
   await cover.waitFor();await cover.selectOption('fitted');
   await detailTab.click();
   // H9: isolate each helmet family. H7 carried forward every previous
   // selection, making apparently bare MICH pictures full of ACH hardware.
   const setToggleState=async(label,enabled)=>{
    const button=page.getByRole('button',{name:label,exact:true});
    if(!await button.count())return;
    if((await button.getAttribute('aria-pressed'))!==String(enabled))
     await button.click();
   };
   const concealReset=page.locator('.material-group')
    .filter({hasText:'One option at a time.'}).locator('select');
   await concealReset.selectOption('none');
   const goggleReset=page.locator('.material-group')
    .filter({hasText:'On eyes, strapped over the helmet brow'}).locator('select');
   await goggleReset.selectOption('none');
   for(const name of ['ELASTIC BAND','NVG SHROUD','SIDE RAILS',
    'BUNGEES','VELCRO PANELS','IR STROBE','COUNTERWEIGHT',
    'BATTERY PACK','HELMET LIGHT','CAMERA','CHEMLIGHT',
    'PATCH / IDENTIFIER','FABRIC SLEEVE'])
    await setToggleState(name,false);
   await setToggleState('FASTENED',true);
   await capture(id+'-covered-clean-front','front');
   await capture(id+'-covered-clean-side','side');
   await capture(id+'-covered-clean-back','back');
   if(id!=='pasgt'){
    await toggle('VELCRO PANELS');
    await capture(id+'-velcro-isolated-side','side');
    await capture(id+'-velcro-isolated-back','back');
    await setToggleState('VELCRO PANELS',false);
    await toggle('PATCH / IDENTIFIER');
    await capture(id+'-patch-isolated-side','side');
    await setToggleState('PATCH / IDENTIFIER',false);
   }
   await matTab.click();
   await cover.selectOption('none');
   await capture(id+'-bare-shell-front','front');
   await capture(id+'-bare-shell-side','side');
   await cover.selectOption('fitted');
   await detailTab.click();
    const bandToggle=page.getByRole('button',{name:'ELASTIC BAND',exact:true});
    if(await bandToggle.getAttribute('aria-pressed')==='true')await bandToggle.click();
    await capture(id+'-cover-only-front','front');
    await toggle('ELASTIC BAND');
    const bandColor=page.locator('.material-group')
     .filter({hasText:'Auto uses period-appropriate webbing;'}).locator('select');
    await bandColor.selectOption('black');
    await capture(id+'-band-black-side','side');
    await capture(id+'-band-black-front','front');
    await capture(id+'-band-black-back','back');
    const bandBlack=await stage.screenshot();
    await bandColor.selectOption('tan');
    await capture(id+'-band-tan-side','side');
    const bandTan=await stage.screenshot();
    if(bandBlack.equals(bandTan)){
     const diag=await page.locator('#studioCanvas').evaluate(c=>({
      selected:c.dataset.helmetBandHex,visible:c.dataset.helmetBandVisible,
      meshes:c.dataset.helmetBandMeshCount,
      webbing:c.dataset.helmetWebbingHex,drawCalls:c.dataset.drawCalls
     }));
     throw Error('Band color did not change any rendered pixels for '+id+
      ' diagnostics '+JSON.stringify(diag));
    }
   const webbing=page.locator('.material-group')
    .filter({hasText:'Auto matches period/shell family.'}).locator('select');
   await webbing.selectOption('tan');
   const conceal=page.locator('.material-group')
    .filter({hasText:'One option at a time.'}).locator('select');
   await conceal.selectOption('foliage-sparse');
   await capture(id+'-sparse-foliage-side','side');
   await conceal.selectOption('foliage');
   await capture(id+'-medium-foliage-front','front');
   await capture(id+'-medium-foliage-side','side');
   await conceal.selectOption('foliage');
   await capture(id+'-heavy-foliage-side','side');
   await conceal.selectOption('scrim');
   await capture(id+'-scrim-front','front');
   await capture(id+'-scrim-side','side');
   await conceal.selectOption('net');
   await capture(id+'-net-three-quarter','front');
   await capture(id+'-net-side','side');
   await capture(id+'-net-rear','back');
   // H9.4a: isolate the modeled shroud before overlays and rail furniture.
   await conceal.selectOption('none');
   await toggle('NVG SHROUD');
   await capture(id+'-shroud-isolated-front','front');
   await capture(id+'-shroud-isolated-side','side');
   await conceal.selectOption('net');
   if(id!=='pasgt'){
    // H9.4b isolated full-length ACH rail, shroud/net hidden for fit review.
    await setToggleState('NVG SHROUD',false);
    await conceal.selectOption('none');
    await toggle('SIDE RAILS');
    await capture(id+'-arc-rail-isolated-side','side');
    await capture(id+'-arc-rail-isolated-back','back');
    await setToggleState('NVG SHROUD',true);
    await conceal.selectOption('net');
    for(const name of ['BUNGEES','VELCRO PANELS'])
     await toggle(name);
   }else if(await page.getByRole('button',{name:'SIDE RAILS'}).count())
    throw Error('PASGT exposed modern rail controls');
   const extras=id==='pasgt'?['IR STROBE','CHEMLIGHT','PATCH / IDENTIFIER']:
    ['IR STROBE','COUNTERWEIGHT','BATTERY PACK','HELMET LIGHT',
      'CAMERA','CHEMLIGHT','PATCH / IDENTIFIER'];
   for(const name of extras)await toggle(name);
   await capture(id+'-fully-kitted-side','side');
   await capture(id+'-fully-kitted-back','back');
   if(id==='ach'){
    // H9.7 final art gate: review each recognizable add-on in isolation
    // rather than approving an all-on loadout that hides bad silhouettes.
    const addonNames=['IR STROBE','COUNTERWEIGHT','BATTERY PACK',
     'HELMET LIGHT','CAMERA','CHEMLIGHT'];
    const slug=name=>name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    for(const name of [...addonNames,'PATCH / IDENTIFIER'])
     await setToggleState(name,false);
    for(const name of ['NVG SHROUD','SIDE RAILS','BUNGEES','VELCRO PANELS'])
     await setToggleState(name,false);
    await conceal.selectOption('none');
    for(const name of addonNames){
     await setToggleState(name,true);
     await capture('ach-isolated-'+slug(name)+'-side','side');
     if(['IR STROBE','COUNTERWEIGHT','BATTERY PACK'].includes(name))
      await capture('ach-isolated-'+slug(name)+'-rear','back');
     await setToggleState(name,false);
    }
    for(const name of addonNames)await setToggleState(name,true);
    await setToggleState('PATCH / IDENTIFIER',true);
    for(const name of ['NVG SHROUD','SIDE RAILS','BUNGEES','VELCRO PANELS'])
     await setToggleState(name,true);
    await conceal.selectOption('net');
   }
   const goggles=page.locator('.material-group').filter({
    hasText:'On eyes, strapped over the helmet brow'}).locator('select');
   await goggles.selectOption('rear');
   await toggle('FABRIC SLEEVE');
   await capture(id+'-rear-goggle-sleeve','back');
   await goggles.selectOption('front');
   await capture(id+'-front-goggles','front');
   await capture(id+'-front-goggles-side','side');
   await capture(id+'-front-goggle-sleeve','front');
   await goggles.selectOption('eyes');
   await capture(id+'-goggles-eyes','front');
   const fastener=page.getByRole('button',{name:'FASTENED',exact:true});
   if(await fastener.getAttribute('aria-pressed')==='true')await fastener.click();
   if(await fastener.getAttribute('aria-pressed')!=='false')
    throw Error('Unfastened state did not persist on '+id);
   await capture(id+'-unfastened-side','side');
   await page.locator('.material-group').filter({hasText:'Unfastened uses two short dangling straps'})
    .locator('select').selectOption('forward');
   await capture(id+'-forward-tilt-fit','fit');
  }
  if(errors.length)throw Error('Studio runtime failures: '+errors.join('; '));
  console.log('H9 helmet staged phone WebGL and compatibility passed');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
