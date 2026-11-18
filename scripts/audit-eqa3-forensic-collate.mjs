/** EQA3.1: reduce frozen per-tick forensics into a compact, reviewable
 * exact-player-facing witness. No game edits, no new simulation.
 */
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
const dir='artifacts/eqa3/';
const files=readdirSync(dir).filter(n=>/^forensic-\d+-(unknown|confirmed)\.json$/.test(n));
const round=n=>n===null||n===undefined?null:Math.round(n*100)/100;
const compactEvent=e=>({t:e.at,kind:e.type,stage:e.stage,
 p:e.player.p,health:e.player.hp,blocked:round(e.player.blockedTime),
 blocker:e.player.blocker,motor:e.player.motorPause,
 order:e.player.plan?.kind??null,failed:e.player.failedOrders,
 nav:e.player.nav,
 person:e.person?{state:e.person.state,following:e.person.following,
  dist:e.person.distance,carrier:e.person.carrier}:null,
 escort:e.escort,
 firstThreat:e.hostiles.find(h=>h.visible||h.enemySight)?
   (()=>{const h=e.hostiles.find(h=>h.visible||h.enemySight);
    return {id:h.id,dist:h.distance,hostileSees:h.enemySight,
     playerSees:h.visible,readiness:h.readiness,alert:h.alert}})():null});
const all=[],exceptions=[];
for(const name of files){
 let a=JSON.parse(readFileSync(dir+name,'utf8'));
 if(a.exceptions.length)exceptions.push(...a.exceptions);
 for(const r of a.rows){
  const events=r.forensic??[];
  const ticks=events.filter(e=>e.type==='tick');
  const firstSight=ticks.find(e=>e.hostiles.some(h=>h.visible||h.enemySight));
  const firstHostileSight=ticks.find(e=>e.hostiles.some(h=>h.enemySight));
  const atZero=events.find(e=>e.type==='initial');
  const attempts=events.filter(e=>e.type.startsWith('attempt-'));
  const rejections=attempts.filter(e=>e.type.endsWith('-rejected'));
  const firstAbort=events.find(e=>e.type==='route-abort');
  const personTransitions=[],prior={state:null,following:null,escort:null};
  for(const e of events){
   if(!e.person)continue;
   if(e.person.state!==prior.state||
      e.person.following!==prior.following||e.escort!==prior.escort){
    personTransitions.push(compactEvent(e));
    prior.state=e.person.state;prior.following=e.person.following;
    prior.escort=e.escort;
   }
  }
  const interesting=events.filter(e=>e.type==='initial'||
     e.type==='route-abort'||
     e.type.endsWith('-rejected')).slice(0,22).map(compactEvent);
  const timed=[0,1,2,5,10,20,40,60,80].map(t=>{
   const point=events.find(e=>e.at>=t-.06);
   return point?{time:t,...compactEvent(point)}:null;
  }).filter(Boolean);
  const ending=events.at(-1);
  const activeHostiles=atZero?.hostiles??[];
  const avg=(xs)=>xs.length?round(xs.reduce((s,x)=>s+x,0)/xs.length):null;
  all.push({seed:r.seed,mission:r.mission,intel:r.intel,
   entry:r.insertion,stage:r.missionStage,seconds:r.duration,
   firstContactAt:round(r.firstContactAt),
   initialActiveEnemySight:activeHostiles.filter(h=>h.enemySight).length,
   initialPlayerSight:activeHostiles.filter(h=>h.visible).length,
   nearestInitialThreatDistance:activeHostiles.length?
    Math.min(...activeHostiles.map(h=>h.distance)):null,
   initialThreats:activeHostiles.slice(0,8),
   firstSight:firstSight?compactEvent(firstSight):null,
   firstEnemySight:firstHostileSight?compactEvent(firstHostileSight):null,
   firstAbort:firstAbort?compactEvent(firstAbort):null,
   aborts:r.routeAbort,rejected:r.rejected,
   rejectedKinds:Object.fromEntries([...new Set(rejections.map(e=>e.type))]
     .map(k=>[k,rejections.filter(e=>e.type===k).length])),
   attempts:attempts.length,initial:interesting[0],
   special:interesting.slice(1),timed,
   personTransitions:personTransitions.slice(0,16),
   ending:ending?compactEvent(ending):null,
   realMissionStages:r.stages,
   firstRooms:r.roomVisitOrder.slice(0,8)});
 }
}
const summary={cases:all.length,files:files.length,exceptions,
 initialSightCases:all.filter(r=>r.initialActiveEnemySight||r.initialPlayerSight).length,
 firstSightWithin1s:all.filter(r=>r.firstSight?.t<=1).length,
 repeatedRejectionCases:all.filter(r=>r.rejected>=5).length,
 routeAbortCases:all.filter(r=>r.aborts>0).length,
 rescueCases:all.filter(r=>r.mission==='rescue').length,
 rescueCompleted:all.filter(r=>r.mission==='rescue'&&r.stage==='done').length};
mkdirSync(dir,{recursive:true});
writeFileSync(dir+'forensic-review.json',JSON.stringify({summary,rows:all},null,2)+'\n');
console.log(JSON.stringify({summary,rows:all.map(r=>({
 seed:r.seed,mission:r.mission,entry:r.entry,intel:r.intel,
 stage:r.stage,firstContactAt:r.firstContactAt,
 initialActiveEnemySight:r.initialActiveEnemySight,
 initialPlayerSight:r.initialPlayerSight,
 firstSight:r.firstSight,firstEnemySight:r.firstEnemySight,
 firstAbort:r.firstAbort,aborts:r.aborts,rejected:r.rejected,
 rejectionKinds:r.rejectedKinds,
 personTransitions:r.personTransitions.slice(0,6),
 sample:r.timed.filter(x=>[0,5,20,40,80].includes(x.time)),
 ending:r.ending
}))},null,2));
if(exceptions.length||!files.length)process.exitCode=1;
