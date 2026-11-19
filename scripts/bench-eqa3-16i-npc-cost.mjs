/** EQA3.16I: repeatable CPU-only presentation cost sampling.
 * Measures the PURE physicality interpreters, not GPU FPS, route planning,
 * browser frame time or the full poseOperator IK solver. Values are
 * observational on CI runners; absolute milliseconds are NOT release gates.
 *
 * node --experimental-strip-types scripts/bench-eqa3-16i-npc-cost.mjs
 */
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import {civilianPose} from '../src/breach-civilian-pose.ts';
import {civilianPhysicalityAt} from '../src/breach-encounter-physicality.ts';
import {hostilePhysicalityAt} from '../src/breach-hostile-physicality.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';

const round=n=>Math.round(n*10000)/10000;
const percentile=(numbers,q)=>{
 const s=numbers.slice().sort((a,b)=>a-b);
 return s[Math.min(s.length-1,Math.floor(q*(s.length-1)))];
};
const makeCivilians=n=>Array.from({length:n},(_,i)=>{
 const c=createCivilian({id:'eqa316i:c:'+i,role:'visitor',
  persona:i%3===0?'startled':'steady',activity:'idle',
  position:{x:(i%8)*24,y:Math.floor(i/8)*35},
  heading:i*.24,roomId:'bench',appearanceSeed:901+i});
 c.state=['routine','attentive','startled','frozen','hiding',
  'fleeing','compliant','escorted'][i%8];
 c.stateSince=2+i*.02;c.velocity=i%8===5?66:0;
 c.lastEvidenceAt=2.7;c.lastEvidenceId=i%2?'audio/11':'visual/red/alarm/4';
 c.threatEstimate={x:c.p.x+20,y:c.p.y+32};
 c.lastFlinchAt=i%3===0?2.9:-100;
 if(i%8===6){
  c.lastContactAt=2.92;c.lastContactPoint={x:c.p.x+4,y:c.p.y+15};
 }
 return c;
});
const makeHostiles=n=>Array.from({length:n},(_,i)=>({
 side:'red',p:{x:(i%8)*24,y:Math.floor(i/8)*35},
 heading:i*.24,health:2,surrendered:false,
 alert:['idle','suspicious','investigating','cover','retreat'][i%5],
 aim:i%8===7?.8:0,velocity:i%5===4?25:0,
 reload:0,suppression:i%3===0?.9:.1,
 lastNoiseAt:2.9,heard:{x:40+(i%8)*24,y:42+Math.floor(i/8)*35},
 contact:null
}));
const output={schema:'EQA3.16I',source:'pure read-only pose interpretation',
 generatedBy:'scripts/bench-eqa3-16i-npc-cost.mjs',
 units:'microseconds per NPC (CPU only)',node:process.version,
 measurements:[],note:[
  'Uses fixed data and fixed timestamps; no synthetic AI trials or gameplay',
  'Legacy civilianPose alone is the baseline selector, NOT the full game frame',
  'Interpreters add arithmetic to existing poseOperator; no GPU or JS mesh updates measured',
  'CI wall time fluctuates with JIT, runner load and GC: NO fixed millisecond gate'
 ]};
let checksum=0;
for(const count of [8,32]){
 const civs=makeCivilians(count),hostiles=makeHostiles(count);
 const original=JSON.stringify({civs,hostiles});
 const warm=()=>{
  for(let i=0;i<800;i++){
   const now=3+(i%45)/60;
   for(const c of civs){checksum+=civilianPose(c).length;
    checksum+=civilianPhysicalityAt(c,now).headYaw;}
   for(const h of hostiles)checksum+=hostilePhysicalityAt(h,now).headYaw;
  }
 };
 warm();
 const scenarios=[
  {name:'baseline pose selector',each:(now)=>{
    for(const c of civs)checksum+=civilianPose(c).length;
  },units:count},
  {name:'civilian evidence+pose',each:(now)=>{
    for(const c of civs)checksum+=civilianPhysicalityAt(c,now).headYaw;
  },units:count},
  {name:'hostile head-only intent',each:(now)=>{
    for(const h of hostiles)checksum+=hostilePhysicalityAt(h,now).headYaw;
  },units:count}
 ];
 for(const item of scenarios){
  const samples=[];
  for(let batch=0;batch<9;batch++){
   const begin=performance.now();
   for(let frame=0;frame<420;frame++)
    item.each(3+(frame%45)/60);
   samples.push((performance.now()-begin)*1000/(item.units*420));
  }
  const median=percentile(samples,.5),p95=percentile(samples,.95);
  if(!Number.isFinite(median)||median<0||!Number.isFinite(p95))
   throw Error('Non-finite pose cost');
  output.measurements.push({
   actors:count,operation:item.name,samples:samples.length,
   medianUsPerActor:round(median),p95UsPerActor:round(p95),
   maxUsPerActor:round(Math.max(...samples))
  });
 }
 if(JSON.stringify({civs,hostiles})!==original)
  throw Error('Benchmark found a gameplay actor mutation by visual interpretation');
}
if(!Number.isFinite(checksum))throw Error('CPU visual output non-finite');
output.checksum=round(checksum);
await mkdir('artifacts/eqa3-16i',{recursive:true});
await writeFile('artifacts/eqa3-16i/cpu-cost.json',
 JSON.stringify(output,null,2)+'\n');
console.log('EQA3_16I_CPU',JSON.stringify(output));
