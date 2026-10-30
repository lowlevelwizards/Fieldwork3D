import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {newSession,team,planMoveStroke,undoPlan,stepSession,toggling} from '../src/breach-game.ts';
import {doorCenter,activateSite} from '../src/breach-core.ts';
import {initDoor,advanceDoor,doorClear,doorApproach,doorReachable,doorYaw,handlePoint} from '../src/breach-door.ts';
import {validateThrow} from '../src/breach-flash.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {twoBoneJoint} from '../src/breach-ik.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';

test('108: door hinge, handle, swing and clearance advance consistently',()=>{
  const base={id:'DOOR',a:{x:60,y:100},b:{x:120,y:100},open:false,openedAt:-1};
  const d=initDoor(base,0);
  assert.ok(handlePoint(d).x<120);
  assert.equal(doorClear(d),false);
  d.open=true;advanceDoor(d,.25);
  assert.ok(d.openFraction>0&&d.openFraction<1);
  assert.ok(Number.isFinite(doorYaw(d)));
  advanceDoor(d,.25);assert.equal(doorClear(d),true);
  assert.equal(d.openFraction,1);
});
test('107: interaction position can use handle-side space rather than door center',()=>{
  const s=newSession();
  const d=s.doors.find(d=>d.id==='FRONT');
  assert.ok(d);
  const center=doorCenter(d),handle=handlePoint(d);
  assert.ok(doorReachable({x:handle.x,y:handle.y+35},d));
  const stand=doorApproach({x:center.x,y:center.y+85},d);
  assert.ok(stand);
  assert.ok(doorReachable(stand,d));
  activateSite(null);
});
test('107: open doorway flash range permits additional setback',()=>{
  const s=newSession();
  const d=s.doors.find(d=>d.id==='FRONT');
  const opened=s.doors.map(d=>({...d,open:true}));
  const c=doorCenter(d);
  const path=validateThrow({x:c.x+43,y:c.y+90},
    {x:c.x-30,y:c.y-76},opened);
  assert.equal(path.valid,true);
  activateSite(null);
});
test('107: finger stroke crossing FRONT inserts normal OPEN node, single undo',()=>{
  const s=newSession();
  const a=team(s)[0];
  const before=a.plan.length;
  const ok=planMoveStroke(s,a.id,[{x:300,y:560},{x:300,y:457}]);
  assert.ok(ok);
  const auto=a.plan.find(n=>n.kind==='door'&&n.doorId==='FRONT');
  assert.ok(auto,'front door should be automatically opened');
  assert.equal(auto.method,'open');
  assert.ok(a.plan.some(n=>n.kind==='move'&&n.p.y<500));
  assert.ok(undoPlan(s,a.id));
  assert.equal(a.plan.length,before);
  activateSite(null);
});
test('109–112: physical rig has articulated box limbs, two grips and constrained knees',()=>{
  const rig=createOperatorRig('rook','blue');
  assert.equal(rig.feet.length,2);assert.equal(rig.arms.length,2);
  assert.ok(rig.root.children.length>=3);
  const solve=twoBoneJoint(new THREE.Vector3(0,13,0),
    new THREE.Vector3(6,1,2),7.5,7.4,new THREE.Vector3(1,0,0));
  assert.ok(Number.isFinite(solve.x)&&Number.isFinite(solve.y));
  const base={x:0,z:0,heading:0,velocity:55,seconds:0,stride:0,
    posture:'stand',injury:0,weapon:'carbine',reload:0,
    reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
    down:false,surrender:false,aiming:true,firing:false,turning:0};
  poseOperator(rig,base,1/60);
  const before=rig.feet.map(f=>f.anchor.clone());
  poseOperator(rig,{...base,x:1,seconds:.016,stride:1},.016);
  assert.ok(rig.feet.some((f,i)=>f.anchor.distanceTo(before[i])<.001));
  assert.ok(rig.arms.every(a=>Number.isFinite(a.hand.position.x)));
  rig.dispose();
});
test('110,113: gait and door interaction time survive replay seek',()=>{
  const s=newSession(0,888);
  const a=team(s)[0];
  a.stride=48;a.lastDoorAt=1.4;a.lastDoorId=s.doors[0].id;
  s.seconds=2;
  const m=new MissionRecorder();m.capture(s,true);
  const f=m.at(2);
  assert.ok(f);assert.equal(f.actors[0].stride,48);
  const back=newSession(0,888);
  applyReplayFrame(back,f);
  assert.equal(back.operators[0].stride,48);
  assert.equal(back.operators[0].lastDoorAt,1.4);
  activateSite(null);
});
test('109: lab is a bundled independent page with pose and view controls',()=>{
  const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
  const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
  const main=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/data-pose="walk"/);
  assert.match(html,/data-view="front"/);
  assert.match(vite,/operatorLab: 'operator-lab.html'/);
  assert.match(main,/href="\.\/operator-lab.html"/);
});
