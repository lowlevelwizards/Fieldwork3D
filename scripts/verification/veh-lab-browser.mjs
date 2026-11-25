/** Critical browser smoke and actual WebGL draw comparison, no claimed device FPS. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const output='artifacts/veh-lab-browser';
mkdirSync(output,{recursive:true});
const server=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','4498','--strictPort'],{stdio:'ignore'});
const url='http://127.0.0.1:4498/vehicle-lab.html';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let browser;const report=[];
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await wait(150);}
 if(!ready)throw Error('Vehicle Lab server unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/opt/google/chrome/chrome'].find(existsSync);
 browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,deviceScaleFactor:1}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&/WebGLProgram|Shader Error|INVALID_OPERATION|GL_INVALID/i.test(m.text()))errors.push(m.text());});
  try{
   await page.goto(url);await page.locator('#diagnostics').waitFor();
   await page.waitForFunction(()=>document.getElementById('diagnostics').textContent.includes('vehicle triangles'));
   const controls=await page.locator('#family option').count();assert.equal(controls,6);
   for(let i=0;i<6;i++){
    await page.locator('#family').selectOption(String(i));
    await page.locator('#paint').selectOption('6');
    await page.locator('#view').selectOption('iso');
    await page.screenshot({path:output+'/'+viewport.width+'-family-'+i+'-iso.png'});
    await page.locator('#view').selectOption('side');
    await page.screenshot({path:output+'/'+viewport.width+'-family-'+i+'-side.png'});
   }
   await page.locator('#count').selectOption('6');await page.locator('#view').selectOption('iso');
   await page.screenshot({path:output+'/'+viewport.width+'-lineup.png'});
   await page.locator('#family').selectOption('0');
   await page.locator('#count').selectOption('50');
   await page.locator('#batch').selectOption('individual');
   const individual=await page.locator('#diagnostics').innerText();
   await page.locator('#batch').selectOption('instanced');
   const instanced=await page.locator('#diagnostics').innerText();
   assert.match(individual,/50 vehicle draws/);assert.match(instanced,/1 vehicle draws/);
   await page.screenshot({path:output+'/'+viewport.width+'-50-instanced.png'});
   await page.locator('#footprint').selectOption('on');await page.locator('#count').selectOption('1');
   await page.locator('#view').selectOption('top');
   await page.screenshot({path:output+'/'+viewport.width+'-footprint.png'});
   assert.deepEqual(errors,[]);
   report.push({viewport,individual,instanced,errors});
   await page.route('**/veh-probe',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body style="margin:0;overflow:hidden"></body></html>'}));
   await page.goto('http://127.0.0.1:4498/veh-probe');
   const actual=await page.evaluate(async({width,height})=>{
    const {TacticalScene3D}=await import('/src/breach-3d.ts');
    const {generateSite}=await import('/src/breach-site.ts');
    const {newSession,team}=await import('/src/breach-game.ts');
    const {activateSite}=await import('/src/breach-core.ts');
    const {vehicleFamily}=await import('/src/worldgen/vehicle-catalog.ts');
    const scene=new TacticalScene3D();scene.resize(width,height);
    if(!scene.canvas.isConnected)document.body.appendChild(scene.canvas);
    let site;for(let seed=1;seed<=22;seed++){
     const s=generateSite(seed,'large',undefined,{}, {vehiclePlacement:true});
     if(s.cover.filter(c=>vehicleFamily(c.fixture??'')).length>=2){site=s;break;}
    }
    if(!site)throw Error('No occupied pilot site for tactical renderer');
    const cars=site.cover.filter(c=>vehicleFamily(c.fixture??''));
    const baseline={...site,cover:site.cover.filter(c=>!vehicleFamily(c.fixture??''))};
    const snapshot=JSON.stringify(site);
    const sample=s=>{
     activateSite(s);const session=newSession(0,s.seed,'exterior-known','large',undefined,s);
     const start=performance.now();scene.applySite(s);const buildMs=performance.now()-start;
     scene.setMode('iso');scene.resetCamera();scene.view.zoom=1.25;
     const draw=all=>scene.update(session,team(session)[0].id,1/60,null,all);
     draw(false);draw(true);draw(true);
     const samples=[];for(let i=0;i<3;i++){const t=performance.now();draw(true);const p=scene.performanceStats();samples.push({ms:performance.now()-t,calls:p.calls,triangles:p.triangles,geometries:p.geometryCount,materials:p.siteMaterialCount,templates:p.staticModelTemplates});}
     window.vehProbe={scene,draw};return {buildMs,samples};
    };
    const before=sample(baseline),after=sample(site),revisit=sample(site);
    if(JSON.stringify(site)!==snapshot)throw Error('Vehicle renderer mutated authoritative site');
    if(after.samples[0].templates.builds<=before.samples[0].templates.builds)throw Error('No default vehicle template build');
    if(revisit.samples[0].templates.hits<=after.samples[0].templates.hits)throw Error('Vehicle template not reused');
    return {seed:site.seed,archetype:site.archetype,vehicles:cars.length,before,after,revisit};
   },viewport);
   await page.screenshot({path:output+'/'+viewport.width+'-tactical-iso.png'});
   await page.evaluate(()=>{const {scene,draw}=window.vehProbe;scene.setMode('top');scene.resetCamera();scene.view.zoom=1.25;draw(true);});
   await page.screenshot({path:output+'/'+viewport.width+'-tactical-top.png'});
   assert.deepEqual(errors,[]);report.at(-1).tactical=actual;
  }finally{await page.close();}
 }
 writeFileSync(output+'/summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser?.close();server.kill();}
