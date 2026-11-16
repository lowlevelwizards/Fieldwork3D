/** FNC P21: data-backed pixel-art replaces mesh based decorations. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {fncPixelAtlas,fncPixelAtlasLayout}
 from '../src/weapons/geometry/fnc-pixel-details.ts';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
const surface=(root,role)=>root.children.find(c=>c.userData.fncPixelDetailRegion===role);
const pixel=(col,row,x,y,b)=>{
 const map=fncPixelAtlas(),{data,width}=map.image;
 const [x0,x1,y0,y1]=b;
 const i=col*128+Math.max(0,Math.min(127,Math.floor((x-x0)/(x1-x0)*128)));
 const j=row*128+Math.max(0,Math.min(127,Math.floor((y-y0)/(y1-y0)*128)));
 return data[(j*width+i)*4];
};
test('P21 nearest-neighbor RGBA atlas has real authored dark texels for each detail',()=>{
 const texture=fncPixelAtlas(),layout=fncPixelAtlasLayout();
 assert.equal(texture,fncPixelAtlas(),'share immutable image across all weapons');
 assert.equal(layout.width,512);
 assert.equal(layout.height,256);
 assert.equal(texture.magFilter,THREE.NearestFilter);
 assert.equal(texture.minFilter,THREE.NearestFilter);
 assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
 assert.ok(pixel(0,0,-.40,.20,[-6.4,2.8,-1.2,1.95])<160,'right operating slot');
 assert.equal(pixel(0,0,-3,.20,[-6.4,2.8,-1.2,1.95]),255);
 assert.ok(pixel(1,0,-2,-1.30,[-6.4,2.8,-3.6,-1])<160,'lower receiver seam');
 assert.ok(pixel(1,0,-3,-2.16,[-6.4,2.8,-3.6,-1])<200,'stamp');
 assert.equal(pixel(2,0,-3,-2.16,[-6.4,2.8,-3.6,-1]),255,
  'lower stamp remains right-side specific');
 for(let k=0;k<4;k++){
  const x=L.gas.ventFirstX+k*L.gas.ventPitch+.45;
  assert.ok(pixel(3,0,x,1.17,[1.95,13.95,-.6,1.85])<150,'side vent '+k);
  assert.ok(pixel(0,1,x,0,[1.95,13.95,-.62,.62])<150,'roof vent '+k);
 }
 assert.equal(pixel(3,0,2.6,1.17,[1.95,13.95,-.6,1.85]),255);
 assert.equal(pixel(0,1,2.6,0,[1.95,13.95,-.62,.62]),255);
 const p=L.polymer,transformed=y=>{
  const v=p.pivotY+(y-p.pivotY)*p.heightScale+p.liftY;
  return v+Math.min(0,v+1)*p.lowerFlare;
 };
 for(const y of p.grooveYs)
  assert.ok(pixel(1,1,7.0,transformed(y),[1.95,11.68,-2.8,.7])<180,
   'handguard groove encoded in texture, not separate polygon');
});
test('P21 all marked surfaces share atlas, preserve native finishes and add UVs only',()=>{
 const material=new THREE.MeshBasicMaterial({color:0x666666});
 const g=buildFNCStage1Silhouette(material);
 for(const role of ['receiver-upper','receiver-lower','polymer','gas']){
  const body=surface(g,role);
  assert.ok(body,role);
  assert.equal(body.material.map,fncPixelAtlas());
  assert.ok(body.material!==material,'do not modify shared base material');
  assert.ok(body.geometry.getAttribute('uv'));
  assert.equal(body.geometry.getAttribute('uv').count,
   body.geometry.getAttribute('position').count);
  assert.equal(body.geometry.getAttribute('position').count%3,0);
 }
 assert.equal(material.map,null,'do not leak maps into other weapons');
 const gas=surface(g,'gas'),poly=surface(g,'polymer');
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 assert.equal(poly.userData.fncPixelGroovesPerSide,2);
 assert.ok(!g.children.some(x=>x.name.includes('marks')||
  x.name.includes('roof-vent-row')||x.userData.fncP8UpperLowerSeam||
  x.userData.fncP7UnifiedEjectionSlot||x.userData.fncP16LowerStampRelief));
 clearWeaponSilhouette(g);material.dispose();
});
test('P21 proves real reductions and unchanged magazine, muzzle and other families',()=>{
 const m=new THREE.MeshBasicMaterial();
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const gun=buildWeaponSilhouette('rifle',m,m,config);
 const audit=countGeometry(gun),peers=buildAuditReport();
 assert.ok(audit.triangles<=525,'P21 cuts decoration polygons instead of replacing meshes');
 assert.ok(audit.meshes<=24,'no flat detail overlays survive');
 assert.ok(audit.byPart.handguard.triangles<=105);
 assert.ok(audit.byPart.receiver.triangles<=140);
 assert.equal(peers.find(x=>x.name==='FNC').triangles,audit.triangles);
 assert.equal(peers.find(x=>x.name==='FAL').triangles,366);
 assert.equal(peers.find(x=>x.name==='M16A2').triangles,466);
 const bounds=new THREE.Box3().setFromObject(gun);
 assert.ok(Math.abs(bounds.min.x-FNC_P1.stockRearX)<.03);
 assert.ok(Math.abs(bounds.max.x-FNC_P1.muzzleX)<.03);
 assert.equal(config.build.parts.magazine,'ar-mag30');
 assert.equal(resolveWeaponAssembly(config).muzzleX,19.5);
 const suppressed={...config,slots:{...config.slots,muzzle:'muzzle-suppressor'}};
 const noDevice=buildWeaponSilhouette('rifle',m,m,suppressed);
 assert.ok(!noDevice.children.some(x=>x.userData.fncMuzzle));
 assert.ok(noDevice.children.some(x=>x.userData.fncPixelVentCounts));
 clearWeaponSilhouette(gun);clearWeaponSilhouette(noDevice);m.dispose();
 console.log('FNC P21 PIXEL ATLAS TRIANGLE AUDIT',JSON.stringify(audit));
});
