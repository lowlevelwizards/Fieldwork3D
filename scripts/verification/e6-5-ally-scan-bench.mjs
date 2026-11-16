/** E6.5 controlled Node CPU A/B of the legacy two-scan and fused
 * presentation-only teammate loop. Never use timings as a CI speed gate.
 * Real browser poses, fog, RAF and WebGL GPU time are NOT captured here. */
import {performance} from 'node:perf_hooks';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {teammateAheadForHandling,teammateAheadProjectedOffset}
 from '../../src/breach-handling-context.ts';

const now=(samples,p)=>samples.slice().sort((a,b)=>a-b)[
 Math.min(samples.length-1,Math.floor((samples.length-1)*p))];
const scenarios=[4,8,16,32];
const outIndex=process.argv.indexOf('--out');
if(outIndex>=0&&!process.argv[outIndex+1])throw Error('E6.5 --out path required');
const report={stage:'E6.5',schema:1,environment:{
 node:process.version,platform:process.platform,arch:process.arch},
 note:'Controlled presentation CPU microbench only. Not browser/phone RAF, FPS or GPU time. CI gates parity/scan count, never elapsed time.',
 scenarios:[]};
let sink=0;
for(const n of scenarios){
 const actors=Array.from({length:n},(_,i)=>({
  id:'ally-'+i,side:i%5===0?'red':'blue',health:i%7===0?0:100,
  p:{x:Math.sin(i*1.27)*65,y:Math.cos(i*.71)*57},
  heading:i*.31
 }));
 const blue=actors.filter(a=>a.side==='blue'&&a.health>0);
 const frame=(kind,t,trackVisits=false)=>{
  let checksum=0,visits=0;
  for(const a of blue){
   const draw={x:a.p.x+Math.sin(t*.02),z:a.p.y+Math.cos(t*.02)};
   let stack=false,ahead=false,safety=0;
   const fx=Math.cos(a.heading),fy=Math.sin(a.heading);
   for(const peer of actors){
    visits++;
    if(peer===a||peer.side!==a.side||peer.health<=0)continue;
    const dx=peer.p.x-a.p.x,dy=peer.p.y-a.p.y;
    if(dx*dx+dy*dy<1600)stack=true;
    if(kind==='fused'&&!ahead&&
       teammateAheadProjectedOffset(dx,dy,fx,fy))ahead=true;
    const sx=peer.p.x-draw.x,sy=peer.p.y-draw.z;
    if(sx*sx+sy*sy<8100)safety++;
   }
   if(kind==='legacy'){
    // The existing helper separately scans the roster and can exit early.
    // Count its visits ONLY in parity samples, outside measured frames;
    // otherwise benchmark bookkeeping would make the baseline slower.
    ahead=teammateAheadForHandling(a.p,a.heading,actors,a);
    let extra=0;
    if(trackVisits)for(const peer of actors){
     extra++;
     if(peer===a||peer.side!==a.side||peer.health<=0)continue;
     const dx=peer.p.x-a.p.x,dy=peer.p.y-a.p.y;
     if(teammateAheadProjectedOffset(dx,dy,fx,fy))break;
    }
    visits+=extra;
   }
   checksum+=safety+(stack?101:0)+(ahead?503:0);
  }
  return {checksum,visits};
 };
 for(let i=0;i<40;i++){
  const a=frame('legacy',i,true),b=frame('fused',i,true);
  if(a.checksum!==b.checksum||b.visits!==n*blue.length||
     a.visits<b.visits)throw Error('E6.5 workload parity / scan count mismatch');
 }
 const each=240,legacy=[],fused=[];
 for(let i=0;i<each;i++){
  // Alternate ordering to reduce run-order bias from JIT and GC.
  const order=i%2?['fused','legacy']:['legacy','fused'];
  for(const k of order){
   const start=performance.now();
   const outcome=frame(k,i+40);
   (k==='legacy'?legacy:fused).push(performance.now()-start);
   sink+=outcome.checksum;
  }
 }
 const medianLegacy=now(legacy,.5),medianFused=now(fused,.5);
 const exampleOld=frame('legacy',40,true),exampleNew=frame('fused',40,true);
 report.scenarios.push({actors:n,liveBlue:blue.length,
  legacyPeerVisitsPerFrame:exampleOld.visits,
  fusedPeerVisitsPerFrame:exampleNew.visits,
  visitsAvoidedPerFrame:exampleOld.visits-exampleNew.visits,
  legacyMedianMs:Number(medianLegacy.toFixed(5)),
  fusedMedianMs:Number(medianFused.toFixed(5)),
  legacyP95Ms:Number(now(legacy,.95).toFixed(5)),
  fusedP95Ms:Number(now(fused,.95).toFixed(5)),
  timingRatio:Number((medianFused/Math.max(.00001,medianLegacy)).toFixed(3))});
}
report.checksum=sink;
const file=outIndex<0?null:process.argv[outIndex+1];
if(file){mkdirSync(dirname(file),{recursive:true});
 writeFileSync(file,JSON.stringify(report,null,2)+'\n');}
console.log('E6_5_ALLY_AB',JSON.stringify(report));
