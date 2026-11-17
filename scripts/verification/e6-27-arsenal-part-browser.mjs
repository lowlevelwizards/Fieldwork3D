/** E6.27 real Arsenal gallery / Workbench on-off visual and cache evidence.
 * Software WebGL browser only; no GPU frame-rate claims. */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {chromium} from 'playwright';
import {PNG} from 'pngjs';
const port=4427,base='http://127.0.0.1:'+port;
const dir='artifacts/refactor-e6-27/arsenal-ab';
mkdirSync(dir,{recursive:true});
function imageParity(one,two){
 const a=PNG.sync.read(readFileSync(one)),b=PNG.sync.read(readFileSync(two));
 if(a.width!==b.width||a.height!==b.height)throw Error('Different screenshot sizes');
 let changed=0;
 for(let p=0;p<a.width*a.height;p++){
  const k=p*4;
  if(Math.max(...[0,1,2].map(c=>Math.abs(a.data[k+c]-b.data[k+c])))>16)
   changed++;
 }
 return {pixels:a.width*a.height,changed,
  agreementPct:+(100*(1-changed/(a.width*a.height))).toFixed(3)};
}
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],
 {stdio:'ignore',env:{...process.env,CI:'true'}});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser;
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(base+'/arsenal.html')).ok){ready=true;break;}}
  catch{}await wait(150);
 }
 if(!ready)throw Error('Arsenal Vite unavailable');
 const chrome=['/usr/bin/google-chrome','/usr/bin/google-chrome-stable',
  '/opt/google/chrome/chrome'].find(existsSync);
 const measurements=[];
 for(const mode of ['0','1']){
  browser=await chromium.launch({headless:true,
   ...(process.env.FIELDWORK_CI_CHROME&&chrome?{executablePath:chrome}:{}),
   args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({
   viewport:{width:430,height:930},deviceScaleFactor:1,
   isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(base+'/arsenal.html?e626Weapon=1&e627PartBake='+mode,
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>
    (document.querySelector('.arsenal-hero-media img')?.naturalWidth??0)>=400,
    null,{timeout:90000});
   await page.locator('.arsenal-hero').screenshot({
    path:dir+'/mode-'+mode+'-m4-hero.png'});
   // Real M4A1 is the known rigid multi-sibling art pilot; the FNC may
   // already be one submission per part, so a zero saving there is valid.
   await page.locator('.arsenal-hero-open').click();
   await page.locator('.arsenal-wb-category').first().waitFor(
    {state:'visible',timeout:30000});
   await page.waitForTimeout(650);
   await page.locator('.arsenal-wb-viewport').screenshot({
    path:dir+'/mode-'+mode+'-m4-workbench.png'});
   const m4=await page.evaluate(()=>{
    const canvas=document.querySelector('.arsenal-wb-canvas');
    return {avoidedDraws:Number(canvas?.dataset.e627Avoided??0),
     compiledMeshes:Number(canvas?.dataset.e627Compiled??0),
     sockets:document.querySelectorAll('.arsenal-wb-socket').length};
   });
   if(m4.sockets<3||(mode==='1'&&
      (m4.avoidedDraws<1||m4.compiledMeshes<1)))
    throw Error('E6.27 actual M4A1 did not compile safely '+JSON.stringify(m4));
   await page.locator('.arsenal-wb-back').click();
   await page.locator('.arsenal-search').fill('FNC');
   await page.getByRole('button',{name:'Select FN FNC'}).click();
   await page.waitForFunction(()=>document.querySelector('.arsenal-hero-copy h2')
    ?.textContent==='FN FNC'&&
    (document.querySelector('.arsenal-hero-media img')?.naturalWidth??0)>=400,
    null,{timeout:90000});
   await page.locator('.arsenal-hero').screenshot({
    path:dir+'/mode-'+mode+'-fnc-hero.png'});
   const gallery=await page.evaluate(()=>({
    hits:Number(document.body.dataset.e626GalleryHits??0),
    geometries:Number(document.body.dataset.e626GalleryGeometries??0)
   }));
   await page.locator('.arsenal-hero-open').click();
   await page.locator('.arsenal-wb-category').first().waitFor(
    {state:'visible',timeout:30000});
   await page.waitForTimeout(650);
   await page.locator('.arsenal-wb-viewport').screenshot({
    path:dir+'/mode-'+mode+'-fnc-workbench.png'});
   const viewport=await page.evaluate(()=>{
    const canvas=document.querySelector('.arsenal-wb-canvas');
    const host=document.querySelector('.arsenal-wb-viewport');
    return {hits:Number(canvas?.dataset.e626Hits??0),
     geometries:Number(canvas?.dataset.e626Geometries??0),
     avoidedDraws:Number(canvas?.dataset.e627Avoided??0),
     compiledMeshes:Number(canvas?.dataset.e627Compiled??0),
     unavailable:host?.dataset.webglUnavailable==='true',
     sockets:document.querySelectorAll('.arsenal-wb-socket').length};
   });
   if(viewport.unavailable||viewport.sockets<3)
    throw Error('Workbench missing actual WebGL or named part sockets');
   if(mode==='1'&&(gallery.geometries<1||viewport.geometries<1))
    throw Error('E6.27 no real Arsenal geometry acquired: '+
     JSON.stringify({gallery,viewport}));
   if(errors.length)throw Error('Arsenal runtime errors: '+errors.join(' | '));
   measurements.push({mode,gallery,m4,viewport,errors});
  }finally{await page.close();await browser.close();browser=undefined;}
 }
 const pairs=['m4-hero','m4-workbench','fnc-hero','fnc-workbench'].map(name=>({
  name,...imageParity(dir+'/mode-0-'+name+'.png',
   dir+'/mode-1-'+name+'.png')
 }));
 if(pairs.some(p=>p.agreementPct<98))
  throw Error('Arsenal E6.27 visual parity failed '+JSON.stringify(pairs));
 const evidence={schema:'fieldwork-e6.27-part-batching-visual-1',
  note:'Opt-in same-per-component rigid sibling compilation in real Arsenal (earlier E6.26 exact geometry pool ON for both); visual and actionable socket parity, no GPU FPS claims.',
  measurements,pairs};
 writeFileSync(dir+'/summary.json',JSON.stringify(evidence,null,2)+'\n');
 console.log('E6_27_ARSENAL_BROWSER',JSON.stringify(evidence));
}finally{await browser?.close();server.kill('SIGTERM');}
