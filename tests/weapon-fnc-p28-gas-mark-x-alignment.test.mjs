/** P28: two front casting marks stack vertically at the same X span. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as F} from '../src/weapons/geometry/fnc-front-layout.ts';
import {fncPixelAtlas} from '../src/weapons/geometry/fnc-pixel-details.ts';
import {buildFNCStage1Silhouette} from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {countGeometry} from '../scripts/audit-weapon-geometry.mjs';
const close=(a,b,eps=1e-6)=>Math.abs(a-b)<eps;
const shadeAt=(x,y)=>{
 const {data,width}=fncPixelAtlas().image,g=F.gas;
 const u=3*128+Math.max(0,Math.min(127,Math.floor((x-g.startX)/(g.endX-g.startX)*128)));
 const v=Math.max(0,Math.min(127,Math.floor((y-g.frontBottomY)/(g.topY-g.frontBottomY)*128)));
 return data[(v*width+u)*4];
};
test('P28 both front gas-block markings have one centered X interval',()=>{
 const [top,bottom]=F.gas.lowerLines;
 assert.equal(top.startX,bottom.startX);
 assert.equal(top.endX,bottom.endX);
 assert.ok(close(top.startX,13.05)&&close(top.endX,14.62));
 assert.ok(close(top.endX-top.startX,F.gas.ventLength));
 assert.ok(close(bottom.endX-bottom.startX,F.gas.ventLength));
 const segmentCenter=(F.gas.transitionStartX+F.gas.endX)/2;
 const marksCenter=(top.startX+top.endX)/2;
 assert.ok(Math.abs(segmentCenter-marksCenter)<.06,
  'pair is visually centered inside the front gas-block segment');
 assert.ok(top.startX>F.gas.transitionStartX+.3);
 assert.ok(top.endX<F.gas.endX-.3);
 const lastVentStart=F.gas.ventFirstX+(F.gas.ventCount-1)*F.gas.ventPitch;
 assert.ok(top.startX-lastVentStart-F.gas.ventLength>.75,
  'upper mark retains a clean gap from the fourth vent');
});
test('P28 preserve distinct row heights, shades and 1.57 x 0.31 proportions',()=>{
 const [top,bottom]=F.gas.lowerLines;
 assert.equal(top.y,F.gas.ventSideYs[0]);
 assert.ok(close(bottom.y,-.34));
 assert.equal(top.shade,145);
 assert.equal(bottom.shade,171);
 assert.ok(close(F.gas.ventHeight,.31));
 assert.ok(top.y-bottom.y>F.gas.ventHeight+.5);
});
test('P28 atlas moves lower mark right and preserves top and original side vents',()=>{
 const [top,bottom]=F.gas.lowerLines;
 for(const line of [top,bottom]){
  assert.equal(shadeAt((line.startX+line.endX)/2,line.y),line.shade);
  assert.equal(shadeAt(line.startX-.2,line.y),255);
  assert.equal(shadeAt(line.endX+.2,line.y),255);
  assert.equal(shadeAt((line.startX+line.endX)/2,line.y+.22),255);
 }
 assert.equal(shadeAt(12.50,bottom.y),255,
  'old left-shifted lower line must be cleared');
 for(let k=0;k<4;k++){
  const x=F.gas.ventFirstX+k*F.gas.ventPitch+F.gas.ventLength/2;
  assert.equal(shadeAt(x,F.gas.ventSideYs[0]),114);
 }
});
test('P28 atlas-only correction does not affect mesh count or 4+4+4 vents',()=>{
 const material=new THREE.MeshBasicMaterial();
 const weapon=buildFNCStage1Silhouette(material);
 const gas=weapon.children.find(x=>x.userData.fncP24RearwardLowerGasBlock);
 assert.ok(gas);
 assert.equal(gas.userData.fncPixelLowerGasLines,2);
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 assert.equal(gas.material.map,fncPixelAtlas());
 const measured=countGeometry(weapon);
 assert.equal(measured.triangles,536);
 assert.equal(measured.meshes,23);
 clearWeaponSilhouette(weapon);material.dispose();
});
