/** Matched W3/W6 generated-site acceptance. No broad benchmark matrix. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4426,base='http://127.0.0.1:'+port,out='artifacts/w6-story';
mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const check=(v,m)=>{if(!v)throw Error(m);};
const evidence=[];let browser;
try{
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/map-lab.html')).ok){ready=true;break;}}catch{}await delay(200);}
 check(ready,'Vite unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const cases=[[23,'house'],[31,'restaurant'],[97,'garage'],[42,'clinic'],[63,'utility']];
 for(const [name,width,height] of [['phone',390,844],['desktop',1280,800]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))errors.push(m.text());});
  await page.route('**/w6-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;overflow:hidden"></body></html>'}));
  await page.goto(base+'/w6-probe');
  await page.evaluate(async ({width,height})=>{
   const {TacticalScene3D}=await import('/src/breach-3d.ts');
   const {generateSite}=await import('/src/breach-site.ts');
   const {newSession,team}=await import('/src/breach-game.ts');
   const {activateSite}=await import('/src/breach-core.ts');
   const {planFixtureWallResidue}=await import('/src/worldgen/wall-story-residue.ts');
   const {selectWallEvents}=await import('/src/worldgen/wall-surface-recipe.ts');
   const scene=new TacticalScene3D();scene.resize(width,height);
   if(!scene.canvas.isConnected)document.body.appendChild(scene.canvas);
   window.w6={scene,generateSite,newSession,team,activateSite,planFixtureWallResidue,selectWallEvents};
  },{width,height});
  for(const [seed,archetype] of cases){
   const census=await page.evaluate(({seed,archetype})=>{
    const p=window.w6;
    p.site={...p.generateSite(seed,'standard',undefined,{mission:'intel'},{archetype}),conditionLevel:100};
    p.activateSite(p.site);p.session=p.newSession(0,seed,'exterior-known','standard',undefined,p.site);
    const fixtures={};for(const o of p.site.cover)if(o.fixture)fixtures[o.fixture]=(fixtures[o.fixture]??0)+1;
    const anchors={};for(const faces of p.planFixtureWallResidue(p.site,56).values())for(const events of faces.values())for(const e of events)anchors[e.kind]=(anchors[e.kind]??0)+1;
    return {fixtures,anchors};
   },{seed,archetype});
   const results=[];
   for(const story of [false,true]){
    const result=await page.evaluate(story=>{
     const {scene,site,session,team,selectWallEvents}=window.w6;
     const check=(v,m)=>{if(!v)throw Error(m);};
     const knowledge=()=>JSON.stringify({walls:[...session.intel.walls],doors:[...session.intel.doors],cover:[...session.intel.cover],seen:[...session.seenGround]});
     scene.wallAudition={effect:'all',atlas:true,story};scene.wallStructureUnified=true;
     const start=performance.now();scene.applySite(site);const buildMs=performance.now()-start;
     scene.resetCamera();scene.setMode('iso');scene.view.zoom=1.25;
     const draw=(all)=>scene.update(session,team(session)[0].id,1,null,all);
     const before=knowledge();draw(false);
     const disclosure=JSON.stringify({walls:scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-body'&&w.mesh.parent.visible).map(w=>w.index),cover:[...scene.coverGroups].filter(([,g])=>g.visible).map(([i])=>i),actors:[...scene.actors].filter(([,a])=>a.root.visible).map(([i])=>i)});
     const knowledgeAfter=knowledge();
     draw(true);draw(true);
     const renderer=scene.renderer,original=renderer.renderBufferDirect;
     let submissions=0;try{renderer.renderBufferDirect=function(...args){submissions++;return original.apply(this,args);};draw(true);}finally{renderer.renderBufferDirect=original;}
     const masks=scene.patinaWallSurfaces,textures=[...new Set(masks.map(m=>m.texture))];
     const saved=textures.map(t=>t.image.data.slice()),versions=textures.map(t=>t.version);
     let hash=2166136261;for(const bytes of saved)for(const value of bytes)hash=Math.imul(hash^value,16777619);
     const active={};for(const m of masks)for(const face of [m.atlasSlot.pair.front,m.atlasSlot.pair.back])for(const e of selectWallEvents(face,100))if(e.cause.startsWith('fixture:'))active[e.kind]=(active[e.kind]??0)+1;
     scene.previewConditionMasks(site,0);
     let clean=2166136261;for(const t of textures)for(const value of t.image.data)clean=Math.imul(clean^value,16777619);
     scene.previewConditionMasks(site,100);
     check(textures.every((t,i)=>t.version===versions[i]+2&&t.image.data.every((v,j)=>v===saved[i][j])),'W6 condition roundtrip or upload budget');
     check(textures.every(t=>t.image.data.every((v,i)=>i%4!==3||v===255)),'W6 nonopaque atlas texel');
     draw(true);
     return {story,buildMs,submissions,disclosure,knowledgeBefore:before,knowledgeAfter,wallMeshes:scene.walls.length,triangles:scene.walls.reduce((n,w)=>n+(w.mesh.geometry.index?.count??w.mesh.geometry.getAttribute('position').count)/3,0),pages:textures.length,bytes:textures.reduce((n,t)=>n+t.image.data.byteLength,0),programs:renderer.info.programs?.length,hash,clean,active};
    },story);
    results.push(result);
    await page.screenshot({path:out+'/'+name+'-'+archetype+'-'+(story?'story':'atlas')+'.png'});
   }
   const [a,b]=results;
   for(const key of ['disclosure','knowledgeAfter','wallMeshes','triangles','pages','bytes','submissions','clean'])check(a[key]===b[key],archetype+' W6 parity '+key);
   if(Object.keys(b.active).length)check(a.hash!==b.hash,archetype+' active story did not change atlas');
   evidence.push({name,seed,archetype,census,results});
  }
  await page.evaluate(()=>{const {scene}=window.w6;scene.renderer.dispose();scene.renderer.forceContextLoss();});
  check(!errors.length,errors.join(' | '));await page.close();
 }
 writeFileSync(out+'/summary.json',JSON.stringify(evidence,null,2));
 const kinds=new Set(evidence.flatMap(e=>Object.keys(e.results[1].active)));
 console.log('W6_STORY '+JSON.stringify(evidence.map(e=>({name:e.name,archetype:e.archetype,census:e.census,active:e.results[1].active,buildMs:e.results.map(r=>r.buildMs),submissions:e.results.map(r=>r.submissions)}))));
 for(const kind of ['grease','splash','workgrime'])check(kinds.has(kind),'No generated active witness for '+kind);
}finally{await browser?.close();server.kill('SIGTERM');}
