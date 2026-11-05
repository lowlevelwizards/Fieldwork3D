import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,headwearCuboidVolumes} from '../src/operator-headwear-silhouettes.ts';
import {HEADWEAR_SURFACE_PROFILE} from '../src/operator-headwear-materials.ts';
import {HEADWEAR_DEFAULT_SOLIDS,headwearColorChoices} from '../src/operator-headwear-colors.ts';
import {initialWardrobe,readWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
test('R5H3: protective police helmet is independent of ACH shell',()=>{
 const p=headwearCuboidVolumes('police-helmet'),a=headwearCuboidVolumes('ach');
 assert.notDeepEqual(p,a);
 assert.ok(p.some(x=>x.name.includes('ear-guard')));
 const group=createHeadwearSilhouette('police-helmet',new THREE.MeshStandardMaterial());
 const box=new THREE.Box3().setFromObject(group);
 assert.ok(box.max.y>=8.85);
 assert.ok(box.min.y<=2.2);
});
test('R5H3: police helmet owns restricted solids and head-helmet class',()=>{
 assert.equal(HEADWEAR_DEFAULT_SOLIDS['police-helmet'],'black');
 assert.deepEqual(headwearColorChoices('police-helmet'),['black','navy','charcoal']);
 assert.equal(HEADWEAR_SURFACE_PROFILE['police-helmet'].family,'matte-composite');
 const w=setWardrobeStyle(initialWardrobe(),'headwear','police-helmet');
 assert.equal(readWardrobe(w).styles.headwear,'police-helmet');
});
