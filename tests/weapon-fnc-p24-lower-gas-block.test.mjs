/** P24: lower FNC gas-block casting runs back into polymer with sparse pixel relief. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {fncPixelAtlas}
 from '../src/weapons/geometry/fnc-pixel-details.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
const one=(g,key)=>g.children.find(x=>x.userData[key]);
const all=(g,key)=>g.children.filter(x=>x.userData[key]);
const bounds=x=>new THREE.Box3().setFromObject(x);
const near=(a,b,e=.035)=>Math.abs(a-b)<e;
const sample=(tileCol,tileRow,x,y,b)=>{
 const {data,width}=fncPixelAtlas().image,[x0,x1,y0,y1]=b;
 const i=tileCol*128+Math.max(0,Math.min(127,Math.floor((x-x0)/(x1-x0)*128)));
 const j=tileRow*128+Math.max(0,Math.min(127,Math.floor((y-y0)/(y1-y0)*128)));
 return data[(j*width+i)*4];
};
const sideBounds=()=>[L.gas.startX,L.gas.endX,L.gas.frontBottomY,L.gas.topY];

test('P24 metal gas block enters the polymer and forms one continuous lower casting',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const gas=one(g,'fncP24RearwardLowerGasBlock'),
  poly=one(g,'fncFacetedHandguard'),
  stop=one(g,'fncP11HandstopLip'),
  ears=all(g,'fncP20SimpleSightEar');
 assert.ok(gas&&poly&&stop);
 assert.equal(gas,one(g,'fncP23DeepForwardGasBlock'),
  'extend the established gas body, do not add another slab');
 assert.equal(all(g,'fncP24RearwardLowerGasBlock').length,1);
 assert.equal(gas.geometry.getAttribute('position').count,216,
  'six stations, same single six-face manifold, 24 extra triangles');
 assert.ok(L.gas.lowerStartX<L.polymer.endX-.7);
 assert.ok(L.gas.lowerFullX>L.polymer.endX);
 assert.ok(L.gas.lowerFullX<L.gas.transitionStartX,
  'bottom section starts inside handguard, upper expansion stays forward');
 assert.ok(bounds(gas).intersectsBox(bounds(poly))&&
  bounds(gas).intersectsBox(bounds(stop)));
 const positions=gas.geometry.getAttribute('position');
 const lowerAt=x=>{
  let low=Infinity;
  for(let i=0;i<positions.count;i++){
   if(near(positions.getX(i),x,.002))
    low=Math.min(low,positions.getY(i));
  }
  return low;
 };
 assert.ok(near(lowerAt(L.gas.startX),L.gas.bottomY));
 assert.ok(near(lowerAt(L.gas.lowerStartX),L.gas.bottomY));
 assert.ok(near(lowerAt(L.gas.lowerFullX),L.gas.frontBottomY));
 assert.ok(near(lowerAt(L.gas.transitionStartX),L.gas.frontBottomY));
 assert.ok(near(lowerAt(L.gas.endX),L.gas.frontBottomY));
 assert.ok(bounds(gas).min.y<bounds(poly).max.y-1.40);
 assert.equal(ears.length,2);
 assert.ok(ears.every(x=>bounds(x).intersectsBox(bounds(gas))));
 clearWeaponSilhouette(g);m.dispose();
});
test('P24 has exactly two subtle longitudinal pixel lines on lower gas side, no planes',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m),
  gas=one(g,'fncP24RearwardLowerGasBlock');
 assert.ok(gas);
 assert.equal(L.gas.lowerLines.length,2);
 assert.equal(gas.userData.fncPixelLowerGasLines,2);
 assert.equal(gas.material.map,fncPixelAtlas());
 const b=sideBounds();
 for(const line of L.gas.lowerLines){
  assert.ok(line.startX>L.polymer.endX&&line.endX<L.gas.endX);
  const middle=(line.startX+line.endX)/2;
  assert.equal(sample(3,0,middle,line.y,b),line.shade,
   'authored nearest-neighbor line pixels on the existing side tile');
  assert.equal(sample(3,0,middle,line.y+.21,b),255,
   'marking does not create a shaded band around whole lower block');
 }
 assert.equal(sample(3,0,11.1,-.91,b),255,
  'no stray dark line inside the polymer');
 assert.equal(sample(0,1,13.0,0,[L.gas.startX,L.gas.endX,
  -L.gas.roofHalfZ,L.gas.roofHalfZ]),255,
  'lower casting detail does not appear on roof');
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 const pos=gas.geometry.getAttribute('position');
 const uv=gas.geometry.getAttribute('uv');
 assert.equal(uv.count,pos.count);
 let sideFaces=0;
 for(let i=0;i<uv.count;i++){
  if(uv.getX(i)>=.75&&uv.getX(i)<1&&uv.getY(i)<.5&&
     pos.getX(i)>12.0&&pos.getY(i)<0)sideFaces++;
 }
 assert.ok(sideFaces>=12,'textured lower gas flanks really use the side atlas region');
 assert.ok(!g.children.some(x=>x.userData.fncP24GasDetailLine),
  'no redundant line/decal mesh');
 clearWeaponSilhouette(g);m.dispose();
});
test('P24 preserves the entire 12 vent mask, polymer grooves, muzzle, stock, and STANAG',()=>{
 const m=new THREE.MeshBasicMaterial(),
  c=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const gun=buildWeaponSilhouette('rifle',m,m,c);
 const stats=countGeometry(gun),peers=buildAuditReport();
 assert.equal(stats.triangles,536,'only two extra six-face stations (24 triangles)');
 assert.equal(stats.meshes,23,'no draw call increase for gas casting/lines');
 assert.equal(stats.triangles,peers.find(x=>x.name==='FNC').triangles);
 assert.equal(peers.find(x=>x.name==='FAL').triangles,366);
 assert.equal(peers.find(x=>x.name==='M4A1').triangles,462);
 const gas=one(gun,'fncP24RearwardLowerGasBlock'),
  poly=one(gun,'fncFacetedHandguard');
 assert.ok(gas&&poly);
 assert.equal(poly.userData.fncPixelGroovesPerSide,2);
 const lastVentX=L.gas.ventFirstX+(L.gas.ventCount-1)*L.gas.ventPitch+L.gas.ventLength;
 assert.ok(lastVentX<L.gas.transitionStartX-.35);
 for(let k=0;k<4;k++){
  const x=L.gas.ventFirstX+k*L.gas.ventPitch+.4;
  assert.equal(sample(3,0,x,1.17,sideBounds()),114);
  assert.equal(sample(0,1,x,0,[L.gas.startX,L.gas.endX,
   -L.gas.roofHalfZ,L.gas.roofHalfZ]),114);
 }
 assert.ok(near(bounds(gun).min.x,FNC_P1.stockRearX));
 assert.ok(near(bounds(gun).max.x,FNC_P1.muzzleX));
 assert.ok(one(gun,'fncSharedARStanag'));
 assert.equal(resolveWeaponAssembly(c).muzzleX,FNC_P1.muzzleX);
 const suppressed={...c,slots:{...c.slots,muzzle:'muzzle-suppressor'}};
 const bare=buildWeaponSilhouette('rifle',m,m,suppressed);
 assert.ok(!one(bare,'fncMuzzle'));
 assert.ok(one(bare,'fncP24RearwardLowerGasBlock'));
 clearWeaponSilhouette(gun);clearWeaponSilhouette(bare);m.dispose();
 console.log('FNC P24 CONTINUOUS GAS AND PIXEL RELIEF',JSON.stringify(stats));
});
