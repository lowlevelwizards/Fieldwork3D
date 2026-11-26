import {spawn} from 'node:child_process';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {collectWeaponArtInventory} from './audit-weapon-art-inventory.mjs';
import {collectCustomArtCases} from '../src/arsenal/wa0-custom-reference-cases.ts';
const port=4263,origin='http://127.0.0.1:'+port,out='reports/wa1-lab';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
const tmp=await mkdtemp(join(tmpdir(),'wa1-archive-'));
try{
 let live=false;for(let i=0;i<100;i++){try{if((await fetch(origin+'/weapon-art-lab.html')).ok){live=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}assert.ok(live);
 await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1360,height:900},deviceScaleFactor:1,acceptDownloads:true});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(origin+'/weapon-art-lab.html');await page.waitForFunction(()=>document.body.dataset.ready==='true'||document.body.dataset.failed,null,{timeout:45000});
 assert.equal(await page.locator('body').getAttribute('data-failed'),null);
 const inv=collectWeaponArtInventory(),custom=collectCustomArtCases();
 const ids=await page.locator('#catalog button').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
 assert.equal(ids.length,inv.references.length+custom.cases.length+7);assert.equal(new Set(ids).size,ids.length);
 for(const r of inv.references)assert.ok(ids.includes(r.id));for(const r of custom.cases)assert.ok(ids.includes(r.id));
 const storage=()=>page.evaluate(()=>JSON.stringify([Object.entries(localStorage),Object.entries(sessionStorage)]));
 const before=await storage();
 async function changed(action){const draws=Number(await page.locator('body').getAttribute('data-draws'));await action();await page.waitForFunction(n=>Number(document.body.dataset.draws)>n,draws);}
 async function filter(id){await page.locator('#search').fill(id);await page.waitForFunction(id=>[...document.querySelectorAll('#catalog button')].some(b=>b.dataset.id===id),id);}
 async function choose(id){await filter(id);await changed(()=>page.locator('#catalog button[data-id="'+id+'"]').click());}
 await page.locator('#target-b').click();await choose('beretta-m9');assert.match(await page.locator('#title-b').textContent(),/preview-only/);assert.match(await page.locator('#operator-link').getAttribute('href'),/artReference=beretta-m9/);
 for(const mode of ['silhouette','wire','roles','no-texture','material'])await changed(()=>page.locator('#display').selectOption(mode));
 for(const light of ['mirror','neutral','game','baseline'])await changed(()=>page.locator('#lighting').selectOption(light));
 for(const view of ['reverse','top','front','rear','three-quarter','side'])await changed(()=>page.locator('#views [data-view="'+view+'"]').click());
 for(const scale of ['shared','native64','native128','fit'])await changed(()=>page.locator('#scale').selectOption(scale));
 await changed(()=>page.locator('#marks').uncheck());await changed(()=>page.locator('#marks').check());
 await choose('ar-m4a1');await page.locator('#target-a').click();await choose('fal-5000');
 await page.locator('#search').fill('');await page.locator('#family').selectOption('ak');assert.ok(Number(await page.locator('body').getAttribute('data-catalog-count'))>9);await page.locator('#family').selectOption('');
 await page.locator('#status-filter').selectOption('preview-only');assert.equal(await page.locator('#catalog button').count(),2);await page.locator('#status-filter').selectOption('');
 await page.locator('#category').selectOption('Custom part');assert.equal(await page.locator('#catalog button').count(),custom.cases.length);await page.locator('#category').selectOption('');
 await page.locator('#disposition').selectOption('simplify');assert.ok(await page.locator('#catalog button').count());await page.locator('#disposition').selectOption('');await page.locator('#priority').selectOption('H');assert.ok(await page.locator('#catalog button').count());await page.locator('#priority').selectOption('');
 await page.locator('#target-b').click();await choose('ar-m4a1');await changed(()=>page.locator('#reset').click());
 await page.screenshot({path:out+'/desktop.png'});
 // Import a test archive with a revision marker and an independently frozen
 // PNG captured before switching models. This is a smoke fixture, not WA0 evidence.
 const path=join(tmp,'ar15','ar-m4a1');await mkdir(path,{recursive:true});
 const image=await page.locator('#canvas-b').evaluate(c=>c.toDataURL('image/png'));
 await writeFile(join(path,'side-fit.png'),Buffer.from(image.split(',')[1],'base64'));
 await writeFile(join(tmp,'manifest.json'),JSON.stringify({revision:'a'.repeat(40),reports:[{schema:'fieldwork-wa0-webgl-baseline',records:[{id:'ar-m4a1',platform:'ar15',panels:[{name:'side-fit',metrics:{horizontalSpan:60,width:480,height:240}}]}]}]}));
 await page.locator('#baseline-input').setInputFiles(tmp);
 await page.waitForFunction(()=>document.getElementById('baseline-status').textContent.includes('Loaded archive'));
 await changed(()=>page.locator('#compare').selectOption('baseline'));
 await page.waitForFunction(()=>{const img=document.getElementById('image-a');return !img.hidden&&img.complete&&img.naturalWidth===480;});
 assert.match(await page.locator('#message').textContent(),/Matched historical/);
 await changed(()=>page.locator('#views [data-view="rear"]').click());
 assert.match(await page.locator('#message').textContent(),/unavailable/);
 await changed(()=>page.locator('#compare').selectOption('live'));await changed(()=>page.locator('#reset').click());
 // Repeated exact model cycling: allow initial cache warming, then confirm
 // bounded renderer geometry counts for the same final selection.
 async function cycle(){for(const id of ['glock-g26','fnc-service','ar-m4a1'])await choose(id);await page.waitForTimeout(200);return Number(await page.locator('body').getAttribute('data-geometry-resources'));}
 await cycle();const first=await cycle(),last=await cycle();assert.ok(last<=first+2,`geometry growth ${first} -> ${last}`);assert.equal(await page.locator('body').getAttribute('data-active-models'),'2');
 const download=page.waitForEvent('download');await page.locator('#export').click();assert.equal((await download).suggestedFilename(),'weapon-art-lab.json');
 const png=page.waitForEvent('download');await page.locator('#save').click();assert.equal((await png).suggestedFilename(),'weapon-art-comparison.png');
 assert.equal(await storage(),before);
 await page.locator('#search').fill('ar-m4a1');await page.waitForTimeout(300);const idle=await page.locator('body').getAttribute('data-draws');await page.waitForTimeout(450);assert.equal(await page.locator('body').getAttribute('data-draws'),idle);
 assert.deepEqual(errors,[]);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:out+'/mobile.png',fullPage:true});
 const contextPage=await browser.newPage({viewport:{width:1280,height:800}});try{await contextPage.goto(origin+'/operator-lab.html?tab=poses&artReference=beretta-m9');await contextPage.waitForFunction(()=>{const d=document.getElementById('preview')?.dataset;return d?.ready==='true'&&d?.poseSidearm==='beretta-m9'&&d?.poseSidearmArtOnly==='true'&&d?.poseSidearmMesh==='true';},null,{timeout:45000});await contextPage.locator('#preview').screenshot({path:out+'/operator-context.png'});}finally{await contextPage.close();}
 console.log('WA1 verified '+ids.length+' catalog cases; all diagnostic modes, archived import, filter and export, repeated selection and idle draw gate; geometry '+first+' -> '+last);
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');await rm(tmp,{recursive:true,force:true});}
