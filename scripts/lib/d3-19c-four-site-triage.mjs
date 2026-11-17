/** D3.19C: offline-only, strictly physical outcome triage for the four
 * under-reliable commercial entry archetypes. Reads an existing 45s R7
 * audit; never imports the game, creates movement or counts queue-drained
 * operators as physical arrivals.
 */
export const D319_FOCUS=Object.freeze(['retail','clinic','motel','garage']);
const focus=new Set(D319_FOCUS);
const order=['retail','clinic','motel','garage'];
function category(o){
 if(o.failedOrders>0||o.outcome==='cancelled')return 'terminal-cancellation';
 if(!o.arrived&&o.remainingOrders===0)return 'drained-unreached';
 if(o.arrived)return o.remainingOrders>0?'arrived-orders-pending':null;
 const kind=o.activeOrderDetails?.kind??o.activeOrder;
 if(kind==='sync'||kind==='wait')return 'queue-gate';
 if(kind==='door')return 'door-action';
 if(o.doorEpisode?.doorId)return 'threshold-maneuver';
 if(o.lastBlocker==='furniture')return 'furniture-obstruction';
 if(o.lastBlocker==='route')return 'route-unavailable';
 if(o.lastBlocker==='door')return 'door-obstruction';
 return 'movement-pending';
}
export function analyzeD319FourSiteFailures(audit){
 if(audit?.ticks!==2700||!Array.isArray(audit.rows)||
    audit.rows.length!==22)throw Error('D3.19C requires complete 22-site 45s real-motor evidence');
 const cases=[],counts={},bySite={};
 for(const row of audit.rows){
  if(!row||typeof row.seed!=='number'||!row.scale||
     !row.archetype||!Array.isArray(row.modes)||row.modes.length!==2)
   throw Error('D3.19C missing real map/mode evidence');
  if(!focus.has(row.archetype))continue;
  const variants=new Set(row.modes.map(m=>m.mode));
  if(variants.size!==2||!variants.has('authored')||!variants.has('entry'))
   throw Error('D3.19C requires authored and generated-entry');
  for(const m of row.modes){
   if(!Array.isArray(m.operators))throw Error('D3.19C requires physical operator details');
   if(m.accepted!==4){
    const fail={archetype:row.archetype,scale:row.scale,seed:row.seed,
     mode:m.mode,actor:null,category:'setup-rejected',
     accepted:m.accepted,reason:m.reason??null,
     rejectedDoors:m.rejectedDoors??[]};
    cases.push(fail);counts[fail.category]=(counts[fail.category]??0)+1;
   }
   for(const operator of m.operators){
    const label=category(operator);
    if(!label)continue;
    const related=operator.doorEpisode?.doorId??
      operator.activeOrderDetails?.doorId??
      operator.activeOrderDetails?.entryDoorId??null;
    const door=related?(m.endDoorStates??[]).find(d=>d.id===related):null;
    const fail={archetype:row.archetype,scale:row.scale,seed:row.seed,
     mode:m.mode,actor:operator.id,category:label,
     physicallyArrived:!!operator.arrived,
     outcome:operator.outcome??null,remaining:operator.remaining??null,
     failedOrders:operator.failedOrders??0,
     failureReason:operator.lastFailedOrder??null,
     remainingOrders:operator.remainingOrders??null,
     activeOrder:operator.activeOrderDetails??null,
     position:operator.position??null,goal:operator.goal??null,
     nextNav:operator.nextNav??null,lastBlocker:operator.lastBlocker??null,
     blockedSeconds:operator.blockedSeconds??0,
     waitSeconds:operator.waitSeconds??0,
     retries:operator.retries??0,episode:operator.doorEpisode??null,
     door:door??null};
    cases.push(fail);counts[label]=(counts[label]??0)+1;
   }
  }
 }
 cases.sort((a,b)=>order.indexOf(a.archetype)-order.indexOf(b.archetype)||
  a.seed-b.seed||a.mode.localeCompare(b.mode)||
  String(a.actor??'').localeCompare(String(b.actor??'')));
 for(const site of order){
  const matched=cases.filter(c=>c.archetype===site);
  bySite[site]={cases:matched.length,generated:matched.filter(c=>c.mode==='entry').length,
   authored:matched.filter(c=>c.mode==='authored').length};
 }
 return {corpus:audit.corpus??null,ticks:audit.ticks,
  intent:'offline diagnosis only; no changed goals or motor authority',
  targetArchetypes:[...D319_FOCUS],counts,bySite,cases};
}
