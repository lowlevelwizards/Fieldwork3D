import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,PASGT_UPPER_CROWN_INSET,
 headwearCuboidVolumes} from '../src/operator-headwear-silhouettes.ts';
import {createPasgtDrapedGeometry,PASGT_COVER_TOP_Y}
 from '../src/operator-pasgt-drape-geometry.ts';
test('four PASGT roof corners are inset without changing bulky lower protection',()=>{
 const source=headwearCuboidVolumes('pasgt');
 assert.equal(source.length,7,'retain the seven canonical protective volumes');
 assert.ok(PASGT_UPPER_CROWN_INSET>.25&&PASGT_UPPER_CROWN_INSET<.45);
 const mesh=createHeadwearSilhouette('pasgt',new THREE.MeshStandardMaterial()).children[0];
 const pos=mesh.geometry.getAttribute('position');
 const roof=source[0].y+source[0].height/2;
 const top=[];
 for(let i=0;i<pos.count;i++)if(Math.abs(pos.getY(i)-roof)<1e-5)
  top.push([pos.getX(i),pos.getZ(i)]);
 assert.ok(top.length>=4);
 assert.ok(Math.max(...top.map(p=>Math.abs(p[0])))<source[0].width/2-.2);
 assert.ok(Math.max(...top.map(p=>Math.abs(p[1])))<source[0].depth/2-.2);
 const cover=createPasgtDrapedGeometry();
 assert.equal(cover.userData.pasgtUvLayout,'three-sewn-cuts-independent-islands');
 assert.ok(cover.boundingBox.max.y>PASGT_COVER_TOP_Y-.01);
 assert.ok(cover.boundingBox.max.x>5.2,'oversized lower ear/skirt remains');
});
