import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
import {LabMotionCache} from '../src/breach-lab-tracks.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const foot=(phase,contact,progress=0)=>({phase,contact,progress,
 position:{x:0,y:0},worldYaw:0,height:0});
const sample=(feet,travelYaw=0,velocity=40)=>bodyFromContacts({
 feet,travelYaw,heading:0,velocity,turning:0,injury:0,posture:'stand'});
test('126: pelvis follows planted support and receives landing compression',()=>{
 const l=sample([foot('planted',true),foot('swinging',false,.5)]);
 const r=sample([foot('swinging',false,.5),foot('planted',true)]);
 assert.ok(l.pelvisSide<0&&r.pelvisSide>0);
 const catchWeight=sample([foot('landing',true,.2),foot('planted',true)]);
 assert.ok(catchWeight.pelvisY<0);
 const unload=sample([foot('unloading',true,.4),foot('planted',true)]);
 assert.ok(unload.pelvisY>0);
});
test('126: forward lean, lateral lean and idle are distinct',()=>{
 const stance=[foot('planted',true),foot('planted',true)];
 const f=sample(stance,0),right=sample(stance,Math.PI/2),
 left=sample(stance,-Math.PI/2),rest=sample(stance,0,0);
 assert.ok(f.torsoForward<-.035);
 assert.ok(right.torsoSide>.025&&left.torsoSide<-.025);
 assert.ok(Math.abs(rest.torsoForward)<1e-9);
 assert.equal(rest.pelvisY,0);
});
test('126: body response uses replayable contacts, not render dt',()=>{
 const cache=new LabMotionCache('walk');
 const input=cache.sample(.764);
 const motion=()=>bodyFromContacts({feet:input.feet,
   heading:input.motion.heading,travelYaw:input.motion.travelYaw,
   velocity:input.motion.speed,turning:input.motion.turning,
   injury:0,posture:'stand'});
 assert.deepEqual(motion(),motion());
 for(const t of [2.2,3.4,.1,1.6])cache.sample(t);
 assert.deepEqual(motion(),motion());
});
test('126: body motion preserves anchored shoes during actual rig posing',()=>{
 const rig=createOperatorRig('rook','blue'),cache=new LabMotionCache('walk');
 const feet=cache.sample(.91);
 rig.root.position.set(feet.motion.x,0,feet.motion.z);
 poseOperator(rig,{x:feet.motion.x,z:feet.motion.z,heading:0,
   velocity:feet.motion.speed,seconds:.91,stride:3,posture:'stand',
   injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
   lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
   aiming:false,firing:false,turning:0,travelYaw:0,
   replayFeet:feet.feet,pelvisYaw:feet.state.pelvisYaw,
   deterministic:true},0);
 assert.ok(Number.isFinite(rig.chest.rotation.z));
 assert.ok(rig.hip.position.y>18&&rig.hip.position.y<21);
 for(let i=0;i<2;i++){
  const shoe=rig.feet[i].shoe;
  assert.ok(shoe.position.toArray().every(Number.isFinite));
 }
 rig.dispose();
});
