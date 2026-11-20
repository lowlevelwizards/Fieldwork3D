/** P6.H diagnostic CPU microbench. Never claim device FPS from Node timing. */
import {performance} from 'node:perf_hooks';
import {FrameActorNeighborhoodIndex}
 from '../../src/breach-actor-neighborhood.ts';
import {teammateAheadProjectedOffset}
 from '../../src/breach-handling-context.ts';
const random=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;
 return seed/4294967296;};
const frame=(n,seed)=>{const rng=random(seed);return Array.from({length:n},
 (_,i)=>({id:'actor'+i,side:i%4===0?'red':'blue',health:i%11===0?0:100,
 p:{x:(rng()-.5)*750,y:(rng()-.5)*750},heading:rng()*6.28}));};
function scan(actors,actor){
 const x=Math.cos(actor.heading),y=Math.sin(actor.heading);
 let stack=false,ahead=false,safety=0;
 for(const peer of actors){
  if(peer===actor||peer.side!==actor.side||peer.health<=0)continue;
  const dx=peer.p.x-actor.p.x,dy=peer.p.y-actor.p.y;
  if(!stack&&dx*dx+dy*dy<1600)stack=true;
  if(!ahead&&teammateAheadProjectedOffset(dx,dy,x,y))ahead=true;
  if(dx*dx+dy*dy<8100)safety++;
 }
 return Number(stack)+2*Number(ahead)+4*safety;
}
const runs=[];
for(const n of [4,16,32,88,180]){
 const actors=frame(n,0x2688+n);
 const index=new FrameActorNeighborhoodIndex();
 index.rebuild(actors);
 const expected=actors.map(a=>scan(actors,a));
 const candidate=actors.map(a=>scan(
  index.candidates(a.p.x,a.p.y,a.p.x,a.p.y),a));
 if(expected.some((v,i)=>v!==candidate[i]))
  throw Error('Parity fail at N='+n);
 const time=runner=>{
  const samples=[];
  for(let trial=0;trial<6;trial++){
   const t=performance.now();
   for(let k=0;k<60;k++)runner();
   samples.push((performance.now()-t)/60);
  }
  samples.sort((a,b)=>a-b);
  return Math.round(samples[3]*10000)/10000;
 };
 const baselineMs=time(()=>{for(const a of actors)scan(actors,a);});
 const indexedMs=time(()=>{
  index.rebuild(actors);
  for(const a of actors)scan(index.candidates(
   a.p.x,a.p.y,a.p.x,a.p.y),a);
 });
 runs.push({actors:n,baselineMs,indexedMs,
  ratio:Math.round(baselineMs/indexedMs*100)/100});
}
console.log('P6_H_ALLY_SCAN_NODE',JSON.stringify({
 warning:'Node CPU microbench, not RAF time, GPU timing, physical phone or gameplay FPS',
 runs
}));
