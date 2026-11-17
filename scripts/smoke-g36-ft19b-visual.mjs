/** FT1.9C: actual browser WebGL capture of original G36, production art peers.
 * Run by the existing G36 dedicated visual workflow; no dummy image generation.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4252,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/g36-ft19b-lab.html')).ok){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,150));
 }
 if(!ready)throw Error('G36 FT1.9C peer lab unavailable');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1220,height:2120},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
  await page.goto(origin+'/g36-ft19b-lab.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.body.dataset.g36LabReady==='true'&&
   document.body.dataset.g36LabCount==='7',null,{timeout:30000});
  const lengthRatio=Number(await page.locator('body').getAttribute('data-g36-length-ratio'));
  if(!Number.isFinite(lengthRatio)||lengthRatio<.97||lengthRatio>1.03)
   throw Error('Unreviewed or implausible G36/M16A2 display scale '+lengthRatio);
  console.log('G36/M16A2 measured art-length ratio:',lengthRatio);
  await mkdir('g36-ft19b-captures',{recursive:true});
  const snap=async (selector,name,minimum=2000)=>{
   const png=await page.locator(selector).screenshot({path:'g36-ft19b-captures/'+name+'.png'});
   if(png.length<minimum)throw Error('Blank WebGL capture '+name+' ('+png.length+' bytes)');
   return png;
  };
  const view=async (button,id)=>{
   await page.getByRole('button',{name:button,exact:true}).click();
   await page.waitForFunction(expected=>document.body.dataset.g36LabView===expected,id);
   await page.waitForTimeout(60);
  };
  const review=async(id)=>{
   await page.locator('#review-'+id).click();
   await page.waitForFunction(expected=>document.body.dataset.g36LabReview===expected,id);
  };
  const finish=async (button,id)=>{
   await page.getByRole('button',{name:button,exact:true}).click();
   await page.waitForFunction(expected=>document.body.dataset.g36LabFinish===expected,id);
  };
  await review('p6');
  await snap('.lab','g36-peers-p6-side',10000);
  const side=await snap('#detail','g36-master-p6-side',2000);
  // Identical side/three-quarter framing for review-only P6/P7 optical
  // arrangements, always using the current P8 stock and receiver builder.
  for(const mode of ['lower','rear','sweep','combined']){
   await review(mode);
   await snap('#detail','g36-p7-'+mode+'-side',2000);
   await view('THREE-QUARTER','quarter');
   await snap('#detail','g36-p7-'+mode+'-quarter',2000);
   await view('SIDE','side');
  }
  await review('production');
  await snap('#detail','g36-p8-production-side',2000);
  for(const [button,id] of [
   ['THREE-QUARTER','three-quarter'],['OPPOSITE SIDE','opposite'],
   ['TOP','top'],['FRONT','front']
  ]){
   await view(button,id==='three-quarter'?'quarter':id);
   await snap('.lab','g36-peers-'+id,10000);
   const single=await snap('#detail','g36-master-'+id,1500);
   if(single.equals(side))throw Error('View '+id+' retained old side silhouette');
  }
  await finish('LIT CLAY','clay');
  await view('THREE-QUARTER','quarter');
  await snap('.lab','g36-peers-clay-three-quarter',10000);
  await snap('#detail','g36-master-clay-three-quarter',2000);
  await view('SIDE','side');
  await snap('#detail','g36-master-clay-side',2000);
  await view('TOP','top');
  await snap('#detail','g36-master-clay-top',2000);
  await view('FRONT','front');
  await snap('#detail','g36-master-clay-front',1500);
  await finish('G36 FACTORY FINISH','factory');
  await view('THREE-QUARTER','quarter');
  await snap('#detail','g36-master-factory-three-quarter',2000);
  await snap('.lab','g36-peers-factory-three-quarter',10000);
  await view('SIDE','side');
  await snap('#detail','g36-master-factory-side',2000);
  await view('OPPOSITE SIDE','opposite');
  await snap('#detail','g36-master-factory-opposite',2000);
  await view('TOP','top');
  await snap('#detail','g36-master-factory-top',2000);
  await finish('FLAT SILHOUETTE','flat');
  await view('SIDE','side');
  for(const [id,name] of [['thumb128','g36-master-128px'],['thumb64','g36-master-64px']]){
   const b=await page.locator('#'+id).screenshot({path:'g36-ft19b-captures/'+name+'.png'});
   if(b.length<300)throw Error('Missing small silhouette '+name);
  }
  await page.setViewportSize({width:430,height:1260});
  await snap('.lab','g36-peers-mobile',9000);
  if(errors.length)throw Error('G36 browser errors: '+errors.join('; '));
  console.log('G36 P8 WebGL: seven actual peers, multi-view and 64/128px captures passed. Human art review pending.');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
