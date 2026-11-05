/** Eyewear R8 focused geometry release gate. All approved item IDs stay intact. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';

const frame=new THREE.MeshStandardMaterial({color:0x252a29});
const lens=new THREE.MeshStandardMaterial({color:0x94a39e,opacity:.32,transparent:true,side:THREE.DoubleSide});
const fabric=new THREE.MeshStandardMaterial({color:0x4f5d50});
const glass=id=>createD2Glasses(id,frame,lens);
const goggle=id=>createD2Goggles(id,frame,lens,fabric).children[0];
const meshes=root=>{const all=[];root.traverse(x=>{if(x.isMesh)all.push(x);});return all;};
const named=(root,part)=>meshes(root).find(m=>m.name.includes(part));
const bounds=m=>new THREE.Box3().setFromObject(m);

test('R8-A broad sport and field bands really intersect the rear fabric volume',()=>{
 for(const [id,minFront,minRear] of [
  ['goggles-low',1.10,.90],
  ['goggles-field',1.42,1.06]
 ]){
  const model=goggle(id);
  const back=named(model,'strap-back');
  const sides=meshes(model).filter(m=>m.userData.d2StrapFamily);
  assert.ok(back,id+' has a shared fabric back');
  assert.equal(sides.length,2,id+' keeps only two side strips');
  assert.ok(back.geometry.parameters.height>=minRear,id+' broad rear band');
  const rearBounds=bounds(back);
  for(const side of sides){
   const fit=side.userData.d2TempleFit;
   const rearTip=new THREE.Vector3(fit.side*fit.rearX,fit.rearY,fit.rearZ);
   assert.ok(rearBounds.containsPoint(rearTip),id+' physically enters rear band');
   assert.ok(bounds(side).intersectsBox(rearBounds),id+' no disconnected corner');
   assert.ok(fit.frontHeight>=minFront,id+' front strap reads as broad fabric');
   assert.ok(fit.frontHeight>fit.shoulderHeight&&fit.shoulderHeight>fit.rearHeight);
   assert.ok(fit.rearZ>=3.96,id+' rear station actually reaches back of head');
   assert.ok(fit.shoulderX-(fit.shoulderWidth??0)/2>4.00,'strap clears side face');
  }
  assert.ok(meshes(model).length<=8,'no decorative strap pieces');
 }
 const vintage=goggle('goggles-retro');
 assert.equal(meshes(vintage).filter(m=>m.userData.d2StrapFamily).length,0,
  'approved vintage leather band is unchanged');
});

test('R8-B shooting temples use small continuous roots without triangular fins',()=>{
 const model=glass('glasses-wrap');
 const brow=named(model,'integrated-swept-frame-housing');
 const arms=meshes(model).filter(m=>m.userData.d2TempleFit);
 assert.ok(brow);
 assert.equal(arms.length,2);
 const pts=brow.geometry.parameters.shapes.getPoints();
 assert.ok(pts.filter(p=>Math.abs(p.x)>4.2).every(p=>p.y>4.30),
  'raised outer brow corner removes hanging triangular spur');
 for(const arm of arms){
  const fit=arm.userData.d2TempleFit;
  assert.ok(fit.frontHeight<.65&&fit.frontWidth<.6,'one compact root');
  assert.ok(Math.abs(fit.frontY-fit.shoulderY)<.06,'no steep stacked wedges');
  assert.ok(Math.abs(fit.shoulderY-fit.rearY)<.30,'gently swept side');
  assert.ok(bounds(arm).intersectsBox(bounds(brow)),'root seats within single brow');
 }
 assert.equal(meshes(model).filter(m=>m.name.includes('fin')).length,0);
 assert.equal(meshes(model).filter(m=>m.name.endsWith('-lens')).length,1);
});

test('R8-C aviators put lower lens weight outward without loosening dual bridges',()=>{
 const model=glass('glasses-aviator');
 const collars=meshes(model).filter(m=>m.name.includes('pilot-lens-collar-housing'));
 assert.equal(collars.length,2);
 const centers=[];
 for(const collar of collars){
  const pts=collar.geometry.parameters.shapes.getPoints();
  const bottomY=Math.min(...pts.map(p=>p.y));
  const foot=pts.filter(p=>Math.abs(p.y-bottomY)<.025);
  assert.ok(Math.abs(bottomY-2.39)<.02,'keep bold flat lower shelf');
  assert.equal(foot.length>=2,true);
  centers.push(foot.reduce((sum,p)=>sum+p.x,0)/foot.length);
  assert.ok(Math.max(...foot.map(p=>p.x))-Math.min(...foot.map(p=>p.x))>1);
 }
 // R9 retained the outward-weighted teardrop but removed the R8 global
 // shear that overextended the corners. The foot is still outboard of
 // the lens midpoint, without turning into a pointed superhero eye.
 assert.ok(centers.some(x=>x< -2.75)&&centers.some(x=>x>2.75),
  'round teardrop foot retains outward mass without extreme splay');
 assert.ok(Math.abs(centers[0]+centers[1])<.04,'mirror-symmetric pilot eyes');
 assert.equal(meshes(model).filter(m=>m.name.includes('pilot-')&&m.name.includes('-bridge')).length,2);
 assert.equal(meshes(model).filter(m=>m.name.endsWith('-lens')).length,2);
});
