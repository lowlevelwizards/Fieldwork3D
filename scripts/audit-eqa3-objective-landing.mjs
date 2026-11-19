/** EQA3.2 bounded diagnosed landing + route evidence on exact failed
 * objective-proximity scripts. All output is factual: static clearance,
 * authored order admission and world-route with INITIAL current doors.
 * Never silently opens doors or moves actors.
 */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planMove,availableDeployments,
 selectDeployment} from '../src/breach-game.ts';
import {OPERATOR_RADIUS,activateSite,pointToSegment,doorCenter}
 from '../src/breach-core.ts';
import {intelPassable} from '../src/breach-intel.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {bodyClear,sweptBodyClear} from '../src/breach-navigation.ts';
import {routeWithSqueezeWorld} from '../src/breach-squeeze-route.ts';
const cases=[[12,'intel'],[23,'rescue'],[14,'hold'],[25,'capture']];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const r=n=>Math.round(n*100)/100;
const report=[];
for(const [seed,mission] of cases){
 const site=generateSite(seed,'small',undefined,{mission,enableIncidentIntent:true});
 const choices=['FRONT',...availableDeployments(newSession(0,seed,
  'floor-plan','small',mission,site,{enableCivilians:true}))
  .filter(e=>e.kind!=='window'&&e.id!=='FRONT').slice(0,1).map(e=>e.id)];
 activateSite(null);
 for(const entry of choices){
  const s=newSession(0,seed,'floor-plan','small',mission,site,
   {enableCivilians:true});
  try{
   if(entry!=='FRONT')selectDeployment(s,entry);
   const leader=team(s)[0],point=s.scenario.objective,
    world=sessionWorldGeometry(s),person=s.civilians.find(c=>c.rescueTarget);
   const candidates=[];
   for(const radius of [0,10,16,24,30,34,35]){
    const count=radius?16:1;
    for(let i=0;i<count;i++){
     const angle=Math.PI*2*i/count;
     const at={x:point.x+Math.cos(angle)*radius,
       y:point.y+Math.sin(angle)*radius};
     const knownCanStand=intelPassable(at,s.intel,OPERATOR_RADIUS);
     const worldCanStand=world.passable(at,OPERATOR_RADIUS);
     const liveBodyStand=bodyClear(at,s.doors,OPERATOR_RADIUS,world);
     const contact=dist(at,point)<=36&&
       sweptBodyClear(at,point,s.doors,4,world);
     // Run A* only for exact small set of test positions. A closed door
     // creates legitimate denial here until the player opens that door.
     const worldRoute=liveBodyStand?routeWithSqueezeWorld(
       leader.p,at,s.doors,world):[];
     const admitted=planMove(s,leader.id,at);
     if(admitted)leader.plan=[]; // no sim step; avoid stacking attempts
     candidates.push({angleIndex:i,radius,knownCanStand,
      worldCanStand,liveBodyStand,contact,
      routeFound:worldRoute.length>0,
      admitted});
    }
   }
   // Geometry-only sensitivity analysis: deliberately NOT a live door
   // command, not an assertion that every hinge can physically swing this
   // far, and never mutate the real Session's door state. This separates
   // an architectural objective isolation from a closed-leaf limitation.
   const hypotheticalOpenDoors=s.doors.map(d=>({
    ...d,open:true,locked:false,jammed:false,wedged:false,
    openFraction:d.kind==='shutter'?1:d.kind==='sliding'?1:1.12
   }));
   const hypotheticalOpenRoute=routeWithSqueezeWorld(
     leader.p,point,hypotheticalOpenDoors,world);
   const hypotheticalOpenNearby=candidates.filter(x=>x.contact&&x.liveBodyStand)
     .slice(0,12).length;
   const doors=[...s.doors].map(d=>({
    id:d.id,locked:d.locked,open:d.open,
    fraction:d.openFraction,center:doorCenter(d),
    fromStart:r(dist(leader.p,doorCenter(d))),
    fromObjective:r(dist(point,doorCenter(d)))
   })).sort((a,b)=>a.fromObjective-b.fromObjective).slice(0,7);
   report.push({seed,mission,entry,objective:point,start:leader.p,
    civilian:person?{state:person.state,p:person.p}:null,
    hypotheticalAllDoorsOpen:{
      // Upper-bound geometry comparison, not an instruction to open everything.
      routeToExactObjective:hypotheticalOpenRoute.length>0,
      routeNodes:hypotheticalOpenRoute.length,
      nearbyContactSites:hypotheticalOpenNearby
    },
    closestDoor:doors,
    candidates:{total:candidates.length,
     knownCanStand:candidates.filter(c=>c.knownCanStand).length,
     bodyStand:candidates.filter(c=>c.liveBodyStand).length,
     physicalContact:candidates.filter(c=>c.contact).length,
     worldRoute:candidates.filter(c=>c.routeFound).length,
     admitted:candidates.filter(c=>c.admitted).length,
     actionable:candidates.filter(c=>c.liveBodyStand&&c.contact&&
       c.routeFound&&c.admitted).length,
     admittedButNoPhysicalRoute:candidates.filter(c=>c.admitted&&
       !c.routeFound).length},
    nearSolutions:candidates.filter(c=>c.admitted||
      c.contact&&c.liveBodyStand).slice(0,24),
    failureSample:candidates.filter(c=>!c.admitted).slice(0,9)});
  }finally{activateSite(null);}
 }
}
console.log(JSON.stringify({schema:'EQA3.2/landing-truth-v1',
 methodology:'real initial generated world and known-blueprint move admission; initial closed doors are never opened; no player/AI simulation, no hindsight target disclosure assertion',
 rows:report},null,2));
