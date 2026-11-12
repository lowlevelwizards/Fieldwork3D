/** TM10: opt-in reproducible real-world motor observations, no motor changes.
 * node --experimental-strip-types scripts/audit-movement-quality.mjs 3 240
 */
import {generateSite} from '../src/breach-site.ts';
import {newSession,planMove,stepSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {MovementQualitySurvey} from '../src/breach-movement-quality.ts';
const count=Math.min(12,Math.max(1,parseInt(process.argv[2]??'3',10)||3));
const ticks=Math.min(720,Math.max(60,parseInt(process.argv[3]??'240',10)||240));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rows=[];
for(let k=0;k<count;k++){
 const seed=11+k*6;
 const site=generateSite(seed,'small',undefined,
  {seed,mission:'intel',risk:1});
 const s=newSession(0,seed,'full-view','small','intel',site,
  {enableCivilians:true});
 try{
  const actors=team(s).slice(0,4);
  const rooms=site.rooms.filter(r=>r.kind==='room').sort((a,b)=>
   a.id.localeCompare(b.id));
  const candidates=rooms.flatMap(room=>[
   {x:room.x+room.w*.5,y:room.y+room.h*.5},
   {x:room.x+room.w*.35,y:room.y+room.h*.5},
   {x:room.x+room.w*.65,y:room.y+room.h*.5}
  ]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
  const goals=new Map();
  for(const [i,actor] of actors.entries()){
   const ordered=candidates.slice().sort((a,b)=>
     dist(b,actor.p)-dist(a,actor.p)||
     a.x-b.x||a.y-b.y);
   const viable=ordered.find(p=>!Array.from(goals.values()).some(q=>
    dist(p,q)<26)&&planMove(s,actor.id,p));
   if(viable)goals.set(actor.id,{...viable});
  }
  const survey=new MovementQualitySurvey(actors,goals);
  s.phase='running';s.started=true;
  for(let i=0;i<ticks&&s.phase==='running';i++){
   stepSession(s,1/60);
   survey.sample(actors,1/60);
  }
  rows.push({seed,archetype:site.archetype,rooms:rooms.length,
   ...survey.finish(actors)});
 }finally{activateSite(null);}
}
const sum=(f)=>rows.reduce((n,r)=>n+f(r),0);
console.log(JSON.stringify({method:'TM10 real generated seeded four-operator fixed step',
 count:rows.length,ticks,rows,summary:{
 plansAccepted:sum(r=>r.plansAccepted),
 arrivals:sum(r=>r.arrivals),
 incomplete:sum(r=>r.incomplete),
 stallEpisodes:sum(r=>r.stallEpisodes),
 retries:sum(r=>r.retries),
 passageWaitSeconds:+sum(r=>r.passageWaitSeconds).toFixed(2),
 squeezeSeconds:+sum(r=>r.squeezeSeconds).toFixed(2),
 invalidPositions:sum(r=>r.invalidPositions)
}},null,2));
if(rows.some(r=>r.invalidPositions))process.exitCode=1;
