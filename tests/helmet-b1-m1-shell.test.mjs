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
 assert.equal(M1_OUTLINE.length,8,'four broad flats and four corners only');
 assert.equal(M1_STEEL_LEVELS.length,6,'one shoulder, one pot wall and one rolled lip');
 assert.equal(M1_STEEL_LEVELS.filter(x=>x.name.startsWith('rolled-rim')).length,2);
 const roof=M1_STEEL_LEVELS[0],bowl=M1_STEEL_LEVELS[2];
 assert.ok(roof.side/bowl.side>.78&&roof.side/bowl.side<.84,
  'flat crown is broad without making the whole shell square');
 const rim=M1_STEEL_LEVELS[3],lower=M1_STEEL_LEVELS[4];
 assert.ok(rim.y-lower.y>=.30&&rim.y-lower.y<=.36,
  'rolled edge is exaggerated but remains subordinate to the pot');
 assert.ok(rim.side-bowl.side>.60,'readable rim projection all around the pot');
 assert.ok(rim.front-bowl.front>.75,'front lip is unmistakable');
 assert.ok(bowl.y-rim.y>.25,'pot-wall lower break is not a stacked crown');
 assert.ok(M1_STEEL_LEVELS[1].y-bowl.y>2.45,
  'the uninterrupted pot wall remains the largest vertical mass');
 const geo=createM1ProfileGeometry('steel');
 for(const key of ['position','uv','uv1','color','normal'])
  assert.ok(geo.getAttribute(key),key);
 assert.ok(geo.index?.count>0);
 assert.equal(geo.userData.m1FacetedSurface,true);
 geo.computeBoundingBox();
 assert.ok(Math.abs(geo.boundingBox.max.y-
  HEAD_SILHOUETTE_METRICS['m1-steel'].top)<1e-4,
  'Float32 geometry must match authored roof within upload precision');
 assert.ok(geo.boundingBox.max.x>6.8&&geo.boundingBox.max.x<7);
 assert.ok(geo.boundingBox.min.z<HEAD_SILHOUETTE_METRICS['soviet-steel'].frontExtent);
 assert.ok(geo.boundingBox.max.y-geo.boundingBox.min.y>4.5);
 assert.equal(geo.index.count/3,88,'cut original M1 210 triangles by over half');
 assert.equal(geo.userData.m1OutlineSegments,8);
 assert.equal(geo.userData.m1BoldSilhouetteRevision,2);
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
 assert.ok(Math.abs(M1_FIT_LANDMARKS.chinstrapRight[0])>5.9,
  'retention remains attached to the expanded shell');
});

test('B1 corrective: cloth hem, band and net track new exaggerated shell',()=>{
 const shell=createM1ProfileGeometry('steel'),fitted=createM1ProfileGeometry('fitted');
 shell.computeBoundingBox();fitted.computeBoundingBox();
 assert.ok(shell.boundingBox.min.x< -6.8);
 assert.ok(shell.boundingBox.min.z< -7.05);
 assert.ok(fitted.boundingBox.min.y>shell.boundingBox.min.y+.45,
  'cloth hem must not conceal the prominent rim');
 for(const mode of ['steel','fitted','loose']){
  const perimeter=m1PerimeterAt(5.5,mode);
  assert.equal(perimeter.length,8,'no accessory still uses old 14-point faceting');
  const band=createM1RetainingBandGeometry(mode);
  assert.ok(band.getAttribute('position').count<=8*6,
   'band uses one coarse eight-sided strip');
  const net=createM1NetGeometry(mode);
  assert.ok(net.getAttribute('position').count>0);
 }
});
