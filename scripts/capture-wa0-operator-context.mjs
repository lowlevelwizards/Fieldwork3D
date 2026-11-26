/** WA0.3 actual Operator Lab context, no replacement models or game edits. */
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {collectWeaponArtInventory} from './audit-weapon-art-inventory.mjs';
const dir=process.env.WA0_OPERATOR_OUTPUT??'reports/wa0-visual/operator-context',port=4262,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let live=false;for(let i=0;i<100;i++){try{if((await fetch(origin+'/operator-lab.html')).ok){live=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 if(!live)throw Error('Operator Lab unavailable');
 await mkdir(dir,{recursive:true});
 const browser=await chromium.launch({headless:true});
 const records=[];
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/operator-lab.html?tab=poses',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('preview')?.dataset.ready==='true',null,{timeout:45000});
  await page.locator('#poseArmor').selectOption('plate-slick');
  await page.locator('#poseRig').selectOption('full-chest');
  await page.locator('#poseUniform').selectOption('combat-shirt');
  const all=collectWeaponArtInventory().references,ids=process.env.WA0_OPERATOR_IDS?.split(',');
  if(ids?.some(id=>!all.some(r=>r.id===id)))throw Error('Unknown operator reference');
  for(const ref of all.filter(r=>!ids||ids.includes(r.id))){
   const sidearm=ref.status==='issued-sidearm-appearance'||ref.status==='preview-only';
   const id=ref.id;
   const track=sidearm?'pistol-low-ready':'low-ready';
   await page.locator('#poseWeapon').selectOption(id);
   await page.locator('#poseAnimation').selectOption(track);
   await page.locator('#timeline').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(({id,track,sidearm})=>{
    const d=document.getElementById('preview')?.dataset;
    return d?.poseFitWeapon===id&&d?.track===track&&d?.time==='0.000'&&
     Number(d?.drawCalls)>0&&(!sidearm||(d?.poseSidearm===id&&d?.poseSidearmMesh==='true'));
   },{id,track,sidearm},{timeout:20000});
   for(const view of ['side','game']){
    await page.evaluate(v=>{const b=document.querySelector('button[data-view="'+v+'"]');if(!(b instanceof HTMLButtonElement))throw Error('Missing camera '+v);b.click();},view);
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    await page.locator('#preview').screenshot({path:dir+'/'+ref.id+'-'+view+'.png',animations:'disabled'});
   }
   const d=await page.locator('#preview').evaluate(c=>({...c.dataset}));
   records.push({id:ref.id,status:ref.status,track,views:['side','game'],drawCalls:Number(d.drawCalls),triangles:Number(d.triangles),armor:d.poseFitArmor,rig:d.poseFitRig,uniform:d.poseFitTop,sidearmScale:d.poseSidearmScale,artOnly:d.poseSidearmArtOnly});
   console.log('WA0 operator context',ref.id,track,d.drawCalls);
  }
  if(errors.length)throw Error(errors.join('; '));
 }finally{await browser.close();}
 await writeFile(dir+'/manifest.json',JSON.stringify({revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),presentation:'Actual Operator Lab side/game camera presets; not a live mission framebuffer. Sidearms retain Lab presentation scale; preview-only IDs remain preview-only.',records},null,2)+'\n');
 console.log('WA0 operator context: '+records.length+' references');
}finally{server.kill('SIGTERM');}
