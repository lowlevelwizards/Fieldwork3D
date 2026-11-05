/** R11 critical gate: expressive acetate + independent compact protective goggles.
 * Keep focused on geometry, identity, fit and persistence contracts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {fittedEyeOffset} from '../src/operator-d2-eyewear-fit.ts';
import {D2_EYEWEAR} from '../src/operator-head-accessory-catalog.ts';
import {readWardrobe} from '../src/operator-wardrobe-data.ts';

const frame=new THREE.MeshStandardMaterial({color:0x2d3335});
const lens=new THREE.MeshStandardMaterial({color:0xa5aaa6,transparent:true,opacity:.35,side:THREE.DoubleSide});
const elastic=new THREE.MeshStandardMaterial({color:0x48544b});
const meshes=root=>{const found=[];root.traverse(x=>{if(x.isMesh)found.push(x)});return found;};
const named=(root,name)=>meshes(root).find(m=>m.name.includes(name));
const nearly=(a,b,tol=.025)=>Math.abs(a-b)<=tol;
const uniquePoints=mesh=>new Set(mesh.geometry.parameters.shapes.getPoints().map(p=>p.x.toFixed(3)+':'+p.y.toFixed(3))).size;
const box=m=>new THREE.Box3().setFromObject(m);

test('R11-A default acetate is one sculpted 24-corner front with two generous lenses',()=>{
 const group=createD2Glasses('glasses-standard',frame,lens);
 const active=group.children[0];
 const all=meshes(active);
 const front=named(active,'single-acetate-front-housing');
 assert.ok(front);
 assert.equal(active.userData.d2EyeVariant,'rectangular');
 assert.equal(uniquePoints(front),24);
 assert.equal(front.geometry.parameters.shapes.holes.length,2);
 assert.equal(all.filter(m=>m.name.endsWith('-lens')).length,2);
 assert.equal(all.length,5,'one frame, two panes and two joined arms');
 const profile=front.userData.d2EyeProfile;
 assert.ok(nearly(profile.width,8.54)&&nearly(profile.height,2.77));
 const holes=front.geometry.parameters.shapes.holes.map(h=>h.getPoints());
 const center=h=>h.reduce((sum,p)=>sum+p.x,0)/h.length;
 assert.ok(center(holes[1])-center(holes[0])>4.45,'civilian eye apertures spread apart');
 assert.ok(holes.every(h=>Math.min(...h.map(p=>p.y))>2.7));
 assert.ok(group.userData.d2EyeFitTop>=4.95);
});

test('R11-A acetate temples join the frame and clear the sides of the cube',()=>{
 const active=createD2Glasses('glasses-standard',frame,lens).children[0];
 const front=named(active,'single-acetate-front-housing');
 const arms=meshes(active).filter(m=>m.userData.d2TempleFit);
 assert.equal(arms.length,2);
 for(const arm of arms){
  const f=arm.userData.d2TempleFit;
  assert.ok(f.shoulderX-f.shoulderWidth/2>4.005);
  assert.ok(f.rearX-f.rearWidth/2>4.005);
  assert.ok(f.frontZ<f.shoulderZ&&f.shoulderZ<f.rearZ);
  assert.ok(box(arm).intersectsBox(box(front)),'temple root physically enters acetate frame');
 }
});

test('R11-B low-profile goggles have a new sealed W nose in a shallow five-piece assembly',()=>{
 const root=createD2Goggles('goggles-low',frame,lens,elastic);
 const active=root.children[0],all=meshes(active);
 const shell=named(active,'single-mass-sport-seal-housing');
 assert.ok(shell);
 assert.equal(all.length,5,'one housing, one lens, two side straps and one rear band');
 assert.equal(all.filter(m=>m.name.endsWith('-lens')).length,1);
 const p=shell.userData.d2EyeProfile;
 assert.equal(p.topology,'single-sealed');
 assert.ok(nearly(p.width,7.7)&&nearly(p.height,2.51));
 assert.ok(nearly(p.housingDepth,.82));
 const positions=shell.geometry.attributes.position;
 const pts=[];
 for(let i=0;i<positions.count;i++)if(nearly(positions.getZ(i),-5.04,.005))
  pts.push([positions.getX(i),positions.getY(i)]);
 assert.ok(pts.some(([x,y])=>nearly(Math.abs(x),.66)&&nearly(y,3.48)),
  'front contour has an elevated central nose relief');
 assert.ok(pts.some(([x,y])=>nearly(Math.abs(x),1.9)&&nearly(y,2.37)),
  'housing still covers lower outer cheek');
 const pane=named(active,'sport-panoramic-pane-lens');
 const paneTop=Math.max(...Array.from({length:pane.geometry.attributes.position.count},(_,i)=>pane.geometry.attributes.position.getY(i)));
 assert.ok(paneTop<4.45,'protective top rim remains visibly thick');
 assert.equal(root.children.length,4,'all placement variants built once');
 assert.deepEqual(root.children.map(x=>x.userData.d2GogglePlacement),['eyes','forehead','helmet','neck']);
});

test('R11-B low strap is broad and continuous, remains distinct from field bunker',()=>{
 const low=createD2Goggles('goggles-low',frame,lens,elastic).children[0];
 const field=createD2Goggles('goggles-field',frame,lens,elastic).children[0];
 const l=named(low,'sport-seal-housing').userData.d2EyeProfile;
 const f=named(field,'deep-field-shell-housing').userData.d2EyeProfile;
 assert.ok(f.width-l.width>1.1);
 assert.ok(f.height-l.height>.90);
 assert.ok(f.housingDepth-l.housingDepth>.75);
 const back=named(low,'strap-back');
 const straps=meshes(low).filter(m=>m.userData.d2StrapFamily);
 assert.ok(back&&straps.length===2);
 assert.ok(back.geometry.parameters.height>=.98);
 for(const side of straps){
  const fit=side.userData.d2TempleFit;
  assert.ok(fit.frontHeight>=1.25&&fit.rearHeight>=.91);
  assert.ok(fit.shoulderX-fit.shoulderWidth/2>4.005);
  assert.ok(fit.rearX-fit.rearWidth/2>4.005);
  assert.ok(box(back).containsPoint(new THREE.Vector3(fit.side*fit.rearX,fit.rearY,fit.rearZ)));
  assert.ok(box(side).intersectsBox(box(back)));
 }
});

test('R11-C previously accepted models and saved options remain compatible',()=>{
 assert.equal(D2_EYEWEAR.length,7);
 const standard=createD2Glasses('glasses-standard',frame,lens);
 assert.deepEqual(standard.children.map(x=>x.userData.d2EyeVariant),
  ['rectangular','round','heavy-square']);
 for(const variant of standard.children)assert.equal(meshes(variant).filter(m=>m.name.endsWith('-lens')).length,2);
 for(const id of ['glasses-aviator','glasses-wrap','glasses-shield'])
  assert.ok(meshes(createD2Glasses(id,frame,lens)).length>0);
 for(const id of ['goggles-field','goggles-retro'])
  assert.equal(createD2Goggles(id,frame,lens,elastic).children.length,4);
 const saved=readWardrobe({version:1,styles:{eyewear:'goggles-low'},
  d2Accessories:{eyePosition:'raised',eyeTint:'smoke',eyeFrame:'olive'}});
 assert.equal(saved.styles.eyewear,'goggles-low');
 assert.equal(saved.d2Accessories.eyePosition,'raised');
 assert.ok(fittedEyeOffset('ach',4.88,'goggles-low').y<0);
 assert.equal(fittedEyeOffset('bare',4.88,'goggles-low').y,0);
});
