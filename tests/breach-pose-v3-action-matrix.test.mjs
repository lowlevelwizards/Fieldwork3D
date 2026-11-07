/** Critical V3 motion matrix: actual rig, supported arm statuses and no aim drift.
 * This is not an aesthetic pass. Screenshot reviews remain a separate gate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MAX_DYNAMIC_ARM_CANDIDATES}
 from '../src/breach-pose-v3-dynamic-arm.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const fixtures=[
 {id:'ar-m4a1',weapon:'carbine',armor:'plate-heavy'},
 {id:'ak-akm',weapon:'rifle',armor:'plate-legacy'},
 {id:'ak-aks74u',weapon:'carbine',armor:'soft-flak'}
];
const scenarios=[
 {name:'ads',aiming:true,aimBlend:1,handlingOverride:'ads'},
 {name:'reload-reach',reload:1.8,reloadDuration:1.8},
 {name:'reload-remove',reload:1.14,reloadDuration:1.8},
 {name:'reload-insert',reload:.4,reloadDuration:1.8},
 {name:'reload-return',reload:.12,reloadDuration:1.8},
 {name:'walk',velocity:25},
 {name:'turn',turning:.5},
 {name:'crouch',posture:'crouch'}
];
const assemble=f=>{
 let equipment=initialEquipmentLoadout(f.weapon);
 equipment=setEquipmentChoice(equipment,'armor',
  f.armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 const w=initialWardrobe();
 const wardrobe={...w,styles:{...w.styles,top:'smock-jacket',
  armorStyle:f.armor,rigStyle:'full-chest'}};
 return {x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,
  posture:'stand',injury:0,weapon:f.weapon,reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,aimBlend:0,
  handlingOverride:'low',deterministic:true,equipment,wardrobe,
  weaponConfiguration:selectWeaponFamilyPreset(
   initialWeaponConfiguration(f.weapon),f.id)};
};
test('V3 3-kit action matrix: preserve weapon authority and mark unsolved arms',()=>{
 let clear=0,unresolved=0;
 const reasons=new Map(),violations=new Map(),examples=[];
 const pairCounts={clear:0,unresolved:0,primaryReach:0,
  primaryClearance:0,supportReach:0,supportClearance:0};
 const posePairExamples=[];
 const acceptedPairs=[];
 const contactBlocks={},contactExcess={};
 for(const fixture of fixtures){
  const base=assemble(fixture);
  const original=createOperatorRig('v3-old-'+fixture.id,'blue',true);
  const candidate=createOperatorRig('v3-new-'+fixture.id,'blue',true);
  const reloadReference=createOperatorRig('v3-reload-idle-'+fixture.id,'blue',true);
  try{
   for(const [i,scenario] of scenarios.entries()){
    const {name,...state}=scenario;
    const pose={...base,...state,seconds:2+i*.21};
    poseOperator(original,pose,0);
    poseOperator(candidate,{...pose,poseV3Preview:true},0);
    if(state.reload>0)poseOperator(reloadReference,
      {...pose,reload:0,poseV3Preview:true},0);
    original.root.updateMatrixWorld(true);
    candidate.root.updateMatrixWorld(true);
    reloadReference.root.updateMatrixWorld(true);
    const visualOrigin=candidate.weapon.getWorldPosition(new THREE.Vector3());
    // Reloads begin from V3's validated idle grip, NOT the older generic
    // renderer. Measure only the temporary reload manipulation relative
    // to that exact starting grip, keeping the same .21 rad cant budget.
    const baseline=state.reload>0?reloadReference:original;
    const baselineOrigin=baseline.weapon.getWorldPosition(new THREE.Vector3());
    const visualRotation=candidate.weapon.getWorldQuaternion(new THREE.Quaternion());
    const baselineRotation=baseline.weapon.getWorldQuaternion(new THREE.Quaternion());
    if(state.reload>0){
     // Only the non-firing reload presentation may cant for magazine access.
     // The ballistic authoritative muzzle remains untouched.
     assert.ok(visualOrigin.distanceTo(baselineOrigin)<4.3,
      fixture.id+'/'+name+': reload receiver exceeds motion budget');
     assert.ok(visualRotation.angleTo(baselineRotation)<.21,
      fixture.id+'/'+name+': reload cant exceeds .21 rad budget');
    }else{
     assert.ok(visualOrigin.distanceTo(baselineOrigin)<1e-6,
      fixture.id+'/'+name+': nonreload world muzzle must be unchanged');
     assert.ok(visualRotation.angleTo(baselineRotation)<1e-6,
      fixture.id+'/'+name+': nonreload world aim must be unchanged');
    }
    const pair=candidate.root.userData.poseV3CoordinatedReport;
    if(pair){
     pairCounts[pair.status]++;
     if(pair.status==='clear')
      acceptedPairs.push({kit:fixture.id,action:name,yaw:pair.yaw,
       leanX:pair.leanX,quality:pair.quality});
     for(const key of ['primaryReach','primaryClearance',
      'supportReach','supportClearance'])
      pairCounts[key]+=(pair.rejects?.[key]??0);
     for(const [region,count] of Object.entries(
       pair.rejects?.contactBlocks??{}))
      contactBlocks[region]=(contactBlocks[region]??0)+count;
     for(const [key,v] of Object.entries(pair.rejects?.contactExcess??{})){
      const prev=contactExcess[key];
      contactExcess[key]=prev?{
       count:prev.count+v.count,min:Math.min(prev.min,v.min),
       max:Math.max(prev.max,v.max),sum:prev.sum+v.sum}:v;
     }
     if(posePairExamples.length<12)posePairExamples.push({
      kit:fixture.id,action:name,
      status:pair.status,yaw:pair.yaw,leanX:pair.leanX,
      candidates:pair.candidates,valid:pair.validCandidates,
      rejects:pair.rejects});
    }
    const reports=candidate.root.userData.poseV3DynamicReport;
    assert.equal(reports?.length,2,fixture.id+'/'+name);
    for(const [armIndex,report] of reports.entries()){
     assert.ok(report.candidates<=MAX_DYNAMIC_ARM_CANDIDATES,
      fixture.id+'/'+name);
     assert.ok(Number.isFinite(report.quality),
      fixture.id+'/'+name+'/'+armIndex);
     assert.ok(Number.isFinite(report.hardDepth),
      fixture.id+'/'+name+'/'+armIndex);
     if(report.status==='clear'){
      clear++;assert.equal(report.reason,'valid');
      assert.equal(candidate.arms[armIndex].outOfReach,false,
       fixture.id+'/'+name+'/'+armIndex);
     }else{
      unresolved++;
      reasons.set(report.reason,(reasons.get(report.reason)??0)+1);
      for(const v of report.violations)
       violations.set(v,(violations.get(v)??0)+1);
      if(examples.length<20)examples.push({
       kit:fixture.id,action:name,arm:armIndex,
       reason:report.reason,violations:report.violations,
       reachError:Number(report.reachError.toFixed(2)),
       hardDepth:Number(report.hardDepth.toFixed(2))});
      assert.equal(report.status,'unresolved');
      assert.ok(['out-of-reach','no-clearance'].includes(report.reason));
     }
    }
   }
  }finally{original.dispose();candidate.dispose();reloadReference.dispose();}
 }
 assert.equal(clear+unresolved,fixtures.length*scenarios.length*2);
 console.log('POSE-V3-ACTION-MATRIX',JSON.stringify({clear,unresolved,
  fixtures:fixtures.length,actions:scenarios.length,
  reasons:Object.fromEntries(reasons),violations:Object.fromEntries(violations),
  pairCounts,acceptedPairs,contactBlocks,contactExcess,
  posePairExamples,examples}));
});

/** B16: small, real-rig time sweep, not synthetic endpoint-only testing.
 * Its output identifies which fitted hard material still blocks each phase;
 * the actual joint fallback remains UNRESOLVED, never silently accepted.
 */
if(process.env.POSE_V3_RELOAD_AUDIT==='1')test('B16 M4A1/AKM magazine corridor is deterministic and physically audited',()=>{
 const frames=[];
 for(const fixture of fixtures.slice(0,2)){
  const base=assemble(fixture);
  const rig=createOperatorRig('v3-corridor-'+fixture.id,'blue',true);
  try{
   for(const progress of [.14,.26,.40,.53,.70,.78,.92]){
    const pose={...base,poseV3Preview:true,seconds:3,
     reload:1.8*(1-progress),reloadDuration:1.8};
    poseOperator(rig,pose,0);
    const pair=rig.root.userData.poseV3CoordinatedReport;
    const arms=rig.root.userData.poseV3DynamicReport;
    assert.ok(pair&&arms?.length===2,fixture.id+'/'+progress);
    const summarize=(arm,side)=>{
     const blockers=Object.entries(pair.rejects.contactExcess??{})
      .filter(([k])=>k.startsWith(side+':')&&k.endsWith(':rigid'))
      .sort((a,b)=>b[1].max-a[1].max).slice(0,3)
      .map(([region,v])=>({region,
       max:Number(v.max.toFixed(3)),count:v.count}));
     return {status:arm.status,reason:arm.reason,
      reach:Number(arm.reachError.toFixed(3)),
      hard:Number(arm.hardDepth.toFixed(3)),blockers};
    };
    frames.push({kit:fixture.id,progress,status:pair.status,
     firing:summarize(arms[1],'firing'),
     support:summarize(arms[0],'support'),
     pairRejections:{
      firing:pair.rejects.primaryClearance+pair.rejects.primaryReach,
      support:pair.rejects.supportClearance+pair.rejects.supportReach
     }});
    for(const arm of arms){
     assert.ok(Number.isFinite(arm.hardDepth));
     assert.ok(Number.isFinite(arm.reachError));
     assert.ok(arm.candidates<=MAX_DYNAMIC_ARM_CANDIDATES);
    }
   }
  }finally{rig.dispose();}
 }
 console.log('POSE-V3-RELOAD-CORRIDOR',JSON.stringify(frames));
});

/** B17 one-time preview audition. Physical acceptance remains the shared V3
 * solver, not a heuristic pose count. Profiles are deterministic through
 * complete reloads and do not touch ballistic or magazine authority.
 */
if(process.env.POSE_V3_CORRIDOR_AUDITION==='1')test('B17 compare compact vs outboard reload corridors on actual rigs',()=>{
 const trial=[];
 for(const fixture of fixtures.slice(0,2)){
  const base=assemble(fixture);
  const rig=createOperatorRig('v3-audition-'+fixture.id,'blue',true);
  try{
   for(const progress of [.14,.26,.40,.53,.70,.78,.92]){
    for(const corridor of ['canonical','compact','outboard']){
     poseOperator(rig,{...base,poseV3Preview:true,
      poseV3ReloadCorridor:corridor,seconds:3,
      reload:1.8*(1-progress),reloadDuration:1.8},0);
     const pair=rig.root.userData.poseV3CoordinatedReport;
     const arms=rig.root.userData.poseV3DynamicReport;
     assert.ok(pair&&arms?.length===2,fixture.id+'/'+corridor+'/'+progress);
     trial.push({kit:fixture.id,progress,corridor,
      pair:pair.status,arms:arms.map(a=>a.status),
      hard:arms.map(a=>Number(a.hardDepth.toFixed(2))),
      reach:arms.map(a=>Number(a.reachError.toFixed(2)))});
    }
   }
  }finally{rig.dispose();}
 }
 console.log('POSE-V3-CORRIDOR-AUDITION',JSON.stringify(trial));
});

/** Only two expensive physically useful cases remain in the fast CI.
 * The full 7x3 B17 audition is opt-in for future path experiments.
 */
test('B17 compact AKM visual fit and strict canonical physical validity',()=>{
 const f=fixtures[1],base=assemble(f);
 const selected=createOperatorRig('v3-ak-compact','blue',true);
 const canonical=createOperatorRig('v3-ak-original','blue',true);
 try{
  for(const progress of [.40,.53]){
   // Active display allows bounded compression; the comparison rig
   // explicitly audits the old strict collision rules.
   const pose={...base,seconds:3,poseV3Preview:true,
    reload:1.8*(1-progress),reloadDuration:1.8};
   poseOperator(selected,pose,0);
   poseOperator(canonical,{...pose,poseV3StrictContact:true,
    poseV3ReloadCorridor:'canonical'},0);
   assert.equal(selected.root.userData.poseV3CoordinatedReport?.status,
    'clear','visual AKM compact '+progress);
   const strict=canonical.root.userData.poseV3CoordinatedReport;
   // The new sewn-armhole proxy may now make the old canonical arc
   // ACTUALLY clear. Reject forbidden overlaps, not improvements.
   assert.ok(['clear','unresolved'].includes(strict?.status),
    'strict status '+progress);
   if(strict?.status==='clear'){
    assert.ok(strict.reports?.every(r=>r.strictContactValid===true&&
      r.relaxedContact===false),
     'strict canonical must have no forbidden contact '+progress);
   }
   assert.ok(selected.root.userData.poseV3DynamicReport
    .every(arm=>arm.status==='clear'));
  }
 }finally{selected.dispose();canonical.dispose();}
});

/** B22: BODY grip on the real magazine, with weapon feed-lips/socket
 * unchanged. The firing arm and strict hard armor tests cannot be bypassed.
 */
if(process.env.POSE_V3_MAG_B22==='1')test('B22 audition magazine-body palm contact on heavy M4A1',()=>{
 const fixture=fixtures[0],base=assemble(fixture);
 const rig=createOperatorRig('v3-m4a1-mag-body','blue',true);
 const results=[];
 try{
  for(const t of [.14,.26,.40,.53,.78]){
   for(const hold of ['baseline','support-high']){
    for(const palm of ['legacy','upper-body','mid-body']){
     poseOperator(rig,{...base,seconds:3,
       poseV3Preview:true,poseV3ReloadHold:hold,
       poseV3ReloadCorridor:'outboard',poseV3MagazinePalm:palm,
       reloadDuration:1.8,reload:1.8*(1-t)},0);
     const pair=rig.root.userData.poseV3CoordinatedReport;
     const arms=rig.root.userData.poseV3DynamicReport;
     assert.ok(pair&&arms?.length===2);
     assert.ok(arms.every(a=>a.candidates<=MAX_DYNAMIC_ARM_CANDIDATES));
     results.push({phase:t,hold,palm,pair:pair.status,
       firing:arms[1].status,support:arms[0].status,
       reach:Number(arms[0].reachError.toFixed(2)),
       hard:Number(arms[0].hardDepth.toFixed(2))});
    }
   }
  }
 }finally{rig.dispose();}
 console.log('POSE-V3-MAG-BODY-B22',JSON.stringify(results));
});
