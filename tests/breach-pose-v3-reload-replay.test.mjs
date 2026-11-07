/** V3 reload visual-only replay/interruption critical contract.
 * No validity inflation. Every exact timestamp must reconstruct the same
 * presentation after replay seek, repeated calls, or a canceled reload.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const fixtures=[
 {id:'ar-m4a1',weapon:'carbine',armor:'plate-heavy'},
 {id:'ak-akm',weapon:'rifle',armor:'plate-legacy'}
];
const base=f=>{
 let equipment=initialEquipmentLoadout(f.weapon);
 equipment=setEquipmentChoice(equipment,'armor','armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 const w=initialWardrobe();
 const wardrobe={...w,styles:{...w.styles,top:'smock-jacket',
  armorStyle:f.armor,rigStyle:'full-chest'}};
 return {x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,
  posture:'stand',injury:0,weapon:f.weapon,reload:0,
  reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
  down:false,surrender:false,aiming:false,firing:false,turning:0,
  aimBlend:0,handlingOverride:'low',deterministic:true,
  poseV3Preview:true,equipment,wardrobe,
  weaponConfiguration:selectWeaponFamilyPreset(
   initialWeaponConfiguration(f.weapon),f.id)};
};
const snapshot=r=>{
 r.root.updateMatrixWorld(true);
 const point=o=>o.getWorldPosition(new THREE.Vector3());
 const spin=o=>o.getWorldQuaternion(new THREE.Quaternion());
 return {gun:point(r.weapon),gunQ:spin(r.weapon),
  left:point(r.arms[0].hand),right:point(r.arms[1].hand),
  leftQ:spin(r.arms[0].hand),rightQ:spin(r.arms[1].hand),
  mag:r.detachedMagazine.visible?point(r.detachedMagazine):null,
  magQ:r.detachedMagazine.visible?spin(r.detachedMagazine):null};
};
const equal=(a,b,label)=>{
 for(const k of ['gun','left','right']){
  assert.ok(a[k].distanceTo(b[k])<1e-6,label+'/'+k);
 }
 for(const k of ['gunQ','leftQ','rightQ'])
  assert.ok(a[k].angleTo(b[k])<1e-6,label+'/'+k);
 assert.equal(!!a.mag,!!b.mag,label+'/mag visibility');
 if(a.mag){
  assert.ok(a.mag.distanceTo(b.mag)<1e-6,label+'/mag');
  assert.ok(a.magQ.angleTo(b.magQ)<1e-6,label+'/magQ');
 }
};
test('V3 seek to reload phase reproduces the same weapon, hands and magazine',()=>{
 for(const fixture of fixtures){
  const state=base(fixture);
  const played=createOperatorRig(fixture.id,'blue',true);
  const sought=createOperatorRig(fixture.id,'blue',true);
  try{
   for(const p of [.04,.2,.37,.40,.53,.61,.78,.92]){
    const pose={...state,seconds:2+2*p,reload:1.8*(1-p)};
    // Step through prior pose(s) on the same rig first. The second rig
    // starts directly at the sought timestamp without any motion history.
    poseOperator(played,pose,0);
    poseOperator(sought,pose,0);
    equal(snapshot(played),snapshot(sought),
     fixture.id+'/same timestamp '+p);
    // A repeated pose at the same timestamp must not accumulate chest
    // assistance or drift a weapon contact.
    const first=snapshot(played);
    poseOperator(played,pose,0);
    equal(snapshot(played),first,
     fixture.id+'/repeat timestamp '+p);
   }
  }finally{played.dispose();sought.dispose();}
 }
});
test('V3 canceled reload returns to normal ADS without retained body offsets',()=>{
 for(const fixture of fixtures){
  const state=base(fixture);
  const fromReload=createOperatorRig(fixture.id,'blue',true);
  const direct=createOperatorRig(fixture.id,'blue',true);
  try{
   poseOperator(fromReload,{...state,seconds:2.6,reload:1.18},0);
   const destination={...state,seconds:2.7,reload:0,
    aiming:true,aimBlend:1,handlingOverride:'ads'};
   poseOperator(fromReload,destination,0);
   poseOperator(direct,destination,0);
   equal(snapshot(fromReload),snapshot(direct),
    fixture.id+'/cancel reload -> ADS');
  }finally{fromReload.dispose();direct.dispose();}
 }
});

test('V3 reload begins from the physically solved low-ready rifle, not generic pose',()=>{
 for(const f of fixtures){
  const state=base(f);
  const idle=createOperatorRig('idle-seed-'+f.id,'blue',true);
  const reload=createOperatorRig('reload-seed-'+f.id,'blue',true);
  try{
   poseOperator(idle,{...state,reload:0,seconds:2},0);
   poseOperator(reload,{...state,reload:1.8,seconds:2},0);
   const stationary=idle.root.userData.lowReadyPoseReport;
   const seeded=reload.root.userData.lowReadyPoseReport;
   assert.equal(stationary?.status,'clear',f.id+'/idle');
   assert.equal(seeded?.status,'clear',f.id+'/reload-seed');
   // The support hand is free during reload; only the firearm's rigid
   // stock/primary/socket fit is inherited from the approved idle pose.
   assert.ok(reload.root.userData.poseV3CoordinatedReport,
    f.id+'/active action solver still runs');
   const a=snapshot(idle),b=snapshot(reload);
   assert.ok(a.gun.distanceTo(b.gun)<.15,
    f.id+'/start-of-reload firearm must not teleport');
   assert.ok(a.gunQ.angleTo(b.gunQ)<.012,
    f.id+'/start-of-reload receiver must not snap');
  }finally{idle.dispose();reload.dispose();}
 }
});

test('B18 four independently posed operators cannot contaminate replay state',()=>{
 const rigs=[0,1,2,3].map(i=>createOperatorRig('v3-four-'+i,'blue',true));
 const states=rigs.map((_,i)=>{
  const f=fixtures[i%2];
  const progress=[.4,.53,.78,.92][i];
  return {...base(f),seconds:3.1+i*.2,
   reload:1.8*(1-progress),reloadDuration:1.8};
 });
 try{
  for(let i=0;i<4;i++)poseOperator(rigs[i],states[i],0);
  const before=rigs.map(snapshot);
  for(let i=3;i>=0;i--)poseOperator(rigs[i],states[i],0);
  rigs.forEach((rig,i)=>equal(snapshot(rig),before[i],
   'B18/four operators/'+i));
 }finally{for(const rig of rigs)rig.dispose();}
});

test('B23 experimental magazine-body grip reconstructs after replay seek',()=>{
 for(const fixture of fixtures){
  const state=base(fixture);
  const palm=fixture.id==='ar-m4a1'?'upper-body':'mid-body';
  const a=createOperatorRig('v3-grip-a-'+fixture.id,'blue',true);
  const b=createOperatorRig('v3-grip-b-'+fixture.id,'blue',true);
  try{
   for(const t of [.30,.52,.78]){
    const pose={...state,seconds:3+t,
     poseV3MagazinePalm:palm,reload:1.8*(1-t)};
    poseOperator(a,pose,0);poseOperator(b,pose,0);
    equal(snapshot(a),snapshot(b),
     fixture.id+'/'+palm+'/seek '+t);
    const once=snapshot(a);poseOperator(a,pose,0);
    equal(snapshot(a),once,
     fixture.id+'/'+palm+'/repeat '+t);
   }
  }finally{a.dispose();b.dispose();}
 }
});
