/** W8.0: exact historical and current renderer on the same serialized Site.
 * Static disclosure/submit evidence; live timing is a separate W8.5 gate. */
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const out=resolve('artifacts/w8-baseline');mkdirSync(out,{recursive:true});
const roots=[['pre-w0',process.env.W8_REFERENCE_ROOT],['w7',process.env.W8_W7_ROOT],['base',process.env.W8_BASE_ROOT],['candidate',process.cwd()]].filter(([,root])=>root);
if(roots.length!==4)throw Error('W8 requires exact pre-W0, W7 and current release base worktrees');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const servers=[],evidence=[];let browser;
const check=(ok,m)=>{if(!ok)throw Error(m);};
const cases=[[23,'house',100],[97,'garage',100],[31,'restaurant',75],[42,'clinic',25],[63,'utility',75],[51,'retail',50],[81,'motel',0],[127,'warehouse',100]];
const views=[['phone',390,844],['desktop',1280,800]];
const canonical=new Map(),currentCanonical=new Map();
try{
 for(const [i,[label,root]] of roots.entries()){
  const port=4450+i,base='http://127.0.0.1:'+port;
  const server=spawn(process.execPath,[resolve(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore'});servers.push(server);
  let ready=false;for(let i=0;i<120;i++){try{if((await fetch(base+'/map-lab.html')).ok){ready=true;break;}}catch{}await sleep(200);}check(ready,label+' Vite unavailable');
  roots[i]=[label,root,base,execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()];
 }
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 // Canonical physical sites are always authored by pinned W7, never by a
 // candidate whose world generation might differ. All renderers receive same bytes.
 const generator=await browser.newPage();await generator.goto(roots[1][2]+'/map-lab.html');
 for(const [seed,archetype,condition] of cases){
  const site=await generator.evaluate(async({seed,archetype,condition})=>{
   const {generateSite}=await import('/src/breach-site.ts');
   return JSON.stringify({...generateSite(seed,'standard',undefined,{mission:'intel'},{archetype}),conditionLevel:condition});
  },{seed,archetype,condition});
  canonical.set(seed,site);writeFileSync(out+'/site-'+seed+'.json',site);
 }
 await generator.close();
 const currentGenerator=await browser.newPage();await currentGenerator.goto(roots[2][2]+'/map-lab.html');
 for(const [seed,archetype,condition] of cases){
  const site=await currentGenerator.evaluate(async({seed,archetype,condition})=>{
   const {generateSite}=await import('/src/breach-site.ts');
   return JSON.stringify({...generateSite(seed,'standard',undefined,{mission:'intel'},{archetype}),conditionLevel:condition});
  },{seed,archetype,condition});
  currentCanonical.set(seed,site);writeFileSync(out+'/current-site-'+seed+'.json',site);
 }
 await currentGenerator.close();
 for(const [view,width,height] of views){
  // The compact matrix: two historical anchors at both viewports; other
  // representative archetypes on desktop, with W7 and candidate comparisons.
  const selected=view==='phone'?cases.slice(0,2):cases;
  for(const [label,root,base,sha] of roots){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|GL_INVALID/i.test(m.text()))errors.push(m.text());});
   await page.route('**/w8-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;overflow:hidden"></body></html>'}));await page.goto(base+'/w8-probe');
   await page.evaluate(async({width,height})=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {newSession,team}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    const scene=new TacticalScene3D();scene.resize(width,height);if(!scene.canvas.isConnected)document.body.appendChild(scene.canvas);
    window.w8={scene,newSession,team,activateSite};
   },{width,height});
   for(const [seed,archetype,condition] of selected){
    // Historical anchors plus aged warehouse for a larger structural witness.
    if(label==='pre-w0'&&![23,97,127].includes(seed))continue;
    const corpus=label==='base'||label==='candidate'?'current':'historical';
    const serialized=(corpus==='current'?currentCanonical:canonical).get(seed);
    const result=await page.evaluate(({seed,serialized,checkLifetime})=>{
     const {scene,newSession,team,activateSite}=window.w8;
     const site=JSON.parse(serialized);activateSite(site);
     const session=newSession(0,seed,'exterior-known','standard',undefined,site);
     const knowledge=()=>JSON.stringify({walls:[...session.intel.walls],doors:[...session.intel.doors],cover:[...session.intel.cover],seen:[...session.seenGround]});
     const retired=checkLifetime?[...new Set(scene.sitePatinaTextures)]:[];
     const disposals=new Map(retired.map(t=>[t,0]));
     for(const texture of retired)texture.addEventListener('dispose',()=>disposals.set(texture,disposals.get(texture)+1));
     const t=performance.now();scene.applySite(site);const buildMs=performance.now()-t;
     if(retired.some(t=>disposals.get(t)!==1||scene.sitePatinaTextures.includes(t)))throw Error('W8 retired surface page lifecycle mismatch');
     scene.resetCamera();scene.setMode('iso');scene.view.zoom=1.25;scene.updateCamera(1);
     const draw=all=>scene.update(session,team(session)[0].id,1,null,all);
     const knownBefore=knowledge();const first=performance.now();draw(false);const firstMs=performance.now()-first;
     const knownAfter=knowledge();
     const owners=scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-body');
     const visible=()=>owners.filter(w=>w.mesh.visible&&w.mesh.parent.visible).map(w=>w.index);
     const initialVisible=visible();
     const initialCover=[...scene.coverGroups].filter(([,g])=>g.visible).map(([i])=>i);
     const familyByObject=new Map();
     for(const w of owners)w.mesh.traverse(o=>{
      const family=o.userData.fieldworkDrawFamily;
      if(family==='surface-wear-decal')familyByObject.set(o,'wall-local-wear');
     });
     for(const [i,g] of scene.coverGroups)g.traverse(o=>{
      if(o.userData.fieldworkDrawFamily==='surface-wear-decal')familyByObject.set(o,'fixture-local-wear');
     });
     const structural=new Set(['structural-wall-body','structural-wall-skirting','structural-wall-cap','structural-wall-cap-joint','structural-wall-trim-packet']);
     // Attribute residual draws to their actual ownership without guessing from color.
     for(const [index,g] of scene.coverGroups)g.traverse(o=>{if(!o.userData.fieldworkDrawFamily&&!familyByObject.has(o))familyByObject.set(o,'fixture-owner:'+index);});
     for(const [id,d] of scene.doors)d.root.traverse(o=>{if(!o.userData.fieldworkDrawFamily&&!familyByObject.has(o))familyByObject.set(o,'door-owner:'+id);});
     const classify=o=>familyByObject.get(o)??o?.userData?.fieldworkDrawFamily??(o?.isInstancedMesh?'unclassified-instanced':'unclassified');
     const renderer=scene.renderer,original=renderer.renderBufferDirect;
     const samples=[];
     for(const all of [false,true]){
      draw(all);draw(all);
      for(let i=0;i<6;i++){
       const counts={view:all?'full':'known',main:0,shadow:0,structural:0,wallWithWear:0,mainTriangles:0,shadowTriangles:0,mainLineIndices:0,mainPointVertices:0,mainFamilies:{},shadowFamilies:{},transparent:0,materials:0,ms:0};
       const mats=new Set();
       renderer.renderBufferDirect=function(...args){
        const [,,geometry,material,obj,group]=args,shadow=!!material?.isMeshDepthMaterial||!!material?.isMeshDistanceMaterial;
        const family=classify(obj),target=shadow?counts.shadowFamilies:counts.mainFamilies;
        target[family]=(target[family]??0)+1;
        const available=geometry.index?.count??geometry.attributes.position?.count??0;
        const start=Math.max(geometry.drawRange.start,group?.start??0);
        const end=Math.min(available,geometry.drawRange.start+geometry.drawRange.count,group?group.start+group.count:Infinity);
        const submitted=Math.max(0,end-start)*(obj.isInstancedMesh?obj.count:1);
        const triangles=obj.isMesh?submitted/3:0;
        if(!shadow&&obj.isLine)counts.mainLineIndices+=submitted;
        if(!shadow&&obj.isPoints)counts.mainPointVertices+=submitted;
        if(shadow){counts.shadow++;counts.shadowTriangles+=triangles;}
        else{counts.main++;counts.mainTriangles+=triangles;mats.add(material);if(material.transparent)counts.transparent++;
         if(structural.has(family))counts.structural++;
         if(structural.has(family)||family==='wall-weathering'||family==='wall-local-wear')counts.wallWithWear++;
        }
        return original.apply(this,args);
       };
       try{renderer.shadowMap.needsUpdate=i===0;const t=performance.now();draw(all);counts.ms=performance.now()-t;}finally{renderer.renderBufferDirect=original;}
       counts.materials=mats.size;samples.push(counts);
      }
     }
     const textures=[...new Set(scene.sitePatinaTextures)],wallTextures=[...new Set(scene.patinaWallSurfaces.map(s=>s.texture))],floorTextures=[...new Set(scene.patinaRoomSurfaces.map(s=>s.texture))];
     const bytes=items=>items.reduce((n,t)=>{const base=t.image.data?.byteLength??0;return n+Math.ceil(base*(t.generateMipmaps?4/3:1));},0);
     const geo=new Set(),mat=new Set();scene.root.traverse(o=>{if(o.isMesh){geo.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])mat.add(m);}});
     const snapshot={walls:site.walls,rooms:site.rooms,cover:site.cover,doors:site.doors};
     return {buildMs,firstMs,knownBefore,knownAfter,initialVisible,initialCover,fullVisible:visible(),siteCounts:{walls:site.walls.length,rooms:site.rooms.length,cover:site.cover.length},renderedWallOwners:owners.length,siteGeometry:geo.size,siteMaterials:mat.size,gpu:{textures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,programs:renderer.info.programs?.length},atlas:{wallPages:wallTextures.length,floorPages:floorTextures.length,wallMipBytes:bytes(wallTextures),floorMipBytes:bytes(floorTextures),patinaMipBytes:bytes(textures)},samples,physicalUnchanged:JSON.stringify(snapshot)===JSON.stringify((({walls,rooms,cover,doors})=>({walls,rooms,cover,doors}))(JSON.parse(serialized)))};
    },{seed,serialized,checkLifetime:label==='candidate'});
    check(result.physicalUnchanged,'presentation mutated canonical geometry '+label+' '+seed);
    check(result.renderedWallOwners>0&&result.samples.some(s=>s.wallWithWear>0),'missing real wall submissions');
    for(const s of result.samples)check(Object.values(s.mainFamilies).reduce((a,b)=>a+b,0)===s.main&&Object.values(s.shadowFamilies).reduce((a,b)=>a+b,0)===s.shadow,'incomplete draw census');
    evidence.push({label,sha,view,seed,archetype,condition,corpus,...result});
    writeFileSync(out+'/summary.json',JSON.stringify({roots:roots.map(([label,,base,sha])=>({label,sha})),evidence},null,2));
    await page.screenshot({path:out+'/'+label+'-'+view+'-'+archetype+'-tactical.png'});
    if(view==='desktop'&&label!=='pre-w0'){
     // Capture same-room close/night and far views using the same site again.
     // Keep the last measured session in the renderer's current view by
     // constructing an equivalent independent session, no mutation of Site.
     await page.evaluate(({seed,serialized})=>{
      const {scene,newSession,team,activateSite}=window.w8,site=JSON.parse(serialized);activateSite(site);
      const s=newSession(0,seed,'exterior-known','standard',undefined,site);
      window.w8.capture={site,s};
      const room=site.rooms.find(r=>['kitchen','exam','workshop','bay'].includes(r.purpose??''))??site.rooms[0];
      scene.view.focus={x:room.x+room.w/2,y:room.y+room.h/2};scene.view.zoom=2.5;scene.updateCamera(1);scene.update(s,team(s)[0].id,1,null,true);
     },{seed,serialized});
     await page.screenshot({path:out+'/'+label+'-'+view+'-'+archetype+'-close.png'});
     await page.evaluate(()=>{const {scene,team,capture:{s}}=window.w8;s.lightingMode='night';scene.update(s,team(s)[0].id,1,null,true);});
     await page.screenshot({path:out+'/'+label+'-'+view+'-'+archetype+'-night.png'});
     await page.evaluate(()=>{const {scene,team,capture:{s}}=window.w8;s.lightingMode='day';scene.resetCamera();scene.view.zoom=.75;scene.updateCamera(1);scene.update(s,team(s)[0].id,1,null,true);});
     await page.screenshot({path:out+'/'+label+'-'+view+'-'+archetype+'-far.png'});
    }
   }
   check(!errors.length,label+' '+view+' '+errors.join(' | '));
   await page.evaluate(()=>{window.w8.scene.renderer.dispose();window.w8.scene.renderer.forceContextLoss();});await page.close();
  }
 }
 const pairs=[];
 const stable=(r,mode)=>r.samples.filter(s=>s.view===mode).slice(1);
 const max=(r,mode,k)=>Math.max(...stable(r,mode).map(s=>s[k]));
 for(const c of evidence.filter(r=>r.label==='candidate')){
  const w=evidence.find(r=>r.label==='base'&&r.view===c.view&&r.seed===c.seed);
  const h=evidence.find(r=>r.label==='pre-w0'&&r.view===c.view&&r.seed===c.seed);
  for(const k of ['knownBefore','knownAfter','initialVisible','initialCover','fullVisible','siteCounts'])check(JSON.stringify(w[k])===JSON.stringify(c[k]),'Current exact-base '+k+' '+c.seed);
  for(const mode of ['known','full']){
   const value=r=>({structural:max(r,mode,'structural'),wallWithWear:max(r,mode,'wallWithWear'),main:max(r,mode,'main'),shadow:r.samples.find(s=>s.view===mode).shadow});
   const now=value(c),prior=value(w),historical=h?value(h):null;
   const mainFamilies=r=>stable(r,mode).reduce((a,s)=>s.main>=(a?.main??-1)?s:a,null).mainFamilies;
   const a=mainFamilies(w),b=mainFamilies(c);
   const familyDelta=Object.fromEntries([...new Set([...Object.keys(a),...Object.keys(b)])].filter(k=>(a[k]??0)!==(b[k]??0)).map(k=>[k,(b[k]??0)-(a[k]??0)]));
   if(now.main!==prior.main)console.log('W8_FAMILY_DELTA '+JSON.stringify({seed:c.seed,view:c.view,mode,familyDelta}));
   for(const k of ['structural','wallWithWear','main','shadow'])check(now[k]<=prior[k],'W8 draw regression '+c.seed+' '+mode+' '+k+' '+JSON.stringify({prior,now}));
   for(const k of ['wallMipBytes','floorMipBytes','patinaMipBytes'])check(c.atlas[k]<=w.atlas[k],'W8 atlas budget regression '+c.seed+' '+k);
   const oldW7=evidence.find(r=>r.label==='w7'&&r.view===c.view&&r.seed===c.seed);
   const historicalComparable=h?['knownBefore','knownAfter','initialVisible','initialCover','fullVisible','siteCounts'].every(k=>JSON.stringify(h[k])===JSON.stringify(oldW7[k])):false;
   pairs.push({seed:c.seed,view:c.view,mode,prior,now,historical,historicalComparable,historicalW7:value(oldW7),geometryOnlyReduction:historicalComparable?1-value(oldW7).structural/historical.structural:null,wallReduction:historicalComparable?1-value(oldW7).wallWithWear/historical.wallWithWear:null});
  }
 }
 writeFileSync(out+'/summary.json',JSON.stringify({note:'Actual static WebGL submissions; CPU/driver samples are diagnostic, not live p95 or device FPS. Historical comparator only eligible at equal known/visible owner state.',roots:roots.map(([label,,,sha])=>({label,sha})),pairs,evidence},null,2));
 console.log('W8_BASELINE '+JSON.stringify(pairs));
}finally{await browser?.close();for(const server of servers)server.kill('SIGTERM');}
