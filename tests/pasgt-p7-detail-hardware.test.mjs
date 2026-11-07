import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createPasgtCoverLayers,updatePasgtCoverLayers}
 from '../src/operator-pasgt-cover-visuals.ts';
import {createPasgtChinCupInsetGeometry}
 from '../src/operator-pasgt-field-dress.ts';
test('two per-side exposed functional fasteners hide beneath fitted cover',()=>{
 const layers=createPasgtCoverLayers(new THREE.Group());
 assert.equal(layers.hardware.children.length,4);
 const sides=layers.hardware.children.map(x=>Math.sign(x.position.x));
 assert.deepEqual(sides,[-1,-1,1,1]);
 const setup={slits:true,band:'none',concealment:'none'};
 updatePasgtCoverLayers(layers,false,setup,undefined,'p7');
 assert.equal(layers.hardware.visible,true);
 updatePasgtCoverLayers(layers,true,setup,undefined,'p7');
 assert.equal(layers.hardware.visible,false);
 assert.equal(layers.cover.visible,true);
});
test('the inset chin cup adds exactly two broad surface facets',()=>{
 const geo=createPasgtChinCupInsetGeometry();
 assert.equal(geo.getAttribute('position').count,12);
 assert.equal(geo.userData.pasgtShallowChinCup,true);
 assert.ok(geo.boundingBox.max.x-geo.boundingBox.min.x>3);
 assert.ok(geo.boundingBox.max.z-geo.boundingBox.min.z<.10);
 const layers=createPasgtCoverLayers(new THREE.Group());
 assert.ok(layers.field.retention.children.some(x=>x.name.includes('chin-cup')));
});
