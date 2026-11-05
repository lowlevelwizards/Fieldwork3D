import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {IDENTITY_MARKINGS} from '../src/operator-identity-markings.ts';
import {markingBitmap} from '../src/operator-identity-marking-art.ts';
import {createIdentityVisuals,updateIdentityVisuals}
 from '../src/operator-identity-marking-visuals.ts';
import {headwearCuboidVolumes,createHeadwearSilhouette,
 HEAD_SILHOUETTE_METRICS} from '../src/operator-headwear-silhouettes.ts';
import {headwearColorChoices,headwearSolidHex}
 from '../src/operator-headwear-colors.ts';
import {headwearCamoChoices} from '../src/operator-headwear-camo.ts';
import {referenceLookForKit,resolveFactionReference}
 from '../src/faction-reference-resolver.ts';

test('R5B: each registered identification has a real opaque nearest-pixel image',()=>{
 for(const item of IDENTITY_MARKINGS){
  const image=markingBitmap(item.id);
  assert.ok(image,item.id);
  assert.equal(image.pixels.length,image.width*image.height*4,item.id);
  assert.ok(image.pixels.some(x=>x>0),item.id);
 }
 assert.equal(markingBitmap('badge-invented'),null);
});
test('R5B: patches follow limb parents and chest identifiers are external-armor-only',()=>{
 const chest=new THREE.Group();
 const arms=[0,1].map(()=>({upper:new THREE.Mesh(new THREE.BoxGeometry(2,4,4),
  new THREE.MeshBasicMaterial())}));
 const v=createIdentityVisuals(chest,arms);
 assert.equal(arms[0].upper.children.includes(v.meshes.leftShoulder),true);
 assert.equal(arms[1].upper.children.includes(v.meshes.rightShoulder),true);
 updateIdentityVisuals(v,{rightShoulder:'flag-ukraine',chest:'label-police'},
  'armor-bare','bdu-shirt','no-rig');
 assert.equal(v.meshes.rightShoulder.visible,true);
 assert.equal(v.meshes.chest.visible,false);
 updateIdentityVisuals(v,{chest:'label-police'},
  'soft-vest','bdu-shirt','no-rig');
 assert.equal(v.meshes.rightShoulder.visible,false);
 assert.equal(v.meshes.chest.visible,true);
 assert.ok(v.materials.chest.map);
});
test('R5C: independent directional beret mass, not a scaled patrol cap',()=>{
 const volumes=headwearCuboidVolumes('beret');
 assert.ok(volumes.length>=8&&volumes.length<=16);
 assert.ok(volumes.some(x=>x.x>4&&x.name.includes('drape')));
 const m=HEAD_SILHOUETTE_METRICS.beret;
 assert.ok(m.top>8&&m.earEdge>4);
 assert.ok(headwearColorChoices('beret').includes('beret-scarlet'));
 assert.ok(headwearColorChoices('beret').includes('beret-maroon'));
 assert.deepEqual(headwearCamoChoices('beret'),[]);
 assert.ok(headwearSolidHex('beret','beret-scarlet')!==null);
 const group=createHeadwearSilhouette('beret',new THREE.MeshStandardMaterial());
 assert.equal(group.userData.silhouette,'beret');
 assert.equal(group.children.length,1);
});
test('R5C: reference preview preserves the equipped kit',()=>{
 const r=resolveFactionReference('indonesian-kopassus-1990');
 assert.equal(r.wardrobe.styles.headwear,'beret');
 assert.equal(r.wardrobe.headwearColor,'beret-scarlet');
 assert.equal(r.wardrobe.beretDrape,'right');
 assert.equal(r.wardrobe.markings?.rightShoulder,'flag-indonesia');
 const matched=referenceLookForKit('indonesian-kopassus-1990',r.kit);
 assert.equal(matched.wardrobe.styles.headwear,'beret');
 assert.equal(matched.wardrobe.markings?.rightShoulder,'flag-indonesia');
});
