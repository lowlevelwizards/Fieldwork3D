/** Package B8 final golden closeout. CPU wall time is deliberately NOT
 * asserted: speed results are observational, parity is a hard gate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {createOperatorPoseScratch} from '../src/breach-operator-pose-scratch.ts';
import {operatorPoseScratchForRig}
 from '../src/breach-operator-animation-frame.ts';
import {inspectOperatorPoseOutput,OPERATOR_POSE_STAGE_ORDER}
 from '../src/breach-operator-pose-output.ts';
import {captureWorkbenchPose,applyWorkbenchPose}
 from '../src/operator-pose-workbench.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const families=['carbine','rifle','smg','shotgun'];
const presets=['ar-m4a1','ak-akm','hk-mp5a3'];
const cfg=presets.map((id,i)=>selectWeaponFamilyPreset(
 initialWeaponConfiguration(families[i]),id));
const sample=(i,seconds,changes={})=>({
 x:i*14,z:i*4,heading:i*.19,travelYaw:i*.19,
 velocity:0,seconds,stride:.2,
 posture:'stand',injury:0,weapon:families[i%4],
 weaponConfiguration:cfg[i%4],
 reload:0,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
 down:false,surrender:false,aiming:false,firing:false,turning:0,
 poseV3Preview:true,poseV4ReloadPreview:true,
 poseDiagnostics:false,deterministic:true,...changes
});
const values=node=>[
 node.position.x,node.position.y,node.position.z,
 node.quaternion.x,node.quaternion.y,node.quaternion.z,node.quaternion.w,
 node.scale.x,node.scale.y,node.scale.z,node.visible?1:0
];
const close=(left,right,label,tol=2e-10)=>{
 assert.equal(left.length,right.length,label+' length');
 for(let j=0;j<left.length;j++)
  assert.ok(Math.abs(left[j]-right[j])<=tol,
    label+'['+j+'] actual '+left[j]+' expected '+right[j]);
};
const frame=rig=>{
 const output=inspectOperatorPoseOutput(rig);
 assert.ok(output?.valid);
 return Object.fromEntries(output.slots.map(s=>[s.id,[...s.values]]));
};
const replayFeet=(i)=>[
 {position:{x:i*14,y:-6},worldYaw:0,height:0,pitch:0,
  contact:true,phase:'planted',progress:1},
 {position:{x:i*14,y:6},worldYaw:0,height:0,pitch:0,
  contact:true,phase:'planted',progress:1}
];

test('B8: old and new torso-assist quaternion geometry matches at sampled angles',()=>{
 const scratch=createOperatorPoseScratch();
 const fromVector=scratch.v3LeanOffset;
 const leanQ=scratch.v3LeanRotation;
 const fromQ=scratch.poseBlendFrom,toQ=scratch.poseBlendTo;
 for(let n=0;n<128;n++){
  const a=new THREE.Euler(Math.sin(n*.16)*.8,
   Math.cos(n*.23)*1.5,Math.sin(n*.31)*.6,'XYZ');
  const b=new THREE.Euler(Math.sin(n*.19+.7)*.8,
   Math.cos(n*.26+.2)*1.5,Math.sin(n*.11+.4)*.6,'XYZ');
  const t=(n%17)/16,lean=Math.sin(n*.43)*4.7;
  const previous=new THREE.Vector3(lean,0,0)
   .applyQuaternion(new THREE.Quaternion().setFromEuler(b));
  const direct=fromVector.set(lean,0,0)
   .applyQuaternion(leanQ.setFromEuler(b));
  close(direct.toArray(),previous.toArray(),'torso '+n);
  const oldQ=new THREE.Quaternion().setFromEuler(a)
   .slerp(new THREE.Quaternion().setFromEuler(b),t);
  const newQ=fromQ.setFromEuler(a).slerp(toQ.setFromEuler(b),t);
  close(newQ.toArray(),oldQ.toArray(),'blend '+n);
  const oldEuler=new THREE.Euler().setFromQuaternion(oldQ,'XYZ');
  const newEuler=new THREE.Euler().setFromQuaternion(newQ,'XYZ');
  close([newEuler.x,newEuler.y,newEuler.z],
   [oldEuler.x,oldEuler.y,oldEuler.z],'Euler '+n);
 }
 assert.strictEqual(scratch.v3LeanOffset,fromVector);
 assert.strictEqual(scratch.v3LeanRotation,leanQ);
 assert.strictEqual(scratch.poseBlendFrom,fromQ);
 assert.strictEqual(scratch.poseBlendTo,toQ);
});

test('B8: direct six-stage output stays complete and stable with 2/8/16 live operators',()=>{
 assert.deepEqual(OPERATOR_POSE_STAGE_ORDER,
  ['lower-body','upper-body','frame','body','weapon','attachments']);
 for(const count of [2,8,16]){
  const rigs=Array.from({length:count},(_,i)=>
   createOperatorRig('b8-parity-'+count+'-'+i,'blue',true));
  try{
   const snapshots=[];
   for(let i=0;i<count;i++){
    const rig=rigs[i];
    poseOperator(rig,sample(i,1),0);
    const output=inspectOperatorPoseOutput(rig);
    assert.equal(output.slotCount,30);
    assert.equal(output.generation,1);
    assert.equal(new Set(output.slots.map(s=>s.id)).size,30);
    assert.ok(output.slots.every(s=>
     s.values.length===11&&s.values.every(Number.isFinite)));
    const typed=output.slots.map(s=>s.values);
    const owners=Object.fromEntries(OPERATOR_POSE_STAGE_ORDER.map(name=>
      [name,output.slots.filter(s=>s.owner===name).length]));
    assert.deepEqual(owners,{'lower-body':8,'upper-body':6,
     frame:2,body:3,weapon:2,attachments:9});
    snapshots.push({output,typed});
   }
   for(let tick=0;tick<7;tick++)for(let i=0;i<count;i++){
    const changes=tick===1?{posture:'crouch',velocity:20}:
     tick===2?{handlingOverride:'short',aimBlend:.5}:
     tick===3?{aiming:true,aimBlend:1,handlingOverride:'ads'}:
     tick===4?{reload:.65,reloadMode:'emergency'}:
     tick===5?{down:true,downProgress:.82,downPose:'left'}:
     tick===6?{surrender:true,downProgress:1}:{
       velocity:32,stride:.4
     };
    poseOperator(rigs[i],sample(i,2+tick*.1,changes),1/60);
   }
   for(let i=0;i<count;i++){
    const rig=rigs[i],out=inspectOperatorPoseOutput(rig);
    assert.strictEqual(out,snapshots[i].output);
    assert.equal(out.generation,8);
    out.slots.forEach((s,j)=>{
     assert.strictEqual(s.values,snapshots[i].typed[j]);
     close(s.values,values(s.node),'rig '+i+' '+s.id,1e-8);
    });
    if(i>0)assert.notStrictEqual(
      out.slots[0].values,snapshots[0].typed[0],
      'two actors cannot share published typed arrays');
   }
  }finally{
   rigs.forEach(r=>r.dispose());
   rigs.forEach(r=>assert.equal(inspectOperatorPoseOutput(r),null));
  }
 }
});

test('B8: deterministic rewind and repeated timestamp keep all thirty pose slots',()=>{
 const a=createOperatorRig('b8-seek','blue',true);
 const b=createOperatorRig('b8-seek','blue',true);
 try{
  const one=sample(1,3.5,{replayFeet:replayFeet(1),
   handlingOverride:'low',aimBlend:.2});
  poseOperator(a,one,0);poseOperator(b,one,0);
  const saved=frame(a);
  poseOperator(a,sample(1,9.2,{replayFeet:replayFeet(1),
   reload:.4,posture:'crouch'}),1/60);
  poseOperator(a,one,-1);
  const restored=frame(a);
  for(const [id,original] of Object.entries(saved))
   close(restored[id],original,'rewind '+id,1e-7);
  poseOperator(a,one,0);
  for(const [id,original] of Object.entries(saved))
   close(frame(a)[id],original,'repeat '+id,1e-7);
  assert.deepEqual(frame(b),saved,'other rig must remain unchanged');
 }finally{a.dispose();b.dispose();}
});

test('B8: authored Workbench and tactical rebase still share one commit and scratch',()=>{
 const r=createOperatorRig('b8-workbench','blue',true);
 const c=createOperatorRig('b8-workbench','blue',true);
 try{
  const input=sample(0,1,{poseV3Preview:false,poseV4ReloadPreview:false});
  poseOperator(r,input,0);poseOperator(c,input,0);
  const stored=operatorPoseScratchForRig(r);
  const recipe=captureWorkbenchPose(r,'carbine','ar-m4a1',cfg[0]);
  recipe.targets.stock[0]-=4;
  recipe.targets.supportElbow=[12,-8,-12];
  const before=inspectOperatorPoseOutput(r).generation;
  const lastTime=r.lastTime,lastPose=r.lastPose;
  applyWorkbenchPose(r,recipe,cfg[0]);
  assert.strictEqual(operatorPoseScratchForRig(r),stored);
  assert.equal(inspectOperatorPoseOutput(r).generation,before+1);
  assert.equal(r.lastTime,lastTime);
  assert.strictEqual(r.lastPose,lastPose);
  poseOperator(r,sample(0,2,{poseV3Preview:false,
   poseV4ReloadPreview:false}),0);
  poseOperator(c,sample(0,2,{poseV3Preview:false,
   poseV4ReloadPreview:false}),0);
  for(const [id,expected] of Object.entries(frame(c)))
   close(frame(r)[id],expected,'authored rebase '+id,1e-8);
 }finally{r.dispose();c.dispose();}
});

test('B8: disposing a rig evicts both committed output and large pose scratch',()=>{
 const rig=createOperatorRig('b8-dispose','blue',true);
 poseOperator(rig,sample(0,1),0);
 const original=operatorPoseScratchForRig(rig);
 assert.ok(inspectOperatorPoseOutput(rig)?.valid);
 rig.dispose();
 assert.equal(inspectOperatorPoseOutput(rig),null);
 const fresh=operatorPoseScratchForRig(rig);
 assert.notStrictEqual(fresh,original,'disposed rig must not retain IK scratch');
 assert.notStrictEqual(fresh.frameOutput.root,original.frameOutput.root);
});

test('B8: no second pose authority, no hot-path transient torso objects, no CPU FPS gate',()=>{
 const src=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
 const controller=src('src/breach-operator-animation-controller.ts'),
  scratch=src('src/breach-operator-pose-scratch.ts'),
  frame=src('src/breach-operator-animation-frame.ts'),
  rig=src('src/breach-operator-rig.ts'),
  workbench=src('src/operator-pose-workbench.ts'),
  bench=src('scripts/bench-operator-pose-pipeline.mjs'),
  pkg=JSON.parse(src('package.json'));
 assert.equal((controller.match(/commitOperatorPoseOutput\(r,p\)/g)??[]).length,1);
 for(const owner of OPERATOR_POSE_STAGE_ORDER){
  assert.match(controller,new RegExp(
    "stageDirectOperatorPoseOutput\\(r,p,'"+owner+"'"));
  assert.doesNotMatch(controller,new RegExp(
    "stageOperatorPoseOutput\\(r,p,'"+owner+"'"));
 }
 assert.match(controller,/scratch\.v3LeanOffset\.set\(result\.leanX,0,0\)/);
 assert.match(controller,/scratch\.v3LeanRotation\.setFromEuler\(/);
 assert.match(controller,/scratch\.poseBlendFrom\.setFromEuler\(/);
 assert.match(controller,/scratch\.poseBlendTo\.setFromEuler\(/);
 assert.doesNotMatch(controller,/new THREE\.Vector3\(result\.leanX,0,0\)/);
 assert.doesNotMatch(controller,/new THREE\.Quaternion\(\)\.setFromEuler\(from\.rotation\)/);
 assert.match(scratch,/poseBlendFrom:new THREE\.Quaternion\(\)/);
 assert.match(frame,/export function releaseOperatorAnimationFrame\(r:OperatorRig\)/);
 assert.match(rig,/releaseOperatorAnimationFrame\(rig\)/);
 assert.match(workbench,/commitOperatorPoseOutput\(rig,outputInput\)/);
 assert.equal(pkg.scripts['bench:operator-pose'],
  'node --experimental-strip-types scripts/bench-operator-pose-pipeline.mjs');
 for(const phrase of ['action-transitions','replay-seek','manual-workbench',
  '--quick','2,8,16','medianMsPerPose','p95MsPerPose',
  'NO timing','NOT a GPU FPS'])
  assert.ok(bench.includes(phrase)||phrase==='NO timing'&&
   bench.includes('no absolute timing'),
    'Benchmark must retain observational '+phrase+' evidence');
 assert.doesNotMatch(bench,/requestAnimationFrame\(/);
 assert.doesNotMatch(bench,/fpsBudget|assert\..*medianMsPerPose/);
});
