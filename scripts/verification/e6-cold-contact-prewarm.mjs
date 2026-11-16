/** E6.0: controlled cold-scene CPU comparison using actual operator rig
 * construction + appearance/pose. NOT WebGL GPU time or phone RAF intervals.
 * Unlike a steady pose benchmark this reports work concentrated per frame.
 * Command: node --experimental-strip-types scripts/verification/e6-cold-contact-prewarm.mjs
 */
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createOperatorRig,poseOperator}
 from '../../src/breach-operator-rig.ts';

const input=(i)=>({
 x:50+i*25,z:125,heading:i*.17,velocity:0,
 seconds:0,stride:0,posture:'stand',injury:0,
 weapon:'carbine',reload:0,reloadDuration:1.8,
 down:false,surrender:false,aiming:false,firing:false,turning:0,
 lastDoorAt:-100,lastThrowAt:-100,deterministic:true,
 poseDiagnostics:false
});
function measure(count,quota){
 const ids=Array.from({length:count},(_,i)=>'e6-guard-'+i);
 const rigResults=new Map(),perFrameMs=[],builtPerFrame=[];
 let next=0;
 while(next<count){
  let built=0;
  const started=performance.now();
  while(next<count&&built<quota){
   const i=next++;
   const rig=createOperatorRig(ids[i],'red',true);
   try{
    rig.root.visible=false;
    poseOperator(rig,input(i),0);
    // Record the unchanged visual identity and initial weapon output
    // while preserving physical disclosure (all hidden throughout).
    rigResults.set(ids[i],{
     appearanceKey:rig.root.userData.fieldworkLightingAppearanceKey,
     visible:rig.root.visible,
     weaponNames:rig.weaponBody.children.map(o=>o.name),
     partCount:rig.weaponBody.children.length
    });
   }finally{rig.dispose();}
   built++;
  }
  perFrameMs.push(performance.now()-started);
  builtPerFrame.push(built);
 }
 return {count,quota,builtPerFrame,
  perFrameMs:perFrameMs.map(x=>Math.round(x*1000)/1000),
  maxFrameCpuMs:Math.round(Math.max(...perFrameMs)*1000)/1000,
  totalCpuMs:Math.round(perFrameMs.reduce((a,b)=>a+b,0)*1000)/1000,
  rigResults:[...rigResults]};
}
export function runColdContactPrewarmStudy({hostiles=4}={}){
 if(!Number.isInteger(hostiles)||hostiles<2||hostiles>16)
  throw Error('E6 baseline needs 2–16 hidden hostiles');
 const simultaneous=measure(hostiles,hostiles);
 const distributed=measure(hostiles,1);
 if(JSON.stringify(simultaneous.rigResults)!==
    JSON.stringify(distributed.rigResults))
  throw Error('E6 distributed prewarm changed cold appearance/weapon facts');
 if(distributed.builtPerFrame.some(x=>x>1)||
    distributed.builtPerFrame.reduce((a,b)=>a+b,0)!==hostiles)
  throw Error('E6 distributed prewarm failed its per-frame budget');
 if(distributed.rigResults.some(([,r])=>r.visible||
     !r.appearanceKey||r.partCount<1))
  throw Error('E6 cold prewarm leaked visibility or lacked weapon/kit');
 return {stage:'E6.0–E6.1',hostiles,simultaneous,distributed,
  coldAppearanceParity:true,
  caveat:'Actual Node rig + appearance CPU timings, not browser RAF, WebGL, iOS or GPU time; sequential comparisons can vary with JIT/GC. Counts and identity parity are gated, wall time is observational.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const index=process.argv.indexOf('--out'),countIndex=process.argv.indexOf('--hostiles');
 const count=countIndex<0?4:Number(process.argv[countIndex+1]);
 const result=runColdContactPrewarmStudy({hostiles:count});
 if(index>=0){
  if(!process.argv[index+1])throw Error('--out requires path');
  const path=resolve(process.argv[index+1]);
  mkdirSync(dirname(path),{recursive:true});
  writeFileSync(path,JSON.stringify(result,null,2)+'\n');
 }
 console.log('E6_COLD_CONTACT',JSON.stringify(result));
}
