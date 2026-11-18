/** D3.21D offline-only physical route feasibility at the EXACT 45s real
 * Garage motor endpoints. No motor stepping, order changes or fake arrivals.
 * Usage: node --experimental-strip-types scripts/report-d3-21-garage-reachability.mjs
 *        audit.json [report.json]
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS,pointToSegment,doorLeafSegment}
 from '../src/breach-core.ts';
import {bodyClear,SQUEEZE_RADIUS} from '../src/breach-navigation.ts';
import {intelPassable} from '../src/breach-intel.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {routeWithNormalWorld,routeWithSqueezeWorld,routeToNextOperableDoor}
 from '../src/breach-squeeze-route.ts';
const source=process.argv[2],destination=process.argv[3];
if(!source)throw Error('Expected 45s Garage real motor audit JSON');
const audit=JSON.parse(readFileSync(source,'utf8'));
const row=audit.rows?.[0],mode=row?.modes?.find(m=>m.mode==='authored');
if(audit.ticks!==2700||row?.seed!==19285501||
 row?.archetype!=='garage'||row?.scale!=='standard'||mode?.accepted!==4)
 throw Error('D3.21D requires unmodified 45s standard Garage authored fixture');
const site=generateSite(row.seed,'standard',undefined,{mission:'intel'},
 {archetype:'garage'});
const quiet={...site,training:true,enemies:[],encounter:undefined};
const s=newSession(0,row.seed,'full-view','standard','intel',quiet,
 {enableCivilians:false});
try{
 for(const d of mode.endDoorStates??[]){
  const door=s.doors.find(x=>x.id===d.id);
  if(!door)throw Error('Physical door missing: '+d.id);
  door.open=!!d.open;door.openFraction=d.fraction;
  door.angularVelocity=d.angularVelocity;door.pushTarget=d.pushTarget;
  door.locked=!!d.locked;door.jammed=!!d.jammed;door.wedged=!!d.wedged;
 }
 const world=sessionWorldGeometry(s);
 const noLock=s.doors.map(d=>({...d,locked:false,jammed:false,
  wedged:false}));
 const allOpen=s.doors.map(d=>({...d,open:true,openFraction:1.55,
  angularVelocity:0,pushTarget:1.55,locked:false,jammed:false,
  wedged:false,heldBy:null}));
 const report=[];
 for(const actor of mode.operators){
  if(actor.arrived||!actor.goal||!actor.position)continue;
  const from=actor.position,to=actor.goal;
  const routes={
   currentNormal:routeWithNormalWorld(from,to,s.doors,world),
   currentSqueeze:routeWithSqueezeWorld(from,to,s.doors,world),
   unlockedNormal:routeWithNormalWorld(from,to,noLock,world),
   allOpenNormal:routeWithNormalWorld(from,to,allOpen,world),
   allOpenSqueeze:routeWithSqueezeWorld(from,to,allOpen,world),
   firstOperablePortal:routeToNextOperableDoor(from,to,s.doors,world)
  };
  const nearest=[...s.doors].map(d=>({id:d.id,
   leafGap:pointToSegment(from,doorLeafSegment(d)),
   fraction:d.openFraction??0,locked:!!d.locked}))
   .sort((a,b)=>a.leafGap-b.leafGap).slice(0,4);
  report.push({actor:actor.id,from,to,remaining:actor.remaining,
   terminalCancellation:actor.lastFailedOrder?.reason??null,
   fromStandable:world.passable(from,OPERATOR_RADIUS)&&
    bodyClear(from,s.doors,OPERATOR_RADIUS,world),
   goalStandable:world.passable(to,OPERATOR_RADIUS)&&
    bodyClear(to,s.doors,OPERATOR_RADIUS,world),
   // Critical distinction: a KNOWN physically too-small authored endpoint
   // is a planning-contract problem; a hidden obstacle cannot be exposed
   // by the planner. Offline diagnostic never edits goals or player intel.
   goalWorldWallClear:world.passable(to,OPERATOR_RADIUS),
   goalCurrentDoorClear:bodyClear(to,s.doors,OPERATOR_RADIUS,world),
   goalAllOpenDoorClear:bodyClear(to,allOpen,OPERATOR_RADIUS,world),
   goalKnownIntelStanding:intelPassable(to,s.intel,OPERATOR_RADIUS),
   goalKnownIntelSqueeze:intelPassable(to,s.intel,SQUEEZE_RADIUS),
   routeNodes:Object.fromEntries(Object.entries(routes)
    .map(([key,path])=>[key,path.length])),
   routeFirst:Object.fromEntries(Object.entries(routes)
    .map(([key,path])=>[key,path.slice(0,2)])),nearest});
 }
 const result={seed:row.seed,scale:row.scale,seconds:audit.ticks/60,
  physicalArrivals:audit.summary.physicalArrivals,
  actualUnlockedDoorIds:s.doors.filter(d=>d.locked).map(d=>d.id),
  operators:report,
  notice:'counterfactual all-open is DIAGNOSTIC only, never a game command'};
 const txt=JSON.stringify(result,null,2)+'\n';
 if(destination)writeFileSync(destination,txt);
 else process.stdout.write(txt);
}finally{activateSite(null);}
