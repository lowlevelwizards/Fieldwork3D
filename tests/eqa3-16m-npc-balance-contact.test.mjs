import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {NPC_LAB_POSES,NpcLabPreview,NpcLabFootFilm,sampleNpcCivilian}
 from '../src/operator-lab-npc-poses.ts';
import {createCivilianRig,updateCivilianRig,disposeCivilianRig}
 from '../src/breach-civilian-visuals.ts';
import {inspectOperatorPoseOutput}
 from '../src/breach-operator-pose-output.ts';
import {LEG_ANKLE_HEIGHT} from '../src/breach-leg-geometry.ts';

const pos=(node,local=[0,0,0])=>{
 node.updateWorldMatrix(true,false);
 return new THREE.Vector3(...local).applyMatrix4(node.matrixWorld);
};
const distance=(a,b)=>a.distanceTo(b);
function checkStandingContacts(r,context){
 r.root.updateMatrixWorld(true);
 for(let i=0;i<2;i++){
  const foot=r.feet[i],shoe=pos(foot.shoe);
  if(foot.swinging)continue;
  assert.ok(Math.abs(shoe.y-LEG_ANKLE_HEIGHT)<.32,
   context+' planted shoe '+i+' cannot float or sink; y='+shoe.y);
  assert.ok(r.legGap[i]<.65,
   context+' IK effector cannot separate from ankle by '+r.legGap[i]);
 }
}
function checkContinuousLimbChains(r,context){
 r.root.updateMatrixWorld(true);
 for(let i=0;i<2;i++){
  const foot=r.feet[i];
  const thighEnd=pos(foot.upper,[0,.5,0]);
  const shinStart=pos(foot.lower,[0,-.5,0]);
  const shinEnd=pos(foot.lower,[0,.5,0]);
  const shoe=pos(foot.shoe);
  assert.ok(distance(thighEnd,shinStart)<.20,
   context+' joint '+i+' broken at knee by '+distance(thighEnd,shinStart));
  assert.ok(distance(shinEnd,shoe)<.8,
   context+' joint '+i+' detached at ankle by '+distance(shinEnd,shoe)+
   ' root='+r.root.position.toArray()+
   ' hip='+r.hip.position.toArray()+
   ' ankle='+shoe.toArray()+
   ' shin='+shinEnd.toArray()+
   ' legGap='+r.legGap[i]);
 }
}
test('M1: actual compliant and restrained planted shoes remain at ground',()=>{
 for(const id of ['civ-secure','civ-compliant','civ-restrained']){
  const c=sampleNpcCivilian(id,2.14),r=createCivilianRig(c,true);
  try{
   updateCivilianRig(r,c,2.14,new NpcLabFootFilm(id).sample(2.14));
   assert.ok('character' in r);
   const localRoot=r.root.position.y;
   assert.ok(localRoot<-.01,id+' must retain genuine IK root kneel');
   checkStandingContacts(r.character,id+' 2.14');
   checkContinuousLimbChains(r.character,id+' 2.14');
  }finally{disposeCivilianRig(r);}
 }
});
test('M2: continuous crouch and pelvis height do not tear planted leg chain',()=>{
 const id='civ-hiding',film=new NpcLabFootFilm(id);
 const rig=createCivilianRig(sampleNpcCivilian(id,.71),true);
 try{
  for(const t of [.71,.78,.80,.82,.88,.95,1.07,1.25,2.14]){
   updateCivilianRig(rig,sampleNpcCivilian(id,t),t,film.sample(t));
   checkStandingContacts(rig.character,id+' '+t);
   checkContinuousLimbChains(rig.character,id+' '+t);
  }
  assert.ok(rig.character.lastPose.interactionCrouch>.8,
   'hiding eventually adopts low shelter pose through IK');
 }finally{disposeCivilianRig(rig);}
});
test('M3: walk, refuge and fleeing keep balance at screenshot timestamps',()=>{
 const ids=[['civ-walk',1.37],['civ-hide-walk',2.12],
  ['civ-flee',1.86],['civ-follow',2.29]];
 const scene=new THREE.Scene(),lab=new NpcLabPreview(scene);
 try{
  for(const [id,time] of ids){
   lab.render(id,time);
   checkStandingContacts(lab.civilian.character,id+' '+time);
   checkContinuousLimbChains(lab.civilian.character,id+' '+time);
   const c=sampleNpcCivilian(id,time);
   assert.equal(lab.civilian.root.position.x,c.p.x);
  }
 }finally{lab.dispose();}
});
test('M4: every NPC track switch keeps every lower limb joined at 60Hz',()=>{
 const scene=new THREE.Scene(),lab=new NpcLabPreview(scene);
 try{
  let count=0;
  for(const track of NPC_LAB_POSES.filter(t=>t.id.startsWith('civ-'))){
   for(const t of [0,.03,.12,.22,.79,.83,1.08,1.93,2.32]){
    lab.render(track.id,t);
    checkContinuousLimbChains(lab.civilian.character,track.id+' '+t);
    const output=inspectOperatorPoseOutput(lab.civilian.character);
    assert.ok(output.slots.every(s=>s.values.every(Number.isFinite)));
   }
   count++;
  }
  assert.ok(count>=24);
 }finally{lab.dispose();}
});
test('M5: character world root recovers from fall/carry to stand with no residual lift',()=>{
 const scene=new THREE.Scene(),lab=new NpcLabPreview(scene);
 try{
  for(const [id,t] of [['civ-carried',1.29],['civ-dragged',1.89],
    ['civ-down',2.3],['civ-walk',1.37],['civ-secure',1.93],
    ['civ-walk',2.14]]){
   lab.render(id,t);
   const r=lab.civilian.character;
   checkContinuousLimbChains(r,id+' '+t);
   if(id==='civ-walk')checkStandingContacts(r,id+' '+t);
   assert.ok(r.legGap.every(Number.isFinite));
  }
 }finally{lab.dispose();}
});
