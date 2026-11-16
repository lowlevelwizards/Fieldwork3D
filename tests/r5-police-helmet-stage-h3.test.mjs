import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';
import {HEADWEAR_SURFACE_PROFILE} from '../src/operator-headwear-materials.ts';
import {HEADWEAR_DEFAULT_SOLIDS,headwearColorChoices}
 from '../src/operator-headwear-colors.ts';
import {initialWardrobe,readWardrobe,wardrobeItem}
 from '../src/operator-wardrobe-data.ts';

test('D7: retired police shell has no selectable item or geometry',()=>{
 assert.equal(wardrobeItem('headwear','police-helmet'),undefined);
 assert.deepEqual(headwearColorChoices('police-helmet'),[]);
 assert.equal('police-helmet' in HEADWEAR_SURFACE_PROFILE,false);
 assert.equal('police-helmet' in HEADWEAR_DEFAULT_SOLIDS,false);
 assert.equal(headwearCuboidVolumes('police-helmet'),undefined);
});

test('D7: old wardrobe IDs map to current black high-cut ballistic helmet',()=>{
 const before={...initialWardrobe(),
  styles:{...initialWardrobe().styles,headwear:'police-helmet'},
  headwearColor:'black',policeVisorPosition:'raised'};
 const next=readWardrobe(before);
 assert.equal(next.styles.headwear,'mich-2001');
 assert.equal(next.headwearColor,'black');
 assert.deepEqual(readWardrobe(next),next);
 const mesh=createHeadwearSilhouette(next.styles.headwear,
  new THREE.MeshStandardMaterial());
 assert.ok(mesh.children.length>0);
});
