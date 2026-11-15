import test from 'node:test';
import assert from 'node:assert/strict';
import {sweptRejoinExistingRoute,noteRepeatedDoorLeafEscape,
 takeRepeatedDoorEscapeRoute,finishDoorEscapeRejoin}
 from '../src/breach-door-escape-rejoin.ts';
import {initDoor} from '../src/breach-door.ts';
import {doorLeafSegment,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
const p=(x,y)=>({x,y});

test('D3.13G2 only drops blocked disposable prefix and retains authored goal',()=>{
 const from=p(0,0),goal=p(42,0);
 const nav=[p(12,0),p(20,14),goal];
 const original=structuredClone(nav);
 const route=sweptRejoinExistingRoute(from,goal,nav,
  (_from,to)=>to.x!==12);
 assert.deepEqual(route,[p(20,14),goal]);
 assert.deepEqual(nav,original,'disposable route input remains unchanged');
 assert.notEqual(route[0],nav[1],'new route owns copies');
});

test('D3.13G2 keeps ordinary, remote and non-goal routes unchanged',()=>{
 const from=p(0,0),goal=p(40,0),nav=[p(10,0),p(25,0),goal];
 assert.deepEqual(sweptRejoinExistingRoute(from,goal,nav,()=>true),[],
  'never skip an already traversable first node');
 assert.deepEqual(sweptRejoinExistingRoute(from,goal,nav,()=>false),[],
  'never evade an actually blocked full-width sweep');
 assert.deepEqual(sweptRejoinExistingRoute(from,goal,[p(12,0)],()=>true),[],
  'one-node path has no disposable prefix');
 assert.deepEqual(sweptRejoinExistingRoute(from,p(500,500),nav,
  ()=>true),[],'never truncate an order or transient other goal');
 const remote=[p(5,0),p(110,0),p(130,0)];
 assert.deepEqual(sweptRejoinExistingRoute(from,p(130,0),remote,
  (_,to)=>to.x!==5),[],'reject distant direct route leaps');
});

test('D3.13G2 actual open hinge refuses internal leaf motion, accepts only swept exit',()=>{
 const door=initDoor({id:'REJOIN',a:p(290,260),b:p(332,260),
   hinge:'a',swing:-1,kind:'hinged',open:true,openedAt:0},0);
 door.openFraction=1;door.angularVelocity=0;
 const leaf=doorLeafSegment(door),dx=leaf.b.x-leaf.a.x,
  dy=leaf.b.y-leaf.a.y,length=Math.hypot(dx,dy);
 const tangent=p(dx/length,dy/length),
  normal=p(-tangent.y,tangent.x);
 const from=p((leaf.a.x+leaf.b.x)/2,(leaf.a.y+leaf.b.y)/2);
 const stale=p(from.x+tangent.x*12,from.y+tangent.y*12);
 const stage=p(from.x+normal.x*25,from.y+normal.y*25);
 const goal=p(from.x+normal.x*48,from.y+normal.y*48);
 const sweep=(a,b)=>sweptBodyClear(a,b,[door],OPERATOR_RADIUS,
   {passable:()=>true});
 assert.equal(sweep(from,stale),false,
  'sliding through the solid leaf is prohibited');
 assert.equal(sweep(from,stage),true,
  'the candidate physically escapes the current leaf');
 const nav=[stale,stage,goal];
 const route=sweptRejoinExistingRoute(from,goal,nav,sweep);
 assert.deepEqual(route,[stage,goal]);
 assert.deepEqual(nav,[stale,stage,goal]);
 assert.ok(sweep(from,route[0]),'rejoined first step is actually safe');
});

test('D3.13G2B cold world-rejoin evidence requires repeated same-door physical escapes',()=>{
 const goal=p(140,100),nav=[p(105,100),p(122,116),goal];
 const actor={p:p(100,100),plan:[{kind:'move',id:91}]};
 noteRepeatedDoorLeafEscape(actor,1,goal,'FRONT',nav);
 assert.equal(takeRepeatedDoorEscapeRoute(actor,1.1,goal),null,
  'one overlap is not a repeated non-progress cycle');
 noteRepeatedDoorLeafEscape(actor,1.3,goal,'FRONT',nav);
 assert.equal(takeRepeatedDoorEscapeRoute(actor,1.31,goal),null);
 noteRepeatedDoorLeafEscape(actor,1.5,goal,'FRONT',nav);
 const captured=takeRepeatedDoorEscapeRoute(actor,1.5,goal);
 assert.deepEqual(captured,nav,'third true overlap exposes the original route');
 assert.notEqual(captured[0],nav[0],
  'the saved disposable route cannot be mutated by callers');
 assert.equal(takeRepeatedDoorEscapeRoute(actor,1.51,goal),null,
  'cannot cold-probe every motor tick');
 assert.deepEqual(takeRepeatedDoorEscapeRoute(actor,3.5,goal),nav,
  'a later repeat can be checked after the two-second budget');
 finishDoorEscapeRejoin(actor);
 assert.equal(takeRepeatedDoorEscapeRoute(actor,3.6,goal),null);
});

test('D3.13G2B changed authored goal or door invalidates prior escape evidence',()=>{
 const goal=p(140,100),nav=[p(105,100),p(120,120),goal];
 const actor={p:p(100,100),plan:[{kind:'move',id:91}]};
 for(const time of [1,1.2,1.4])
  noteRepeatedDoorLeafEscape(actor,time,goal,'FRONT',nav);
 assert.equal(takeRepeatedDoorEscapeRoute(actor,1.5,p(150,100)),null,
  'author edits revoke any previously stored route');
 for(const time of [2,2.2,2.4])
  noteRepeatedDoorLeafEscape(actor,time,goal,'FRONT',nav);
 actor.plan[0]={kind:'move',id:92};
 assert.equal(takeRepeatedDoorEscapeRoute(actor,2.5,goal),null,
  'another authored MOVE never inherits an old door route');
 for(const time of [3,3.2,3.4])
  noteRepeatedDoorLeafEscape(actor,time,goal,'FRONT',nav);
 noteRepeatedDoorLeafEscape(actor,3.6,goal,'SIDE',nav);
 assert.equal(takeRepeatedDoorEscapeRoute(actor,3.7,goal),null,
  'another door starts a new bounded episode');
});
