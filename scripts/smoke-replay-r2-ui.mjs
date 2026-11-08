/** Replay UX V2: compact direct selectors and contextual replay surfaces. */
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
  check(await page.locator('#replayPanel').getAttribute('role')==='region',
    'Replay transport needs a named accessible region');
  check(await page.locator('#replayTabs').count()===0,
    'Obsolete five-tab drawer must not remain in the DOM');
  check(compact.dock.height<=200,
    'Portrait replay dock obscures battlefield: '+JSON.stringify(compact));
  check(compact.markerCount<=Math.ceil(compact.markWidth/24)+1,
    'Event rail still has overlapping unclustered markers');
  check(compact.dock.top>compact.viewport.height*.7,
    'Compact replay dock should stay near screen bottom');

  check(await page.locator('#replaySpeedTrigger').isVisible(),
    'Custom speed pop-out must be directly accessible');
  for(const id of ['replaySightTrigger','replayDirectTracers',
    'replayDirectXray','replayDirectDirector']){
    check(await page.locator('#'+id).isVisible(),
      'Direct viewing control missing: '+id);
  }
  check(await page.locator('#replayEventText').isVisible(),
    'The bottom action feed must stay visible on mobile');
  check(await page.locator('#replayTopHud').isVisible()&&
    await page.locator('#replayExit').isVisible(),
    'Replay exit must be in the persistent top HUD');
  check(await page.locator('#replayQuickSpeed').isHidden()&&
    await page.locator('#replayQuickView').isHidden()&&
    await page.locator('#replayDirectSight').isHidden(),
    'Native iOS replay dropdowns should not be exposed');
  if(await page.locator('#replaySightChoices [data-sight-choice="operator"]').isEnabled()){
    await page.locator('#replaySightTrigger').click();
    await page.locator('#replaySightChoices [data-sight-choice="operator"]').click();
    check(await page.locator('#replayContactNote').evaluate(e=>!e.hidden),
      'Direct Operator Sight must establish historical contact disclosure');
    await page.locator('#replaySightTrigger').click();
    await page.locator('#replaySightChoices [data-sight-choice="team"]').click();
    check(await page.locator('#replayContactNote').evaluate(e=>e.hidden),
      'Returning to Team Sight must exit personal-contact lens');
  }
  await page.locator('#replayDirectTracers').click();
  check(await page.locator('#replayDirectTracers').getAttribute('aria-pressed')==='true',
    'Direct tracer toggle did not activate');
  check((await page.locator('#replayDirectXray').getAttribute('aria-label'))
    ?.includes('cutaway'),'X-ray label should be replaced by selective Cutaway');
  check(await page.locator('#replayDirectXray').getAttribute('aria-pressed')==='true',
    'Selective cutaway should initially be available in replay');
  await page.locator('#replayDirectXray').click();
  check(await page.locator('#replayDirectXray').getAttribute('aria-pressed')==='false',
    'Turning off selective cutaway failed');
  await page.locator('#replayDirectXray').click();
  check(await page.locator('#replayDirectXray').getAttribute('aria-pressed')==='true',
    'Turning on selective cutaway failed');
  await page.locator('#replaySpeedTrigger').click();
  check(await page.locator('#replaySpeedRange').isVisible(),
    'The tactile speed slider should replace the scrollable speed list');
  await page.locator('#replaySpeedRange').focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowRight');
  check(await page.locator('#replayQuickSpeed').inputValue()==='0.5',
    'Speed slider keyboard detent should select 0.5×');
  await page.locator('#replaySpeedChoices [data-speed-choice="1.5"]').click();
  check(await page.locator('#replayQuickSpeed').inputValue()==='1.5',
    'Major magnetic speed preset 1.5× did not select');
  await page.locator('#replayViewTrigger').click();
  await page.locator('#replayViewChoices [data-view-choice="top"]').click();
  check(await page.locator('#replayQuickView').inputValue()==='top',
    'Direct perspective selection failed');
  await page.locator('#replayMore').click();
  const view=await page.evaluate(measure);
  check(await page.locator('#replaySight').isHidden()&&
    await page.locator('#replayTraces').isHidden(),
    'Duplicate advanced controls were not hidden');
  check(!view.drawer.hidden&&view.visibleGroups.sort().join()==='layers,precision,view',
    'Analyze should expose collapsible review controls: '+JSON.stringify(view));
  check(view.drawer.bottom<=view.dock.top,
    'Drawer overlaps transport');
  check(view.drawer.top>=0,'Drawer leaves the viewport');
  check(await page.locator('#replayMore').getAttribute('aria-expanded')==='true',
    'Analyze state not announced');
  await page.locator('[data-replay-group="view"] summary').click();

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
  await page.locator('#replaySightTrigger').click();
  await page.locator('#replaySightChoices [data-sight-choice="full"]').click();
  check((await lens.textContent())?.includes('CONTACTS: TEAM'),
    'Team/Full View must exit individual contact lens');
  check(await page.locator('#replayContactNote').isHidden(),
    'The personal-contact limitation must hide when exiting lens');
  check((await floor.getAttribute('aria-pressed'))==='false',
    'Leaving individual review must turn off the floor overlay');
  if(groundEvidenceAvailable){
    await page.locator('#replayViewTrigger').click();
    await page.locator('#replayViewChoices [data-view-choice="iso"]').click(); // Plan2D -> ISO
    check((await page.locator('#replayView').textContent())?.includes('ISO'),
      'Tactical camera must restore after leaving the floor overlay');
  }

  check(await page.locator('#replayDirectDirector').isVisible(),
    'Director must be accessible without an analysis drawer');
  check(await page.locator('#replaySquad').isVisible(),
    'R3 Squad follow must be accessible under View');
  await page.locator('#replayDirectDirector').click();
  check((await page.locator('#replayDirectDirector').getAttribute('aria-pressed'))==='true',
    'The visible Director toggle did not activate');
  await page.locator('#replaySquad').click();
  check((await page.locator('#replayDirectDirector').getAttribute('aria-pressed'))==='false',
    'Squad mode must disable the visible Director control');
  check((await page.locator('#replaySquad').getAttribute('aria-pressed'))==='true',
    'Squad camera did not activate');
  check(await page.locator('#replayDirectTracers').isVisible(),
    'The direct tracer toggle disappeared');
  // Camera following is direct; Bodycam/mount appear contextually.
  const operatorOption=await page.locator(
    '#replayQuickCamera option[data-actor]').first().getAttribute('value');
  if(operatorOption){
    await page.locator('#replayQuickCamera').evaluate((select,value)=>{
      select.value=value;
      select.dispatchEvent(new Event('change',{bubbles:true}));
    },operatorOption);
    check(await page.locator('#replayDirectBodycam').isVisible(),
      'Bodycam must appear when following an operator');
    if(await page.locator('#replayDirectBodycam').isEnabled()){
      await page.locator('#replayDirectBodycam').click();
      check(await page.locator('#replayDirectMount').isVisible(),
        'Head/chest toggle must appear during Bodycam');
      await page.locator('#replayDirectMount').click();
      check((await page.locator('#replayDirectMount').textContent())?.includes('HEAD'),
        'Bodycam mount toggle did not activate');
      await page.locator('#replayDirectBodycam').click();
      check(await page.locator('#replayDirectBodycam').isVisible(),
        'Exiting Bodycam should return to operator follow');
    }
  }
  check(await page.locator('#replayInspectActor option').count()>=2,
    'Operator investigation choices missing');
  check(await page.locator('#replayInspectActorButtons button').count()>=2,
    'Direct operator-follow chips missing in Analyze');
  await page.locator('#replayInspectActorButtons button').first().click();
  check((await page.locator('#replayFollowStatus').textContent())?.includes('FOLLOW'),
    'Following an operator must be visible outside the menu');
  check((await page.locator('#replayFollowStatus').getAttribute('data-following'))==='true',
    'The followed operator status must be highlighted');

  await page.locator('[data-replay-group="precision"] summary').click();
  check(await page.locator('#replayPrevFrame').isVisible(),
    'Advanced frame stepping disappeared');

  await page.locator('#replayShareToggle').click();
  check(await page.locator('#replayExportVideo').isVisible(),
    'Video export must remain accessible through Save/Share');

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
  check(feed.feedHidden&&feed.visibleGroups.length===0,
    'Moments should default to highlights, not dense event feed');
  await page.locator('[data-moments-view="events"]').click();
  check(await page.locator('#replayFeed').isVisible(),
    'All Events must expose the chronological feed');
  await page.locator('#replayFeedFollow').click();
  check(await page.locator('#replayFeedFollow').getAttribute('aria-pressed')==='true',
    'Event feed follow-time control did not activate');
  await page.locator('#replayDrawerClose').click();
  const closed=await page.evaluate(measure);
  check(closed.drawer.hidden,'Close should restore compact replay');
  check(await page.evaluate(()=>document.activeElement?.id)==='replayFeedToggle',
    'Closing Moments must restore keyboard focus to its launcher');

  // Replay keyboard shortcuts must defer to focused buttons, and Escape
  // should close the active surface without exiting replay.
  await page.locator('#replayMore').focus();
  const playLabelBefore=await page.locator('#replayPlay').getAttribute('aria-label');
  await page.keyboard.press('Space');
  check(await page.locator('#replayDrawer').isVisible(),
    'Space on focused Analyze button did not activate its own control');
  check((await page.locator('#replayPlay').getAttribute('aria-label'))===playLabelBefore,
    'Space on focused replay control incorrectly changed playback');
  await page.locator('#replayDrawerClose').focus();
  await page.keyboard.press('Escape');
  check(await page.locator('#replayDrawer').isHidden(),
    'Escape on focused replay close control failed to close panel');
  check(await page.evaluate(()=>document.activeElement?.id)==='replayMore',
    'Escape must restore focus to Analyze button');
  check(await page.locator('#replayPanel').isVisible(),
    'Escape should not exit playback when a secondary panel was open');
  // Real two-pointer CDP gestures: after a pinch ends, the surviving finger
  // must orbit instead of staying stuck in cameraMulti (zoom-only mode).
  await page.locator('#replayViewTrigger').click();
  await page.locator('#replayViewChoices [data-view-choice="iso"]').click();
  if(await page.locator('#replayDirectFree').isVisible())
    await page.locator('#replayDirectFree').click();
  await page.waitForTimeout(90);
  const beforeYaw=Number(await page.locator('#breach3dCanvas')
    .getAttribute('data-camera-yaw'));
  const cdp=await page.context().newCDPSession(page);
  const finger=(id,x,y)=>({id,x,y,radiusX:4,radiusY:4,force:1});
  const touchTimeline=[];
  const captureTouch=async name=>touchTimeline.push({
    name,...await page.evaluate(()=>({
      count:document.querySelector('#breachCanvas')?.dataset.gestureCount,
      phase:document.querySelector('#breachCanvas')?.dataset.gesturePhase,
      modes:document.querySelector('#breachCanvas')?.dataset.gestureModes,
      yaw:document.querySelector('#breach3dCanvas')?.dataset.cameraYaw
    }))
  });
  await cdp.send('Input.dispatchTouchEvent',{
    type:'touchStart',touchPoints:[finger(1,96,250)]});
  await captureTouch('start-one');
  await cdp.send('Input.dispatchTouchEvent',{
    type:'touchStart',touchPoints:[finger(1,96,250),finger(2,185,250)]});
  await captureTouch('start-two');
  await cdp.send('Input.dispatchTouchEvent',{
    type:'touchMove',touchPoints:[finger(1,96,250),finger(2,202,252)]});
  await captureTouch('pinch-move');
  await cdp.send('Input.dispatchTouchEvent',{
    type:'touchEnd',touchPoints:[finger(1,96,250)]});
  await captureTouch('lift-one');
  // Chrome's touchEnd points identify the lifted finger, not the finger
  // that remains active: id=2 is the surviving captured orbit pointer.
  await cdp.send('Input.dispatchTouchEvent',{
    type:'touchMove',touchPoints:[finger(2,260,275)]});
  await captureTouch('single-move');
  await cdp.send('Input.dispatchTouchEvent',{
    type:'touchEnd',touchPoints:[]});
  await captureTouch('end-all');
  await page.waitForTimeout(150);
  const afterYaw=Number(await page.locator('#breach3dCanvas')
    .getAttribute('data-camera-yaw'));
  const gestureProbe=await page.evaluate(()=>({
    phase:document.querySelector('#breachCanvas')?.dataset.gesturePhase,
    count:document.querySelector('#breachCanvas')?.dataset.gestureCount,
    modes:document.querySelector('#breachCanvas')?.dataset.gestureModes,
    atPoint:document.elementFromPoint(96,250)?.id,
    view:document.querySelector('#breach3dCanvas')?.dataset.cameraMode
  }));
  check(Number.isFinite(beforeYaw)&&Number.isFinite(afterYaw)&&
    Math.abs(Math.atan2(Math.sin(afterYaw-beforeYaw),
      Math.cos(afterYaw-beforeYaw)))>.04,
    'Pinch-to-single-finger handoff failed to restore orbit: '+
      JSON.stringify({beforeYaw,afterYaw,gestureProbe,touchTimeline}));
  await cdp.detach();


  // The arrow collapses to a minimal bottom playback bar, while the
  // side rail and exit remain accessible without another settings menu.
  await page.locator('#replayRailToggle').click();
  check(await page.locator('#replayRail').getAttribute('data-collapsed')==='true',
    'Side rail must minimize independently');
  check(await page.locator('#replayViewTrigger').isHidden(),
    'Side rail buttons must be hidden while minimized');
  check(await page.locator('#replayRailToggle').isVisible(),
    'Side rail restore handle disappeared');
  await page.locator('#replayRailToggle').click();
  check(await page.locator('#replayViewTrigger').isVisible(),
    'Side rail cannot restore with one tap');

  await page.locator('#replayDockToggle').click();
  check(await page.locator('#replayPanel').getAttribute('data-collapsed')==='true',
    'Replay dock minimization did not activate');
  const minimized=await page.evaluate(measure);
  check(minimized.dock.height<=85,
    'Minimized replay controls still cover the battlefield: '+JSON.stringify(minimized));
  check(await page.locator('#replayMiniPlay').isVisible(),
    'Minimized player lost its play/pause control');
  check(await page.locator('#replayRail').isVisible(),
    'Side toolbar must remain visible after minimizing the dock');
  await page.locator('#replayDockToggle').click();
  check(await page.locator('#replayPanel').getAttribute('data-collapsed')==='false',
    'Replay dock would not expand');

  await page.setViewportSize({width:844,height:390});
  await page.locator('#replayMore').click();
  const landscape=await page.evaluate(measure);
  check(landscape.dock.height<=165,
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
