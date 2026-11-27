import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {readTransportPatientPose,patientTransportContacts,patientRootTransform} from '../src/breach-transport-patient-pose.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const actor={id:'a',p:{x:25,y:0},health:4,heading:Math.PI,carryingId:'b',velocity:12};
const subject={id:'b',p:{x:0,y:0},health:0,heading:0,carriedById:'a',transportMode:'drag'};
const base={x:25,z:0,heading:Math.PI,velocity:0,seconds:1,stride:0,posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,turning:0,deterministic:true,poseDiagnostics:true,primaryGrounded:true};
test('CT10 pair contacts are stable, sorted and derive from patient anatomy',()=>{
 const p=readTransportPatientPose(subject,[actor]);
 const pts=patientTransportContacts(p,Math.PI);
 assert.ok(pts[0].z>pts[1].z);
 assert.ok(pts[0].distanceTo(pts[1])>14);
 assert.deepEqual(patientTransportContacts(p,Math.PI).map(x=>x.toArray()),pts.map(x=>x.toArray()));
});
test('CT10 real rigs solve finite two-character contact without changing limb length',()=>{
 const p=readTransportPatientPose(subject,[actor]);
 const carrier=createOperatorRig('ct10-a','blue',true),patient=createOperatorRig('ct10-b','blue',true);
 try{
  carrier.root.position.set(base.x,0,base.z);
  patient.root.position.set(0,0,0);
  poseOperator(patient,{...base,x:0,z:0,down:true,downProgress:1,transportPatient:p},0);
  poseOperator(carrier,{...base,loadedTransport:{mode:'drag',patientId:'b',patient:subject.p,heading:0,patientPose:p}},0);
  const error=carrier.root.userData.transportContactErrors;
  assert.equal(error.length,2);assert.ok(error.every(Number.isFinite));
  for(const arm of carrier.arms){assert.ok(Math.abs(arm.upper.scale.y-10)<1e-5);assert.ok(Math.abs(arm.lower.scale.y-10)<1e-5);}
  const chest=patient.chest.getWorldPosition(new THREE.Vector3());
  assert.ok(chest.distanceTo(new THREE.Vector3(p.chest.x,p.chest.y,p.chest.z))<1e-4);
  assert.ok(patient.root.position.distanceTo(patientRootTransform(p).position)<1e-4);
 }finally{carrier.dispose();patient.dispose();}
});
