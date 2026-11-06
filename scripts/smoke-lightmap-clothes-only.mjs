/** Mobile screenshot regression for the live 6ca6bb5 vertical-shard bug.
 * This specifically exercises Studio -> TOPS -> MATERIAL -> CLOTHES ONLY,
 * which all prior mobile smoke tests omitted.
 */
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const port=4298,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,[
 'node_modules/vite/bin/vite.js','--host','127.0.0.1',
 '--port',String(port),'--strictPort'
],{stdio:'ignore'});
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(origin+'/operator-studio.html')).ok){ready=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,130));
 }
 if(!ready)throw Error('Studio preview server did not start');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({
   viewport:{width:390,height:844},deviceScaleFactor:2,
   isMobile:true,hasTouch:true
  });
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/operator-studio.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>
   document.getElementById('studioCanvas')?.dataset.ready==='true'&&
   Number(document.getElementById('studioCanvas')?.dataset.drawCalls)>0,
   null,{timeout:30000});
  await page.getByRole('button',{name:'Customize tops'}).click();
  await page.waitForFunction(()=>
   document.getElementById('studioGearToggle')?.textContent?.includes('CLOTHES ONLY'),
   null,{timeout:12000});
  await mkdir('operator-lightmap-clothes-only',{recursive:true});
  const examples=[
   {id:'bdu-shirt',label:'BDU'},
   {id:'acu-shirt',label:'ACU'},
   {id:'combat-shirt',label:'combat-shirt'}
  ];
  let previousScreenshot=null;
  for(const {id,label} of examples){
   // The material tab hides the item grid. Explicitly return to ITEM
   // before choosing each real garment; otherwise every screenshot
   // silently captures the same BDU top and falsely "checks" three styles.
   await page.locator('[data-studio-step="items"]').click();
   const item=page.locator('[data-appearance-item="'+id+'"]');
   await item.waitFor({state:'visible',timeout:10000});
   if(await item.isDisabled())throw Error(id+' unavailable in Studio');
   await item.click();
   await page.waitForFunction(()=>
    document.querySelector('[data-studio-step="materials"]')?.getAttribute('aria-pressed')==='true',
    null,{timeout:10000});
   await page.waitForTimeout(280);
   const shot=await page.locator('#studioCanvas').screenshot();
   if(previousScreenshot&&Buffer.compare(previousScreenshot,shot)===0)
    throw Error(id+': preview image unchanged from previous distinct top');
   previousScreenshot=shot;
   await page.screenshot({path:'operator-lightmap-clothes-only/'+id+'.png'});
   // Actual WebGL pixels, not DOM geometry or a passing draw-call count.
   const result=await page.evaluate(async encoded=>{
    const image=new Image();
    image.src='data:image/png;base64,'+encoded;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=image.width;canvas.height=image.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,image.width,image.height).data;
    const width=image.width,height=image.height;
    const bg=[196,199,189];
    let minY=height,maxY=0,total=0,top=0;
    for(let y=0;y<height;y++){
     let count=0;
     for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      const different=Math.max(
       Math.abs(data[i]-bg[0]),
       Math.abs(data[i+1]-bg[1]),
       Math.abs(data[i+2]-bg[2]))>42;
      if(different){count++;total++;}
     }
     if(count>=6){minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
     if(y<height*.045)top+=count;
    }
    return {width,height,minY,maxY,top,total,
     topFraction:top/Math.max(1,total)};
   },shot.toString('base64'));
   console.log(label+' clothes-only render geometry',JSON.stringify(result));
   if(result.total<1000)throw Error(id+': clothing is invisible');
   // A correctly framed HEAD may naturally reach the first rows when the
   // Studio focuses on TOPS. An absolute minY/top-pixel check incorrectly
   // rejected that good screenshot (BDU head, only 1% of foreground in
   // the upper 4.5%). Require severe, *relative* spill instead. Separate
   // IK mesh-bound tests catch the actual 10x limb geometry regression.
   if(result.topFraction>.075)
    throw Error(id+': severe upward shard spill (top 4.5% foreground >7.5%); '+
     JSON.stringify(result));
  }
  if(errors.length)throw Error('Studio WebGL errors: '+errors.join('; '));
  console.log('PASS: phone Tops -> Material -> Clothes Only is proportionate');
 }finally{await browser.close();}
}finally{server.kill('SIGTERM');}
