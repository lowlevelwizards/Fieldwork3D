import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1100,height:850},deviceScaleFactor:1});
 page.on('pageerror',e=>console.error(e));
 for(let i=0;i<30;i++){try{await page.goto('http://localhost:4173/casualty-transport-lab.html');break;}catch{await new Promise(r=>setTimeout(r,1000));}}
 await page.waitForFunction(()=>document.querySelector('#stage canvas')&&document.querySelector('#detail').textContent.includes('PICKUP'));
 await fs.mkdir('ct-preview',{recursive:true});
 await page.selectOption('#mode','carry');await page.selectOption('#scenario','idle');await page.selectOption('#subject','red');
 await page.locator('#loaded').click();await page.locator('#contacts').uncheck();
 const t=page.locator('#time');const start=Number(await t.inputValue());
 await t.evaluate((el,v)=>{el.value=String(v);el.dispatchEvent(new Event('input'));},start+60);
 for(const view of ['three','side','top']){
  await page.selectOption('#view',view);await page.waitForTimeout(300);
  const b=await page.locator('#stage canvas').screenshot({type:'jpeg',quality:80,path:'ct-preview/carry-'+view+'.jpg'});
  console.log('VIEW '+view+' '+b.toString('base64'));
 }
 await page.selectOption('#mode','drag');await page.locator('#loaded').click();await page.selectOption('#view','three');await page.waitForTimeout(300);
 await page.locator('#stage canvas').screenshot({path:'ct-preview/drag-three.png'});
}finally{await browser.close();}
