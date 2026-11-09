/** Opt-in CPU benchmark of point-candidate eligibility; not a GPU or
 * mobile FPS proxy. No changes to the authoritative LOS/geometry pass.
 */
import {performance} from 'node:perf_hooks';
import {groundViewCandidate} from '../src/breach-ground-view.ts';
import {cachedActorGroundView} from '../src/breach-live-visual-candidates.ts';
const actors=Array.from({length:4},(_,i)=>({
  p:{x:200+i*40,y:340+i*30},heading:i*.8-.6
}));
const points=[];
for(const actor of actors)for(let i=0;i<1000;i++){
  const a=i*2.399963229728653,r=(i%5===0?250:i%7===0?239:110);
  points.push({x:actor.p.x+Math.cos(a)*r,
    y:actor.p.y+Math.sin(a)*r});
}
const reference=(actor,p)=>{
 const angle=Math.atan2(p.y-actor.p.y,p.x-actor.p.x);
 const delta=Math.atan2(Math.sin(angle-actor.heading),
   Math.cos(angle-actor.heading));
 return Math.hypot(p.x-actor.p.x,p.y-actor.p.y)<240&&
   Math.abs(delta)<1.15;
};
function measure(fn){
 let hits=0;
 for(let repeat=0;repeat<2;repeat++)for(const a of actors)
   for(const p of points)if(fn(a,p))hits++;
 const begin=performance.now();hits=0;
 for(let repeat=0;repeat<12;repeat++)for(const a of actors)
   for(const p of points)if(fn(a,p))hits++;
 return {elapsedMs:+(performance.now()-begin).toFixed(2),hits};
}
const old=measure(reference);
const candidate=measure((a,p)=>groundViewCandidate(cachedActorGroundView(a),p.x,p.y));
if(old.hits!==candidate.hits)throw Error('FOV candidate disagreement');
console.log(JSON.stringify({
  samples:points.length,actors:actors.length,repeat:12,
  oldFovMs:old.elapsedMs,cachedCandidateMs:candidate.elapsedMs,
  sameHits:true,note:'Desktop CPU candidate timing only; no LOS/GPU or iPhone FPS'
},null,2));
