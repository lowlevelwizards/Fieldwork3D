import test from 'node:test';
import assert from 'node:assert/strict';
import {kickDoor,PUSHED_OPEN_LIMIT,doorWouldStrikeActors} from '../src/breach-door.ts';
import {createDoorOrderHandler} from '../src/breach-order-door.ts';
import {newSession,team} from '../src/breach-game.ts';
import {doorRangeSite,prepareDoorRangeCase} from '../src/breach-door-test-cases.ts';
import {activateSite,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {doorLeafSegment,doorCenter} from '../src/breach-core.ts';

const door=()=>({id:'ENTRY',a:{x:290,y:260},b:{x:332,y:260},
 kind:'hinged',hinge:'a',swing:-1,open:true,openFraction:.44,
 pushTarget:1,angularVelocity:0,kicks:0,latchIntegrity:1.05});
const face=(d,push=true)=>{
 const center=doorCenter(d);
 const leaf=doorLeafSegment({...d,openFraction:.62});
 const cross=(p)=>(d.b.x-d.a.x)*(p.y-center.y)-
   (d.b.y-d.a.y)*(p.x-center.x);
 const leafSide=Math.sign(cross(leaf.b));
 return {x:center.x,y:center.y+(push?-1:1)*leafSide*24};
};
test('an ajar hinged door accepts a deliberate physical kick from its push face',()=>{
 const d=door();
 const result=kickDoor(d,face(d));
 assert.equal(result.pushSide,true);
 assert.equal(result.opened,true);
 assert.equal(d.open,true);
 assert.equal(d.pushTarget,PUSHED_OPEN_LIMIT);
 assert.ok(d.angularVelocity>=9);
 assert.equal(d.openFraction,.44,
  'impulse only requests real hinge advance, not a swept collision bypass');
});
test('a kick on the pull side cannot reverse the hinge through a person',()=>{
 const d=door();
 const result=kickDoor(d,face(d,false));
 assert.equal(result.pushSide,false);
 assert.equal(result.opened,false);
 assert.equal(d.pushTarget,1);
 assert.equal(d.angularVelocity,0);
});
test('locked closed door still needs repeat latch impacts',()=>{
 const d={...door(),open:false,openFraction:0,locked:true};
 const outcome=kickDoor(d,face(d));
 assert.equal(outcome.pushSide,true);
 assert.equal(outcome.opened,true);
 assert.equal(d.open,true);
 assert.equal(d.locked,false);
});
test('a wedged leaf remains unkickable and unchanged',()=>{
 const d={...door(),wedged:true};
 assert.equal(kickDoor(d,face(d)).opened,false);
 assert.equal(d.openFraction,.44);
});

test('Q5 live: ajar panel kick impacts a real defender behind the leaf',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('ajar-outward'),{enableCivilians:false});
 try{
  prepareDoorRangeCase(s,'ajar-outward');
  const d=s.doors[0],attacker=team(s)[0],defender=team(s)[1];
  const fromFraction=d.openFraction;
  const finishFraction=Math.min(PUSHED_OPEN_LIMIT,Math.max(.60,fromFraction+.42));
  const hitLeaf=doorLeafSegment({...d,openFraction:finishFraction-.07});
  defender.side='red';
  defender.p={x:hitLeaf.a.x+(hitLeaf.b.x-hitLeaf.a.x)*.84,
   y:hitLeaf.a.y+(hitLeaf.b.y-hitLeaf.a.y)*.84};
  defender.priorP={...defender.p};
  assert.equal(doorWouldStrikeActors({...d,openFraction:fromFraction},
   finishFraction,[defender.p],OPERATOR_RADIUS+1),true,
   'defender must physically occupy the kick sweep');
  attacker.p=face(d);attacker.priorP={...attacker.p};
  attacker.actionTimer=0;
  const n={id:903,kind:'door',method:'kick',doorId:d.id,p:{...attacker.p}};
  attacker.plan=[n];
  const sideEffects=[];
  const handler=createDoorOrderHandler({
   approach:()=>false,advanceTraversal:()=>false,
   notify:(_s,message)=>sideEffects.push(message),
   hear:()=>{},battleEvent:(_s,kind,_actor,_point,text)=>sideEffects.push(text),
   inSight:()=>false,liveVisibility:()=>false,
   pairedLeaves:(_s,leaf)=>[leaf],movePhysicalProp:()=>false,
   beginReload:()=>false
  });
  s.seconds=1;
  assert.equal(handler(s,attacker,n,.44),true);
  assert.ok(d.pushTarget>=1.55,'kick drives the real wide hinge target');
  assert.ok((defender.doorStunUntil??0)>s.seconds,
   'contact causes a bounded defensive stun');
  assert.ok(sideEffects.some(x=>x.includes('STRUCK BY DOOR')));
 }finally{activateSite(null);}
});
