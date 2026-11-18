import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,planMoveStroke,planWatch,undoPlan,redoPlan}
 from '../src/breach-game.ts';
import {activateSite,OPERATOR_RADIUS} from '../src/breach-core.ts';
import {intelPassable} from '../src/breach-intel.ts';
const scene={
 seed:2323,name:'D3.23 FULL BODY DRAG LANDING',training:true,layout:'corridor',
 rooms:[],roomCount:0,doors:[],cover:[],windows:[],
 walls:[{a:{x:180,y:75},b:{x:180,y:200}}],
 entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:115,y:215},{x:135,y:240},{x:145,y:265}],
 enemies:[],objective:{x:300,y:120},extract:{x:300,y:120},
 bounds:{minX:0,minY:0,maxX:400,maxY:320}
};
const make=(intel='full-view')=>
 newSession(0,undefined,intel,'standard','hold',scene);
const snapshot=actor=>JSON.parse(JSON.stringify(actor.plan));

test('D3.23 dragged wall cutoff parks actual full-body clearance, not only squeeze clearance',()=>{
 const s=make();
 try{
  const a=team(s)[0],out={clipped:false,endpoint:{x:0,y:0}};
  assert.ok(planMoveStroke(s,a.id,[{x:150,y:120},{x:250,y:120}],
   false,true,out),'a safe prefix must remain executable');
  assert.equal(out.clipped,true);
  assert.ok(out.endpoint.x>150&&out.endpoint.x<178,
   'clipping stays near original drawn wall approach');
  assert.ok(intelPassable(out.endpoint,s.intel,OPERATOR_RADIUS),
   'the final MOVE node must have known whole-operator clearance');
  assert.deepEqual(a.plan.at(-1).p,out.endpoint);
  assert.ok(a.plan.some(n=>n.kind==='move'&&n.p.x===150),
   'intermediate user-authored path points remain intact');
 }finally{activateSite(null);}
});

test('D3.23 HERE keeps WATCH and retains one atomic undo for a clipped final GO',()=>{
 const s=make();
 try{
  const a=team(s)[0],aim={x:240,y:75};
  assert.ok(planWatch(s,a.id,aim,undefined,'here'));
  assert.ok(planMove(s,a.id,{x:145,y:145}));
  const before=snapshot(a),watchId=a.plan[0].id;
  const out={clipped:false,endpoint:{x:0,y:0}};
  assert.ok(planMoveStroke(s,a.id,[{x:145,y:120},{x:240,y:120}],
   false,true,out));
  assert.equal(out.clipped,true);
  assert.ok(intelPassable(out.endpoint,s.intel,OPERATOR_RADIUS));
  assert.equal(a.plan[0].id,watchId);
  assert.deepEqual(a.plan[0].aimPoint,aim);
  const after=snapshot(a);
  assert.ok(undoPlan(s,a.id));
  assert.deepEqual(snapshot(a),before);
  assert.ok(redoPlan(s,a.id));
  assert.deepEqual(snapshot(a),after);
 }finally{activateSite(null);}
});

test('D3.23 hidden world wall is not used to leak an unseen obstruction',()=>{
 const s=make('true-blind');
 try{
  s.intel.walls.clear();
  const a=team(s)[0],out={clipped:false,endpoint:{x:0,y:0}};
  assert.ok(planMoveStroke(s,a.id,[{x:150,y:120},{x:230,y:120}],
   false,true,out));
  assert.equal(out.clipped,false);
  assert.deepEqual(out.endpoint,{x:230,y:120});
  assert.equal(s.intel.walls.size,0,'no world-truth intel pollution');
 }finally{activateSite(null);}
});

test('D3.23 rejected empty drag preserves previous route, ID and WATCH state',()=>{
 const s=make();
 try{
  const a=team(s)[0],aim={x:230,y:70};
  assert.ok(planWatch(s,a.id,aim,undefined,'here'));
  assert.ok(planMove(s,a.id,{x:145,y:145}));
  const before=snapshot(a),id=s.nextId;
  assert.equal(planMoveStroke(s,a.id,[{...a.p}],false,true),false);
  assert.deepEqual(snapshot(a),before);
  assert.equal(s.nextId,id);
 }finally{activateSite(null);}
});
