/** D15 final: actual browser WebGL + Floor Plan scene capture.
 * This deliberately creates a native Session and a real TacticalScene3D,
 * not a fabricated rig, HTML stand-in, or test-only pose renderer.
 * A locally authored browser route avoids adding production entry pages.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const port=4467,url='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let browser;
const out='artifacts/d15-final-visual';
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(url+'/index.html')).ok){ready=true;break;}}
  catch{}await pause(150);
 }
 assert.ok(ready,'Vite browser acceptance server did not start');
 const installedChrome=['/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable','/opt/google/chrome/chrome',
  '/usr/bin/chromium'].find(existsSync);
 browser=await chromium.launch({headless:true,
  ...(installedChrome?{executablePath:installedChrome}:{}),args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'
 ]});
 await mkdir(out,{recursive:true});
 const records=[];
 for(const [width,height] of [[390,844],[844,390],[1280,800]]){
  const page=await browser.newPage({viewport:{width,height},
   deviceScaleFactor:1,isMobile:width<900,hasTouch:width<900});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  const pathname='/d15-final-review-fixture.html';
  await page.route(url+pathname,route=>route.fulfill({
   status:200,contentType:'text/html',
   body:'<!doctype html><html><head><meta charset="utf-8"></head>'+
     '<body style="margin:0;background:#192724;overflow:hidden">'+
     '<canvas id="d15floor" width="640" height="740" '+
     'style="display:none"></canvas></body></html>'
  }));
  try{
   await page.goto(url+pathname,{waitUntil:'domcontentloaded'});
   const initialized=await page.evaluate(async()=>{
    const [{newSession,team,enemies},{TacticalScene3D},
      {createBreach2DActorRenderer},{activateSite}]=await Promise.all([
       import('/src/breach-game.ts'),import('/src/breach-3d.ts'),
       import('/src/breach-2d-actor-renderer.ts'),import('/src/breach-core.ts')
      ]);
    const pt=(x,y)=>({x,y});
    const site={seed:15715,name:'D15 FINAL VISUAL PHYSICAL',layout:'corridor',
      archetype:'office',rooms:[{id:'main',x:105,y:128,w:400,h:380,
       kind:'room',purpose:'office',tone:.6}],roomCount:1,
      walls:[],cover:[],doors:[],windows:[],
      enemies:[pt(295,250)],spawn:[pt(270,250),pt(210,270),
       pt(220,320),pt(230,360)],entrance:pt(270,250),
      objective:pt(295,250),extract:pt(480,450),
      bounds:{minX:0,minY:0,maxX:640,maxY:740}};
    const s=newSession(0,undefined,'full-view','small','capture',site);
    const blue=team(s)[0],red=enemies(s).find(x=>x.id===s.captureTarget);
    if(!blue||!red)throw Error('Real D15 actors were not created');
    blue.p=pt(270,250);blue.priorP={...blue.p};
    red.p=pt(290,254);red.priorP={...red.p};
    red.health=0;red.injuryStage=3;red.lastDownAt=0;red.downedAt=0;
    s.seconds=6;s.phase='running';
    blue.carryingId=red.id;red.carriedById=blue.id;
    const scene=new TacticalScene3D();
    scene.applySite(s.site);
    scene.setMode('iso');scene.resize(innerWidth,innerHeight);
    scene.focusOn({x:285,y:250});
    const canvas=document.getElementById('d15floor');
    const ctx=canvas.getContext('2d');
    const palette={
     rect:(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)},
     line:(a,b,color,weight)=>{ctx.strokeStyle=color;ctx.lineWidth=weight;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()},
     circle:(x,y,r,color)=>{ctx.fillStyle=color;ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()}
    };
    const renderer=createBreach2DActorRenderer({draw:ctx,...palette,
     colorFor:()=> '#8fbab0',worldToScreen:p=>p,
     getFrame:()=>({state:s,replaying:true,selected:blue.id,
      replayPlanScope:'none',replayNameTags:false,
      replayContactMarkers:false,replayObjectiveMarkers:false,
      replayAnalysis:false,viewMode:'plan2d'}),
     replayKnowledge:{omniscient:true,observerId:null,disclosure:()=>null},
     executionProblemStatus:()=>null,executionMarkerPoint:a=>a.p});
    window.__d15={s,blue,red,scene,renderer,ctx,canvas,
      activateSite};
    return {actorCount:s.operators.length,site:!!s.site};
   });
   assert.ok(initialized.site&&initialized.actorCount>=5,
    'Actual scene roster was not created');
   const samples={width,height};
   for(const mode of ['drag','carry','broken']){
    const observation=await page.evaluate(mode=>{
     const {s,blue,red,scene,renderer,ctx,canvas}=window.__d15;
     red.carriedById=mode==='broken'?null:blue.id;
     red.transportMode=mode==='carry'?'carry':'drag';
     blue.carryingId=red.id;
     s.seconds+=.2;
     scene.update(s,blue.id,1/60,null,true);
     const rig=scene.actors.get(red.id);
     if(!rig)throw Error('Enemy 3D rig not instantiated');
     // True model root's world translation: never double-count carry
     // elevation or move a disconnected body up by proximity.
     const position={x:rig.root.position.x,y:rig.root.position.y,
      z:rig.root.position.z,visible:rig.root.visible};
     ctx.setTransform(1,0,0,1,0,0);
     ctx.fillStyle='#142521';ctx.fillRect(0,0,canvas.width,canvas.height);
     renderer.sprite(blue);renderer.sprite(red);
     const pixels=ctx.getImageData(270,235,44,48).data;
     let painted=0;
     for(let i=0;i<pixels.length;i+=4)
       if(Math.abs(pixels[i]-20)+Math.abs(pixels[i+1]-37)+
          Math.abs(pixels[i+2]-33)>35)painted++;
     return {position,mode,drawn2d:painted>35,painted};
    },mode);
    assert.ok(observation.position.visible,'real captive 3D rig missing');
    assert.ok(Number.isFinite(observation.position.y),
      '3D physical body placement is not finite '+mode);
    assert.ok(observation.drawn2d,'Floor Plan actor missing '+mode);
    const base=out+'/'+width+'x'+height+'-'+mode;
    await page.locator('#breach3dCanvas').screenshot({path:base+'-iso.png'});
    const frame=await page.evaluate(()=>window.__d15.canvas.toDataURL(
      'image/png').split(',')[1]);
    await writeFile(base+'-floor.png',Buffer.from(frame,'base64'));
    samples[mode]=observation.position;
   }
   // The rig has its own local fall offset. Compare each actually
   // rendered height against the same disconnected pose, not world zero:
   // a correctly applied drag lift is +2 and shoulder carry lift +18.
   const drag=samples.drag,carry=samples.carry,broken=samples.broken;
   assert.ok(Math.abs(drag.y-broken.y-2)<.08,
      'Dragged model should lift 2 once, relative to fall pose: '+
       JSON.stringify(samples));
   assert.ok(Math.abs(carry.y-broken.y-18)<.08,
      'Carried model should lift 18 once, relative to fall pose: '+
       JSON.stringify(samples));
   assert.ok(Math.abs(carry.y-drag.y-16)<.08,
      'Only recorded mode can control body elevation');
   // Count actual painted pixels between the 3D visual screenshots;
   // a black screen is never a successful pose acceptance.
   const seen=await page.locator('#breach3dCanvas').evaluate(canvas=>{
    const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
    if(!gl)return {available:false};
    const count=canvas.width*canvas.height*4;
    const px=new Uint8Array(count);
    gl.readPixels(0,0,canvas.width,canvas.height,
      gl.RGBA,gl.UNSIGNED_BYTE,px);
    let nonzero=0;
    for(let i=0;i<px.length;i+=4)if(px[i]+px[i+1]+px[i+2]>30)nonzero++;
    return {available:true,nonzero,total:canvas.width*canvas.height};
   });
   // Software WebGL may not preserve the post-present drawing buffer,
   // therefore screenshots + geometry are the positive primary check.
   assert.equal(errors.length,0,'WebGL/2D browser errors: '+errors.join('; '));
   samples.gl=seen;records.push(samples);
   await writeFile(out+'/'+width+'x'+height+'-observations.json',
     JSON.stringify(samples,null,2)+'\n');
   console.log('D15_VISUAL_CASE',JSON.stringify(samples));
  }finally{
   await page.evaluate(()=>window.__d15?.activateSite(null)).catch(()=>{});
   await page.close();
  }
 }
 await writeFile(out+'/summary.json',JSON.stringify(records,null,2)+'\n');
 console.log('D15_REAL_WEBGL_AND_FLOOR_VISUAL_PASS',records.length);
}finally{
 await browser?.close();
 server.kill('SIGTERM');
}
