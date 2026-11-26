import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,planWatch,planLook,
  stepSession,toggling,setStartPace,undoPlan,redoPlan,planAim} from '../src/breach-game.ts';
import {plannedAimHandle} from '../src/breach-plan.ts';
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

test('EI8 repeated HERE commands replace rather than queue attention; undo restores mode and target',()=>{
 const s=newSession(),a=team(s)[0],first={x:a.p.x+75,y:a.p.y+20},second={x:a.p.x+30,y:a.p.y-45};
 assert.ok(planWatch(s,a.id,first,undefined,'here'));
 const id=a.plan[0].id;
 assert.ok(planAim(s,a.id,'free',second,undefined,'look','here'));
 assert.equal(a.plan.length,1);assert.equal(a.plan[0].id,id);
 const handle=plannedAimHandle(a.plan[0]);
 assert.ok(Math.hypot(handle.x-second.x,handle.y-second.y)<1e-8);
 assert.equal(a.plan[0].aimPoint,undefined);
 assert.ok(undoPlan(s,a.id));assert.equal(a.plan[0].aimMode,'track');
 assert.deepEqual(plannedAimHandle(a.plan[0]),first);
 assert.ok(redoPlan(s,a.id));assert.equal(a.plan[0].aimMode,'free');
 assert.ok(planWatch(s,a.id,first,undefined,'here'));
 assert.equal(a.plan.length,1);assert.equal(a.plan[0].lookDistance,undefined);
});
test('EI8 implicit end and explicit waypoint retarget preserve node identity and route',()=>{
 const s=newSession(),a=team(s)[0];
 assert.ok(planMove(s,a.id,{x:302,y:491}));
 const id=a.plan[0].id,origin={...a.plan[0].p};
 assert.ok(planWatch(s,a.id,{x:355,y:516}));
 assert.equal(a.plan.length,1);assert.equal(a.plan[0].id,id);
 assert.ok(planLook(s,a.id,{x:350,y:480},id));
 assert.ok(planLook(s,a.id,{x:365,y:520},id));
 const handle=plannedAimHandle(a.plan[0]);
 assert.ok(Math.hypot(handle.x-365,handle.y-520)<1e-8);
 assert.deepEqual(a.plan[0].p,origin);assert.equal(a.plan[0].aimMode,'free');
 assert.equal(a.plan.length,1);assert.ok(undoPlan(s,a.id));
 const prior=plannedAimHandle(a.plan[0]);assert.ok(Math.hypot(prior.x-350,prior.y-480)<1e-8);
});
