import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const pose=(seed,equipment=initialEquipmentLoadout())=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment,appearanceSeed:seed
});
test('eight palettes visibly change vest and operator accessory identity',()=>{
 const r=createOperatorRig('rook','blue'),color=new Set(),hairs=new Set();
 for(let seed=1;seed<=8;seed++){
  poseOperator(r,pose(seed),0);
  color.add(r.vestMaterial.color.getHex());
  hairs.add(r.visualKit.hairMaterial.color.getHex());
 }
 assert.ok(color.size>=6);assert.ok(hairs.size>=4);
 assert.ok(r.visualKit.patches.every(p=>p.parent===r.arms[r.visualKit.patches.indexOf(p)].upper));
 const light=setEquipmentChoice(initialEquipmentLoadout(),'top','top-light');
 poseOperator(r,pose(4,light),0);
 assert.ok(r.visualKit.patches.every(p=>!p.visible));
 r.dispose();
});
