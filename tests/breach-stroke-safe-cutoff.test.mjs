import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {intelPassable} from '../src/breach-intel.ts';
import {SQUEEZE_RADIUS} from '../src/breach-navigation.ts';
import {newSession,team,planWatch,planMove,planMoveStroke,undoPlan,redoPlan}
  from '../src/breach-game.ts';

const base={
 seed:2125,name:'SAFE STROKE CUTOFF',layout:'corridor',training:true,
 rooms:[],roomCount:0,doors:[],cover:[],walls:[],windows:[],
 entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:115,y:215},{x:135,y:240},{x:145,y:265}],
 enemies:[],objective:{x:300,y:120},extract:{x:300,y:120},
 bounds:{minX:0,minY:0,maxX:400,maxY:320}
};
const wall={a:{x:180,y:75},b:{x:180,y:200}};
const crate={x:185,y:120,w:30,h:28,fixture:'desk'};
const session=(extra={},intel='full-view')=>
 newSession(0,undefined,intel,'standard','hold',{...base,...extra});
const result=()=>({clipped:false,endpoint:{x:0,y:0}});
const plain=plan=>JSON.parse(JSON.stringify(plan));

test('wall contact clips at closest known safe point instead of rejecting the entire stroke',()=>{
 const s=session({walls:[wall]});
 try{
  const a=team(s)[0],out=result();
  assert.ok(planMoveStroke(s,a.id,[{x:150,y:120},{x:250,y:120}],
    false,true,out));
  assert.equal(out.clipped,true);
  assert.ok(out.endpoint.x>150&&out.endpoint.x<178,
    'stop on the approach side, near wall clearance');
  assert.ok(Math.abs(out.endpoint.y-120)<1);
  assert.ok(intelPassable(out.endpoint,s.intel,SQUEEZE_RADIUS));
  assert.ok(a.plan.some(n=>n.kind==='move'&&n.p.x===150));
  assert.deepEqual(a.plan.at(-1).p,out.endpoint);
 }finally{activateSite(null);}
});

test('furniture contact clips near front face, not through/around the obstacle',()=>{
 const s=session({cover:[crate]});
 try{
  const a=team(s)[0],out=result();
  assert.ok(planMoveStroke(s,a.id,[{x:145,y:120},{x:220,y:120}],
    false,true,out));
  assert.equal(out.clipped,true);
  assert.ok(out.endpoint.x>149&&out.endpoint.x<172,
    'the endpoint stays on the near side of the desk');
  assert.ok(intelPassable(out.endpoint,s.intel,SQUEEZE_RADIUS));
 }finally{activateSite(null);}
});

test('an unobstructed bent stroke preserves its final release position',()=>{
 const s=session({cover:[crate]});
 try{
  const a=team(s)[0],out=result();
  const points=[{x:141,y:160},{x:180,y:165},{x:230,y:165}];
  assert.ok(planMoveStroke(s,a.id,points,false,true,out));
  assert.equal(out.clipped,false);
  assert.deepEqual(out.endpoint,points.at(-1));
 }finally{activateSite(null);}
});

test('unseen obstacles do not trim a plan or leak knowledge',()=>{
 const s=session({walls:[wall],cover:[crate]},'true-blind');
 try{
  const a=team(s)[0],out=result();
  // Startup LOS may have preobserved the fixtures; simulate unseen intel.
  s.intel.walls.clear();s.intel.cover.clear();
  assert.equal(s.intel.walls.size,0);
  assert.equal(s.intel.cover.size,0);
  assert.ok(planMoveStroke(s,a.id,[{x:150,y:120},{x:230,y:120}],
    false,true,out));
  assert.equal(out.clipped,false);
  assert.equal(out.endpoint.x,230);
  assert.equal(s.intel.walls.size,0);
  assert.equal(s.intel.cover.size,0);
 }finally{activateSite(null);}
});

test('safe cutoff keeps the queued WATCH target and is one atomic undo edit',()=>{
 const s=session({walls:[wall]});
 try{
  const a=team(s)[0],aim={x:240,y:75};
  assert.ok(planWatch(s,a.id,aim,undefined,'here'));
  assert.ok(planMove(s,a.id,{x:145,y:145}));
  const before=plain(a.plan),watchId=a.plan[0].id,out=result();
  assert.ok(planMoveStroke(s,a.id,[{x:145,y:120},{x:240,y:120}],
    false,true,out));
  assert.equal(out.clipped,true);
  assert.equal(a.plan[0].id,watchId);
  assert.deepEqual(a.plan[0].aimPoint,aim);
  const shortened=plain(a.plan);
  assert.ok(undoPlan(s,a.id));
  assert.deepEqual(plain(a.plan),before);
  assert.ok(redoPlan(s,a.id));
  assert.deepEqual(plain(a.plan),shortened);
 }finally{activateSite(null);}
});

test('no meaningful safe portion keeps old route and does not consume IDs',()=>{
 const s=session({walls:[wall]});
 try{
  const a=team(s)[0];
  assert.ok(planMove(s,a.id,{x:140,y:140}));
  const before=plain(a.plan),nextId=s.nextId;
  assert.equal(planMoveStroke(s,a.id,[{...a.p}],false,true,result()),false);
  assert.deepEqual(plain(a.plan),before);
  assert.equal(s.nextId,nextId);
 }finally{activateSite(null);}
});
