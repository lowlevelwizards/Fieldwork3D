/** B2 — staged, single-publisher operator pose outputs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {
 beginOperatorPoseOutput,stageOperatorPoseOutput,stageDirectOperatorPoseOutput,
 commitOperatorPoseOutput,inspectOperatorPoseOutput,OPERATOR_POSE_STAGE_ORDER
} from '../src/breach-operator-pose-output.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const base={
 x:0,z:0,heading:.38,travelYaw:.38,pelvisYaw:-.38,
 velocity:0,turning:0,seconds:2,stride:0,posture:'stand',injury:0,
 weapon:'carbine',reload:0,reloadDuration:1.8,lastDoorAt:-100,
 lastThrowAt:-100,down:false,surrender:false,aiming:false,firing:false,
 aimBlend:0,shotHeading:.38,poseV3Preview:true,
 poseV4ReloadPreview:true,deterministic:true
};
const config=()=>selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const snapshot=rig=>{
 const frame=inspectOperatorPoseOutput(rig);
 assert.ok(frame?.valid);
 return Object.fromEntries(frame.slots.map(slot=>[
  slot.id,Array.from(slot.values)]));
};
const allStages=(rig,pose)=>{
 for(const owner of OPERATOR_POSE_STAGE_ORDER)
  stageOperatorPoseOutput(rig,pose,owner);
};

test('B2: each rig exposes exactly six non-overlapping named output owners',()=>{
 const rig=createOperatorRig('b2-owners','blue',true);
 try{
  const names=[...OPERATOR_POSE_STAGE_ORDER];
  assert.deepEqual(names,['lower-body','upper-body','frame',
   'body','weapon','attachments']);
  poseOperator(rig,base,0);
  const output=inspectOperatorPoseOutput(rig);
  const ids=new Set(),nodes=new Set();
  for(const slot of output.slots){
   assert.ok(names.includes(slot.owner),slot.id);
   assert.ok(!ids.has(slot.id),'duplicate slot '+slot.id);
   assert.ok(!nodes.has(slot.node),'double-owned node '+slot.id);
   ids.add(slot.id);nodes.add(slot.node);
   assert.equal(slot.values.length,11);
  }
  assert.ok(names.every(name=>output.slots.some(slot=>slot.owner===name)));
  for(const id of ['root','legacy-frame','pelvis','chest','head',
   'arm-0-upper','arm-0-lower','arm-0-hand','arm-1-upper','arm-1-hand',
   'leg-0-upper','leg-0-lower','leg-0-shoe','leg-0-ankle',
   'leg-1-shoe','held-weapon','dropped-weapon','inserted-magazine',
   'hand-magazine','detached-magazine','reload-control',
   'medical-item','backpack','sling-0','sling-1','sling-2'])
   assert.ok(ids.has(id),'unregistered '+id);
 }finally{rig.dispose();}
});

test('B2: staging cannot publish an incomplete, duplicate or wrong-time frame',()=>{
 const rig=createOperatorRig('b2-guard','blue',true);
 try{
  poseOperator(rig,base,0);
  const old=snapshot(rig);
  const output=inspectOperatorPoseOutput(rig),generation=output.generation;
  const next={...base,seconds:3};
  beginOperatorPoseOutput(rig,next);
  stageOperatorPoseOutput(rig,next,'body');
  assert.throws(()=>stageOperatorPoseOutput(rig,next,'body'),
   /Duplicate pose-output stage/);
  assert.throws(()=>stageOperatorPoseOutput(rig,{...next,seconds:4},'frame'),
   /matching frame/);
  assert.throws(()=>commitOperatorPoseOutput(rig,next),
   /Incomplete pose-output stages/);
  assert.equal(output.generation,generation);
  assert.deepEqual(snapshot(rig),old,'incomplete staging must be invisible');
  beginOperatorPoseOutput(rig,next);
  allStages(rig,next);
  commitOperatorPoseOutput(rig,next);
  assert.equal(output.generation,generation+1);
  assert.equal(output.time,next.seconds);
  assert.throws(()=>commitOperatorPoseOutput(rig,next),
   /Incomplete pose-output stages/);
 }finally{rig.dispose();}
});

test('B2: stage values are actually committed, not recaptured from later mutations',()=>{
 const rig=createOperatorRig('b2-snapshot','blue',true);
 try{
  const pose={...base,seconds:10};
  rig.hip.position.x=4.25;
  beginOperatorPoseOutput(rig,pose);
  stageOperatorPoseOutput(rig,pose,'body');
  rig.hip.position.x=11.5;
  for(const owner of OPERATOR_POSE_STAGE_ORDER)
   if(owner!=='body')stageOperatorPoseOutput(rig,pose,owner);
  commitOperatorPoseOutput(rig,pose);
  assert.equal(rig.hip.position.x,4.25,'commit uses staged body value');
  const output=inspectOperatorPoseOutput(rig);
  assert.equal(output.slots.find(x=>x.id==='pelvis').values[0],4.25);
 }finally{rig.dispose();}
});

test('B2: direct stage values bypass scene nodes and reject partial ownership',()=>{
 const rig=createOperatorRig('b2-direct','blue',true);
 try{
  poseOperator(rig,base,0);
  const output=inspectOperatorPoseOutput(rig);
  const second={...base,seconds:7};
  const body=output.slots.filter(slot=>slot.owner==='body').map(slot=>({
   id:slot.id,values:Array.from(slot.values)
  }));
  body.find(slot=>slot.id==='pelvis').values[0]=5.75;
  beginOperatorPoseOutput(rig,second);
  assert.throws(()=>stageDirectOperatorPoseOutput(rig,second,'body',body.slice(1)),
   /Incomplete direct pose-output stage/);
  const mismatched=body.map(x=>({id:x.id,values:x.values}));
  mismatched[0].id='arm-0-hand';
  assert.throws(()=>stageDirectOperatorPoseOutput(rig,second,'body',mismatched),
   /Incorrect direct pose-output slot/);
  stageDirectOperatorPoseOutput(rig,second,'body',body);
  for(const owner of OPERATOR_POSE_STAGE_ORDER)
   if(owner!=='body')stageOperatorPoseOutput(rig,second,owner);
  assert.notEqual(rig.hip.position.x,5.75,
   'direct stage does not change the working rig');
  commitOperatorPoseOutput(rig,second);
  assert.equal(rig.hip.position.x,5.75);
  assert.equal(output.slots.find(x=>x.id==='pelvis').values[0],5.75);
 }finally{rig.dispose();}
});

test('B2: non-finite stage values fail closed without corrupting published data',()=>{
 const rig=createOperatorRig('b2-invalid','blue',true);
 try{
  poseOperator(rig,base,0);
  const output=inspectOperatorPoseOutput(rig),before=snapshot(rig);
  const gen=output.generation,next={...base,seconds:6};
  rig.head.position.x=NaN;
  beginOperatorPoseOutput(rig,next);
  assert.throws(()=>stageOperatorPoseOutput(rig,next,'body'),
   /Non-finite pose output head/);
  assert.throws(()=>commitOperatorPoseOutput(rig,next),
   /Incomplete pose-output stages/);
  assert.equal(output.generation,gen);
  assert.deepEqual(snapshot(rig),before);
  rig.head.position.x=0;
  poseOperator(rig,next,0);
  assert.equal(output.generation,gen+1);
 }finally{rig.dispose();}
});

test('B2: a repeated or rewound replay timestamp retains bounded buffer identity',()=>{
 const rig=createOperatorRig('b2-seek','blue',true);
 const initial={...base,weaponConfiguration:config(),seconds:4.1};
 try{
  poseOperator(rig,initial,0);
  const output=inspectOperatorPoseOutput(rig);
  const buffers=output.slots.map(slot=>slot.values);
  const start=snapshot(rig);
  poseOperator(rig,{...initial,seconds:8.2,aimBlend:1,aiming:true},0);
  poseOperator(rig,initial,-1);
  assert.deepEqual(snapshot(rig),start);
  poseOperator(rig,initial,0);
  assert.deepEqual(snapshot(rig),start);
  assert.strictEqual(inspectOperatorPoseOutput(rig),output);
  buffers.forEach((buf,i)=>assert.strictEqual(output.slots[i].values,buf));
  assert.equal(output.generation,4);
 }finally{rig.dispose();}
 assert.equal(inspectOperatorPoseOutput(rig),null,'disposed rig cannot retain pose');
});

test('B2: separate actors cannot leak pending or published stages',()=>{
 const a=createOperatorRig('b2-a','blue',true),
  b=createOperatorRig('b2-b','blue',true);
 try{
  poseOperator(a,base,0);
  poseOperator(b,{...base,heading:2},0);
  const frozen=snapshot(a);
  const aOutput=inspectOperatorPoseOutput(a),
   bOutput=inspectOperatorPoseOutput(b);
  beginOperatorPoseOutput(b,{...base,seconds:5});
  stageOperatorPoseOutput(b,{...base,seconds:5},'upper-body');
  assert.deepEqual(snapshot(a),frozen);
  assert.notStrictEqual(aOutput,bOutput);
  assert.ok(aOutput.slots.every((slot,i)=>
   slot.values!==bOutput.slots[i].values&&slot.node!==bOutput.slots[i].node));
 }finally{a.dispose();b.dispose();}
});

test('B2: the actual evaluator stages solved limbs and late-finalized equipment once',()=>{
 const src=readFileSync(new URL('../src/breach-operator-animation-controller.ts',
  import.meta.url),'utf8');
 const out=readFileSync(new URL('../src/breach-operator-pose-output.ts',
  import.meta.url),'utf8');
 const points=[
  'beginOperatorPoseOutput(r,p)',
  'applyOperatorLegIK(r,p,scratch,targets,kick,headingYaw,smooth)',
  "stageDirectOperatorPoseOutput(r,p,'lower-body',legPose)",
  "stageDirectOperatorPoseOutput(r,p,'upper-body',",
  'applyOperatorTraumaPose(r,p,downProgress)',
  'finishOperatorPoseFrame(r,p,',
  "stageOperatorPoseOutput(r,p,'frame')",
  "stageOperatorPoseOutput(r,p,'body')",
  "stageOperatorPoseOutput(r,p,'weapon')",
  "stageOperatorPoseOutput(r,p,'attachments')",
  'commitOperatorPoseOutput(r,p)'
 ];
 const found=points.map(point=>src.indexOf(point));
 assert.ok(found.every(index=>index>=0));
 assert.deepEqual(found,[...found].sort((a,b)=>a-b));
 assert.equal((src.match(/commitOperatorPoseOutput\(r,p\)/g)??[]).length,1);
 assert.ok(out.includes('COMPLETE_STAGE_MASK'));
 assert.ok(out.includes('Duplicate pose-output owner'));
 assert.ok(!src.includes('captureOperatorPoseOutput(r,p)'));
 for(const source of [src,out]){
  assert.doesNotMatch(source,/\bstepSession\(/);
  assert.doesNotMatch(source,/requestAnimationFrame\(/);
 }
});
