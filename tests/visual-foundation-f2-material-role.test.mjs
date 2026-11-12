import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PIXEL_SURFACES} from '../src/rendering/pixel-recipes.ts';
import {MATERIAL_RESPONSES,surfaceVisualRole,tagVisualMaterial,
 visualMaterialRole,applyWorldSurfaceResponse} from '../src/rendering/material-identity.ts';

test('F2.1 every pixel surface maps to a bounded visual material role',()=>{
 for(const surface of PIXEL_SURFACES){
  const role=surfaceVisualRole(surface),p=MATERIAL_RESPONSES[role];
  assert.ok(p, surface);
  assert.ok(p.shadow>.90&&p.shadow<=1,surface);
  assert.ok(p.highlight>=1&&p.highlight<=1.07,surface);
  assert.ok(p.minRoughness>=0&&p.maxRoughness<=1,surface);
 }
 assert.equal(surfaceVisualRole('furniture-wood'),'wood');
 assert.equal(surfaceVisualRole('industrial-steel'),'steel');
 assert.equal(surfaceVisualRole('painted-metal'),'paint');
 assert.equal(surfaceVisualRole('woven-fabric'),'fabric');
 assert.equal(surfaceVisualRole('molded-plastic'),'polymer');
});

test('F2.1 only changes finish response and metadata, never source color',()=>{
 const m=new THREE.MeshStandardMaterial({color:0x58645a,roughness:.94});
 const source=m.color.getHex();
 applyWorldSurfaceResponse(m,'industrial-steel');
 assert.equal(m.color.getHex(),source);
 assert.equal(m.metalness,MATERIAL_RESPONSES.steel.metalness);
 assert.equal(m.roughness,MATERIAL_RESPONSES.steel.maxRoughness);
 assert.equal(visualMaterialRole(m),'steel');
 tagVisualMaterial(m,'armor');
 assert.equal(visualMaterialRole(m),'armor');
 m.dispose();
});
