import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {fittedEyeOffset} from '../src/operator-d2-eyewear-fit.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers}
 from '../src/operator-wardrobe-head-visuals.ts';
import {readWardrobe} from '../src/operator-wardrobe-data.ts';
import {D2_FRAME_COLORS,D2_LENS_MATERIALS}
 from '../src/operator-head-accessory-catalog.ts';

const frame=new THREE.MeshStandardMaterial({color:0x24282b});
const lens=new THREE.MeshStandardMaterial({color:0xb5ceca,transparent:true,opacity:.31,side:THREE.DoubleSide});
const strap=new THREE.MeshStandardMaterial({color:0x353d37});
const meshes=g=>{const result=[];g.traverse(o=>{if(o.isMesh)result.push(o)});return result};
const named=(g,n)=>meshes(g).filter(o=>o.name.includes(n));
const panes=g=>meshes(g).filter(o=>o.name.endsWith('-lens'));
const profiles=g=>meshes(g).filter(o=>o.userData.d2EyeProfile);
const dim=g=>new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
const glassNames=['glasses-standard','glasses-aviator','glasses-wrap','glasses-shield'];
const goggleNames=['goggles-low','goggles-field','goggles-retro'];

test('R3 seven canonical IDs map to seven structurally independent archetypes',()=>{
 const groups=[...glassNames.map(x=>createD2Glasses(x,frame,lens)),
  ...goggleNames.map(x=>createD2Goggles(x,frame,lens,strap))];
 assert.deepEqual(groups.map(g=>g.userData.modelAxes),
  Array(7).fill('-Z-forward,+X-right,+Y-up'));
 const active=groups.map((g,i)=>i===0?g.children[0]:i>=4?g.children[0]:g);
 assert.deepEqual(active.map(g=>panes(g).length),[2,2,2,1,1,1,2]);
 assert.deepEqual(active.map(g=>profiles(g).length),[1,2,1,1,1,1,2]);
 assert.deepEqual(groups.slice(4).map(g=>g.children.map(
  p=>p.userData.d2GogglePlacement)),Array(3).fill(null).map(()=>[
  'eyes','forehead','helmet','neck']));
 for(const g of groups){
  assert.equal(named(g,'lens-facet').length,0,
   'do not reintroduce generic quadrilateral reflection meshes');
 }
});
test('R3 civilian front is one integrated silhouette; aviators are full pilot teardrops',()=>{
 const standard=createD2Glasses('glasses-standard',frame,lens);
 const active=standard.children[0];
 assert.equal(named(active,'single-acetate-front-housing').length,1);
 assert.equal(named(active,'one-piece-temple').length,2);
 assert.deepEqual(standard.children.map(g=>g.userData.d2EyeVariant),
  ['rectangular','round','heavy-square']);
 const pilot=createD2Glasses('glasses-aviator',frame,lens);
 assert.equal(named(pilot,'pilot-lens-collar-housing').length,2);
 const pilotL=profiles(pilot)[0];
 const points=pilotL.geometry.parameters.shapes.getPoints();
 const minY=Math.min(...points.map(p=>p.y));
 const foot=points.filter(p=>p.y<minY+.08);
 assert.ok(foot.length>=2,'pilot bottom must be a broad shelf, not a fang');
 assert.ok(Math.max(...foot.map(p=>p.x))-Math.min(...foot.map(p=>p.x))>.8);
 assert.ok(dim(pilot).y>2.5,'pilot glasses remain taller than a small strip');
 assert.equal(named(pilot,'pilot-upper-bridge').length,1);
 assert.equal(named(pilot,'pilot-lower-bridge').length,1);
});
test('R3 wrap is a continuous swept surface, eyeshield is an open borderless pane',()=>{
 const wrap=createD2Glasses('glasses-wrap',frame,lens);
 const housing=named(wrap,'integrated-swept-frame-housing')[0];
 assert.ok(housing);
 const pos=housing.geometry.attributes.position;
 const corners=[];
 for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i))>3.6)
  corners.push(pos.getZ(i));
 const mid=[];
 for(let i=0;i<pos.count;i++)if(Math.abs(pos.getX(i))<.2)
  mid.push(pos.getZ(i));
 assert.ok(Math.min(...corners)-Math.min(...mid)>.58,
  'outside corners wrap backward in Z, not a flat outline');
 assert.equal(named(wrap,'continuous-swept-temple').length,2);
 assert.equal(named(wrap,'fin').length,0);
 const shield=createD2Glasses('glasses-shield',frame,lens);
 assert.equal(panes(shield).length,1);
 assert.equal(named(shield,'housing').length,0,
  'ballistic shield must NOT have enclosing lower frame geometry');
 assert.equal(named(shield,'single-mass-visor-brow').length,1);
 assert.equal(named(shield,'shield-support-temple').length,2);
 assert.ok(dim(shield).x>8.4);
});
test('R3 three goggle families use sculpted 3D housings, not front-sheet extrusions',()=>{
 const [low,field,retro]=goggleNames.map(id=>
  createD2Goggles(id,frame,lens,strap).children[0]);
 for(const g of [low,field,retro]){
  for(const housing of profiles(g)){
   assert.equal(housing.geometry.type,'BufferGeometry');
   const p=housing.userData.d2EyeProfile;
   assert.equal(p.version,3);
   assert.ok(p.housingDepth>1.1);
   assert.ok(panes(g).length>=1);
   const nz=housing.geometry.attributes.normal;
   const front=Array.from({length:nz.count},(_,i)=>nz.getZ(i));
   assert.ok(front.some(z=>z<-.8),'front cap faces camera');
   assert.ok(front.some(z=>z>.8),'rear cap faces backward');
  }
  assert.equal(named(g,'strap-back').length,1);
 }
 assert.ok(profiles(field)[0].userData.d2EyeProfile.housingDepth>
  profiles(low)[0].userData.d2EyeProfile.housingDepth+.75);
 assert.equal(profiles(retro).length,2);
 assert.equal(named(retro,'single-bold-vintage-bridge').length,1);
 assert.ok(dim(retro).z>dim(low).z+1);
 assert.ok(meshes(low).length<=7,'compact goggle uses very few masses');
 assert.ok(meshes(field).length<=7);
});
test('R3 helmet fit uses real lower brow edges and never rebuilds geometries',()=>{
 for(const [style,brow] of [['ach',4.40],['high-cut',4.50],['pasgt',4.055]]){
  const offset=fittedEyeOffset(style,4.8);
  assert.ok(offset.y<0&&offset.z<0);
  assert.ok(4.8+offset.y<=brow+.05,'top frame visible below brow');
 }
 assert.equal(fittedEyeOffset('bare',4.8).y,0);
 const cloth=new THREE.MeshStandardMaterial({color:0x626d5d});
 const outer=new THREE.Group(),head=new THREE.Group();outer.add(head);
 const layers=createWardrobeHeadLayers(outer,head,cloth,cloth,cloth,cloth);
 const standard=layers.eyewear['glasses-standard'].children.find(g=>g.userData.modelAxes);
 const goggles=layers.eyewear['goggles-low'].children.find(g=>g.userData.modelAxes);
 const before=[...meshes(standard),...meshes(goggles)].map(m=>m.geometry);
 updateWardrobeHeadLayers(layers,'ach','face-none','glasses-standard','comms-none');
 assert.ok(standard.position.y<0);
 updateWardrobeHeadLayers(layers,'bare','face-none','glasses-standard','comms-none');
 assert.equal(standard.position.y,0);
 updateWardrobeHeadLayers(layers,'ach','face-none','goggles-low','comms-none',
  undefined,undefined,{eyePosition:'eyes'});
 assert.ok(goggles.children[0].position.y<0);
 updateWardrobeHeadLayers(layers,'ach','face-none','goggles-low','comms-none',
  undefined,undefined,{eyePosition:'raised'});
 assert.equal(goggles.children[2].visible,true);
 assert.equal(goggles.children[2].scale.x,1,'no random raised-helmet scale-up');
 updateWardrobeHeadLayers(layers,'bare','face-none','goggles-low','comms-none',
  undefined,undefined,{eyePosition:'eyes'});
 assert.equal(goggles.children[0].position.y,0);
 assert.deepEqual([...meshes(standard),...meshes(goggles)].map(m=>m.geometry),before);
});
test('R3 existing tint/frame/shape/position save contract remains intact',()=>{
 const cloth=new THREE.MeshStandardMaterial({color:0x626d5d});
 const outer=new THREE.Group(),head=new THREE.Group();outer.add(head);
 const layers=createWardrobeHeadLayers(outer,head,cloth,cloth,cloth,cloth);
 const standard=layers.eyewear['glasses-standard'].children.find(g=>g.userData.modelAxes);
 for(const [mode,frameColor,tint] of [
  ['rectangular','tan','clear'],['round','black','amber'],
  ['heavy-square','olive','mirrored']
 ]){
  const saved=readWardrobe({version:1,styles:{eyewear:'glasses-standard'},
   d2Accessories:{eyeMode:mode,eyeFrame:frameColor,eyeTint:tint}});
  updateWardrobeHeadLayers(layers,'ach','face-none',
   'glasses-standard','comms-none',undefined,undefined,saved.d2Accessories);
  assert.deepEqual(standard.children.filter(g=>g.visible)
   .map(g=>g.userData.d2EyeVariant),[mode]);
  assert.equal(layers.eyewearFrame.color.getHex(),D2_FRAME_COLORS[frameColor].hex);
  assert.equal(layers.eyewearLens.color.getHex(),D2_LENS_MATERIALS[tint].hex);
  assert.equal(layers.eyewearLens.opacity,D2_LENS_MATERIALS[tint].opacity);
 }
 for(const [headwear,pos,expected] of [
  ['ach','raised','helmet'],['bare','raised','forehead'],
  ['ach','eyes','eyes'],['bare','neck','neck']
 ]){
  updateWardrobeHeadLayers(layers,headwear,'face-none',
   'goggles-field','comms-none',undefined,undefined,{eyePosition:pos});
  const model=layers.eyewear['goggles-field'].children.find(g=>g.userData.modelAxes);
  assert.deepEqual(model.children.filter(g=>g.visible)
   .map(g=>g.userData.d2GogglePlacement),[expected]);
 }
});
