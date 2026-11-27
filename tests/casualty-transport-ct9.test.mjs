import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {readTransportPatientPose,patientRootTransform,patientAnkleOffset,TRANSPORT_PATIENT_CHEST_Y} from '../src/breach-transport-patient-pose.ts';
test('CT9 shared casualty frame seats chest at exact support and distinguishes legs',()=>{
 const carrier={id:'a',p:{x:25,y:0},health:4,heading:0,carryingId:'b'};
 const body={id:'b',p:{x:0,y:0},health:0,heading:0,carriedById:'a',transportMode:'drag'};
 const drag=readTransportPatientPose(body,[carrier]);const carry=readTransportPatientPose({...body,transportMode:'carry'},[carrier]);
 const transform=patientRootTransform(drag);
 const chest=new THREE.Vector3(0,TRANSPORT_PATIENT_CHEST_Y,0).applyQuaternion(transform.legacy).add(transform.position);
 assert.ok(chest.distanceTo(new THREE.Vector3(drag.chest.x,drag.chest.y,drag.chest.z))<1e-6);
 assert.ok(carry.chest.y>drag.chest.y);assert.notDeepEqual(patientAnkleOffset(drag,1),patientAnkleOffset(carry,1));
 assert.equal(readTransportPatientPose(body,[{...carrier,carryingId:null}]),undefined);
});
