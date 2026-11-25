/** W7: real same-site floor/fixture render acceptance, no broad stress matrix. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4427,base='http://127.0.0.1:'+port,out='artifacts/w7-surfaces';
mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const check=(v,m)=>{if(!v)throw Error(m);};
const evidence=[];let browser;
try{
 let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/map-lab.html')).ok){ready=true;break;}}catch{}await wait(200);}
 check(ready,'Vite unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [name,width,height] of [['phone',390,844],['desktop',1280,800]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|GL_INVALID/i.test(m.text()))errors.push(m.text());});
  await page.route('**/w7-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;overflow:hidden"></body></html>'}));
  await page.goto(base+'/w7-probe');
  await page.evaluate(async({width,height})=>{
   const {TacticalScene3D}=await import('/src/breach-3d.ts');
   const {generateSite}=await import('/src/breach-site.ts');
   const {newSession,team}=await import('/src/breach-game.ts');
   const {activateSite}=await import('/src/breach-core.ts');
   const {planCompiledFloorWear}=await import('/src/worldgen/floor-wear-plan.ts');
   const scene=new TacticalScene3D();scene.resize(width,height);
   if(!scene.canvas.isConnected)document.body.appendChild(scene.canvas);
   window.w7={scene,generateSite,newSession,team,activateSite,planCompiledFloorWear};
  },{width,height});
  for(const [seed,archetype] of [[23,'house'],[31,'restaurant'],[97,'garage'],[42,'clinic'],[63,'utility']]){
   const results=[];
   for(const compiled of [false,true]){
    const result=await page.evaluate(({seed,archetype,compiled})=>{
     const {scene,generateSite,newSession,team,activateSite,planCompiledFloorWear}=window.w7;
     const check=(v,m)=>{if(!v)throw Error(m);};
     const site={...generateSite(seed,'standard',undefined,{mission:'intel'},{archetype}),conditionLevel:100};
     const snapshot=JSON.stringify(site);activateSite(site);
     const session=newSession(0,seed,'exterior-known','standard',undefined,site);
     const knowledge=()=>JSON.stringify({walls:[...session.intel.walls],doors:[...session.intel.doors],cover:[...session.intel.cover],seen:[...session.seenGround]});
     const prev=[...new Set(scene.patinaRoomSurfaces.map(s=>s.texture))];
     const disposal=new Map(prev.map(t=>[t,0]));
     for(const t of prev)t.addEventListener('dispose',()=>disposal.set(t,disposal.get(t)+1));
     scene.floorWearCompiled=compiled;
     const start=performance.now();scene.applySite(site);const buildMs=performance.now()-start;
     check([...disposal.values()].every(n=>n===1),'prior floor textures not disposed exactly once');
     scene.resetCamera();scene.setMode('iso');scene.view.zoom=1.25;
     const draw=(all)=>scene.update(session,team(session)[0].id,1,null,all);
     const before=knowledge();draw(false);
     const disclosure=JSON.stringify({walls:scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-body'&&w.mesh.parent.visible).map(w=>w.index),cover:[...scene.coverGroups].filter(([,g])=>g.visible).map(([i])=>i),actors:[...scene.actors].filter(([,a])=>a.root.visible).map(([i])=>i)});
     const after=knowledge();draw(true);draw(true);
     const renderer=scene.renderer,original=renderer.renderBufferDirect,samples=[];
     try{
      for(let i=0;i<5;i++){
       const counts={main:0,shadow:0,families:{},ms:0};
       renderer.renderBufferDirect=function(...args){
        const shadow=!!args[3]?.isMeshDepthMaterial||!!args[3]?.isMeshDistanceMaterial;
        const family=args[4]?.userData?.fieldworkDrawFamily??'other';
        if(shadow)counts.shadow++;else counts.main++;
        const key=(shadow?'shadow:':'main:')+family;counts.families[key]=(counts.families[key]??0)+1;
        return original.apply(this,args);
       };
       renderer.shadowMap.needsUpdate=i===0;const at=performance.now();draw(true);counts.ms=performance.now()-at;samples.push(counts);
      }
     }finally{renderer.renderBufferDirect=original;}
     const slots=scene.patinaRoomSurfaces,textures=[...new Set(slots.map(s=>s.texture))];
     const saved=textures.map(t=>t.image.data.slice()),versions=textures.map(t=>t.version);
     const meshCounts={compiledFloors:0,legacyFloors:0,fixtureIntegrated:0,fixtureDecals:0};
     const repeated=scene.repeatedFixtures.stats;
     scene.root.traverse(n=>{const family=n.userData.fieldworkDrawFamily;
      if(family==='room-floor-compiled'){meshCounts.compiledFloors++;check(n.material.depthWrite&&!n.material.transparent,'compiled floor not opaque');}
      if(family==='room-floor-weathering')meshCounts.legacyFloors++;
      if(family==='fixture-wear-integrated'){meshCounts.fixtureIntegrated++;check(n.material.depthWrite&&!n.material.transparent,'compiled fixture not opaque');}
      if(family==='surface-wear-decal')meshCounts.fixtureDecals++;
     });
     scene.previewConditionMasks(site,0);
     check(textures.every(t=>t.image.data.every((v,i)=>i%4!==3||v===0)),'clean floor alpha');
     scene.previewConditionMasks(site,100);
     check(textures.every((t,i)=>t.version===versions[i]+2&&t.image.data.every((v,j)=>v===saved[i][j])),'floor condition roundtrip/upload budget');
     check(JSON.stringify(site)===snapshot,'authoritative site mutated');
     draw(true);
     window.w7.current={site,session,draw};
     const marks=planCompiledFloorWear(site);
     return {compiled,buildMs,repeated,knowledgeBefore:before,knowledgeAfter:after,disclosure,samples,meshCounts,rooms:site.rooms.length,pages:textures.length,bytes:textures.reduce((n,t)=>n+t.image.data.byteLength,0),mipBytes:textures.reduce((n,t)=>n+Math.ceil(t.image.data.byteLength*(t.generateMipmaps?4/3:1)),0),marks:marks.reduce((a,m)=>(a[m.kind]=(a[m.kind]??0)+1,a),{}),stableMain:Math.max(...samples.slice(1).map(s=>s.main)),shadow:samples[0].shadow};
    },{seed,archetype,compiled});
    results.push(result);
    await page.screenshot({path:out+'/'+name+'-'+archetype+'-'+(compiled?'compiled':'legacy')+'.png'});
    if(archetype==='restaurant'||archetype==='garage'){
     const special=await page.evaluate(()=>{
      const {scene,current:{session,draw}}=window.w7;
      const witnesses=[...scene.coverVisualStates].filter(([,v])=>{
       let marked=false;v.intact.traverse(o=>{if(o.userData.fieldworkDrawFamily==='fixture-wear-integrated')marked=true;});return marked;
      });
      const [index,visual]=witnesses[0]??[];
      const source=index!==undefined?session.coverState[index]:undefined;
      const saved=source?{...source}:undefined;
      let transitions=false;
      if(source&&visual){
       const owner=scene.coverGroups.get(index);
       const oldX=owner.position.x;
       source.x+=5;source.toppled=true;draw(true);
       if(!visual.intact.visible||visual.debris.visible||Math.abs(owner.position.x-oldX-5)>.01||owner.rotation.x===0)throw Error('W7 moved/toppled fixture lost ownership');
       source.destroyed=true;draw(true);
       if(visual.intact.visible||!visual.debris.visible||owner.rotation.x!==0)throw Error('W7 destroyed fixture retained intact wear');
       Object.assign(source,saved);source.toppled=saved.toppled;source.destroyed=saved.destroyed;draw(true);
       if(!visual.intact.visible||visual.debris.visible||Math.abs(owner.position.x-oldX)>.01)throw Error('W7 restored fixture lost ownership');
       transitions=true;
      }
      session.lightingMode='night';scene.view.zoom=2.25;
      if(source)scene.view.focus={x:source.x,y:source.y};
      scene.updateCamera(1);draw(true);
      return {transitions,witnesses:witnesses.length,lighting:session.lightingMode};
     });
     result.special=special;
     if(compiled)check(special.transitions,'no fixture transition witness '+archetype);
     await page.screenshot({path:out+'/'+name+'-'+archetype+'-'+(compiled?'compiled':'legacy')+'-night-close.png'});
    }
   }
   const [a,b]=results;evidence.push({name,seed,archetype,results});writeFileSync(out+'/summary.json',JSON.stringify(evidence,null,2));
   for(const k of ['knowledgeBefore','knowledgeAfter','disclosure','rooms'])check(a[k]===b[k],archetype+' W7 parity '+k);
   check(b.meshCounts.compiledFloors===b.rooms&&b.meshCounts.legacyFloors===0,'compiled floor ownership '+archetype);
   check(b.pages<=a.pages&&b.bytes===a.bytes&&b.mipBytes<=a.mipBytes,'floor atlas budget '+archetype);
   check(b.stableMain<a.stableMain,'no main draw reduction '+archetype+' '+JSON.stringify([a.stableMain,b.stableMain]));
   check(JSON.stringify(a.repeated)===JSON.stringify(b.repeated),'repeated fixture batching changed '+archetype+' '+JSON.stringify([a.repeated,b.repeated]));
   check(b.shadow===a.shadow,'shadow count changed '+archetype+' '+JSON.stringify([a.samples[0],b.samples[0]]));
  }
  await page.evaluate(()=>{
   const {scene,current:{site}}=window.w7;scene.floorWearCompiled=true;
   const clean={...site,conditionLevel:0};scene.applySite(clean);
   const slots=scene.patinaRoomSurfaces,tex=[...new Set(slots.map(s=>s.texture))];
   if(slots.length!==clean.rooms.length||!tex.every(t=>t.image.data.every((v,i)=>i%4!==3||v===0)))throw Error('W7 clean start missing slots');
   scene.previewConditionMasks(clean,100);
   if(!tex.some(t=>t.image.data.some((v,i)=>i%4===3&&v>0)))throw Error('W7 clean start cannot age');
   scene.previewConditionMasks(clean,0);
   if(!tex.every(t=>t.image.data.every((v,i)=>i%4!==3||v===0)))throw Error('W7 clean start cannot reset');
   scene.renderer.dispose();scene.renderer.forceContextLoss();
  });
  check(!errors.length,errors.join(' | '));await page.close();
 }
 check(evidence.some(e=>e.results[1].meshCounts.fixtureIntegrated>0),'no projected fixture witness');
 const kinds=new Set(evidence.flatMap(e=>Object.keys(e.results[1].marks)));
 for(const k of ['grease','oil','mineral'])check(kinds.has(k),'no real source witness '+k);
 console.log('W7_SURFACES '+JSON.stringify(evidence.map(e=>({name:e.name,archetype:e.archetype,draws:e.results.map(r=>r.stableMain),shadows:e.results.map(r=>r.shadow),pages:e.results.map(r=>r.pages),mipBytes:e.results.map(r=>r.mipBytes),meshes:e.results.map(r=>r.meshCounts),marks:e.results[1].marks,ms:e.results.map(r=>r.samples.map(s=>s.ms)),build:e.results.map(r=>r.buildMs)}))));
}finally{await browser?.close();server.kill('SIGTERM');}
