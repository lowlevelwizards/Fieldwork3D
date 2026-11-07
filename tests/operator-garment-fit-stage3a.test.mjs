import test from 'node:test';
import assert from 'node:assert/strict';
import {assertIdentityEqual as assertEqual} from './helpers/identity.mjs';

import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {ANATOMY} from '../src/breach-anatomy.ts';
import {LEG_HIP_HEIGHT,LEG_HIP_SIDE,LEG_UPPER_LENGTH,LEG_LOWER_LENGTH}
 from '../src/breach-leg-geometry.ts';
import {GARMENT_FIT_ANCHOR_IDS,GARMENT_FIT_REFERENCE,
 GARMENT_FIT_LAYER_ORDER,GARMENT_FIT_TOLERANCES,garmentFitWorldPoint,
 sampleGarmentFit,garmentFitDiagnosticLines}
 from '../src/operator-garment-fit.ts';

const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment:initialEquipmentLoadout(),wardrobe:initialWardrobe()};
const vec=(point)=>new THREE.Vector3(point.x,point.y,point.z);
const near=(a,b,tol=1e-5)=>assert.ok(a.distanceTo(b)<tol,
 `${a.toArray().join(',')} vs ${b.toArray().join(',')}`);

test('Stage 3A fixes the reference anatomy but approves no new proportions',()=>{
 assert.deepEqual(GARMENT_FIT_REFERENCE.shoulderLeft,ANATOMY.shoulderLeft);
 assert.deepEqual(GARMENT_FIT_REFERENCE.shoulderRight,ANATOMY.shoulderRight);
 assertEqual(GARMENT_FIT_REFERENCE.pelvis.centerY,LEG_HIP_HEIGHT);
 assertEqual(GARMENT_FIT_REFERENCE.hipSide,LEG_HIP_SIDE);
 assertEqual(GARMENT_FIT_REFERENCE.upperLegLength,LEG_UPPER_LENGTH);
 assertEqual(GARMENT_FIT_REFERENCE.lowerLegLength,LEG_LOWER_LENGTH);
 assert.deepEqual(GARMENT_FIT_LAYER_ORDER,[
  'skin','underlayer','outer-fabric','armor-textile','rig-textile','hardware']);
 assert.ok(GARMENT_FIT_TOLERANCES.minDistinctSurfaceGap>0);
 assertEqual(GARMENT_FIT_TOLERANCES.headgearReserved,true);
});

test('garment anchors belong to actual body and IK segments, never headgear, collision or render meshes',()=>{
 const rig=createOperatorRig('rook','blue');
 const anchors=rig.garmentFitAnchors;
 assertEqual(Object.keys(anchors).length,GARMENT_FIT_ANCHOR_IDS.length);
 assertEqual(anchors.torso.parent,rig.chest);
 assertEqual(anchors.collar.parent,rig.chest);
 assertEqual(anchors['front-hem'].parent,rig.chest);
 assertEqual(anchors['back-hem'].parent,rig.chest);
 assertEqual(anchors['shoulder-left'].parent,rig.chest);
 assertEqual(anchors['shoulder-right'].parent,rig.chest);
 assertEqual(anchors.waist.parent,rig.hip);
 assertEqual(anchors['upper-sleeve-left'].parent,rig.arms[0].upper);
 assertEqual(anchors['upper-sleeve-right'].parent,rig.arms[1].upper);
 assertEqual(anchors['forearm-left'].parent,rig.arms[0].lower);
 assertEqual(anchors['forearm-right'].parent,rig.arms[1].lower);
 assertEqual(anchors['thigh-left'].parent,rig.feet[0].upper);
 assertEqual(anchors['knee-left'].parent,rig.feet[0].lower);
 assertEqual(anchors['knee-right'].parent,rig.feet[1].lower);
 assertEqual(anchors['shin-right'].parent,rig.feet[1].lower);
 assertEqual(anchors['boot-right'].parent,rig.feet[1].shoe);
 assert.ok(!Object.values(anchors).some(a=>a.parent===rig.head));
 let extraSceneNodes=0;
 rig.root.traverse(node=>{if(node.name.startsWith('garment-fit:'))extraSceneNodes++;});
 assertEqual(extraSceneNodes,0,'all 19 garment references are virtual: no per-frame scene work');
 for(const key of GARMENT_FIT_ANCHOR_IDS){
  const item=anchors[key];
  assertEqual(item.id,key);
  assert.ok(item.parent instanceof THREE.Object3D,key);
  assert.ok(item.offset instanceof THREE.Vector3,key);
  assert.ok(item.offset.toArray().every(Number.isFinite),key);
  assert.ok(!('children' in item),'virtual reference must not be a scene node');
 }
 assertEqual(anchors['knee-left'].offset.y,-.5);
 assertEqual(anchors['knee-right'].offset.y,-.5);
 rig.root.updateMatrixWorld(true);
 near(garmentFitWorldPoint(anchors,'shoulder-left'),
  rig.chest.localToWorld(vec(ANATOMY.shoulderLeft)));
 near(garmentFitWorldPoint(anchors,'shoulder-right'),
  rig.chest.localToWorld(vec(ANATOMY.shoulderRight)));
 const report=sampleGarmentFit(anchors);
 assert.ok(Math.abs(report.shoulderSpan-14)<1e-5);
 assertEqual(garmentFitDiagnosticLines(report).length,8);
 assert.ok(garmentFitDiagnosticLines(report)[0].includes('PROPORTIONS LOCKED'));
 rig.dispose();
});

test('optional fit diagnostics track authentic animation poses without touching garment joints or replay',()=>{
 const rig=createOperatorRig('rook','blue');
 const before={
  chestGeometry:rig.chest.children.filter(c=>c instanceof THREE.Mesh).map(m=>m.geometry.uuid),
  bootGeo:rig.feet.map(f=>f.shoe.geometry.uuid),
  shoulder:rig.garmentFitAnchors['shoulder-left'].offset.clone(),
  headwear:rig.visualKit.wardrobeHead
 };
 const kit=setEquipmentChoice(initialEquipmentLoadout(),'armor','armor-carrier');
 const cases=[
  {...base,equipment:kit},
  {...base,equipment:kit,unarmedPreview:true},
  {...base,equipment:kit,posture:'crouch'},
  {...base,equipment:kit,velocity:22,gait:'run',seconds:.45,stride:18},
  {...base,equipment:kit,velocity:7,gait:'pie',seconds:.3,stride:10},
  {...base,equipment:kit,aiming:true,aimBlend:1},
  {...base,equipment:kit,reload:0.6,reloadDuration:1.8},
  {...base,equipment:kit,down:true,downProgress:.7}
 ];
 for(const [i,pose] of cases.entries()){
  poseOperator(rig,pose,i*.11);
  const sample=sampleGarmentFit(rig.garmentFitAnchors);
  for(const value of Object.values(sample))
   for(const n of Array.isArray(value)?value:[value])
    assert.ok(Number.isFinite(n),'non-finite garment fit metric at pose '+i);
  assert.ok(Math.abs(sample.shoulderSpan-14)<1e-3);
  for(const id of GARMENT_FIT_ANCHOR_IDS){
   const point=garmentFitWorldPoint(rig.garmentFitAnchors,id);
   assert.ok(point.toArray().every(Number.isFinite),id+' pose '+i);
  }
  near(garmentFitWorldPoint(rig.garmentFitAnchors,'collar'),
   rig.chest.localToWorld(new THREE.Vector3(0,6,0)),1e-4);
  near(garmentFitWorldPoint(rig.garmentFitAnchors,'waist'),
   rig.hip.getWorldPosition(new THREE.Vector3()),1e-4);
  near(garmentFitWorldPoint(rig.garmentFitAnchors,'knee-left'),
   rig.feet[0].lower.localToWorld(new THREE.Vector3(0,-.5,0)),1e-4);
 }
 assert.deepEqual(before.chestGeometry,
  rig.chest.children.filter(c=>c instanceof THREE.Mesh).map(m=>m.geometry.uuid));
 assert.deepEqual(before.bootGeo,rig.feet.map(f=>f.shoe.geometry.uuid));
 near(before.shoulder,rig.garmentFitAnchors['shoulder-left'].offset);
 assertEqual(rig.visualKit.wardrobeHead,before.headwear);
 rig.dispose();
});

test('3A exposes a diagnostic preview only; clothing and persistence are not remodeled',()=>{
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 const wardrobe=readFileSync(new URL('../src/operator-wardrobe-data.ts',import.meta.url),'utf8');
 assert.match(html,/<option value="garment-fit">GARMENT FIT ANCHORS<\/option>/);
 assert.match(lab,/sampleGarmentFit\(rig\.garmentFitAnchors\)/);
 assert.match(lab,/garmentFitWorldPoint\(rig!\.garmentFitAnchors/);
 assert.match(rig,/createGarmentFitAnchors\(\{chest,hip,arms,legs:feet\}\)/);
 assert.match(wardrobe,/version:1;styles:/);
});
