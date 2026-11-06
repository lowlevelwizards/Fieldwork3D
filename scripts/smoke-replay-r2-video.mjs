/** One critical real-browser gate for replay audio/video. */
import {spawn} from 'node:child_process';
import {stat} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=4197,url='http://127.0.0.1:'+port+'/?quick=1&seed=23';
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
try{
  let ready=false;
  for(let n=0;n<120;n++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,180));
  }
  if(!ready)throw Error('Vite replay smoke server did not start');
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]});
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
    hasTouch:true,isMobile:true,acceptDownloads:true
  });
  const pageErrors=[],browserLogs=[];
  page.on('pageerror',e=>pageErrors.push(e.message));
  page.on('console',message=>{
    if(message.type()==='error'||message.type()==='warning'||
      message.text().includes('Replay Video'))
      browserLogs.push(message.type()+': '+message.text().slice(0,350));
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
    document.querySelector('#phase')?.textContent==='PLANNING'&&
    !!document.querySelector('#breach3dCanvas'),null,{timeout:60000});
  await page.locator('#play').click();
  // Give the recorder an actual multi-second operation before entering film.
  await page.waitForTimeout(2600);
  await page.evaluate(()=>{
    const trigger=document.querySelector('#watchReplay');
    if(!(trigger instanceof HTMLButtonElement))throw Error('Missing replay entry');
    trigger.click();
  });
  await page.waitForFunction(()=>
    document.querySelector('#replayPanel')?.hidden===false,null,
    {timeout:12000});
  const support=await page.evaluate(()=>({
    recorder:typeof MediaRecorder!=='undefined',
    stream:typeof HTMLCanvasElement.prototype.captureStream==='function'
  }));
  if(!support.recorder||!support.stream)
    throw Error('Chromium smoke lacks browser MediaRecorder/captureStream');
  // Subscribe BEFORE starting. Short replay films can auto-stop and
  // download before an arbitrary sleep or a manual STOP click.
  const downloadPromise=page.waitForEvent('download',{timeout:20000});
  await page.evaluate(()=>{
    const trigger=document.querySelector('#replayExportVideo');
    if(!(trigger instanceof HTMLButtonElement))throw Error('Missing video button');
    trigger.click();
  });
  await page.waitForFunction(()=>
    document.querySelector('#replayExportVideo')?.textContent==='STOP VIDEO',
    null,{timeout:12000});
  // The deterministic smoke mission is intentionally short. Let the
  // compositor hold its terminal frame until the encoder flushes naturally.
  let download;
  try{download=await downloadPromise;}
  catch(error){
    const status=await page.evaluate(()=>({
      button:document.querySelector('#replayExportVideo')?.textContent,
      replayPanel:document.querySelector('#replayPanel')?.hidden,
      clock:document.querySelector('#replayClock')?.textContent,
      bodyTail:document.body.innerText.slice(-900),
      webgl:(document.querySelector('#breach3dCanvas') instanceof HTMLCanvasElement),
      mimeMP4:MediaRecorder.isTypeSupported('video/mp4'),
      mimeWebM:MediaRecorder.isTypeSupported('video/webm')
    }));
    console.error('REPLAY VIDEO DIAGNOSTIC',
      JSON.stringify({status,pageErrors,browserLogs},null,2));
    throw error;
  }
  const filename=download.suggestedFilename();
  if(!/\.(webm|mp4)$/.test(filename))
    throw Error('Unexpected replay video extension: '+filename);
  const file=await download.path();
  if(!file)throw Error('Replay video was not saved');
  const size=(await stat(file)).size;
  if(size<1800)throw Error('Recorded replay video is empty: '+size);
  if(pageErrors.length)throw Error('Replay browser error: '+pageErrors.join(' | '));
  console.log('Replay real-browser video smoke PASS:',filename,size,'bytes');
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
