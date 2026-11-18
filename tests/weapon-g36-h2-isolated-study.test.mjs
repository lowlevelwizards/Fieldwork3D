/** Geometry and isolation acceptance for the user-requested H2 study.
 * Never test H2 as an Arsenal factory preset: this is review-only geometry.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36H2Handguard,buildG36H1HandguardComparison,
 G36_H2_STATIONS,h2Section,h2StationVertices,h2StudyStatistics,
 G36_H2_VENT_CENTERS,G36_H2_VENT_SIZE}
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
 assert.equal(h2.userData.handguardArtVersion,'h2.1-angled-four-vents');
 assert.equal(info.meshes,4);
 assert.equal(info.stations,5);
 assert.equal(info.corners,8);
 assert.equal(info.ventsPerSide,4);
 assert.ok(info.triangles<500,'broad forms and paired instanced vents, no microscopic detail');
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
   if(near(position.getX(i),station.x,.001))
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
 assert.ok(a>b+24,'front opening is physically formed by an annular rim and throat');
 const x=bounds(mesh(opened,'h2MouthRecess'));
 assert.ok(x.max.x<bounds(shellOpen).max.x-.2,'recess is behind front face');
 free(opened);free(closed);
});

test('H2 options independently toggle raised lug, vents, mouth and width',()=>{
 const base=buildG36H2Handguard();
 const plain=buildG36H2Handguard({showBoss:false,showVents:false,showMouth:false,width:1.2});
 assert.ok(mesh(base,'h2MountingLug'));
 assert.ok(mesh(base,'h2GraphicVents'));
 assert.equal(mesh(base,'h2GraphicVents').count,8);
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

test('H2.1 S1: both terminal planes lean, not vertical slabs; center stays broad and parallel',()=>{
 const [rear,fullStart,fullEnd,frontStart,nose]=G36_H2_STATIONS;
 const a=h2StationVertices(rear),b=h2StationVertices(nose);
 // Upper rear corner is farther forward than the lower rear corner.
 assert.ok(a[0][0]-a[4][0]>.55,'rear upper face leans forward strongly');
 // Upper front corner stops noticeably earlier than the lower front lip.
 assert.ok(b[4][0]-b[0][0]>.35,'nose face is visibly inclined');
 assert.ok(fullStart.top-rear.top>.50,'rear top enters on a single rising wedge');
 assert.ok(rear.bottom-fullStart.bottom>.45,'rear lower edge angles down into main body');
 assert.ok(fullEnd.top-nose.top>.60,'front upper edge slopes into clipped nose');
 assert.ok(nose.bottom-fullEnd.bottom>.58,'front lower edge rises into clipped nose');
 assert.equal(fullStart.top,fullEnd.top,'long roof stays exactly parallel');
 assert.equal(fullStart.bottom,fullEnd.bottom,'long floor stays exactly parallel');
 assert.equal(fullStart.half,fullEnd.half,'center half-width is constant');
 assert.ok(fullEnd.x-fullStart.x>=6.5,'65% of total length retains full mass');
 assert.ok(nose.half/fullEnd.half>.85,'front remains thick, not needle-shaped');
 assert.ok(frontStart.top<fullEnd.top&&frontStart.bottom>fullEnd.bottom,
  'front termination starts a single clean taper');
});

test('H2.1 S2: exactly four oversized high graphic vents per side',()=>{
 const g=buildG36H2Handguard({showBoss:false,showMouth:false});
 const v=mesh(g,'h2GraphicVents');
 assert.deepEqual([...G36_H2_VENT_CENTERS],[2.50,4.27,6.04,7.81]);
 assert.equal(G36_H2_VENT_SIZE.length,1.32);
 assert.equal(G36_H2_VENT_SIZE.height,.40);
 assert.equal(G36_H2_VENT_SIZE.centerY,.43);
 assert.equal(v.count,8,'four instanced slits per side, not ten separate meshes');
 assert.equal(v.userData.h2VentCountPerSide,4);
 const shape=v.geometry;
 shape.computeBoundingBox();
 const dims=new THREE.Vector3();shape.boundingBox.getSize(dims);
 assert.ok(near(dims.x,1.32)&&near(dims.y,.40));
 let prev=-Infinity;
 const matrix=new THREE.Matrix4(),pos=new THREE.Vector3();
 for(let i=0;i<4;i++){
  v.getMatrixAt(i,matrix);pos.setFromMatrixPosition(matrix);
  assert.ok(near(pos.x,G36_H2_VENT_CENTERS[i]));
  assert.ok(near(pos.y,.43));
  assert.ok(pos.x-prev>1.75||i===0,'uncluttered graphic negative space');
  prev=pos.x;
 }
 v.getMatrixAt(4,matrix);pos.setFromMatrixPosition(matrix);
 assert.ok(pos.z<0,'opposite side receives matching vent row');
 assert.ok(G36_H2_VENT_CENTERS[0]-G36_H2_VENT_SIZE.length/2>1.75,
  'vents do not crowd angled rear transition');
 assert.ok(9.85-G36_H2_VENT_CENTERS[3]-G36_H2_VENT_SIZE.length/2>1.3,
  'vents do not crowd angled nose');
 free(g);
});

test('H2.1 S3: simplified front mouth retains one inset rim with no second ring',()=>{
 const open=buildG36H2Handguard({showBoss:false,showVents:false});
 const closed=buildG36H2Handguard({showBoss:false,showVents:false,showMouth:false});
 const a=mesh(open,'h2PrimaryShell').geometry.getAttribute('position').count;
 const b=mesh(closed,'h2PrimaryShell').geometry.getAttribute('position').count;
 assert.equal(a-b,30,'one 8-corner annular rim replaces closed 6-triangle cap');
 assert.equal(h2StudyStatistics(open).meshes,2,'one shell + one dark inset face');
 assert.equal(h2StudyStatistics(closed).meshes,1);
 const inset=mesh(open,'h2MouthRecess');
 assert.ok(inset);
 assert.ok(bounds(inset).max.x<bounds(mesh(open,'h2PrimaryShell')).max.x-.2);
 free(open);free(closed);
});
