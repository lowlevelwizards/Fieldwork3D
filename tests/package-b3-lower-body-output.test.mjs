/** Package B3 — independent frozen pre-B3 leg writer vs direct outputs.
 * Comparisons use the former B2 rendering equations as reference, not the
 * same production B3 function under test.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {createOperatorPoseScratch} from '../src/breach-operator-pose-scratch.ts';
import {applyOperatorLegIK,sampleOperatorFootContacts}
 from '../src/breach-operator-lower-body.ts';
import {solveTwoBone,LEG_LIMITS,alignSegment,alignSegmentComponents}
 from '../src/breach-ik.ts';
import {LEG_HIP_SIDE,LEG_ANKLE_HEIGHT,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH}
 from '../src/breach-leg-geometry.ts';
import {kickMotion} from '../src/breach-door-actions.ts';
import {inspectOperatorPoseOutput} from '../src/breach-operator-pose-output.ts';

const base={
 x:20,z:30,heading:.34,travelYaw:.34,pelvisYaw:-.34,
 velocity:0,turning:0,seconds:3,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,
 reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
 down:false,surrender:false,aiming:false,firing:false,aimBlend:0,
 poseV3Preview:true,poseV4ReloadPreview:true,deterministic:true
};
const foot=(x,z,worldYaw=0,pitch=0,height=0,contact=true)=>({
 position:{x,y:z},worldYaw,pitch,height,contact,
 phase:contact?'planted':'swing',progress:contact?1:.4
});
const sampleFeet=[
 foot(20,24,.3),foot(20,36,.3)
];
const smooth=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x)};
const rigBones=rig=>rig.feet.flatMap(f=>[
 f.upper,f.lower,f.shoe,f.ankleLink
]);
const values=node=>[
 node.position.x,node.position.y,node.position.z,
 node.quaternion.x,node.quaternion.y,node.quaternion.z,node.quaternion.w,
 node.scale.x,node.scale.y,node.scale.z,node.visible?1:0
];
const snapshot=rig=>rigBones(rig).map(values);
const slotValues=slots=>slots.map(slot=>Array.from(slot.values));
const assertClose=(a,b,name,tolerance=1e-10)=>{
 assert.equal(a.length,b.length,name+' count');
 for(let i=0;i<a.length;i++){
  assert.equal(a[i].length,b[i].length,name+' slot '+i);
  for(let j=0;j<a[i].length;j++)
   assert.ok(Math.abs(a[i][j]-b[i][j])<=tolerance,
    name+' slot '+i+' component '+j+': '+a[i][j]+' !== '+b[i][j]);
 }
};

/** Frozen Stage11/B2 leg-mesh writer for independent geometry parity. */
function legacyLegReference(r,p,targets,kick,headingYaw){
 const inverse=new THREE.Quaternion()
  .setFromEuler(new THREE.Euler(
   r.legacyPitch,r.legacyYaw,r.legacyRoll,'XYZ')).invert();
 const before=r.feet.map(f=>f.bend.clone());
 const gaps=[];
 for(let i=0;i<2;i++){
  const footRig=r.feet[i],sign=i===0?-1:1,target=targets[i];
  const hipLocal=new THREE.Vector3(0,r.hip.position.y,
   r.hip.position.z+sign*LEG_HIP_SIDE);
  const anchor=target.position;
  footRig.anchor.set(anchor.x,LEG_ANKLE_HEIGHT,anchor.y);
  if(p.deterministic)footRig.bend.set(1,0,0);
  footRig.swinging=!target.contact;
  const targetWorld=new THREE.Vector3(target.position.x,
   LEG_ANKLE_HEIGHT+target.height,target.position.y);
  if(i===1&&kick){
   const motion=smooth((kick.progress-.30)/.23)*
    (1-smooth((kick.progress-.67)/.25));
   if(p.doorPoint){
    const dx=p.x-p.doorPoint.x,dz=p.z-p.doorPoint.y;
    const gap=Math.hypot(dx,dz)||1;
    const contact=new THREE.Vector3(p.doorPoint.x+dx/gap*1.5,9,
     p.doorPoint.y+dz/gap*1.5);
    targetWorld.lerp(contact,motion);
   }else{
    targetWorld.x+=Math.cos(p.heading)*kick.reach;
    targetWorld.z+=Math.sin(p.heading)*kick.reach;
    targetWorld.y+=kick.lift;
   }
   footRig.swinging=true;
  }
  const relative=targetWorld.sub(
   new THREE.Vector3(p.x,r.root.position.y,p.z)).applyQuaternion(inverse);
  const leg=solveTwoBone(hipLocal,relative,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH,
   new THREE.Vector3(4.5,0,i===0?-1.1:1.1),LEG_LIMITS,
   footRig.bend);
  footRig.bend.copy(leg.bendPlane);
  footRig.outOfReach=!leg.reached;
  const gap=leg.effector.distanceTo(relative);
  gaps.push(gap);
  r.legGap[i]=gap;
  alignSegment(footRig.upper,hipLocal,leg.joint,new THREE.Vector3(0,0,sign));
  alignSegment(footRig.lower,leg.joint,leg.effector,
   new THREE.Vector3(0,0,sign));
  footRig.ankleLink.visible=gap>.10;
  if(footRig.ankleLink.visible)
   alignSegment(footRig.ankleLink,leg.effector,relative,
    new THREE.Vector3(0,0,sign));
  footRig.shoe.position.copy(relative);
  footRig.shoe.rotation.z=target.pitch??0;
  footRig.shoe.rotation.y=target.worldYaw-headingYaw;
 }
 return {before,gaps};
}

test('B3: direct lower-body output exactly matches frozen B2 leg writer',()=>{
 const cases=[
  {name:'planted',pose:base,feet:sampleFeet},
  {name:'walk-strafe',pose:{...base,velocity:60,travelYaw:1.18,
   heading:.7},feet:[foot(22,25,.9,.24,.5,false),
    foot(18,35,-.1,-.12,0,true)]},
  {name:'low-crouch',pose:{...base,posture:'crouch',velocity:24},
   feet:[foot(20,23,.2,.08),foot(21,36,-.3)]},
  {name:'pivot',pose:{...base,pelvisYaw:1.3,heading:-.75,turning:1.5},
   feet:[foot(18,25,1.3),foot(21,35,1.1)]},
  {name:'fall',pose:{...base,down:true,downProgress:.72,
   downPose:'right'},feet:[foot(21,24,.2),foot(19,34,.1)]},
  {name:'door-kick',pose:{...base,lastDoorAt:2.58,
   doorMethod:'kick',doorPoint:{x:39,y:31}},
   feet:sampleFeet,kick:kickMotion(.42)},
  {name:'unreachable',pose:base,
   feet:[foot(400,420,.6),foot(20,36,.1)]}
 ];
 for(const c of cases){
  const actual=createOperatorRig('b3-golden-'+c.name,'blue',true);
  const expected=createOperatorRig('b3-golden-'+c.name,'blue',true);
  try{
   // Set up an identical, complete pose hierarchy before isolating the
   // lower-body solve; no call to advanceFootsteps is made by either solver.
   const start={...c.pose,seconds:2,replayFeet:sampleFeet};
   poseOperator(actual,start,0);
   poseOperator(expected,start,0);
   const next={...c.pose,seconds:3.1,replayFeet:c.feet};
   const prev=snapshot(actual);
   const output=applyOperatorLegIK(actual,next,createOperatorPoseScratch(),
    c.feet,c.kick??null,actual.legacyYaw,smooth);
   assert.deepEqual(snapshot(actual),prev,
    c.name+' direct solver must not mutate any visible leg node');
   const ref=legacyLegReference(expected,next,c.feet,c.kick??null,
    expected.legacyYaw);
   assertClose(slotValues(output),snapshot(expected),c.name);
   assert.deepEqual(actual.legGap,expected.legGap,c.name+' reach gaps');
   for(let i=0;i<2;i++){
    assert.equal(actual.feet[i].outOfReach,expected.feet[i].outOfReach,
     c.name+' reach status '+i);
    assert.equal(actual.feet[i].swinging,expected.feet[i].swinging,
     c.name+' swing state '+i);
    assert.ok(actual.feet[i].bend.distanceTo(expected.feet[i].bend)<1e-10,
     c.name+' bend plane '+i);
   }
   assert.equal(ref.gaps.length,2);
   assert.deepEqual(output.map(x=>x.id),[
    'leg-0-upper','leg-0-lower','leg-0-shoe','leg-0-ankle',
    'leg-1-upper','leg-1-lower','leg-1-shoe','leg-1-ankle'
   ]);
  }finally{actual.dispose();expected.dispose();}
 }
});

test('B3: direct lower-body reuses one bounded output and cannot move the scheduler',()=>{
 const r=createOperatorRig('b3-scratch','blue',true),
  scratch=createOperatorPoseScratch();
 try{
  poseOperator(r,{...base,replayFeet:sampleFeet},0);
  const poses=[base,{...base,seconds:4,heading:.8}];
  const initialScheduler=JSON.stringify(r.footsteps);
  const a=applyOperatorLegIK(r,poses[0],scratch,sampleFeet,null,
   r.legacyYaw,smooth);
  const buffers=a.map(x=>x.values),frozenNodes=snapshot(r);
  for(let i=0;i<60;i++){
   const next=poses[i%2];
   const b=applyOperatorLegIK(r,next,scratch,sampleFeet,null,
    r.legacyYaw,smooth);
   assert.strictEqual(a,b);
   b.forEach((slot,j)=>assert.strictEqual(slot.values,buffers[j]));
   assert.deepEqual(snapshot(r),frozenNodes);
  }
  assert.equal(JSON.stringify(r.footsteps),initialScheduler);
  assert.equal(r.footsteps.initialized,false,
   'replay targets do not advance the live scheduler');
 }finally{r.dispose();}
});

test('B3: recorded replay feet remain the sole contact source',()=>{
 const r=createOperatorRig('b3-recorded','blue',true);
 const targets=Object.freeze([
  Object.freeze({...sampleFeet[0],position:Object.freeze({...sampleFeet[0].position})}),
  Object.freeze({...sampleFeet[1],position:Object.freeze({...sampleFeet[1].position})})
 ]);
 try{
  const p={...base,replayFeet:targets,seconds:4.2};
  const before=JSON.stringify(targets);
  assert.deepEqual(sampleOperatorFootContacts(r,p,0,0,0),targets);
  assert.equal(r.footsteps.initialized,false);
  poseOperator(r,p,0);
  assert.equal(JSON.stringify(targets),before);
  assert.equal(r.footsteps.initialized,false);
  const frame=inspectOperatorPoseOutput(r);
  assert.ok(frame.valid);
  for(const slot of frame.slots.filter(s=>s.owner==='lower-body'))
   assert.deepEqual(Array.from(slot.values),values(slot.node));
 }finally{r.dispose();}
});

test('B3: repeated/reversed timestamps produce identical staged foot transforms',()=>{
 const rig=createOperatorRig('b3-rewind','blue',true);
 const p={...base,seconds:4.1,replayFeet:sampleFeet};
 const snapshotLegs=()=>inspectOperatorPoseOutput(rig).slots
  .filter(x=>x.owner==='lower-body').map(x=>Array.from(x.values));
 try{
  poseOperator(rig,p,0);
  const start=snapshotLegs(),output=inspectOperatorPoseOutput(rig);
  poseOperator(rig,{...p,seconds:8.2,
   replayFeet:[foot(24,21,-.5),foot(18,38,.9)]},0);
  poseOperator(rig,p,-1);
  assertClose(snapshotLegs(),start,'reverse');
  poseOperator(rig,p,0);
  assertClose(snapshotLegs(),start,'identical timestamp');
  assert.strictEqual(inspectOperatorPoseOutput(rig),output);
 }finally{rig.dispose();}
});

test('B3: component alignment retains historical mesh IK parity',()=>{
 const mesh=new THREE.Object3D(),
  position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),
  scale=new THREE.Vector3(1,1,1);
 const pair=[
  [new THREE.Vector3(2,3,4),new THREE.Vector3(4,-5,1)],
  [new THREE.Vector3(0,3,0),new THREE.Vector3(0,-3,0)],
  [new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0)]
 ];
 const side=new THREE.Vector3(0,0,-1);
 for(const [from,to] of pair){
  alignSegment(mesh,from,to,side);
  alignSegmentComponents(position,quaternion,scale,from,to,side);
  assertClose([[position.x,position.y,position.z,quaternion.x,
   quaternion.y,quaternion.z,quaternion.w,scale.x,scale.y,scale.z]],
   [values(mesh).slice(0,10)],'shared alignment');
 }
});

test('B3: source ownership does not introduce a hidden second contact clock',()=>{
 const src=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
 const lower=src('breach-operator-lower-body.ts'),
  controller=src('breach-operator-animation-controller.ts'),
  scratch=src('breach-operator-pose-scratch.ts');
 assert.match(lower,/validatedReplayFeet\(gaitInput,p.replayFeet\)/);
 assert.match(lower,/advanceFootsteps\(r.footsteps,gaitInput\)/);
 assert.match(lower,/alignSegmentComponents\(/);
 assert.doesNotMatch(lower,/alignSegment\(foot/);
 assert.doesNotMatch(lower,/foot\.shoe\.position\./);
 assert.doesNotMatch(lower,/foot\.ankleLink\.visible\s*=/);
 assert.match(controller,/stageDirectOperatorPoseOutput\\(r,p,'lower-body',legPose\\)/);
 assert.doesNotMatch(controller,/stageOperatorPoseOutput\(r,p,'lower-body'\)/);
 assert.match(scratch,/legOutput:createOperatorLegPoseScratch\(\)/);
 for(const source of [lower,controller]){
  assert.doesNotMatch(source,/\bstepSession\(/);
  assert.doesNotMatch(source,/requestAnimationFrame\(/);
  assert.doesNotMatch(source,/Math\.random\(/);
 }
});
