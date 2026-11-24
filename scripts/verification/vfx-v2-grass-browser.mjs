/** Real TacticalScene3D, generated session and software WebGL A/B.
 * Frame samples are CPU/driver wall time, NOT hardware GPU timing.
 * No gameplay state or production configuration is altered by this harness.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const port=4468,origin='http://127.0.0.1:'+port,dir='artifacts/vfx-v2-grass';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}await wait(150);}
 assert.ok(ready,'Vite unavailable');
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  for(const variant of ['off','fine','coarse']){
   const enabled=variant!=='off';
   const page=await browser.newPage({viewport,deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))errors.push(m.text());});
   try{
    await page.route('**/vfx-grass-probe?**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
    await page.goto(origin+'/vfx-grass-probe?vfxGrass='+(enabled?'1':'0')+'&vfxGrassCell='+(variant==='coarse'?'192':'96')+'&coldBench=1');
    const sample=await page.evaluate(async({enabled,viewport})=>{
     const {TacticalScene3D}=await import('/src/breach-3d.ts');
     const {generateSite}=await import('/src/breach-site.ts');
     const {newSession,team}=await import('/src/breach-game.ts');
     const {activateSite}=await import('/src/breach-core.ts');
     const {planGrassPatches}=await import('/src/rendering/perplung-grass-placement.ts');
     let site,patches;
     for(const seed of [3,17,61,23,97]){
      site=generateSite(seed,'standard',undefined,{mission:'intel'},{archetype:'house'});
      patches=planGrassPatches(site);
      if(patches.reduce((n,p)=>n+p.tufts.length,0)>=12)break;
     }
     const tufts=patches.flatMap(p=>p.tufts);
     if(tufts.length<12)throw Error('No meaningful authored grass workload');
     activateSite(site);
     const s=newSession(0,site.seed,'exterior-known','standard',undefined,site);
     const scene=new TacticalScene3D();
     scene.resize(viewport.width,viewport.height);
     scene.applySite(site);
     const selected=team(s)[0].id,root=scene.scene;
     const center=patches.reduce((a,b)=>a.tufts.length>=b.tufts.length?a:b).tufts[0];
     scene.view.focus={x:center.x,y:center.z};scene.view.zoom=3.5;
     const group=root.getObjectByName('vfx-grass-preview');
     if(!!group!==enabled)throw Error('Grass preview toggle mismatch');
     let submissions=0,disposeEvents=0;
     if(group){
      for(const mesh of group.children){
       mesh.onAfterRender=()=>{submissions++;};
       mesh.geometry.addEventListener('dispose',()=>disposeEvents++);
      }
     }
     const draw=()=>scene.update(s,selected,1/60,null,true);
     for(let i=0;i<8;i++)draw();
     const rows=[];
     for(let i=0;i<36;i++){
      const start=performance.now();draw();
      const elapsed=performance.now()-start,stats=scene.performanceStats();
      rows.push({elapsed,calls:stats.calls,triangles:stats.triangles,textures:stats.textureCount});
      await new Promise(requestAnimationFrame);
     }
     if(enabled&&!submissions)throw Error('Grass never submitted to WebGL');
     const beforeReset={patches:group?.children.length??0,submissions};
     const hiddenChecks=[];
     if(group){
      s.intel.mode='true-blind';
      scene.update(s,selected,1/60,null,false);hiddenChecks.push(group.visible===false);
      s.intel.mode='exterior-known';
      scene.update(s,selected,1/60,null,false);hiddenChecks.push(group.visible===true);
      if(hiddenChecks.some(x=>!x))throw Error('Grass disclosure mismatch');
     }
     // Keep an actual rendered exterior capture available before replacement.
     draw();
     const snapshot=scene.renderer.domElement.toDataURL('image/png');
     scene.applySite(null);
     if(root.getObjectByName('vfx-grass-preview')||disposeEvents!==beforeReset.patches)
      throw Error('Old grass patches survived site replacement');
     scene.renderer.dispose();scene.renderer.forceContextLoss();
     const p95=key=>rows.map(r=>r[key]).sort((a,b)=>a-b)[Math.floor(rows.length*.95)];
     return {seed:site.seed,viewport,enabled,tufts:tufts.length,patches:patches.length,
       grassSubmissions:beforeReset.submissions,disposeEvents,hiddenChecks,
       p95CpuWallMs:p95('elapsed'),p95Calls:p95('calls'),p95Triangles:p95('triangles'),p95Textures:p95('textures'),snapshot};
    },{enabled,viewport});
    assert.deepEqual(errors,[],'Shader/runtime errors');
    const {snapshot,...measured}=sample;
    const record={...measured,variant};
    writeFileSync(dir+'/'+viewport.width+'-'+variant+'.png',Buffer.from(snapshot.split(',')[1],'base64'));
    results.push(record);
    console.log('VFX_V2_BROWSER '+JSON.stringify(record));
   }finally{await page.close();}
  }
 }
 for(const width of [390,1440]){
  const off=results.find(r=>r.viewport.width===width&&r.variant==='off');
  const fine=results.find(r=>r.viewport.width===width&&r.variant==='fine');
  const coarse=results.find(r=>r.viewport.width===width&&r.variant==='coarse');
  assert.ok(coarse.disposeEvents<fine.disposeEvents,'Coarse mode did not reduce owned patch count');
  for(const on of [fine,coarse]){
  assert.equal(on.seed,off.seed);assert.equal(on.tufts,off.tufts);
  assert.ok(on.p95Calls-off.p95Calls<=on.patches*2+2,'Excess grass submissions');
  assert.ok(on.p95Triangles-off.p95Triangles<=on.tufts*8+8,'Excess grass triangles');
  assert.ok(on.p95Textures-off.p95Textures<=2,'Extra atlas textures');
  }
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(results,null,2)+'\n');
}finally{await browser?.close();server.kill('SIGTERM');}
