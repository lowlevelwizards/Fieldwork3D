/** Actual tactical renderer: exact base vs candidate default, suite, and suite+lights.
 * Same synthetic recorded evidence and site, no changes to gameplay simulation.
 * CPU/driver wall time via software WebGL; not physical-device GPU timings.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const dir='artifacts/vfx-v10-suite';
mkdirSync(dir,{recursive:true});
assert.ok(process.env.VFX_BASE_ROOT,'Exact base checkout required');
const vite=resolve('node_modules/vite/bin/vite.js');
const servers=[{port:4472,cwd:process.env.VFX_BASE_ROOT},{port:4473,cwd:process.cwd()}].map(({port,cwd})=>{
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
 for(const viewport of [{width:390,height:844},{width:1440,height:900}])for(const variant of ['base','foundation','suite','no-vegetation','no-smoke','lights']){
  const origin=servers[variant==='base'?0:1].origin;
  const enabled=variant!=='base'&&variant!=='foundation',lights=variant==='lights';
  const vegetation=variant!=='no-vegetation',smoke=variant!=='no-smoke';
  const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))errors.push(m.text());});
  try{
   await page.route('**/vfx-suite-probe?**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   await page.goto(origin+'/vfx-suite-probe?vfxSuite='+Number(enabled)+'&vfxLights='+Number(lights)+'&coldBench=1'+(vegetation?'':'&vfxGrass=0&vfxBush=0')+(smoke?'':'&vfxSmoke=0'));
   const result=await page.evaluate(async({variant,enabled,lights,vegetation,smoke,viewport})=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {generateSite}=await import('/src/breach-site.ts');
    const {newSession,team}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    const site=generateSite(3,'standard',undefined,{mission:'intel'},{archetype:'house'});activateSite(site);
    const s=newSession(0,site.seed,'exterior-known','standard',undefined,site);
    const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);scene.applySite(site);
    const selected=team(s)[0].id,p=team(s)[0].p,root=scene.scene;
    scene.view.focus={x:p.x,y:p.y};scene.view.zoom=2.5;
    const draw=()=>scene.update(s,selected,1/60,null,true);
    const sample=async()=>{
     for(let i=0;i<8;i++)draw();
     const rows=[];
     for(let i=0;i<32;i++){
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
     if(counts.traces!==20||counts.pulses!==20||counts.particles!==(smoke?86:95)||(smoke?counts.puffs<=0:counts.puffs!==0)||counts.shards!==4||(vegetation?(!counts.grass||!counts.bushes):(counts.grass||counts.bushes))||!stain)throw Error('Combined effect counts '+JSON.stringify(counts));
     const versions=[stain.instanceMatrix.version,stain.instanceColor?.version,stain.geometry.attributes.stainStyle.version,scene.windowShards.instanceMatrix.version,batch.instanceMatrix.version,puffs?.instanceMatrix.version,traces?.instanceMatrix.version,pulses?.instanceMatrix.version];
     draw();
     const after=[stain.instanceMatrix.version,stain.instanceColor?.version,stain.geometry.attributes.stainStyle.version,scene.windowShards.instanceMatrix.version,batch.instanceMatrix.version,puffs?.instanceMatrix.version,traces?.instanceMatrix.version,pulses?.instanceMatrix.version];
     if(JSON.stringify(versions)!==JSON.stringify(after))throw Error('Unchanged settled buffer was uploaded');
     if(lights?(pointLights!==2||activeLights<1):pointLights!==0)throw Error('Light budget mismatch');
    }else if(batch||stain||puffs||grass||bushes||pointLights)throw Error('Unexpected preview in default');
    if(JSON.stringify({shots:s.shots,marks:s.impactMarks,dropped:s.dropped,bursts:s.flashBursts,windows:s.windows})!==original)throw Error('Presentation mutated evidence');
    const snapshot=scene.renderer.domElement.toDataURL('image/png');
    pane.shattered=false;pane.open=false;pane.shatteredAt=undefined;s.seconds=0;
    s.shots=[];s.impactMarks=[];s.dropped=[];s.flashBursts=[];draw();
    if(batch?.count||stain?.count||puffs?.count||traces?.count||pulses?.count||scene.windowShards?.count)throw Error('Empty/rewind left stale instances');
    scene.applySite(null);if(batch?.count||stain?.count||puffs?.count||traces?.count||pulses?.count||scene.windowShards?.count||root.getObjectByName('vfx-grass-preview'))throw Error('Reset left stale instances');
    scene.renderer.dispose();scene.renderer.forceContextLoss();
    return {variant,viewport,seed:site.seed,idle,stress,counts,snapshot};
   },{variant,enabled,lights,vegetation,smoke,viewport});
   assert.deepEqual(errors,[],'Shader/runtime errors');
   const {snapshot,...record}=result;results.push(record);
   writeFileSync(dir+'/'+viewport.width+'-'+variant+'.png',Buffer.from(snapshot.split(',')[1],'base64'));
   console.log('VFX_V10_BROWSER '+JSON.stringify(record));
  }finally{await page.close();}
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(results,null,2)+'\n');
 const blockers=[];
 for(const width of [390,1440]){
  const base=results.find(r=>r.viewport.width===width&&r.variant==='base');
  const suite=results.find(r=>r.viewport.width===width&&r.variant==='suite');
  for(const variant of ['no-vegetation','no-smoke','lights']){
   const on=results.find(r=>r.viewport.width===width&&r.variant===variant);
   console.log('VFX_V10_ABLATION '+JSON.stringify({width,variant,idleDelta:on.idle.p95CpuWallMs-suite.idle.p95CpuWallMs,stressDelta:on.stress.p95CpuWallMs-suite.stress.p95CpuWallMs,drawDelta:on.stress.p95Calls-suite.stress.p95Calls,triangleDelta:on.stress.p95Triangles-suite.stress.p95Triangles}));
  }
  for(const variant of ['foundation','suite']){
   const on=results.find(r=>r.viewport.width===width&&r.variant===variant);
   if(on.idle.p95CpuWallMs>base.idle.p95CpuWallMs*1.05)blockers.push(width+' '+variant+' idle >5% regression');
   if(on.stress.p95Calls>=base.stress.p95Calls)blockers.push(width+' '+variant+' no stress draw savings');
   if(variant==='suite'&&on.stress.p95CpuWallMs>base.stress.p95CpuWallMs*.8)blockers.push(width+' suite missed 20% stress p95 target');
  }
 }
 console.log('VFX_V10_RELEASE_BLOCKERS '+JSON.stringify(blockers));
 assert.deepEqual(blockers,[],'Combined software WebGL performance target not met; retain opt-in');
}finally{await browser?.close();for(const s of servers)s.process.kill('SIGTERM');}
