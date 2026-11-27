/** Headless WebGL baseline; individual PNGs plus per-platform contact sheets. */
import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {collectCustomArtCases} from '../src/arsenal/wa0-custom-reference-cases.ts';
import {collectWeaponArtInventory} from './audit-weapon-art-inventory.mjs';
const port=4261,origin='http://127.0.0.1:'+port,dir=process.env.WA0_OUTPUT??'reports/wa0-visual';
const inventory=collectWeaponArtInventory();
const custom=collectCustomArtCases();
const allPlatforms=[...new Set(inventory.references.map(r=>r.platform)),'accessory-samples',...new Set(custom.cases.map(r=>r.platform))];
const platforms=process.env.WA0_PLATFORMS?process.env.WA0_PLATFORMS.split(','):allPlatforms;
if(!platforms.length||platforms.some(p=>!allPlatforms.includes(p)))throw Error('Invalid capture platform filter');
const solidAK=new Set(['ak-akm','ak-ak74','ak-ak74m','ak-ak103','ak-ak105','ak-rpk74']);
const samples=['ar-m4a1','ak-ak74m','hk-g3a3','hk-mp5a3','g36-ka4','fal-5000','fnc-service'].map(id=>id+'-equipped');
const revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){try{if((await fetch(origin+'/weapon-art-baseline.html')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 if(!ready)throw Error('WA0 Vite route unavailable');
 await mkdir(dir,{recursive:true});
 const browser=await chromium.launch({headless:true});
 const reports=[];
 try{
  for(const platform of platforms){
   const page=await browser.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   try{
    await page.goto(origin+'/weapon-art-baseline.html?platform='+encodeURIComponent(platform));
    await page.waitForFunction(()=>document.body.dataset.wa0Complete||document.body.dataset.wa0Failed,null,{timeout:120000});
    const failed=await page.locator('body').getAttribute('data-wa0-failed');
    if(failed||errors.length)throw Error(platform+': '+[failed,...errors].join(' | '));
    const report=JSON.parse(await page.locator('#wa0-report').textContent());
    const expected=platform==='accessory-samples'?samples:platform.startsWith('custom-')?custom.cases.filter(r=>r.platform===platform).map(r=>r.id):inventory.references.filter(r=>r.platform===platform).map(r=>r.id);
    const actual=report.records.map(r=>r.id);
    if(actual.length!==expected.length||new Set(actual).size!==expected.length||expected.some(id=>!actual.includes(id)))throw Error('Coverage mismatch '+platform);
    for(const record of report.records){
     if(record.panels.length!==(platform.startsWith('custom-')?3:platform==='accessory-samples'?8:solidAK.has(record.id)?12:9)||record.panels.some(p=>p.metrics.foreground<5||p.metrics.edge!==0||p.metrics.calls<1))throw Error('Bad panel '+record.id);
     const path=dir+'/'+platform+'/'+record.id;await mkdir(path,{recursive:true});
     const images=await page.locator('[data-id="'+record.id+'"] figure').evaluateAll(nodes=>nodes.map(n=>({name:n.dataset.view,src:n.querySelector('img').src})));
     for(const image of images)await writeFile(path+'/'+image.name+'.png',Buffer.from(image.src.split(',')[1],'base64'));
    }
    await page.screenshot({path:dir+'/'+platform+'-contact-sheet.png',fullPage:true,animations:'disabled',timeout:120000});
    reports.push(report);console.log('WA0.3 '+platform+': '+actual.length+' references, '+report.records.reduce((n,r)=>n+r.panels.length,0)+' panels');
   }finally{await page.close();}
  }
 }finally{await browser.close();}
 const records=reports.flatMap(r=>r.records);
 await writeFile(dir+'/manifest.json',JSON.stringify({revision,capturedAt:new Date().toISOString(),customCoverage:{resolved:custom.cases.map(c=>c.partId),unresolved:custom.unresolved},reports,limitations:['Native 64/128 panels are fitted readability proxies, not gameplay camera evidence.','Primary and native sidearm scales are separate cohorts.','Accessory samples are not exhaustive; custom cases show one accepted host each, and unresolved IDs are recorded.','Renderer.info is one isolated pass, not live gameplay performance.']},null,2)+'\n');
 console.log('WA0.3 verified '+records.length+' reference/sample rows and '+records.reduce((n,r)=>n+r.panels.length,0)+' PNGs');
}finally{server.kill('SIGTERM');}
