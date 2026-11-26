/** V18: actual production desktop/phone renderer, matched base and head
 * sites. Timing is software WebGL CPU wall time, not device FPS. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
const output='artifacts/v18-exterior-browser';
mkdirSync(output,{recursive:true});
const cases=['house','townhouse','apartment','retail','office','garage','warehouse','restaurant','motel','utility','clinic'].map((archetype,i)=>({archetype,seed:17+i*11,scale:'medium'}));
cases.push({archetype:'house',seed:118,scale:'small'},{archetype:'restaurant',seed:117,scale:'small'},{archetype:'warehouse',seed:219,scale:'large'},{archetype:'motel',seed:320,scale:'large'});
const before=process.env.V18_BASE_DIR;
const variants=before?[{name:'before',dir:before},{name:'after',dir:'.'}]:[{name:'after',dir:'.'}];
const evidence=[];let browser;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const variant of variants){
  const origin='http://127.0.0.1:4491';
  const server=spawn(process.execPath,[resolve(variant.dir,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4491','--strictPort'],{cwd:variant.dir,stdio:'ignore'});
  try{
   let ready=false;for(let i=0;i<120;i++){try{if((await fetch(origin+'/map-lab.html')).ok){ready=true;break;}}catch{}await wait(200);}
   if(!ready)throw Error('Vite unavailable '+variant.name);
   for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
    const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|GL_INVALID/i.test(m.text()))errors.push(m.text());});
    try{
     await page.route('**/v18-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;overflow:hidden"></body></html>'}));
     await page.goto(origin+'/v18-probe');
     await page.evaluate(async({width,height})=>{
      const {TacticalScene3D}=await import('/src/breach-3d.ts');
      const {generateSite}=await import('/src/breach-site.ts');
      const {newSession,team}=await import('/src/breach-game.ts');
      const {activateSite}=await import('/src/breach-core.ts');
      const {planPropertySurfaces}=await import('/src/worldgen/property-surfaces.ts');
      const scene=new TacticalScene3D();scene.resize(width,height);
      if(!scene.canvas.isConnected)document.body.appendChild(scene.canvas);
      window.v18={scene,generateSite,newSession,team,activateSite,planPropertySurfaces};
     },viewport);
     for(const scenario of cases){
      const result=await page.evaluate(({scenario,after})=>{
       const {scene,generateSite,newSession,team,activateSite,planPropertySurfaces}=window.v18;
       const {seed,scale,archetype}=scenario;
       const site=generateSite(seed,scale,undefined,{mission:'intel'},{archetype,vehiclePlacement:false});
       const snapshot=JSON.stringify(site);
       const old=[];scene.root.traverse(o=>{if(o.userData.fieldworkDrawFamily==='exterior-ground-finish')old.push(o.geometry);});
       const disposal=new Map(old.map(g=>[g,0]));
       for(const g of old)g.addEventListener('dispose',()=>disposal.set(g,disposal.get(g)+1));
       activateSite(site);const session=newSession(0,seed,'exterior-known',scale,undefined,site);
       const begin=performance.now();scene.applySite(site);const buildMs=performance.now()-begin;
       if([...disposal.values()].some(n=>n!==1))throw Error('Exterior geometry not disposed exactly once');
       scene.setMode('iso');scene.resetCamera();scene.view.zoom=1.25;
       const draw=all=>scene.update(session,team(session)[0].id,1/60,null,all);
       draw(false);
       const hidden=[...scene.coverGroups].filter(([,g])=>!g.visible).length;
       draw(true);draw(true);
       const counts=[];for(let i=0;i<5;i++){const at=performance.now();draw(true);const s=scene.performanceStats();counts.push({ms:performance.now()-at,calls:s.calls,triangles:s.triangles,geometries:s.geometryCount,textures:s.textureCount,materials:s.siteMaterialCount});}
       const marks=planPropertySurfaces(site);
       let packets=0,packetTriangles=0;
       scene.root.traverse(o=>{if(o.userData.fieldworkDrawFamily==='exterior-ground-finish'){packets++;packetTriangles+=o.geometry.index.count/3;if(o.castShadow||!o.receiveShadow)throw Error('Ground finish shadow policy');}});
       if(after&&packetTriangles%2!==0)throw Error('Incomplete flat ground quads');
       const forbidden=new Set(['vehicle','sedan','pickup','van','suv','shrub-round','shrub-tall','bush','hedge']);
       if(site.cover.some(o=>forbidden.has(o.fixture)))throw Error('Retired fixture in generated site');
       if(JSON.stringify(site)!==snapshot)throw Error('Authoritative site mutated');
       const exterior=site.cover.filter(o=>!site.rooms.some(r=>o.x>=r.x&&o.x<=r.x+r.w&&o.y>=r.y&&o.y<=r.y+r.h));
       window.v18.current={scene,session,draw};
       return {site:scenario,entry:site.entrySide,plan:site.planFamily,physicalExterior:exterior.length,hidden,marks:marks.length,packets,packetTriangles,buildMs,counts};
      },{scenario,after:variant.name==='after'});
      evidence.push({variant:variant.name,viewport:viewport.width,...result});
      console.log('V18_BROWSER '+JSON.stringify(evidence.at(-1)));
      const prefix=output+'/'+variant.name+'-'+viewport.width+'-'+scenario.archetype+'-'+scenario.seed;
      await page.screenshot({path:prefix+'-iso.png'});
      await page.evaluate(()=>{const {scene,draw}=window.v18.current;scene.setMode('top');scene.resetCamera();scene.view.zoom=1.25;draw(true);});
      await page.screenshot({path:prefix+'-top.png'});
      if(errors.length)throw Error(errors.join('\n'));
      writeFileSync(output+'/summary.json',JSON.stringify(evidence,null,2));
     }
    }finally{await page.close();}
   }
  }finally{server.kill();await new Promise(r=>server.once('exit',r));}
 }
 if(!evidence.some(r=>r.variant==='after'&&r.packets>0))throw Error('No production exterior finish packet witness');
}finally{if(browser)await browser.close();}
