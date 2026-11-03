import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,stepSession,toggling}
 from '../src/breach-game.ts';
import {activateSite,doorLeafSegment,pointToSegment,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
const door={id:'LEAF-TRAP',a:{x:290,y:260},b:{x:332,y:260},
  open:true,hinge:'a',swing:-1,kind:'hinged',openedAt:0};
const site={
 seed:808,name:'EMBEDDED LEAF RECOVERY',layout:'test',
 rooms:[],roomCount:0,training:true,doors:[door],walls:[],cover:[],
 windows:[],enemies:[],entrance:{x:280,y:180},
 spawn:[{x:310,y:210},{x:420,y:140},{x:450,y:170},{x:475,y:190}],
 objective:{x:500,y:420},extract:{x:490,y:440},
 bounds:{minX:0,minY:0,maxX:650,maxY:540},
};
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('real motor: an operator starting embedded in an open leaf exits instead of sliding inside',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 const actor=team(s)[0],leaf=s.doors[0];
 const segment=doorLeafSegment(leaf);
 const start={x:(segment.a.x+segment.b.x)/2,
   y:(segment.a.y+segment.b.y)/2};
 // Set the goal along the leaf, beyond its latch-end rather than on
 // the wrong side. Straight motion initially tries to travel *inside* it.
 const vx=segment.b.x-segment.a.x,vy=segment.b.y-segment.a.y;
 const length=Math.hypot(vx,vy);
 const goal={x:start.x+vx/length*44,y:start.y+vy/length*44};
 actor.p={...start};actor.priorP={...start};
 try{
   assert.ok(planMove(s,actor.id,goal),'failed to author recovery route');
   toggling(s);
   let firstStep=null;
   let foundFree=false;
   for(let i=0;i<950;i++){
     stepSession(s,1/30);
     const clearance=pointToSegment(actor.p,doorLeafSegment(leaf));
     if(!firstStep&&gap(actor.p,start)>.15)
       firstStep={at:{...actor.p},clearance};
     if(clearance>=OPERATOR_RADIUS+1){
       foundFree=true;
       if(!actor.plan.length&&gap(actor.p,goal)<20)break;
     }
   }
   assert.ok(firstStep,'operator never attempted physical recovery');
   assert.ok(firstStep.clearance>.04,
     'operator slid tangentially inside door leaf: '+JSON.stringify(firstStep));
   assert.ok(foundFree,'operator never escaped its physical overlap');
   assert.equal(actor.plan.length,0,
     'authored order did not complete after overlap recovery; state='+
       JSON.stringify({at:actor.p,goal,blocker:actor.lastBlocker,
         nav:actor.nav.length,blockedTime:actor.blockedTime}));
   assert.ok(gap(actor.p,goal)<20,'operator did not reach its destination');
 }finally{activateSite(null);}
});
