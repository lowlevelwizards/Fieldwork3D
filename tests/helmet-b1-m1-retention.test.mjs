import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createM1RetentionLayers,updateM1RetentionLayers,
 readM1Chinstrap,m1RetentionAllowed}
 from '../src/operator-m1-retention.ts';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {resolvedM1FieldDress} from '../src/operator-helmet-cover-policy.ts';
test('B1-B both original M1 webbing states are prebuilt and exclusive',()=>{
 const root=new THREE.Group(),layers=createM1RetentionLayers(root);
 assert.equal(root.children.length,2);
 for(const group of root.children){
  assert.equal(group.children.length,1);
  const geo=group.children[0].geometry;
  assert.equal(geo.userData.m1TwoPieceChinstrap,true);
  assert.ok(geo.getAttribute('color'));
 }
 updateM1RetentionLayers(layers,undefined,'face-none');
 assert.equal(layers.fastened.visible,true);
 assert.equal(layers.unfastened.visible,false);
 updateM1RetentionLayers(layers,'unfastened','face-none');
 assert.equal(layers.fastened.visible,false);
 assert.equal(layers.unfastened.visible,true);
 updateM1RetentionLayers(layers,'unfastened','gas-m40');
 assert.equal(layers.unfastened.visible,false);
 assert.equal(m1RetentionAllowed('gas-gp5'),false);
 assert.equal(readM1Chinstrap('old-retired-value'),'fastened');
});
test('B1-B saved M1 wear options survive version-one wardrobe and scrim suppression',()=>{
 const before=initialWardrobe();
 const saved=readWardrobe({...before,m1Chinstrap:'unfastened',
  helmetCover:'none',helmetBand:'none',helmetNet:'none',helmetScrim:'sparse'});
 assert.equal(saved.m1Chinstrap,'unfastened');
 assert.equal(saved.helmetScrim,'sparse');
 assert.equal(resolvedM1FieldDress(saved).helmetScrim,'none');
 assert.equal(resolvedM1FieldDress({...saved,helmetNet:'coarse'}).helmetScrim,'sparse');
 assert.equal(readWardrobe(saved).m1Chinstrap,'unfastened');
});
