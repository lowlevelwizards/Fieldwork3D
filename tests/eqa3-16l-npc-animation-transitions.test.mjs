import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {inspectOperatorPoseOutput}
 from '../src/breach-operator-pose-output.ts';
import {sampleNpcCivilian,NpcLabFootFilm,NpcLabPreview}
 from '../src/operator-lab-npc-poses.ts';
import {createCivilianRig,updateCivilianRig,disposeCivilianRig}
 from '../src/breach-civilian-visuals.ts';

const source={x:0,z:0,heading:0,travelYaw:0,velocity:0,
 seconds:1,stride:0,posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,
 turning:0,aimBlend:0,deterministic:true,unarmedPreview:true,
 poseDiagnostics:false};
const run=(rig,change={})=>poseOperator(rig,{...source,...change},0);
const snap=(rig,id)=>Array.from(inspectOperatorPoseOutput(rig).slots
 .find(s=>s.id===id).values);
const delta=(a,b)=>Math.hypot(...a.slice(0,7).map((n,i)=>n-b[i]));
const allFinite=rig=>assert.ok(inspectOperatorPoseOutput(rig).slots
 .every(x=>x.values.every(Number.isFinite)));

test('L1: idle to hands-up starts at LAST DISPLAYED pose, not raw gesture',()=>{
 const rig=createOperatorRig('L-gesture','blue',true),
  target=createOperatorRig('L-target','blue',true);
 try{
  run(rig,{npcTransitionKey:'civilian/idle/none'});
  const ids=['chest','head','arm-0-hand','arm-0-upper','arm-1-hand'];
  const before=ids.map(id=>snap(rig,id));
  const after={seconds:1+1/60,civilianGesture:'hands-up',
    npcTransitionKey:'civilian/startled/hands-up'};
  run(rig,after);run(target,{...after,npcTransitionKey:undefined});
  for(let i=0;i<ids.length;i++)
   assert.ok(delta(snap(rig,ids[i]),before[i])<1e-6,
    ids[i]+' first retarget frame cannot teleport');
  assert.ok(delta(snap(target,'arm-0-hand'),before[2])>1,
   'fixture actually switches the arm target');
  const shoes=['leg-0-shoe','leg-1-shoe','root'];
  for(const id of shoes)
   assert.deepEqual(snap(rig,id),snap(target,id),
    id+' must remain authoritative, unblended motor/foot pose');
  run(rig,{...after,seconds:1.145});
  const mid=snap(rig,'arm-0-hand');
  assert.ok(delta(mid,before[2])>.05);
  assert.ok(delta(mid,snap(target,'arm-0-hand'))>.05);
  run(rig,{...after,seconds:1.32});
  run(target,{...after,seconds:1.32,npcTransitionKey:undefined});
  assert.ok(delta(snap(rig,'arm-0-hand'),snap(target,'arm-0-hand'))<1e-6,
   'completed transition reaches the real unblended target');
  allFinite(rig);
 }finally{rig.dispose();target.dispose();}
});

test('L2: interrupted transition resumes at the latest VISIBLE support wrist',()=>{
 const rig=createOperatorRig('L-interrupt','blue',true);
 try{
  run(rig,{npcTransitionKey:'idle'});
  run(rig,{seconds:1.02,npcTransitionKey:'startled',
    civilianGesture:'hands-up'});
  run(rig,{seconds:1.10,npcTransitionKey:'startled',
    civilianGesture:'hands-up'});
  const before=snap(rig,'arm-0-hand');
  run(rig,{seconds:1.116,npcTransitionKey:'panic',
    civilianGesture:'head-cover'});
  assert.ok(delta(before,snap(rig,'arm-0-hand'))<1e-6,
   'interrupt begins exactly where first animation currently sits');
  run(rig,{seconds:1.24,npcTransitionKey:'panic',
    civilianGesture:'head-cover'});
  assert.ok(delta(before,snap(rig,'arm-0-hand'))>.05,
   'after interruption the palm actually progresses to its NEW target');
  allFinite(rig);
 }finally{rig.dispose();}
});

test('L3: seeking forward/backward skips previous pose history entirely',()=>{
 const rig=createOperatorRig('L-seek','blue',true),
  reference=createOperatorRig('L-reference','blue',true);
 try{
  run(rig,{npcTransitionKey:'idle'});
  const pose={seconds:3.2,npcTransitionKey:'panic',
    civilianGesture:'head-cover'};
  run(rig,pose);run(reference,{...pose,npcTransitionKey:undefined});
  for(const id of ['chest','head','arm-0-hand','leg-0-upper'])
   assert.deepEqual(snap(rig,id),snap(reference,id));
  const reverse={seconds:.7,npcTransitionKey:'idle',
    civilianGesture:undefined};
  run(rig,reverse);run(reference,{...reverse,npcTransitionKey:undefined});
  for(const id of ['chest','head','arm-0-hand','leg-0-upper'])
   assert.deepEqual(snap(rig,id),snap(reference,id));
  run(rig,reverse);
  assert.deepEqual(snap(rig,'arm-0-hand'),snap(reference,'arm-0-hand'));
 }finally{rig.dispose();reference.dispose();}
});

test('L4: live civilian adapts reaction changes through shared handoff',()=>{
 const calm=sampleNpcCivilian('civ-flee',.79);
 const runActor=sampleNpcCivilian('civ-flee',.8);
 const rig=createCivilianRig(calm,true);
 const film=new NpcLabFootFilm('civ-flee');
 try{
  updateCivilianRig(rig,calm,.79,film.sample(.79));
  const before=snap(rig.character,'arm-0-hand');
  updateCivilianRig(rig,runActor,.8,film.sample(.8));
  assert.ok(delta(before,snap(rig.character,'arm-0-hand'))<1e-6,
   'flee response cannot teleport a hand on the first danger frame');
  updateCivilianRig(rig,sampleNpcCivilian('civ-flee',.93),
   .93,film.sample(.93));
  assert.ok(delta(before,snap(rig.character,'arm-0-hand'))>.05);
  allFinite(rig.character);
 }finally{disposeCivilianRig(rig);}
});

test('L5: Lab civilian track switch at clock zero blends; scrub direct stays exact',()=>{
 const lab=new NpcLabPreview(new THREE.Scene());
 try{
  lab.render('civ-flee',.71);
  lab.render('civ-flee',.95);
  const prior=snap(lab.civilian.character,'arm-0-hand');
  lab.render('civ-compliant',0);
  assert.ok(delta(prior,snap(lab.civilian.character,'arm-0-hand'))<1e-6,
   'a fresh selected track blends from previous displayed NPC');
  lab.render('civ-compliant',.30);
  const atEnd=snap(lab.civilian.character,'arm-0-hand');
  assert.ok(Number.isFinite(atEnd[0]));
  lab.render('civ-compliant',2.14);
  const late=snap(lab.civilian.character,'arm-0-hand');
  lab.render('civ-compliant',.71);
  lab.render('civ-compliant',2.14);
  assert.deepEqual(snap(lab.civilian.character,'arm-0-hand'),late,
   'seek and return cannot accumulate fading pose history');
 }finally{lab.dispose();}
});

test('L6: tracks share root / shoes authority, retain discrete gun visibility',()=>{
 const scene=new THREE.Scene(),lab=new NpcLabPreview(scene);
 try{
  lab.render('host-idle',0);
  lab.render('host-aim',0);
  assert.ok(lab.hostile.weapon.visible);
  lab.render('host-surrender',0);
  for(const t of [.8,.83,.90,1.02,1.26,1.55,2.1]){
   lab.render('host-surrender',t);
   allFinite(lab.hostile);
   if(t>=1.26){
    assert.equal(lab.hostile.weapon.visible,false);
    assert.equal(lab.hostile.droppedGun.visible,true);
   }
  }
  const final=snap(lab.hostile,'arm-0-hand');
  lab.render('host-surrender',.70);
  lab.render('host-surrender',2.1);
  assert.deepEqual(snap(lab.hostile,'arm-0-hand'),final);
 }finally{lab.dispose();}
});
