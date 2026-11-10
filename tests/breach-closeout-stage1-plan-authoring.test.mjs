import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {
 newSession,team,planSync,planMoveStroke,planWaitAt,
 undoPlan,redoPlan,backOne,deletePlanNode,clearPlan,
 setStartPace,posture,toggleContactRule,setFirePolicy,
 retargetActiveWatch,removeActiveWatch,toggling,planFlash,
 planMove,planPieAt
} from '../src/breach-game.ts';
import {validKnownPieArc} from '../src/breach-plan-authoring.ts';
const empty={
 seed:6110,name:'CLOSEOUT COMMANDS',layout:'corridor',
 training:true,rooms:[],roomCount:0,doors:[],cover:[],walls:[],
 windows:[],entrance:{x:120,y:120},
 spawn:[{x:120,y:120},{x:120,y:180},{x:120,y:240},{x:120,y:300}],
 enemies:[],objective:{x:300,y:120},extract:{x:300,y:120},
 bounds:{minX:0,minY:0,maxX:400,maxY:400}
};
const session=(extra={},mode='full-view')=>
 newSession(0,undefined,mode,'standard','hold',{...empty,...extra});
const plans=s=>team(s).map(a=>structuredClone(a.plan));
const ordered=fn=>{try{return fn();}finally{activateSite(null);}};
test('Stage 1: no-op base commands do not record history or burn IDs',()=>ordered(()=>{
 const s=session(),a=team(s)[0],id=s.nextId;
 assert.equal(setStartPace(s,a.id,a.pace),false);
 assert.equal(setFirePolicy(s,a.id,a.firePolicy),false);
 assert.equal(a.history.undo.length,0);
 assert.equal(s.nextId,id);
 assert.equal(undoPlan(s,a.id),false);
}));
test('Stage 1: HERE stance, pace, fire rule and contact mode have complete undo/redo',()=>ordered(()=>{
 const s=session(),a=team(s)[0],before={
  pace:a.pace,posture:a.posture,firePolicy:a.firePolicy,
  halt:a.haltOnContact
 };
 assert.ok(setStartPace(s,a.id,'run'));
 assert.ok(posture(s,a.id));
 assert.ok(setFirePolicy(s,a.id,'hold'));
 assert.ok(toggleContactRule(s,a.id));
 assert.equal(a.history.undo.length,4);
 for(let i=0;i<4;i++)assert.ok(undoPlan(s,a.id));
 assert.equal(a.pace,before.pace);
 assert.equal(a.posture,before.posture);
 assert.equal(a.firePolicy,before.firePolicy);
 assert.equal(a.haltOnContact,before.halt);
 for(let i=0;i<4;i++)assert.ok(redoPlan(s,a.id));
 assert.equal(a.pace,'run');
 assert.equal(a.posture,'crouch');
 assert.equal(a.firePolicy,'hold');
 assert.equal(a.haltOnContact,!before.halt);
}));
test('Stage 1: active WATCH retarget/release is undoable and never rebuilds navigation',()=>ordered(()=>{
 const s=session(),a=team(s)[0];
 const old={x:270,y:125},next={x:285,y:160};
 a.aimInstruction={mode:'track',point:{...old}};
 a.activeNode=9;
 assert.ok(retargetActiveWatch(s,a.id,next));
 assert.equal(a.activeNode,9);
 assert.deepEqual(a.aimInstruction.point,next);
 assert.ok(undoPlan(s,a.id));
 assert.deepEqual(a.aimInstruction.point,old);
 assert.equal(a.activeNode,9);
 assert.ok(redoPlan(s,a.id));
 assert.deepEqual(a.aimInstruction.point,next);
 assert.ok(removeActiveWatch(s,a.id));
 assert.equal(a.aimInstruction,null);
 assert.ok(undoPlan(s,a.id));
 assert.deepEqual(a.aimInstruction.point,next);
}));
test('Stage 1: SYNC is one team command and one shared undo/redo',()=>ordered(()=>{
 const s=session(),a=team(s),before=plans(s),ids=a.map(o=>o.id);
 assert.ok(planSync(s,ids));
 assert.equal(new Set(a.map(o=>o.plan[0]?.syncCode)).size,1);
 assert.ok(a.every(o=>o.plan.length===1&&o.history.undo.length===1));
 const after=plans(s);
 assert.ok(undoPlan(s,a[2].id));
 assert.deepEqual(plans(s),before);
 assert.ok(redoPlan(s,a[0].id));
 assert.deepEqual(plans(s),after);
}));
test('Stage 1: BACK, DELETE and CLEAR unlink peers as one undoable command',()=>ordered(()=>{
 for(const operation of ['back','delete','clear']){
  const s=session(),a=team(s);
  assert.ok(planSync(s,[a[0].id,a[1].id]));
  const syncId=a[0].plan[0].id;
  if(operation==='back')assert.ok(backOne(s,a[0].id));
  else if(operation==='delete')assert.ok(deletePlanNode(s,a[0].id,syncId));
  else assert.ok(clearPlan(s,a[0].id));
  assert.equal(a[0].plan.length,0);
  assert.equal(a[1].plan.length,0,'peer must not wait on an orphan SYNC');
  assert.ok(undoPlan(s,a[1].id),'undo from either actor restores both');
  assert.equal(a[0].plan.length,1);
  assert.equal(a[1].plan.length,1);
  assert.ok(redoPlan(s,a[0].id));
  assert.equal(a[0].plan.length,0);
  assert.equal(a[1].plan.length,0);
 }
}));
test('Stage 1: HERE redraw clears a coordinated SYNC and undo restores it',()=>ordered(()=>{
 const s=session(),a=team(s);
 assert.ok(planSync(s,[a[0].id,a[1].id]));
 const original=plans(s);
 assert.ok(planMoveStroke(s,a[0].id,[{x:150,y:120},{x:187,y:134}],
   false,true));
 assert.equal(a[1].plan.length,0);
 assert.ok(a[0].plan.every(n=>n.kind==='move'));
 assert.ok(undoPlan(s,a[0].id));
 assert.deepEqual(plans(s),original);
}));
test('Stage 1: execution closes the old editing timeline',()=>ordered(()=>{
 const s=session(),a=team(s)[0];
 assert.ok(planWaitAt(s,a.id,1));
 toggling(s);
 assert.equal(s.phase,'running');
 toggling(s);
 assert.equal(s.phase,'planning');
 assert.equal(undoPlan(s,a.id),false,
  'cannot resurrect orders already handed to the simulation');
 assert.equal(a.history.undo.length,0);
}));
test('Stage 1: PIE preview depends on known structures, not hidden world walls',()=>ordered(()=>{
 const wall={a:{x:130,y:100},b:{x:165,y:100}};
 const s=session({walls:[wall]},'true-blind');
 const a=team(s)[0];
 s.intel.walls.clear();
 const origin={x:140,y:120},pivot={x:185,y:120};
 const hidden=validKnownPieArc(s,origin,pivot,'cw');
 assert.ok(hidden.length>0,'unknown wall cannot veto a speculative PIE');
 s.intel.walls.add(0);
 assert.equal(validKnownPieArc(s,origin,pivot,'cw').length,0,
   'discovered obstacle constrains the identical planning preview');
}));
test('Stage 1: hidden walls cannot veto a flash target or forecast route',()=>ordered(()=>{
 const wall={a:{x:175,y:75},b:{x:175,y:210}};
 const s=session({walls:[wall]},'true-blind');
 const a=team(s)[0],p={x:220,y:120};
 s.intel.walls.clear();
 assert.ok(planMove(s,a.id,p));
 const original=structuredClone(a.path);
 assert.ok(planFlash(s,a.id,{x:270,y:120}));
 assert.deepEqual(a.path,original,
  'flash should not alter the existing predicted movement path');
 assert.equal(s.intel.walls.size,0);
}));
