/** R4.3b: player-facing Bodycam View controls in a software-WebGL phone.
 * Runs only in CI on the draft feature branch, not production.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=4204,url='http://127.0.0.1:'+port+'/?quick=1&seed=23&bodycamqa=1';
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const diagnostic=page=>page.evaluate(()=>
  window.__fieldworkBodycamQa?.diagnostic()??null);
const afterFrame=async(page,previous,owner=null)=>{
  await page.waitForFunction(({previous,owner})=>{
    const d=window.__fieldworkBodycamQa?.diagnostic();
    return !!d?.active&&d.frame>previous&&
      (!owner||d.owner===owner);
  },{previous,owner},{timeout:30000});
  return diagnostic(page);
};
try{
  let ready=false;
  for(let i=0;i<120;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  check(ready,'Bodycam UI Vite server failed');
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
  // Playback needs historical observer samples, not merely two recorder
  // frames. On software WebGL a just-started 20 Hz film may contain no
  // personal-sight evidence and legitimately disable Bodycam.
  await page.waitForFunction(()=>{
    const text=document.querySelector('#clock')?.textContent??'00:00';
    const parts=text.split(':').map(Number);
    return parts.length===2&&parts.every(Number.isFinite)&&
      parts[0]*60+parts[1]>=2;
  },null,{timeout:30000});
  let open=false;
  for(let i=0;i<9&&!open;i++){
    await page.waitForTimeout(600);
    await page.evaluate(()=>document.querySelector('#watchReplay')?.click());
    open=await page.locator('#replayPanel').isVisible();
  }
  check(open,'Cannot enter a Bodycam-eligible historical film');
  await page.locator('#replayMore').click();
  // The current compact replay HUD keeps Bodycam in the DIRECT operator
  // camera strip. The older #replayBodycam and #replayBodycamMount controls
  // remain mounted for compatibility but are not visible user controls.
  const follow=page.locator('#replayInspectActorButtons [data-follow-actor="rook"]');
  await follow.click();
  const bodycam=page.locator('#replayDirectBodycam');
  const mount=page.locator('#replayDirectMount');
  check(await bodycam.isVisible()&&await bodycam.isEnabled(),
    'Operator CAM unavailable after recorded sight: '+
      JSON.stringify(await page.evaluate(()=>({
       clock:document.querySelector('#clock')?.textContent,
       phase:document.querySelector('#phase')?.textContent,
       bodycamVisible:!document.querySelector('#replayDirectBodycam')?.hidden,
       bodycamDisabled:document.querySelector('#replayDirectBodycam')?.disabled,
       contactDisabled:document.querySelector('#replayContactLens')?.disabled,
       followChoices:[...document.querySelectorAll(
        '#replayInspectActorButtons button')].map(e=>e.dataset.followActor)
      }))));
  check(await mount.isHidden(),'Mount must be hidden until Bodycam is active');
  await bodycam.click();
  check((await bodycam.getAttribute('aria-pressed'))==='true',
    'Direct Bodycam control did not enable');
  await page.waitForFunction(()=>
    !document.querySelector('#replayBodycamStatus')?.hidden,
    null,{timeout:15000});
  const status=await page.locator('#replayBodycamStatus').textContent();
  check(status?.includes('RECONSTRUCTED BODYCAM')&&
    status.includes('SHARED ARCHITECTURE'),
    'First-person reconstruction warning must persist');
  check(await mount.isEnabled()&&await mount.isVisible()&&
    await page.locator('#replayViewTrigger').isDisabled(),
    'Bodycam should reveal mount and lock incompatible camera mode controls');
  const chest=await page.waitForFunction(()=>{
    const d=window.__fieldworkBodycamQa?.diagnostic();
    return d?.active?d:null;
  },null,{timeout:30000}).then(h=>h.jsonValue());
  check(chest.owner&&chest.maskRestored,
    'Selected operator and mesh restoration failed');
  await mkdir('artifacts/replay-r43b-bodycam',{recursive:true});
  await page.locator('#breach3dCanvas').screenshot({
    path:'artifacts/replay-r43b-bodycam/chest.png'});

  await mount.click();
  check((await mount.textContent())?.includes('HEAD'),
    'Direct mount did not change to head position');
  const helmet=await afterFrame(page,chest.frame,chest.owner);
  const dist=Math.hypot(...helmet.position.map(
    (v,i)=>v-chest.position[i]));
  check(dist>1&&helmet.position[1]<41.5,
    'Helmet mount not physically separated / clips ceiling');
  await page.locator('#breach3dCanvas').screenshot({
    path:'artifacts/replay-r43b-bodycam/helmet.png'});

  // Contact selector must reattach the camera instead of showing the old
  // operator's perspective alongside a new observer's event feed.
  const previous=helmet.frame;
  const viewDetails=page.locator('[data-replay-group="view"]');
  if(!await viewDetails.evaluate(el=>el.open))
   await viewDetails.locator('summary').click();
  await page.locator('#replayContactLens').click();
  const selected=await page.locator('#replayContactLens').textContent();
  check(!selected?.includes('TEAM'),
    'Next individual contact must stay individual during Bodycam');
  const switched=await afterFrame(page,previous);
  check(switched.owner!==chest.owner&&
    (selected??'').toLowerCase().includes(switched.owner),
    'Bodycam camera owner and event observer diverged');

  await page.locator('#replaySightTrigger').click();
  await page.locator('#replaySightChoices [data-sight-choice="full"]').click();
  check((await bodycam.getAttribute('aria-pressed'))==='false',
    'Full sight must exit reconstructed Bodycam');
  check(await page.locator('#replayBodycamStatus').isHidden(),
    'Perspective disclosure label must disappear on exit');
  check((await diagnostic(page))?.active===false,
    'Tactical rendering was not restored after exit');
  await follow.click();
  await bodycam.click();
  await page.waitForFunction(()=>window.__fieldworkBodycamQa?.
    diagnostic()?.active===true,null,{timeout:30000});
  await page.setViewportSize({width:844,height:390});
  await page.waitForTimeout(400);
  const landscape=await diagnostic(page);
  check(landscape?.aspect>1.8&&landscape?.aspect<2.4,
    'Landscape Bodycam projection did not resize');
  await page.locator('#replayExit').click();
  check(await page.locator('#replayPanel').isHidden(),
    'Replay exit failed after body-mounted review');
  check((await diagnostic(page))?.active===false,
    'Replay exit retained the perspective camera');
  check(errors.length===0,'Browser errors: '+errors.join(' | '));
  console.log('Replay R4.3b Bodycam UI smoke PASS',
    JSON.stringify({owner:chest.owner,helmetSeparation:dist,
      switchedTo:switched.owner,landscapeAspect:landscape.aspect}));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
