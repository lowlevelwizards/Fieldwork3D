import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialSecondaryEquipment} from '../src/secondary-equipment.ts';
import {secondaryUpperBodyTargets} from '../src/secondary-upper-body-pose.ts';

const base={x:0,z:0,heading:0,velocity:0,seconds:1,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 poseV3Preview:true,poseV4ReloadPreview:true,poseDiagnostics:false};
const finite=v=>[v.x,v.y,v.z].every(Number.isFinite);
test('S6.2: ready/ADS/retention and magazine reach remain bounded chest-local',()=>{
 const stages=[
  {fraction:0,aim:0,moving:false,obstructed:false},
  {fraction:.5,aim:.4,moving:true,obstructed:false},
  {fraction:1,aim:1,moving:false,obstructed:false},
  {fraction:1,aim:1,moving:true,obstructed:true},
  ...[0,.2,.28,.5,.72,.99,1].map(reloadProgress=>({
   fraction:1,aim:.2,moving:false,obstructed:false,reloadProgress
  }))
 ];
 for(const input of stages){
  const target=secondaryUpperBodyTargets(input);
  assert.ok(Number.isFinite(target.weight));
  assert.ok(target.weight>=0&&target.weight<=1);
  assert.ok(finite(target.firing)&&finite(target.support));
  const shoulders=[{x:1,y:4,z:-7},{x:1,y:4,z:7}];
  for(const [i,pt] of [target.support,target.firing].entries()){
   const s=shoulders[i];
   assert.ok(Math.hypot(pt.x-s.x,pt.y-s.y,pt.z-s.z)<=19.92,
    'bounded two-bone arm reach '+JSON.stringify({input,i,pt}));
  }
 }
 assert.equal(secondaryUpperBodyTargets(stages[0]).weight,0);
 assert.equal(secondaryUpperBodyTargets(stages[2]).weight,1);
});
test('S6.2: a real operator rig holds exactly one Glock and solves both wrists deterministically',()=>{
 const rig=createOperatorRig('sidearm-s6-rig','blue',true);
 const side=initialSecondaryEquipment('sidearm-s6-rig','glock-g19x');
 const equipment={...initialEquipmentLoadout(),secondary:side};
 const primary={active:'primary',desired:'primary',fraction:0};
 const drawn={active:'secondary',desired:'secondary',fraction:1};
 try{
  poseOperator(rig,{...base,equipment,secondarySwitch:primary},0);
  const first=rig.arms.map(a=>a.hand.position.clone());
  poseOperator(rig,{...base,equipment,secondarySwitch:drawn,aimBlend:1,aiming:true},0);
  const after=rig.arms.map(a=>a.hand.position.clone());
  for(const v of after)assert.equal(finite(v),true);
  assert.ok(after[0].distanceTo(first[0])>.1);
  assert.ok(after[1].distanceTo(first[1])>.1);
  let pistolCount=0,pistol=null;
  rig.root.traverse(x=>{
   if(x.userData.secondaryWeaponVisual){pistolCount++;pistol=x;}
  });
  assert.equal(pistolCount,1);
  const wrist=rig.arms[1].hand.getWorldPosition(new THREE.Vector3());
  const grip=pistol.getWorldPosition(new THREE.Vector3());
  assert.ok(wrist.distanceTo(grip)<1e-4,
   'actual Glock grip must follow the committed firing hand');
  assert.equal(rig.weapon.visible,false);
  poseOperator(rig,{...base,equipment,secondarySwitch:primary},0);
  assert.equal(rig.weapon.visible,true);
 }finally{rig.dispose();}
});
