import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {operatorAttachmentPoint,OPERATOR_ATTACHMENT_ZONES}
 from '../src/operator-attachment-zones.ts';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
test('named attachment points track existing joints without changing geometry',()=>{
 const rig=createOperatorRig('rook','blue');
 const originals=rig.feet.map(f=>f.upper.geometry);
 poseOperator(rig,{x:0,z:0,heading:0,velocity:0,
  seconds:0,stride:0,posture:'stand',injury:0,weapon:'carbine',
  reload:0,reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
  down:false,surrender:false,aiming:false,firing:false,turning:0,
  deterministic:true,unarmedPreview:true,equipment:bareLabEquipment()},0);
 for(const zone of OPERATOR_ATTACHMENT_ZONES)
  assert.ok(operatorAttachmentPoint(rig,zone).toArray().every(Number.isFinite),zone);
 rig.root.updateMatrixWorld(true);
 for(const side of ['left','right']){
  const foot=rig.feet[side==='left'?0:1];
  const upper=operatorAttachmentPoint(rig,'knee-'+side);
  const lower=foot.lower.localToWorld(upper.clone().set(0,-.5,0));
  assert.ok(upper.distanceTo(lower)<.01,side);
 }
 assert.ok(rig.feet.every((f,i)=>f.upper.geometry===originals[i]));
 rig.dispose();
});
