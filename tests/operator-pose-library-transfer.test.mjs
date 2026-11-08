import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {weaponWorkbenchContacts,cloneWorkbenchPose,
 applyWorkbenchPose} from '../src/operator-pose-workbench.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {
 AUTHORED_SHORT_REFERENCES,PRESET_CATALOG,PRESET_IDS,
 newPoseLibrary,applyToAllWeapons,referenceForPreset,
 specForPreset,transferPoseToWeapon,parsePoseLibrary
} from '../src/operator-pose-library.ts';
const round=(v)=>Math.round(v*1000)/1000;
const wristGap=(p,side)=>{
 const fit=weaponWorkbenchContacts(p,specForPreset(p.preset).configuration);
 return new THREE.Vector3(...p.targets[side+'Hand']).distanceTo(fit[side]);
};
test('reference recipes retain user XYZ with full precision across JSON',()=>{
 const m=AUTHORED_SHORT_REFERENCES['ar-m4a1'],
   a=AUTHORED_SHORT_REFERENCES['ak-akm'];
 assert.deepEqual(m.targets.stock,[-9.2,-3.1,9.5]);
 assert.deepEqual(m.targets.supportHand,
  [9.65443922690596,-8.220156243484727,4.960267438360026]);
 assert.deepEqual(m.weaponRotation,[3,8,-13]);
 assert.deepEqual(a.targets.stock,[-6.3,-3.8,8.8]);
 assert.deepEqual(a.targets.supportShoulder,[4.8,3.6,-6.5]);
 assert.deepEqual(a.targets.firingShoulder,
  [1.120000000000001,3.94,6.899999999999999]);
 assert.deepEqual(a.targets.supportHand,
  [13.778785492332526,-10.614421882537883,6.303289452161966]);
 assert.deepEqual(a.targets.firingHand,
  [.4996208344622355,-10.33299085695294,9.383907501678461]);
 assert.deepEqual(a.targets.supportElbow,[11.3,-6,-3.690078005608802]);
 assert.deepEqual(a.targets.firingElbow,
  [-6.8,-3.9832426172006907,12.294615103017726]);
 assert.deepEqual(a.weaponRotation,[13,-2,-16]);
 assert.deepEqual(a.torso,m.torso);
 assert.deepEqual(parsePoseLibrary(JSON.stringify(newPoseLibrary())),
  newPoseLibrary());
});
test('catalog includes all modular families with correct actual weapon class',()=>{
 assert.ok(PRESET_CATALOG.length>=30);
 assert.equal(PRESET_IDS.size,PRESET_CATALOG.length);
 for(const p of PRESET_CATALOG){
  const spec=specForPreset(p.id);
  assert.equal(spec.weapon,p.weapon,'bad platform '+p.id);
  if(p.id!=='shotgun')assert.ok(spec.configuration?.build,
   'no actual geometry build for '+p.id);
 }
 assert.equal(specForPreset('ar-m16a1').weapon,'rifle',
  'M16 is not a legacy carbine just because prefix is ar-');
 assert.equal(specForPreset('ak-aks74u').weapon,'carbine',
  'compact AK has carbine class, not generic rifle');
 assert.equal(referenceForPreset('ak-ak74m').preset,'ak-akm');
 assert.equal(referenceForPreset('ar-mk18').preset,'ar-m4a1');
 assert.equal(referenceForPreset('hk-g3a4').preset,'ak-akm');
 assert.throws(()=>specForPreset('not-a-weapon'),/Unknown/);
});
test('grip-aware transfer changes stock, wrists and elbow guides per weapon',()=>{
 const source=AUTHORED_SHORT_REFERENCES['ar-m4a1'];
 for(const id of ['ar-m16a2','ar-mk18','hk-mp5a3','hk-mp5k',
  'ak-aks74u','ak-rpk74','shotgun']){
  const transferred=transferPoseToWeapon(source,id);
  const info=specForPreset(id);
  assert.equal(transferred.weapon,info.weapon);
  assert.equal(transferred.preset,id);
  assert.deepEqual(transferred.torso,source.torso);
  assert.deepEqual(transferred.weaponRotation,source.weaponRotation);
  assert.ok(transferred.targets.stock.every(Number.isFinite));
  assert.ok(transferred.targets.firingHand.every(Number.isFinite));
  assert.ok(transferred.targets.supportElbow.every(Number.isFinite));
  assert.ok(wristGap(transferred,'firing')<=3.001,
   'firing grip residual exceeds bound for '+id);
  assert.ok(wristGap(transferred,'support')<=3.001,
   'support grip residual exceeds bound for '+id);
  assert.ok(!Object.is(transferred.targets.stock,source.targets.stock));
  const old=JSON.stringify(source);
  transferred.targets.stock[0]+=2;
  assert.equal(JSON.stringify(source),old,'mutated source '+id);
 }
 const same=transferPoseToWeapon(source,'ar-m4a1');
 assert.deepEqual(same,source);
 assert.notEqual(same,source);
});
test('apply-to-all seeds each preset while keeping manually sculpted edits',()=>{
 const library=newPoseLibrary();
 const first=applyToAllWeapons(library,'references');
 assert.equal(first.created,PRESET_CATALOG.length-2);
 assert.equal(first.skipped,2);
 assert.equal(Object.keys(library.entries).length,PRESET_CATALOG.length);
 assert.equal(library.entries['ak-akm'].quality,'reference');
 assert.equal(library.entries['ar-m4a1'].quality,'reference');
 assert.equal(library.entries['ak-ak74m'].from,'ak-akm');
 assert.equal(library.entries['ar-mk18'].from,'ar-m4a1');
 const draft=library.entries['ar-m16a1'];
 const revision=cloneWorkbenchPose(draft.pose);
 revision.targets.supportElbow[1]-=3.4;
 library.entries['ar-m16a1']={pose:revision,quality:'tuned'};
 const snapshot=JSON.stringify(library.entries['ar-m16a1']);
 const later=applyToAllWeapons(library,
  AUTHORED_SHORT_REFERENCES['ak-akm'],true);
 assert.ok(later.created>1);
 assert.equal(library.entries['ar-m16a1'].quality,'tuned');
 assert.equal(JSON.stringify(library.entries['ar-m16a1']),snapshot);
 assert.deepEqual(library.entries['ak-akm'].pose,
  AUTHORED_SHORT_REFERENCES['ak-akm']);
 assert.deepEqual(library.entries['ar-m4a1'].pose,
  AUTHORED_SHORT_REFERENCES['ar-m4a1']);
 const serialized=JSON.stringify(library);
 const imported=parsePoseLibrary(serialized);
 assert.deepEqual(imported,library);
 assert.throws(()=>parsePoseLibrary(JSON.stringify({
  ...library,entries:{'fake-weapon':draft}
 })),/Unknown pose entry/);
 assert.throws(()=>parsePoseLibrary(JSON.stringify({
  ...library,entries:{'ak-akm':{pose:
   {...library.entries['ak-akm'].pose,weapon:'smg'},quality:'tuned'}}
 })),/mismatch/);
});
test('generated drafts remain finite under real fixed-length arm IK',()=>{
 const rig=createOperatorRig('library-transfer-drafts','blue');
 try{
  for(const preset of ['ar-m4a1','ak-akm','ar-m16a1','ak-aks74u',
    'hk-mp5a3','hk-g3a4','shotgun']){
   const base=referenceForPreset(preset);
   const sample=transferPoseToWeapon(base,preset);
   const report=applyWorkbenchPose(rig,sample,
    specForPreset(preset).configuration);
   assert.ok(Number.isFinite(report.maxReachError),preset);
   assert.ok(Number.isFinite(report.maxContactGap),preset);
   for(const arm of rig.arms){
    assert.ok(Math.abs(arm.upper.scale.y-10)<1e-5,preset);
    assert.ok(Math.abs(arm.lower.scale.y-10)<1e-5,preset);
   }
  }
 }finally{rig.dispose();}
});
test('mobile editor exposes batch, per-preset tuning and export controls',()=>{
 const html=readFileSync(new URL('../pose-workbench.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../src/operator-pose-workbench-ui.ts',import.meta.url),'utf8');
 for(const id of ['wbApplyAll','wbTransferSelected','wbCaptureSource',
  'wbLibraryStats','wbPrev','wbNext','wbExportLibrary','wbSaveLibrary',
  'wbLoadLibrary','wbReplaceGenerated','wbPresetStatus'])
  assert.match(html,new RegExp('id="'+id+'"'),id);
 assert.match(script,/renderLibraryStatus/);
 assert.match(script,/storeEdited\(true\)/);
 assert.match(script,/applyToAllWeapons/);
 assert.match(script,/parsePoseLibrary/);
 assert.match(script,/PRESET_CATALOG/);
 assert.doesNotMatch(script,/solveUnifiedFallbackArm|weaponClearance/);
});
