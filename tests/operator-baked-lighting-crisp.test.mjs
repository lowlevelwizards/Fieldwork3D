import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {enableBakedGearAO,bakeGearContactAO,GEAR_CONTACT_AO_RADIUS}
 from '../src/operator-baked-gear-ao.ts';
import {bakeCastOnGear} from '../src/operator-baked-gear-cast.ts';
import {garmentBoxUV} from '../src/operator-fabric-camo-materials.ts';
import {headwearCastShadowAtlas,frontShadowSample}
 from '../src/operator-baked-shadow-maps.ts';

const material=()=>{
 const mat=new THREE.MeshStandardMaterial({color:0xffffff});
 enableBakedGearAO(mat);
 return mat;
};
const mesh=(mat,w=2,h=5,d=5)=>{
 return new THREE.Mesh(garmentBoxUV(
  new THREE.BoxGeometry(w,h,d),w,h,d,mat),mat);
};
const frontCenter=geo=>{
 const p=geo.getAttribute('position'),n=geo.getAttribute('normal');
 const i=Array.from({length:p.count},(_,j)=>j).find(j=>
  n.getX(j)>.99&&Math.abs(p.getY(j))<.01&&Math.abs(p.getZ(j))<.01);
 assert.notEqual(i,undefined,'requires a front-center vertex for contact comparison');
 return i;
};
test('small contact shadows distinguish a pouch touching the carrier from distant gear',()=>{
 assert.ok(GEAR_CONTACT_AO_RADIUS<=1.05);
 const mat=material(),group=new THREE.Group();
 const base=mesh(mat);group.add(base);
 const index=frontCenter(base.geometry);
 const before=base.geometry.getAttribute('color').getX(index);
 const pouch=mesh(mat,1.2,2.5,2.5);
 pouch.position.set(1.85,0,0);group.add(pouch);
 bakeGearContactAO(group);
 const near=base.geometry.getAttribute('color').getX(index);
 assert.ok(before-near>.13,'a near pouch creates visible but contained contact contrast');
 assert.ok(near>=.62-.005,'no blackened, blown-out panels');
 const matFar=material(),groupFar=new THREE.Group();
 const distantBase=mesh(matFar);
 const distantPouch=mesh(matFar,1.2,2.5,2.5);
 distantPouch.position.set(4.2,0,0);groupFar.add(distantBase,distantPouch);
 const initial=distantBase.geometry.getAttribute('color').getX(frontCenter(distantBase.geometry));
 bakeGearContactAO(groupFar);
 const far=distantBase.geometry.getAttribute('color').getX(frontCenter(distantBase.geometry));
 assert.ok(Math.abs(initial-far)<.015,'pouch several units away must cast NO contact halo');
});
test('projected shadows stay near a separate caster, not a long-range dark wash',()=>{
 const mat=material(),chest=new THREE.Group();
 const carrier=new THREE.Group(),pouches=new THREE.Group();
 const panel=mesh(mat,2,5,5),pouch=mesh(mat,1.2,2.5,2.5);
 carrier.add(panel);pouches.add(pouch);chest.add(carrier,pouches);
 const index=frontCenter(panel.geometry);
 pouch.position.set(2,0,0);
 bakeCastOnGear(carrier,[pouches],chest,'close-pouch');
 const close=panel.geometry.getAttribute('color').getX(index);
 pouch.position.x=8;
 bakeCastOnGear(carrier,[pouches],chest,'far-pouch');
 const far=panel.geometry.getAttribute('color').getX(index);
 assert.ok(far>close+.09,'casts must disappear when the actual caster moves away');
 assert.ok(far>.85,'unoccluded armor panel must stay readable after the mild gradient');
});
test('brim shadow has a small forehead footprint rather than a fuzzy half-face wash',()=>{
 const bare=headwearCastShadowAtlas('bare');
 for(const id of ['boonie','pasgt','ach']){
  const map=headwearCastShadowAtlas(id);
  const brow=frontShadowSample(map,3.4);
  const clearBrow=frontShadowSample(bare,3.4);
  const cheek=frontShadowSample(map,1.2);
  const clearCheek=frontShadowSample(bare,1.2);
  assert.ok(brow<clearBrow-.08,id+' must still create a brow shadow');
  assert.ok(cheek>=clearCheek-.09,id+' must not shade the lower face');
  assert.equal(map.magFilter,THREE.NearestFilter);
 }
});
