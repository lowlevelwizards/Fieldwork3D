import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {probeRenderedPose} from '../src/breach-pose-v3-diagnostics.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {poseClearanceEnvelope} from '../src/breach-pose-clearance-envelope.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const cases=[
 {id:'ar-m4a1',weapon:'carbine',armor:'plate-heavy',rig:'full-chest'},
 {id:'ak-akm',weapon:'rifle',armor:'plate-legacy',rig:'full-chest'},
 {id:'ak-aks74u',weapon:'carbine',armor:'soft-flak',rig:'full-chest'}
];
const actions=[
 ['low',{}],['ready',{handlingOverride:'ready'}],
 ['ads',{handlingOverride:'ads',aiming:true,aimBlend:1}],
 ['reload-reach',{reload:1.65,reloadDuration:1.8}],
 ['reload-remove',{reload:1.08,reloadDuration:1.8}],
 ['reload-insert',{reload:.40,reloadDuration:1.8}],
 ['reload-settle',{reload:.10,reloadDuration:1.8}],
 ['walk',{velocity:24}],['turn',{turning:.58}],
 ['crouch',{posture:'crouch'}]
];
function fixture(c){
 const weaponConfiguration=selectWeaponFamilyPreset(
  initialWeaponConfiguration(c.weapon),c.id);
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor','armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-none');
 const w=initialWardrobe();
 const wardrobe={...w,styles:{...w.styles,top:'smock-jacket',
  armorStyle:c.armor,rigStyle:c.rig}};
 return {x:0,z:0,heading:0,velocity:0,seconds:1,stride:0,
  posture:'stand',injury:0,weapon:c.weapon,reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,aimBlend:0,
  handlingOverride:'low',equipment,wardrobe,weaponConfiguration};
}
test('V3 Stage 0: observe actual rendered arm endpoints across actions',()=>{
 const traces=[];
 for(const c of cases){
  const rig=createOperatorRig('v3-'+c.id,'blue',true);
  try{
   const base=fixture(c),env=poseClearanceEnvelope(
    c.armor,c.rig,'smock-jacket');
   for(const [index,[name,state]] of actions.entries()){
    poseOperator(rig,{...base,...state,seconds:1+index*.2},.05);
    const trace=probeRenderedPose(rig,c.id+'/'+name,env);
    assert.equal(trace.finite,true,trace.label);
    traces.push(trace);
   }
  }finally{rig.dispose();}
 }
 assert.equal(traces.length,cases.length*actions.length);
 console.log('POSE-V3-BASELINE',JSON.stringify(traces.map(t=>({
  label:t.label,warnings:t.warnings,
  elbows:t.arms.map(a=>({drop:a.elbowDrop,flare:a.outwardFlare})),
  hard:t.hardContact,grip:t.gripError}))));
 // Baseline is OBSERVATIONAL: a current invalid pose must be reported,
 // not hidden behind a "green" expectation for visual quality.
});
