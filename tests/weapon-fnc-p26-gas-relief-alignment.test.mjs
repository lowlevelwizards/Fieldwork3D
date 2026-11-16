/** FNC P26: front gas relief aligns to the existing handguard language. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as F} from '../src/weapons/geometry/fnc-front-layout.ts';
import {fncPixelAtlas} from '../src/weapons/geometry/fnc-pixel-details.ts';
import {buildFNCStage1Silhouette} from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {countGeometry} from '../scripts/audit-weapon-geometry.mjs';

const near=(a,b,t=.00001)=>Math.abs(a-b)<t;
const sample=(x,y)=>{
 const image=fncPixelAtlas().image;
 const [x0,x1,y0,y1]=[F.gas.startX,F.gas.endX,F.gas.frontBottomY,F.gas.topY];
 const i=3*128+Math.max(0,Math.min(127,Math.floor((x-x0)/(x1-x0)*128)));
 const j=Math.max(0,Math.min(127,Math.floor((y-y0)/(y1-y0)*128)));
 return image.data[(j*image.width+i)*4];
};
test('P26 top relief shares exact world Y with upper polymer groove',()=>{
 const p=F.polymer;
 const groove=p.grooveYs[0];
 const base=p.pivotY+(groove-p.pivotY)*p.heightScale+p.liftY;
 const worldY=base+Math.min(0,base+1)*p.lowerFlare;
 const upper=F.gas.lowerLines[0];
 assert.ok(near(upper.y,worldY),'upper gas mark must continue upper handguard groove');
 assert.ok(near(worldY,-.34));
 assert.equal(upper.shade,145);
});
test('P26 bottom relief is centered in lower gas-block depth, not against bottom edge',()=>{
 const lower=F.gas.lowerLines[1];
 const center=(F.gas.frontBottomY+F.gas.bottomY)/2;
 assert.ok(near(lower.y,center),'lower detail must be centered in lower gas-block panel');
 assert.ok(near(center,-1.085));
 assert.ok(lower.y-F.gas.ventHeight/2>F.gas.frontBottomY+.3);
 assert.ok(F.gas.lowerLines[0].y-F.gas.ventHeight/2>
  lower.y+F.gas.ventHeight/2,'separate, legible marks');
});
test('P26 atlas pixels have moved with lines, retaining P25 size and palette',()=>{
 const [upper,lower]=F.gas.lowerLines;
 for(const line of [upper,lower]){
  assert.ok(near(line.endX-line.startX,F.gas.ventLength));
  assert.equal(sample((line.startX+line.endX)/2,line.y),line.shade);
  assert.equal(sample((line.startX+line.endX)/2,line.y+.20),255);
  assert.equal(sample((line.startX+line.endX)/2,line.y-.20),255);
 }
 assert.equal(sample((upper.startX+upper.endX)/2,-.86),255,
  'old upper misaligned height is blank');
 assert.equal(sample((lower.startX+lower.endX)/2,-1.34),255,
  'old lower bottom-hugging height is blank');
 for(let k=0;k<4;k++){
  const center=F.gas.ventFirstX+k*F.gas.ventPitch+F.gas.ventLength/2;
  assert.equal(sample(center,F.gas.ventSideYs[0]),114,
   'side vents unaffected by lower relief alignment');
 }
});
test('P26 is atlas-only: exact same gas geometry and production triangle budget',()=>{
 const m=new THREE.MeshBasicMaterial(),gun=buildFNCStage1Silhouette(m);
 const gas=gun.children.find(c=>c.userData.fncP24RearwardLowerGasBlock);
 assert.ok(gas);
 assert.equal(gas.userData.fncPixelLowerGasLines,2);
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 assert.equal(gas.geometry.getAttribute('position').count,216);
 assert.equal(gas.material.map,fncPixelAtlas());
 const geo=countGeometry(gun);
 assert.equal(geo.triangles,536);
 assert.equal(geo.meshes,23);
 clearWeaponSilhouette(gun);m.dispose();
});
