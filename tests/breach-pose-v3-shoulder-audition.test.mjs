/** Offline support-shoulder feasibility search. Intentionally NOT a runtime
 * solve and NOT included in critical CI after its first measured audit.
 * Searches shoulder positions close to the existing shoulder seam, not
 * firearm displacement, limb stretch, or hard-collision forgiveness.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {weaponGrips} from '../src/breach-weapon-pose.ts';
import {weaponPresentationSockets} from '../src/breach-weapon-presentation.ts';
import {poseClearanceEnvelope} from '../src/breach-pose-clearance-envelope.ts';
import {choreographV3ReloadWeapon}
 from '../src/breach-pose-v3-reload-weapon.ts';
import {choreographV3ReloadHand}
 from '../src/breach-pose-v3-reload-choreography.ts';
import {solveV3CoordinatedPose} from '../src/breach-pose-v3-coordinated.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const shoulders=[
 {id:'base',x:0,y:0,z:0},
 {id:'small',x:.55,y:.08,z:-.4},
 {id:'medium',x:1.05,y:.14,z:-.7},
 {id:'forward',x:1.55,y:.20,z:-.8},
 {id:'outboard',x:.9,y:.12,z:-1.2},
 {id:'large',x:2.05,y:.2,z:-1.2},
 {id:'up',x:1.05,y:.55,z:-.7},
];
const fixtures=[
 {id:'ar-m4a1',weapon:'carbine',armor:'plate-heavy'},
 {id:'ak-akm',weapon:'rifle',armor:'plate-legacy'},
 {id:'ak-aks74u',weapon:'carbine',armor:'soft-flak'}
];
const setup=f=>{
 let equipment=initialEquipmentLoadout(f.weapon);
 equipment=setEquipmentChoice(equipment,'armor',
  f.armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 const w=initialWardrobe();
 const wardrobe={...w,styles:{...w.styles,top:'smock-jacket',
  armorStyle:f.armor,rigStyle:'full-chest'}};
 const configuration=selectWeaponFamilyPreset(
  initialWeaponConfiguration(f.weapon),f.id);
 return {pose:{x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,
  posture:'stand',injury:0,weapon:f.weapon,reload:1.8,
  reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
  down:false,surrender:false,aiming:false,firing:false,
  turning:0,aimBlend:0,handlingOverride:'low',deterministic:true,
  equipment,wardrobe,weaponConfiguration:configuration},configuration};
};
test('V3 support-shoulder movement feasibility audit',()=>{
 const samples=[.035,.35,.778,.93],results={};
 for(const f of fixtures){
  const {pose,configuration}=setup(f);
  const rig=createOperatorRig('shoulder-audit-'+f.id,'blue',true);
  const env=poseClearanceEnvelope(f.armor,'full-chest','smock-jacket');
  const sockets=weaponPresentationSockets(f.weapon,configuration);
  const grip=weaponGrips(f.weapon,configuration,'low',0);
  try{
   for(const progress of samples){
    poseOperator(rig,{...pose,reload:1.8*(1-progress)},0);
    const origin=rig.weapon.position.clone();
    const rotation=rig.weapon.rotation.clone();
    const point=(x,y,z)=>V(x*grip.lengthScale,y,z)
     .applyEuler(rotation).add(origin);
    const baseline={origin,rotation,stock:point(grip.stockX,0,0),
     primary:point(grip.primaryX,grip.primaryY,1.8),
     support:point(grip.supportX,grip.supportY,-1.6),
     twoHanded:true,primaryReachable:true,handling:'low',
     stockError:0,contactError:0};
    const fit=choreographV3ReloadWeapon(baseline,progress,'emergency').fit;
    const releasedTarget=choreographV3ReloadHand({
     fit,lengthScale:grip.lengthScale,progress,mode:'emergency',
     supportX:grip.supportX,supportY:grip.supportY,
     primaryX:grip.primaryX,clearanceFront:env.front,
     magazineSocket:sockets.magazinePart?sockets.magazine:undefined
    }).target;
    for(const v of shoulders){
     const support=V(1+v.x,4+v.y,-7+v.z);
     const answer=solveV3CoordinatedPose({fit,weapon:f.weapon,
      configuration,shoulders:[support,V(1,4,7)],
      chestRotation:rig.chest.rotation,envelope:env,mode:'reload',
      releasedSupportTarget:releasedTarget});
     const key=f.id+':'+v.id;
     const row=results[key]??={full:0,validCandidates:0,primary:0,
      support:0,reach:0,tests:0,phases:[]};
     row.tests++;
     row.full+=answer.status==='clear'?1:0;
     row.validCandidates+=answer.validCandidates;
     row.primary+=answer.rejects.primaryClearance;
     row.support+=answer.rejects.supportClearance;
     row.reach+=answer.rejects.supportReach;
     if(answer.status==='clear')row.phases.push(Number(progress.toFixed(3)));
     assert.ok(support.distanceTo(V(1,4,-7))<=2.5,
      'audition must stay near actual anatomical shoulder');
    }
   }
  }finally{rig.dispose();}
 }
 console.log('POSE-V3-SHOULDER-AUDITION',JSON.stringify(results));
});
