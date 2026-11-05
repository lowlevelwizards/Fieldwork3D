/** R9 small, repeatable real WebGL comparison: same model, light, phone
 * viewport, distance and full master artwork across pattern families.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4199,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let n=0;n<90;n++){
  try{if((await fetch(origin+'/operator-armor-rig-lab.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,160));
 }
 if(!ready)throw Error('Camo audit Lab did not launch');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await mkdir('operator-r9-camo-comparison',{recursive:true});
  const patterns=[
   ['m81-woodland','top','bdu-shirt','armor-bare','no-rig'],
   ['woodland-dpm','top','bdu-shirt','armor-bare','no-rig'],
   ['scorpion-w2','top','acu-shirt','armor-bare','no-rig'],
   ['british-mtp','top','acu-shirt','armor-bare','no-rig'],
   ['multicam','top','acu-shirt','armor-bare','no-rig'],
   ['ucp','top','acu-shirt','armor-bare','no-rig'],
   ['russian-emr','top','acu-shirt','armor-bare','no-rig'],
   ['flecktarn','top','smock-jacket','armor-bare','no-rig'],
   ['m81-woodland','armor','bdu-shirt','plate-legacy','no-rig'],
   ['multicam','armor','bdu-shirt','plate-jpc','no-rig'],
   ['m81-woodland','gear','bdu-shirt','armor-bare','lbv'],
   ['multicam','gear','bdu-shirt','armor-bare','split-front'],
   // Camouflage 6B: direct WebGL prints on worn cloth, with matching zooms.
   ['atacs-fg','top','acu-shirt','armor-bare','no-rig'],
   ['ukrainian-mm14','top','acu-shirt','armor-bare','no-rig'],
   ['aor2','top','acu-shirt','armor-bare','no-rig'],
   ['multicam-tropic','top','acu-shirt','armor-bare','no-rig'],
   ['atacs-au','top','acu-shirt','armor-bare','no-rig'],
   ['ss-leto','top','bdu-shirt','armor-bare','no-rig'],
   ['aor1','top','acu-shirt','armor-bare','no-rig'],
   ['multicam-arid','top','acu-shirt','armor-bare','no-rig']
  ];
  for(const [print,channel,top,armor,rig] of patterns){
   const query=new URLSearchParams({camo:print,camoChannel:channel,
    top,armor,rig,zoom:'detail',view:'front'});
   await page.goto(origin+'/operator-armor-rig-lab.html?'+query,{
    waitUntil:'domcontentloaded'});
   await page.waitForFunction(p=>{
    const c=document.getElementById('armorCanvas');
    return c?.dataset.ready==='true'&&c.dataset.camo===p;
   },print,{timeout:25000});
   for(const zoom of ['detail','gameplay']){
    await page.locator('#zoomChoice').selectOption(zoom);
    await page.locator('#armorCanvas').screenshot({
     path:'operator-r9-camo-comparison/'+print+'-'+channel+'-'+zoom+'.png'
    });
   }
  }
  if(errors.length)throw Error('Camo comparison Lab: '+errors.join('; '));
  console.log('R9/6B phone comparisons: '+(patterns.length*2)+' consistent close/gameplay WebGL renders.');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
