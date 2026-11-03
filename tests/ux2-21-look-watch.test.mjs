import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,planWatch,planLook,
  stepSession,toggling,setStartPace,undoPlan} from '../src/breach-game.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';

const point={x:355,y:516};
const context={door:false,node:true,nodeKind:'move',flashRemaining:2,
  posture:'stand',pace:'walk',firePolicy:'engage',reserve:24,magazine:12};

test('UX2-21: only LOOK, WATCH and WAIT are ordinary attention orders',()=>{
 const actions=contextActionChoices(context);
 assert.deepEqual(actions.filter(a=>a.group==='primary').map(a=>a.id),
  ['ctxLook','ctxWatch','ctxWait']);
 assert.deepEqual(actions.filter(a=>a.group==='advanced').map(a=>a.id),
  ['ctxFlash','ctxSuppress']);
 for(const obsolete of ['ctxPie','ctxStrafe','ctxStrafeMove','ctxFocus'])
  assert.ok(!actions.some(a=>a.id===obsolete));
});
test('UX2-21: LOOK is a one-off facing instruction, not persistent aiming',()=>{
 const s=newSession(),a=team(s)[0];
 assert.ok(planMove(s,'rook',{x:302,y:491}));
 const id=a.plan[0].id;
 assert.ok(planLook(s,'rook',{x:355,y:491},id));
 assert.equal(a.plan[0].aimMode,'free');
 assert.equal(a.plan[0].aimLabel,'look');
 assert.ok(Number.isFinite(a.plan[0].facing));
});
test('UX2-21: WATCH is tracked world point, not an authored strafe segment',()=>{
 const s=newSession(),a=team(s)[0];
 assert.ok(planMove(s,'rook',{x:302,y:491}));
 assert.ok(planWatch(s,'rook',point,a.plan[0].id));
 assert.equal(a.plan[0].aimMode,'track');
 assert.deepEqual(a.plan[0].aimPoint,point);
 assert.equal(a.plan[0].aimLabel,'watch');
 assert.notEqual(a.plan[0].moveMode,'strafe');
});
test('WATCH is replaced by LOOK without a separate RELEASE control; undo restores it',()=>{
 const s=newSession(),a=team(s)[0];
 assert.ok(planMove(s,'rook',{x:302,y:491}));
 const id=a.plan[0].id;
 assert.ok(planWatch(s,'rook',point,id));
 assert.ok(planLook(s,'rook',{x:345,y:485},id));
 assert.equal(a.plan[0].aimMode,'free');
 assert.equal(a.plan[0].aimLabel,'look');
 assert.equal(a.plan[0].aimPoint,undefined);
 assert.ok(undoPlan(s,'rook'));
 assert.equal(a.plan[0].aimMode,'track');
 assert.deepEqual(a.plan[0].aimPoint,point);
 assert.ok(!contextActionChoices({...context,watchActive:true})
   .some(c=>c.id==='ctxReleaseWatch'));
});
test('RUN terminates sustained WATCH instead of resuming it later',()=>{
 const s=newSession(),a=team(s)[0];
 assert.ok(planWatch(s,'rook',point,undefined,'here'));
 assert.ok(planMove(s,'rook',{x:302,y:491}));
 assert.ok(setStartPace(s,'rook','run'));
 toggling(s);
 for(let i=0;i<24;i++)stepSession(s,1/60);
 assert.equal(a.aimInstruction,null);
});
test('UX2-21: WATCH and LOOK are separate editable instructions',()=>{
 const s=newSession(),a=team(s)[0];
 assert.ok(planWatch(s,'rook',point,undefined,'here'));
 assert.ok(planLook(s,'rook',{x:300,y:491},a.plan[0].id));
 assert.equal(a.plan[0].aimMode,'free');
 assert.equal(a.plan[0].aimLabel,'look');
});

test('UX2-22: nearby door has an explicit contextual entry',()=>{
 const nearby=contextActionChoices({...context,nearDoor:true});
 assert.ok(nearby.some(a=>a.id==='ctxDoor'&&a.group==='primary'));
 assert.ok(nearby.some(a=>a.id==='ctxLook'));
 assert.ok(nearby.some(a=>a.id==='ctxWatch'));
 assert.ok(!contextActionChoices({...context,nearDoor:false})
   .some(a=>a.id==='ctxDoor'));
 assert.ok(!contextActionChoices({...context,nearDoor:true,door:true})
   .some(a=>a.id==='ctxDoor'));
});
