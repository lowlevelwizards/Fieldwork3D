import test from 'node:test';
import assert from 'node:assert/strict';
import {traversalKind,traversalDuration,probeObstacleCrossing,
 canClimbWindow,windowCrossingKind,probeWindowCrossing,
 traversalStepClear,sampleTraversal,crossingInterval}
 from '../src/breach-mantle.ts';

const obstacle=(fixture,x=100,y=120,w=20,h=14)=>({
 fixture,x,y,w,h,low:true
});
const from={x:55,y:120},destination={x:145,y:120};
const world=(cover,extra={})=>({
 cover,walls:[],doors:[],actors:[],...extra
});
test('height classes keep low surfaces distinct from structural obstacles',()=>{
 assert.equal(traversalKind(obstacle('pallet')),'step');
 assert.equal(traversalKind(obstacle('crate')),'vault');
 assert.equal(traversalKind(obstacle('half-wall')),'vault');
 assert.equal(traversalKind(obstacle('fence')),'mantle');
 assert.equal(traversalKind(obstacle('fridge')),null);
 assert.equal(traversalKind(obstacle('window-sill')),null);
});
test('one short obstacle yields real approach, landing, height and duration',()=>{
 const crate=obstacle('crate');
 const opportunity=probeObstacleCrossing(from,destination,world([crate]));
 assert.ok(opportunity);
 assert.equal(opportunity.kind,'vault');
 assert.equal(opportunity.obstacleIndex,0);
 assert.ok(opportunity.approach.x<crate.x-crate.w/2);
 assert.ok(opportunity.landing.x>crate.x+crate.w/2);
 assert.ok(opportunity.duration>.5&&opportunity.duration<1);
 assert.ok(opportunity.lift>opportunity.height);
 const half=sampleTraversal(opportunity,opportunity.duration*.5);
 const end=sampleTraversal(opportunity,opportunity.duration);
 assert.ok(half.elevation>0);
 assert.ok(half.p.x>opportunity.approach.x);
 assert.deepEqual(end.p,opportunity.landing);
 assert.equal(end.elevation,0);
 assert.equal(end.done,true);
});
test('walls, door leaves, other obstacles, occupied landings block a crossing',()=>{
 const crate=obstacle('crate');
 assert.equal(probeObstacleCrossing(from,destination,
  world([crate],{walls:[{a:{x:111,y:85},b:{x:111,y:165}}]})),null);
 assert.equal(probeObstacleCrossing(from,destination,
  world([crate],{doors:[{id:'D',a:{x:112,y:100},
     b:{x:112,y:140},open:false,openedAt:-1}]})),null);
 assert.equal(probeObstacleCrossing(from,destination,
  world([crate,obstacle('fridge',121,120,14,14)])),null);
 const viable=probeObstacleCrossing(from,destination,world([crate]));
 assert.ok(viable);
 assert.equal(probeObstacleCrossing(from,destination,
  world([crate],{actors:[viable.landing]})),null);
});
test('never cross multiple obstacles, overly broad cover, or a dead-end',()=>{
 assert.equal(probeObstacleCrossing(from,destination,
  world([obstacle('crate',90),obstacle('crate',113)])),null);
 assert.equal(probeObstacleCrossing(from,destination,
  world([obstacle('crate',100,120,65,14)])),null);
 assert.equal(probeObstacleCrossing(from,destination,
  world([obstacle('crate')],{canStand:p=>p.x<110})),null);
 assert.equal(crossingInterval({x:100,y:120},destination,
  obstacle('crate')),null);
});
test('running slightly quickens simple vaults; injuries and load slow them',()=>{
 assert.ok(traversalDuration('vault',{pace:'run'})<
  traversalDuration('vault',{pace:'walk'}));
 assert.ok(traversalDuration('mantle',{injury:2,loadFactor:1.4})>
  traversalDuration('mantle',{}));
 assert.equal(probeObstacleCrossing(from,destination,
  world([obstacle('crate')]),{injury:3}),null);
});
test('windows require open or broken, sufficiently large, non-barred openings',()=>{
 const open={id:'W',x:100,y:120,width:40,vertical:false,
  open:true,shattered:false,operable:true,integrity:2,
  sillHeight:14,headHeight:38,treatment:'none'};
 assert.equal(canClimbWindow(open),true);
 assert.equal(windowCrossingKind(open),'climb-window');
 assert.equal(canClimbWindow({...open,open:false}),false);
 assert.equal(canClimbWindow({...open,treatment:'bars'}),false);
 assert.equal(canClimbWindow({...open,treatment:'boarded'}),false);
 assert.equal(canClimbWindow({...open,width:20}),false);
 assert.equal(canClimbWindow({...open,sillHeight:35}),false);
});

test('open window climbs exempt only their matching sill, never walls or barred glass',()=>{
 const open={id:'W0',x:100,y:120,width:42,vertical:true,
   open:true,shattered:false,operable:true,integrity:2,
   sillHeight:14,headHeight:38,treatment:'none'};
 const sill=obstacle('window-sill',100,120,10,42);
 const from={x:55,y:120},to={x:145,y:120};
 const world={cover:[sill],walls:[],doors:[],windows:[open],
   canStand:p=>Math.abs(p.x-100)>sill.w/2+8};
 const op=probeWindowCrossing(from,to,world);
 assert.ok(op);
 assert.equal(op.kind,'climb-window');
 assert.equal(op.windowId,'W0');
 assert.equal(traversalStepClear(op.approach,op.landing,op,world),true);
 assert.equal(probeWindowCrossing(from,to,
   {...world,windows:[{...open,open:false}]}),null);
 assert.equal(traversalStepClear(op.approach,op.landing,op,
   {...world,windows:[{...open,open:false}]}),false);
 assert.equal(probeWindowCrossing(from,to,
   {...world,windows:[{...open,treatment:'bars'}]}),null);
 assert.equal(probeWindowCrossing(from,to,
   {...world,walls:[{a:{x:101,y:85},b:{x:101,y:155}}]}),null);
 const angled=probeWindowCrossing(from,{x:145,y:150},world);
 assert.ok(angled,'a reasonable angled approach should use the opening');
 assert.equal(angled.approach.y,open.y);
 assert.equal(angled.landing.y,open.y);
 assert.equal(probeWindowCrossing(from,{x:145,y:210},world),null,
   'a route crossing well beyond the aperture must not become a wall shortcut');
});
