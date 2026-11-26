/** FNC P25: uniform authored stroke footprints across top, side, front gas block. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {fncPixelAtlas} from '../src/weapons/geometry/fnc-pixel-details.ts';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const side=[L.gas.startX,L.gas.endX,L.gas.frontBottomY,L.gas.topY];
const roof=[L.gas.startX,L.gas.endX,-L.gas.roofHalfZ,L.gas.roofHalfZ];
const pixel=(col,row,x,y,bounds)=>{
 const {data,width}=fncPixelAtlas().image,[x0,x1,y0,y1]=bounds;
 const i=col*128+Math.max(0,Math.min(127,Math.floor((x-x0)/(x1-x0)*128)));
 const j=row*128+Math.max(0,Math.min(127,Math.floor((y-y0)/(y1-y0)*128)));
 return data[(j*width+i)*4];
};

test('P25 the same physical length and cross-face width defines every gas marking',()=>{
 assert.equal(L.gas.ventLength,1.57);
 assert.equal(L.gas.ventHeight,.31);
 assert.equal(L.gas.ventRoofHalfZ*2,L.gas.ventHeight);
 assert.equal(L.gas.ventCount,4);
 assert.equal(L.gas.lowerLines.length,2);
 for(const line of L.gas.lowerLines)
  assert.ok(Math.abs((line.endX-line.startX)-L.gas.ventLength)<1e-8,
   'front mark longitudinal dimension equals side/top vent length');
 const [upper,lower]=L.gas.lowerLines;
 assert.ok(upper.y-L.gas.ventHeight/2>lower.y+L.gas.ventHeight/2,
  'front marks stay separated, not one big black patch');
 assert.ok(lower.y-L.gas.ventHeight/2>L.gas.frontBottomY,
  'front mark remains on the actual metal face');
});

test('P25 sample real atlas texels at the inner/outer edges of top and side vents',()=>{
 for(let k=0;k<4;k++){
  const start=L.gas.ventFirstX+k*L.gas.ventPitch;
  const center=start+L.gas.ventLength/2;
  assert.equal(pixel(3,0,center,L.gas.ventSideYs[0],side),114);
  assert.equal(pixel(0,1,center,0,roof),114);
  for(const offset of [-.12,.12]){
   assert.equal(pixel(3,0,center,L.gas.ventSideYs[0]+offset,side),114);
   assert.equal(pixel(0,1,center,offset,roof),114);
  }
  for(const offset of [-.20,.20]){
   assert.equal(pixel(3,0,center,L.gas.ventSideYs[0]+offset,side),255);
   assert.equal(pixel(0,1,center,offset,roof),255);
  }
  assert.equal(pixel(3,0,start-.15,L.gas.ventSideYs[0],side),255);
  assert.equal(pixel(0,1,start-.15,0,roof),255);
  assert.equal(pixel(3,0,start+.15,L.gas.ventSideYs[0],side),114);
  assert.equal(pixel(0,1,start+.15,0,roof),114);
 }
});

test('P25 front marks match each vent as compact, separated pixel rectangles',()=>{
 for(const line of L.gas.lowerLines){
  const center=(line.startX+line.endX)/2;
  assert.equal(pixel(3,0,center,line.y,side),line.shade);
  assert.equal(pixel(3,0,center,line.y-.12,side),line.shade);
  assert.equal(pixel(3,0,center,line.y+.12,side),line.shade);
  assert.equal(pixel(3,0,center,line.y-.20,side),255);
  assert.equal(pixel(3,0,center,line.y+.20,side),255);
  assert.equal(pixel(3,0,line.startX+.14,line.y,side),line.shade);
  assert.equal(pixel(3,0,line.startX-.15,line.y,side),255);
  assert.equal(pixel(3,0,line.endX+.15,line.y,side),255);
 }
});

test('P25 modifies only atlas pixels; FNC and other rifle triangle budgets stay identical',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const stats=countGeometry(g);
 assert.equal(stats.triangles,536);
 assert.equal(stats.meshes,23);
 const peers=buildAuditReport();
 assert.equal(peers.find(x=>x.name==='FNC').triangles,536);
 assert.equal(peers.find(x=>x.name==='FAL').triangles,366);
 assert.equal(peers.find(x=>x.name==='M4A1').triangles,422);
 const gas=g.children.find(x=>x.userData.fncP24RearwardLowerGasBlock);
 assert.ok(gas);
 assert.equal(gas.userData.fncPixelLowerGasLines,2);
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 assert.equal(gas.material.map,fncPixelAtlas());
 assert.equal(gas.geometry.getAttribute('uv').count,
  gas.geometry.getAttribute('position').count);
 assert.equal(gas.geometry.getAttribute('position').count,216);
 assert.ok(!g.children.some(x=>x.userData.fncP24GasDetailLine));
 const box=new THREE.Box3().setFromObject(g);
 assert.ok(Math.abs(box.min.x-FNC_P1.stockRearX)<.03);
 assert.ok(Math.abs(box.max.x-FNC_P1.muzzleX)<.03);
 clearWeaponSilhouette(g);m.dispose();
});
