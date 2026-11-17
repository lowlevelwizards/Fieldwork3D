/** Desktop/mobile real-browser interactions, focus, free side/rail choices.
 * npm install --no-save --package-lock=false playwright@1.56.1
 * npx playwright install chromium
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const port=4277,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let up=false;
 for(let i=0;i<110;i++){
  try{if((await fetch(origin+'/arsenal-m27-smoke.html')).ok){up=true;break}}
  catch{}
  await new Promise(done=>setTimeout(done,170));
 }
 if(!up)throw Error('M2.7 Workbench page not served');
 const browser=await chromium.launch({headless:true});
 try{
  await mkdir('reports',{recursive:true});
  const summary=[];
  for(const [mode,width,height] of [['desktop',1360,900],['mobile',390,844]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.goto(origin+'/arsenal-m27-smoke.html',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.body.dataset.m27Ready==='true',{timeout:60000});
   await page.getByRole('button',{name:'Accessories',exact:true}).click();
   await page.getByRole('button',{name:'Light',exact:true}).click();
   const mounting=page.locator('.arsenal-wb-mounting');
   await mounting.waitFor({state:'visible'});
   const left=mounting.getByRole('button',{name:/Mount on left/i});
   const right=mounting.getByRole('button',{name:/Mount on right/i});
   assert.ok(await left.count()===1&&await right.count()===1,'real both-side rails');
   await left.click();
   assert.equal(await mounting.locator('.arsenal-wb-mount-head small').innerText(),
    'CUSTOM · FREE');
   assert.equal(await left.getAttribute('aria-pressed'),'true');
   const slider=mounting.locator('input[type=range]');
   const max=Number(await slider.getAttribute('max'));
   if(max>=1){
    await mounting.getByRole('button',{name:/FRONT/}).click();
    assert.equal(await slider.inputValue(),'1');
   }
   await page.getByRole('button',{name:'UNDO',exact:true}).click();
   await page.getByRole('button',{name:'REDO',exact:true}).click();
   assert.equal(await left.getAttribute('aria-pressed'),'true');
   await mounting.getByRole('button',{name:'AUTO POSITION'}).click();
   assert.equal(await mounting.locator('.arsenal-wb-mount-head small').innerText(),
    'AUTOMATIC · FREE');
   await mounting.getByRole('button',{name:'VIEW MOUNT'}).click();
   const dims=await page.evaluate(()=>({
    viewport:innerWidth,body:document.documentElement.scrollWidth,
    rail:Math.round(document.querySelector('.arsenal-wb-mount-rail').getBoundingClientRect().height),
    position:Math.round(document.querySelector('.arsenal-wb-mount-slider').getBoundingClientRect().height)
   }));
   assert.ok(dims.body<=dims.viewport+2,'unwanted horizontal scrolling');
   assert.ok(dims.rail>=44&&dims.position>=44,'touch target below 44 pixels');
   assert.deepEqual(errors,[],'browser console errors');
   await page.screenshot({path:'reports/arsenal-m27-'+mode+'.png',fullPage:true,
    animations:'disabled'});
   summary.push({mode,...dims,contacts:max+1,errors});
   await page.close();
  }
  await writeFile('reports/arsenal-m27-acceptance.json',JSON.stringify(summary,null,2)+'\n');
  console.log('M2.7 real Workbench desktop/mobile acceptance:',JSON.stringify(summary));
 }finally{await browser.close()}
}finally{server.kill('SIGTERM')}
