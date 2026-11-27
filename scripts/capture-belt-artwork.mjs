/** Real Operator Lab WebGL phone captures. The mount status is a structural
 * smoke test, not proof of human visual approval or animated collision.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4203,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-lab.html')).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,150));
 }
 if(!ready)throw Error('Operator Lab server unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/operator-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('preview')?.dataset.ready==='true',null,{timeout:25000});
  await mkdir('belt-artwork-captures',{recursive:true});
  await page.locator('[data-lab-tab="view"]').click();
  const select=(id,value)=>page.locator('#'+id).evaluate((el,v)=>{
   el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));
  },value);
  const capture=async(id,count,views)=>{
   await select('attachmentPreview',id);
   await page.waitForFunction(n=>document.getElementById('attachmentPreviewStatus')?.textContent===n+'/'+n+' mounted · 0 fit rejections',count,{timeout:15000});
   for(const view of views){
    await page.locator('button[data-view="'+view+'"]:visible').first().click();
    await page.waitForTimeout(180);
    await page.locator('#preview').screenshot({path:'belt-artwork-captures/'+id+'-'+view+'.png'});
   }
  };
  for(const id of ['plainclothes','patrol','tactical','field'])
   await capture(id,id==='plainclothes'?1:3,['iso','side','back','game']);
  for(const id of ['primary-mag-pouch','rigid-holster','dump-pouch','radio-holder','shell-holder'])
   await capture(id,1,['iso','side']);
  if(errors.length)throw Error(errors.join('; '));
  console.log('Belt artwork: all nine representative previews mounted; phone screenshots captured.');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
