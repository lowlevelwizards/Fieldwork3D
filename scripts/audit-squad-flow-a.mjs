/** Squad Flow A0: observational four-person real-session threshold audit.
 * No renderer mock, synthetic success or AI-position shortcuts. Diagnostic
 * thresholds are reported, not used to manufacture a passing gameplay claim.
 * Run: node --experimental-strip-types scripts/audit-squad-flow-a.mjs
 */
import {newSession,team,planMove,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const point=(x,y)=>({x,y});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const scenarios=[
 {name:'standard-open',left:290,right:332,open:true},
 {name:'standard-closed',left:290,right:332,open:false},
 {name:'narrow-open',left:292,right:330,open:true},
 {name:'paired-open',left:282,right:340,open:true,paired:true},
 {name:'near-jamb-cover',left:290,right:332,open:true,
  cover:[{x:350,y:294,w:20,h:20}]}
];
function makeSite(c){
 const middle=(c.left+c.right)/2;
 const door=(id,start,end,pairedWith)=>({
  id,a:point(start,260),b:point(end,260),
  kind:'hinged',hinge:'a',swing:-1,open:c.open,
  openedAt:c.open?0:-1,pairedWith
 });
 const doors=c.paired?[
  door('A',c.left,middle,'B'),door('B',middle,c.right,'A')
 ]:[door('ENTRY',c.left,c.right,undefined)];
 return {
  seed:731,name:'SQUAD FLOW A0 / '+c.name,layout:'corridor',
  training:true,rooms:[],roomCount:0,
  walls:[{a:point(90,260),b:point(c.left,260)},
   {a:point(c.right,260),b:point(550,260)}],
  doors,cover:c.cover??[],entrance:point(middle,260),
  spawn:[point(300,200),point(308,173),point(316,146),point(325,119)],
  enemies:[],windows:[],objective:point(520,450),
  extract:point(520,460),
  bounds:{minX:0,minY:0,maxX:640,maxY:500}
 };
}
function audit(c){
 const s=newSession(0,undefined,'full-view','standard','hold',makeSite(c));
 try{
  const actors=team(s).slice(0,4);
  if(actors.length!==4)throw Error('expected four operator slots');
  const goals=actors.map((_,i)=>point(296+i*10,371+i*3));
  const authored=actors.map((a,i)=>{
   if(!planMove(s,a.id,goals[i]))throw Error('MOVE rejected: '+a.id);
   return a.plan.map(n=>n.id);
  });
  const crossings=Array(4).fill(null),arrivals=Array(4).fill(null);
  const passageWaitTicks=Array(4).fill(0);
  const movementTicks=Array(4).fill(0);
  const maxBlocked=Array(4).fill(0);
  let finite=true,minFriendlyGap=Infinity;
  toggling(s);
  for(let tick=0;tick<1080;tick++){
   const previous=actors.map(a=>({...a.p}));
   stepSession(s,1/30);
   for(let i=0;i<4;i++){
    const a=actors[i];
    if(!Number.isFinite(a.p.x)||!Number.isFinite(a.p.y))finite=false;
    if(a.motorPause==='passage')passageWaitTicks[i]++;
    if(distance(previous[i],a.p)>.05)movementTicks[i]++;
    maxBlocked[i]=Math.max(maxBlocked[i],a.blockedTime);
    if(crossings[i]===null&&a.p.y>278)crossings[i]=s.seconds;
    if(arrivals[i]===null&&distance(a.p,goals[i])<16)
     arrivals[i]=s.seconds;
    for(let j=i+1;j<4;j++)
     minFriendlyGap=Math.min(minFriendlyGap,distance(a.p,actors[j].p));
   }
   if(arrivals.every(t=>t!==null))break;
  }
  const sorted=crossings.filter(t=>t!==null).sort((a,b)=>a-b);
  return {
   case:c.name,finite,
   crossed:crossings.every(t=>t!==null),
   arrived:arrivals.every(t=>t!==null),
   crossings,arrivals,
   consecutiveCrossingGaps:sorted.slice(1).map((t,i)=>+(t-sorted[i]).toFixed(3)),
   passageWaitSeconds:passageWaitTicks.map(t=>+(t/30).toFixed(3)),
   movementTicks,maxBlockedSeconds:maxBlocked.map(t=>+t.toFixed(3)),
   minFriendlyGap:+minFriendlyGap.toFixed(2),
   authoredOrderIdsPreserved:actors.every((a,i)=>
    a.plan.every(n=>authored[i].includes(n.id))),
   finalPositions:actors.map(a=>({id:a.id,p:a.p,remaining:a.plan.length}))
  };
 }finally{activateSite(null);}
}
const results=scenarios.map(audit);
console.log(JSON.stringify({kind:'four-person real-motor diagnostic',
 note:'Observation is not a real-device or frame-rate validation.',results},null,2));
if(results.some(r=>!r.finite||!r.authoredOrderIdsPreserved))
 process.exitCode=1;
