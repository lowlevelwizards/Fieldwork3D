/** Focused Lab boot smoke test, including WebKit (Safari engine).
 * Verifies an actual rendered 3D frame, not merely a loaded HTML shell.
 */
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const port=4194,origin=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
  let ready=false;
  for(let i=0;i<100;i++){
    try{if((await fetch(origin+'/operator-lab.html')).ok){ready=true;break;}}
    catch{}
    await new Promise(resolve=>setTimeout(resolve,140));
  }
  if(!ready)throw Error('Lab preview server unavailable');
  for(const [name,engine] of [['Chromium',chromium],['WebKit',webkit]]){
    const browser=await engine.launch({headless:true});
    try{
      const page=await browser.newPage({viewport:{width:390,height:844},
        deviceScaleFactor:2,isMobile:true,hasTouch:true});
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(origin+'/operator-lab.html',
        {waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>{
        const status=document.getElementById('labStatus');
        const canvas=document.getElementById('preview');
        return canvas?.dataset.ready==='true'||
          canvas?.dataset.ready==='error'||
          status?.textContent?.includes('COULD NOT START');
      },null,{timeout:20000});
      const state=await page.locator('#preview').evaluate(canvas=>({
        ready:canvas.dataset.ready,
        calls:Number(canvas.dataset.drawCalls??0),
        time:canvas.dataset.time,track:canvas.dataset.track
      }));
      if(state.ready!=='true'||state.calls<1)
        throw Error(name+' Lab never drew a 3D frame: '+
          JSON.stringify(state)+' / '+
          await page.locator('#labStatus').textContent());
      if(!await page.locator('#labStatus').isHidden())
        throw Error(name+' Lab success overlay remained visible');
      await page.locator('[data-pose="strafe-stop"]').click();
      await page.locator('#timeline').evaluate(el=>{
        el.value='900';el.dispatchEvent(new Event('input',{bubbles:true}));
      });
      await page.waitForFunction(()=>
        document.getElementById('preview')?.dataset.time==='0.900',
        null,{timeout:12000});
      const after=await page.locator('#preview').evaluate(el=>({
        track:el.dataset.track,ready:el.dataset.ready,
        calls:Number(el.dataset.drawCalls??0),
        crossed:el.dataset.crossed
      }));
      if(after.track!=='strafe-stop'||after.ready!=='true'||
        after.calls<1||after.crossed!=='false')
        throw Error(name+' operator vanished after track seek: '+
          JSON.stringify(after));
      if(errors.length)throw Error(name+' uncaught errors: '+errors.join('; '));
      console.log(name+' Lab boot, GPU render and seek passed',state,after);
      await page.close();
    }finally{await browser.close();}
  }
}finally{server.kill('SIGTERM');}
