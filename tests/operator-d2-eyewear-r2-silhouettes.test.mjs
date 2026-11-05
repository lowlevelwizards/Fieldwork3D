import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {readWardrobe} from '../src/operator-wardrobe-data.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
const frame=new THREE.MeshStandardMaterial({color:0x25312c});
const lens=new THREE.MeshStandardMaterial({color:0xb0b8ac,transparent:true,opacity:.2});
const strap=new THREE.MeshStandardMaterial({color:0x33392f});
const meshes=root=>{const out=[];root.traverse(o=>{if(o.isMesh)out.push(o)});return out};
const shells=root=>meshes(root).filter(m=>m.userData.d2EyeProfile);
const lensCount=root=>meshes(root).filter(m=>m.name.endsWith('-lens')).length;
const apertureBounds=root=>{
 const box=new THREE.Box3();
 for(const mesh of shells(root))box.expandByObject(mesh);
 return box.getSize(new THREE.Vector3());
};
test('E2 real geometry separates upright squares, descending pilots, swept wedges and tall visor',()=>{
 const standard=createD2Glasses('glasses-standard',frame,lens).children[0];
 const aviator=createD2Glasses('glasses-aviator',frame,lens);
 const wrap=createD2Glasses('glasses-wrap',frame,lens);
 const shield=createD2Glasses('glasses-shield',frame,lens);
 const [sq,pilot,wedge,visor]=[standard,aviator,wrap,shield].map(apertureBounds);
 assert.ok(sq.y>2.75&&sq.y<3.1);
 assert.ok(pilot.y>sq.y+.55,'pilot lenses must visibly descend below squares');
 assert.ok(visor.y>3.4&&visor.x>8.4,'shield must form one tall broad plate');
 assert.ok(wedge.y>2.85&&wedge.y<pilot.y,'wedge remains sharp, not pilot drops');
 assert.deepEqual([lensCount(standard),lensCount(aviator),lensCount(wrap),lensCount(shield)],
  [2,2,2,1]);
 assert.equal(shells(visor).length,1);
 assert.ok(meshes(wrap).filter(x=>x.name.startsWith('swept-back-tactical-wing')).length===2);
 assert.ok(meshes(shield).filter(x=>x.name.startsWith('visor-support-rail')).length===2);
 assert.ok(meshes(aviator).some(x=>x.name==='pilot-high-bridge')&&
  meshes(aviator).some(x=>x.name==='pilot-low-bridge'));
});
test('E2 actual protective housings differ in frontal height and front-to-back projection',()=>{
 const [low,field,retro]=['goggles-low','goggles-field','goggles-retro']
  .map(id=>createD2Goggles(id,frame,lens,strap).children[0]);
 const [a,b,c]=[low,field,retro].map(apertureBounds);
 assert.ok(a.y>2.7&&a.y<3.1,'low profile must be compact but still tall');
 assert.ok(b.y>a.y+.7,'field housing must be visually taller than low');
 assert.ok(c.y>a.y+.4,'vintage cups must be large and upright');
 const [lowFront,fieldFront,retroFront]=[low,field,retro]
  .map(m=>Math.min(...shells(m).map(s=>s.userData.d2EyeProfile.frontZ)));
 assert.ok(fieldFront<lowFront-1,'field goggles project >=1 unit farther than low');
 assert.ok(retroFront<lowFront-.9,'retro cups are actual deep barrels');
 assert.deepEqual([lensCount(low),lensCount(field),lensCount(retro)],[1,1,2]);
 assert.equal(shells(retro).length,2);
 assert.ok(meshes(field).some(m=>m.name==='field-top-face-gasket'));
 assert.ok(meshes(retro).some(m=>m.name==='bold-cup-bridge'));
});
test('E2 housing is one simple thick ring per lens with real empty openings',()=>{
 for(const id of ['glasses-standard','glasses-aviator','glasses-wrap','glasses-shield']){
  const group=createD2Glasses(id,frame,lens);
  const active=id==='glasses-standard'?group.children[0]:group;
  assert.ok(shells(active).every(m=>m.geometry.type==='ExtrudeGeometry'));
  assert.ok(shells(active).every(m=>m.geometry.parameters.options.bevelEnabled===false));
  assert.ok(shells(active).every(m=>m.geometry.parameters.options.depth>=.60));
  assert.ok(!meshes(active).some(m=>m.name.endsWith('-rim')),
   'no individual tiny rim bars');
 }
 for(const id of ['goggles-low','goggles-field','goggles-retro']){
  const m=createD2Goggles(id,frame,lens,strap);
  assert.ok(shells(m.children[0]).every(s=>s.geometry.parameters.options.depth>1));
 }
});
test('E2 styles persist, all goggles move without rebuilding geometry',()=>{
 const mat=new THREE.MeshStandardMaterial({color:0x626d64});
 const parent=new THREE.Group(),head=new THREE.Group();parent.add(head);
 const layers=createWardrobeHeadLayers(parent,head,mat,mat,mat,mat);
 const glasses=layers.eyewear['glasses-standard'].children.find(x=>x.userData.modelAxes);
 const goggles=layers.eyewear['goggles-retro'].children.find(x=>x.userData.modelAxes);
 const baseline=[...meshes(glasses),...meshes(goggles)].map(m=>m.geometry);
 for(const mode of ['rectangular','round','heavy-square']){
  const look=readWardrobe({version:1,styles:{eyewear:'glasses-standard'},
   d2Accessories:{eyeMode:mode,eyeFrame:'olive',eyeTint:'amber'}});
  updateWardrobeHeadLayers(layers,'bare','face-none','glasses-standard','comms-none',
   undefined,undefined,look.d2Accessories);
  assert.deepEqual(glasses.children.filter(x=>x.visible).map(x=>x.userData.d2EyeVariant),[mode]);
 }
 for(const [headwear,position,result] of [
  ['bare','raised','forehead'],['ach','raised','helmet'],
  ['ach','eyes','eyes'],['bare','neck','neck']
 ]){
  updateWardrobeHeadLayers(layers,headwear,'face-none','goggles-retro','comms-none',
   undefined,undefined,{eyePosition:position});
  assert.deepEqual(goggles.children.filter(x=>x.visible).map(x=>x.userData.d2GogglePlacement),
   [result]);
 }
 assert.deepEqual([...meshes(glasses),...meshes(goggles)].map(m=>m.geometry),baseline);
});
