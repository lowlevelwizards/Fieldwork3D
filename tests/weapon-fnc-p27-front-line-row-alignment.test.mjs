/** P27: front relief really continues the upper side-vent row, then the prior upper height. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as F} from '../src/weapons/geometry/fnc-front-layout.ts';
import {fncPixelAtlas} from '../src/weapons/geometry/fnc-pixel-details.ts';
import {buildFNCStage1Silhouette}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {countGeometry} from '../scripts/audit-weapon-geometry.mjs';
const close=(a,b,e=.00001)=>Math.abs(a-b)<e;
const pixelAt=(u,v)=>{
 const {data,width,height}=fncPixelAtlas().image;
 const x=Math.min(width-1,Math.floor(u*width));
 const y=Math.min(height-1,Math.floor(v*height));
 return data[(y*width+x)*4];
};
const pixelSide=(x,y)=>{
 const g=F.gas,u=(3+(x-g.startX)/(g.endX-g.startX))/4,
  v=((y-g.frontBottomY)/(g.topY-g.frontBottomY))/2;
 return pixelAt(u,v);
};
// Verify a point falls inside a real side-face triangle and that
// its interpolated UV actually samples the desired texel. A pixel in
// an unused atlas tile is not sufficient visual acceptance.
function mappedSidePixel(mesh,x,y,shade){
 const pos=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('uv');
 for(let i=0;i<pos.count;i+=3){
  const p=[0,1,2].map(j=>[pos.getX(i+j),pos.getY(i+j)]),
   t=[0,1,2].map(j=>[uv.getX(i+j),uv.getY(i+j)]);
  if(!t.every(q=>q[0]>=.75&&q[0]<1&&q[1]>=0&&q[1]<.5))continue;
  const [a,b,c]=p;
  const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
  if(Math.abs(det)<1e-6)continue;
  const w0=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det;
  const w1=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;
  const w2=1-w0-w1;
  if(Math.min(w0,w1,w2)<.001)continue;
  const u=w0*t[0][0]+w1*t[1][0]+w2*t[2][0];
  const v=w0*t[0][1]+w1*t[1][1]+w2*t[2][1];
  if(pixelAt(u,v)===shade)return true;
 }
 return false;
}
test('P27 first new front slot is one vent pitch past existing four, same exact height',()=>{
 const top=F.gas.lowerLines[0], lastX=F.gas.ventFirstX+3*F.gas.ventPitch;
 assert.equal(top.y,F.gas.ventSideYs[0]);
 assert.ok(close(top.startX,lastX+F.gas.ventPitch));
 assert.ok(close(top.endX-top.startX,F.gas.ventLength));
 assert.ok(close(top.startX-(lastX+F.gas.ventLength),
  F.gas.ventPitch-F.gas.ventLength));
 assert.ok(top.endX<F.gas.endX-.4);
 const x=(top.startX+top.endX)/2;
 assert.equal(pixelSide(x,top.y),top.shade);
 assert.equal(pixelSide(lastX+F.gas.ventLength+.2,top.y),255,
  'physical gap between fourth and fifth marks remains light');
});
test('P27 second front slot occupies previous top Y and stays clear of lower edge',()=>{
 const [top,bottom]=F.gas.lowerLines;
 assert.ok(close(bottom.y,-.34));
 assert.ok(bottom.y<F.gas.shoulderY-.3);
 assert.ok(bottom.y-F.gas.ventHeight/2>F.gas.frontBottomY+.9);
 assert.ok(bottom.y+F.gas.ventHeight/2<top.y-F.gas.ventHeight/2);
 assert.ok(close(bottom.endX-bottom.startX,F.gas.ventLength));
 assert.equal(pixelSide((bottom.startX+bottom.endX)/2,bottom.y),bottom.shade);
 assert.equal(pixelSide((bottom.startX+bottom.endX)/2,-1.085),255,
  'old low mark no longer darkens front-bottom edge');
});
test('P27 both markings are painted onto visible solid side facets, not just atlas data',()=>{
 const m=new THREE.MeshBasicMaterial(),gun=buildFNCStage1Silhouette(m);
 const gas=gun.children.find(c=>c.userData.fncP24RearwardLowerGasBlock);
 assert.ok(gas);
 for(const mark of F.gas.lowerLines){
  const x=(mark.startX+mark.endX)/2;
  assert.ok(mappedSidePixel(gas,x,mark.y,mark.shade),
   'real front face UV must sample authored mark at x '+x+' y '+mark.y);
 }
 assert.equal(gas.geometry.getAttribute('position').count,216);
 assert.equal(gas.userData.fncPixelLowerGasLines,2);
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 const count=countGeometry(gun);
 assert.equal(count.triangles,536);
 assert.equal(count.meshes,23);
 clearWeaponSilhouette(gun);m.dispose();
});
