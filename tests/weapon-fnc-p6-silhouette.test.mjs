/** FNC P6 geometry acceptance. The user's mobile screenshots caught end-cap
 * backface culling despite the prior build passing test suites.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';

const by=(g,k)=>g.children.filter(x=>x.userData[k]);
const box=o=>new THREE.Box3().setFromObject(o);
function capNormal(mesh,at){
 const positions=mesh.geometry.getAttribute('position');
 const normals=mesh.geometry.getAttribute('normal');
 const bound=box(mesh);
 const x=at==='rear'?bound.min.x:bound.max.x;
 let count=0,sign=0;
 for(let i=0;i<positions.count;i+=3){
  if([i,i+1,i+2].every(j=>Math.abs(positions.getX(j)-x)<1e-4)){
   count++;sign+=normals.getX(i);
  }
 }
 assert.ok(count>=4,'closed cap triangles must exist on '+at);
 assert.ok((at==='rear'?-sign:sign)/count>.8,
  at+' cap must face OUTWARD to avoid disappearing behind default FrontSide culling');
}
test('P6: rear receiver and forward handguard are truly closed and outward-facing',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=by(g,'fncP5CrownedReceiver')[0],guard=by(g,'fncP5LowerHex')[0];
 assert.ok(upper&&guard);
 assert.equal(m.side,THREE.FrontSide);
 capNormal(upper,'rear');capNormal(upper,'front');
 capNormal(guard,'rear');capNormal(guard,'front');
 clearWeaponSilhouette(g);m.dispose();
});
test('P11: two polymer lines and broken upper gas rows per side',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=by(g,'fncP5UpperGasBox')[0],lower=by(g,'fncP5LowerHex')[0];
 assert.ok(upper&&lower);
 assert.ok(box(upper).max.z<box(lower).max.z-.22,
  'upper gas box is intentionally slimmer than the hexagonal lower');
 const marks=by(g,'fncP5GrooveSide');assert.equal(marks.length,4);
 for(const level of ['upper','lower']){
  const meshes=marks.filter(x=>x.userData.fncP5GrooveLevel===level);
  assert.equal(meshes.length,2);
  for(const mesh of meshes){
   const rows=2,segments=level==='upper'?5:1;
   assert.equal(mesh.userData.fncP5GrooveCount,rows);
   assert.equal(mesh.userData.fncP6GrooveSegmentsPerRow,segments);
   assert.ok(mesh.userData.fncP6BoldGrooveHeight>=.15);
   assert.equal(mesh.geometry.getAttribute('position').count,rows*segments*6);
   const normal=mesh.geometry.getAttribute('normal').getZ(0);
   assert.ok(normal*mesh.userData.fncP5GrooveSide>.9);
  }
 }
 clearWeaponSilhouette(g);m.dispose();
});
test('P6: compact receiver and broad sights, genuinely projecting charging knob',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=by(g,'fncP5CrownedReceiver')[0];
 const rear=by(g,'fncP5OversizedRearSight')[0];
 const front=by(g,'fncP5OversizedFrontSight')[0];
 const handle=by(g,'fncP6ProtrudingChargingHandle')[0];
 const stem=by(g,'fncP6ChargingHandleStem')[0];
 const muzzle=by(g,'fncP6StubbyMuzzle')[0];
 assert.ok(upper&&rear&&front&&handle&&stem&&muzzle);
 assert.ok(box(upper).max.x<4.0);
 const web=by(g,'fncP6BoldStockWeb')[0];
 const gas=by(g,'fncP5UpperGasBox')[0];
 assert.ok(web&&gas);
 assert.ok(web.geometry.getAttribute('position').count>=3,
  'central triangular stock gusset uses one solid bold silhouette');
 assert.ok(box(web).max.x-box(web).min.x>2.5&&
  box(web).max.x-box(web).min.x<2.9,
  'P10 longer plate is still compact relative to the open stock void');
 assert.ok(box(gas).min.x<box(by(g,'fncP5LowerHex')[0]).max.x,
  'extended gas cover overlaps shortened fore-end without floating');
 assert.ok(box(front).max.y>2.70&&box(front).max.y<2.85);
 assert.ok(box(rear).max.y>2.40);
 assert.ok(front.userData.fncP12FALLikeFrontEar);
 assert.equal(by(g,'fncP12FALLikeFrontEar').length,2);
 assert.equal(rear.geometry.parameters.shapes.holes.length,1);
 assert.ok(box(handle).max.x-box(handle).min.x<1.16);
 assert.ok(box(handle).max.z>box(upper).max.z+1.25);
 assert.ok(box(stem).max.z>box(handle).min.z,
  'short connecting stem must intersect the projecting grip');
 assert.ok(box(muzzle).max.y-box(muzzle).min.y>1.20);
 assert.ok(box(muzzle).max.x-box(muzzle).min.x<1.45);
 assert.ok(Math.abs(box(g).max.x-FNC_P1.muzzleX)<.02);
 assert.ok(Math.abs(box(g).min.x-FNC_P1.stockRearX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});
