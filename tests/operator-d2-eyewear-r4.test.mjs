import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
import {D2_EYEWEAR,D2_FRAME_COLORS,D2_LENS_MATERIALS} from '../src/operator-head-accessory-catalog.ts';
import {readWardrobe} from '../src/operator-wardrobe-data.ts';

const frame=new THREE.MeshStandardMaterial({color:0x29332e});
const lens=new THREE.MeshStandardMaterial({color:0xa8b8ae,transparent:true,opacity:.4,side:THREE.DoubleSide});
const strap=new THREE.MeshStandardMaterial({color:0x596451});
const meshes=g=>{const r=[];g.traverse(o=>{if(o.isMesh)r.push(o)});return r};
const named=(g,s)=>meshes(g).filter(m=>m.name.includes(s));
const pane=(g)=>meshes(g).filter(m=>m.name.endsWith('-lens'));
const eyeBox=(g)=>new THREE.Box3().setFromObject(g);
const pts=m=>m.geometry.parameters.shapes.getPoints();
const range=(arr,key)=>Math.max(...arr.map(x=>x[key]))-Math.min(...arr.map(x=>x[key]));
const g=(id)=>createD2Glasses(id,frame,lens);
const p=(id)=>createD2Goggles(id,frame,lens,strap).children[0];

test('R4 preserves seven IDs while naming actual shooting and motor eyewear',()=>{
 assert.deepEqual(D2_EYEWEAR.map(x=>x.id),[
  'glasses-standard','glasses-aviator','glasses-wrap','glasses-shield',
  'goggles-low','goggles-field','goggles-retro']);
 assert.equal(D2_EYEWEAR.find(x=>x.id==='glasses-wrap').name,'Shooting glasses');
 assert.equal(D2_EYEWEAR.find(x=>x.id==='goggles-retro').name,'Vintage motor goggles');
});
test('R4 all spectator temples connect and clear the eight-unit cube head',()=>{
 for(const id of ['glasses-standard','glasses-aviator','glasses-wrap','glasses-shield']){
  const model=g(id);
  const active=id==='glasses-standard'?model.children[0]:model;
  const temples=meshes(active).filter(m=>m.userData.d2TempleFit);
  assert.equal(temples.length,2,id);
  for(const m of temples){
   const f=m.userData.d2TempleFit;
   assert.ok(f.shoulderX-(f.shoulderWidth??.63)/2>=4.005,id+' shoulder outside head');
   assert.ok(f.rearX-(f.rearWidth??.40)/2>=4.005,id+' rear outside head');
   assert.ok(f.frontZ<f.shoulderZ&&f.shoulderZ<f.rearZ,id);
   assert.ok(f.frontX-(f.frontWidth??.58)/2<=
    (id==='glasses-standard'?4.32:id==='glasses-aviator'?3.75:
     id==='glasses-wrap'?4.42:4.26)+.04,
    id+' front must overlap real frame corner');
  }
 }
});
test('R4 chunky acetate wider spread and rounder pilot upper shoulders',()=>{
 const model=g('glasses-standard').children[0];
 const front=named(model,'single-acetate-front-housing')[0];
 const shape=front.geometry.parameters.shapes;
 assert.ok(range(pts(front),'x')>=8.35);
 assert.equal(shape.holes.length,2);
 const holes=shape.holes.map(h=>h.getPoints());
 const centers=holes.map(h=>h.reduce((s,x)=>s+x.x,0)/h.length);
 assert.ok(centers[1]-centers[0]>4.2,'civilian lens centers spread apart');
 const pilot=g('glasses-aviator');
 const left=named(pilot,'pilot-lens-collar-housing')[0];
 const outline=pts(left);
 assert.ok(outline.filter(pt=>pt.y>4.7).length>=3,
  'aviator needs broad rounded upper shoulder, not square top');
 const floor=Math.min(...outline.map(pt=>pt.y));
 const low=outline.filter(pt=>pt.y<=floor+.04);
 assert.ok(range(low,'x')>.8,'soft lower teardrop, not isolated V spike');
 assert.ok(range(outline,'y')>2.7);
 assert.equal(named(pilot,'pilot-upper-bridge').length,1);
 assert.equal(named(pilot,'pilot-lower-bridge').length,1);
});
test('R4 shooting glasses are one swept sporty lens, shield stays an open plate',()=>{
 const shooting=g('glasses-wrap'),shield=g('glasses-shield');
 assert.equal(pane(shooting).length,1,'shooting must be a single panoramic pane');
 assert.equal(pane(shield).length,1);
 assert.equal(named(shooting,'integrated-swept-frame-housing').length,1);
 assert.equal(named(shooting,'lower-rim').length,0);
 const shape=pane(shooting)[0].geometry.parameters.shapes.getPoints();
 const cheek=Math.min(...shape.filter(v=>Math.abs(v.x)>1.0&&Math.abs(v.x)<3.5).map(v=>v.y));
 const nose=Math.max(...shape.filter(v=>Math.abs(v.x)<.8&&v.y<4).map(v=>v.y));
 assert.ok(nose-cheek>.8,'big open shooting-glasses nose relief');
 assert.ok(!named(shield,'housing').length,'shield retains no surrounding lower frame');
});
test('R4 sport W and bunker goggles are fundamentally different shapes',()=>{
 const low=p('goggles-low'),field=p('goggles-field');
 const lowHousing=named(low,'sport-seal-housing')[0];
 const fieldHousing=named(field,'deep-field-shell-housing')[0];
 assert.ok(lowHousing&&fieldHousing);
 const shape=lowHousing.geometry.attributes.position;
 const ptsLow=[];
 for(let i=0;i<shape.count;i++)if(Math.abs(shape.getZ(i)+5.04)<.02)
  ptsLow.push({x:shape.getX(i),y:shape.getY(i)});
 const cheeks=Math.min(...ptsLow.filter(v=>Math.abs(v.x)>1.3&&Math.abs(v.x)<3).map(v=>v.y));
 const nose=Math.max(...ptsLow.filter(v=>Math.abs(v.x)<.8&&v.y<4).map(v=>v.y));
 assert.ok(nose-cheeks>.34,'compact goggle gets distinct W nose cut');
 const e=lowHousing.userData.d2EyeProfile;
 const f=fieldHousing.userData.d2EyeProfile;
 assert.ok(f.width>e.width+1.1,'field goggles substantially broader');
 assert.ok(f.housingDepth>e.housingDepth+.75,'field bunker deeper');
 assert.equal(named(field,'field-soft-rear-gasket').length,1);
 assert.ok(named(low,'field-soft-rear-gasket').length===0);
});
test('R4 vintage is leather-backed with shallower round cups and no binocular barrels',()=>{
 const vintage=p('goggles-retro');
 assert.equal(named(vintage,'connected-vintage-leather-housing').length,1);
 const cups=named(vintage,'vintage-faceted-barrel-housing');
 assert.equal(cups.length,2);
 for(const c of cups){
  const data=c.userData.d2EyeProfile;
  assert.ok(data.housingDepth>=1.45&&data.housingDepth<1.7);
 }
 assert.equal(pane(vintage).length,2);
 assert.ok(meshes(vintage).length<=10,'no micro fittings');
});
test('R4 switch variants, tints, helmet and goggle poses without reallocations',()=>{
 const cloth=new THREE.MeshStandardMaterial({color:0x7b836e});
 const outer=new THREE.Group(),head=new THREE.Group();outer.add(head);
 const layers=createWardrobeHeadLayers(outer,head,cloth,cloth,cloth,cloth);
 const standard=layers.eyewear['glasses-standard'].children.find(c=>c.userData.modelAxes);
 const loaded=layers.eyewear['goggles-low'].children.find(c=>c.userData.modelAxes);
 const before=[...meshes(standard),...meshes(loaded)].map(m=>m.geometry);
 for(const [variant,tint] of [['rectangular','clear'],['round','amber'],['heavy-square','smoke']]){
  const saved=readWardrobe({version:1,styles:{eyewear:'glasses-standard'},
   d2Accessories:{eyeMode:variant,eyeTint:tint,eyeFrame:'olive'}});
  updateWardrobeHeadLayers(layers,'ach','face-none','glasses-standard','comms-none',
   undefined,undefined,saved.d2Accessories);
  assert.deepEqual(standard.children.filter(c=>c.visible).map(c=>c.userData.d2EyeVariant),[variant]);
  assert.equal(layers.eyewearLens.color.getHex(),D2_LENS_MATERIALS[tint].hex);
  assert.equal(layers.eyewearFrame.color.getHex(),D2_FRAME_COLORS.olive.hex);
 }
 for(const [headwear,pos,pose] of [
  ['ach','raised','helmet'],['bare','raised','forehead'],
  ['ach','eyes','eyes'],['bare','neck','neck']
 ]){
  updateWardrobeHeadLayers(layers,headwear,'face-none','goggles-low','comms-none',
   undefined,undefined,{eyePosition:pos});
  assert.deepEqual(loaded.children.filter(c=>c.visible)
   .map(c=>c.userData.d2GogglePlacement),[pose]);
 }
 assert.deepEqual([...meshes(standard),...meshes(loaded)].map(m=>m.geometry),before);
});
