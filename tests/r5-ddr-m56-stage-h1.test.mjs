import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {headwearCuboidVolumes,createHeadwearSilhouette,HEAD_SILHOUETTE_METRICS}
 from '../src/operator-headwear-silhouettes.ts';
import {HEADWEAR_DEFAULT_SOLIDS,headwearColorChoices} from '../src/operator-headwear-colors.ts';
import {HEADWEAR_SURFACE_PROFILE} from '../src/operator-headwear-materials.ts';
import {readWardrobe,setWardrobeStyle,initialWardrobe}
 from '../src/operator-wardrobe-data.ts';
test('R5H1: M56 flared bowl extends past M1 and SSh-40',()=>{
 const pts=headwearCuboidVolumes('ddr-m56');
 assert.ok(pts.length>=12&&pts.length<=18);
 const group=createHeadwearSilhouette('ddr-m56',new THREE.MeshStandardMaterial());
 const bounds=new THREE.Box3().setFromObject(group),width=bounds.max.x-bounds.min.x;
 assert.ok(width>13);
 const m1=new THREE.Box3().setFromObject(
  createHeadwearSilhouette('m1-steel',new THREE.MeshStandardMaterial()));
 const ssh=new THREE.Box3().setFromObject(
  createHeadwearSilhouette('soviet-steel',new THREE.MeshStandardMaterial()));
 assert.ok(width>m1.max.x-m1.min.x+1);
 assert.ok(width>ssh.max.x-ssh.min.x+2);
 assert.ok(HEAD_SILHOUETTE_METRICS['ddr-m56'].rearExtent>
  HEAD_SILHOUETTE_METRICS['m1-steel'].rearExtent);
});
test('R5H1: curated steel finish and persistent wardrobe style',()=>{
 assert.equal(HEADWEAR_DEFAULT_SOLIDS['ddr-m56'],'urban-gray');
 assert.ok(headwearColorChoices('ddr-m56').includes('postwar-green'));
 assert.equal(HEADWEAR_SURFACE_PROFILE['ddr-m56'].family,'painted-steel');
 const w=setWardrobeStyle(initialWardrobe(),'headwear','ddr-m56');
 assert.equal(readWardrobe(w).styles.headwear,'ddr-m56');
});
