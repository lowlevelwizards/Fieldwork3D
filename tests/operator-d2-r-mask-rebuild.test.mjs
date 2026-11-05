import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Mask} from '../src/operator-d2-mask-visuals.ts';
const mat=new THREE.MeshStandardMaterial({color:0x3d433c,side:THREE.DoubleSide});
const mats={rubber:mat,hardware:mat,filters:mat,lens:mat};
const names=(g,name)=>{const list=[];g.traverse(x=>{if(x.name===name)list.push(x);});return list;};
const plateHoles=(g,name)=>{
 const mesh=g.getObjectByName(name);
 assert.ok(mesh?.isMesh,name+' exists');
 const geo=mesh.geometry;
 assert.ok(geo instanceof THREE.ExtrudeGeometry,name+' is fitted cutout shell');
 return geo.parameters.shapes.holes.length;
};
test('D2-R six mask families use true eye apertures and independent signatures',()=>{
 const gp=createD2Mask('gas-gp5',mats);
 const m17=createD2Mask('gas-m17',mats);
 const m40=createD2Mask('gas-m40',mats);
 const m50=createD2Mask('gas-m50',mats);
 for(const g of [gp,m17,m40,m50])
  assert.equal(g.userData.rebuild,'D2-R');
 assert.equal(plateHoles(gp,'gp5-hood-front'),2);
 assert.equal(plateHoles(m17,'m17-full-facepiece'),2);
 assert.equal(plateHoles(m40,'m40-full-facepiece'),2);
 assert.equal(plateHoles(m50,'m50-facepiece-rim-and-chin'),1);
 assert.equal(names(gp,'gp5-round-eye-lens').length,2);
 assert.equal(names(m17,'m17-integrated-cheek-filter').length,2);
 assert.equal(names(m40,'m40-projecting-side-canister').length,1);
 assert.equal(names(m50,'m50-one-piece-panoramic-visor-lens').length,1);
 assert.equal(names(m50,'m50-twin-low-cheek-filter').length,2);
 assert.equal(names(gp,'head-harness-back').length,0);
});
test('D2-R lower face masks preserve prebuilt named modes and attached filters',()=>{
 const tactical=createD2Mask('half-mask',mats);
 const respirator=createD2Mask('respirator-half',mats);
 assert.deepEqual(tactical.children.map(x=>x.userData.d2MaskMode),['solid','mesh']);
 assert.deepEqual(respirator.children.map(x=>x.userData.d2MaskMode),
  ['twin-filter','compact-filter']);
 assert.equal(names(respirator,'dual-filter-canister').length,2);
 assert.equal(names(respirator,'compact-front-filter').length,1);
 assert.equal(names(tactical,'dual-filter-canister').length,0);
 const before=respirator.children[0].children[0].geometry;
 respirator.children[0].visible=false;
 respirator.children[1].visible=true;
 respirator.children[0].visible=true;
 assert.equal(respirator.children[0].children[0].geometry,before);
});
test('D2-R geometry has finite nonzero bounds and full masks contain no flat filled eye slab',()=>{
 const ids=['half-mask','respirator-half','gas-gp5','gas-m17','gas-m40','gas-m50'];
 for(const id of ids){
  const g=createD2Mask(id,mats);
  const bounds=new THREE.Box3().setFromObject(g);
  assert.ok(bounds.max.x>bounds.min.x,id+' x extent');
  assert.ok(bounds.max.y>bounds.min.y,id+' y extent');
  assert.ok(bounds.max.z>bounds.min.z,id+' depth');
  for(const n of [bounds.min.x,bounds.min.y,bounds.min.z,
    bounds.max.x,bounds.max.y,bounds.max.z])
   assert.ok(Number.isFinite(n),id+' finite extent');
 }
 const m50=createD2Mask('gas-m50',mats);
 const visor=m50.getObjectByName('m50-one-piece-panoramic-visor-lens');
 assert.ok(visor?.geometry instanceof THREE.ShapeGeometry,
  'single cutout visor must be an actual shaped pane');
 const m40=createD2Mask('gas-m40',mats);
 assert.equal(names(m40,'m40-projecting-side-canister').length,1);
 assert.ok(m40.getObjectByName('m40-projecting-side-canister').position.x>0,
  'single cartridge is on operator-right cheek');
});
