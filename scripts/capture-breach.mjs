/**
 * Real-browser verification of the new tactical prototype, in both portrait
 * touch and desktop, with screenshots for art/UX review.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const {chromium}=await import('playwright');
const folder=resolve('breach-052-captures');
await mkdir(folder,{recursive:true});
const port=4189,url=`http://127.0.0.1:${port}/breach.html`;
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort',
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
try{
  let ready=false;
  for(let i=0;i<100;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(done=>setTimeout(done,140));
  }
  if(!ready)throw Error('Breach preview unavailable');
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader',
  ]});
  const phone=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:2,
    hasTouch:true,isMobile:true,
  });
  phone.setDefaultTimeout(12000);
  const errors=[];
  // The Pages root must open this same game, not the archived watershed.
  const home=await browser.newPage({viewport:{width:390,height:844}});
  home.on('pageerror',e=>errors.push('homepage: '+e.message));
  await home.goto(url.replace('breach.html',''),{
    waitUntil:'domcontentloaded'});
  await home.locator('#breachCanvas').waitFor();
  if(await home.locator('#app').count())
    throw Error('Pages root is still the old Verdigris game');
  if(!await home.locator('#play').count())
    throw Error('Pages root missing tactical GO control');
  await home.screenshot({path:resolve(folder,'00-pages-home-breach.png')});
  const original=await browser.newPage({viewport:{width:390,height:844}});
  await original.goto(url.replace('breach.html','verdigris.html'),{
    waitUntil:'domcontentloaded'});
  await original.locator('#app').waitFor();
  await original.close();await home.close();
  phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(url,{waitUntil:'domcontentloaded'});
  await phone.locator('#breachCanvas').waitFor();
  await phone.waitForTimeout(350);
  const cameraState=async()=>phone.locator('#breach3dCanvas').evaluate(c=>({
    yaw:Number(c.dataset.cameraYaw),pitch:Number(c.dataset.cameraPitch),
    zoom:Number(c.dataset.cameraZoom),
    focusX:Number(c.dataset.cameraFocusX),
    focusY:Number(c.dataset.cameraFocusY),
  }));
  const near=(a,b,tolerance=.04)=>Math.abs(a-b)<tolerance;
  if(!await phone.locator('#breach3dCanvas').isVisible())
    throw Error('3D battlefield did not initialize');
  if(await phone.locator('#advancedOrders').isVisible())
    throw Error('Advanced orders should be collapsed by default');
  if(await phone.locator('.camera-tools').count())
    throw Error('Obsolete camera panel still visible');
  const visibleButtons=await phone.locator('.bar button:visible').count();
  if(visibleButtons!==5)
    throw Error('Expected only five persistent tactical controls, got '+visibleButtons);
  // 078: three views of one unchanged authoritative planning state.
  await phone.screenshot({path:resolve(folder,'10-presentation-iso.png')});
  await phone.locator('#moreOrders').click();
  await phone.locator('#viewTop').click();
  await phone.locator('#moreOrders').click();
  await phone.waitForTimeout(380);
  await phone.screenshot({path:resolve(folder,'11-presentation-top.png')});
  await phone.locator('#moreOrders').click();
  await phone.locator('#view2d').click();
  await phone.locator('#moreOrders').click();
  await phone.screenshot({path:resolve(folder,'12-presentation-2d.png')});
  await phone.locator('#moreOrders').click();
  await phone.locator('#viewIso').click();
  await phone.locator('#moreOrders').click();
  await phone.waitForTimeout(380);
  if(await phone.locator('#moreOrders').getAttribute('aria-pressed')!=='false')
    throw Error('Presentation view audit left TOOLS open');
  const initial=await cameraState();
  const cdp=await phone.context().newCDPSession(phone);
  const touch=async(start,frames)=>{
    const points=ps=>ps.map((p,i)=>({id:i+1,x:p[0],y:p[1]}));
    await cdp.send('Input.dispatchTouchEvent',{
      type:'touchStart',touchPoints:points(start)});
    for(const frame of frames){
      await cdp.send('Input.dispatchTouchEvent',{
        type:'touchMove',touchPoints:points(frame)});
      await phone.waitForTimeout(60);
    }
    await cdp.send('Input.dispatchTouchEvent',{
      type:'touchEnd',touchPoints:[]});
    await phone.waitForTimeout(80);
  };
  await touch([[166,425]],[[[192,431]],[[224,444]],[[263,466]]]);
  const rotated=await cameraState();
  if(!(rotated.yaw<initial.yaw-.18))
    throw Error('Orbit should move opposite old reversed yaw, got '+
      JSON.stringify({initial,rotated}));
  if(!(rotated.pitch<initial.pitch-.06))
    throw Error('Orbit pitch should move opposite old reversed pitch');
  if(!near(rotated.focusX,initial.focusX,1)||
     !near(rotated.focusY,initial.focusY,1))
    throw Error('Orbit drifted off map pivot');
  if(!await phone.locator('#back').isDisabled())
    throw Error('Orbit created accidental move');
  await phone.screenshot({path:resolve(folder,'01-phone-orbit.png')});
  await touch([[150,410],[236,410]],
    [[[169,392],[255,392]],[[190,376],[276,376]]]);
  const pan=await cameraState();
  if(near(pan.focusX,rotated.focusX,3)&&near(pan.focusY,rotated.focusY,3))
    throw Error('Two-finger drag did not pan');
  if(!near(pan.yaw,rotated.yaw))
    throw Error('Two-finger pan accidentally orbited');
  await touch([[152,476],[216,476]],
    [[[142,476],[226,476]],[[128,476],[240,476]],[[116,476],[255,476]]]);
  const pinch=await cameraState();
  if(!(pinch.zoom>pan.zoom*1.6))
    throw Error('Two-finger pinch failed to zoom');
  if(!near(pinch.yaw,pan.yaw))
    throw Error('Pinch accidentally orbited');
  if(!await phone.locator('#back').isDisabled())
    throw Error('Camera gestures generated phantom plan nodes');
  await phone.screenshot({path:resolve(folder,'02-phone-pan-pinch.png')});

  await phone.locator('#moreOrders').click();
  if(!await phone.locator('#advancedOrders').isVisible())
    throw Error('TOOLS drawer did not open');
  await phone.locator('#cameraFit').click();
  await phone.locator('#view2d').click();
  await phone.locator('#moreOrders').click();
  if(await phone.locator('#advancedOrders').isVisible())
    throw Error('TOOLS drawer failed to collapse');

  const screen=(x,y)=>{
    const scale=Math.min((390-20)/640,(844-172)/740);
    return {x:390/2-640*scale/2+x*scale,
      y:844/2-740*scale/2-11+y*scale};
  };
  await phone.locator('#rook').click();
  if(!await phone.locator('#contextTools button[data-action="ctxPie"]').isVisible())
    throw Error('PIE missing from contextual order tray');
  await phone.locator('#contextTools button[data-action="ctxPie"]').click();
  const target=screen(346,568);
  await phone.touchscreen.tap(target.x,target.y);
  if(await phone.locator('#back').isDisabled())
    throw Error('PIE targeting did not author persistent order');
  await phone.screenshot({path:resolve(folder,'03-phone-pie-watch-target.png')});
  await phone.locator('#contextTools button[data-action="ctxStrafe"]').click();
  const facing=screen(282,697);
  await phone.touchscreen.tap(facing.x,facing.y);
  await phone.screenshot({path:resolve(folder,'04-phone-strafe-held-direction.png')});
  const move=screen(329,628);
  await phone.touchscreen.tap(move.x,move.y);
  await phone.screenshot({path:resolve(folder,'05-phone-persistent-aim-route.png')});
  await phone.locator('#back').click();
  if(await phone.locator('#back').isDisabled())
    throw Error('BACK erased the entire plan instead of last movement');
  await phone.locator('#back').click();
  if(await phone.locator('#back').isDisabled())
    throw Error('BACK cleared multiple nodes rather than exactly one');
  await phone.locator('#back').click();
  if(!await phone.locator('#back').isDisabled())
    throw Error('BACK tap did not remove the final remaining order');
  await phone.screenshot({path:resolve(folder,'08-phone-back-cleared-one-by-one.png')});
  await phone.locator('#moreOrders').click();
  await phone.locator('#undo').click();
  if(await phone.locator('#redo').isDisabled())
    throw Error('Undo did not populate redo stack');
  await phone.locator('#redo').click();
  await phone.locator('#moreOrders').click();

  // Selecting a waypoint near a door exposes door actions only there.
  await phone.locator('#moreOrders').click();
  await phone.locator('#restart').click();
  await phone.locator('#moreOrders').click();
  const doorPoint=screen(301,505);
  await phone.touchscreen.tap(doorPoint.x,doorPoint.y);
  // The *final planned position* is enough to trigger door options;
  // requiring the player to tap its node first was a 076 UX regression.
  for(const action of ['ctxStack','ctxOpen','ctxKick','ctxHold']){
    if(!await phone.locator('#contextTools button[data-action="'+action+'"]').isVisible())
      throw Error('Missing contextual door option '+action+' at planned destination');
  }
  // The expanded TOOLS panel must never be obscured by a second tray.
  await phone.locator('#moreOrders').click();
  if(await phone.locator('#contextTools').isVisible())
    throw Error('Contextual aiming/door buttons obscure the TOOLS drawer');
  await phone.locator('#restart').click();
  await phone.locator('#moreOrders').click();
  await phone.touchscreen.tap(doorPoint.x,doorPoint.y);
  // Directly tapping the closed doorway must also expose entry actions,
  // even when no movement waypoint has been authored yet.
  const doorMarker=screen(302,532);
  await phone.touchscreen.tap(doorMarker.x,doorMarker.y);
  if(!await phone.locator('#contextTools button[data-action="ctxOpen"]').isVisible())
    throw Error('Tapping a door did not open the contextual door controls');
  const bounds=await phone.locator('#contextTools').boundingBox();
  const nav=await phone.locator('#moreOrders').boundingBox();
  if(!bounds||!nav||bounds.y+bounds.height>=nav.y)
    throw Error('Contextual tray overlaps the bottom action bar');
  await phone.screenshot({path:resolve(folder,'09-phone-door-context-no-overlap.png')});
  if(!await phone.locator('#breach3dCanvas').evaluate(c=>!!c.dataset.cameraMode))
    throw Error('3D camera status became unavailable after mode switching');
  await phone.locator('#contextTools button[data-action="ctxOpen"]').click();
  if(await phone.locator('#back').isDisabled())
    throw Error('Contextual door click failed to queue a door approach/order');
  await phone.screenshot({path:resolve(folder,'06-phone-contextual-door.png')});
  await phone.locator('#play').click();
  await phone.waitForFunction(()=>document.querySelector('#clock')?.textContent!=='00:00');
  await phone.locator('#play').click();
  if(await phone.locator('#phase').innerText()!=='PLANNING')
    throw Error('GO / PAUSE regression');
  await phone.locator('#moreOrders').click();
  await phone.locator('#viewIso').click();
  await phone.locator('#moreOrders').click();
  await phone.screenshot({path:resolve(folder,'07-phone-iso-battlefield.png')});

  // 081: editing a *completed* route by tapping its drawn line.
  // A line tap must insert between authored nodes rather than append to it.
  const routePhone=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:2,
    hasTouch:true,isMobile:true,
  });
  routePhone.on('pageerror',e=>errors.push('route editor: '+e.message));
  await routePhone.goto(url,{waitUntil:'domcontentloaded'});
  await routePhone.locator('#breachCanvas').waitFor();
  await routePhone.locator('#moreOrders').click();
  await routePhone.locator('#view2d').click();
  await routePhone.locator('#moreOrders').click();
  await routePhone.locator('#rook').click();
  const count=()=>routePhone.locator('#breachCanvas')
    .getAttribute('data-plan-nodes');
  const end=screen(400,628);
  await routePhone.touchscreen.tap(end.x,end.y);
  if(await count()!=='1')throw Error('Route test failed to author first waypoint');
  const middle=screen(350,624);
  const beforeInsert=await routePhone.evaluate(pt=>{
    const el=document.elementFromPoint(pt.x,pt.y);
    const box=document.querySelector('#contextTools')?.getBoundingClientRect();
    const selected=document.querySelector('#rook')?.getAttribute('aria-pressed');
    const canvas=document.querySelector('#breachCanvas');
    return {planNodes:canvas?.dataset.planNodes,
      selectedNode:canvas?.dataset.selectedNode,
      backDisabled:document.querySelector('#back')?.disabled,
      atTap:el?.tagName+'#'+el?.id,
      atTapClass:el?.getAttribute('class'),
      atTapText:el?.textContent?.slice(0,70),
      contextBox:box?{x:box.x,y:box.y,width:box.width,height:box.height}:null,
      selected,
      canvasMode:document.querySelector('#view2d')?.getAttribute('aria-pressed')};
  },middle);
  await routePhone.screenshot({path:resolve(folder,'17-route-before-insertion.png')});
  await routePhone.touchscreen.tap(middle.x,middle.y);
  if(await count()!=='2'){
    const diagnostic=await routePhone.locator('#breachCanvas').evaluate(c=>({
      planNodes:c.dataset.planNodes,
      selectedNode:c.dataset.selectedNode,
      routeTap:c.dataset.lastRouteTap,
      feed:document.querySelector('#feed')?.textContent,
    }));
    throw Error('Tapping existing route line did not insert intermediate node: '+
      JSON.stringify({diagnostic,beforeInsert}));
  }
  const selectedLineNode=await routePhone.locator('#breachCanvas')
    .getAttribute('data-selected-node');
  if(!selectedLineNode)
    throw Error('Inserted node was not selected for contextual aiming');
  if(!await routePhone.locator(
    '#contextTools button[data-action="ctxLook"]').isVisible())
    throw Error('Inserted node does not expose LOOK');
  await routePhone.screenshot({path:resolve(folder,'18-phone-route-node-insert.png')});
  await routePhone.locator(
    '#contextTools button[data-action="ctxLook"]').click();
  const direction=screen(340,684);
  await routePhone.touchscreen.tap(direction.x,direction.y);
  if(await count()!=='2')
    throw Error('Assigning LOOK to inserted node changed the route count');
  await routePhone.touchscreen.tap(middle.x,middle.y);
  if(!await routePhone.locator(
    '#contextTools button[data-action="ctxDelete"]').isVisible())
    throw Error('Inserted route node cannot be removed contextually');
  await routePhone.locator(
    '#contextTools button[data-action="ctxDelete"]').click();
  if(await count()!=='1')
    throw Error('Deleting inserted waypoint failed to restore original route');
  await routePhone.locator('#back').click();
  if(await count()!=='0')
    throw Error('Original destination was not preserved after deleting insertion');
  await routePhone.screenshot({path:resolve(folder,'19-phone-route-node-deleted.png')});
  await routePhone.close();

  const pc=await browser.newPage({
    viewport:{width:1220,height:810},deviceScaleFactor:1,
  });
  pc.on('pageerror',e=>errors.push(e.message));
  await pc.goto(url,{waitUntil:'domcontentloaded'});
  const desktop=async()=>pc.locator('#breach3dCanvas').evaluate(c=>({
    yaw:Number(c.dataset.cameraYaw),zoom:Number(c.dataset.cameraZoom),
  }));
  const before=await desktop();
  await pc.mouse.move(605,410);
  await pc.mouse.down({button:'right'});
  await pc.mouse.move(690,435,{steps:5});
  await pc.mouse.up({button:'right'});
  const after=await desktop();
  if(!(after.yaw<before.yaw-.12))throw Error('Desktop orbit direction incorrect');
  await pc.mouse.move(800,400);
  await pc.mouse.wheel(0,-330);
  if(!((await desktop()).zoom>before.zoom))
    throw Error('Desktop wheel zoom failed');
  await pc.screenshot({path:resolve(folder,'08-desktop-battlefield.png')});
  await pc.keyboard.press('Space');
  await pc.waitForTimeout(260);
  if(await pc.locator('#phase').innerText()!=='EXECUTING')
    throw Error('Desktop execution shortcut failed');
  await pc.keyboard.press('Space');
  if(await pc.locator('#phase').innerText()!=='PLANNING')
    throw Error('Desktop pause shortcut failed');
  // 079: independently inspect the presentation lab; the fixture must not
  // be attached to a normal battle or alter any combat result.
  const lab=await browser.newPage({viewport:{width:390,height:844},
    deviceScaleFactor:2,hasTouch:true,isMobile:true});
  lab.on('pageerror',e=>errors.push(e.message));
  await lab.goto(url.replace('breach.html','breach-visual-lab.html'),
    {waitUntil:'domcontentloaded'});
  await lab.locator('#breach3dCanvas').waitFor({state:'visible'});
  await lab.waitForTimeout(240);
  await lab.screenshot({path:resolve(folder,'13-lab-idle.png')});
  await lab.locator('#miss').click();
  await lab.waitForTimeout(80);
  await lab.screenshot({path:resolve(folder,'14-lab-miss.png')});
  await lab.locator('#hit').click();
  await lab.waitForTimeout(90);
  await lab.screenshot({path:resolve(folder,'15-lab-hit.png')});
  await lab.locator('#down').click();
  await lab.waitForTimeout(220);
  if(!((await lab.locator('footer').innerText()).includes('DOWN')))
    throw Error('Presentation lab did not show downed state');
  await lab.screenshot({path:resolve(folder,'16-lab-casualty.png')});
  await lab.locator('#reset').click();
  await lab.locator('#top').click();
  await lab.waitForTimeout(300);
  await lab.screenshot({path:resolve(folder,'17-lab-top.png')});
  if(errors.length)throw Error('Browser console exceptions: '+errors.join('; '));
  const manifest={initial,rotated,pan,pinch,visibleButtons,errors};
  await writeFile(resolve(folder,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Breach 076 gesture and contextual tactical verification passed',manifest);
}finally{await browser?.close();server.kill('SIGTERM');}