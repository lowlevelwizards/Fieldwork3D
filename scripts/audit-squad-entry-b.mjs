/** Squad Entry B22: actual four-person entry diagnostic, not a renderer mock.
 * Unlike Squad Flow A's intentionally compressed authored-goal stress case,
 * the entry planner assigns legal distinct destinations. Track both the
 * approach and the actual settled positions before making traffic changes.
 * Node --experimental-strip-types scripts/audit-squad-entry-b.mjs
 */
import {newSession,team,planSquadEntry,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {doorSwingBlocked,doorClear} from '../src/breach-door.ts';
import {angleDifference} from '../src/breach-plan.ts';
import {entryClearanceForLook} from '../src/breach-entry-coordination.ts';

const pt=(x,y)=>({x,y});
const dist=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
const configs=[
 {name:'clear-opening',cover:[]},
 {name:'near-jamb-furniture',cover:[{x:322,y:295,w:18,h:22}],expectBlocked:true},
 {name:'far-interior-furniture',cover:[{x:306,y:351,w:24,h:23}]}
];
const fixture=c=>({
 seed:31045,name:'ENTRY B22 '+c.name,layout:'corridor',
 training:true,rooms:[],roomCount:0,
 walls:[{a:pt(90,260),b:pt(290,260)},
        {a:pt(332,260),b:pt(550,260)}],
 doors:[{id:'ENTRY',a:pt(290,260),b:pt(332,260),kind:'hinged',
   hinge:'a',swing:-1,open:false,openedAt:-1}],
 cover:c.cover,windows:[],entrance:pt(311,260),
 spawn:[pt(300,200),pt(308,173),pt(316,146),pt(325,119)],
 enemies:[],objective:pt(520,450),extract:pt(520,460),
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
});
function audit(c){
 const s=newSession(0,undefined,'full-view','standard','hold',fixture(c));
 try{
  const actors=team(s);
  if(!planSquadEntry(s,'ENTRY'))throw Error(c.name+' entry preflight rejected');
  const goals=actors.map(a=>a.plan.find(n=>n.entryDoorId==='ENTRY'));
  const legalGap=Math.min(...goals.flatMap((a,i)=>goals.slice(i+1).map(b=>
   dist(a.p,b.p))));
  const initial=actors.map(a=>a.plan.map(n=>n.id));
  const crossed=actors.map(()=>null),finished=actors.map(()=>null);
  const firstLook=actors.map(()=>null),minGoalGap=Infinity;
  const proximity={approach:0,threshold:0,interior:0,arrival:0};
  let minActorGap=Infinity,maxBlocked=0,lastClose=null;
  toggling(s);
  for(let tick=0;tick<1500;tick++){
   stepSession(s,1/30);
   for(let i=0;i<4;i++){
    const a=actors[i],goal=goals[i];
    if(crossed[i]===null&&a.p.y>276)crossed[i]=s.seconds;
    if(finished[i]===null&&!a.plan.length)
     finished[i]=s.seconds;
    maxBlocked=Math.max(maxBlocked,a.blockedTime);
    if(firstLook[i]===null&&a.plan[0]?.id===goal.id&&
       entryClearanceForLook(s.doors[0],a.p,goal.p)&&
       Math.abs(angleDifference(a.heading,goal.facing))<.4)
      firstLook[i]=s.seconds;
    for(let j=i+1;j<4;j++){
     const b=actors[j];
     const sep=dist(a.p,b.p);
     minActorGap=Math.min(minActorGap,sep);
     if(sep>=14)continue;
     const mid=(a.p.y+b.p.y)/2;
     const zone=mid<242?'approach':mid<286?'threshold':
       [a,b].some((op,k)=>dist(op.p,goals[k===0?i:j].p)<24)?
       'arrival':'interior';
     proximity[zone]++;
     lastClose={at:s.seconds,ids:[a.id,b.id],sep:Math.round(sep*100)/100,zone};
    }
   }
   if(finished.every(x=>x!==null))break;
  }
  const mins=actors.map((a,i)=>({
   id:a.id,p:a.p,goal:goals[i].p,
   distanceToAuthored:Math.round(dist(a.p,goals[i].p)*100)/100,
   remaining:a.plan.length,aim:a.aimInstruction?.mode
  }));
  const actualDoor=s.doors.find(d=>d.id==='ENTRY');
  const physicallyBlocked=!!actualDoor&&doorSwingBlocked(actualDoor,
   Math.min(1,(actualDoor.openFraction??0)+.07),[]);
  return {name:c.name,expectBlocked:!!c.expectBlocked,
   door:{open:actualDoor?.open,fraction:actualDoor?.openFraction,
    physicallyBlocked,passable:actualDoor?doorClear(actualDoor):false},
   legalGoalGap:Math.round(legalGap*100)/100,
   crossed,finished,firstLook,proximity,
   minActorGap:Math.round(minActorGap*100)/100,
   maxBlockedSeconds:Math.round(maxBlocked*100)/100,lastClose,
   preservedOrders:actors.every((a,i)=>
    a.plan.every(n=>initial[i].includes(n.id))),
   final:mins};
 }finally{activateSite(null);}
}
const results=configs.map(audit);
console.log(JSON.stringify({kind:'generated four-person entry clearance',
 note:'Separate from the intentional ~10-unit overlapping goal stress fixture. Not a phone animation audit.',
 results},null,2));
if(results.some(r=>r.legalGoalGap<23||!r.preservedOrders||
 (r.expectBlocked?
  (!r.door.open||!r.door.physicallyBlocked||r.door.passable||
   r.crossed.some(t=>t!==null)||r.final.some(x=>x.remaining===0)):
  (r.crossed.some(t=>t===null)||r.finished.some(t=>t===null)||
   r.final.some(x=>x.remaining!==0||x.distanceToAuthored>18)||
   r.maxBlockedSeconds>8)))){
 console.error('Generated entry physical acceptance failed');
 process.exitCode=1;
}
