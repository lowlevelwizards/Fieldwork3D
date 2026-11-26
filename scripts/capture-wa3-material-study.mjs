import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4264,origin='http://127.0.0.1:'+port,out='reports/wa3';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let live=false;for(let i=0;i<100;i++){try{if((await fetch(origin+'/weapon-art-material-study.html')).ok){live=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 if(!live)throw Error('WA3 study route unavailable');
 await mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1800,height:900},deviceScaleFactor:1});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(origin+'/weapon-art-material-study.html');await page.waitForFunction(()=>document.body.dataset.complete||document.body.dataset.failed,null,{timeout:120000});
  const fail=await page.locator('body').getAttribute('data-failed');if(fail||errors.length)throw Error([fail,...errors].join(' | '));
  const report=JSON.parse(await page.locator('#study-report').textContent());const refs=report.records.filter(r=>r.kind==='reference'),swatches=report.records.filter(r=>r.kind==='swatch');
  if(refs.length!==10||!swatches.length||refs.some(r=>r.panels.length!==12||r.panels.some(p=>p.visible<5||p.calls<1)))throw Error('Incomplete study');
  for(const r of refs)for(let i=0;i<12;i+=2){const a=r.panels[i],b=r.panels[i+1];if(a.triangles!==b.triangles||a.calls!==b.calls||a.span!==b.span)throw Error('Study changed rendering cost or framing '+r.id);}
  const sections=page.locator('#sheet section');for(let i=0;i<await sections.count();i++){const name=i===0?'swatches':refs[i-1].id;await sections.nth(i).screenshot({path:out+'/'+name+'.png',animations:'disabled'});}
  await writeFile(out+'/material-study.json',JSON.stringify({revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),...report},null,2)+'\n');
  console.log('WA3 material study: '+swatches.length+' registered swatches, '+refs.length+' reference models, '+refs.reduce((n,r)=>n+r.panels.length,0)+' verified panels; identical geometry and submissions per pair');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
