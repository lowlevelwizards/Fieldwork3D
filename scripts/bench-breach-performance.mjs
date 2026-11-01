/** Deterministic CPU stress probe. These are host CI timings, NOT iPhone FPS. */
import {performance} from 'node:perf_hooks';
import {newSession,stepSession,toggling,team,enemies,liveVisibility}
  from '../src/breach-game.ts';
import {activateSite,WALLS,COVER} from '../src/breach-core.ts';
import {observeIntel} from '../src/breach-intel.ts';
import {visionPolygon} from '../src/breach-vision-polygon.ts';
import {MissionRecorder} from '../src/breach-replay.ts';

const percentile=(v,p)=>v.length?v[Math.min(v.length-1,Math.floor((v.length-1)*p))]:0;
function stats(v){const s=[...v].sort((a,b)=>a-b);
 return {avg:+(v.reduce((a,b)=>a+b,0)/Math.max(1,v.length)).toFixed(3),
 p50:+percentile(s,.5).toFixed(3),p95:+percentile(s,.95).toFixed(3),
 max:+percentile(s,1).toFixed(3)};}
function time(fn){const t=performance.now();fn();return performance.now()-t;}
function profile({seed,scale,record=false,hold=false,ticks=120}){
 const s=newSession(0,seed,'floor-plan',scale),recorder=new MissionRecorder();
 if(hold)for(const a of s.operators)a.firePolicy='hold';
 toggling(s);if(record)recorder.capture(s,true);
 const sim=[],recording=[],slowTicks=[];
 let peak={ms:0,tick:-1,phases:{}};
 for(let i=0;i<ticks;i++){
  const phases={};
  const ms=time(()=>stepSession(s,1/60,(name,cost)=>{
    phases[name]=(phases[name]??0)+cost;
  }));
  sim.push(ms);
  if(ms>peak.ms)peak={ms:+ms.toFixed(2),tick:i,phases};
  if(ms>40)slowTicks.push({tick:i,ms:+ms.toFixed(2),
    causes:Object.entries(phases).sort((a,b)=>b[1]-a[1])
      .slice(0,5).map(([name,cost])=>[name,+cost.toFixed(2)])});
  if(record)recording.push(time(()=>recorder.capture(s)));
 }
 const out={seed,scale,record,hold,ticks,actors:s.operators.length,
  walls:WALLS.length,cover:COVER.length,rooms:s.site?.rooms.length,
  shots:s.nextShotId-1,groundCells:s.seenGround.size,
  sim:stats(sim),recording:record?stats(recording):undefined,
  peak,slowTicks:slowTicks.slice(0,6)};
 console.log('SIMULATION',JSON.stringify(out));
 return out;
}
function probes(seed,scale){
 const s=newSession(0,seed,'floor-plan',scale),blue=team(s)[0];
 const vis=[],intel=[],polygons=[];
 for(let i=0;i<8;i++){
   // Operator rotates through actual building facing, as during play.
   blue.heading+=(i%2?.07:-.09);
   vis.push(time(()=>{for(let j=0;j<180;j++)
    liveVisibility(s,{x:blue.p.x+(j%20-10)*12,y:blue.p.y+Math.floor(j/20)*12});}));
   intel.push(time(()=>observeIntel(s.intel,s.site,s.doors,p=>liveVisibility(s,p))));
   polygons.push(time(()=>visionPolygon(blue.p,blue.heading,240,
     WALLS,s.doors,false,COVER)));
 }
 console.log('GEOMETRY',JSON.stringify({seed,scale,actors:s.operators.length,
   walls:WALLS.length,cover:COVER.length,rooms:s.site?.rooms.length,
   visibility180:stats(vis),intelScan:stats(intel),
   polygon:stats(polygons)}));
}
console.log('ENVIRONMENT',JSON.stringify({node:process.version,platform:process.platform,
 arch:process.arch}));

function combatStress(){
 const s=newSession(0);
 // Repeatable unobstructed exterior shootout; keep actors alive so that
 // frame costs measure sustained combat rather than only initial acquisition.
 const blues=team(s),reds=enemies(s);
 for(let i=0;i<blues.length;i++){
  const a=blues[i];a.p={x:185,y:612+i*24};a.priorP={...a.p};
  a.heading=0;a.weaponYaw=0;a.health=99;a.firePolicy='engage';
  a.stability=1;a.weapon='smg';a.magazine=60;a.reserve=180;
 }
 for(let i=0;i<reds.length;i++){
  const a=reds[i];a.p={x:315,y:612+i*24};a.priorP={...a.p};
  a.heading=Math.PI;a.weaponYaw=Math.PI;a.health=99;
  a.stability=1;a.weapon='smg';a.magazine=60;a.reserve=180;
  a.contacted=true;a.alert='engaging';a.contact={...blues[0].p};
 }
 for(const a of s.operators)for(const b of s.operators)
  if(a.side!==b.side)a.awareness.visualProgress[b.id]=1;
 toggling(s);
 const times=[],phases={};
 const shotsBefore=s.nextShotId;
 for(let i=0;i<180;i++){
  const elapsed=time(()=>stepSession(s,1/60,(name,cost)=>{
   phases[name]=(phases[name]??0)+cost;
  }));
  times.push(elapsed);
 }
 console.log('COMBAT',JSON.stringify({ticks:180,shots:s.nextShotId-shotsBefore,
  actors:s.operators.length,sim:stats(times),
  hot:Object.entries(phases).sort((a,b)=>b[1]-a[1]).slice(0,8)
    .map(([name,cost])=>[name,+cost.toFixed(2)])}));
}
combatStress();
for(const seed of [3,17,61]){
 probes(seed,'standard');
 profile({seed,scale:'standard',ticks:90});
 profile({seed,scale:'standard',record:true,ticks:90});
}
probes(17,'expanded');
profile({seed:17,scale:'expanded',ticks:60});
profile({seed:17,scale:'expanded',record:true,ticks:60});
activateSite(null);
