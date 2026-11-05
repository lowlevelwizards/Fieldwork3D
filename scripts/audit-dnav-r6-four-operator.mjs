/** R6: bounded four-operator real-motor passage audit, not a renderer mock.
 * Uses three hinge states and the same authentic authoring/go flow as play.
 * Captures validity, crossing order, waiting time and tactical plan integrity.
 */
import {newSession,team,planMove,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const cases=[
 {label:'hinge-a-closed',hinge:'a',swing:-1,open:false},
 {label:'hinge-b-closed',hinge:'b',swing:1,open:false},
 {label:'hinge-a-open',hinge:'a',swing:-1,open:true}
];
const results=[];
for(const fixture of cases){
 const door={id:'R6-THRESHOLD',a:{x:290,y:260},b:{x:332,y:260},
  kind:'hinged',openedAt:fixture.open?0:-1,hinge:fixture.hinge,
  swing:fixture.swing,open:fixture.open};
 const site={
  seed:731,name:'R6 FOUR OPERATOR PASSAGE',layout:'corridor',training:true,
  rooms:[],roomCount:0,walls:[
   {a:{x:90,y:260},b:{x:290,y:260}},
   {a:{x:332,y:260},b:{x:550,y:260}}
  ],doors:[door],cover:[],entrance:{x:310,y:260},
  spawn:[{x:300,y:200},{x:308,y:173},{x:316,y:146},{x:325,y:119}],
  enemies:[],windows:[],objective:{x:520,y:450},extract:{x:520,y:460},
  bounds:{minX:0,minY:0,maxX:640,maxY:500}
 };
 try{
  const s=newSession(0,undefined,'full-view','standard','hold',site);
  const squad=team(s).slice(0,4);
  if(squad.length!==4)throw Error('missing four operators');
  const goals=squad.map((_,i)=>({x:296+i*10,y:371+i*3}));
  const initial=squad.map(x=>({...x.p}));
  const authored=[];
  for(let i=0;i<4;i++){
   if(!planMove(s,squad[i].id,goals[i]))
    throw Error('rejected move '+squad[i].id);
   authored.push(squad[i].plan.map(n=>n.id));
  }
  const crossed=Array(4).fill(null),arrived=Array(4).fill(null);
  const waits=[0,0,0,0],maxBlocked=[0,0,0,0];
  let invalid=0;
  toggling(s);
  for(let tick=0;tick<1080;tick++){
   stepSession(s,1/30);
   for(let i=0;i<4;i++){
    const actor=squad[i];
    if(!Number.isFinite(actor.p.x)||!Number.isFinite(actor.p.y))invalid++;
    if(actor.motorPause==='passage')waits[i]++;
    maxBlocked[i]=Math.max(maxBlocked[i],actor.blockedTime||0);
    if(crossed[i]===null&&actor.p.y>278)crossed[i]=s.seconds;
    if(arrived[i]===null&&Math.hypot(actor.p.x-goals[i].x,
      actor.p.y-goals[i].y)<16)arrived[i]=s.seconds;
   }
   if(arrived.every(x=>x!==null))break;
  }
  const planIntact=squad.every((actor,i)=>actor.plan.every(n=>authored[i].includes(n.id)));
  const travel=squad.map((actor,i)=>Math.round(Math.hypot(
   actor.p.x-initial[i].x,actor.p.y-initial[i].y)));
  results.push({label:fixture.label,crossed,arrived,travel,
   passageWaitFrames:waits,maxBlockedSeconds:maxBlocked.map(x=>+x.toFixed(2)),
   invalid,planIntact});
 }finally{activateSite(null);}
}
console.log(JSON.stringify({mode:'DNav R6 actual four-body motor stress',
 trials:results.length,results},null,2));
if(results.some(r=>r.invalid||!r.planIntact||
 r.crossed.some(t=>t===null)||r.maxBlockedSeconds.some(t=>t>8)))
 process.exitCode=1;
