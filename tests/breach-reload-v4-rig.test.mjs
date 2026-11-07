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
 {id:'ar-m4a1',weapon:'carbine',armor:'plate-heavy',
  mechanism:'ar-bolt-catch'},
 {id:'ak-akm',weapon:'rifle',armor:'plate-legacy',
  mechanism:'ak-rocking'},
 {id:'hk-mp5a3',weapon:'smg',armor:'plate-heavy',
  mechanism:'hk-roller'}
];
const create=(f,t,mode='emergency')=>{
 let equipment=initialEquipmentLoadout(f.weapon);
 equipment=setEquipmentChoice(equipment,'armor','armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 const wardrobe=initialWardrobe();
 return {x:0,z:0,heading:0,velocity:0,seconds:3+t,stride:0,
  posture:'stand',injury:0,weapon:f.weapon,
  reload:1.8*(1-t),reloadDuration:1.8,reloadMode:mode,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,aimBlend:0,
  handlingOverride:'low',deterministic:true,poseV3Preview:true,
  equipment,wardrobe:{...wardrobe,styles:{...wardrobe.styles,
    top:'smock-jacket',armorStyle:f.armor,rigStyle:'full-chest'}},
  weaponConfiguration:selectWeaponFamilyPreset(
   initialWeaponConfiguration(f.weapon),f.id)};
};
const snapshot=r=>{
 r.root.updateMatrixWorld(true);
 const P=o=>o.getWorldPosition(new THREE.Vector3());
 const Q=o=>o.getWorldQuaternion(new THREE.Quaternion());
 return {weapon:P(r.weapon),q:Q(r.weapon),
  left:P(r.arms[0].hand),right:P(r.arms[1].hand),
  mag:r.detachedMagazine.visible?P(r.detachedMagazine):null,
  magQ:r.detachedMagazine.visible?Q(r.detachedMagazine):null};
};
const equal=(a,b,label)=>{
 for(const k of ['weapon','left','right'])
  assert.ok(a[k].distanceTo(b[k])<1e-6,label+'/'+k);
 assert.ok(a.q.angleTo(b.q)<1e-6,label+'/weapon quaternion');
 assert.equal(!!a.mag,!!b.mag,label+'/mag presence');
 if(a.mag){
  assert.ok(a.mag.distanceTo(b.mag)<1e-6,label+'/mag');
  assert.ok(a.magQ.angleTo(b.magQ)<1e-6,label+'/mag quaternion');
 }
};
test('B25 three mechanism previews are deterministic and inherit real magazine state',()=>{
 const results=[];
 for(const f of fixtures){
  const a=createOperatorRig('v4-a-'+f.id,'blue',true);
  const b=createOperatorRig('v4-b-'+f.id,'blue',true);
  try{
   for(const t of [.14,.26,.40,.53,.78,.88,.94]){
    const pose={...create(f,t),poseV4ReloadPreview:true};
    poseOperator(a,pose,0);
    poseOperator(b,pose,0);
    const cue=a.root.userData.reloadV4Cue;
    assert.equal(cue?.mechanism,f.mechanism,f.id+'/'+t);
    assert.ok(cue.presentation>=0&&cue.presentation<=1);
    equal(snapshot(a),snapshot(b),f.id+'/seek '+t);
    const first=snapshot(a);
    poseOperator(a,pose,0);
    equal(snapshot(a),first,f.id+'/repeat '+t);
    const pair=a.root.userData.poseV3CoordinatedReport;
    assert.ok(pair,f.id+'/coordinated report');
    results.push({kit:f.id,phase:t,status:pair.status,
      relaxed:pair.relaxedContact});
   }
  }finally{a.dispose();b.dispose();}
 }
 console.log('RELOAD-V4-B25-MATRIX',JSON.stringify(results));
});
test('B25 AR empty bolt press, retention bypass and neutral nonreload still work',()=>{
 const f=fixtures[0],rig=createOperatorRig('v4-m4-gestures','blue',true);
 try{
  poseOperator(rig,{...create(f,.88),poseV4ReloadPreview:true},0);
  assert.equal(rig.root.userData.reloadV4Cue?.gesture,
   'ar-bolt-release');
  poseOperator(rig,{...create(f,.88,'retention'),
    poseV4ReloadPreview:true},0);
  assert.equal(rig.root.userData.reloadV4Cue?.gesture,'none');
  poseOperator(rig,{...create(f,0),reload:0,
    poseV4ReloadPreview:true},0);
  assert.equal(rig.root.userData.reloadV4Cue,null);
 }finally{rig.dispose();}
});
