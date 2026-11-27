import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {slingArtProfile} from '../src/operator-sling-profile.ts';
import {sampleSuspensionMotion} from '../src/breach-weapon-suspension.ts';
import {createSlingRoute,routeSlingRibbon} from '../src/operator-sling-route.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
import {readSlingKind} from '../src/breach-weapon-retention.ts';
test('SR13 distinct visual profiles retain the existing saved capability classes',()=>{
 const ids=['sling-single-point','sling-two-point','sling-traditional'];
 const profiles=ids.map(slingArtProfile);
 assert.deepEqual(profiles.map(x=>x.kind),ids.map(readSlingKind));
 assert.equal(new Set(profiles.map(x=>x.width)).size,3);
 assert.equal(new Set(profiles.map(x=>x.color)).size,3);
 const m={stride:.22,speed:55,massKg:3,inertia:120};
 const movement=profiles.map(profile=>sampleSuspensionMotion(profile.kind,{...m,profile}));
 const n=x=>Math.hypot(x.lift,x.sway,x.foreAft);
 assert.ok(n(movement[0])>n(movement[2])&&n(movement[2])>n(movement[1]));
});
test('SR13 single point returns high, traditional lower, modern in between',()=>{
 const fit=equipmentExterior('armor-bare','no-rig','combat-shirt'),a=new THREE.Vector3(10,2,0),b=new THREE.Vector3(9,-2,1);
 const paths=['sling-single-point','sling-two-point','sling-traditional'].map(id=>{
  const profile=slingArtProfile(id),path=createSlingRoute();
  routeSlingRibbon(path,a,profile.kind==='single'?a:b,fit,'front-slung',profile.width,undefined,profile);
  return path;
 });
 assert.ok(paths[0][5].point.y>paths[1][5].point.y&&paths[1][5].point.y>paths[2][5].point.y);
 assert.deepEqual(paths[0][0].point.toArray(),paths[0].at(-1).point.toArray());
});
