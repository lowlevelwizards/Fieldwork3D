/** B10: real browser video encoder + decode + burned disclosure pixels.
 * This is compositor QA; the separate R4.3b test validates gameplay WebGL.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=4211,url='http://127.0.0.1:'+port+'/?quick=1';
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
const assert=(yes,why)=>{if(!yes)throw Error(why);};
try{
  let ready=false;
  for(let i=0;i<120;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  assert(ready,'Vite did not start for Bodycam video QA');
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]});
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1
  });
  await page.goto(url,{waitUntil:'domcontentloaded'});
  const result=await page.evaluate(async()=>{
    const {ReplayQuickVideo}=await import('/src/breach-replay-video.ts');
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const scene=document.createElement('canvas');
    scene.width=390;scene.height=844;
    const ctx=scene.getContext('2d');
    ctx.fillStyle='#080c0b';ctx.fillRect(0,0,390,844);
    const overlay=document.createElement('canvas');
    overlay.width=390;overlay.height=844;
    async function record(context){
      const finished=new Promise((resolve,reject)=>{
        const video=new ReplayQuickVideo((blob,mime)=>resolve({blob,mime}),
          reason=>reject(Error(reason)));
        if(!video.start(0,{width:390,height:844}))
          reject(Error('Browser cannot start a real video encoder'));
        (async()=>{
          const start=performance.now();
          while(performance.now()-start<2300){
            video.drawFrame(scene,overlay,0,context);
            await sleep(80);
          }
          video.stop();
        })().catch(reject);
      });
      const {blob,mime}=await finished;
      if(blob.size<1800)throw Error('Video encoder created an empty file');
      const blobUrl=URL.createObjectURL(blob);
      const player=document.createElement('video');
      player.muted=true;player.playsInline=true;player.preload='auto';
      player.src=blobUrl;
      try{
        await new Promise((resolve,reject)=>{
          player.onloadeddata=resolve;
          player.onerror=()=>reject(Error('Browser cannot decode its output'));
        });
        if(player.videoWidth!==720||player.videoHeight!==1280)
          throw Error('Incorrect 720p portrait export dimensions');
        // onloadeddata already decoded an actual frame. Calling play()
        // here races a very short MediaRecorder clip ending on CI.
        if(player.readyState<2)throw Error('No decoded video frame');
        const decoded=document.createElement('canvas');
        decoded.width=720;decoded.height=1280;
        const pixels=decoded.getContext('2d',{willReadFrequently:true});
        pixels.drawImage(player,0,0,720,1280);
        const crop=pixels.getImageData(18,80,490,54).data;
        let disclosurePixels=0;
        for(let i=0;i<crop.length;i+=4)
          if(crop[i]>145&&crop[i+1]>110&&crop[i+2]>65)
            disclosurePixels++;
        if(context){
          decoded.id='replayVideoFrameProbe';
          document.body.append(decoded);
        }
        return {size:blob.size,mime,disclosurePixels,
          width:player.videoWidth,height:player.videoHeight};
      }finally{
        player.removeAttribute('src');player.load();
        URL.revokeObjectURL(blobUrl);
      }
    }
    const tactical=await record(null);
    const bodycam=await record({observerId:'rook',mount:'chest'});
    return {tactical,bodycam};
  });
  assert(result.bodycam.disclosurePixels>
    result.tactical.disclosurePixels+80,
    'Decoded Bodycam export is missing its burned reconstruction label: '+
      JSON.stringify(result));
  assert(result.bodycam.size>1800,
    'Decoded Bodycam file has no actual video frames');
  await mkdir('artifacts/replay-r43b-bodycam',{recursive:true});
  await page.locator('#replayVideoFrameProbe').screenshot({
    path:'artifacts/replay-r43b-bodycam/decoded-video-disclosure.png'
  });
  console.log('Bodycam encoded/decode disclosure smoke PASS',
    JSON.stringify(result));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
