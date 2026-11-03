import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,stepSession,toggling} from '../src/breach-game.ts';
import {activateSite,doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
import {PUSHED_OPEN_LIMIT} from '../src/breach-door.ts';

const door={id:'PUSH',a:{x:290,y:260},b:{x:332,y:260},
  hinge:'a',swing:-1,open:true,openedAt:0,kind:'hinged'};
const site={
 seed:31,name:'PHYSICAL CONTACT',layout:'corridor',training:true,
 rooms:[],roomCount:0,walls:[],doors:[door],cover:[],windows:[],
 entrance:{x:310,y:260},enemies:[],
 spawn:[{x:310,y:200},{x:380,y:180},{x:400,y:200},{x:420,y:220}],
 objective:{x:480,y:460},extract:{x:490,y:470},
 bounds:{minX:0,minY:0,maxX:650,maxY:540}
};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('real movement motor pushes a partially obstructing hinged leaf out of its way',()=>{
 const session=newSession(0,undefined,'full-view','standard','hold',site);
 const actor=team(session)[0],hinge=session.doors[0];
 const leaf=doorLeafSegment(hinge);
 const middle={x:(leaf.a.x+leaf.b.x)/2,y:(leaf.a.y+leaf.b.y)/2};
 const length=dist(leaf.a,leaf.b);
 const tangent={x:-(leaf.b.y-leaf.a.y)/length,
   y:(leaf.b.x-leaf.a.x)/length};
 const future=doorLeafSegment({...hinge,openFraction:1.09});
 const point=(sign,offset)=>({x:middle.x+tangent.x*sign*offset,
   y:middle.y+tangent.y*sign*offset});
 const a=point(1,14),b=point(-1,14);
 const side=(pointToSegment(a,future)-pointToSegment(a,leaf))>
   (pointToSegment(b,future)-pointToSegment(b,leaf))?1:-1;
 const start=point(side,14),goal=point(-side,20);
 actor.p={...start};actor.priorP={...start};
 try{
   assert.ok(planMove(session,actor.id,goal),'must authorize physical crossing');
   toggling(session);
   let highest=hinge.openFraction??1;
   for(let tick=0;tick<700;tick++){
     stepSession(session,1/30);
     highest=Math.max(highest,hinge.openFraction??1);
     if(actor.plan.length===0&&dist(actor.p,goal)<10)break;
   }
   assert.ok(highest>1.35,
     'actual body contact did not move door beyond prior 112 degree limit; state='+
      JSON.stringify({highest,at:actor.p,goal,blocked:actor.lastBlocker,
        remaining:actor.plan.length}));
   assert.ok(highest<=PUSHED_OPEN_LIMIT);
   assert.equal(actor.plan.length,0,
     'operator must complete the authored route without a special PUSH order');
   assert.ok(dist(actor.p,goal)<20,
     'operator failed to physically clear pushed leaf');
 }finally{activateSite(null);}
});
