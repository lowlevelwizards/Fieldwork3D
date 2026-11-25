import {spawn} from 'node:child_process';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4419,base='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const out='artifacts/w5-fog';mkdirSync(out,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));let browser;
try{
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/breach.html')).ok){ready=true;break;}}catch{}await delay(200);}
 if(!ready)throw Error('W5 Vite unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const [name,width,height] of [['phone',390,844],['desktop',1280,800]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/w5-probe*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
  await page.goto(base+'/w5-probe?wallDepth=opaque');
  const result=await page.evaluate(async ({width,height})=>{
   const {paintFogMask,maskBounds}=await import('/src/breach-fog-mask.ts');
   const {TacticalScene3D}=await import('/src/breach-3d.ts');
   const {generateSite}=await import('/src/breach-site.ts');
   const {newSession,team}=await import('/src/breach-game.ts');
   const {activateSite}=await import('/src/breach-core.ts');
   const {spatialSurfaceKnown}=await import('/src/breach-presentation.ts');
   const check=(v,m)=>{if(!v)throw Error(m);};
   const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
   const synthetic={seed:1,bounds:{minX:0,minY:0,maxX:300,maxY:300},rooms:[],walls:[{a:{x:150,y:0},b:{x:150,y:300}}],cover:[]};
   const s={site:synthetic,intel:{mode:'true-blind'},operators:[{id:'blue',side:'blue',health:2,p:{x:100,y:150},heading:0,posture:'stand'}],doors:[],seenGround:new Set()};
   const alpha=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
   paintFogMask(ctx,s);const pixels={front:alpha(125,150),behindWall:alpha(200,150),feet:alpha(97,150),outsideFoot:alpha(93,157)};
   check(pixels.front<20&&pixels.feet<200&&pixels.behindWall===255&&pixels.outsideFoot===255,'Fog pixel witness '+JSON.stringify(pixels));
   s.operators=[];s.seenGround=new Set(['micro:12,15']);paintFogMask(ctx,s);check(alpha(125,155)<180&&alpha(205,155)===255,'Memory reveal wrong');
   s.seenGround=new Set(['micro:20,15']);paintFogMask(ctx,s);check(alpha(125,155)===255&&alpha(205,155)<180,'Same-size memory replacement leaked');
   s.intel.mode='full-view';paintFogMask(ctx,s);check(alpha(125,155)===0&&alpha(205,155)===0,'Full view not cleared');
   s.intel.mode='true-blind';paintFogMask(ctx,s);check(alpha(125,155)===255,'Return from full view leaked');
   const scene=new TacticalScene3D();scene.resize(width,height);document.body.appendChild(scene.canvas);
   const make=(seed,archetype)=>generateSite(seed,'standard',undefined,{mission:'intel'},{archetype});
   const site=make(23,'townhouse');activateSite(site);
   const state=newSession(0,site.seed,'exterior-known','standard',undefined,site);
   scene.applySite(site);scene.setMode('iso');
   const id=team(state)[0].id,draw=(ss=state,selected=id,all=false,dt=1)=>scene.update(ss,selected,dt,null,all);
   const inventory=()=>scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-body');
   const known=()=>JSON.stringify({walls:[...state.intel.walls],doors:[...state.intel.doors],cover:[...state.intel.cover],seen:[...state.seenGround]});
   const visible=()=>JSON.stringify({walls:inventory().filter(w=>w.mesh.parent.visible).map(w=>w.index),actors:[...scene.actors].filter(([,a])=>a.root.visible).map(([i])=>i),cover:[...scene.coverGroups].filter(([,g])=>g.visible).map(([i])=>i)});
   scene.wallDepthOpaque=false;draw();const before=visible(),knowledge=known();
   scene.wallDepthOpaque=true;draw();check(visible()===before&&known()===knowledge,'Depth audition changed disclosure');
   const ext=inventory().find(w=>w.exterior&&spatialSurfaceKnown(state,'wall',w.index));check(ext,'No exterior wall');
   const {a,b}=ext.segment,mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
   scene.view.focus=mid;scene.view.zoom=2;
   scene.setReplayDirectorSubjects([{x:mid.x-dy/len*16,y:mid.y+dx/len*16}]);
   let faded=false,restored=false;
   for(let i=0;i<16;i++){scene.view.yaw=i*Math.PI/4;draw();const m=ext.mesh.material;
    if(m.opacity<.995){check(m.transparent&&!m.depthWrite,'Cut wall must not write depth');faded=true;}
    else{check(!m.transparent&&m.depthWrite,'Solid facade did not return opaque');if(faded){restored=true;break;}}
   }
   check(faded&&restored&&known()===knowledge,'Cut/restore or knowledge failed');
   scene.setReplayDirectorSubjects([]);
   const uploads=scene.fogTextureUpdateRequests;draw(state,id,false,.016);draw(state,id,false,.016);
   check(scene.fogTextureUpdateRequests===uploads,'Stationary frame reuploaded fog');
   state.seenGround.add('micro:1,1');state.seenGroundRevision++;draw(state,id,false,.001);
   check(scene.fogTextureUpdateRequests>uploads,'Memory revision not immediately uploaded');
   draw(state,id,true);draw(state,id,false,.001);check(scene.fogRefresh.owner===state,'Full-view return failed');
   const other=make(97,'retail');activateSite(other);
   const next=newSession(0,other.seed,'true-blind','standard',undefined,other);
   scene.applySite(other);draw(next,team(next)[0].id,false,.001);
   check(scene.fogRefresh.owner===next&&scene.smoothFog.visible&&!scene.exteriorKnownFog.visible,'Second mission inherited mask');
   check(inventory().every(w=>w.mesh.parent.visible===spatialSurfaceKnown(next,'wall',w.index)),'Second mission disclosed unknown walls');
   const b2=maskBounds(other);check(scene.fogCanvas.width>0&&scene.smoothFog.position.x===(b2.minX+b2.maxX)/2,'Second site projection wrong');
   window.w5Scene=scene;
   return {pixels,faded,restored,secondMission:true,disclosureParity:true,uploads:scene.fogTextureUpdateRequests};
  },{width,height});
  await page.screenshot({path:out+'/'+name+'.png'});
  if(errors.length)throw Error(errors.join(' | '));results.push({name,...result});await page.close();
 }
 writeFileSync(out+'/summary.json',JSON.stringify(results,null,2));console.log('W5_FOG_DEPTH '+JSON.stringify(results));
}finally{await browser?.close();server.kill('SIGTERM');}
