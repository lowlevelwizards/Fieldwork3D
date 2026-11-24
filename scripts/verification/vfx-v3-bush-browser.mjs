/** Render the actual tactical scene with original or V3 owner-local foliage.
 * Compare same generated site and camera; no gameplay physics is advanced.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const port=4469,origin='http://127.0.0.1:'+port,dir='artifacts/vfx-v3-bush';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 assert.ok(ready,'Vite unavailable');
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const viewport of [{width:390,height:844},{width:1440,height:900}])for(const enabled of [false,true]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))errors.push(m.text());});
  try{
   await page.route('**/vfx-bush-probe?**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   await page.goto(origin+'/vfx-bush-probe?vfxBush='+(enabled?'1':'0')+'&coldBench=1');
   const sample=await page.evaluate(async({enabled,viewport})=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {generateSite}=await import('/src/breach-site.ts');
    const {newSession,team}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    let site,indices=[];
    for(const seed of [3,17,61,23,97,121]){
     site=generateSite(seed,'standard',undefined,{mission:'intel'},{archetype:'house'});
     indices=site.cover.flatMap((c,i)=>['bush','shrub-tall','shrub-round'].includes(c.fixture)&&!site.rooms.some(r=>c.x>=r.x&&c.x<=r.x+r.w&&c.y>=r.y&&c.y<=r.y+r.h)?[i]:[]);
     if(indices.length>=2)break;
    }
    if(indices.length<2)throw Error('No meaningful exterior shrub workload');
    activateSite(site);
    const s=newSession(0,site.seed,'exterior-known','standard',undefined,site);
    const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);scene.applySite(site);
    const selected=team(s)[0].id,root=scene.scene,meshes=[];
    root.traverse(node=>{if(node.userData.fieldworkV3Bush)meshes.push(node);});
    if(meshes.length!==(enabled?indices.length:0))throw Error('Preview fixture ownership mismatch');
    const c=site.cover[indices[0]];
    scene.view.focus={x:c.x,y:c.y};scene.view.zoom=3.5;
    let submissions=0,releases=0;
    if(enabled){
     const resources=new Set(meshes.flatMap(m=>[m.geometry,m.material,m.material.map]));
     if(resources.size!==3)throw Error('Bush resources are not shared');
     for(const resource of resources)resource.addEventListener('dispose',()=>releases++);
     for(const mesh of meshes)mesh.onAfterRender=()=>submissions++;
    }
    const draw=()=>scene.update(s,selected,1/60,null,true);
    for(let i=0;i<8;i++)draw();
    const rows=[];
    for(let i=0;i<36;i++){
     const start=performance.now();draw();const elapsed=performance.now()-start,stats=scene.performanceStats();
     rows.push({elapsed,calls:stats.calls,triangles:stats.triangles,textures:stats.textureCount});
     await new Promise(requestAnimationFrame);
    }
    if(enabled&&!submissions)throw Error('No actual bush draw submitted');
    const snapshot=scene.renderer.domElement.toDataURL('image/png');
    if(enabled){
     const mesh=meshes.find(m=>Math.abs(m.parent.parent.position.x-c.x)<.01&&Math.abs(m.parent.parent.position.z-c.y)<.01);
     if(!mesh)throw Error('Missing selected owner');
     const intact=mesh.parent;
     if(!intact.visible)throw Error('Initial intact shrub hidden');
     const state=s.coverState[indices[0]];
     s.coverState[indices[0]]={...state,destroyed:true};
     draw();if(intact.visible)throw Error('Destroyed shrub still renders');
     s.coverState[indices[0]]=state;
     draw();if(!intact.visible)throw Error('Restored shrub did not return');
    }
    scene.applySite(null);
    let survivors=0;root.traverse(n=>{if(n.userData.fieldworkV3Bush)survivors++;});
    if(survivors||releases!==(enabled?3:0))throw Error('Shared bush lifecycle failure');
    scene.renderer.dispose();scene.renderer.forceContextLoss();
    const p95=k=>rows.map(r=>r[k]).sort((a,b)=>a-b)[Math.floor(rows.length*.95)];
    return {seed:site.seed,viewport,enabled,shrubs:indices.length,submissions,releases,
     p95CpuWallMs:p95('elapsed'),p95Calls:p95('calls'),p95Triangles:p95('triangles'),p95Textures:p95('textures'),snapshot};
   },{enabled,viewport});
   assert.deepEqual(errors,[],'Shader/runtime errors');
   const {snapshot,...record}=sample;
   writeFileSync(dir+'/'+viewport.width+'-'+Number(enabled)+'.png',Buffer.from(snapshot.split(',')[1],'base64'));
   results.push(record);console.log('VFX_V3_BROWSER '+JSON.stringify(record));
  }finally{await page.close();}
 }
 for(const width of [390,1440]){
  const off=results.find(r=>r.viewport.width===width&&!r.enabled),on=results.find(r=>r.viewport.width===width&&r.enabled);
  assert.equal(on.seed,off.seed);assert.equal(on.shrubs,off.shrubs);
  assert.ok(on.p95Calls<=off.p95Calls+2,'Bush draw count regression');
  assert.ok(on.p95Triangles-off.p95Triangles<=on.shrubs*44+8,'Excess bush geometry');
  assert.ok(on.p95Textures-off.p95Textures<=1,'Unexpected extra textures');
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(results,null,2)+'\n');
}finally{await browser?.close();server.kill('SIGTERM');}
