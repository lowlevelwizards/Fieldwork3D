/** Mobile appearance review: no playback obstruction, readable selected
 * item labels, working transport in Playback/Camera, actual WebGL frame. */
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4199,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let up=false;
 for(let i=0;i<90;i++){
  try{if((await fetch(origin+'/operator-lab.html')).ok){up=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,130));
 }
 if(!up)throw Error('Operator Lab unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/operator-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.getElementById('preview')?.
   dataset.ready==='true',null,{timeout:30000});
  const appearance=page.locator('main[data-lab-active="appearance"]');
  await appearance.waitFor();
  if(await page.locator('.lab-transport').isVisible())
   throw Error('Appearance transport obscures the wardrobe cards');
  await page.locator('.appearance-item-card').first().waitFor();
  const result=await page.locator('.appearance-item-card').first().evaluate(card=>{
   card.setAttribute('aria-pressed','true');
   const title=card.querySelector('.appearance-item-name');
   const css=getComputedStyle(card);
   const label=title?getComputedStyle(title):css;
   const rgb=(value)=>value.match(/\d+(?:\.\d+)?/g)?.slice(0,3)
    .map(Number)||[];
   return {card:rgb(css.color),label:rgb(label.color),
    title:title?.textContent||''};
  });
  for(const [name,v] of [['card',result.card],['label',result.label]]){
   if(v.length!==3||v.reduce((a,b)=>a+b,0)<540)
    throw Error('Selected '+name+' is dark on green: '+
     JSON.stringify(result));
  }
  await page.locator('[data-lab-tab="playback"]').click();
  if(!await page.locator('#timeline').isVisible())
   throw Error('Playback category cannot access timeline');
  await page.locator('[data-lab-tab="view"]').click();
  if(!await page.locator('#timeline').isVisible())
   throw Error('Camera category lost timeline');
  await page.locator('[data-lab-tab="appearance"]').click();
  if(await page.locator('.lab-transport').isVisible())
   throw Error('Timeline remains over appearance after navigation');
  if(errors.length)throw Error(errors.join('; '));
  console.log('Phone lab clear Appearance, selected-card contrast and Playback/Camera pass',result);
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
