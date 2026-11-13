import test from 'node:test';
import assert from 'node:assert/strict';
import {kickDoor,PUSHED_OPEN_LIMIT} from '../src/breach-door.ts';
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
