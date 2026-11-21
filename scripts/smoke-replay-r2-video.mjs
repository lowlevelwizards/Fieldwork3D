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
  browser=await chromium.launch({headless:true,channel:'chromium',args:[
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
  // V4+ permits Full Replay only after debrief or via a saved historical
  // film. Record real simulation time, save its archive, and enter it through
  // player-visible Replay Library; no hidden legacy debrief click.
  await page.waitForFunction(()=>{
    const parts=(document.querySelector('#clock')?.textContent??'00:00')
      .split(':').map(Number);
    return parts.length===2&&parts.every(Number.isFinite)&&
      parts[0]*60+parts[1]>=2;
  },null,{timeout:40000});
  await page.waitForFunction(()=>document.querySelector('#saveReplayDebrief')?.
    disabled===false,null,{timeout:20000});
  await page.evaluate(()=>document.querySelector('#saveReplayDebrief')?.click());
  await page.waitForFunction(()=>document.querySelector('#saveReplayDebrief')?.
    textContent==='REPLAY SAVED',null,{timeout:20000});
  await page.evaluate(()=>document.querySelector('#openReplayLibrary')?.click());
  await page.locator('#replayLibraryList .replay-library-watch').first()
    .waitFor({state:'visible',timeout:20000});
  await page.locator('#replayLibraryList .replay-library-watch').first().click();
  await page.locator('#replayPanel').waitFor({state:'visible',timeout:30000});
  // On slow software WebGL, Floor Plan makes the same actual recorded
  // compositor deterministic without pretending to measure iPhone FPS.
  await page.locator('#replayViewTrigger').click();
  await page.locator('#replayViewChoices [data-view-choice="plan2d"]').click();
  if((await page.locator('#replayQuickView').inputValue())!=='plan2d')
    throw Error('Could not switch saved replay to real Floor Plan');
  // First export is genuinely video-only. Sound now lives in the advanced
  // Precise Timing group, while video export lives under SAVE / SHARE.
  await page.locator('#replayMore').click();
  const precision=page.locator('details[data-replay-group="precision"]');
  if(!await precision.evaluate(el=>el.open))
    await precision.locator('summary').click();
  const replaySound=page.locator('#replaySound');
  if((await replaySound.textContent())?.includes('ON'))await replaySound.click();
  if(!(await replaySound.textContent())?.includes('OFF'))
    throw Error('Could not switch off audio for video-only capture');
  await page.locator('#replayShareToggle').click();
  if(!await page.locator('#replayExportVideo').isVisible())
    throw Error('Replay video export is missing from SAVE / SHARE');
  const support=await page.evaluate(()=>({
    recorder:typeof MediaRecorder!=='undefined',
    stream:typeof HTMLCanvasElement.prototype.captureStream==='function'
  }));
  if(!support.recorder||!support.stream)
    throw Error('Chromium smoke lacks browser MediaRecorder/captureStream');
  // Subscribe BEFORE starting. Short replay films can auto-stop and
  // download before an arbitrary sleep or a manual STOP click.
  const downloadPromise=page.waitForEvent('download',{timeout:20000});
  await page.locator('#replayExportVideo').click();
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
  // Nonempty bytes alone are insufficient: decode metadata in the browser.
  await page.evaluate(()=>{
    const input=document.createElement('input');
    input.id='replayMediaProbe';input.type='file';input.hidden=true;
    document.body.append(input);
  });
  await page.locator('#replayMediaProbe').setInputFiles(file);
  const metadata=await page.evaluate(async()=>{
    const input=document.querySelector('#replayMediaProbe');
    const file=input?.files?.[0];
    if(!file)throw Error('Missing captured video for decode test');
    const video=document.createElement('video');
    const url=URL.createObjectURL(file);
    try{
      return await new Promise((resolve,reject)=>{
        video.preload='metadata';
        video.onloadedmetadata=()=>resolve({
          width:video.videoWidth,height:video.videoHeight,
          duration:video.duration
        });
        video.onerror=()=>reject(Error('Captured video cannot be decoded'));
        video.src=url;
      });
    }finally{URL.revokeObjectURL(url);}
  });
  if(metadata.width<700||metadata.height<700)
    throw Error('Replay file did not decode as 720p: '+
      JSON.stringify(metadata));
  console.log('Replay decoded media metadata PASS',JSON.stringify(metadata));

  // Now verify that audio-enabled capture actually attaches an audio track
  // and yields a second playable file, rather than silently exporting mute.
  await page.locator('#replayMore').click();
  if(!await precision.evaluate(el=>el.open))
    await precision.locator('summary').click();
  await replaySound.click();
  if(!(await replaySound.textContent())?.includes('ON'))
    throw Error('Unable to enable real replay audio');
  await page.locator('#replayShareToggle').click();
  const withAudio=page.waitForEvent('download',{timeout:25000});
  await page.locator('#replayExportVideo').click();
  await page.waitForFunction(()=>
    document.querySelector('#replayExportVideo')?.title===
      'Recording replay video with audio',null,{timeout:10000});
  const audioDownload=await withAudio;
  const audioFile=await audioDownload.path();
  if(!audioFile||((await stat(audioFile)).size<1800))
    throw Error('Audio-enabled replay produced an empty video');
  console.log('Replay audio+video browser smoke PASS',
    audioDownload.suggestedFilename(),(await stat(audioFile)).size,'bytes');
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
