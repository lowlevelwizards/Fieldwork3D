/** W8.5: use the established actual live Quick Play callback profiler.
 * Three counterbalanced pairs; no hardware GPU/FPS claims. */
import {execFileSync} from 'node:child_process';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const base=process.env.W8_BASE_ROOT;if(!base)throw Error('Exact base required');
const out=resolve('artifacts/w8-live');mkdirSync(out,{recursive:true});
const rows=[];
for(let pair=0;pair<3;pair++){
 for(const label of pair%2?['candidate','base']:['base','candidate']){
  const dir=out+'/'+pair+'-'+label;
  execFileSync(process.execPath,['scripts/verification/e6-19-transparent-role-browser.mjs'],{cwd:label==='base'?base:process.cwd(),env:{...process.env,FIELDWORK_WALL_OUTPUT:dir},stdio:'inherit'});
  const summary=JSON.parse(readFileSync(dir+'/summary.json','utf8'));
  rows.push({pair,label,runs:summary.runs.map(r=>({seed:r.seed,scene:r.sceneP95Ms,callback:r.callbackP95Ms,draws:r.drawCallsP95,shadow:r.renderSubmission.shadowDrawCallsP95,phases:r.phaseP95Ms,idle:JSON.parse(readFileSync(dir+'/seed-'+r.seed+'-briefing-1.json','utf8')).postReadyRuntime?.p95SceneMs}))});
 }
}
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
const evidence=[];
for(const seed of [23,97]){
 const pairs=Array.from({length:3},(_,pair)=>{
  const get=label=>rows.find(r=>r.pair===pair&&r.label===label).runs.find(r=>r.seed===seed);
  const a=get('base'),b=get('candidate');
  return {pair,base:a,candidate:b,sceneRatio:b.scene/a.scene,callbackRatio:b.callback/a.callback,idleRatio:a.idle>0&&b.idle!=null?b.idle/a.idle:null};
 });
 const ratios=pairs.map(p=>p.sceneRatio);
 evidence.push({seed,pairs,medianSceneRatio:median(ratios),reproducibleRegression:ratios.filter(r=>r>1.05).length>=2});
}
writeFileSync(out+'/summary.json',JSON.stringify({note:'Actual 90-callback software WebGL CPU/driver timing; three counterbalanced pairs; static exact draws measured separately.',evidence},null,2));
console.log('W8_LIVE '+JSON.stringify(evidence));
if(evidence.some(e=>e.reproducibleRegression))throw Error('W8 reproducible live scene p95 regression >5%; inspect phase attribution and repeat if needed');
