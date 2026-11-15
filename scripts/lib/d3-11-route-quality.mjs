/** D3.11A: offline-only observer. Zero imports from the live motor. Route
 * quality is measured from authoritative positions and disposable nav nodes,
 * never inferred from the proximity-to-final-goal metric alone.
 */
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const round=x=>Math.round(x*100)/100;
const routeKey=nav=>nav.map(p=>Math.round(p.x*10)+','+Math.round(p.y*10)).join(';');
const length=(from,nav)=>{
 let at=from,total=0;
 for(const p of nav){total+=distance(at,p);at=p;}
 return total;
};
export class D311RouteSurvey{
 constructor(actors,goals,{traceActor=null,traceEvery=30}={}){
  this.goals=goals;this.traceActor=traceActor;
  this.traceEvery=traceEvery;this.ticks=0;this.trace=[];
  this.records=new Map(actors.map(a=>[a.id,{
   prior:{...a.p},priorNav:routeKey(a.nav),priorNodes:a.nav.map(p=>({...p})),
   start:{...a.p},travel:0,net:0,routeSelections:0,
   waypointAdvances:0,unchangedRoutes:0,navLength:0,
   maxNavLength:0,navSamples:0,directionReversals:0,
   lastMotion:null,revisitedCells:0,visited:new Map(),
   segments:[],detourRatio:null,activeTicks:0
  }]));
 }
 sample(actors,seconds){
  this.ticks++;
  for(const a of actors){
   const r=this.records.get(a.id);if(!r)continue;
   const moved=distance(a.p,r.prior);
   r.travel+=moved;
   if(a.plan.length)r.activeTicks++;
   if(moved>.45){
    const dx=a.p.x-r.prior.x,dy=a.p.y-r.prior.y;
    if(r.lastMotion&&dx*r.lastMotion.x+dy*r.lastMotion.y<-.15)
     r.directionReversals++;
    r.lastMotion={x:dx,y:dy};
    // A conservative revisit, counted only after real displacement
    // beyond 24 units from the previous crossing of this spatial cell.
    const key=Math.round(a.p.x/12)+':'+Math.round(a.p.y/12);
    const previous=r.visited.get(key);
    if(previous&&r.travel-previous>24)r.revisitedCells++;
    r.visited.set(key,r.travel);
   }
   const key=routeKey(a.nav);
   if(key!==r.priorNav){
    const prior=r.priorNodes,current=a.nav;
    if(prior.length===current.length+1&&
       current.every((p,i)=>distance(p,prior[i+1])<.15)){
      r.waypointAdvances++;
    }else if(current.length){
      r.routeSelections++;
      if(r.segments.length<30)r.segments.push({
       t:round(seconds),p:{...a.p},navPoints:current.length,
       next:{...current[0]},remaining:round(length(a.p,current)),
       blocker:a.lastBlocker,goalKey:a.routeGoalKey});
    }
    r.priorNav=key;r.priorNodes=a.nav.map(p=>({...p}));
   }else if(a.nav.length)r.unchangedRoutes++;
   if(a.nav.length){r.navLength+=a.nav.length;r.navSamples++;
    r.maxNavLength=Math.max(r.maxNavLength,a.nav.length);}
   r.prior={...a.p};
   if(this.traceActor===a.id&&this.ticks%this.traceEvery===0){
    this.trace.push({t:round(seconds),p:{...a.p},
     goal:this.goals.get(a.id)??null,nav:a.nav.slice(0,5).map(p=>({...p})),
     order:a.plan[0]?.kind??null,velocity:round(a.velocity),
     blocker:a.lastBlocker,blocked:round(a.blockedTime),
     retries:a.recoveryAttempts,motorPause:a.motorPause,
     squeeze:a.squeeze,door:a.doorTraversal?.doorId??null});
   }
  }
 }
 finish(){
  return {
   actors:[...this.records].map(([id,r])=>{
    const goal=this.goals.get(id);
    const straight=goal?distance(r.start,goal):null;
    return {id,travel:round(r.travel),
     net:round(distance(r.start,r.prior)),
     directDistance:straight===null?null:round(straight),
     travelInflation:straight&&straight>1?round(r.travel/straight):null,
     routeSelections:r.routeSelections,waypointAdvances:r.waypointAdvances,
     directionReversals:r.directionReversals,revisitedCells:r.revisitedCells,
     avgNavPoints:r.navSamples?round(r.navLength/r.navSamples):0,
     maxNavPoints:r.maxNavLength,
     sampledActiveSeconds:round(r.activeTicks/60),
     selections:r.segments};
   }),
   ...(this.traceActor?{traceActor:this.traceActor,trace:this.trace}:{})
  };
 }
}
export function createD311GridObserver(){
 const samples=[];
 return {samples,observe:record=>samples.push(record),
  summary(){
   const count=samples.length;
   return {searches:count,
    expanded:samples.reduce((n,r)=>n+r.expanded,0),
    elapsedMs:round(samples.reduce((n,r)=>n+r.elapsedMs,0)),
    failures:samples.filter(r=>!r.found).length,
    expensive:samples.filter(r=>r.expanded>=1000).length,
    slowest:samples.slice().sort((a,b)=>b.elapsedMs-a.elapsedMs)
     .slice(0,10).map(r=>({...r,elapsedMs:round(r.elapsedMs)}))};
  }};
}
