import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,enemies,planMove,planAim,undoPlan,backOne,
  toggling,stepSession} from '../src/breach-game.ts';
import {angleDifference,targetAngle} from '../src/breach-plan.ts';

const run=(s,seconds)=>{for(let i=0;i<seconds*60;i++)stepSession(s,1/60);};
const headingError=(a,heading)=>Math.abs(angleDifference(a.heading,heading));
const noThreats=s=>enemies(s).forEach(e=>e.health=0);

test('076: PIE is a persistent point-facing rule, never a circular movement path',()=>{
  const s=newSession(),a=team(s)[0];noThreats(s);
  const point={x:344,y:572};
  assert.ok(planAim(s,'rook','track',point,undefined,'pie'));
  assert.equal(a.plan.length,1);
  assert.equal(a.plan[0].kind,'look');
  assert.equal(a.plan[0].aimMode,'track');
  assert.deepEqual(a.plan[0].aimPoint,point);
  assert.equal(a.plan[0].arc,undefined,'PIE never generates a locomotion arc');
  assert.ok(planMove(s,'rook',{x:324,y:628}));
  assert.ok(planMove(s,'rook',{x:338,y:649}));
  toggling(s);run(s,.55);
  assert.ok(a.p.x>282,'soldier is moving along authored route');
  assert.equal(a.aimInstruction.mode,'track');
  assert.deepEqual(a.aimInstruction.point,point);
  assert.ok(headingError(a,targetAngle(a.p,point))<.19,
    'PIE continually recomputes facing from moving position');
  const before={...a.p};
  run(s,.45);
  assert.ok(Math.hypot(a.p.x-before.x,a.p.y-before.y)>5);
  assert.ok(headingError(a,targetAngle(a.p,point))<.2,
    'tracking continues after another motor tick');
});
test('076: STRAFE holds a world heading while walking forward/sideways/back',()=>{
  const s=newSession(),a=team(s)[0];noThreats(s);
  const facing={x:282,y:698}; // face SOUTH, while moving EAST.
  assert.ok(planAim(s,'rook','fixed',facing,undefined,'strafe'));
  assert.ok(planMove(s,'rook',{x:322,y:628}));
  assert.ok(planMove(s,'rook',{x:342,y:643}));
  toggling(s);run(s,.6);
  assert.ok(a.p.x>290,'translated east despite aiming south');
  assert.equal(a.aimInstruction.mode,'fixed');
  assert.ok(headingError(a,Math.PI/2)<.12,
    'fixed facing does not turn to movement tangent');
  const saved=a.aimInstruction.angle;
  run(s,.7);
  assert.ok(headingError(a,saved)<.12,
    'facing persists after intermediate waypoint transitions');
});
test('076: later LOOK cancels persistent PIE tracking and restores travel facing',()=>{
  const s=newSession(),a=team(s)[0];noThreats(s);
  assert.ok(planAim(s,'rook','track',{x:345,y:568},undefined,'pie'));
  assert.ok(planMove(s,'rook',{x:318,y:628}));
  assert.ok(planAim(s,'rook','free',{x:318,y:690},undefined,'look'));
  assert.ok(planMove(s,'rook',{x:340,y:646}));
  assert.equal(a.plan.filter(n=>n.kind==='look').length,2);
  toggling(s);run(s,2.5);
  assert.equal(a.aimInstruction,null,
    'LOOK cancels PIE tracking so later movement faces travel');
  assert.ok(a.p.x>318,'the soldier continued along the authored route');
});
test('076: aiming attached to a waypoint begins when reached and is undoable',()=>{
  const s=newSession(),a=team(s)[0];
  assert.ok(planMove(s,'rook',{x:316,y:629}));
  const nodeId=a.plan[0].id;
  assert.ok(planAim(s,'rook','track',{x:310,y:560},nodeId,'pie'));
  assert.equal(a.plan.length,1,'aim attaches to node without adding travel');
  assert.equal(a.plan[0].aimMode,'track');
  assert.ok(undoPlan(s,'rook'));
  assert.equal(a.plan[0].aimMode,undefined);
  assert.ok(planAim(s,'rook','fixed',{x:316,y:680},nodeId,'strafe'));
  assert.equal(a.plan[0].aimMode,'fixed');
  assert.equal(a.plan[0].aimLabel,'strafe');
  assert.ok(backOne(s,'rook'));
  assert.equal(a.plan.length,0);
});
test('076: user-visible UI has only contextual aiming, no obsolete buttons',()=>{
  const html=readFileSync(new URL('../breach.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  for(const id of ['rook','moss','back','play','moreOrders','contextTools'])
    assert.ok(html.includes('id="'+id+'"'));
  for(const id of ['pieLeft','pieRight','strafe','insert','delete','door','aim'])
    assert.ok(!html.includes('id="'+id+'"'),'old always-on control '+id);
  for(const word of ['ctxPie','ctxStrafe','ctxLook'])
    assert.ok(main.includes(word),'missing contextual '+word);
});

test('076: reverse movement is independent of the STRAFE heading',()=>{
  const s=newSession(),a=team(s)[0];noThreats(s);
  assert.ok(planAim(s,'rook','fixed',{x:282,y:695},undefined,'strafe'));
  assert.ok(planMove(s,'rook',{x:282,y:584}));
  toggling(s);run(s,1);
  assert.ok(a.p.y<620,'soldier moved north while facing south');
  assert.ok(headingError(a,Math.PI/2)<.15,
    'reverse travel does not flip the chosen world-space facing');
});
