/** R5.2-D single phone-sized WebGL validation of the EXPERIMENTAL
 * UV1 self-shadow atlas. No production-mode changes or extra CI workflow.
 * The regular Studio smoke still exercises default lighting first.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4207,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<95;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,140));
 }
 if(!ready)throw Error('R5 atlas Studio test server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:1.5,
   isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
   if(message.type()==='error'&&
      /WebGLProgram|shader error|INVALID_OPERATION/i.test(message.text()))
    errors.push('WebGL: '+message.text());
  });
  await page.goto(origin+
   '/operator-studio.html?operatorLightingAtlas=1&operatorLightingDebug=1',
   {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
   document.getElementById('studioCanvas')?.dataset.ready==='true'&&
   Number(document.getElementById('studioCanvas')?.dataset.drawCalls)>0,
   null,{timeout:30000});
  await page.getByRole('button',{name:'REFERENCES',exact:true}).click();
  await page.locator('.reference-search').fill('OCP Infantry');
  await page.locator('.reference-card').first().click();
  await page.waitForFunction(()=>{
   const el=document.getElementById('studioCanvas');
   return Number(el?.dataset.operatorAtlasCount)>0&&
    Number(el?.dataset.operatorAtlasBytes)>0;
  },null,{timeout:25000});
  const state=await page.evaluate(()=>{
   const c=document.getElementById('studioCanvas');
   return {
    drawing:c?.dataset.ready,
    drawCalls:Number(c?.dataset.drawCalls),
    atlases:Number(c?.dataset.operatorAtlasCount),
    bytes:Number(c?.dataset.operatorAtlasBytes),
    inspector:!!document.querySelector('.studio-stage pre')
   };
  });
  if(!state.inspector)throw Error('Studio debug inspector missing');
  if(state.atlases<1||state.bytes<1)
   throw Error('R5 self-shadow atlas not materialized');
  if(state.bytes>8*1024*1024)
   throw Error('R5 atlas exceeded 8 MiB memory budget');
  await mkdir('operator-studio-captures',{recursive:true});
  const path='operator-studio-captures/r5-uv1-atlas-phone.png';
  const png=await page.locator('#studioCanvas').screenshot({path});
  if(png.byteLength<3000)throw Error('Blank atlas WebGL screenshot');
  if(errors.length)throw Error('R5 atlas WebGL errors: '+errors.join('; '));
  console.log('R5 UV1 atlas phone proof passed: '+JSON.stringify(state));
  // R5.4-C: reuse the SAME mobile browser/port for a separate cel-shading
  // diagnostic. Do not combine unapproved toon/atlas material paths.
  const toon=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:1.5,
   isMobile:true,hasTouch:true
  });
  try{
   const toonErrors=[];
   toon.on('pageerror',e=>toonErrors.push(e.message));
   toon.on('console',message=>{
    if(message.type()==='error'&&
       /WebGLProgram|shader error|INVALID_OPERATION/i.test(message.text()))
     toonErrors.push('WebGL: '+message.text());
   });
   await toon.goto(origin+
    '/operator-studio.html?operatorLightingToon=3&operatorLightingDebug=1',
    {waitUntil:'domcontentloaded'});
   await toon.waitForFunction(()=>{
    const c=document.getElementById('studioCanvas');
    return c?.dataset.ready==='true'&&
     c.dataset.operatorToonBands==='3'&&
     Number(c.dataset.operatorToonMeshes)>0&&
     Number(c.dataset.drawCalls)>0;
   },null,{timeout:30000});
   const png=await toon.locator('#studioCanvas').screenshot({
    path:'operator-studio-captures/r5-three-band-toon-phone.png'
   });
   if(png.byteLength<3000)
    throw Error('Blank three-band toon WebGL screenshot');
   if(toonErrors.length)throw Error('R5 toon WebGL errors: '+
    toonErrors.join('; '));
   console.log('R5 three-band toon phone proof passed');
  }finally{await toon.close();}
  // R5.6-B repeatable 390px reference photo matrix. View buttons always
  // produce a new real WebGL screenshot; no synthetic lightmask render.
  // The two experimental modes remain isolated from the default suite.
  const references=[
   ['ocp','OCP Infantry'],['ucp','UCP Era'],
   ['marpat','Desert MARPAT'],['aor1','AOR1'],
   ['tropentarn','Tropentarn'],['gorka','Gorka/SS-Leto']
  ];
  const records=[];
  const captures=new Set();
  let coveredAtlasViews=0;
  const {createHash}=await import('node:crypto');
  for(const mode of [
   {id:'smooth',query:'',refs:references,views:['front','side','back','fit']},
   {id:'atlas',query:'?operatorLightingAtlas=1',
    refs:references.filter(r=>r[0]==='ocp'||r[0]==='ucp'),
    views:['front','side']},
   {id:'toon2',query:'?operatorLightingToon=2',
    refs:references.filter(r=>r[0]==='ucp'||r[0]==='gorka'),
    views:['front','side']},
   {id:'toon3',query:'?operatorLightingToon=3',
    refs:references.filter(r=>r[0]==='ucp'||r[0]==='gorka'),
    views:['front','side']}
  ]){
   const viewer=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1.5,
    isMobile:true,hasTouch:true
   });
   try{
    const errs=[];
    viewer.on('pageerror',e=>errs.push(e.message));
    viewer.on('console',m=>{
     if(m.type()==='error'&&/WebGLProgram|shader error|INVALID_OPERATION/i.test(m.text()))
      errs.push(m.text());
    });
    await viewer.goto(origin+'/operator-studio.html'+mode.query,
     {waitUntil:'domcontentloaded'});
    await viewer.waitForFunction(()=>
     document.getElementById('studioCanvas')?.dataset.ready==='true',
     null,{timeout:30000});
    await viewer.getByRole('button',{name:'REFERENCES',exact:true}).click();
    for(const [slug,search] of mode.refs){
     await viewer.locator('.reference-search').fill(search);
     const entry=viewer.locator('.reference-card').first();
     await entry.click();
     for(const view of mode.views){
      await viewer.locator('[data-studio-view="'+view+'"]').click();
      const filename='operator-studio-captures/r5-'+mode.id+
       '-'+slug+'-'+view+'.png';
      const bytes=await viewer.locator('#studioCanvas').screenshot({
       path:filename
      });
      if(bytes.byteLength<3000)
       throw Error(mode.id+' '+slug+' '+view+': blank WebGL capture');
      const hash=createHash('sha256').update(bytes).digest('hex');
      captures.add(hash);
      const metrics=await viewer.locator('#studioCanvas').evaluate(el=>({
       drawCalls:Number(el.dataset.drawCalls),
       atlasCount:Number(el.dataset.operatorAtlasCount||0),
       atlasBytes:Number(el.dataset.operatorAtlasBytes||0),
       toonMeshes:Number(el.dataset.operatorToonMeshes||0),
       rendererGeometries:Number(el.dataset.rendererGeometries||0),
       rendererTextures:Number(el.dataset.rendererTextures||0)
      }));
      if(metrics.drawCalls<1)throw Error('Missing draw calls '+filename);
      // Some legitimate outfit geometries have no same-part self-occluder,
      // and must keep the vertex AO fallback rather than fabricate an atlas.
      if(mode.id==='atlas'&&metrics.atlasCount>0)
       coveredAtlasViews++;
      if(mode.id.startsWith('toon')&&metrics.toonMeshes<1)
       throw Error('Expected toon materials '+filename);
      records.push({mode:mode.id,outfit:slug,view,bytes:bytes.byteLength,
       hash:hash.slice(0,16),...metrics});
     }
    }
    if(errs.length)throw Error(mode.id+' WebGL errors '+errs.join('; '));
   }finally{await viewer.close();}
  }
  if(records.length!==36||captures.size<24||coveredAtlasViews<1)
   throw Error('R5 lighting visual matrix lacks distinct views or eligible UV1 atlas: '+
    records.length+'/'+captures.size+'/'+coveredAtlasViews);
  const {writeFile}=await import('node:fs/promises');
  await writeFile('operator-studio-captures/r5-visual-matrix.json',
   JSON.stringify({width:390,height:844,
    note:'Chromium mobile viewport, not physical iPhone calibration',
    captures:records},null,2));
  console.log('R5 36-view mobile WebGL visual matrix passed; '+
   'all 6 outfits and experimental shading modes captured.');
  // R5.6-C deterministic joint-pose WebGL captures. The same operator,
  // top, rig, and camera are used. This diagnostic does not change the
  // game's animator, IK, or production equipment.
  const cavityCases=[];
  for(const pose of ['standing','crouch','raised']){
   const viewer=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1.5,
    isMobile:true,hasTouch:true
   });
   try{
    const errs=[];
    viewer.on('pageerror',e=>errs.push(e.message));
    await viewer.goto(origin+'/operator-armor-rig-lab.html?'+
     new URLSearchParams({cavityPose:pose,view:'front',zoom:'detail'}),
     {waitUntil:'domcontentloaded'});
    await viewer.waitForFunction(()=>
     document.getElementById('armorCanvas')?.dataset.ready==='true',
     null,{timeout:25000});
    const data=await viewer.locator('#armorCanvas').evaluate(el=>({
     pose:el.dataset.cavityPose,
     left:Number(el.dataset.cavityArmLeft),
     right:Number(el.dataset.cavityArmRight),
     thigh:Number(el.dataset.cavityThigh)
    }));
    for(const value of [data.left,data.right,data.thigh])
     if(!Number.isFinite(value)||value<0||value>1)
      throw Error('Invalid GPU cavity uniform '+JSON.stringify(data));
    const png=await viewer.locator('#armorCanvas').screenshot({
     path:'operator-studio-captures/r5-cavity-'+pose+'.png'
    });
    if(png.byteLength<3000)throw Error('Blank cavity image '+pose);
    if(errs.length)throw Error('Pose WebGL errors: '+errs.join('; '));
    cavityCases.push(data);
   }finally{await viewer.close();}
  }
  if(cavityCases[1].thigh<=cavityCases[0].thigh)
   throw Error('Crouch did not strengthen upper-thigh overlap');
  if(Math.min(cavityCases[2].left,cavityCases[2].right)>=
     Math.min(cavityCases[0].left,cavityCases[0].right))
   throw Error('Raised arm did not release local armpit cavity');
  await writeFile('operator-studio-captures/r5-cavity-poses.json',
   JSON.stringify(cavityCases,null,2));
  console.log('R5 joint-pose cavity WebGL checks passed: '+
   JSON.stringify(cavityCases));
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
