/** Replay R4.4 A3: critical Events drawer regression at phone widths.
 * No fabricated crossings: an empty real film MUST leave the rail hidden.
 */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4221,url='http://127.0.0.1:'+port+'/?quick=1&seed=23';
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
const check=(condition,message)=>{if(!condition)throw Error(message);};
const measure=()=>({
  width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
  panelHidden:document.querySelector('#replaySquadEntryPanel')?.hidden,
  reviews:[...document.querySelectorAll('.replay-entry-review-item')]
    .map(el=>({title:el.querySelector('strong')?.textContent,
      detail:el.querySelector('small')?.textContent})),
  drawer:(()=>{
    const r=document.querySelector('#replayDrawer').getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,width:r.width};
  })()
});
try{
  let ready=false;
  for(let i=0;i<120;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  check(ready,'R4.4 mobile smoke Vite server did not start');
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]});
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
    isMobile:true,hasTouch:true
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#phase')?.
    textContent==='PLANNING'&&!!document.querySelector('#breach3dCanvas'),
    null,{timeout:60000});
  await page.locator('#play').click();
  // V4+ requires an authorized debrief or saved-library replay; clicking
  // the hidden legacy #watchReplay is not a player-visible entry path.
  // Preserve a genuinely recorded mission and inspect it through the
  // actual library UI, with no fabricated crossings or phase overrides.
  await page.waitForFunction(()=>{
    const parts=(document.querySelector('#clock')?.textContent??'00:00')
      .split(':').map(Number);
    return parts.length===2&&parts.every(Number.isFinite)&&
      parts[0]*60+parts[1]>=2;
  },null,{timeout:40000});
  await page.waitForFunction(()=>document.querySelector('#saveReplayDebrief')?.
    disabled===false,null,{timeout:20000});
  await page.evaluate(()=>document.querySelector('#saveReplayDebrief')?.click());
  await page.waitForFunction(()=>document.querySelector('#saveReplayDebrief')?.
    textContent==='REPLAY SAVED',null,{timeout:20000});
  await page.evaluate(()=>document.querySelector('#openReplayLibrary')?.click());
  await page.locator('#replayLibraryList .replay-library-watch').first()
    .waitFor({state:'visible',timeout:20000});
  await page.locator('#replayLibraryList .replay-library-watch').first().click();
  await page.locator('#replayPanel').waitFor({state:'visible',timeout:30000});
  check(await page.locator('#replayPanel').isVisible(),
    'Saved real mission was not playable from its Replay Library');
  await page.locator('#replayFeedToggle').click();
  check(await page.locator('#replayFeedPanel').isVisible(),
    'Events tab failed to open');
  const portrait=await page.evaluate(measure);
  check(portrait.scrollWidth<=portrait.width+2&&
    portrait.drawer.top>=0&&portrait.drawer.bottom<=portrait.height+2,
    'Portrait entry rail overflow: '+JSON.stringify(portrait));
  check(portrait.panelHidden===true||portrait.reviews.length>0,
    'No crossing evidence but entry rail was exposed');
  if(portrait.reviews.length){
    check(portrait.reviews.every(r=>r.title?.includes('CROSSED')&&
      r.detail?.length>0),'Recorded entry labels missing actual operators');
    await page.locator('.replay-entry-review-item').first().click();
    check(await page.locator('.replay-entry-review-item').first().
      getAttribute('aria-pressed')==='true',
      'Entry selection did not work');
  }
  await page.setViewportSize({width:844,height:390});
  await page.waitForTimeout(260);
  const landscape=await page.evaluate(measure);
  check(landscape.scrollWidth<=landscape.width+2&&
    landscape.drawer.top>=0&&landscape.drawer.bottom<=landscape.height+2,
    'Landscape entry rail overflow: '+JSON.stringify(landscape));
  await page.locator('#replayExit').click();
  check(await page.locator('#replayPanel').isHidden(),
    'Replay exit must leave squad entry inspection');
  check(errors.length===0,
    'Entry review browser errors: '+errors.join(' | '));
  console.log('Replay R4.4 mobile Events smoke PASS',JSON.stringify({
    portrait,landscape,
    limitation:'No active four-operator crossing asserted by this UI smoke'
  }));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
