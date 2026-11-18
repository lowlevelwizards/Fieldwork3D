/** Geometry and isolation acceptance for the user-requested H2 study.
 * Never test H2 as an Arsenal factory preset: this is review-only geometry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36H2Handguard,buildG36H1HandguardComparison,
 G36_H2_STATIONS,h2Section,h2StudyStatistics}
 from '../src/weapons/geometry/g36-h2-handguard-study.ts';
import {G36_LONG_FOREND_RINGS}
 from '../src/weapons/geometry/g36-handguard-profiles.ts';
import {buildG36OriginalBlockout}
 from '../src/weapons/geometry/g36-silhouettes.ts';
const mesh=(g,key)=>g.children.find(x=>x.userData[key]);
const bounds=x=>new THREE.Box3().setFromObject(x);
const near=(a,b,e=.015)=>Math.abs(a-b)<e;
const free=g=>{
 g.traverse(x=>{if(x instanceof THREE.Mesh){
  x.geometry.dispose();
  const a=Array.isArray(x.material)?x.material:[x.material];
  a.forEach(m=>m.dispose());
 }});
};

test('H2 is an independent four-component art study, not a factory override',()=>{
 const h2=buildG36H2Handguard(),info=h2StudyStatistics(h2);
 assert.equal(h2.userData.studyOnly,true);
 assert.equal(h2.userData.handguardArtVersion,'h2-reference-major-forms');
 assert.equal(info.meshes,4);
 assert.equal(info.stations,5);
 assert.equal(info.corners,8);
 assert.equal(info.ventsPerSide,5);
 assert.ok(info.triangles<350,'major volumes, no microscopic detail');
 const factory=buildG36OriginalBlockout(new THREE.MeshBasicMaterial());
 const h1=mesh(factory,'g36LongHandguard');
 assert.equal(h1.userData.g36HandguardArtVersion,'h1-six-plane-original');
 assert.equal(h1.userData.g36HandguardSectionSides,6);
 assert.equal(h1.geometry.getAttribute('position').count,96);
 free(h2);free(factory);
});

test('H2 shape: thick broad roof, two shoulders, lower return and blunt nose',()=>{
 const h2=buildG36H2Handguard({showMouth:false,showVents:false,showBoss:false});
 const shell=mesh(h2,'h2PrimaryShell'),position=shell.geometry.getAttribute('position');
 assert.equal(shell.userData.h2CrossSectionCorners,8);
 assert.equal(shell.userData.h2Stations,5);
 assert.equal(G36_H2_STATIONS.length,5);
 for(const station of G36_H2_STATIONS){
  const values=new Set();
  for(let i=0;i<position.count;i++){
   if(near(position.getX(i)+5,station.x,.001))
    values.add(position.getY(i).toFixed(3)+'/'+position.getZ(i).toFixed(3));
  }
  assert.equal(values.size,8,'all eight genuinely distinct contour stations');
 }
 const r=G36_H2_STATIONS[1],shape=h2Section(r);
 assert.ok(shape[1][1]<shape[2][1]-.25,'upper shoulder expands');
 assert.ok(shape[4][1]<shape[3][1]-.22,'lower return tucks in');
 assert.ok(shape[4][1]>1.0,'floor remains broad');
 assert.ok(r.top-G36_H2_STATIONS[4].top>.39,'pronounced blunt clipped nose');
 assert.ok(near(bounds(shell).getSize(new THREE.Vector3()).x,10));
 assert.equal(h2StudyStatistics(h2).meshes,1);
 free(h2);
});

test('H2 visibly open front mouth uses true inset rim and dark backing',()=>{
 const opened=buildG36H2Handguard({showBoss:false,showVents:false});
 const closed=buildG36H2Handguard({showMouth:false,showBoss:false,showVents:false});
 assert.ok(mesh(opened,'h2MouthRecess'));
 assert.ok(!mesh(closed,'h2MouthRecess'));
 const shellOpen=mesh(opened,'h2PrimaryShell');
 const shellClosed=mesh(closed,'h2PrimaryShell');
 const a=shellOpen.geometry.getAttribute('position').count;
 const b=shellClosed.geometry.getAttribute('position').count;
 assert.ok(a>b+80,'front opening is physically formed by an annular rim and throat');
 const x=bounds(mesh(opened,'h2MouthRecess'));
 assert.ok(x.max.x<bounds(shellOpen).max.x-.2,'recess is behind front face');
 free(opened);free(closed);
});

test('H2 options independently toggle raised lug, vents, mouth and width',()=>{
 const base=buildG36H2Handguard();
 const plain=buildG36H2Handguard({showBoss:false,showVents:false,showMouth:false,width:1.2});
 assert.ok(mesh(base,'h2MountingLug'));
 assert.ok(mesh(base,'h2GraphicVents'));
 assert.equal(mesh(base,'h2GraphicVents').count,10);
 assert.ok(!mesh(plain,'h2MountingLug'));
 assert.ok(!mesh(plain,'h2GraphicVents'));
 assert.ok(!mesh(plain,'h2MouthRecess'));
 assert.equal(h2StudyStatistics(plain).meshes,1);
 assert.ok(bounds(mesh(plain,'h2PrimaryShell')).getSize(new THREE.Vector3()).z>
   bounds(mesh(base,'h2PrimaryShell')).getSize(new THREE.Vector3()).z*1.19);
 free(base);free(plain);
});

test('H1 baseline comes from actual live shell, not a second hand-built approximation',()=>{
 const h1=buildG36H1HandguardComparison();
 const actual=buildG36OriginalBlockout(new THREE.MeshBasicMaterial());
 const study=mesh(h1,'g36LongHandguard'),factory=mesh(actual,'g36LongHandguard');
 assert.equal(study.geometry.getAttribute('position').count,
  factory.geometry.getAttribute('position').count);
 assert.deepEqual(G36_LONG_FOREND_RINGS.map(r=>r.x),[3.75,11.75,13.45]);
 assert.equal(mesh(actual,'g36LongHandguard').userData.g36HandguardArtVersion,
  'h1-six-plane-original');
 free(h1);free(actual);
});
