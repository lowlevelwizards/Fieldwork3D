import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {lensFacetMaterial} from '../src/operator-d2-eyewear-shell.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
import {D2_LENS_MATERIALS} from '../src/operator-head-accessory-catalog.ts';

const frame=new THREE.MeshStandardMaterial({color:0x27292a});
const lens=new THREE.MeshStandardMaterial({color:0xcad9d4,opacity:.31,transparent:true});
const strap=new THREE.MeshStandardMaterial({color:0x313731});
const meshes=root=>{const all=[];root.traverse(o=>{if(o.isMesh)all.push(o)});return all;};
const housing=root=>meshes(root).filter(o=>o.userData.d2EyeProfile);
const lenses=root=>meshes(root).filter(o=>o.name.endsWith('-lens'));
const facets=root=>meshes(root).filter(o=>o.name.endsWith('-lens-facet'));
const outlines=mesh=>{
 const shape=mesh.geometry.parameters.shapes;
 return {outer:shape.getPoints(),hole:shape.holes[0].getPoints()};
};
const range=(points,axis)=>[
 Math.min(...points.map(p=>p[axis])),Math.max(...points.map(p=>p[axis]))
];
test('R2.1 aviator keeps tall pilot lenses but resolves each fang into a broad lower facet',()=>{
 const glasses=createD2Glasses('glasses-aviator',frame,lens);
 const units=housing(glasses);
 assert.equal(units.length,2);
 for(const unit of units){
  const {outer}=outlines(unit);
  const [minY,maxY]=range(outer,'y');
  assert.ok(maxY-minY>3.4,'retain bold vertical pilot height');
  const base=outer.filter(p=>p.y<=minY+.07);
  assert.ok(base.length>=2,'low end terminates in a horizontal or broad faceted shelf');
  assert.ok(range(base,'x')[1]-range(base,'x')[0]>.67,
   'bottom spread must be wide, not a single skinny V point');
 }
 assert.ok(meshes(glasses).some(m=>m.name==='pilot-high-bridge'));
 assert.ok(meshes(glasses).some(m=>m.name==='pilot-low-bridge'));
});
test('R2.1 tactical wedge wing is connected across the front-height range',()=>{
 const glasses=createD2Glasses('glasses-wrap',frame,lens);
 assert.equal(housing(glasses).length,2);
 for(const fin of meshes(glasses).filter(m=>m.name.startsWith('swept-back-tactical-wing'))){
  const yz=fin.geometry.parameters.shapes.getPoints();
  const front=yz.filter(p=>p.x>5.18);
  assert.ok(front.length>=2,'wing should start at the front of the wedge');
  const [bottom,top]=range(front,'y');
  assert.ok(top>4.85&&bottom<2.85,'wing overlaps nearly the whole outer lens edge');
  const rear=yz.filter(p=>p.x< -3.4);
  assert.ok(range(rear,'y')[1]-range(rear,'y')[0]<.6,
   'wing tapers continuously to a lighter temple');
 }
});
test('R2.1 shield is an open continuous plate while low-profile goggles are a compact sealed box',()=>{
 const shield=createD2Glasses('glasses-shield',frame,lens);
 const low=createD2Goggles('goggles-low',frame,lens,strap).children[0];
 assert.equal(lenses(shield).length,1);
 assert.equal(lenses(low).length,1);
 const shieldFrame=housing(shield)[0],lowFrame=housing(low)[0];
 const s=shieldFrame.userData.d2EyeProfile,l=lowFrame.userData.d2EyeProfile;
 assert.ok(s.width>l.width+1.7,'visor is clearly wider than compact goggles');
 assert.ok(s.height>l.height+.9,'visor is a substantially taller sheet');
 const {outer:so,hole:sh}=outlines(shieldFrame);
 const upperThickness=range(so,'y')[1]-range(sh,'y')[1];
 const lowerThickness=range(sh,'y')[0]-range(so,'y')[0];
 assert.ok(upperThickness>lowerThickness*2.4,
  'visor has a dominant brow but a light, open lower frame');
 const {hole:lh}=outlines(lowFrame);
 const cheek=Math.min(...lh.filter(p=>Math.abs(p.x)>1).map(p=>p.y));
 const nose=Math.max(...lh.filter(p=>Math.abs(p.x)<1).map(p=>p.y));
 assert.ok(nose-cheek>.65,'sealed goggle needs pronounced nose relief');
 assert.ok(meshes(low).filter(m=>m.name==='compact-lower-cheek-pad').length===2);
 assert.ok(meshes(low).some(m=>m.name==='compact-upper-cushion'));
 assert.ok(!meshes(shield).some(m=>m.name.includes('cushion')));
});
test('R2.1 one broad lens facet per actual lens, no fine reflection strips',()=>{
 for(const id of ['glasses-standard','glasses-aviator','glasses-wrap','glasses-shield']){
  const root=createD2Glasses(id,frame,lens);
  const active=id==='glasses-standard'?root.children[0]:root;
  assert.equal(facets(active).length,lenses(active).length,id);
  for(const facet of facets(active)){
   assert.equal(facet.geometry.type,'ShapeGeometry');
   assert.equal(facet.renderOrder,3);
   assert.equal(facet.material,lensFacetMaterial(lens));
   assert.equal(facet.geometry.parameters.shapes.getPoints().length,5);
  }
 }
 for(const id of ['goggles-low','goggles-field','goggles-retro']){
  const active=createD2Goggles(id,frame,lens,strap).children[0];
  assert.equal(facets(active).length,lenses(active).length,id);
 }
});
test('R2.1 tint and clear-glass highlights update through reused materials without rebuilding meshes',()=>{
 const cloth=new THREE.MeshStandardMaterial({color:0x717267});
 const root=new THREE.Group(),head=new THREE.Group();root.add(head);
 const layers=createWardrobeHeadLayers(root,head,cloth,cloth,cloth,cloth);
 const active=layers.eyewear['glasses-aviator'].children.find(m=>m.userData.modelAxes);
 const originals=meshes(active).map(m=>m.geometry);
 for(const tint of ['clear','smoke','amber','dark-smoke','mirrored','clear']){
  updateWardrobeHeadLayers(layers,'bare','face-none','glasses-aviator','comms-none',
   undefined,undefined,{eyeTint:tint,eyeFrame:'olive'});
  assert.equal(layers.eyewearLens.color.getHex(),D2_LENS_MATERIALS[tint].hex);
  assert.equal(layers.eyewearLens.opacity,D2_LENS_MATERIALS[tint].opacity);
  assert.equal(lensFacetMaterial(layers.eyewearLens).opacity,
   tint==='clear'?.075:.115);
 }
 assert.deepEqual(meshes(active).map(m=>m.geometry),originals);
 // Approved silhouette families are not rebuilt by the R2.1 refinement.
 const standard=createD2Glasses('glasses-standard',frame,lens);
 assert.deepEqual(standard.children.map(m=>m.userData.d2EyeVariant),
  ['rectangular','round','heavy-square']);
 const field=createD2Goggles('goggles-field',frame,lens,strap).children[0];
 const retro=createD2Goggles('goggles-retro',frame,lens,strap).children[0];
 assert.equal(housing(field)[0].userData.d2EyeProfile.frontZ,-6.30);
 assert.equal(housing(retro).length,2);
});
