/** R4 mobile WebGL evidence: key layered receivers, *same* framing for
 * front/side/gameplay, including UCP and modern carrier/rig combinations.
 * Runs only in PR CI, never renders or bakes during game ticks.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4302,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<95;i++){
  try{if((await fetch(origin+'/operator-armor-rig-lab.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,140));
 }
 if(!ready)throw Error('R4 mobile gear comparison failed to launch');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:1.5,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await mkdir('operator-r4-contact-shadows',{recursive:true});
  const cases=[
   ['ucp','acu-shirt','plate-standard','full-chest','ucp','armor'],
   ['ocp','acu-shirt','plate-heavy','chest-placard','scorpion-w2','armor'],
   ['field','bdu-shirt','soft-flak','field-webbing',null,null]
  ];
  for(const [name,top,armor,rig,camo,channel] of cases){
   for(const view of ['front','side']){
    const q=new URLSearchParams({top,armor,rig,view,zoom:'detail'});
    if(camo){q.set('camo',camo);q.set('camoChannel',channel);}
    await page.goto(origin+'/operator-armor-rig-lab.html?'+q,{
     waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>
     document.getElementById('armorCanvas')?.dataset.ready==='true',
     null,{timeout:25000});
    for(const zoom of ['detail','gameplay']){
     await page.locator('#zoomChoice').selectOption(zoom);
     const result=await page.locator('#armorCanvas').screenshot({
      path:'operator-r4-contact-shadows/'+name+'-'+view+'-'+zoom+'.png'
     });
     if(result.byteLength<3000)throw Error(name+'/'+view+'/'+zoom+
      ': blank or undersized screenshot');
    }
   }
  }
  if(errors.length)throw Error('Mobile contact review errors: '+errors.join('; '));
  console.log('R4: 12 real WebGL contact-shadow captures, front/side and detail/gameplay');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
