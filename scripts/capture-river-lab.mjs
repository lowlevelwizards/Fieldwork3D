/**
 * Deterministic evidence generator for Build 025. Captures both oblique and
 * overhead mobile screenshots for dry/normal/high/flood/recession/pond/live.
 *
 * Setup: npm ci; npm install --no-save --package-lock=false playwright;
 *        npx playwright install chromium
 * Run: node scripts/capture-river-lab.mjs
 *
 * This is a VISUAL REVIEW aid, not a substitute for human approval.
 * Artifacts are not reference baselines until reviewed and accepted.
 */
import { spawn } from 'node:child_process';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

let chromium;
try{ ({chromium}=await import('playwright')); }
catch{
  console.error('Playwright is optional: npm install --no-save --package-lock=false playwright && npx playwright install chromium');
  process.exit(2);
}
const PORT=4178;
const url=`http://127.0.0.1:${PORT}/river-lab.html`;
const directory=resolve('river-lab-captures');
await mkdir(directory,{recursive:true});
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{
  stdio:'pipe',env:{...process.env,CI:'true'},
});
let browser;
try{
  let ready=false;
  for(let t=0;t<100;t++){
    if(server.exitCode!==null)throw Error('Vite server exited early');
    try{
      const response=await fetch(url);
      if(response.ok){ready=true;break;}
    }catch{}
    await new Promise(done=>setTimeout(done,150));
  }
  if(!ready)throw Error('River lab Vite server did not start');
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader']});
  const context=await browser.newContext({
    viewport:{width:390,height:844},
    deviceScaleFactor:1,
    reducedMotion:'reduce',
  });
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  const manifest=[];
  for(const scenario of ['dry','normal','high','flood','recession','pond','live']){
    for(const view of ['oblique','overhead']){
      const target=`${url}?scenario=${scenario}&view=${view}`;
      await page.goto(target,{waitUntil:'networkidle'});
      await page.locator('html[data-river-lab-ready="true"]').waitFor();
      // Force a finished WebGL render before screenshot. The scene has no
      // animated waves/particle clocks, so repeated captures are comparable.
      await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>done(null))));
      const name=`river-${scenario}-${view}-mobile.png`;
      await page.screenshot({path:resolve(directory,name)});
      const label=await page.locator('#status').innerText();
      manifest.push({name,scenario,view,label});
    }
  }
  await page.goto(`${url}?scenario=flood&view=oblique&debug=1`,{
    waitUntil:'networkidle',
  });
  await page.locator('html[data-river-lab-ready="true"]').waitFor();
  await page.screenshot({path:resolve(directory,'river-flood-debug-mobile.png')});
  if(errors.length)throw Error('Browser errors: '+errors.join('; '));
  await writeFile(resolve(directory,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('Captured '+(manifest.length+1)+' deterministic reference views in '+directory);
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
