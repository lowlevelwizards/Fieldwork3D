import test from 'node:test';import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {readTransportPatientPose} from '../src/breach-transport-patient-pose.ts';
import {LEG_UPPER_LENGTH,LEG_LOWER_LENGTH} from '../src/breach-leg-geometry.ts';
const base={x:80,z:55,heading:0,velocity:0,seconds:2,stride:0,posture:'stand',injury:3,weapon:'carbine',reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,down:true,downProgress:1,surrender:false,aiming:false,firing:false,turning:0,deterministic:true,poseDiagnostics:true};
test('release and detached downed frames cannot draw stretched ankle links',()=>{
 const rig=createOperatorRig('ct-release-legs','blue',true);
 try{
  for(const mode of ['drag','carry'])for(const elapsed of [0,.1,.3,.6,.72,1]){
   const patient={id:'p',p:{x:80,y:55},health:0,heading:0,carriedById:'c',transportMode:mode};
   const carrier={id:'c',p:{x:100,y:55},health:4,heading:0,carryingId:'p',transportContact:{kind:'release',elapsed,duration:mode==='drag'?.35:.72}};
   const pose=elapsed>=1?undefined:readTransportPatientPose(patient,[carrier]);
   rig.root.position.set(base.x,0,base.z);
   poseOperator(rig,{...base,seconds:2+elapsed,transportPatient:pose},0);
   for(const foot of rig.feet){
    assert.equal(foot.ankleLink.visible,false);
    assert.ok(Math.abs(foot.upper.scale.y-LEG_UPPER_LENGTH)<1e-5);
    assert.ok(Math.abs(foot.lower.scale.y-LEG_LOWER_LENGTH)<1e-5);
    assert.ok(foot.shoe.position.distanceTo(foot.lower.position)<=LEG_LOWER_LENGTH/2+1e-4);
   }
  }
 }finally{rig.dispose();}
});
