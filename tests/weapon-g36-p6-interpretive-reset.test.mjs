/** P6 acceptance — construct the SAME live master as Arsenal/Operator/Replay.
 * Regression tests defend deliberate visual abstraction, not P5 micro vertices.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout} from '../src/weapons/geometry/g36-silhouettes.ts';
import {G36_LONG_FOREND_RINGS} from '../src/weapons/geometry/g36-handguard-profiles.ts';
import {G36_E0_FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_B_ART} from '../src/weapons/geometry/g36-art-layout.ts';
import {g36PixelAtlas,g36PixelAtlasLayout} from '../src/weapons/geometry/g36-pixel-details.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
const one=(g,k)=>g.children.find(n=>n.userData[k]);
const bounds=o=>new THREE.Box3().setFromObject(o);
const triangles=o=>(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;
test('P6 master: no trace-derived chamfer planes or detail mesh proliferation',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const guard=one(g,'g36LongHandguard');
 assert.equal(guard.geometry.getAttribute('position').count,60);
 assert.equal(G36_LONG_FOREND_RINGS.length,3);
 assert.equal(triangles(guard),20,'exactly 16 flat side and four cap triangles');
 assert.equal(one(g,'g36LowerOptic').geometry.type,'ExtrudeGeometry',
  'P8 production optic is one profile housing rather than a stacked box');
 for(const key of ['g36UpperReflex','g36OpticFace','g36UpperReflexWindow']){
  assert.equal(one(g,key).geometry.type,'BoxGeometry',key+' retains simple face/crown');
 }
 const counts=Object.fromEntries(['g36ReceiverUpper','g36ReceiverLower','g36Grip'].map(k=>[k,triangles(one(g,k))]));
 assert.ok(counts.g36ReceiverUpper<=18);
 assert.ok(counts.g36ReceiverLower<=30);
 assert.ok(counts.g36Grip<=16);
 assert.ok(g.children.length<=22,'a limited HK identity budget, no traced mesh layers');
 assert.ok(g.children.reduce((n,x)=>n+triangles(x),0)<600,
  'the small number of iconic forms must not be disguised trace meshes');
 clearWeaponSilhouette(g);m.dispose();
});
test('P6 lower receiver is a clean body with a genuinely open trigger gap',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const lower=one(g,'g36ReceiverLower');
 assert.equal(lower.geometry.parameters.shapes.holes.length,0);
 const ray=(x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,10),
  new THREE.Vector3(0,0,-1)).intersectObject(lower,false).length>0;
 assert.equal(ray(-2.3,-2.82),false);
 assert.equal(ray(2.05,-2.9),true);
 assert.equal(ray(-5.3,-2.03),true);
 clearWeaponSilhouette(g);m.dispose();
});
test('P6 silhouette is coherent from side, top and three-quarter, factory datums remain',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide}),g=buildG36OriginalBlockout(m);
 const stock=one(g,'g36MasterStock'),handle=one(g,'g36HandleOpening');
 assert.equal(stock.geometry.parameters.shapes.holes.length,2);
 assert.equal(handle.geometry.parameters.shapes.holes.length,1);
 assert.ok(bounds(stock).max.z-bounds(stock).min.z<1.8);
 assert.ok(bounds(handle).max.z-bounds(handle).min.z>=1.49);
 const b=bounds(g);
 assert.ok(Math.abs(b.min.x-G36_B_ART.stockRearX)<.01);
 assert.ok(Math.abs(b.max.x-G36_B_ART.muzzleX)<.01);
 assert.ok(Math.abs(b.max.y-G36_B_ART.opticTopY)<.01);
 assert.equal(G36_E0_FACTORY.integratedOptics,'original-dual');
 assert.equal(G36_E0_FACTORY.feedVisualId,'g36-polymer-556');
 clearWeaponSilhouette(g);m.dispose();
});
test('P6 graphical content is ONLY vents and a polymer facet',()=>{
 const layout=g36PixelAtlasLayout();
 assert.equal(layout.ventsPerSide,4);
 assert.equal(layout.magRibsPerSide,0);
 assert.equal(layout.rightReceiverEjectionOnly,true);
 const {data}=g36PixelAtlas().image;
 const sample=(col,row,x,y)=>data[((row*96+y)*384+col*96+x)*4];
 assert.notEqual(sample(2,0,55,63),255,'one bold right-only ejection port');
 assert.equal(sample(3,0,55,63),255,'opposite receiver remains neutral');
 assert.notEqual(sample(0,0,22,60),255,'one of four large vent graphics');
 assert.ok(sample(2,1,55,51)>=185,'smoked polymer has broad restrained value facets');
});
