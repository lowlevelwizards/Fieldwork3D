/** Actual tactical renderer, synthetic recorded impact evidence only.
 * Identical stress workload; no combat simulation or damage changes.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const port=4470,origin='http://127.0.0.1:'+port,dir='artifacts/vfx-v4-blood';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){try{if((await fetch(origin+'/index.html')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 assert.ok(ready);
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME==='1'?{channel:'chrome'}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const results=[];
 for(const viewport of [{width:390,height:844},{width:1440,height:900}])for(const enabled of [false,true]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|compile|linker/i.test(m.text()))errors.push(m.text());});
  try{
   await page.route('**/vfx-blood-probe?**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   await page.goto(origin+'/vfx-blood-probe?vfxBlood='+(enabled?'1':'0')+'&coldBench=1');
   const sample=await page.evaluate(async({enabled,viewport})=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {generateSite}=await import('/src/breach-site.ts');
    const {newSession,team}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    const site=generateSite(3,'standard',undefined,{mission:'intel'},{archetype:'house'});
    activateSite(site);
    const s=newSession(0,site.seed,'exterior-known','standard',undefined,site);
    const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);scene.applySite(site);
    const selected=team(s)[0].id,root=scene.scene;
    const p=team(s)[0].p;
    scene.view.focus={x:p.x,y:p.y};scene.view.zoom=2.5;
    s.shots=Array.from({length:20},(_,i)=>({id:500+i,shooterId:selected,targetId:null,start:{x:p.x-12,y:p.y+10},
      end:{x:p.x+(i%5)*4-8,y:p.y+20+Math.floor(i/5)*4},age:.08,hit:true,side:'blue',healthBefore:100,healthAfter:90,down:false,surface:'blood',impactHeight:12}));
    s.impactMarks=Array.from({length:24},(_,i)=>({id:800+i,p:{x:p.x+(i%6)*7-21,y:p.y+24+Math.floor(i/6)*7},surface:i%6===0?'wood':'blood',age:1}));
    const original=JSON.stringify({shots:s.shots,marks:s.impactMarks});
    const draw=()=>scene.update(s,selected,1/60,null,true);
    for(let i=0;i<8;i++)draw();
    let batch,stain;root.traverse(n=>{if(n.userData.fieldworkDrawFamily==='blood-droplet-batch')batch=n;if(n.userData.fieldworkDrawFamily==='mixed-impact-stain')stain=n;});
    if(enabled&&(!batch||batch.count!==80||!stain))throw Error('Missing saturated shared effect batch');
    if(!enabled&&(batch||stain))throw Error('Preview leaked into original renderer');
    const rows=[];
    for(let i=0;i<36;i++){
     const start=performance.now();draw();const elapsed=performance.now()-start,stats=scene.performanceStats();
     rows.push({elapsed,calls:stats.calls,triangles:stats.triangles,textures:stats.textureCount});
     await new Promise(requestAnimationFrame);
    }
    if(JSON.stringify({shots:s.shots,marks:s.impactMarks})!==original)throw Error('Presenter mutated impact evidence');
    const count=batch?.count??0,snapshot=scene.renderer.domElement.toDataURL('image/png');
    s.shots=[];s.impactMarks=[];draw();if(batch?.count||stain?.count)throw Error('Stale effect instances');
    scene.applySite(null);if(batch?.count||stain?.count)throw Error('Reset left stale effects');
    scene.renderer.dispose();scene.renderer.forceContextLoss();
    const p95=k=>rows.map(r=>r[k]).sort((a,b)=>a-b)[Math.floor(rows.length*.95)];
    return {viewport,enabled,droplets:count,p95CpuWallMs:p95('elapsed'),p95Calls:p95('calls'),p95Triangles:p95('triangles'),p95Textures:p95('textures'),snapshot};
   },{enabled,viewport});
   assert.deepEqual(errors,[],'Shader/runtime errors');
   const {snapshot,...record}=sample;
   writeFileSync(dir+'/'+viewport.width+'-'+Number(enabled)+'.png',Buffer.from(snapshot.split(',')[1],'base64'));
   results.push(record);console.log('VFX_V4_BROWSER '+JSON.stringify(record));
  }finally{await page.close();}
 }
 for(const width of [390,1440]){
  const off=results.find(r=>r.viewport.width===width&&!r.enabled),on=results.find(r=>r.viewport.width===width&&r.enabled);
  assert.equal(on.droplets,80);assert.ok(on.p95Calls<off.p95Calls,'No measured draw savings');
  assert.ok(on.p95Textures-off.p95Textures<=1);
 }
 writeFileSync(dir+'/summary.json',JSON.stringify(results,null,2)+'\n');
}finally{await browser?.close();server.kill('SIGTERM');}
