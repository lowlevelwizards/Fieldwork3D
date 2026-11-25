/** First real-renderer audition. This is a static, matched visual/structural
 * pilot, not the final 90-frame live performance acceptance. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4412,base='http://127.0.0.1:'+port,dir='artifacts/w2-wall-audition';
mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore',env:{...process.env,CI:'true'}});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
let browser;
const evidence=[];
const w4=process.env.FIELDWORK_W4_STRUCTURE==='1';
const w3=w4||process.env.FIELDWORK_W3_ATLAS==='1';
try{
 let ready=false;
 for(let i=0;i<150;i++){try{if((await fetch(base+'/map-lab.html')).ok){ready=true;break;}}catch{}await sleep(150);}
 check(ready,'Vite unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(process.env.FIELDWORK_CI_CHROME&&chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [name,viewport] of [['phone',{width:390,height:844}],['desktop',{width:1280,height:800}]]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))errors.push(m.text());});
  try{
   await page.route('**/w2-wall-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;overflow:hidden"></body></html>'}));
   await page.goto(base+'/w2-wall-probe');
   await page.evaluate(async viewport=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {generateSite}=await import('/src/breach-site.ts');
    const {newSession,team}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);
    window.w2Probe={scene,generateSite,newSession,team,activateSite};
   },viewport);
   for(const [seed,archetype] of [[23,'house'],[97,'garage']]){
    await page.evaluate(({seed,archetype})=>{
     const p=window.w2Probe;
     p.site={...p.generateSite(seed,'standard',undefined,{mission:'intel'},{archetype}),conditionLevel:100};
     p.activateSite(p.site);p.session=p.newSession(0,seed,'floor-plan','standard',undefined,p.site);
    },{seed,archetype});
    const results=[];
    for(const mode of w4?['legacy','packed','atlas','compiled']:w3?['legacy','packed','atlas']:['legacy','packed']){
     const result=await page.evaluate(mode=>{
      const integrated=mode!=='legacy';
      const {scene,site,session,team}=window.w2Probe;
      const atlasMode=mode==='atlas'||mode==='compiled';
      scene.wallAudition=integrated?{effect:'all',atlas:atlasMode}:undefined;
      scene.wallStructureCompiled=mode==='compiled';
      const buildStart=performance.now();scene.applySite(site);const buildMs=performance.now()-buildStart;scene.resetCamera();scene.setMode('iso');
      scene.view.zoom=1.25;
      const inventory=scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-body');
      const masks=scene.patinaWallSurfaces;
      const trim=scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily!=='structural-wall-body');
      const structuralTriangles=scene.walls.reduce((n,w)=>n+(w.mesh.geometry.index?.count??w.mesh.geometry.getAttribute('position').count)/3,0);
      const shadowBodies=scene.walls.filter(w=>w.mesh.castShadow).length;
      if(mode==='compiled'&&trim.some(w=>w.mesh.userData.fieldworkDrawFamily!=='structural-wall-trim-packet'||w.mesh.castShadow))throw Error('Compiled trim retained source meshes or changed shadow policy');
      let overlays=0,decals=0;
      for(const w of inventory)w.mesh.traverse(o=>{
       if(o.userData.fieldworkDrawFamily==='wall-weathering')overlays++;
       if(o.userData.fieldworkDrawFamily==='surface-wear-decal')decals++;
      });
      const renderer=scene.renderer,original=renderer.renderBufferDirect;
      const draw=()=>scene.update(session,team(session)[0].id,1,null,true);
      const firstDrawStart=performance.now();draw();const firstDrawMs=performance.now()-firstDrawStart;draw();
      let frames=[];
      try{
       for(let i=0;i<18;i++){
        let total=0,weather=0,body=0,trimDraws=0;
        renderer.renderBufferDirect=function(...args){
         total++;
         const family=args[4]?.userData?.fieldworkDrawFamily;
         if(family==='wall-weathering')weather++;
         if(family==='structural-wall-body')body++;
         if(['structural-wall-skirting','structural-wall-cap','structural-wall-cap-joint','structural-wall-trim-packet'].includes(family))trimDraws++;
         return original.apply(this,args);
        };
        const start=performance.now();draw();
        frames.push({total,weather,body,trimDraws,ms:performance.now()-start});
       }
      }finally{renderer.renderBufferDirect=original;}
      const textures=[...new Set(masks.map(item=>item.texture))];
      const textureBytes=textures.reduce((sum,t)=>sum+t.image.data.byteLength,0);
      const textureCount=textures.length;
      if(integrated){
       if(masks.length!==inventory.length||masks.some(m=>atlasMode?!m.atlasSlot:!m.recipe))throw Error('W2 mask/segment ownership mismatch');
       const ids=masks.map(m=>m.texture.uuid);
       const initial=textures.map(t=>t.image.data.slice());
       const versions=textures.map(t=>t.version);
       scene.previewConditionMasks(site,0);
       if(textures.some(t=>t.image.data.some((v,i)=>i%4===3&&v!==255)))throw Error('Baked surface has nonopaque texels');
       if(!textures.some((t,j)=>t.image.data.some((v,i)=>v!==initial[j][i])))throw Error('Condition slider did not change surface');
       scene.previewConditionMasks(site,100);
       if(textures.some((t,j)=>t.image.data.some((v,i)=>v!==initial[j][i])))throw Error('Condition roundtrip not deterministic');
       if(ids.some((id,i)=>id!==masks[i].texture.uuid))throw Error('Slider reallocated texture');
       if(textures.some((t,i)=>t.version!==versions[i]+2))throw Error('Slider updated a page more than once per edit');
       draw();
      }
      if(integrated&&inventory.some(w=>w.mesh.material.map!==masks.find(m=>m.index===w.index)?.texture))throw Error('Packed wall is not using standard map');
      const actual={mode,integrated,bodies:inventory.length,trimMeshes:trim.length,structuralTriangles,shadowBodies,overlays,decals,textureBytes,textureCount,gpuTextures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,programs:renderer.info.programs?.length,buildMs,firstDrawMs,frames};
      if(atlasMode&&textureCount>=inventory.length)throw Error('Atlas did not reduce texture objects');
      if(integrated&&(overlays||decals||frames.some(f=>f.weather)))throw Error('W2 retained independent wall weathering');
      return actual;
     },mode);
     results.push(result);
     await page.screenshot({path:dir+'/'+name+'-'+archetype+'-'+mode+'.png'});
    }
    check(results[0].bodies===results[1].bodies,'Wall geometry inventory changed');
    check(results[0].overlays>0&&results[0].frames.some(f=>f.weather>0),'Legacy reference had no real weather submissions');
    check(results.slice(1).every(r=>r.bodies===results[0].bodies&&r.textureBytes===results[0].textureBytes),'Conditioned wall geometry or texture budget changed');
    if(w3){const packed=results.find(r=>r.mode==='packed'),atlas=results.find(r=>r.mode==='atlas');
     check(atlas.frames.every(f=>f.total<=Math.max(...packed.frames.map(p=>p.total))),'W3 increased structural render submissions');
     check(atlas.textureCount<=packed.textureCount*.25,'W3 missed 75% wall texture object reduction');
    }
    if(w4){const a=results.find(r=>r.mode==='atlas'),b=results.find(r=>r.mode==='compiled');
     check(b.structuralTriangles===a.structuralTriangles&&b.shadowBodies===a.shadowBodies,'W4 changed structural triangles or shadow bodies');
     check(a.trimMeshes-b.trimMeshes>=a.bodies,'W4 missed at least one trim mesh per ordinary wall');
     check(Math.max(...b.frames.map(f=>f.trimDraws))<Math.max(...a.frames.map(f=>f.trimDraws)),'W4 did not reduce real trim submissions');
    }
    evidence.push({name,seed,archetype,results});
   }
   if(w3&&!w4&&name==='desktop'){
    // A real WebGL mip witness: two high-contrast strips, four independent
    // face colors. Sample with explicit LOD through the safe face range.
    const mip=await page.evaluate(async()=>{
     const {atlasWallStrip}=await import('/src/worldgen/wall-surface-recipe.ts');
     const face=(color,face)=>({length:64,height:56,face,color,surface:'plaster',events:[]});
     const bytes=new Uint8Array(64*128*4);
     bytes.set(atlasWallStrip({front:face(0xff0000,1),back:face(0x00ff00,-1)},0,64,'none',false));
     bytes.set(atlasWallStrip({front:face(0x0000ff,1),back:face(0xffff00,-1)},0,64,'none',false),64*64*4);
     const canvas=document.createElement('canvas');canvas.width=canvas.height=1;
     const gl=canvas.getContext('webgl2',{antialias:false,preserveDrawingBuffer:true});
     if(!gl)throw Error('W3 mip probe requires WebGL2');
     const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
     const vs=shader(gl.VERTEX_SHADER,'#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0,1);}');
     const fs=shader(gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;uniform sampler2D tex;uniform vec2 uv;uniform float lod;out vec4 color;void main(){color=textureLod(tex,uv,lod);}');
     const prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog));
     gl.useProgram(prog);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,64,128,0,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST_MIPMAP_NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.generateMipmap(gl.TEXTURE_2D);
     const uv=gl.getUniformLocation(prog,'uv'),lod=gl.getUniformLocation(prog,'lod'),pixel=new Uint8Array(4);
     let samples=0;
     for(const [row,expected] of [[4,[255,0,0]],[36,[0,255,0]],[68,[0,0,255]],[100,[255,255,0]]])for(const offset of [.5,12,23.5])for(let level=0;level<=5;level++){
      gl.uniform2f(uv,.5,(row+offset)/128);gl.uniform1f(lod,level);gl.drawArrays(gl.TRIANGLES,0,3);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
      if(expected.some((v,i)=>Math.abs(pixel[i]-v)>1))throw Error('W3 face mip bleed at row '+row+' LOD '+level+': '+pixel);
      samples++;
     }
     gl.deleteTexture(tex);gl.deleteProgram(prog);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();
     return {samples,maxIsolatedFaceLod:5,coarseLevelsCanBlend:true};
    });
    console.log('W3_MIP_WITNESS '+JSON.stringify(mip));
    // Additional semantic matrix: same building, camera and geometry across
    // five condition values; two opposing close views at 100.
    for(const [seed,archetype] of [[23,'house'],[31,'motel'],[42,'clinic'],[51,'retail'],[97,'garage'],[63,'warehouse']]){
     await page.evaluate(({seed,archetype})=>{
      const p=window.w2Probe;
      p.site={...p.generateSite(seed,'standard',undefined,{mission:'intel'},{archetype}),conditionLevel:0};
      p.activateSite(p.site);p.session=p.newSession(0,seed,'floor-plan','standard',undefined,p.site);
      p.scene.wallAudition={effect:'all',atlas:true};p.scene.applySite(p.site);p.scene.resetCamera();p.scene.setMode('iso');p.scene.view.zoom=1.25;
     },{seed,archetype});
     const familyCounts=await page.evaluate(()=>{const counts={};for(const item of window.w2Probe.scene.patinaWallSurfaces)for(const face of [item.atlasSlot.pair.front,item.atlasSlot.pair.back])counts[face.surface]=(counts[face.surface]||0)+1;return counts;});
     for(const level of [0,25,50,75,100]){
      await page.evaluate(level=>{const {scene,site,session,team}=window.w2Probe;scene.previewConditionMasks(site,level);scene.update(session,team(session)[0].id,1,null,true);},level);
      await page.screenshot({path:dir+'/matrix-'+archetype+'-'+level+'.png'});
     }
     for(const sign of [1,-1]){
      await page.evaluate(sign=>{const {scene,session,team}=window.w2Probe;const wall=scene.walls.find(w=>w.exterior&&w.mesh.userData.fieldworkDrawFamily==='structural-wall-body');if(!wall)throw Error('No exterior face for close audition');const {a,b}=wall.segment;scene.view.focus={x:(a.x+b.x)/2,y:(a.y+b.y)/2};scene.view.yaw=-Math.atan2(b.y-a.y,b.x-a.x)+(sign===1?0:Math.PI);scene.view.pitch=35*Math.PI/180;scene.view.zoom=2.7;scene.updateCamera(1);scene.update(session,team(session)[0].id,1,null,true);},sign);
      await page.screenshot({path:dir+'/matrix-'+archetype+'-close-'+sign+'.png'});
     }
     await page.evaluate(()=>{const {scene,session,team}=window.w2Probe;scene.resetCamera();scene.view.zoom=.75;scene.updateCamera(1);scene.update(session,team(session)[0].id,1,null,true);});
     await page.screenshot({path:dir+'/matrix-'+archetype+'-far.png'});
     await page.evaluate(()=>{const {scene,session,team}=window.w2Probe;session.lightingMode='night';scene.view.zoom=1.25;scene.updateCamera(1);scene.update(session,team(session)[0].id,1,null,true);});
     await page.screenshot({path:dir+'/matrix-'+archetype+'-night.png'});
     console.log('W3_FACE_MATRIX '+JSON.stringify({seed,archetype,familyCounts}));
    }
   }
   await page.evaluate(()=>{
    const {scene,site}=window.w2Probe;
    const masks=[...new Set(scene.patinaWallSurfaces.map(m=>m.texture))];
    const packets=scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-trim-packet').map(w=>w.mesh.geometry);
    const geometryDisposals=new Map(packets.map(g=>[g.uuid,0]));
    for(const g of packets)g.addEventListener('dispose',()=>geometryDisposals.set(g.uuid,geometryDisposals.get(g.uuid)+1));
    const disposals=new Map(masks.map(t=>[t.uuid,0]));
    for(const t of masks)t.addEventListener('dispose',()=>disposals.set(t.uuid,disposals.get(t.uuid)+1));
    scene.applySite(site);
    if([...disposals.values()].some(n=>n!==1))throw Error('Retired mask not disposed exactly once');
    if([...geometryDisposals.values()].some(n=>n!==1))throw Error('Retired trim packet not disposed exactly once');
    if(scene.patinaWallSurfaces.some(m=>masks.includes(m.texture)))throw Error('Old mask retained');
    scene.renderer.dispose();scene.renderer.forceContextLoss();
   });
   check(!errors.length,'WebGL/runtime errors: '+errors.join(' | '));
  }finally{await page.close();}
 }
 // Test actual Map Lab controls, not just private scene fields.
 const lab=await browser.newPage({viewport:{width:1280,height:800}});
 const errors=[];lab.on('pageerror',e=>errors.push(e.message));
 lab.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))errors.push(m.text());});
 try{
  await lab.goto(base+'/map-lab.html?seed=23&scale=small&condition=100');
  await lab.waitForFunction(()=>document.getElementById('info')?.textContent?.includes('CONDITION: 100'),null,{timeout:180000});
  await lab.locator('summary').filter({hasText:'ARCHITECTURAL SURFACE AUDITION'}).click();
  await lab.locator('#wallAuditionMode').selectOption('packed');
  await lab.locator('#wallAuditionEffect').selectOption('contact');
  await lab.locator('#conditionClean').click();
  await lab.waitForFunction(()=>document.getElementById('conditionValue')?.textContent?.startsWith('0 / 100'));
  await lab.locator('#conditionDecay').click();
  await lab.locator('#wallAuditionEffect').selectOption('all');
  await lab.locator('#wallAuditionMode').selectOption('legacy');
  check(await lab.locator('#wallAuditionEffect').isDisabled(),'Legacy mode effect isolation still enabled');
  await lab.locator('#wallAuditionMode').selectOption(w3?'atlas':'packed');
  await lab.locator('#wallAuditionEffect').selectOption('damp');
  if(w3){await lab.locator('#wallAuditionEffect').selectOption('moss');await lab.locator('#wallAuditionEffect').selectOption('rust');}
  await lab.locator('#wallAuditionEffect').selectOption('all');
  await lab.screenshot({path:dir+'/map-lab-controls.png'});
  check(!errors.length,'Map Lab errors: '+errors.join(' | '));
 }finally{await lab.close();}
 writeFileSync(dir+'/summary.json',JSON.stringify({note:'Static omniscient same-site pilot only, software WebGL CPU timing, not final acceptance',evidence},null,2)+'\n');
 console.log('W2_WALL_AUDITION '+JSON.stringify(evidence));
}finally{await browser?.close();server.kill('SIGTERM');}
