/** Replay R2 UI regression: the battlefield must not become a button drawer. */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const port=4198;
const url='http://127.0.0.1:'+port+'/?quick=1&seed=23';
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
const check=(condition,msg)=>{if(!condition)throw Error(msg);};
const measure=()=>({
  viewport:{width:innerWidth,height:innerHeight},
  dock:(()=>{
    const r=document.querySelector('#replayPanel').getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,height:r.height,width:r.width};
  })(),
  drawer:(()=>{
    const el=document.querySelector('#replayDrawer');
    const r=el.getBoundingClientRect();
    return {hidden:el.hidden,top:r.top,bottom:r.bottom,height:r.height};
  })(),
  visibleGroups:[...document.querySelectorAll('[data-replay-group]')]
    .filter(el=>!el.hidden).map(el=>el.dataset.replayGroup),
  activeTabs:[...document.querySelectorAll('[data-replay-tab]')]
    .filter(el=>el.getAttribute('aria-selected')==='true')
    .map(el=>el.dataset.replayTab),
  markerCount:document.querySelectorAll('.replay-mark').length,
  markWidth:document.querySelector('#replayMarks').clientWidth,
  feedHidden:document.querySelector('#replayFeed').hidden
});
try{
  let ready=false;
  for(let n=0;n<120;n++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,180));
  }
  check(ready,'Vite did not start');
  browser=await chromium.launch({headless:true,
    args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
    isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
    document.querySelector('#phase')?.textContent==='PLANNING'&&
    !!document.querySelector('#breach3dCanvas'),null,{timeout:60000});
  await page.locator('#play').click();
  // Software WebGL in headless CI may execute only a handful of simulation
  // frames during the first second. The recorder needs >=2 world samples.
  let opened=false;
  for(let attempt=0;attempt<6&&!opened;attempt++){
    await page.waitForTimeout(750);
    await page.evaluate(()=>document.querySelector('#watchReplay').click());
    opened=await page.evaluate(()=>
      document.querySelector('#replayPanel')?.hidden===false);
  }
  if(!opened){
    const diagnostic=await page.evaluate(()=>({
      phase:document.querySelector('#phase')?.textContent,
      replayDisabled:document.querySelector('#watchReplay')?.disabled,
      clock:document.querySelector('#clock')?.textContent,
      bodyState:document.body.className
    }));
    throw Error('Could not enter replay after recording samples: '+
      JSON.stringify({diagnostic,errors}));
  }

  const compact=await page.evaluate(measure);
  check(compact.drawer.hidden,'Drawer must be closed by default');
  check(compact.dock.height<=190,
    'Portrait replay dock obscures battlefield: '+JSON.stringify(compact));
  check(compact.markerCount<=Math.ceil(compact.markWidth/7)+1,
    'Event rail still has overlapping unclustered markers');
  check(compact.dock.top>compact.viewport.height*.54,
    'Compact replay dock should stay near screen bottom');

  await page.locator('#replayMore').click();
  const view=await page.evaluate(measure);
  check(!view.drawer.hidden&&view.visibleGroups.join()==='view',
    'Tools must open with only View group visible: '+JSON.stringify(view));
  check(view.drawer.bottom<=view.dock.top,
    'Drawer overlaps transport');
  check(view.drawer.top>=0,'Drawer leaves the viewport');
  check(view.activeTabs.join()==='view','View tab must show selected state');

  // R3: advanced camera controls live exclusively in View, not on the dock.
  // R4.2: the contact lens is evidence-backed and intentionally does not
  // pretend the shared tactical map is an individual observation map.
  const lens=page.locator('#replayContactLens');
  check(await lens.isVisible(),'Operator contacts control missing');
  check(await lens.isEnabled(),'New mission should capture observer evidence');
  await lens.click();
  const contactLabel=await lens.textContent();
  check(contactLabel?.includes('CONTACTS: ')&&!contactLabel.includes('TEAM'),
    'Operator contacts did not select an individual observer');
  check(await page.locator('#replayContactNote').isVisible(),
    'The shared-map limitation must be visibly disclosed');
  check(await page.locator('#replayObserverTransitions').evaluate(e=>
    !e.hidden&&e.children.length>0),
    'Operator contact timeline must be built from historical observation samples');
  const floor=page.locator('#replayGroundLens');
  check(await floor.isVisible(),'Personal ground control missing');
  const groundEvidenceAvailable=await floor.isEnabled();
  if(groundEvidenceAvailable){
    await floor.click();
    check((await floor.getAttribute('aria-pressed'))==='true',
      'Personal floor evidence overlay did not activate');
    check((await page.locator('#replayView').textContent())?.includes('PLAN2D'),
      'Personal floor evidence must stay in Floor Plan view');
    check((await page.locator('#replayContactNote').textContent())?.
      includes('GOLD CELLS'),
      'Floor evidence note must not claim full individual environment sight');
  }else{
    // CI's software WebGL can reach replay after only two 20 Hz frames.
    // That film may have NO ground sight tick yet; do not invent discovery.
    check((await floor.getAttribute('aria-pressed'))==='false',
      'An evidence-free short film must leave personal ground disabled');
  }
  await page.locator('#replaySight').click();
  check((await lens.textContent())?.includes('CONTACTS: TEAM'),
    'Team/Full View must exit individual contact lens');
  check(await page.locator('#replayContactNote').isHidden(),
    'The personal-contact limitation must hide when exiting lens');
  check((await floor.getAttribute('aria-pressed'))==='false',
    'Leaving individual review must turn off the floor overlay');
  if(groundEvidenceAvailable){
    await page.locator('#replayView').click(); // Plan2D -> ISO for Director QA
    check((await page.locator('#replayView').textContent())?.includes('ISO'),
      'Tactical camera must restore after leaving the floor overlay');
  }

  check(await page.locator('#replayDirector').isVisible(),
    'R3 Director must be accessible under View');
  check(await page.locator('#replaySquad').isVisible(),
    'R3 Squad follow must be accessible under View');
  await page.locator('#replayDirector').click();
  check((await page.locator('#replayDirector').getAttribute('aria-pressed'))==='true',
    'Director button did not activate');
  await page.locator('#replaySquad').click();
  check((await page.locator('#replayDirector').getAttribute('aria-pressed'))==='false',
    'Squad mode must disable Director');
  check((await page.locator('#replaySquad').getAttribute('aria-pressed'))==='true',
    'Squad camera did not activate');
  await page.locator('[data-replay-tab=layers]').click();
  const layers=await page.evaluate(measure);
  check(layers.visibleGroups.join()==='layers',
    'Layers tab must hide all other controls');
  check(await page.locator('#replayTraces').isVisible(),
    'Trajectory setting disappeared');

  await page.locator('[data-replay-tab=precision]').click();
  const timing=await page.evaluate(measure);
  check(timing.visibleGroups.join()==='precision',
    'Precision tab must show only playback controls');
  check(await page.locator('#replayPrevFrame').isVisible(),
    'Frame stepping disappeared');

  await page.locator('[data-replay-tab=export]').click();
  check(await page.locator('#replayExportVideo').isVisible(),
    'Export button must remain accessible');

  await page.locator('#replayFeedToggle').click();
  const feed=await page.evaluate(measure);
  check(await page.locator('#replayShotInspector').count()===1,
    'R3 contextual shot inspector missing from Events drawer');
  check(await page.locator('#replayShotInspector').isHidden(),
    'Shot inspector must stay hidden when nothing was selected');
  check(await page.locator('#replayBookmark').isVisible(),
    'R3 bookmark action must live inside the Events drawer');
  check(await page.locator('#replayPrevChapter').isVisible()&&
    await page.locator('#replayNextChapter').isVisible(),
    'R3 event-grounded chapter navigation missing');
  await page.locator('#replayBookmark').click();
  check((await page.locator('#replayChapterList .replay-chapter-item').count())>=2,
    'R3 bookmark/chapter list failed to update');
  check(!feed.feedHidden&&feed.visibleGroups.length===0&&
    feed.activeTabs.join()==='events',
    'Events tab must take over the drawer without showing the tool grid');
  await page.locator('#replayDrawerClose').click();
  const closed=await page.evaluate(measure);
  check(closed.drawer.hidden,'Close should restore compact replay');

  await page.setViewportSize({width:844,height:390});
  await page.locator('#replayMore').click();
  const landscape=await page.evaluate(measure);
  check(landscape.dock.height<=160,
    'Landscape replay dock too tall: '+JSON.stringify(landscape));
  check(landscape.drawer.top>=0&&landscape.drawer.bottom<=landscape.dock.top,
    'Landscape tools overflow battlefield: '+JSON.stringify(landscape));
  check(errors.length===0,'Browser errors: '+errors.join(' | '));
  console.log('Replay UX mobile smoke PASS',JSON.stringify({
    portraitDockHeight:compact.dock.height,
    portraitDrawerHeight:view.drawer.height,
    landscapeDockHeight:landscape.dock.height,
    landscapeDrawerHeight:landscape.drawer.height,
    markerCount:compact.markerCount
  }));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
