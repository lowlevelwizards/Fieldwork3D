import test from 'node:test';
import assert from 'node:assert/strict';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {stepCivilianMovement} from '../src/breach-civilian-movement.ts';
import {chooseCivilianRefuge} from '../src/breach-civilian-refuge.ts';
const person=()=>createCivilian({id:'civ:r2:route',role:'resident',
 persona:'cautious',activity:'idle',position:{x:0,y:0},
 heading:0,roomId:'home',appearanceSeed:1});
test('R2-B2 bounded detour stays in fleeing state and checks each segment',()=>{
 const c=person();c.state='fleeing';c.goal={x:30,y:0};
 const clear=(a,b)=>!(Math.abs(a.y)<.01&&Math.abs(b.y)<.01);
 const detour=[{x:0,y:10},{x:30,y:10},{x:30,y:0}];
 stepCivilianMovement(c,1.4,1.3,clear,()=>false,()=>detour);
 assert.equal(c.state,'fleeing');
 assert.deepEqual(c.nav,detour);
 assert.deepEqual(c.p,{x:0,y:0});
 stepCivilianMovement(c,2.8,.1,clear,()=>false,()=>detour);
 assert.ok(c.p.y>0&&c.p.y<4,'motor advances a bounded physical step');
});
test('R2-B2 escorted civilian does not freeze permanently after blocked leg',()=>{
 const c=person();c.state='escorted';c.following='rook';
 c.goal={x:40,y:0};
 stepCivilianMovement(c,2,1.3,()=>false,()=>false);
 assert.equal(c.state,'escorted');
 assert.equal(c.following,'rook');
 assert.equal(c.goal,null);
});
test('R2-B2 refuge rejects occupied candidate without reading unseen threats',()=>{
 const c=person();c.threatEstimate={x:50,y:0};
 c.refugePoints=[{x:-40,y:0},{x:0,y:-40}];
 const picked=chooseCivilianRefuge(c,{canReach:()=>true,
  isCrowded:p=>p.x===-40});
 assert.ok(picked);
 assert.deepEqual(picked.goal,{x:0,y:-40});
});
