import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {tagVisualMaterial} from '../src/rendering/material-identity.ts';
import {applyStudioGraphicLighting,restoreStudioGraphicLighting,
 disposeStudioGraphicLighting} from '../src/operator-studio-graphic-lighting.ts';
import {APPROVED_GRAPHIC_LIGHTING} from '../src/operator-studio-light-lab.ts';

test('F2.3 material roles tune sculptural response without extra render meshes',()=>{
 const root=new THREE.Group();
 const steel=tagVisualMaterial(new THREE.MeshStandardMaterial({color:0x414a44}),'steel');
 const cloth=tagVisualMaterial(new THREE.MeshStandardMaterial({color:0x626d52}),'fabric');
 const a=new THREE.Mesh(new THREE.BoxGeometry(3,4,3),steel);
 const b=new THREE.Mesh(new THREE.BoxGeometry(3,4,3),cloth);
 root.add(a,b);
 const result=applyStudioGraphicLighting(root,APPROVED_GRAPHIC_LIGHTING);
 assert.equal(result.meshes,2);
 assert.equal(root.children.length,2);
 assert.notEqual(a.material,steel);
 assert.notEqual(b.material,cloth);
 const shader=()=>({
  vertexShader:'#include <begin_vertex>',
  fragmentShader:'#include <opaque_fragment>\n#include <shadowmap_pars_fragment>',
  uniforms:{}
 });
 const metalShader=shader(),fabricShader=shader();
 a.material.onBeforeCompile(metalShader,null);
 b.material.onBeforeCompile(fabricShader,null);
 assert.match(metalShader.fragmentShader,/fwMaterialFacing/);
 assert.match(fabricShader.fragmentShader,/fwMaterialFacing/);
 assert.notEqual(a.material.customProgramCacheKey(),b.material.customProgramCacheKey());
 assert.doesNotMatch(fabricShader.fragmentShader,/fieldworkRimStrength/);
 restoreStudioGraphicLighting(root);
 assert.equal(a.material,steel);assert.equal(b.material,cloth);
 disposeStudioGraphicLighting(root);
 for(const m of [a,b])m.geometry.dispose();
 steel.dispose();cloth.dispose();
});
