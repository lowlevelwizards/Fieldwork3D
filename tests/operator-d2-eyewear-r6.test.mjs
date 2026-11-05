/** R6 focused shape acceptance. R5 approved civilian/vintage silhouettes locked. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {fittedEyeOffset} from '../src/operator-d2-eyewear-fit.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers} from '../src/operator-wardrobe-head-visuals.ts';
import {D2_EYEWEAR,D2_FRAME_COLORS,D2_LENS_MATERIALS} from '../src/operator-head-accessory-catalog.ts';
const frame=new THREE.MeshStandardMaterial({color:0x222729});
const lens=new THREE.MeshStandardMaterial({color:0x99aaa7,transparent:true,opacity:.38,side:THREE.DoubleSide});
const textile=new THREE.MeshStandardMaterial({color:0x4d5a4b});
const glasses=id=>createD2Glasses(id,frame,lens);
const goggle=id=>createD2Goggles(id,frame,lens,textile).children[0];
const meshes=g=>{const out=[];g.traverse(o=>{if(o.isMesh)out.push(o)});return out;};
const named=(g,s)=>meshes(g).find(m=>m.name.includes(s));
const geometryY=m=>{const a=m.geometry.attributes.position;const ys=[];for(let i=0;i<a.count;i++)ys.push(a.getY(i));return [Math.min(...ys),Math.max(...ys)];};
const shapePts=m=>m.geometry.parameters.shapes.getPoints();

test('R6 visual winners retain their characteristic construction and low piece counts',()=>{
 const std=glasses('glasses-standard').children[0];
 assert.equal(named(std,'single-acetate-front').geometry.parameters.shapes.holes.length,2);
 assert.equal(meshes(std).filter(m=>m.userData.d2TempleFit).length,2);
 const retro=goggle('goggles-retro');
 assert.equal(meshes(retro).filter(m=>m.name.includes('vintage-faceted-barrel')).length,2);
 assert.ok(named(retro,'connected-vintage-leather'));
 assert.equal(meshes(retro).filter(m=>m.name.endsWith('-lens')).length,2);
 assert.equal(meshes(retro).length<=10,true);
 assert.equal(D2_EYEWEAR.length,7,'no cosmetic IDs added');
});

test('R6 sport goggles gain 15-20 percent true coverage without becoming bunker goggles',()=>{
 const sport=goggle('goggles-low');
 const field=goggle('goggles-field');
 const a=named(sport,'sport-seal-housing').userData.d2EyeProfile;
 const b=named(field,'deep-field-shell-housing').userData.d2EyeProfile;
 assert.ok(a.height>2.35&&a.height<2.50,'sport grows taller');
 assert.ok(a.housingDepth<.95,'sport remains shallow');
 assert.ok(b.height-a.height>.9,'field reads as meaningfully taller');
 assert.ok(b.width-a.width>1.0,'field reads as broader');
 assert.ok(b.housingDepth-a.housingDepth>.7,'field reads as deeper');
 assert.equal(meshes(sport).filter(m=>m.name.endsWith('-lens')).length,1);
 assert.ok(meshes(sport).length<=7,'sport does not gain micro parts');
});

test('R6 field bunker gets two broad roof shoulders and a fitted rear taper',()=>{
 const field=goggle('goggles-field');
 const shell=named(field,'deep-field-shell-housing');
 const p=shell.userData.d2EyeProfile;
 assert.ok(p.height>3.35,'field roof is slightly taller');
 assert.ok(p.housingDepth>=1.5&&p.housingDepth<=1.75,'field housing retains controlled depth');
 const arr=shell.geometry.attributes.position;
 let frontX=0,rearX=0,frontN=0,rearN=0;
 for(let i=0;i<arr.count;i++){
  if(Math.abs(arr.getY(i)-4.5)<.06&&Math.abs(arr.getZ(i)+5.88)<.02){frontX+=Math.abs(arr.getX(i));frontN++;}
  if(Math.abs(arr.getY(i)-4.32)<.06&&Math.abs(arr.getZ(i)+4.22)<.02){rearX+=Math.abs(arr.getX(i));rearN++;}
 }
 assert.ok(frontN&&rearN,'front and rear taper stations exist');
 assert.ok(frontX/frontN>rearX/rearN,'rear side wall narrower than front');
 assert.equal(meshes(field).filter(m=>m.name.includes('field-soft-rear-gasket')).length,1);
 assert.equal(meshes(field).filter(m=>m.userData.d2StrapFamily).length,2);
});

test('R6 shooting brow is in front of lens at all swept sections, not cutting through it',()=>{
 const s=glasses('glasses-wrap');
 const brow=named(s,'integrated-swept-frame-housing');
 const pane=named(s,'shooting-panoramic-lens');
 assert.ok(brow&&pane);
 assert.equal(shapePts(brow).length>=8,true);
 assert.equal(brow.geometry.parameters.options.depth,.22);
 const arr=brow.geometry.attributes.position;
 for(let i=0;i<arr.count;i++){
  const x=arr.getX(i);
  const back=brow.position.z+arr.getZ(i);
  const lensAt=-5.18+1.02*Math.pow(Math.abs(x)/4,2);
  assert.ok(back<lensAt-.08,'solid brow back should remain ahead of tinted lens');
 }
 assert.equal(meshes(s).filter(m=>m.name.endsWith('-lens')).length,1);
 assert.equal(meshes(s).filter(m=>m.name.includes('fin')).length,0);
});

test('R6 aviators broaden outer cheek and remove the hanging inner tip',()=>{
 const a=glasses('glasses-aviator');
 const collar=named(a,'pilot-lens-collar-housing');
 const pts=shapePts(collar);
 const low=Math.min(...pts.map(p=>p.y));
 const foot=pts.filter(p=>p.y<low+.025);
 assert.equal(foot.length>=2,true);
 assert.ok(foot[0].x!==foot[1].x);
 assert.ok(Math.max(...foot.map(p=>p.x))-Math.min(...foot.map(p=>p.x))>1.0);
 assert.ok(low>2.35&&low<2.46,'lower shelf lifted without losing aviator height');
 assert.equal(meshes(a).filter(m=>m.name.includes('pilot-')&&m.name.includes('-bridge')).length,2);
});

test('R6 clean eyeshield retains one pane with temples overlapping brow support',()=>{
 const s=glasses('glasses-shield');
 assert.equal(meshes(s).filter(m=>m.name.endsWith('-lens')).length,1);
 assert.equal(meshes(s).filter(m=>m.name.includes('housing')).length,0);
 const brow=named(s,'single-mass-visor-brow');
 const temples=meshes(s).filter(m=>m.userData.d2TempleFit);
 assert.equal(temples.length,2);
 const bottom=brow.position.y-brow.geometry.parameters.height/2;
 for(const m of temples){
  const f=m.userData.d2TempleFit;
  assert.ok(f.frontY+f.frontHeight/2>bottom,'temple visually joins brow');
 }
});

test('R6 cap-aware low-profile fit remains visible but below patrol brim',()=>{
 const top=4.82;
 const cap=fittedEyeOffset('patrol-cap',top,'goggles-low');
 const legacy=fittedEyeOffset('patrol-cap',top);
 assert.ok(cap.y>legacy.y,'sport band clears cap without being shoved down as far');
 assert.ok(top+cap.y<4.64-.10,'upper goggle outline is under cap');
 const pasgt=fittedEyeOffset('pasgt',top,'goggles-low');
 assert.ok(top+pasgt.y<=4.055-.17,'low shell fits below PASGT brow');
 assert.ok(pasgt.y>=-1,'do not sink goggles down the face');
 assert.equal(fittedEyeOffset('bare',top,'goggles-low').y,0);
});

test('R6 skin, saved tint, frame finish and raised poses work without rebuilding geometry',()=>{
 const parent=new THREE.Group(),head=new THREE.Group();parent.add(head);
 const layers=createWardrobeHeadLayers(parent,head,textile,textile,textile,textile);
 updateWardrobeHeadLayers(layers,'patrol-cap','face-none','goggles-low','comms-none',
  undefined,undefined,{eyePosition:'eyes',eyeFrame:'olive',eyeTint:'amber'});
 const low=layers.eyewear['goggles-low'].children.find(c=>c.userData.modelAxes);
 const geometries=meshes(low).map(m=>m.geometry);
 assert.equal(layers.eyewearFrame.color.getHex(),D2_FRAME_COLORS.olive.hex);
 assert.equal(layers.eyewearLens.opacity,D2_LENS_MATERIALS.amber.opacity);
 assert.ok(low.children[0].position.y<0,'cap fit applied');
 updateWardrobeHeadLayers(layers,'ach','face-none','goggles-low','comms-none',
  undefined,undefined,{eyePosition:'raised',eyeFrame:'black',eyeTint:'smoke'});
 assert.equal(low.children.find(c=>c.visible).userData.d2GogglePlacement,'helmet');
 assert.deepEqual(meshes(low).map(m=>m.geometry),geometries);
});
