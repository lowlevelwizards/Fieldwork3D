import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M1_OUTLINE,M1_STEEL_LEVELS,M1_FIT_LANDMARKS,
 createM1ProfileGeometry,m1PerimeterAt} from '../src/operator-m1-helmet-profile.ts';
import {createM1RetainingBandGeometry,createM1NetGeometry,
 createM1ScrimGeometry} from '../src/operator-m1-field-geometry.ts';
import {createHeadwearSilhouette,HEAD_SILHOUETTE_METRICS}
 from '../src/operator-headwear-silhouettes.ts';
test('B1-A one-piece M1: intentional facets, thin rolled rim, open underside',()=>{
 assert.ok(M1_OUTLINE.length>=12&&M1_OUTLINE.length<=16);
 assert.equal(M1_STEEL_LEVELS.filter(x=>x.name.startsWith('rolled-rim')).length,2);
 const roof=M1_STEEL_LEVELS[0],bowl=M1_STEEL_LEVELS[3];
 assert.ok(roof.side/bowl.side<.8,'top plateau is smaller than full bowl');
 const rim=M1_STEEL_LEVELS[4],lower=M1_STEEL_LEVELS[5];
 assert.ok(rim.y-lower.y<.28,'rolled edge must not become second tier');
 const geo=createM1ProfileGeometry('steel');
 for(const key of ['position','uv','uv1','color','normal'])
  assert.ok(geo.getAttribute(key),key);
 assert.ok(geo.index?.count>0);
 assert.equal(geo.userData.m1FacetedSurface,true);
 geo.computeBoundingBox();
 assert.ok(Math.abs(geo.boundingBox.max.y-
  HEAD_SILHOUETTE_METRICS['m1-steel'].top)<1e-4,
  'Float32 geometry must match authored roof within upload precision');
 assert.ok(geo.boundingBox.max.x>5.45&&geo.boundingBox.max.x<6);
 assert.ok(geo.boundingBox.min.z<HEAD_SILHOUETTE_METRICS['soviet-steel'].frontExtent);
 assert.ok(geo.boundingBox.max.y-geo.boundingBox.min.y>4);
 const shell=createHeadwearSilhouette('m1-steel',new THREE.MeshStandardMaterial());
 assert.equal(shell.children.length,1);
 assert.equal(shell.userData.primitive,'m1-one-piece-faceted-profile');
 assert.equal(shell.children[0].geometry.userData.m1ProfileMode,'steel');
});
test('B1-A fitted and loose drapes follow the same profile and preserve rim',()=>{
 const bare=createM1ProfileGeometry('steel'),fitted=createM1ProfileGeometry('fitted'),
  loose=createM1ProfileGeometry('loose');
 for(const g of [bare,fitted,loose]){
  g.computeBoundingBox();
  assert.equal(g.userData.m1FacetedSurface,true);
 }
 assert.ok(loose.boundingBox.max.x>fitted.boundingBox.max.x);
 assert.ok(fitted.boundingBox.max.y>bare.boundingBox.max.y);
 assert.ok(fitted.boundingBox.min.y>bare.boundingBox.min.y+.25,
  'cover hem must leave rolled steel rim exposed');
 const wrapped=m1PerimeterAt(5.30,'fitted'),
  exposed=m1PerimeterAt(5.30,'steel');
 assert.equal(wrapped.length,exposed.length);
 assert.ok(Math.abs(wrapped[3][0])>Math.abs(exposed[3][0]));
});
test('B1-A bands, net and scrim have real prebuilt surface contacts',()=>{
 for(const mode of ['steel','fitted','loose']){
  const band=createM1RetainingBandGeometry(mode),
   net=createM1NetGeometry(mode),scrim=createM1ScrimGeometry(mode,true);
  for(const g of [band,net,scrim]){
   assert.ok(g.getAttribute('position').count>0);
   assert.equal(g.userData.m1ProfileDerived,true);
   g.computeBoundingBox();
   assert.ok(Number.isFinite(g.boundingBox.min.y));
  }
  assert.ok(net.boundingBox.max.y>8.6);
 }
 assert.ok(Math.abs(M1_FIT_LANDMARKS.chinstrapRight[0])>4.8);
});
