/** V11: exercise the production defaults on desktop and phone, including stale disabling URLs.
 * Actual WebGL counts, reset and buffer-cache checks; software timings are diagnostic.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const dir='artifacts/vfx-v11-production';
mkdirSync(dir,{recursive:true});
const vite=resolve('node_modules/vite/bin/vite.js');
const servers=[{port:4473,cwd:process.cwd()}].map(({port,cwd})=>{
 const origin='http://127.0.0.1:'+port;
 return {origin,process:spawn(process.execPath,[vite,'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd,stdio:'ignore'})};
});
let browser;
try{
 for(const s of servers){
  let ready=false;for(let i=0;i<120;i++){try{if((await fetch(s.origin+'/index.html')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
  assert.ok(ready,'Vite unavailable '+s.origin);
 }
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const viewport of [{width:390,height:844},{width:1440,height:900}])for(const variant of ['production','stale-disable-url']){
  const origin=servers[0].origin;
  const enabled=true,lights=true;
  const vegetation=false,smoke=true;
  const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))errors.push(m.text());});
  try{
   await page.route('**/vfx-suite-probe?**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   await page.goto(origin+'/vfx-suite-probe?coldBench=1'+(variant==='stale-disable-url'?'&vfxSuite=0&vfxGrass=1&vfxGrassCell=96&vfxBush=1&vfxBlood=0&vfxImpacts=0&vfxPulses=0&vfxGlass=0&vfxSmoke=0&vfxEvidence=0&vfxLights=0':''));
   const result=await page.evaluate(async({variant,enabled,lights,vegetation,smoke,viewport})=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {generateSite}=await import('/src/breach-site.ts');
    const {newSession,team}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    const {sessionWorldGeometry}=await import('/src/breach-world-context.ts');
    const {windowShardPose,settledWindowShardPose,WINDOW_SHARDS_PER_PANE,WINDOW_SETTLED_SHARDS_PER_PANE,WINDOW_SHARD_CAPACITY}=await import('/src/rendering/window-shatter-presentation.ts');
    const {debrisPoseContained}=await import('/src/rendering/breach-fracture-debris.ts');
    const site=generateSite(3,'standard',undefined,{mission:'intel'},{archetype:'house'});activateSite(site);
    const s=newSession(0,site.seed,'exterior-known','standard',undefined,site);
    const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);scene.applySite(site);
    const selected=team(s)[0].id,p=team(s)[0].p,root=scene.scene;
    if(scene.wallAudition?.atlas!==true||scene.wallAudition.effect!=='all'||!scene.patinaWallSurfaces.length||scene.patinaWallSurfaces.some(w=>!w.atlasSlot))throw Error('Production walls did not activate W3 atlas');
    if(scene.wallStructureUnified!==true||!scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-body').every(w=>w.mesh.userData.fieldworkUnifiedWall))throw Error('Production walls did not activate W4 unified geometry');
    scene.view.focus={x:p.x,y:p.y};scene.view.zoom=2.5;
    const draw=()=>scene.update(s,selected,1/60,null,true);
    const sample=async(beforeFrame=()=>{})=>{
     for(let i=0;i<8;i++){beforeFrame(i);draw();}
     const rows=[];
     for(let i=0;i<32;i++){
      beforeFrame(i+8);
      const start=performance.now();draw();const elapsed=performance.now()-start,stats=scene.performanceStats();
      rows.push({elapsed,calls:stats.calls,triangles:stats.triangles,textures:stats.textureCount});
      await new Promise(requestAnimationFrame);
     }
     const p95=k=>rows.map(r=>r[k]).sort((a,b)=>a-b)[Math.floor(rows.length*.95)];
     return {p95CpuWallMs:p95('elapsed'),p95Calls:p95('calls'),p95Triangles:p95('triangles'),p95Textures:p95('textures')};
    };
    const idle=await sample();
    s.seconds=2;
    s.shots=Array.from({length:20},(_,i)=>({id:500+i,shooterId:selected,targetId:null,start:{x:p.x-12,y:p.y+10},
      end:{x:p.x+(i%5)*4-8,y:p.y+20+Math.floor(i/5)*4},age:.08,hit:true,side:'blue',healthBefore:100,healthAfter:90,down:false,surface:['blood','wood','stone','metal','glass','dust'][i%6],impactHeight:12}));
    s.impactMarks=Array.from({length:24},(_,i)=>({id:800+i,p:{x:p.x+(i%6)*7-21,y:p.y+24+Math.floor(i/6)*7},surface:i%6===0?'wood':'blood',age:32}));
    s.dropped=Array.from({length:64},(_,i)=>({id:1000+i,p:{x:p.x+(i%8)*5-20,y:p.y+12+Math.floor(i/8)*5},side:'blue',age:3}));
    s.flashBursts=[{id:1300,p:{x:p.x,y:p.y+24},age:.1}];
    const pane=s.windows[0];if(!pane)throw Error('Seed lacks window');
    const world=sessionWorldGeometry(s);
    const expectedShards=settled=>{
     const result=[];
     for(let i=0;i<(settled?WINDOW_SETTLED_SHARDS_PER_PANE:WINDOW_SHARDS_PER_PANE);i++){
      const scratch={x:0,y:0,z:0,rx:0,ry:0,rz:0,scale:1,heightScale:1};
      const part=settled?(settledWindowShardPose(pane,s.seconds,i,scratch)?scratch:null):windowShardPose(pane,s.seconds,i);
      if(part&&debrisPoseContained(world,pane,part,part.heightScale??1))result.push(part);
     }
     return result;
    };
    const checkShardMatrices=(expected,label)=>{
     const mesh=scene.windowShards;
     if(!expected.length||mesh.count!==expected.length||mesh.count>WINDOW_SHARD_CAPACITY)
      throw Error(label+' count '+mesh.count+' expected '+expected.length);
     for(let i=0;i<mesh.count;i++){
      const a=mesh.instanceMatrix.array,j=i*16,p=expected[i];
      if(Math.abs(a[j+12]-p.x)>1e-3||Math.abs(a[j+13]-p.y)>1e-3||Math.abs(a[j+14]-p.z)>1e-3)
       throw Error(label+' GPU position mismatch at '+i);
     }
    };
    pane.shattered=true;pane.open=true;pane.integrity=0;pane.shatteredAt=0;
    const original=JSON.stringify({shots:s.shots,marks:s.impactMarks,dropped:s.dropped,bursts:s.flashBursts,windows:s.windows});
    const stress=await sample();
    let batch,stain,puffs,traces,pulses,bushes=0,pointLights=0,activeLights=0;
    root.traverse(n=>{if(n.userData.fieldworkDrawFamily==='material-impact-batch')batch=n;
      if(n.userData.fieldworkDrawFamily==='mixed-impact-stain')stain=n;
      if(n.userData.fieldworkDrawFamily==='shot-tracer-batch')traces=n;
      if(n.userData.fieldworkDrawFamily==='shot-pulse-batch')pulses=n;
      if(n.userData.fieldworkDrawFamily==='vfx-dust-puffs')puffs=n;
      if(n.userData.fieldworkV3Bush)bushes++;
      if(n.isPointLight&&n.userData.fieldworkRenderCategory==='effects'){pointLights++;if(n.intensity>0)activeLights++;}
    });
    const grass=root.getObjectByName('vfx-grass-preview');
    const counts={traces:traces?.count??0,pulses:pulses?.count??0,particles:batch?.count??0,puffs:puffs?.count??0,stains:stain?.count??0,shards:scene.windowShards?.count??0,bushes,grass:grass?.children.length??0,pointLights,activeLights};
    if(enabled){
     if(counts.traces!==20||counts.pulses!==20||counts.particles!==(smoke?86:95)||(smoke?counts.puffs<=0:counts.puffs!==0)||counts.shards!==expectedShards(true).length||(vegetation?(!counts.grass||!counts.bushes):(counts.grass||counts.bushes))||!stain)throw Error('Combined effect counts '+JSON.stringify(counts));
     checkShardMatrices(expectedShards(true),'V16 settled stress');
     const versions=[stain.instanceMatrix.version,stain.instanceColor?.version,stain.geometry.attributes.stainStyle.version,scene.windowShards.instanceMatrix.version,batch.instanceMatrix.version,puffs?.instanceMatrix.version,traces?.instanceMatrix.version,pulses?.instanceMatrix.version];
     draw();
     const after=[stain.instanceMatrix.version,stain.instanceColor?.version,stain.geometry.attributes.stainStyle.version,scene.windowShards.instanceMatrix.version,batch.instanceMatrix.version,puffs?.instanceMatrix.version,traces?.instanceMatrix.version,pulses?.instanceMatrix.version];
     if(JSON.stringify(versions)!==JSON.stringify(after))throw Error('Unchanged settled buffer was uploaded');
     if(lights?(pointLights!==2||activeLights<1):pointLights!==0)throw Error('Light budget mismatch');
    }else if(batch||stain||puffs||grass||bushes||pointLights)throw Error('Unexpected preview in default');
    // A fixed-age stress probe rewards the pause cache; separately exercise changing
    // payloads at matched ages, without altering the existing release thresholds.
    let liveStress=null;
    {
     // Compare buffer versions before/after actual age progression, not just pose counts.
     const opacityAttribute=traces?.geometry.attributes.dropletOpacity;
     const beforeOpacity=opacityAttribute?.version;
     s.shots.forEach(shot=>{shot.age=.10;});draw();
     if(enabled&&(!(opacityAttribute.version>beforeOpacity)||Math.abs(opacityAttribute.getX(0)-.5)>1e-5))throw Error('Moving tracer opacity failed to update');
     liveStress=await sample(i=>{
      const age=.04+(i%8)*.015;
      s.shots.forEach(shot=>{shot.age=age;});
      s.flashBursts.forEach(burst=>{burst.age=age;});
     });
     s.shots.forEach(shot=>{shot.age=.08;});s.flashBursts.forEach(burst=>{burst.age=.1;});draw();
    }
    if(JSON.stringify({shots:s.shots,marks:s.impactMarks,dropped:s.dropped,bursts:s.flashBursts,windows:s.windows})!==original)throw Error('Presentation mutated evidence');
    const snapshot=scene.renderer.domElement.toDataURL('image/png');
    const captures={};
    pane.shattered=false;pane.open=false;pane.shatteredAt=undefined;s.seconds=0;
    s.shots=[];s.impactMarks=[];s.dropped=[];s.flashBursts=[];draw();
    if(batch?.count||stain?.count||puffs?.count||traces?.count||pulses?.count||scene.windowShards?.count)throw Error('Empty/rewind left stale instances');
    // V15: exercise the normal simulation effect expiry, then inspect the
    // production GPU batch after all tracer/muzzle-flash records have gone.
    const {advanceTransientSimulationEffects}=await import('/src/breach-simulation-phases.ts');
    const cloudPoint={x:p.x,y:p.y+25};
    s.seconds=.41;s.shots=[{id:9000,shooterId:selected,targetId:null,start:{...p},end:cloudPoint,
      age:.39,hit:false,side:'blue',surface:'dust',impactHeight:1,muzzleHeight:26,
      healthBefore:0,healthAfter:0,down:false}];
    advanceTransientSimulationEffects(s,.02);
    s.seconds=.8;draw();
    if(s.shots.length||traces?.count||pulses?.count||!puffs?.count)throw Error('V15 cloud tail did not outlive shot');
    const cloudCount=puffs.count;
    const cloudScale=Math.hypot(...puffs.instanceMatrix.array.slice(0,3));
    if(cloudScale<8)throw Error('V15 cloud still too small');
    captures.dust=scene.renderer.domElement.toDataURL('image/png');
    s.seconds=4;advanceTransientSimulationEffects(s,.02);draw();
    if(puffs.count||s.atmosphere?.length)throw Error('Expired cloud lingered');
    // One shard mesh, deliberately larger planar pieces in air and on floor.
    pane.shattered=true;pane.open=true;pane.shatteredAt=4;s.seconds=4.15;
    scene.view.focus={x:pane.x,y:pane.y};draw();
    const burst=scene.windowShards.count;
    scene.windowShards.geometry.computeBoundingBox();
    const bb=scene.windowShards.geometry.boundingBox;
    if(bb.max.x-bb.min.x<2.5||bb.max.z-bb.min.z<3.5||bb.max.y-bb.min.y>.5)
      throw Error('V15 glass silhouette mismatch');
    checkShardMatrices(expectedShards(false),'V16 contained burst');
    if(burst>WINDOW_SHARDS_PER_PANE)throw Error('V15 burst budget exceeded');
    captures.glassBurst=scene.renderer.domElement.toDataURL('image/png');
    s.seconds=5.5;draw();
    checkShardMatrices(expectedShards(true),'V16 contained settled');
    if(scene.windowShards.count>WINDOW_SETTLED_SHARDS_PER_PANE)throw Error('V15 settled shard budget exceeded');
    captures.glassSettled=scene.renderer.domElement.toDataURL('image/png');
    const atmosphereWitness={cloudCount,cloudScale,burst,settled:scene.windowShards.count};
    // V17 production resources and actual directional shader pixels.
    const actors=Array.from(scene.actors.values());
    if(new Set(actors.map(a=>a.flash.geometry)).size!==1||new Set(actors.map(a=>a.flash.material)).size!==1)throw Error('V17 muzzle art not shared');
    const receiver=scene.transientLights.receiver;
    if(!receiver||receiver.texture.image.width!==64||receiver.texture.image.height!==2)throw Error('V17 receiver missing');
    const {enableWorldGraphicMaterial}=await import('/src/breach-graphic-world-lighting.ts');
    const {THREE}=await import('/scripts/verification/vfx-v17-three-probe.mjs');
    const testScene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-40,40,40,-40,.1,200);
    camera.position.set(0,90,0);camera.up.set(0,0,-1);camera.lookAt(0,0,0);
    const material=new THREE.MeshStandardMaterial({color:0x999999,roughness:1});
    enableWorldGraphicMaterial(material);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(80,80),material);floor.rotation.x=-Math.PI/2;testScene.add(floor);
    testScene.add(new THREE.AmbientLight(0xffffff,.25));
    const target=new THREE.WebGLRenderTarget(80,80),pixel=new Uint8Array(4);
    const read=(x,z)=>{scene.renderer.readRenderTargetPixels(target,x,z,1,1,pixel);return pixel[0]+pixel[1]+pixel[2];};
    const drawProbe=()=>{scene.renderer.setRenderTarget(target);scene.renderer.render(testScene,camera);return [read(20,40),read(60,40)];};
    const wall=(a,b)=>({a:{x:12,y:a},b:{x:12,y:b}});
    const probeWorld=walls=>({someWallNearPoint:(_p,_r,match)=>walls.some(match),someCoverNearPoint:()=>false});
    const offerProbe=walls=>{receiver.begin();receiver.offer(1,probeWorld(walls),[],{x:0,y:0},13,58,5,1);receiver.finish();};
    receiver.begin();const dark=drawProbe();
    offerProbe([wall(-100,100)]);const blocked=drawProbe();
    offerProbe([wall(-100,-20),wall(20,100)]);const opened=drawProbe();
    receiver.begin();const resetPixels=drawProbe();
    scene.renderer.setRenderTarget(null);target.dispose();floor.geometry.dispose();material.dispose();
    if(blocked[0]<=dark[0]+4||Math.abs(blocked[1]-dark[1])>3||opened[1]<=dark[1]+4||Math.abs(resetPixels[0]-dark[0])>3||Math.abs(resetPixels[1]-dark[1])>3)throw Error('V17 directional shader pixel mismatch '+JSON.stringify({dark,blocked,opened,resetPixels}));
    const illuminationWitness={dark,blocked,opened,resetPixels,muzzleGeometryCount:1,muzzleMaterialCount:1,reachBytes:receiver.texture.image.data.length};
    scene.applySite(null);if(batch?.count||stain?.count||puffs?.count||traces?.count||pulses?.count||scene.windowShards?.count||root.getObjectByName('vfx-grass-preview'))throw Error('Reset left stale instances');
    scene.renderer.dispose();scene.renderer.forceContextLoss();
    return {variant,viewport,seed:site.seed,idle,stress,liveStress,counts,atmosphereWitness,illuminationWitness,snapshot,captures};
   },{variant,enabled,lights,vegetation,smoke,viewport});
   assert.deepEqual(errors,[],'Shader/runtime errors');
   const {snapshot,captures,...record}=result;results.push(record);
   for(const [name,data] of Object.entries(captures))writeFileSync(dir+'/'+viewport.width+'-'+variant+'-'+name+'.png',Buffer.from(data.split(',')[1],'base64'));
   writeFileSync(dir+'/'+viewport.width+'-'+variant+'.png',Buffer.from(snapshot.split(',')[1],'base64'));
   console.log('VFX_V11_BROWSER '+JSON.stringify(record));
  }finally{await page.close();}
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(results,null,2)+'\n');
 for(const width of [390,1440]){
  const normal=results.find(r=>r.viewport.width===width&&r.variant==='production');
  const stale=results.find(r=>r.viewport.width===width&&r.variant==='stale-disable-url');
  assert.deepEqual(normal.counts,stale.counts,'Obsolete URL flags changed effect counts');
 }
 console.log('VFX_V11_PRODUCTION_COUNTS_OK');
}finally{await browser?.close();for(const s of servers)s.process.kill('SIGTERM');}
