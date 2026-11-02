import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {equipmentCarrySocket} from '../src/equipment-carry-visuals.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const kit=initialEquipmentLoadout();
const pose=(medicalCarryLocation,utilityCarryLocation)=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment:kit,
 medicalCarryLocation,utilityCarryLocation
});
test('medical and entry tools follow owning physical bone',()=>{
 const r=createOperatorRig('rook','blue');
 for(const where of ['rig','belt','pocket','backpack','overflow']){
  poseOperator(r,pose(where,where),0);
  const socket=equipmentCarrySocket('medical',where);
  const target=socket.bone==='hip'?r.hip:socket.bone==='pack'?r.pack:r.chest;
  assert.equal(r.medicalPouch.parent,target);
  const toolSocket=equipmentCarrySocket('utility',where);
  const toolTarget=toolSocket.bone==='hip'?r.hip:
   toolSocket.bone==='pack'?r.pack:r.chest;
  assert.equal(r.utilityTool.parent,toolTarget);
 }
 assert.equal(r.utilityTool.geometry.getAttribute('position'),undefined);
 assert.equal(r.helmetBadge.visible,false);
 r.dispose();
});
