/** D3.17B read-only route-writer timeline, with no impact on game physics. */
const round=n=>Math.round(n*100)/100;
export function traceD317RouteOwnership(mode,actor){
 const raw=mode?.routeTransitions?.events??[];
 const events=raw.filter(e=>e.actorId===actor).sort((a,b)=>a.seconds-b.seconds);
 const sources={},switches={},reversions={};
 for(const e of events)sources[e.source]=(sources[e.source]??0)+1;
 const ordered=[];
 for(let i=0;i<events.length;i++){
  const e=events[i],p=events[i-1],q=events[i-2];
  if(p&&e.source!==p.source){
   const key=p.source+' -> '+e.source;
   switches[key]=(switches[key]??0)+1;
  }
  if(q&&q.source===e.source&&p.source!==e.source){
   const key=e.source+' -> '+p.source+' -> '+e.source;
   reversions[key]=(reversions[key]??0)+1;
  }
  ordered.push({
   t:round(e.seconds),source:e.source,p:e.position,
   prior:e.prior?.slice(0,3),next:e.next?.slice(0,3),
   door:e.doorId,phase:e.doorPhase,
   maneuver:e.doorManeuver,blocked:round(e.blockedTime),
   reason:e.reason??null
  });
 }
 const rankedSwitches=Object.entries(switches).sort((a,b)=>b[1]-a[1]);
 const rankedReversions=Object.entries(reversions).sort((a,b)=>b[1]-a[1]);
 return {actor,totalEvents:events.length,sources,
  switches:Object.fromEntries(rankedSwitches),
  reversions:Object.fromEntries(rankedReversions),
  fullEvents:ordered,
  cappedWitness:events.length>=600
 };
}
