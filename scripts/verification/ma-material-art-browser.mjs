/** MA9 bounded browser acceptance. Captures actual production renderer
 * and real lab controls; software timings are diagnostic, not device FPS. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const dir='artifacts/ma-art',sleep=ms=>new Promise(r=>setTimeout(r,ms));
mkdirSync(dir,{recursive:true});
const servers=[],report=[];
let browser;
async function serve(root,port){
 const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore',env:{...process.env,CI:'true'}});
 servers.push(server);
 const url='http://127.0.0.1:'+port;
 for(let i=0;i<150;i++){try{if((await fetch(url+'/wall-material-lab.html')).ok)return url;}catch{}await sleep(150);}
 throw Error('Vite unavailable '+root);
}
function captureErrors(page){const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION/i.test(m.text()))errors.push(m.text());});return errors;}
try{
 const candidate=await serve(process.cwd(),4421),reference=process.env.MA_REFERENCE_ROOT?await serve(process.env.MA_REFERENCE_ROOT,4422):undefined;
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const lab=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1}),errors=captureErrors(lab);
 await lab.goto(candidate+'/wall-material-lab.html');
 await lab.locator('#effects canvas').first().waitFor();
 assert.equal(await lab.locator('#effects article').count(),12);
 await lab.selectOption('#comparison','ma');
 await lab.screenshot({path:dir+'/lab-ma0-current.png'});
 await lab.selectOption('#density','56');
 await lab.selectOption('#variant','2');
 await lab.locator('[data-level="50"]').click();
 await lab.waitForFunction(()=>document.querySelector('#condition-value').textContent==='50');
 await lab.screenshot({path:dir+'/lab-density-56.png'});
 for(const tab of ['combined','floors','fixtures','materials','masks','specimen']){
  await lab.locator('[data-tab="'+tab+'"]').click();
  await lab.locator('[data-panel="'+tab+'"]').waitFor({state:'visible'});
  await sleep(250);
  await lab.screenshot({path:dir+'/lab-'+tab+'.png'});
 }
 assert.equal(await lab.locator('#specimen-error').textContent(),'');
 await lab.locator('[data-tab="tactical"]').click();
 await lab.locator('#render-tactical').click();
 await lab.waitForFunction(()=>document.querySelector('#tactical-status')?.textContent?.includes('metric wall and floor candidate'),{},{timeout:60000});
 await lab.screenshot({path:dir+'/lab-metric-tactical.png'});
 assert.deepEqual(errors,[]);
 await lab.close();
 const cases=[{seed:101,archetype:'apartment',viewport:{width:390,height:844}},{seed:109,archetype:'clinic',viewport:{width:390,height:844}},{seed:119,archetype:'utility',viewport:{width:390,height:844}}];
 for(const scenario of cases){
  const results=[];
  for(const [label,url] of [['reference',reference],['candidate',candidate]]){
   if(!url)continue;
   const page=await browser.newPage({viewport:scenario.viewport,deviceScaleFactor:1}),errors=captureErrors(page);
   await page.route('**/ma-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;overflow:hidden"></body></html>'}));
   await page.goto(url+'/ma-probe');
   const data=await page.evaluate(async ({seed,archetype,viewport})=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {generateSite}=await import('/src/breach-site.ts');
    const {newSession,team}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    const scene=new TacticalScene3D();scene.resize(viewport.width,viewport.height);
    const site={...generateSite(seed,'standard',undefined,{mission:'intel'},{archetype}),conditionLevel:100};
    activateSite(site);const session=newSession(0,seed,'floor-plan','standard',undefined,site);
    const start=performance.now();scene.applySite(site);const buildMs=performance.now()-start;
    scene.resetCamera();scene.setMode('iso');scene.view.zoom=1.25;
    const draw=()=>scene.update(session,team(session)[0].id,1,null,true);
    draw();draw();
    const renderer=scene.renderer,original=renderer.renderBufferDirect;
    let calls=0;renderer.renderBufferDirect=function(...args){calls++;return original.apply(this,args);};
    const frames=[];try{for(let i=0;i<12;i++){calls=0;const t=performance.now();draw();frames.push({calls,ms:performance.now()-t});}}finally{renderer.renderBufferDirect=original;}
    const textures=[...new Set(scene.patinaWallSurfaces.map(x=>x.texture))];
    const atlasBytes=textures.reduce((n,t)=>n+t.image.data.byteLength,0);
    const saved=textures.map(t=>t.image.data.slice()),ids=textures.map(t=>t.uuid);
    scene.previewConditionMasks(site,0);draw();scene.previewConditionMasks(site,100);draw();
    if(textures.some((t,i)=>t.uuid!==ids[i]||t.image.data.some((v,j)=>v!==saved[i][j])))throw Error('Wall atlas condition roundtrip changed identity or artwork');
    window.maScene=scene;window.maDraw=draw;window.maSite=site;
    return {walls:site.walls.length,rooms:site.rooms.length,atlasBytes,atlasTextures:textures.length,buildMs,frames,gpuTextures:renderer.info.memory.textures,geometries:renderer.info.memory.geometries,programs:renderer.info.programs?.length};
   },scenario);
   await page.screenshot({path:dir+'/'+scenario.archetype+'-'+label+'-tactical.png'});
   await page.evaluate(()=>{window.maScene.view.zoom=2.5;window.maDraw();});
   await page.screenshot({path:dir+'/'+scenario.archetype+'-'+label+'-close.png'});
   await page.evaluate(()=>{window.maScene.previewConditionMasks(window.maSite,0);window.maDraw();});
   await page.screenshot({path:dir+'/'+scenario.archetype+'-'+label+'-clean-masks.png'});
   await page.close();
   assert.deepEqual(errors,[],label+' '+scenario.archetype);
   results.push({label,...data});
  }
  const before=results.find(r=>r.label==='reference'),after=results.find(r=>r.label==='candidate');
  assert.ok(after.atlasBytes>0);
  if(before){
   assert.equal(after.walls,before.walls);assert.equal(after.rooms,before.rooms);
   assert.equal(after.atlasBytes,before.atlasBytes);assert.equal(after.atlasTextures,before.atlasTextures);
  }
  report.push({...scenario,results});
 }
 writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report));
}finally{await browser?.close();for(const s of servers)s.kill();}
