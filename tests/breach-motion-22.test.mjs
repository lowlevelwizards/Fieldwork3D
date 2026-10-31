import test from 'node:test';
import assert from 'node:assert/strict';
import {operatorTraits} from '../src/breach-operator-traits.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
import {LabDistanceMotionCache} from '../src/breach-lab-tracks.ts';
const feet=[-1,1].map(side=>({position:{x:0,y:side*5.6},
 worldYaw:0,height:0,phase:'planted',progress:1,contact:true}));
test('operator individuality is stable, restrained and genuinely varied',()=>{
 const ids=['rook','ash','vale','moss','rook'];
 const all=ids.map(operatorTraits);
 assert.deepEqual(all[0],all[4]);
 assert.ok(JSON.stringify(all[0])!==JSON.stringify(all[1]));
 for(const x of all){
  assert.ok(Math.abs(x.postureLean)<=.0091);
  assert.ok(Math.abs(x.headBias)<=.0141);
  assert.ok(x.breathingRate>=.924&&x.breathingRate<=1.076);
  assert.ok(x.gearResponse>=.914&&x.gearResponse<=1.086);
 }
});
test('breathing difference is deterministic and fades under contact movement',()=>{
 const motion=(id,speed)=>bodyFromContacts({feet,velocity:speed,
  heading:0,travelYaw:0,turning:0,injury:0,posture:'stand',
  position:{x:0,y:0},seconds:2.13,
  tacticalTension:0,breathingRate:operatorTraits(id).breathingRate});
 assert.deepEqual(motion('rook',0),motion('rook',0));
 assert.notEqual(motion('rook',0).breath,motion('ash',0).breath);
 assert.equal(motion('rook',60).breath,0);
});
test('approved hybrid remains deterministic on essential tactical tracks',()=>{
 for(const name of ['walk','strafe-left','strafe-right','turn-180',
   'crouch-walk','pie','squeeze']){
  const lab=new LabDistanceMotionCache(name);
  const frames=[0,.53,1.15,2.38,3.65].map(t=>lab.sample(t).feet);
  assert.deepEqual(frames,[0,.53,1.15,2.38,3.65]
    .map(t=>lab.sample(t).feet),name);
  assert.ok(frames.every(pair=>pair.every(f=>
    Number.isFinite(f.position.x)&&Number.isFinite(f.worldYaw))),
    name);
 }
});
