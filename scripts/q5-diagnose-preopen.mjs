/** Q5 short one-time diagnosis of pre-opened door staging (no simulation). */
import {newSession,team,planStack,planSquadEntry}
 from '../src/breach-game.ts';
import {doorRangeSite,prepareDoorRangeCase,
 DOOR_RANGE_APPROACHES} from '../src/breach-door-test-cases.ts';
import {stackApproachPositions,doorOpensTowardApproach}
 from '../src/breach-entry-coordination.ts';
import {routeWithIntel,intelPassable} from '../src/breach-intel.ts';
import {doorWouldStrikeActors} from '../src/breach-door.ts';
import {activateSite,doorLeafSegment,pointToSegment,
 OPERATOR_RADIUS,doorCenter} from '../src/breach-core.ts';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
for(const id of ['ajar-outward','wide-open']){
 for(const approach of DOOR_RANGE_APPROACHES.map(x=>x.id)){
  const s=newSession(0,undefined,'full-view','small','hold',
   doorRangeSite(id,approach),{enableCivilians:false});
  try{
   prepareDoorRangeCase(s,id);
   const door=s.doors[0],center=doorCenter(door);
   const stages=[];
   for(const a of team(s).slice(0,4)){
    const from=a.p,outward=doorOpensTowardApproach(door,from);
    const occupied=team(s).filter(x=>x!==a)
     .map(x=>x.plan.find(n=>n.stackDoorId===door.id))
     .filter(Boolean).map(n=>n.p);
    const candidates=stackApproachPositions(door,from).map((p,i)=>({
     i,p,center:Math.round(distance(p,center)),
     leaf:+pointToSegment(p,doorLeafSegment(door)).toFixed(1),
     hit:outward&&doorWouldStrikeActors({...door,openFraction:0},
      1.03,[p],OPERATOR_RADIUS+1),
     known:intelPassable(p,s.intel),
     route:routeWithIntel(s.intel,from,p).length,
     occupied:occupied.some(q=>distance(q,p)<23)
    }));
    const ok=planStack(s,a.id,'ENTRY');
    stages.push({id:a.id,from,ok,chosen:a.plan[0]?.p??null,
     outward,candidates});
   }
   console.log('Q5_STAGE_DEBUG '+JSON.stringify({id,approach,
    stages,door:{angle:door.openFraction,hinge:door.hinge,swing:door.swing}}));
  }finally{activateSite(null);}
 }
}
