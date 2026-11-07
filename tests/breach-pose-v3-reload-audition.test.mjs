/** Diagnostic-only reload-hold audition. Never called at runtime.
 * Evaluate REAL authored weapon and armor fixtures, without hiding rigid
 * torso failure behind increased clearance or extra limb stretch.
 * This test deliberately reports, rather than asserts, acceptance coverage.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {weaponPresentationSockets} from '../src/breach-weapon-presentation.ts';
import {weaponGrips} from '../src/breach-weapon-pose.ts';
import {poseClearanceEnvelope}
 from '../src/breach-pose-clearance-envelope.ts';
import {choreographV3ReloadHand}
 from '../src/breach-pose-v3-reload-choreography.ts';
import {solveV3CoordinatedPose}
 from '../src/breach-pose-v3-coordinated.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z),Y=V(0,1,0),Z=V(0,0,1);
const variants=[
 {id:'current',yaw:-.17,z:0,x:0,y:0},
 {id:'inboard2',yaw:-.17,z:-2,x:0,y:0},
 {id:'inboard3',yaw:-.17,z:-3,x:0,y:0},
 {id:'neutral2',yaw:0,z:-2,x:0,y:0},
 {id:'neutral3',yaw:0,z:-3,x:0,y:0},
 {id:'support2',yaw:.12,z:-2,x:0,y:0},
 {id:'support3',yaw:.20,z:-2.5,x:0,y:0},
 {id:'lift1',yaw:-.12,z:-2,x:0,y:1.5},
];
const configs=[
 {id:'ar-m4a1',weapon:'carbine',armor:'plate-heavy'},
 {id:'ak-akm',weapon:'rifle',armor:'plate-legacy'}
];
function assemble(c){
 let equipment=initialEquipmentLoadout(c.weapon);
 equipment=setEquipmentChoice(equipment,'armor','armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 const w=initialWardrobe();
 const wardrobe={...w,styles:{...w.styles,top:'smock-jacket',
  armorStyle:c.armor,rigStyle:'full-chest'}};
 const configuration=selectWeaponFamilyPreset(
  initialWeaponConfiguration(c.weapon),c.id);
 return {pose:{x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,
   posture:'stand',injury:0,weapon:c.weapon,reload:1.8,
   reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
   down:false,surrender:false,aiming:false,firing:false,
   turning:0,aimBlend:0,handlingOverride:'low',deterministic:true,
   equipment,wardrobe,weaponConfiguration:configuration},configuration};
}
function transform(fit,v){
 const q=new THREE.Quaternion().setFromAxisAngle(Y,v.yaw)
  .multiply(new THREE.Quaternion().setFromAxisAngle(Z,-.045));
 const translation=V(v.x,v.y,v.z);
 const pose=p=>p.clone().sub(fit.stock).applyQuaternion(q)
  .add(fit.stock).add(translation);
 return {...fit,origin:pose(fit.origin),
  rotation:new THREE.Euler().setFromQuaternion(
   q.clone().multiply(new THREE.Quaternion().setFromEuler(fit.rotation)),
   'XYZ'),stock:pose(fit.stock),primary:pose(fit.primary),
  support:pose(fit.support)};
}
test('V3 offline rifle handling comparisons (diagnostics only)',()=>{
 const summary={};
 for(const c of configs){
  const {pose,configuration}=assemble(c);
  const rig=createOperatorRig('audition-'+c.id,'blue',true);
  const envelope=poseClearanceEnvelope(c.armor,'full-chest','smock-jacket');
  const sockets=weaponPresentationSockets(c.weapon,configuration);
  const grips=weaponGrips(c.weapon,configuration,'low',0);
  try{
   for(const progress of [.37,.78]){
    poseOperator(rig,{...pose,reload:1.8*(1-progress)},0);
    const origin=rig.weapon.position.clone();
    const rotation=rig.weapon.rotation.clone();
    const point=(x,y,z)=>V(x*grips.lengthScale,y,z)
      .applyEuler(rotation).add(origin);
    const fit={origin,rotation,stock:point(grips.stockX,0,0),
      primary:point(grips.primaryX,grips.primaryY,1.8),
      support:point(grips.supportX,grips.supportY,-1.6),
      twoHanded:true,primaryReachable:true,handling:'low',
      stockError:0,contactError:0};
    for(const v of variants){
     const candidate=transform(fit,v);
     const target=choreographV3ReloadHand({
       fit:candidate,lengthScale:grips.lengthScale,
       progress,mode:'emergency',
       supportX:grips.supportX,supportY:grips.supportY,
       primaryX:grips.primaryX,clearanceFront:envelope.front,
       magazineSocket:sockets.magazinePart?sockets.magazine:undefined
     }).target;
     const testFit=solveV3CoordinatedPose({
       fit:candidate,weapon:c.weapon,configuration,
       shoulders:[V(1,4,-7),V(1,4,7)],
       chestRotation:rig.chest.rotation,envelope,mode:'reload',
       releasedSupportTarget:target
     });
     const key=c.id+':'+v.id;
     const record=summary[key]??={full:0,primaryFails:0,
      supportFails:0,supportReach:0,valid:0,tests:0};
     record.tests++;
     record.full+=testFit.status==='clear'?1:0;
     record.valid+=testFit.validCandidates;
     record.primaryFails+=testFit.rejects.primaryClearance;
     record.supportFails+=testFit.rejects.supportClearance;
     record.supportReach+=testFit.rejects.supportReach;
     const direction=new THREE.Quaternion().setFromEuler(
      candidate.rotation).angleTo(new THREE.Quaternion()
      .setFromEuler(fit.rotation));
     assert.ok(direction<.34);
     assert.ok(candidate.stock.distanceTo(fit.stock)<3.3);
    }
   }
  }finally{rig.dispose();}
 }
 console.log('POSE-V3-RELOAD-AUDITION',JSON.stringify(summary));
});
