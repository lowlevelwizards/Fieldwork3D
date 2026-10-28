/**
 * Deterministic browser evidence of the ACTUAL Verdigris main scene.
 * Water is seeded through the real TerrainWater solver and normal save
 * loading. No fake stage fixtures or screenshot-only river geometry.
 */
import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const {chromium}=await import('playwright');
const directory=resolve('live-ground-captures');
await mkdir(directory,{recursive:true});
const port=4180;
const url=`http://127.0.0.1:${port}/`;
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js',
  '--host','127.0.0.1','--port',String(port),'--strictPort',
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
try{
  let ready=false;
  for(let i=0;i<100;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(done=>setTimeout(done,140));
  }
  if(!ready)throw Error('Verdigris preview did not start');
  browser=await chromium.launch({
    headless:true,args:['--use-gl=angle','--use-angle=swiftshader'],
  });
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
  });
  page.setDefaultTimeout(15000);
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('#waterLabel').waitFor();
  // Evaluate the same useful daylight used in the user's inspection.
  // Scrubbing previews time only; it cannot add water to the solver.
  await page.locator('#timeScrub').evaluate(el=>{
    el.value='780';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await page.waitForTimeout(400);
  await page.screenshot({path:resolve(directory,'grass-dry-ui-mobile.png')});
  await page.addStyleTag({content:
    '.time-inspector,.region-map-toggle,.region-map-panel{display:none!important}'});
  await page.screenshot({path:resolve(directory,'grass-dry-clean-mobile.png')});
  await page.evaluate(()=>document.querySelector('#coverToggle').click());
  await page.screenshot({path:resolve(directory,'ground-cover-inspection-dry.png')});
  const coverDry=await page.locator('#coverStatus').innerText();
  if(!coverDry.includes('Tap or drag'))throw Error('Ground cover inspection failed');

  // Use the actual existing physics to generate a rainy wet condition.
  const fixture=await page.evaluate(async()=>{
    const {TerrainWater}=await import('/src/hydrology.ts');
    const w=new TerrainWater();
    for(let i=0;i<45;i++)w.advance(4+i*.1,.1,1);
    return {saved:w.snapshot(),litres:w.totalLiters(),
      channel:w.totalChannelLiters(),flood:w.totalFloodLiters(),
      massError:w.massBalanceError()};
  });
  // The original dry page runs a save loop. An init script on a separate
  // page establishes the wet saved state *before* the app reads localStorage.
  const wetPage=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
  });
  wetPage.on('pageerror',e=>errors.push(String(e)));
  await wetPage.addInitScript(({saved})=>{
    localStorage.setItem('fieldwork-ground-zero-water-017',
      JSON.stringify(saved));
  },{saved:fixture.saved});
  await wetPage.goto(url,{waitUntil:'domcontentloaded'});
  await wetPage.locator('#waterLabel').waitFor();
  await wetPage.locator('#timeScrub').evaluate(el=>{
    el.value='780';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  await wetPage.waitForTimeout(400);
  const displayedWater=await wetPage.locator('#waterLabel').innerText();
  if(!displayedWater.includes('SURFACE ')||
    Number(displayedWater.match(/SURFACE ([0-9]+)/)?.[1]??0)<fixture.litres*.4){
    throw Error('Hydrated river fixture not loaded: '+displayedWater+
      '; expected '+fixture.litres);
  }
  const profile=await wetPage.evaluate(async()=>{
    const {TerrainWater}=await import('/src/hydrology.ts');
    const {buildRiverRibbon}=await import('/src/river-ribbon-model.ts');
    const saved=JSON.parse(localStorage.getItem('fieldwork-ground-zero-water-017'));
    const river=buildRiverRibbon('live',new TerrainWater(undefined,saved));
    const widths=river.widths.map(w=>w.left+w.right);
    return {triangles:river.triangles,maxWidth:Math.max(...widths),
      wettedStations:widths.filter(w=>w>.005).length};
  });
  if(profile.triangles===0||profile.wettedStations===0)
    throw Error('Saved rain must produce visible river geometry');
  await wetPage.screenshot({path:resolve(directory,'river-wet-ui-mobile.png')});
  await wetPage.addStyleTag({content:
    '.time-inspector,.region-map-toggle,.region-map-panel{display:none!important}'});
  await wetPage.screenshot({path:resolve(directory,'river-wet-clean-mobile.png')});
  await wetPage.evaluate(()=>document.querySelector('#coverToggle').click());
  await wetPage.screenshot({path:resolve(directory,'ground-cover-inspection-wet.png')});
  const sample={litres:fixture.litres,channel:fixture.channel,
    flood:fixture.flood,massError:fixture.massError,
    displayedWater,profile};
  if(errors.length)throw Error('Browser errors: '+errors.join('; '));
  if(!Number.isFinite(sample.massError)||Math.abs(sample.massError)>.001)
    throw Error('Water ledger not conserved');
  await writeFile(resolve(directory,'manifest.json'),JSON.stringify(sample,null,2));
  console.log('Captured dry grass and actual wet river in the production viewport:',sample);
}finally{
  await browser?.close();
  server.kill('SIGTERM');
}
