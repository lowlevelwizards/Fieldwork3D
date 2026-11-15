import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,HEAD_SILHOUETTE_METRICS}
 from '../src/operator-headwear-silhouettes.ts';
import {createSsh40ProfileGeometry,SSH40_STEEL_LEVELS,
 SSH40_OUTLINE,SSH40_FIT_LANDMARKS,ssh40SurfacePoint}
 from '../src/operator-ssh40-helmet-profile.ts';

const near=(actual,expected,label,tol=.002)=>
 assert.ok(Math.abs(actual-expected)<tol,
  `${label}: expected ${expected}, actual ${actual}`);

test('B2-A1 Soviet steel is exactly one constructed faceted bell, no duplicate shell',()=>{
 const root=createHeadwearSilhouette('soviet-steel',new THREE.MeshStandardMaterial());
 assert.equal(root.children.length,1);
 assert.equal(root.userData.primitive,'ssh40-one-piece-faceted-bell');
 assert.equal(root.userData.stage,'B2');
 const shell=root.children[0];
 assert.equal(shell.children.length,0);
 assert.equal(shell.geometry.userData.ssh40FacetedSurface,true);
 assert.equal(shell.geometry.userData.ssh40VisibleInterior,true);
 assert.equal(shell.geometry.userData.ssh40OutlineSegments,8);
 assert.equal(shell.geometry.userData.greedyCuboidUnion,undefined);
 assert.equal(shell.geometry.userData.ssh40ProfileStations.length,9);
 assert.equal(shell.castShadow,true);
 assert.equal(shell.receiveShadow,false);
 const g=shell.geometry;
 assert.ok(g.index.count/3<=150,'one low-poly shell, no ornamental tiers');
 assert.equal(g.getAttribute('position').count,g.getAttribute('uv').count);
 assert.equal(g.getAttribute('position').count,g.getAttribute('uv1').count);
 assert.equal(g.getAttribute('position').count,g.getAttribute('color').count);
 assert.equal(g.getAttribute('position').count,g.getAttribute('normal').count);
 assert.equal(g.userData.materialRegions,true);
 assert.equal(g.userData.camoAtlasPixels,128);
});

test('B2-A1 bold Soviet bell has small roll, low back and M1-distinct proportions',()=>{
 const g=createSsh40ProfileGeometry(),b=g.boundingBox;
 assert.ok(b,'geometry must have world-space bounds');
 near(b.max.y,8.605,'dome top');
 near(b.min.x,-5.40,'left');
 near(b.max.x,5.40,'right');
 near(b.min.z,-5.53,'front');
 near(b.max.z,5.53,'rear');
 near(b.min.y,3.40,'low rear hem');
 assert.equal(SSH40_OUTLINE.length,8);
 assert.equal(SSH40_STEEL_LEVELS.length,9);
 near(SSH40_FIT_LANDMARKS.top,HEAD_SILHOUETTE_METRICS['soviet-steel'].top,'top fit');
 near(SSH40_FIT_LANDMARKS.frontExtent,
  HEAD_SILHOUETTE_METRICS['soviet-steel'].frontExtent,'front fit');
 assert.ok(HEAD_SILHOUETTE_METRICS['m1-steel'].top-b.max.y>1.5,
  'M1 crown should remain visibly higher and more pot-like');
 assert.ok(Math.abs(HEAD_SILHOUETTE_METRICS['m1-steel'].frontExtent)-5.53>1.0,
  'M1 projecting brim should remain substantially longer');
 const crown=SSH40_STEEL_LEVELS[0],bell=SSH40_STEEL_LEVELS[3],
  roll=SSH40_STEEL_LEVELS[4];
 assert.ok(bell.side-crown.side>2,'continuous bell broadens from dome');
 assert.ok(roll.side-bell.side>.25&&roll.side-bell.side<.45,
  'rolled edge is restrained, not a brim or stacked second tier');
 for(let i=0;i<8;i++){
  const low=ssh40SurfacePoint(5,i);
  const returnEdge=ssh40SurfacePoint(6,i);
  assert.ok(Math.abs(low[0])>=Math.abs(returnEdge[0]),
   'interior edge returns inward toward head');
 }
 near(ssh40SurfacePoint(5,0)[1],4.05,'front hem');
 near(ssh40SurfacePoint(5,4)[1],3.40,'rear hem');
});

test('B2-A1 outward dome and recessed interior underside keep correct normals',()=>{
 const g=createSsh40ProfileGeometry(),p=g.getAttribute('position'),
  n=g.getAttribute('normal');
 let roof=0,underside=0,innermost=0;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),
   ny=n.getY(i);
  assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z));
  assert.ok(Number.isFinite(ny));
  if(y>8.6&&ny>.9)roof++;
  if(y>7.6&&y<7.75&&ny<-.9)underside++;
  if(Math.abs(x)<1&&Math.abs(z)<1&&y<6)innermost++;
 }
 assert.ok(roof>=8,'roof visible from above');
 assert.ok(underside>=8,'recessed ceiling visible from low FIT camera');
 assert.equal(innermost,0,'no solid face or floor across lower head cavity');
});
