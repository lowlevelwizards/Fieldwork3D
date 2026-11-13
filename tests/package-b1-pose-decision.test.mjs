/** Package B1: policy parity BEFORE staged pose-output/solver replacement.
 * The golden reference is the already-existing pure directors, not a
 * duplicate new choreographer. No camera, 60Hz motor, or projectile writes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {
 prepareOperatorPoseDecision,resolveOperatorPoseDecision
} from '../src/breach-pose-decision.ts';
import {resolvePoseLocomotionFrame} from '../src/breach-pose-locomotion-frame.ts';
import {directOperatorPose,planUpperBodyStrategy}
 from '../src/breach-pose-director.ts';
import {sampleHandlingTransition}
 from '../src/breach-pose-transition-director.ts';
import {handlingProfile} from '../src/breach-handling-profiles.ts';
import {blendedHandlingProfile} from '../src/breach-handling-transition.ts';
import {shortStockSourceHandling} from '../src/breach-weapon-pose.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {inspectOperatorPoseOutput} from '../src/breach-operator-pose-output.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const base={
 x:12,z:31,seconds:6,heading:.5,travelYaw:.52,
 velocity:0,turning:0,stride:0,posture:'stand',injury:0,
 weapon:'carbine',reload:0,reloadDuration:1.8,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,aimBlend:0,handlingIntent:'hold',
 deterministic:true
};
const ctx={
 downProgress:0,pushActive:false,receivingBash:false,
 previousHandlingAt:-100,previousPose:{x:12,z:31}
};
const rigStub=()=>({
 lastHandling:'low',lastHandlingAt:0,autoHandling:null,
 handlingProfile:handlingProfile('low','carbine'),
 weapon:new THREE.Group(),
 arms:[{bend:new THREE.Vector3(0,-1,-1)},{bend:new THREE.Vector3(0,-1,1)}]
});
const frozen=o=>{
 if(o&&typeof o==='object'&&!Object.isFrozen(o)){
  Object.freeze(o);
  for(const v of Object.values(o))frozen(v);
 }
 return o;
};
const prepare=(extra={},context={})=>{
 const p={...base,...extra},c={...ctx,...context};
 return {p,c,prepared:prepareOperatorPoseDecision(p,c)};
};
const finish=(extra={},context={},modifySample)=>{
 const {p,c,prepared}=prepare(extra,context);
 const sample=sampleHandlingTransition(rigStub(),p,prepared.handling);
 if(modifySample)Object.assign(sample,modifySample);
 return {p,c,prepared,sample,decision:resolveOperatorPoseDecision(p,prepared,sample)};
};

test('B1: prepare uses existing pure locomotion and selects hand owners once',()=>{
 const cases=[
  {name:'hold',p:{}},
  {name:'run',p:{velocity:70,gait:'run',handlingIntent:'run'}},
  {name:'crouch',p:{posture:'crouch',velocity:24}},
  {name:'blocked',p:{blocked:true,velocity:50}},
  {name:'lateral',p:{travelYaw:1.8,velocity:42}},
  {name:'retreat',p:{travelYaw:3.3,velocity:42}},
  {name:'braking',p:{acceleration:-80,velocity:24}},
  {name:'door',p:{handlingIntent:'door',friendlyNear:true}},
  {name:'engage-ads',p:{handlingIntent:'engage',aimBlend:1,aiming:true}},
  {name:'short-obstructed',p:{handlingIntent:'engage',aimBlend:1,obstruction:true}},
  {name:'reload',p:{handlingIntent:'reload',reload:.8}},
  {name:'treatment',p:{handlingOverride:'ads',treatmentActive:true}},
  {name:'throw',p:{lastThrowAt:6}},
  {name:'door-action',p:{lastDoorAt:6,doorPoint:{x:16,y:35}}},
  {name:'down',p:{down:true,reload:1}},
  {name:'surrender',p:{down:true,surrender:true}},
  {name:'injured-guard',p:{injury:2,hitAge:.3,hitRegion:'arm'}},
  {name:'manual-ads',p:{handlingOverride:'ads'}},
  {name:'passive-door-hysteresis',p:{deterministic:false,
   handlingIntent:'door',friendlyNear:true},
   c:{previousHandling:'low',previousHandlingAt:5.95}},
  {name:'deterministic-history-ignore',p:{deterministic:true,
   handlingIntent:'door',friendlyNear:true},
   c:{previousHandling:'low',previousHandlingAt:5.95}}
 ];
 for(const {name,p:changes,c:context} of cases){
  const {p,c,prepared}=prepare(changes,context);
  const referenceMotion=resolvePoseLocomotionFrame(p,c.previousPose);
  const reference=directOperatorPose(p,{
   moving:referenceMotion.moving,downProgress:c.downProgress,
   pushActive:c.pushActive,receivingBash:c.receivingBash,
   previousHandling:c.previousHandling,
   previousHandlingAt:c.previousHandlingAt
  });
  assert.deepEqual(prepared.locomotion,referenceMotion,name+'/locomotion');
  assert.equal(prepared.handling,reference.handling,name+'/handling');
  assert.deepEqual(prepared.action,reference.action,name+'/hands');
 }
});

test('B1: manual and automatic short-stock progress cannot both own weapon blend',()=>{
 for(const [name,delta,expectedManual,expectedWall] of [
  ['explicit', {handlingOverride:'short'},true,false],
  ['wall', {handlingOverride:'short',shortCompression:.42},true,true],
  ['obstructed', {obstruction:true,aiming:true,aimBlend:1},true,false],
  ['reload', {handlingOverride:'short',reload:1},false,false],
  ['throw', {handlingOverride:'short',lastThrowAt:6},false,false],
  ['door', {handlingOverride:'short',lastDoorAt:6,doorPoint:{x:2,y:2}},false,false],
  ['treatment', {handlingOverride:'short',treatmentActive:true},false,false],
  ['surrender', {handlingOverride:'short',surrender:true},false,false],
  ['down', {handlingOverride:'short',down:true},false,false],
  ['unarmed', {handlingOverride:'short',unarmedPreview:true},false,false],
  ['reload-with-wall', {handlingOverride:'short',reload:1,shortCompression:.42},false,true],
  ['ordinary-low', {},false,false]
 ]){
  const {decision}=finish(delta);
  assert.equal(decision.shortStock.manual,expectedManual,name+'/manual');
  assert.equal(decision.shortStock.proximityControlled,expectedWall,name+'/wall');
  if(expectedManual||expectedWall)assert.equal(decision.transition.active,undefined,name);
  if(name==='wall'||name==='reload-with-wall')
   assert.equal(decision.shortStock.rawProgress,expectedManual?.42:undefined,name+'/manual progress');
 }
});

test('B1: short-stock uses exactly the authored Lab phase or proximity source',()=>{
 const p={...base,handlingOverride:'short',poseV3Preview:true};
 const seed=prepareOperatorPoseDecision(p,ctx);
 const auto={
  active:{from:'ready',to:'short',alpha:.33},
  authoredLabSwitch:true,
  profile:handlingProfile('short','carbine')
 };
 const at=resolveOperatorPoseDecision(p,seed,auto);
 assert.equal(at.shortStock.manual,true);
 assert.equal(at.shortStock.rawProgress,.33);
 assert.equal(at.transition.active,undefined);
 assert.equal(at.transition.authoredLabSwitch,false);
 const expected=blendedHandlingProfile(
  shortStockSourceHandling(0,0,'carbine',false),'short',.33,'carbine');
 assert.deepEqual(at.profile,expected);
 const wall={...p,shortCompression:.78};
 const near=resolveOperatorPoseDecision(wall,seed,auto);
 assert.equal(near.shortStock.rawProgress,.78);
 assert.equal(near.shortStock.proximityControlled,true);
 assert.deepEqual(near.profile,blendedHandlingProfile(
  shortStockSourceHandling(0,0,'carbine',false),'short',.78,'carbine'));
 const plain=resolveOperatorPoseDecision(p,seed,{...auto,active:undefined});
 assert.equal(plain.shortStock.rawProgress,1);
});

test('B1: non-short transition and authored Lab switch are never resampled',()=>{
 const ref={from:'low',to:'ads',alpha:.4,authoredFrom:{}};
 const sample={
  active:ref,authoredLabSwitch:true,
  profile:handlingProfile('ads','carbine')
 };
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 const {p,prepared}=prepare({handlingOverride:'ads',poseV3Preview:true,
  weaponConfiguration:config});
 const final=resolveOperatorPoseDecision(p,prepared,sample);
 assert.strictEqual(final.transition.active,ref);
 assert.equal(final.transition.authoredLabSwitch,true);
 assert.strictEqual(final.profile,sample.profile);
 assert.equal(final.upperBody.coupledEligible,false);
 assert.equal(final.upperBody.coordinatedEligible,true,
  'authored Lab destination remains eligible during an authored switch');
});

test('B1: upper body uses the existing strategy gates, once and without new owners',()=>{
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 const cases=[
  {name:'modular-low',delta:{handlingOverride:'low',weaponConfiguration:config}},
  {name:'modular-ads',delta:{handlingOverride:'ads',aiming:true,aimBlend:1,weaponConfiguration:config}},
  {name:'modular-short',delta:{handlingOverride:'short',weaponConfiguration:config}},
  {name:'modular-reload',delta:{handlingOverride:'low',reload:.8,poseV3Preview:true,weaponConfiguration:config}},
  {name:'modular-action',delta:{lastThrowAt:6,poseV3Preview:true,weaponConfiguration:config}},
  {name:'legacy-weapon',delta:{weaponConfiguration:undefined,poseV3Preview:true}},
  {name:'stationary-turn',delta:{turning:.6,poseV3Preview:true,weaponConfiguration:config}},
  {name:'moving-crouch',delta:{posture:'crouch',velocity:24,weaponConfiguration:config}}
 ];
 for(const {name,delta} of cases){
  const {p,prepared,sample,decision}=finish(delta);
  const prior=planUpperBodyStrategy(p,{
   handling:prepared.handling,
   physicalSpeed:prepared.locomotion.physicalSpeed,
   hasModularBuild:!!(p.weaponConfiguration?.weapon===p.weapon&&p.weaponConfiguration.build),
   activeTransition:!!decision.transition.active,
   authoredLabSwitch:decision.transition.authoredLabSwitch,
   interactionWindow:prepared.action.interactionWindow
  });
  assert.deepEqual(decision.upperBody,prior,name);
  assert.deepEqual(decision.action,prepared.action,name+'/no second action selection');
  assert.equal(decision.poseWeight,
   p.handlingOverride&&!p.down&&!p.surrender?1:0,name+'/override weight');
 }
});

test('B1: frozen source facts and transition samples remain immutable',()=>{
 const pose=frozen({...base,posture:'crouch',weapon:'carbine',lastDoorAt:6,
  doorPoint:{x:8,y:10},handlingOverride:'ready'});
 const context=frozen({...ctx,previousPose:{x:11,z:30}});
 const before=JSON.stringify({pose,context});
 const seed=prepareOperatorPoseDecision(pose,context);
 const source=frozen({
  profile:handlingProfile('ready','carbine'),
  active:undefined,authoredLabSwitch:false
 });
 const actual=resolveOperatorPoseDecision(pose,seed,source);
 assert.equal(actual.posture,'crouch');
 assert.equal(actual.injury,pose.injury);
 assert.deepEqual(JSON.parse(before),{pose,context});
 assert.strictEqual(actual.profile,source.profile);
 assert.deepEqual(resolveOperatorPoseDecision(pose,seed,source),actual);
});

test('B1: one decision, one transition sample, one foot scheduler and one final commit',()=>{
 const code=readFileSync(new URL('../src/breach-operator-animation-controller.ts',import.meta.url),'utf8');
 const policy=readFileSync(new URL('../src/breach-pose-decision.ts',import.meta.url),'utf8');
 for(const [name,pattern] of [
  ['prepare',/prepareOperatorPoseDecision\(p,\{/g],
  ['resolve',/resolveOperatorPoseDecision\(p,preparedDecision,sample\)/g],
  ['transition',/sampleHandlingTransition\(r,p,handling\)/g],
  ['contacts',/sampleOperatorFootContacts\(r,p,physicalSpeed,moving,travelYaw\)/g],
  ['commit',/commitOperatorPoseOutput\(r,p\)/g]
 ])assert.equal([...code.matchAll(pattern)].length,1,name);
 assert.ok(code.indexOf('prepareOperatorPoseDecision(p,')<
  code.indexOf('sampleHandlingTransition(r,p,handling)'));
 assert.ok(code.indexOf('sampleHandlingTransition(r,p,handling)')<
  code.indexOf('resolveOperatorPoseDecision(p,preparedDecision,sample)'));
 assert.ok(code.indexOf('resolveOperatorPoseDecision(p,preparedDecision,sample)')<
  code.indexOf('commitOperatorPoseOutput(r,p)'));
 for(const marker of [/stepSession\s*\(/,/requestAnimationFrame\s*\(/,
  /Math\.random\s*\(/,/setInterval\s*\(/,/\.position\.set\s*\(/,
  /\.rotation\.(?:set|copy)\s*\(/,/new WeakMap\s*\(/])
  assert.doesNotMatch(policy,marker,'B1 pure policy must not own clocks or transforms');
 assert.match(code,/const \{profile,upperBody:upperBodyPlan,poseWeight\}=decision/);
 assert.match(code,/const \{action:actionState\}=decision/);
 assert.doesNotMatch(code,/const \{handling,action:actionState\}=preparedDecision/);
 assert.doesNotMatch(code,/planUpperBodyStrategy\s*\(/);
 assert.doesNotMatch(code,/blendedHandlingProfile\s*\(/);
});

test('B1: shared final output remains deterministic through Lab-style poses and seek',()=>{
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 const scenarios=[
  {handlingOverride:'low',weaponConfiguration:config},
  {handlingOverride:'ads',aiming:true,aimBlend:1,weaponConfiguration:config},
  {handlingOverride:'short',shortCompression:.72,weaponConfiguration:config},
  {handlingOverride:'ready',reload:.7,poseV3Preview:true,
   poseV4ReloadPreview:true,weaponConfiguration:config},
  {down:true,downProgress:.64},
  {surrender:true,downProgress:.5},
  {posture:'crouch',velocity:26}
 ];
 for(const [index,extra] of scenarios.entries()){
  const a=createOperatorRig('b1-'+index,'blue',true);
  const b=createOperatorRig('b1-'+index,'blue',true);
  try{
   const p={...base,...extra,seconds:7.5,poseV3Preview:true,deterministic:true};
   poseOperator(a,p,0);poseOperator(b,{...p},0);
   const shot=r=>Object.fromEntries(inspectOperatorPoseOutput(r).slots.map(x=>
    [x.id,Array.from(x.values)]));
   const first=shot(a);
   assert.deepEqual(first,shot(b),'fresh identical rigs must agree: '+index);
   poseOperator(a,{...p,seconds:11},0);
   poseOperator(a,p,0);
   assert.deepEqual(shot(a),first,'seek must restore deterministic sample: '+index);
  }finally{a.dispose();b.dispose();}
 }
});

test('B1: overlapping treatment, reload, throw, door, injury and down retain one hand-action priority',()=>{
 const overlap={reload:.8,lastThrowAt:6,lastDoorAt:6,
  doorPoint:{x:10,y:10},treatmentActive:true};
 const cases=[
  {name:'treatment',delta:overlap,owner:'treatment'},
  {name:'reload',delta:{...overlap,treatmentActive:false},owner:'reload'},
  {name:'throw',delta:{...overlap,treatmentActive:false,reload:0},owner:'throw'},
  {name:'door',delta:{lastDoorAt:6,doorPoint:{x:10,y:10}},owner:'door'},
  {name:'injury',delta:{injury:2,hitRegion:'arm',hitAge:.22},owner:'injury'},
  {name:'down',delta:{...overlap,down:true},ctx:{downProgress:.7},owner:'down'},
  {name:'surrender',delta:{...overlap,surrender:true},ctx:{downProgress:.7},owner:'surrender'},
  {name:'push',delta:{},ctx:{pushActive:true},owner:'push'}
 ];
 for(const {name,delta,ctx:extra,owner} of cases){
  const {prepared,decision}=finish(delta,extra);
  assert.equal(decision.action.handOwners.action,owner,name);
  assert.deepEqual(decision.action,prepared.action,name+'/one action reader');
 }
});

test('B1: V3/V4, strict contact, unarmed and emergency reload eligibility remain opt-in',()=>{
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('carbine'),'ar-m4a1');
 const common={weaponConfiguration:config,handlingOverride:'low'};
 const preview=finish({...common,poseV3Preview:true,poseV4ReloadPreview:true,reload:.8});
 assert.equal(preview.decision.upperBody.previewReloadSeed,true);
 assert.equal(preview.decision.upperBody.coupledEligible,false,
  'custom high/low poses must not be replaced by the old coupled solver');
 assert.equal(preview.decision.upperBody.supportEligible,false,
  'reload must release support arm');
 const legacy=finish({...common,poseV3Preview:false,reload:.8});
 assert.equal(legacy.decision.upperBody.previewReloadSeed,false);
 assert.equal(legacy.decision.upperBody.coupledEligible,false);
 assert.equal(legacy.decision.upperBody.coordinatedEligible,false);
 const withStrict=finish({...common,poseV3Preview:true,poseV3StrictContact:true});
 const withoutStrict=finish({...common,poseV3Preview:true});
 assert.deepEqual(withStrict.decision.upperBody,withoutStrict.decision.upperBody,
  'strict contact is a solver constraint, not a second strategy authority');
 const unarmed=finish({...common,poseV3Preview:true,
  handlingOverride:'ads',unarmedPreview:true});
 assert.equal(unarmed.decision.upperBody.coordinatedEligible,false);
 const short=finish({...common,poseV3Preview:true,handlingOverride:'short'});
 assert.equal(short.decision.upperBody.coordinatedEligible,false);
 assert.equal(short.decision.upperBody.supportEligible,true);
 assert.equal(short.decision.shortStock.manual,true);
});

test('B1: deterministic replay decisions ignore passive handling history on seeks',()=>{
 const p={...base,handlingIntent:'door',friendlyNear:true,deterministic:true};
 const contexts=[
  {...ctx,previousHandling:'low',previousHandlingAt:5.999,
   previousPose:{x:11,z:30}},
  {...ctx,previousHandling:'ready',previousHandlingAt:2,
   previousPose:{x:200,z:300}}
 ];
 const a=contexts.map(c=>prepareOperatorPoseDecision(p,c));
 assert.equal(a[0].handling,'high');
 assert.equal(a[1].handling,'high');
 assert.deepEqual(a[0].action,a[1].action);
 const decisions=a.map(seed=>resolveOperatorPoseDecision(p,seed,{
  active:undefined,authoredLabSwitch:false,
  profile:handlingProfile('high','carbine')
 }));
 assert.equal(decisions[0].handling,decisions[1].handling);
 assert.deepEqual(decisions[0].upperBody,decisions[1].upperBody);
 assert.deepEqual(decisions[0].transition,decisions[1].transition);
});
