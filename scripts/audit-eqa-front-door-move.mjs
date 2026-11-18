/** EQA1 diagnostic only: reproduce the exact physical unlocked FRONT-leaf stall.
 * Never changes orders, actors or door geometry. */
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planMove,planMoveStroke,stepSession}
 from '../src/breach-game.ts';
import {doorCenter,doorLeafSegment,pointToSegment,activateSite}
 from '../src/breach-core.ts';
import {crossesDoorThreshold,doorReachable}
 from '../src/breach-door.ts';
const xy=p=>p?{x:+p.x.toFixed(2),y:+p.y.toFixed(2)}:null;
const cross=(a,b,door)=>!!(a&&b&&crossesDoorThreshold(a,b,door));
const side=(p,d)=>{
 const dx=d.b.x-d.a.x,dy=d.b.y-d.a.y,length=Math.hypot(dx,dy)||1;
 return +((p.x-d.a.x)*(-dy/length)+(p.y-d.a.y)*(dx/length)).toFixed(2);
};
const rows=[];
try {
 for(const [seed,mission] of [[20,'capture'],[26,'clear']]){
  const site=generateSite(seed,'small',undefined,{mission});
  const s=newSession(0,seed,'floor-plan','small',mission,site);
  const accepted=[];
  for(const a of team(s).slice(0,2)){
   const direct=planMoveStroke(s,a.id,[site.entrance,site.objective],false,true);
   const ok=direct||planMove(s,a.id,site.entrance);
   accepted.push({id:a.id,ok,direct,goal:xy(a.plan[0]?.p)});
  }
  s.phase='running';s.started=true;
  const windows=[];
  let first=null,last=null,frontBlockedFrames=0;
  for(let tick=0;tick<360;tick++){
   stepSession(s,1/30);
   for(const a of team(s).slice(0,2)){
    const door=s.doors.find(d=>d.id==='FRONT');
    if(!door||a.blockedTime<.35||a.lastBlocker!=='door')continue;
    frontBlockedFrames++;
    const next=a.nav[0],following=a.nav[1],goal=a.plan[0]?.p;
    const row={tick,time:+s.seconds.toFixed(2),id:a.id,
      blocked:+a.blockedTime.toFixed(2),at:xy(a.p),next:xy(next),
      following:xy(following),goal:xy(goal),
      frame:{a:xy(door.a),b:xy(door.b),center:xy(doorCenter(door))},
      open:door.open,fraction:door.openFraction,locked:door.locked,
      nearLeaf:+pointToSegment(a.p,doorLeafSegment(door)).toFixed(2),
      reachable:doorReachable(a.p,door),sideAt:side(a.p,door),
      sideNext:next?side(next,door):null,sideGoal:goal?side(goal,door):null,
      crossingNext:cross(a.p,next,door),
      crossingSecond:cross(next,following,door),
      crossingGoal:cross(a.p,goal,door),
      orderKind:a.plan[0]?.kind,doorTraversal:a.doorTraversal?.doorId??null,
      retryRouteAt:a.retryRouteAt,repairs:a.recoveryAttempts};
    if(!first)first=row;last=row;
    if(tick%45===0&&windows.length<9)windows.push(row);
   }
  }
  rows.push({seed,mission,accepted,frontBlockedFrames,first,last,windows});
  activateSite(null);
 }
} finally { activateSite(null); }
console.log('EQA_FRONT_DOOR',JSON.stringify(rows,null,2));
