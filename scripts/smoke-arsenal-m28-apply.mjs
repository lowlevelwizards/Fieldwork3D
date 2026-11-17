/** M2.8C: real UI/browser Commit ↔ Campaign/Quick Play save authority. */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const port=4278,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<120;i++){
  try{if((await fetch(origin+'/arsenal-m28-apply-smoke.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,180));
 }
 if(!ready)throw Error('M2.8 actual Workbench route unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  await mkdir('reports',{recursive:true});
  const summary=[];
  // M2.9C: both real adapters on both form factors, not diagonal coverage.
  for(const item of [
   {mode:'campaign',width:390,height:844},
   {mode:'campaign',width:1360,height:900},
   {mode:'quick',width:390,height:844},
   {mode:'quick',width:1360,height:900}
  ]){
   const page=await browser.newPage({viewport:{width:item.width,height:item.height},
    deviceScaleFactor:1});
   const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
   await page.goto(origin+'/arsenal-m28-apply-smoke.html?mode='+item.mode,
    {waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.body.dataset.m28Ready==='true',
    null,{timeout:90000});
   const before=await page.evaluate(()=>JSON.parse(document.body.dataset.m28Before||'{}'));
   await page.getByRole('button',{name:'Accessories',exact:true}).click();
   await page.getByRole('button',{name:'Light',exact:true}).click();
   const mount=page.locator('.arsenal-wb-mounting');
   await mount.waitFor({state:'visible'});
   await mount.getByRole('button',{name:/Mount on left/i}).click();
   assert.equal(await mount.getByRole('button',{name:/Mount on left/i})
    .getAttribute('aria-pressed'),'true');
   assert.equal(await mount.locator('.arsenal-wb-mount-head small').innerText(),
    'CUSTOM · FREE');
   assert.equal(await page.getByText('UNSAVED CHANGES').count(),1);
   const noApply=await page.evaluate(()=>document.body.dataset.m28Applied);
   assert.equal(noApply,undefined,'preview must not commit equipment');
   const label=item.mode==='campaign'?'EQUIP BUILD':'APPLY TO OPERATOR';
   await page.getByRole('button',{name:label,exact:true}).click();
   await page.waitForFunction(()=>Boolean(document.body.dataset.m28Applied),
    null,{timeout:45000});
   const after=await page.evaluate(()=>JSON.parse(document.body.dataset.m28Applied||'{}'));
   assert.equal(after.face,'left',item.mode+' persisted chosen left-side mount');
   assert.equal(after.light,'light-compact','same owned accessory equipped');
   assert.equal(after.sameSave,true,'serialized state must preserve chosen face');
   if(item.mode==='campaign'){
    assert.equal(after.funds,before.funds,'pure move may never spend credits');
    assert.equal(after.lightStock,before.lightStock,'pure move cannot duplicate stock');
    assert.equal(after.serial,before.serial,'movement preserves serialized identity');
   }
   const dims=await page.evaluate(()=>({
    viewport:innerWidth,width:document.documentElement.scrollWidth
   }));
   assert.ok(dims.width<=dims.viewport+2,'unwanted horizontal scroll');
   assert.deepEqual(errors,[],'runtime/browser errors');
   await page.screenshot({path:'reports/arsenal-m28-'+item.mode+'-'+item.width+'-apply.png',
    fullPage:true,animations:'disabled'});
   summary.push({mode:item.mode,viewport:dims.viewport,
    pageWidth:dims.width,before,after,errors});
   await page.close();
  }
  await writeFile('reports/arsenal-m28-apply.json',
   JSON.stringify(summary,null,2)+'\n');
  console.log('M2.8 Campaign/Quick Play Workbench apply:',
   JSON.stringify(summary));
 }finally{await browser.close();}
}finally{server.kill('SIGTERM')}
