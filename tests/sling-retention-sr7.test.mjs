import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {packedRearSurface,retentionPackBounds} from '../src/operator-retention-pack.ts';
import {createSlingRoute,routeSlingRibbon} from '../src/operator-sling-route.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
test('SR7 pack rear depth only applies where the visible bag occupies the section',()=>{
 const p=new THREE.Box3(new THREE.Vector3(-11,-3,-4),new THREE.Vector3(-6,5,4));
 assert.equal(packedRearSurface(-5,0,0,p),-11);
 assert.equal(packedRearSurface(-5,0,5,p),-5);
 assert.equal(packedRearSurface(-5,-4,0,p),-5);
 const route=createSlingRoute(),a=new THREE.Vector3(-12,4,0),b=new THREE.Vector3(-12,-3,0);
 routeSlingRibbon(route,a,b,equipmentExterior('armor-bare','no-rig','combat-shirt'),'back-slung',1,p);
 assert.ok(route[1].point.x<=-11||Math.abs(route[1].point.z)>4);
});
test('SR7 pack measurement ignores hidden alternate artwork and tracks staged transform',()=>{
 const pack=new THREE.Group(),dayPack=new THREE.Group(),fieldPack=new THREE.Group();
 const mesh=(n)=>new THREE.Mesh(new THREE.BoxGeometry(n,n,n),new THREE.MeshBasicMaterial());
 dayPack.add(mesh(4));fieldPack.add(mesh(20));fieldPack.visible=false;
 pack.add(dayPack,fieldPack);
 const rig={pack,visualKit:{dayPack,fieldPack,wardrobeGear:{pack:{}}}};
 const pose={position:new THREE.Vector3(-8,0,0),quaternion:new THREE.Quaternion(),scale:new THREE.Vector3(1,1,1)};
 const a=retentionPackBounds(rig,'day-pack',pose);
 assert.equal(a.min.x,-10);assert.equal(a.max.x,-6);
 pose.position.x=-9;
 assert.equal(retentionPackBounds(rig,'day-pack',pose).min.x,-11);
 assert.equal(retentionPackBounds(rig,'no-pack',pose),undefined);
});
