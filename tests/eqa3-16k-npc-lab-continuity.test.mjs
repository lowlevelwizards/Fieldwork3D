import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCivilianRig,updateCivilianRig,disposeCivilianRig}
 from '../src/breach-civilian-visuals.ts';
import {civilianPhysicalityAt} from '../src/breach-encounter-physicality.ts';
import {sampleNpcCivilian,sampleNpcHostile,NpcLabFootFilm,NpcLabPreview}
 from '../src/operator-lab-npc-poses.ts';
import {inspectOperatorPoseOutput}
 from '../src/breach-operator-pose-output.ts';

test('K1: fleeing before first sighting remains physically at origin',()=>{
 for(const time of [0,.35,.71,.79]){
  const c=sampleNpcCivilian('civ-flee',time);
  assert.deepEqual(c.p,{x:0,y:0});
  assert.equal(c.velocity,0);
  assert.equal(civilianPhysicalityAt(c,time).pose,'idle');
 }
 assert.ok(sampleNpcCivilian('civ-flee',1.54).p.x>0);
});
test('K2: all NPC preview foot films rewind and switch without inherited foot anchors',()=>{
 for(const id of ['civ-flee','civ-walk','civ-secure',
   'civ-compliant','civ-carried','civ-dragged','host-retreat']){
  const film=new NpcLabFootFilm(id);
  assert.equal(film.frames.length,241);
  const first=film.sample(.71);
  film.sample(2.8);film.sample(1.54);
  assert.deepEqual(film.sample(.71),first,id+' reverse seek');
  const actor=id.startsWith('civ-')?
   sampleNpcCivilian(id,.71).p:
   {x:sampleNpcHostile(id,.71).pose.x,y:0};
  for(const foot of first)
   assert.ok(Math.hypot(foot.position.x-actor.x,
     foot.position.y-actor.y)<24,id+' no trailing foot at .71s');
 }
});
test('K3: compliance uses one kneel, not simultaneous crouch and surrender',()=>{
 const c=sampleNpcCivilian('civ-compliant',2.14);
 const rig=createCivilianRig(c,true);
 try{
  updateCivilianRig(rig,c,2.14,
   new NpcLabFootFilm('civ-compliant').sample(2.14));
  assert.ok('character' in rig);
  assert.equal(rig.character.lastPose?.posture,'stand',
   'compliance should not crouch AND surrender simultaneously');
  assert.equal(rig.character.lastPose?.surrender,true);
  assert.ok(rig.character.lastPose?.downProgress>=.95);
 }finally{disposeCivilianRig(rig);}
});
test('K4: carried or dragged cannot leave inherited elevated hips in a later walk',()=>{
 const c=sampleNpcCivilian('civ-carried',1.89);
 const rig=createCivilianRig(c,true);
 try{
  assert.ok('character' in rig);
  updateCivilianRig(rig,c,1.89,
   new NpcLabFootFilm('civ-carried').sample(1.89));
  const localRoot=()=>inspectOperatorPoseOutput(rig.character).slots
    .find(s=>s.id==='root').values[1];
  assert.equal(rig.root.position.y,10+localRoot(),
   'transport height adds the local pose fall offset instead of flattening IK');
  const walk=sampleNpcCivilian('civ-walk',1.09);
  updateCivilianRig(rig,walk,1.09,
   new NpcLabFootFilm('civ-walk').sample(1.09));
  assert.ok(Math.abs(rig.root.position.y-localRoot())<1e-9,
   'a previous carried frame must never lift a standing walker');
  assert.ok(rig.character.legGap.every(v=>Number.isFinite(v)));
  const drag=sampleNpcCivilian('civ-dragged',1.89);
  updateCivilianRig(rig,drag,1.89,
   new NpcLabFootFilm('civ-dragged').sample(1.89));
  assert.equal(rig.root.position.y,2+localRoot(),
   'drag elevation must preserve local collapse offset');
 }finally{disposeCivilianRig(rig);}
});
test('K5: hostile surrender actually progresses into hands-up and drops gun',()=>{
 const initial=sampleNpcHostile('host-surrender',.71).pose;
 const partial=sampleNpcHostile('host-surrender',1.09).pose;
 const settled=sampleNpcHostile('host-surrender',2.41).pose;
 assert.equal(initial.surrender,false);
 assert.equal(initial.downProgress,0);
 assert.ok(partial.downProgress>.2&&partial.downProgress<1);
 assert.equal(settled.downProgress,1);
 const scene=new THREE.Scene(),preview=new NpcLabPreview(scene);
 try{
  preview.render('host-surrender',2.41);
  assert.equal(preview.hostile.weapon.visible,false,
   'held firearm must not still float in surrendered hands at 2.41s');
  assert.equal(preview.hostile.droppedGun.visible,true,
   'surrender actually releases the firearm');
  assert.equal(scene.children.length,1);
  const hostile=scene.children[0];
  assert.ok(hostile,'the real hostile preview rig exists');
  // A later render at the same time reproduces the surrendered stance.
  const observed=preview.render('host-surrender',2.41);
  preview.render('host-fire',.71);
  assert.deepEqual(preview.render('host-surrender',2.41),observed);
 }finally{preview.dispose();}
});
test('K6: all nine reported NPC preview samples remain finite across switching',()=>{
 const scene=new THREE.Scene(),lab=new NpcLabPreview(scene);
 try{
  const tracks=[['civ-flee',.71],['civ-flee',1.54],
   ['civ-flee',.73],['civ-walk',1.09],['civ-secure',1.94],
   ['civ-compliant',2.14],['civ-carried',1.29],
   ['civ-dragged',1.89],['host-surrender',2.41]];
  for(const [track,time] of tracks){
   const a=lab.render(track,time);
   assert.ok(a.pose&&Number.isFinite(a.headYaw),track);
   for(const child of scene.children)
    if(child.visible)assert.ok(child.position.toArray().every(Number.isFinite));
  }
  assert.equal(scene.children.length,2,'no accumulating scene clones');
 }finally{lab.dispose();}
 assert.equal(scene.children.length,0);
});
