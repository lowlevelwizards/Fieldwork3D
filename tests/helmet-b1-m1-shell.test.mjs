import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M1_OUTLINE,M1_STEEL_LEVELS,M1_FIT_LANDMARKS,
 createM1ProfileGeometry,m1PerimeterAt,m1SurfacePoint} from '../src/operator-m1-helmet-profile.ts';
import {createM1RetainingBandGeometry,createM1NetGeometry,
 createM1ScrimGeometry} from '../src/operator-m1-field-geometry.ts';
import {createHeadwearSilhouette,HEAD_SILHOUETTE_METRICS}
 from '../src/operator-headwear-silhouettes.ts';
test('B1-A one-piece M1: intentional facets, thin rolled rim, open underside',()=>{
 assert.equal(M1_OUTLINE.length,8,'four broad flats and four corners only');
 assert.equal(M1_STEEL_LEVELS.length,7,'single shoulder, long wall, sloping lip and dark underside');
 assert.equal(M1_STEEL_LEVELS.filter(x=>x.name.startsWith('rolled-rim')).length,2);
 const roof=M1_STEEL_LEVELS[0],bowl=M1_STEEL_LEVELS[2];
 assert.ok(roof.side/bowl.side>.79&&roof.side/bowl.side<.83,
  'flat crown is broad without making the whole shell square');
 const rim=M1_STEEL_LEVELS[3],lower=M1_STEEL_LEVELS[4];
 assert.ok(rim.y-lower.y>=.45&&rim.y-lower.y<=.52,
  'rolled edge is exaggerated but remains subordinate to the pot');
 assert.ok(rim.side-bowl.side>.5,'readable rolled lip on both sides');
 assert.ok(rim.front-bowl.front>.75,'front lip is unmistakable');
 assert.ok(bowl.y-rim.y>.25,'pot-wall lower break is not a stacked crown');
 assert.ok(M1_STEEL_LEVELS[1].y-bowl.y>3.20,
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
 assert.ok(geo.boundingBox.max.x>6.0&&geo.boundingBox.max.x<6.1);
 assert.ok(geo.boundingBox.min.z<HEAD_SILHOUETTE_METRICS['soviet-steel'].frontExtent);
 assert.ok(geo.boundingBox.max.y-geo.boundingBox.min.y>6);
 assert.equal(geo.index.count/3,104,'low-poly underside adds 16 faces to the 88-triangle pot');
 assert.equal(geo.userData.m1OutlineSegments,8);
 assert.equal(geo.userData.m1BoldSilhouetteRevision,3);
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
  assert.ok(net.boundingBox.max.y>10);
 }
 assert.ok(Math.abs(M1_FIT_LANDMARKS.chinstrapRight[0])>5.2,
  'retention remains attached to the expanded shell');
});

test('B1 corrective: cloth hem, band and net track new exaggerated shell',()=>{
 const shell=createM1ProfileGeometry('steel'),fitted=createM1ProfileGeometry('fitted');
 shell.computeBoundingBox();fitted.computeBoundingBox();
 assert.ok(shell.boundingBox.min.x< -6.0);
 assert.ok(shell.boundingBox.min.z< -6.9);
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

test('B1 R3: M1 front/side/rear orthographic identity is measurable',()=>{
 const front=m1SurfacePoint('steel',4,0),
  rear=m1SurfacePoint('steel',4,4);
 assert.ok(front[1]-rear[1]>.60,'rear rim sweeps distinctly lower');
 assert.ok(M1_STEEL_LEVELS[0].y-M1_STEEL_LEVELS[4].y>5.5,
  'tall bowl; no squashed pot');
 const brimWidth=M1_STEEL_LEVELS[4].side*2;
 const brimLength=M1_STEEL_LEVELS[4].front+M1_STEEL_LEVELS[4].rear;
 assert.ok(brimLength/brimWidth>1.10,
  'M1 is longer front-to-back than its width, not square');
 assert.ok(M1_STEEL_LEVELS[4].front-M1_STEEL_LEVELS[2].front>1,
  'front beak projects past the wall');
 assert.ok(M1_STEEL_LEVELS[4].rear-M1_STEEL_LEVELS[2].rear<.5,
  'rear is shorter than the front brim');
 assert.ok(M1_STEEL_LEVELS[0].shift>M1_STEEL_LEVELS[2].shift,
  'crown slopes rearward relative to the projecting brim');
});
test('B1 R3: underside has recessed visible wall but remains open for the head',()=>{
 const s=createM1ProfileGeometry('steel');
 const stations=s.userData.m1ProfileStations;
 assert.equal(stations.at(-1),'recessed-liner-edge');
 assert.equal(s.userData.m1ProfileHistoricSweep,true);
 const inner=m1SurfacePoint('steel',6,2);
 const rim=m1SurfacePoint('steel',4,2);
 assert.ok(inner[1]>rim[1]+.45,'inner return rises visibly into shell');
 assert.ok(Math.abs(inner[0])<Math.abs(rim[0])-.8,
  'recessed underside provides dark visible inner lip');
 assert.ok(s.index.count/3<=110,
  'underside must not introduce high-density mesh');
});
