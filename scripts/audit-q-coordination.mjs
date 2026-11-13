/** Q2 diagnostic: show actual known-route crossing slots and live queue status. */
import {newSession,team,planMove,toggling,stepSession} from '../src/breach-game.ts';
import {planDoorSchedule} from '../src/breach-passage-plan.ts';
import {legalMoveRoute} from '../src/breach-known-route-authoring.ts';
import {activateSite} from '../src/breach-core.ts';
import {listenQueueDecision} from '../src/breach-queue-trace.ts';
const pt=(x,y)=>({x,y});
const site={seed:731,name:'Q2 independent route evidence',training:true,
 layout:'corridor',roomCount:0,rooms:[],cover:[],windows:[],
 walls:[{a:pt(90,260),b:pt(290,260)},{a:pt(332,260),b:pt(550,260)}],
 doors:[{id:'ENTRY',a:pt(290,260),b:pt(332,260),kind:'hinged',
  hinge:'a',swing:-1,open:true,openFraction:1}],
 entrance:pt(311,260),spawn:[pt(300,200),pt(308,173),
  pt(316,146),pt(325,119)],enemies:[],objective:pt(520,450),
 extract:pt(520,460),bounds:{minX:0,minY:0,maxX:640,maxY:500}};
const s=newSession(0,undefined,'full-view','standard','hold',site);
try{
 const members=team(s).slice(0,4);
 for(let i=0;i<4;i++)if(!planMove(s,members[i].id,pt(296+i*10,371+i*3)))
  throw Error('MOVE failed '+members[i].id);
 const schedule=planDoorSchedule(s.operators,s.doors,
   (a,b)=>legalMoveRoute(s,a,b));
 toggling(s);
 const checkpoints=[],events=[];
 listenQueueDecision(s,e=>{
  if(s.seconds>2.1&&s.seconds<2.8&&
     (e.actor==='ash'||e.actor==='vale')&&events.length<110)
   events.push(e);
 });
 for(let i=0;i<180;i++){
  stepSession(s,1/30);
  if(i%20===0)checkpoints.push({t:s.seconds,operators:members.map(a=>({
   id:a.id,p:a.p,pause:a.motorPause,order:a.plan[0]?.kind??null,
   slot:schedule.get(a.id)?.map(q=>({rank:q.rank,door:q.doorId,eta:q.eta}))
  }))});
 }
 console.log(JSON.stringify({kind:'Q2 independent schedule',slots:[...schedule],
  checkpoints,decisionSamples:events,events:s.events},null,2));
 listenQueueDecision(s,null);
}finally{activateSite(null);}
