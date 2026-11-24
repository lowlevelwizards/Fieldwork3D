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
    for(const mode of ['legacy','packed']){
     const result=await page.evaluate(mode=>{
      const integrated=mode!=='legacy';
      const {scene,site,session,team}=window.w2Probe;
      scene.wallAudition=integrated?{effect:'all'}:undefined;
      scene.applySite(site);scene.resetCamera();scene.setMode('iso');
      scene.view.zoom=1.25;
      const inventory=scene.walls.filter(w=>w.mesh.userData.fieldworkDrawFamily==='structural-wall-body');
      const masks=scene.patinaWallSurfaces;
      let overlays=0,decals=0;
      for(const w of inventory)w.mesh.traverse(o=>{
       if(o.userData.fieldworkDrawFamily==='wall-weathering')overlays++;
       if(o.userData.fieldworkDrawFamily==='surface-wear-decal')decals++;
      });
      const renderer=scene.renderer,original=renderer.renderBufferDirect;
      const draw=()=>scene.update(session,team(session)[0].id,1,null,true);
      draw();draw();
      let frames=[];
      try{
       for(let i=0;i<18;i++){
        let total=0,weather=0,body=0;
        renderer.renderBufferDirect=function(...args){
         total++;
         const family=args[4]?.userData?.fieldworkDrawFamily;
         if(family==='wall-weathering')weather++;
         if(family==='structural-wall-body')body++;
         return original.apply(this,args);
        };
        const start=performance.now();draw();
        frames.push({total,weather,body,ms:performance.now()-start});
       }
      }finally{renderer.renderBufferDirect=original;}
      const textureBytes=masks.reduce((sum,item)=>sum+item.texture.image.data.byteLength,0);
      if(integrated){
       if(masks.length!==inventory.length||masks.some(m=>!m.recipe))throw Error('W2 mask/segment ownership mismatch');
       const ids=masks.map(m=>m.texture.uuid);
       const initial=masks.map(m=>m.texture.image.data.slice());
       scene.previewConditionMasks(site,0);
       if(mode==='packed'&&masks.some(m=>m.texture.image.data.some((v,i)=>i%4===3&&v!==255)))throw Error('Baked surface has nonopaque texels');
       if(!masks.some((m,j)=>m.texture.image.data.some((v,i)=>v!==initial[j][i])))throw Error('Condition slider did not change surface');
       scene.previewConditionMasks(site,100);
       if(masks.some((m,j)=>m.texture.image.data.some((v,i)=>v!==initial[j][i])))throw Error('Condition roundtrip not deterministic');
       if(ids.some((id,i)=>id!==masks[i].texture.uuid))throw Error('Slider reallocated texture');
       draw();
      }
      if(mode==='packed'&&inventory.some(w=>w.mesh.material.map!==masks.find(m=>m.index===w.index)?.texture))throw Error('Packed wall is not using standard map');
      const actual={mode,integrated,bodies:inventory.length,overlays,decals,textureBytes,frames};
      if(integrated&&(overlays||decals||frames.some(f=>f.weather)))throw Error('W2 retained independent wall weathering');
      return actual;
     },mode);
     results.push(result);
     await page.screenshot({path:dir+'/'+name+'-'+archetype+'-'+mode+'.png'});
    }
    check(results[0].bodies===results[1].bodies,'Wall geometry inventory changed');
    check(results[0].overlays>0&&results[0].frames.some(f=>f.weather>0),'Legacy reference had no real weather submissions');
    check(results.slice(1).every(r=>r.bodies===results[0].bodies&&r.textureBytes===results[0].textureBytes),'Conditioned wall geometry or texture budget changed');
    evidence.push({name,seed,archetype,results});
   }
   await page.evaluate(()=>{
    const {scene,site}=window.w2Probe;
    const masks=scene.patinaWallSurfaces.map(m=>m.texture);
    const disposals=new Map(masks.map(t=>[t.uuid,0]));
    for(const t of masks)t.addEventListener('dispose',()=>disposals.set(t.uuid,disposals.get(t.uuid)+1));
    scene.applySite(site);
    if([...disposals.values()].some(n=>n!==1))throw Error('Retired mask not disposed exactly once');
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
  await lab.locator('#wallAuditionMode').selectOption('packed');
  await lab.locator('#wallAuditionEffect').selectOption('damp');
  await lab.locator('#wallAuditionEffect').selectOption('all');
  await lab.screenshot({path:dir+'/map-lab-controls.png'});
  check(!errors.length,'Map Lab errors: '+errors.join(' | '));
 }finally{await lab.close();}
 writeFileSync(dir+'/summary.json',JSON.stringify({note:'Static omniscient same-site pilot only, software WebGL CPU timing, not final acceptance',evidence},null,2)+'\n');
 console.log('W2_WALL_AUDITION '+JSON.stringify(evidence));
}finally{await browser?.close();server.kill('SIGTERM');}
