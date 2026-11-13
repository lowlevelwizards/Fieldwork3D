import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {sampleHelmetCover} from '../src/operator-helmet-surface.ts';
import {createAchMichDetails,updateAchMichDetails}
 from '../src/operator-ach-mich-details.ts';
const shells=['ach','mich-2001','mich-2002'];

test('H9.1: cover attachment frames use actual drape, outward normals and orthogonal axes',()=>{
 for(const shell of shells){
  for(const region of ['front','back','left','right','crown']){
   for(const u of [-.65,0,.65]){
    const sample=sampleHelmetCover(shell,region,u,0);
    assert.ok(sample,shell+' '+region+' '+u+' has no cloth surface');
    assert.ok(Math.abs(sample.normal.length()-1)<1e-4);
    assert.ok(Math.abs(sample.up.dot(sample.normal))<1e-4);
    assert.ok(Math.abs(sample.right.dot(sample.normal))<1e-4);
    if(region==='front')assert.ok(sample.normal.z<-.1);
    if(region==='back')assert.ok(sample.normal.z>.1);
    if(region==='left')assert.ok(sample.normal.x<-.1);
    if(region==='right')assert.ok(sample.normal.x>.1);
   }
  }
 }
});

test('H9.1: painted rim is not rendered on top of fitted fabric',()=>{
 for(const shell of shells){
  const layers=createAchMichDetails(new THREE.Group(),shell);
  updateAchMichDetails(layers,true,true);
  assert.equal(layers.bare.visible,false);
  assert.equal(layers.hardware.visible,false);
  assert.equal(layers.strap.visible,true);
  updateAchMichDetails(layers,false,true);
  assert.equal(layers.bare.visible,true);
  assert.equal(layers.hardware.visible,true);
 }
 const head=readFileSync(new URL('../src/operator-wardrobe-head-visuals.ts',import.meta.url),'utf8');
 assert.match(head,/THREE.BackSide/);
 assert.match(head,/child.userData.achMichInterior===true/);
 assert.match(head,/shellCovered:!shellCovered/);
});
