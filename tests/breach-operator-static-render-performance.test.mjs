import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';

const pose=(equipment=initialEquipmentLoadout())=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment
});

test('steady operator motion reuses the same outfit/material setup',()=>{
 const rig=createOperatorRig('perf-operator','blue');
 const first=pose();
 let paletteWrites=0;
 const set=rig.colors.set.bind(rig.colors);
 rig.colors.set=(...args)=>{paletteWrites++;return set(...args);};
 try{
  poseOperator(rig,first,0);
  assert.ok(paletteWrites>0,'first pose populates the appearance ledger');
  const baseline=rig.skinMaterial.color.getHex();
  paletteWrites=0;
  poseOperator(rig,{...first,seconds:1/60,x:2,z:1,
    velocity:58,heading:.25,turning:1},1/60);
  assert.equal(paletteWrites,0,'motion does not reconfigure fabric or skin');

  poseOperator(rig,{...first,seconds:2/60,down:true,downProgress:.7},1/60);
  assert.notEqual(rig.skinMaterial.color.getHex(),baseline,
    'incapacitation still applies reversible desaturation');
  assert.equal(paletteWrites,0,'downing does not regenerate wardrobe');

  poseOperator(rig,{...first,seconds:3/60},1/60);
  assert.equal(rig.skinMaterial.color.getHex(),baseline,
    'rewinding restores the original complexion');

  paletteWrites=0;
  const changed={...first,seconds:4/60,
    equipment:setEquipmentChoice(first.equipment,'belt','belt-light')};
  poseOperator(rig,changed,1/60);
  assert.ok(paletteWrites>0,'equipment change invalidates material cache');
  assert.equal(rig.visualKit.belt.visible,true);
  paletteWrites=0;
  poseOperator(rig,{...changed,seconds:5/60},1/60);
  assert.equal(paletteWrites,0,'unchanged gear remains cached');
 }finally{rig.dispose();}
});
