import test from 'node:test';
import assert from 'node:assert/strict';
import {selfBlockingHingeRelief} from '../src/breach-door-traversal-maneuver.ts';
import {doorWouldStrikeActors} from '../src/breach-door.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {doorLeafSegment,OPERATOR_RADIUS,pointToSegment} from '../src/breach-core.ts';
const p=(x,y)=>({x,y});
function fixture(){
 const door={id:'D6',a:p(394,354),b:p(394,318),
  open:true,openFraction:.372,angularVelocity:0,
  kind:'hinged',hinge:'a',swing:-1,locked:false,wedged:false,heldBy:null};
 const a={id:'vale',side:'blue',p:p(414.85,338.3),health:4,
  plan:[{id:1,kind:'move',p:p(442.14,462)}],nav:[p(304,336)]};
 const s={doors:[door],operators:[a],coverState:[],site:null,objectRevision:0};
 return {a,door,s};
}
test('D3.2 R2: self-obstructing D6 offers only an actual full-body swept step',()=>{
 const {a,door,s}=fixture();
 // Session world ownership in full generated runs is handled by the
 // same collision sweep as this test's injected empty world.
 const result=selfBlockingHingeRelief(a,s,a.plan[0].p);
 assert.ok(result,'the physical leaf must have a real clearance option');
 assert.ok(pointToSegment(result,doorLeafSegment(door))>
  pointToSegment(a.p,doorLeafSegment(door))+3);
 assert.equal(doorWouldStrikeActors(door,door.openFraction+.025,[result],OPERATOR_RADIUS),false);
 assert.ok(sweptBodyClear(a.p,result,s.doors,OPERATOR_RADIUS));
 assert.deepEqual(a.p,p(414.85,338.3),'helper never moves the actor');
 assert.deepEqual(a.nav,[p(304,336)],'helper never rewrites route or authored plans');
});
test('D3.2 R2: no relief when physically locked, moving or occupied',()=>{
 const {a,door,s}=fixture();
 door.locked=true;assert.equal(selfBlockingHingeRelief(a,s,a.plan[0].p),null);
 door.locked=false;door.angularVelocity=.45;
 assert.equal(selfBlockingHingeRelief(a,s,a.plan[0].p),null);
});
