/** Critical V3 motion matrix: actual rig, supported arm statuses and no aim drift.
 * This is not an aesthetic pass. Screenshot reviews remain a separate gate.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
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
 for(const fixture of fixtures){
  const base=assemble(fixture);
  const original=createOperatorRig('v3-old-'+fixture.id,'blue',true);
  const candidate=createOperatorRig('v3-new-'+fixture.id,'blue',true);
  try{
   for(const [i,scenario] of scenarios.entries()){
    const {name,...state}=scenario;
    const pose={...base,...state,seconds:2+i*.21};
    poseOperator(original,pose,0);
    poseOperator(candidate,{...pose,poseV3Preview:true},0);
    assert.ok(candidate.weapon.position.distanceTo(
     original.weapon.position)<1e-7,
     fixture.id+'/'+name+': visual solver must not move weapon');
    assert.ok(Math.abs(candidate.weapon.rotation.y-
     original.weapon.rotation.y)<1e-7,
     fixture.id+'/'+name+': no change to aim yaw');
    const reports=candidate.root.userData.poseV3DynamicReport;
    assert.equal(reports?.length,2,fixture.id+'/'+name);
    for(const [armIndex,report] of reports.entries()){
     assert.ok(report.candidates<=6,fixture.id+'/'+name);
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
      assert.equal(report.status,'unresolved');
      assert.ok(['out-of-reach','no-clearance'].includes(report.reason));
     }
    }
   }
  }finally{original.dispose();candidate.dispose();}
 }
 assert.equal(clear+unresolved,fixtures.length*scenarios.length*2);
 console.log('POSE-V3-ACTION-MATRIX',JSON.stringify({clear,unresolved,
  fixtures:fixtures.length,actions:scenarios.length}));
});
