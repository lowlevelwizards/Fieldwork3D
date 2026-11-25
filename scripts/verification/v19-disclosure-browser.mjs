/** Matched V19 browser witness on the real source renderer and recorder.
 * Compare base/head with frame memo off and head with memo on; timings
 * are software WebGL CPU wall time, not mobile-device FPS. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const output='artifacts/v19-disclosure';
mkdirSync(output,{recursive:true});
const base=process.env.V19_BASE_DIR;
assert.ok(base,'matched base checkout required');
const variants=[{name:'base',dir:base,memo:false},{name:'head',dir:'.',memo:false},{name:'head-memo',dir:'.',memo:true}];
const results=[];
let browser;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const variant of variants){
  const origin='http://127.0.0.1:4493';
  const server=spawn(process.execPath,[resolve(variant.dir,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4493','--strictPort'],{cwd:variant.dir,stdio:'ignore'});
  try{
   let ready=false;for(let i=0;i<120;i++){try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}await wait(200);}
   assert.ok(ready,'Vite startup '+variant.name);
   for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
    const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    try{
     await page.route('**/v19-probe?**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;overflow:hidden"></body></html>'}));
     // Head-memo exercises the production default, not an enabling URL.
     await page.goto(origin+'/v19-probe?coldBench=1'+(variant.memo?'':'&v19FrameSight=0'));
     const record=await page.evaluate(async({viewport,variant})=>{
      const {TacticalScene3D}=await import('/src/breach-3d.ts');
      const {generateSite}=await import('/src/breach-site.ts');
      const {newSession,team,observerPointVisible}=await import('/src/breach-game.ts');
      const {activateSite}=await import('/src/breach-core.ts');
      const {snapshot,applyReplayFrame,MissionRecorder}=await import('/src/breach-replay.ts');
      const site=generateSite(23,'small',undefined,{mission:'intel'},{archetype:'house'});
      activateSite(site);
      const s=newSession(0,site.seed,'true-blind','small',undefined,site);
      const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);scene.applySite(site);
      if(!scene.canvas.isConnected)document.body.appendChild(scene.canvas);
      scene.setMode('iso');
      const a=team(s)[0],selected=a.id,p={...a.p};
      scene.view.focus=p;scene.view.zoom=2;
      const draw=(policy=null,omni=false)=>scene.update(s,selected,1/60,null,omni,null,null,null,policy);
      const stats=()=>scene.performanceStats();
      // Presenter stats count allocated active-ID meshes, including hidden
      // ones retained in the pool. Inspect actual visible meshes instead.
      const visibleCount=map=>[...map.values()].filter(m=>m.visible&&m.parent).length;
      const count=()=>({traces:scene.tracerBatch?.mesh.count??0,pulses:scene.impactPulseBatch?.mesh.count??0,
       marks:scene.impactDecalMesh?.count??0,particles:scene.dropletPreview?.mesh.count??0,
       puffs:scene.dustPuffs?.mesh.count??0,...scene.combatEffects.stats(),
       grenades:visibleCount(scene.combatEffects.thrown),flashes:visibleCount(scene.combatEffects.detonations)});
      const p95=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length*.95)];
      const measure=async()=>{
       for(let i=0;i<5;i++)draw();
       const before=stats().presentationSight,rows=[];
       for(let i=0;i<20;i++){
        const start=performance.now();draw();const ms=performance.now()-start,k=stats();
        rows.push({ms,calls:k.calls,triangles:k.triangles,textures:k.textureCount,geometries:k.geometryCount});
        await new Promise(requestAnimationFrame);
       }
       const after=stats().presentationSight;
       const deltas=Object.fromEntries(['queries','hits','misses','bypasses','frameHits'].map(k=>[k,(after[k]??0)-(before[k]??0)]));
       return {p95Ms:p95(rows.map(r=>r.ms)),p95Calls:p95(rows.map(r=>r.calls)),p95Triangles:p95(rows.map(r=>r.triangles)),textures:rows.at(-1).textures,geometries:rows.at(-1).geometries,
        sight:deltas,sourceCalls:deltas.misses+deltas.bypasses,effects:count()};
      };
      const quiet=await measure();
      const facing={x:Math.cos(a.heading),y:Math.sin(a.heading)};
      const ahead=(distance,offset=0)=>({x:p.x+facing.x*distance-facing.y*offset,y:p.y+facing.y*distance+facing.x*offset});
      const witness=[8,12,16,20,24,30,36,42].map(n=>ahead(n)).find(p=>observerPointVisible(s,a,p));
      if(!witness)throw Error('No observed point in fixture');
      s.phase='running';s.seconds=2;
      s.shots=Array.from({length:20},(_,i)=>({id:500+i,shooterId:selected,targetId:null,start:ahead(6),end:i>=16?witness:ahead(12+i%5*3,i%3*3),age:.08,hit:true,side:'blue',healthBefore:100,healthAfter:90,down:false,surface:['blood','wood','stone','metal','glass','dust'][i%6],impactHeight:12,firedAt:1.92}));
      s.impactMarks=Array.from({length:24},(_,i)=>({id:800+i,p:i>=20?witness:ahead(20+i%6*3,i%4*4),surface:'blood',bloodAmount:1,age:3}));
      s.dropped=Array.from({length:32},(_,i)=>({id:1000+i,p:ahead(12+i%8*3,i%4*4),side:'blue',age:3}));
      s.flashBursts=[{id:1300,p:witness,age:.1}];
      const immutable=JSON.stringify({shots:s.shots,marks:s.impactMarks,dropped:s.dropped,bursts:s.flashBursts});
      const stress=await measure();
      if(JSON.stringify({shots:s.shots,marks:s.impactMarks,dropped:s.dropped,bursts:s.flashBursts})!==immutable)throw Error('Visual mutation');
      // Real capture path including structural sharing; capture static stress
      // at exact 20 Hz timestamps, not fake per-ray timing.
      const recorder=new MissionRecorder(),captureMs=[];
      for(let i=0;i<100;i++){
       s.seconds=2+i*.05;
       for(const shot of s.shots)shot.age=.08;
       const begin=performance.now();recorder.capture(s,true);captureMs.push(performance.now()-begin);
      }
      const frame=recorder.frames.at(-1);
      if(!frame)throw Error('No recorder frames');
      const bytes=JSON.stringify(recorder.frames).length;
      const effectBytes=recorder.frames.reduce((n,f)=>n+(f.knowledge?.effectEvidence?JSON.stringify(f.knowledge.effectEvidence).length:0),0);
      const uniqueRows=new Set(recorder.frames.map(f=>f.knowledge?.effectEvidence?.rows).filter(Boolean)).size;
      const capture={frames:recorder.frames.length,p50Ms:captureMs.slice().sort((a,b)=>a-b)[50],p95Ms:p95(captureMs),jsonChars:bytes,effectJsonChars:effectBytes,uniqueRows};
      // Seek into an actual recorded frame. Then clear only its new optional
      // evidence to simulate a legacy archive and seek back again.
      applyReplayFrame(s,frame);
      const policy={mode:'operator',observerId:selected};
      draw(policy);const personal=count();
      const image=scene.canvas.toDataURL('image/png');
      applyReplayFrame(s,{...frame,knowledge:{...frame.knowledge,effectEvidence:undefined}});
      draw(policy);const legacy=count();
      applyReplayFrame(s,frame);draw(policy);const restored=count();
      if(JSON.stringify(personal)!==JSON.stringify(restored))throw Error('Personal seek unstable');
      if(variant.name!=='base'){
       if(Object.values(legacy).some(Boolean))throw Error('Legacy personal effect leak '+JSON.stringify(legacy));
       const evidence=frame.knowledge?.effectEvidence;
       if(!evidence||evidence.rows.length>8||evidence.observers.length>4||!evidence.observers.some(o=>o[0]===selected&&o[1]))throw Error('No bounded recorded observer witness');
       if(personal.traces||personal.particles||personal.puffs||personal.casings||personal.magazines||personal.grenades||personal.flashes)throw Error('Unrecorded personal effect');
       if(!personal.pulses&&!personal.marks)throw Error('No recorded impact/ground draw witness');
      }
      scene.applySite(null);const cleared=count();
      if(Object.values(cleared).some(Boolean))throw Error('Site reset leaves effects');
      scene.renderer.dispose();scene.renderer.forceContextLoss();
      return {variant:variant.name,viewport:viewport.width,quiet,stress,capture,personal,legacy,restored,cleared,image};
     },{viewport,variant});
     assert.deepEqual(errors,[],'Browser/GL errors');
     const {image,...row}=record;results.push(row);
     writeFileSync(output+'/'+variant.name+'-'+viewport.width+'-personal.png',Buffer.from(image.split(',')[1],'base64'));
     console.log('V19_BROWSER '+JSON.stringify(row));
     writeFileSync(output+'/summary.json',JSON.stringify(results,null,2));
    }finally{await page.close();}
   }
  }finally{server.kill();if(server.exitCode===null&&server.signalCode===null)await new Promise(r=>server.once('exit',r));}
 }
 for(const width of [390,1440]){
  const off=results.find(r=>r.variant==='head'&&r.viewport===width),on=results.find(r=>r.variant==='head-memo'&&r.viewport===width);
  assert.deepEqual(on.stress.effects,off.stress.effects,'Exact frame memo changed visual counts');
  assert.deepEqual(on.personal,off.personal,'Exact frame memo changed recorded effects');
  assert.ok(on.stress.sight.frameHits>0,'No cross-category frame cache hits');
  assert.ok(on.stress.sourceCalls<=off.stress.sourceCalls,'Frame memo increased optical calls');
 }
 console.log('V19_MATCHED_DISCLOSURE_OK');
}finally{await browser?.close();}
