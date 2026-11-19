import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {civilianPose} from '../src/breach-civilian-pose.ts';
import {NPC_LAB_POSES,npcLabPose,sampleNpcCivilian,sampleNpcHostile,
 NpcLabPreview} from '../src/operator-lab-npc-poses.ts';

test('EQA3.16J Lab shows every real civilian output and all new attention variants',()=>{
 const ids=new Set(NPC_LAB_POSES.map(x=>x.id));
 assert.equal(ids.size,NPC_LAB_POSES.length,'unique stable selectable tracks');
 const civilian=NPC_LAB_POSES.filter(x=>x.id.startsWith('civ-'));
 const hostiles=NPC_LAB_POSES.filter(x=>x.id.startsWith('host-'));
 assert.ok(civilian.length>=24&&hostiles.length>=12);
 const outputs=new Set(civilian.map(x=>civilianPose(sampleNpcCivilian(x.id,2))));
 assert.deepEqual([...outputs].sort(),[
  'idle','work','seated','walk','run','startled','hide',
  'compliant','restrained','injured','injured-walk',
  'carried','dragged','down'
 ].sort(),'no production civilian pose is omitted');
 for(const x of NPC_LAB_POSES){
  assert.equal(npcLabPose(x.id)?.label,x.label);
  assert.ok(x.description.length>8,'every track says what it demonstrates');
 }
 assert.equal(npcLabPose('invented'),undefined);
});
test('EQA3.16J shared civilian tracks encode only replay-addressable evidence and real states',()=>{
 const flinch=sampleNpcCivilian('civ-flinch',1.2);
 assert.equal(flinch.lastFlinchAt,1);
 assert.equal(flinch.lastEvidenceId.startsWith('visual/'),true);
 const calm=sampleNpcCivilian('civ-flinch',.5);
 assert.equal(calm.lastFlinchAt,-100,'no panic before authored event');
 assert.equal(calm.state,'routine');
 assert.equal(sampleNpcCivilian('civ-frozen',2).state,'frozen');
 assert.equal(sampleNpcCivilian('civ-hiding',2).state,'hiding');
 assert.equal(sampleNpcCivilian('civ-restrained',2).restrained,true);
 assert.equal(sampleNpcCivilian('civ-secure',2).restrained,false);
 assert.equal(sampleNpcCivilian('civ-secure',2).lastContactAt,.85);
 assert.equal(sampleNpcCivilian('civ-follow',2).state,'escorted');
 assert.equal(sampleNpcCivilian('civ-flee',2).velocity,66);
 assert.equal(sampleNpcCivilian('civ-flee-blocked',2).velocity,0);
 assert.equal(sampleNpcCivilian('civ-dragged',2).transportMode,'drag');
 assert.equal(sampleNpcCivilian('civ-carried',2).transportMode,'carry');
});
test('EQA3.16J hostile samples never grant unseen directions or change weapon authority',()=>{
 const heard=sampleNpcHostile('host-heard',1.3);
 assert.ok(heard.physical.headYaw>.01);
 assert.equal(heard.pose.aiming,false);
 const cover=sampleNpcHostile('host-suppressed',1.3);
 assert.equal(cover.physical.guarding,true);
 assert.ok(cover.physical.headPitch>.01);
 assert.equal(sampleNpcHostile('host-aim',1.3).physical.headYaw,0);
 assert.equal(sampleNpcHostile('host-reload',1.3).physical.headYaw,0);
 assert.equal(sampleNpcHostile('host-surrender',1.3).pose.surrender,true);
 assert.equal(sampleNpcHostile('host-down',1.3).pose.down,true);
 assert.equal(sampleNpcHostile('host-lookback',1.3).physical.investigating,false);
 assert.equal(sampleNpcHostile('host-heard',.5).physical.headYaw,0);
});
test('EQA3.16J one real rig per faction, reversible scrubbing and disposal',()=>{
 const scene=new THREE.Scene(),preview=new NpcLabPreview(scene);
 try{
  const a=preview.render('civ-flinch',1.2);
  assert.equal(a.model,'civilian');assert.equal(a.pose,'startled');
  assert.equal(scene.children.length,1);
  const prior=preview.render('civ-sighted',1.5);
  const later=preview.render('civ-hiding',3);
  assert.equal(later.pose,'hide');
  assert.deepEqual(preview.render('civ-sighted',1.5),prior,
   'scrubbing back reconstructs pose rather than retaining later gaze');
  const hostile=preview.render('host-heard',1.5);
  assert.equal(hostile.model,'hostile');
  assert.equal(scene.children.length,2,
   'each faction allocates one real production rig, not one per pose');
  assert.ok(Number.isFinite(hostile.headYaw));
  assert.equal(preview.render('host-suppressed',2).model,'hostile');
  assert.equal(scene.children.length,2);
 }finally{preview.dispose();}
 assert.equal(scene.children.length,0,'leaving Lab tab releases both rigs');
});
