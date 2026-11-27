import {spawn,execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4267,origin='http://127.0.0.1:'+port,dir='reports/wc25';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(origin+'/wc25-stock-review.html')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,150));}
 if(!ready)throw Error('Capture route unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/wc25-stock-review.html');
  await page.waitForFunction(()=>document.body.dataset.wa0Complete||document.body.dataset.wa0Failed,null,{timeout:120000});
  const failed=await page.locator('body').getAttribute('data-wa0-failed');
  if(failed||errors.length)throw Error([failed,...errors].join(' | '));
  const report=JSON.parse(await page.locator('#wa0-report').textContent());
  if(report.records.length!==10)throw Error('Expected nine factories and MOE custom sample');
  await mkdir(dir,{recursive:true});
  for(const record of report.records){
   const path=dir+'/'+record.id;await mkdir(path,{recursive:true});
   const images=await page.locator('[data-id="'+record.id+'"] figure').evaluateAll(nodes=>nodes.map(n=>({name:n.dataset.view,src:n.querySelector('img').src})));
   for(const image of images)await writeFile(path+'/'+image.name+'.png',Buffer.from(image.src.split(',')[1],'base64'));
  }
  await writeFile(dir+'/manifest.json',JSON.stringify({revision:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),report},null,2));
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
