/** R4.3 Bodycam visual QA, development server ONLY. Test an actual WebGL
 * replay frame on iPhone dimensions; do not enable Bodycam in production UI.
 */
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const port=4203,url='http://127.0.0.1:'+port+
  '/?quick=1&seed=23&bodycamqa=1';
const output='artifacts/replay-r43-bodycam';
const server=spawn(process.execPath,[
  'node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port',String(port),'--strictPort'
],{stdio:'ignore',env:{...process.env,CI:'true'}});
let browser;
const check=(condition,msg)=>{if(!condition)throw Error(msg);};
const finite=(nums)=>nums.every(Number.isFinite);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
async function browserFrame(page,label){
  const shot=await page.locator('#breach3dCanvas').screenshot({
    path:output+'/'+label+'.png',timeout:30000
  });
  const stats=await page.evaluate(async(encoded)=>{
    const image=new Image();
    image.src='data:image/png;base64,'+encoded;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('No image sample context');
    ctx.drawImage(image,0,0);
    const {width,height}=canvas;
    const pixels=ctx.getImageData(0,0,width,height).data;
    const colors=new Set();let min=255,max=0,dark=0,total=0;
    // Sample across central 80%, excluding the canvas outline.
    for(let y=Math.floor(height*.1);y<height*.9;y+=7)
      for(let x=Math.floor(width*.1);x<width*.9;x+=7){
        const at=(y*width+x)*4;
        const light=Math.round(pixels[at]*.2126+
          pixels[at+1]*.7152+pixels[at+2]*.0722);
        min=Math.min(min,light);max=Math.max(max,light);
        if(light<17)dark++;total++;
        colors.add([pixels[at]>>4,pixels[at+1]>>4,
          pixels[at+2]>>4].join(':'));
      }
    return {width,height,min,max,darkFraction:dark/total,
      colorBuckets:colors.size};
  },shot.toString('base64'));
  check(stats.colorBuckets>=5&&stats.max-stats.min>=14,
    label+' appears blank/flat: '+JSON.stringify(stats));
  return stats;
}
try{
  let ready=false;
  for(let i=0;i<120;i++){
    try{if((await fetch(url)).ok){ready=true;break;}}catch{}
    await new Promise(r=>setTimeout(r,200));
  }
  check(ready,'Bodycam Vite server failed to boot');
  await mkdir(output,{recursive:true});
  browser=await chromium.launch({headless:true,args:[
    '--use-gl=angle','--use-angle=swiftshader',
    '--enable-unsafe-swiftshader'
  ]});
  const page=await browser.newPage({
    viewport:{width:390,height:844},deviceScaleFactor:1,
    hasTouch:true,isMobile:true
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#phase')?.
    textContent==='PLANNING'&&!!document.querySelector('#breach3dCanvas'),
    null,{timeout:60000});
  check(await page.evaluate(()=>typeof window.__fieldworkBodycamQa===
    'object'),'Development-only Bodycam QA hook absent');
  await page.locator('#play').click();
  let open=false;
  for(let i=0;i<9&&!open;i++){
    await page.waitForTimeout(600);
    await page.evaluate(()=>document.querySelector('#watchReplay')?.click());
    open=await page.locator('#replayPanel').isVisible();
  }
  check(open,'Could not enter a recorded mission for Bodycam');
  const activate=async(mount)=>{
    const ok=await page.evaluate(mount=>
      window.__fieldworkBodycamQa.activate(mount),mount);
    check(ok,'Bodycam QA did not start '+mount);
    await page.waitForFunction(()=>window.__fieldworkBodycamQa.
      diagnostic()?.active===true,null,{timeout:30000});
    return page.evaluate(()=>window.__fieldworkBodycamQa.diagnostic());
  };
  const chest=await activate('chest');
  check(chest.owner&&chest.masked>0&&chest.maskRestored,
    'Camera owner was not temporarily masked/restored: '+JSON.stringify(chest));
  check(chest.transparentWalls===0,
    'Tactical wall transparency leaked into Bodycam');
  check(chest.fov===95&&finite(chest.position)&&finite(chest.direction),
    'Invalid first-person camera projection');
  check(chest.direction[1]<-.10,
    'Chest camera must angle slightly downward to show floor and hands');
  const chestShot=await browserFrame(page,'chest-portrait');

  const helmet=await activate('helmet');
  // At an arbitrary recorded downed/crouched pose, the head can dip
  // below the torso. Geometry, not a guessed upright pose, is authoritative.
  console.log('Bodycam mount comparison',JSON.stringify({
    chest:chest.position,helmet:helmet.position
  }));
  check(finite(helmet.position)&&
    distance(chest.position,helmet.position)>1,
    'Helmet and chest mount produced identical/invalid historical camera');
  check(helmet.position[1]<41.5,
    'Helmet camera intersects the 42-unit interior ceiling: '+
    JSON.stringify(helmet.position));
  check(helmet.direction[1]<-.06,
    'Helmet camera must look below the roofline, not into ceiling');
  check(helmet.maskRestored&&helmet.transparentWalls===0,
    'Helmet view left owner meshes hidden or walls translucent');
  const helmetShot=await browserFrame(page,'helmet-portrait');
  check(distance(chest.position,helmet.position)>1,
    'Switching mount did not move the perspective camera');

  // Rewind must sample a NEWLY rendered frame, not a stale screenshot
  // from earlier when SwiftShader runs slower than our replay scrubber.
  const seekAndDraw=async(time)=>{
    const previous=await page.evaluate(()=>
      window.__fieldworkBodycamQa.diagnostic()?.frame??-1);
    check(await page.evaluate(t=>
      window.__fieldworkBodycamQa.seek(t),time),
      'Bodycam did not accept a replay seek');
    await page.waitForFunction(previous=>{
      const d=window.__fieldworkBodycamQa.diagnostic();
      return d?.active&&d.frame>previous;
    },previous,{timeout:30000});
    return page.evaluate(()=>window.__fieldworkBodycamQa.diagnostic());
  };
  const initial=await seekAndDraw(0);
  await seekAndDraw(.1);
  const rewound=await seekAndDraw(0);
  const delta=distance(initial.position,rewound.position);
  const headingDelta=distance(initial.direction,rewound.direction);
  check(Math.abs(initial.at-rewound.at)<1e-6&&
    delta<.005&&headingDelta<.0005,
    'Rewind mismatch between freshly rendered historical frames: '+
    JSON.stringify({initial:{at:initial.at,frame:initial.frame,
      position:initial.position,direction:initial.direction},
      rewound:{at:rewound.at,frame:rewound.frame,
      position:rewound.position,direction:rewound.direction},
      delta,headingDelta}));
  const rewindShot=await browserFrame(page,'helmet-rewind');

  await page.setViewportSize({width:844,height:390});
  await page.waitForTimeout(350);
  const landscape=await page.evaluate(()=>
    window.__fieldworkBodycamQa.diagnostic());
  check(landscape.active&&landscape.aspect>1.8&&
    landscape.aspect<2.4,
    'Landscape Bodycam projection failed viewport resize');
  const landscapeShot=await browserFrame(page,'helmet-landscape');

  await page.evaluate(()=>window.__fieldworkBodycamQa.stop());
  await page.waitForTimeout(220);
  const stopped=await page.evaluate(()=>window.__fieldworkBodycamQa.diagnostic());
  check(!stopped.active&&stopped.maskRestored,
    'Exiting Bodycam left the perspective renderer active');
  await page.locator('#replayExit').click();
  check(await page.locator('#replayPanel').isHidden(),
    'Exiting replay must restore tactical controls');
  check(errors.length===0,'Browser exceptions: '+errors.join(' | '));
  const result={chest,helmet,initial,rewound,landscape,stopped,
    images:{chestShot,helmetShot,rewindShot,landscapeShot}};
  await writeFile(output+'/metrics.json',JSON.stringify(result,null,2));
  console.log('Replay R4.3 Bodycam visual QA PASS',
    JSON.stringify({chest:chestShot,helmet:helmetShot,
      landscape:landscapeShot,ownerMask:chest.masked,
      rewindDistance:distance(initial.position,rewound.position)}));
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
