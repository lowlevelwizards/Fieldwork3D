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
  phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(url,{waitUntil:'domcontentloaded'});
  await phone.locator('#breachCanvas').waitFor();
  await phone.waitForTimeout(320);
  const dims=await phone.locator('#breachCanvas').evaluate(c=>({
    width:c.width,height:c.height,rect:c.getBoundingClientRect().toJSON(),
  }));
  if(dims.width<390||dims.height<844)
    throw Error('Tactics canvas is not full screen: '+JSON.stringify(dims));
  if((await phone.locator('#phase').innerText())!=='PLANNING')
    throw Error('Opening frame is not paused/plannable');
  await phone.screenshot({path:resolve(folder,'01-phone-planning.png')});
  if(!await phone.locator('#breach3dCanvas').isVisible())
    throw Error('Default opening is not the isometric Three.js battlefield');
  await phone.screenshot({path:resolve(folder,'09-phone-isometric-opening.png')});
  // 075: default on-map touch gestures, no exposed camera HUD.
  if(await phone.locator('.camera-tools').count())
    throw Error('Camera button cluster still shown');
  if(await phone.locator('#viewTop').isVisible())
    throw Error('Camera presets not tucked into TOOLS');
  const cameraState=async()=>phone.locator('#breach3dCanvas').evaluate(c=>({
    yaw:Number(c.dataset.cameraYaw),pitch:Number(c.dataset.cameraPitch),
    zoom:Number(c.dataset.cameraZoom),
    x:Number(c.dataset.cameraFocusX),y:Number(c.dataset.cameraFocusY),
  }));
  const near=(a,b,tolerance=.025)=>Math.abs(a-b)<tolerance;
  const touch=await phone.context().newCDPSession(phone);
  const touchGesture=async(initial,changes)=>{
    const points=pp=>pp.map((p,i)=>({id:i+1,x:p[0],y:p[1]}));
    await touch.send('Input.dispatchTouchEvent',
      {type:'touchStart',touchPoints:points(initial)});
    for(const frame of changes){
      await touch.send('Input.dispatchTouchEvent',
        {type:'touchMove',touchPoints:points(frame)});
      await phone.waitForTimeout(50);
    }
    await touch.send('Input.dispatchTouchEvent',
      {type:'touchEnd',touchPoints:[]});
    await phone.waitForTimeout(65);
  };
  const origin=await cameraState();
  if(!near(origin.zoom,1.25))throw Error('Unexpected opening zoom');
  if(!await phone.locator('#back').isDisabled())
    throw Error('Unexpected initial movement order');
  await touchGesture([[165,420]],[[[190,426]],[[220,439]],[[260,451]]]);
  const orbited=await cameraState();
  if(!(orbited.yaw>origin.yaw+.15))
    throw Error('One finger orbit has reversed horizontal direction');
  if(!(orbited.pitch>origin.pitch+.05))
    throw Error('One finger orbit has reversed vertical direction');
  if(!near(orbited.x,origin.x,1)||!near(orbited.y,origin.y,1))
    throw Error('Orbit shifts map focus');
  if(!await phone.locator('#back').isDisabled())
    throw Error('Single finger orbit accidentally issued movement');
  await phone.screenshot({path:resolve(folder,'14-phone-direct-orbit.png')});
  await touchGesture([[153,406],[240,406]],
    [[[179,390],[266,390]],[[206,379],[293,379]]]);
  const panned=await cameraState();
  if(near(panned.x,orbited.x,3)&&near(panned.y,orbited.y,3))
    throw Error('Two fingers did not pan');
  if(!near(panned.yaw,orbited.yaw,.04)||!near(panned.zoom,orbited.zoom,.04))
    throw Error('Two finger pan unexpectedly changed yaw or zoom');
  await touchGesture([[155,475],[217,475]],
    [[[143,475],[229,475]],[[130,475],[242,475]],[[116,475],[256,475]]]);
  const pinched=await cameraState();
  if(!(pinched.zoom>panned.zoom*1.6))
    throw Error('Pinch did not zoom in');
  if(!near(pinched.yaw,panned.yaw,.04))
    throw Error('Pinch unexpectedly rotated battlefield');
  if(!await phone.locator('#back').isDisabled())
    throw Error('Two finger gesture accidentally issued movement');
  await phone.screenshot({path:resolve(folder,'15-phone-direct-pinch.png')});
  await phone.locator('#moreOrders').click();
  if(await phone.locator('#moreOrders').getAttribute('aria-pressed')!=='true')
    throw Error('TOOLS drawer failed to open');
  await phone.locator('#cameraFit').click();
  const fitted=await cameraState();
  if(!near(fitted.x,320,.2)||!near(fitted.y,370,.2)||
    !near(fitted.zoom,1.25,.025))throw Error('FIT cannot recover map');
  await phone.locator('#viewTop').click();
  if(await phone.locator('#viewTop').getAttribute('aria-pressed')!=='true')
    throw Error('TOP preset unavailable inside TOOLS');
  await phone.screenshot({path:resolve(folder,'10-phone-topdown-3d.png')});
  await phone.locator('#view2d').click();
  if(await phone.locator('#view2d').getAttribute('aria-pressed')!=='true')
    throw Error('2D fallback unavailable inside TOOLS');
  await phone.screenshot({path:resolve(folder,'11-phone-debug-2d.png')});
  // Screen projection is intentionally identical on touch and desktop.
  const screen=(x,y,width,height)=>{
    const scale=Math.min((width-20)/640,(height-172)/740);
    return {x:width/2-640*scale/2+x*scale,
      y:height/2-740*scale/2-11+y*scale};
  };
  await phone.locator('#rook').click();
  const point=screen(303,491,390,844);
  await phone.touchscreen.tap(point.x,point.y);
  await phone.waitForTimeout(180);
  await phone.locator('#moss').click();
  const mossPoint=screen(342,509,390,844);
  await phone.touchscreen.tap(mossPoint.x,mossPoint.y);
  await phone.screenshot({path:resolve(folder,'02-phone-two-routes.png')});
  await phone.locator('#play').click();
  await phone.waitForFunction(()=>document.querySelector('#clock')?.textContent!=='00:00',null,{timeout:12000});
  const elapsed=await phone.locator('#clock').innerText();
  if(elapsed==='00:00')throw Error('GO did not advance tactical time');
  await phone.locator('#play').click();
  if((await phone.locator('#phase').innerText())!=='PLANNING')
    throw Error('Pause did not return to planning');
  const paused=await phone.locator('#clock').innerText();
  await phone.waitForTimeout(350);
  if((await phone.locator('#clock').innerText())!==paused)
    throw Error('Tactical clock continued while paused');
  await phone.screenshot({path:resolve(folder,'03-phone-paused-after-advance.png')});
  await phone.locator('#aim').click();
  if(await phone.locator('#aim').getAttribute('aria-pressed')!=='true')
    throw Error('LOOK mode did not activate');
  await phone.touchscreen.tap(point.x+20,point.y-32);
  if(await phone.locator('#aim').getAttribute('aria-pressed')!=='false')
    throw Error('LOOK mode not consumed by map tap');
  await phone.locator('#restart').click();
  if(await phone.locator('#clock').innerText()!=='00:00')
    throw Error('Mission reset did not reset the clock');
  // Builds 053–062: verify authored order controls, not merely the old GO.
  await phone.locator('#rook').click();
  const stationApproach=screen(303,579,390,844);
  await phone.touchscreen.tap(stationApproach.x,stationApproach.y);
  if(await phone.locator('#undo').isDisabled())
    throw Error('Authored waypoint did not enter editable history');
  await phone.locator('#undo').click();
  if(await phone.locator('#redo').isDisabled())
    throw Error('Undo did not populate redo history');
  await phone.locator('#redo').click();
  await phone.locator('#stance').click();
  if(await phone.locator('#stance').getAttribute('aria-pressed')!=='true')
    throw Error('Low posture did not toggle');
  await phone.locator('#method').click();
  if(await phone.locator('#method').innerText()!=='KICK')
    throw Error('Door action method did not cycle');
  await phone.locator('#door').click();
  if(await phone.locator('#door').getAttribute('aria-pressed')!=='true')
    throw Error('Door selection did not activate');
  const frontDoor=screen(303,532,390,844);
  await phone.touchscreen.tap(frontDoor.x,frontDoor.y);
  if(await phone.locator('#door').getAttribute('aria-pressed')!=='false')
    throw Error('Door order was not committed by tapping entrance');
  await phone.locator('#wait').click();
  await phone.locator('#sync').click();
  await phone.screenshot({path:resolve(folder,'04-phone-expanded-plan.png')});
  await phone.locator('#variant').click();
  if(await phone.locator('#variant').innerText()!=='SITE 2/3')
    throw Error('Scenario variation did not advance');
  await phone.screenshot({path:resolve(folder,'05-phone-alternate-site.png')});
  // Contextual doors are offered from a PLANNED waypoint, not just the soldier.
  await phone.locator('#restart').click();
  const nearDoor=screen(302,506,390,844);
  await phone.touchscreen.tap(nearDoor.x,nearDoor.y);
  await phone.touchscreen.tap(nearDoor.x,nearDoor.y);
  if(!await phone.locator('#contextTools button[data-action="ctxOpen"]').isVisible())
    throw Error('Door options missing beside near-door planned waypoint');
  await phone.screenshot({path:resolve(folder,'12-phone-contextual-door.png')});
  await phone.locator('#contextTools button[data-action="ctxOpen"]').click();
  if(await phone.locator('#back').isDisabled())
    throw Error('Context door order was not inserted into active plan');
  await phone.locator('#restart').click();
  await phone.locator('#viewIso').click();
  if(await phone.locator('#viewIso').getAttribute('aria-pressed')!=='true')
    throw Error('ISO camera did not restore');
  await phone.touchscreen.tap(195,420);
  if(await phone.locator('#back').isDisabled())
    throw Error('Camera-aware isometric map picking did not queue movement');
  await phone.screenshot({path:resolve(folder,'13-phone-isometric-planned-route.png')});
  // Historical 063 touch coordinates are defined in legacy map pixels, so
  // switch to the 2D reference view for those regression checks.
  await phone.locator('#view2d').click();
  if(await phone.locator('#view2d').getAttribute('aria-pressed')!=='true')
    throw Error('Could not restore 2D view for legacy gesture audit');
  // Build 063: verify one-step back without deleting the whole route.
  await phone.locator('#rook').click();
  const firstNode=screen(300,595,390,844);
  const secondNode=screen(301,570,390,844);
  await phone.touchscreen.tap(firstNode.x,firstNode.y);
  await phone.touchscreen.tap(secondNode.x,secondNode.y);
  if(await phone.locator('#back').isDisabled())throw Error('BACK did not arm for planned route');
  await phone.locator('#back').click();
  if(await phone.locator('#back').isDisabled())
    throw Error('BACK incorrectly erased the entire route');
  await phone.screenshot({path:resolve(folder,'06-phone-back-one.png')});
  // STRAFE on the next segment; LOOK can set its independent facing.
  await phone.locator('#strafe').click();
  if(await phone.locator('#strafe').getAttribute('aria-pressed')!=='true')
    throw Error('Strafe did not arm on touch');
  const strafeTarget=screen(348,592,390,844);
  await phone.touchscreen.tap(strafeTarget.x,strafeTarget.y);
  await phone.touchscreen.tap(strafeTarget.x,strafeTarget.y);
  if(await phone.locator('#strafe').getAttribute('aria-pressed')!=='true')
    throw Error('Selected strafe node is not marked in the UI');
  await phone.locator('#aim').click();
  await phone.touchscreen.tap(...Object.values(screen(348,515,390,844)));
  await phone.screenshot({path:resolve(folder,'07-phone-strafe-order.png')});
  // Each sweep is one physical, undoable node, not a string of magic moves.
  await phone.locator('#restart').click();
  await phone.locator('#pieLeft').click();
  if(await phone.locator('#pieLeft').getAttribute('aria-pressed')!=='true')
    throw Error('Counter-clockwise pie did not arm');
  // Free-pivot sweeps intentionally reject invalid or intersecting arcs.
  // Use a proven clear yard pivot instead of assuming the door itself works.
  const freePivot=screen(325,599,390,844);
  await phone.touchscreen.tap(freePivot.x,freePivot.y);
  if(await phone.locator('#pieLeft').getAttribute('aria-pressed')!=='false')
    throw Error('Pie selection did not return to planning');
  if(await phone.locator('#back').isDisabled())
    throw Error('Free-pivot PIE did not create a plan order: '+
      JSON.stringify({hint:await phone.locator('#hint').innerText(),
        event:await phone.locator('#feed').innerText(),
        backDisabled:await phone.locator('#back').isDisabled(),
        mode:await phone.locator('#view2d').getAttribute('aria-pressed')}));
  await phone.screenshot({path:resolve(folder,'08-phone-pie-arc.png')});
  await phone.locator('#back').click();
  if(!await phone.locator('#back').isDisabled())
    throw Error('Single BACK did not remove entire pie maneuver');
  const pc=await browser.newPage({
    viewport:{width:1220,height:810},deviceScaleFactor:1,
  });
  pc.on('pageerror',e=>errors.push(e.message));
  await pc.goto(url,{waitUntil:'domcontentloaded'});
  await pc.locator('#phase').waitFor();
  await pc.screenshot({path:resolve(folder,'04-desktop-opening.png')});
  const pcCam=async()=>pc.locator('#breach3dCanvas').evaluate(c=>({
    yaw:Number(c.dataset.cameraYaw),zoom:Number(c.dataset.cameraZoom),
    x:Number(c.dataset.cameraFocusX),y:Number(c.dataset.cameraFocusY),
  }));
  const startPc=await pcCam();
  await pc.mouse.move(605,410);
  await pc.mouse.down({button:'right'});
  await pc.mouse.move(680,435,{steps:5});
  await pc.mouse.up({button:'right'});
  const pcOrbited=await pcCam();
  if(near(pcOrbited.yaw,startPc.yaw,.15))
    throw Error('Desktop right-button drag failed to orbit the battlefield');
  if(!near(pcOrbited.x,startPc.x,1)||!near(pcOrbited.y,startPc.y,1))
    throw Error('Desktop orbit drifted toward a selected unit');
  await pc.mouse.move(620,407);
  await pc.mouse.down({button:'middle'});
  await pc.mouse.move(670,400,{steps:5});
  await pc.mouse.up({button:'middle'});
  const pcPanned=await pcCam();
  if(near(pcPanned.x,pcOrbited.x,3)&&near(pcPanned.y,pcOrbited.y,3))
    throw Error('Desktop middle-button PAN did not move the focus');
  await pc.mouse.move(800,400);
  await pc.mouse.wheel(0,-350);
  const pcZoomed=await pcCam();
  if(!(pcZoomed.zoom>startPc.zoom))
    throw Error('Desktop wheel did not zoom toward pointer');
  await pc.screenshot({path:resolve(folder,'15-desktop-orbit-pan-zoom.png')});
  await pc.keyboard.press('Space');
  await pc.waitForTimeout(280);
  if(await pc.locator('#phase').innerText()!=='EXECUTING')
    throw Error('Space should start execution on desktop');
  await pc.keyboard.press('Space');
  if(await pc.locator('#phase').innerText()!=='PLANNING')
    throw Error('Space should pause on desktop');
  if(errors.length)throw Error('Browser console exceptions: '+errors.join('; '));
  const manifest={dims,elapsed,paused,errors};
  await writeFile(resolve(folder,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Breach 052 touch & desktop verification passed',manifest);
}finally{await browser?.close();server.kill('SIGTERM');}
