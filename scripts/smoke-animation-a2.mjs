/** A2.0: real WebGL motion gallery, not an offline projected-pose mock. */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4212,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],
 {stdio:'ignore'});
const out='artifacts/animation-a2/gallery';
await mkdir(out,{recursive:true});
const tracks=[
 {name:'walk',time:900},{name:'run',time:850},
 {name:'accelerate',time:950},{name:'stop',time:1300},
 {name:'restart',time:1800},
 {name:'strafe-reverse',time:1550},{name:'turn-90',time:1250},
 {name:'strafe-left',time:750},{name:'strafe-right',time:750},
 {name:'back',time:1250},{name:'turn-180',time:1800},
 {name:'pivot-reverse',time:2200},
 {name:'pie',time:1500},{name:'crouch-walk',time:1200},
 {name:'active-aim',time:1100},{name:'short-stock',time:900}
];
try{
 let ready=false;
 for(let i=0;i<110;i++){
  try{if((await fetch(origin+'/operator-lab.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(r=>setTimeout(r,140));
 }
 if(!ready)throw Error('A2 Vite lab unavailable');
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},
   deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/operator-lab.html?tab=poses',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('#preview')?.dataset.ready==='true',
   null,{timeout:40000});
  for(const item of tracks){
   await page.locator('#poseAnimation').selectOption(item.name);
   await page.locator('#timeline').evaluate((node,time)=>{
    node.value=String(time);node.dispatchEvent(new Event('input',{bubbles:true}));
   },item.time);
   await page.waitForFunction(({name,time})=>{
    const d=document.querySelector('#preview')?.dataset;
    return d?.ready==='true'&&d.track===name&&
      Math.abs(Number(d.time)-time/1000)<.003&&Number(d.drawCalls)>0;
   },item,{timeout:20000});
   await page.screenshot({path:out+'/iphone-'+item.name+'.png'});
  }
  await page.setViewportSize({width:1120,height:820});
  for(const item of [tracks[0],tracks[1],tracks[4],tracks[7],tracks[9]]){
   await page.locator('#poseAnimation').selectOption(item.name);
   await page.locator('#timeline').evaluate((node,time)=>{
    node.value=String(time);node.dispatchEvent(new Event('input',{bubbles:true}));
   },item.time);
   await page.waitForFunction(({name,time})=>{
    const d=document.querySelector('#preview')?.dataset;
    return d?.track===name&&Math.abs(Number(d.time)-time/1000)<.003;
   },item,{timeout:20000});
   await page.screenshot({path:out+'/desktop-'+item.name+'.png'});
  }
  if(errors.length)throw Error('A2 browser errors: '+errors.join('; '));
  console.log('A2 actual mobile/desktop WebGL motion gallery PASS',tracks.length);
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
