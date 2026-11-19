import test from 'node:test';
import assert from 'node:assert/strict';
import {civilianPose} from '../src/breach-civilian-pose.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {createCivilianRig,updateCivilianRig,disposeCivilianRig}
 from '../src/breach-civilian-visuals.ts';

const civilian=()=>createCivilian({id:'civ:eqa3-9:animation',
 role:'visitor',persona:'startled',activity:'idle',
 position:{x:100,y:100},heading:0,roomId:'hall',appearanceSeed:17});
test('EQA3.9 panic uses leg gait; frozen/hiding use low head cover without changing behavior',()=>{
 const c=civilian();
 c.state='fleeing';c.velocity=66;
 assert.equal(civilianPose(c),'run');
 c.velocity=0;assert.equal(civilianPose(c),'startled');
 c.state='frozen';assert.equal(civilianPose(c),'hide');
 c.state='hiding';c.goal=null;assert.equal(civilianPose(c),'hide');
 c.state='compliant';assert.equal(civilianPose(c),'compliant');
});
test('EQA3.9 legacy rig hands visibly raise, protect head, and rewind deterministically',()=>{
 const c=civilian(),r=createCivilianRig(c);
 c.state='startled';updateCivilianRig(r,c,1);
 assert.ok(r.leftArm.rotation.z< -1.8);
 assert.ok(r.rightArm.rotation.z>1.8);
 c.state='fleeing';c.velocity=66;updateCivilianRig(r,c,2);
 assert.ok(r.leftArm.rotation.z< -1.8);
 assert.notEqual(r.leftLeg.rotation.x,0,'panic does not lose its running gait');
 c.state='frozen';c.velocity=0;updateCivilianRig(r,c,3);
 assert.ok(r.upper.position.y<0,'stationary fear lowers torso');
 assert.ok(r.leftArm.rotation.z< -1.8,'stationary fear protects head');
 c.state='routine';c.velocity=0;updateCivilianRig(r,c,1);
 assert.equal(r.upper.position.y,0,'rewinding to calm pose restores anatomy');
 assert.equal(r.leftArm.rotation.z,0);
});
test('EQA3.9 shared 3D operator skeleton carries civilian gestures, evidence gaze, and physical crouch',()=>{
 const c=civilian(),rig=createCivilianRig(c,true);
 try{
  c.state='routine';updateCivilianRig(rig,c,.2);
  const idle=rig.character.arms[0].hand.position.y;
  c.state='startled';updateCivilianRig(rig,c,.8);
  const raised=rig.character.arms[0].hand.position.y;
  assert.ok(raised>idle+2,'arm IK must visibly raise the actual hand '+idle+' '+raised);
  c.state='frozen';updateCivilianRig(rig,c,1.1);
  assert.equal(civilianPose(c),'hide');
  assert.ok(Number.isFinite(rig.character.chest.position.y));
  c.state='routine';c.lastEvidenceAt=1.1;c.threatEstimate={x:100,y:140};
  updateCivilianRig(rig,c,1.25);
  assert.ok(Math.abs(rig.character.head.rotation.y)>.05,
    'head follows an actual witnessed/sounded direction, not hidden enemy truth');
  c.threatEstimate=null;updateCivilianRig(rig,c,.5);
  assert.ok(Number.isFinite(rig.character.head.rotation.y),
    'rewound or forgotten threat does not corrupt shared rig');
 }finally{disposeCivilianRig(rig);}
});
