/** R7 focused attachment + side-massing acceptance.
 * Keep this small: structural geometry, accepted silhouettes and fit only.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {D2_EYEWEAR} from '../src/operator-head-accessory-catalog.ts';
const mat=new THREE.MeshStandardMaterial({color:0x25292b});
const lens=new THREE.MeshStandardMaterial({color:0x9aa6a4,opacity:.4,transparent:true,side:THREE.DoubleSide});
const cloth=new THREE.MeshStandardMaterial({color:0x434f45});
const glasses=id=>createD2Glasses(id,mat,lens);
const goggles=id=>createD2Goggles(id,mat,lens,cloth).children[0];
const meshes=root=>{const found=[];root.traverse(o=>{if(o.isMesh)found.push(o)});return found;};
const named=(g,s)=>meshes(g).find(m=>m.name.includes(s));
const pts=mesh=>mesh.geometry.parameters.shapes.getPoints();
function cutXs(points,y){
 const hits=[];
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length];
  if((a.y<=y&&b.y>=y)||(b.y<=y&&a.y>=y)){
   if(Math.abs(b.y-a.y)>1e-8)
    hits.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));
  }
 }
 return hits;
}
test('R7-A upper and lower pilot bridges overlap both lens rims in actual XYZ',()=>{
 const pilot=glasses('glasses-aviator');
 const collars=meshes(pilot).filter(m=>m.name.includes('pilot-lens-collar-housing'));
 assert.equal(collars.length,2);
 const left=collars.find(m=>Math.max(...pts(m).map(p=>p.x))<0);
 const right=collars.find(m=>Math.min(...pts(m).map(p=>p.x))>0);
 assert.ok(left&&right);
 for(const [part,y] of [['pilot-upper-bridge-housing',4.73],['pilot-lower-bridge-housing',4.04]]){
  const bridge=named(pilot,part);assert.ok(bridge,part);
  const bx=cutXs(pts(bridge),y),lx=cutXs(pts(left),y),rx=cutXs(pts(right),y);
  assert.ok(bx.length&&lx.length&&rx.length,part+' contour is continuous');
  assert.ok(Math.min(...bx)<Math.max(...lx)-.10,part+' joins left rim');
  assert.ok(Math.max(...bx)>Math.min(...rx)+.10,part+' joins right rim');
  const box=new THREE.Box3().setFromObject(bridge);
  assert.ok(box.intersectsBox(new THREE.Box3().setFromObject(left)));
  assert.ok(box.intersectsBox(new THREE.Box3().setFromObject(right)));
 }
 assert.equal(meshes(pilot).filter(m=>m.name.includes('bridge-housing')).length,2);
 assert.equal(meshes(pilot).filter(m=>m.userData.d2TempleFit).length,2);
});
test('R7-B shooting glass keeps single pane, close central offset and joined temple roots',()=>{
 const sport=glasses('glasses-wrap');
 const pane=named(sport,'shooting-panoramic-lens');
 const brow=named(sport,'integrated-swept-frame-housing');
 const temples=meshes(sport).filter(m=>m.userData.d2TempleFit);
 assert.ok(pane&&brow);assert.equal(temples.length,2);
 const p=pane.geometry.attributes.position;
 let centralZ=Infinity;
 for(let i=0;i<p.count;i++){
  if(Math.abs(p.getX(i))<1.1)centralZ=Math.min(centralZ,p.getZ(i));
  if(Math.abs(p.getX(i))<=4.0)
   assert.ok(p.getZ(i)<-4.0,'pane does not pass through head front');
 }
 assert.ok(centralZ>-5.0&&centralZ<-4.8,'lens center brought toward face');
 for(const temple of temples){
  assert.ok(new THREE.Box3().setFromObject(temple).intersectsBox(
   new THREE.Box3().setFromObject(brow)),'temple physically overlaps the swept brow');
  assert.ok(temple.userData.d2TempleFit.frontZ<
   temple.userData.d2TempleFit.shoulderZ);
 }
 assert.equal(meshes(sport).filter(m=>m.name.endsWith('-lens')).length,1);
 assert.equal(meshes(sport).filter(m=>m.name.includes('fin')).length,0);
});
test('R7-C compact sports goggles gain bold top rim without growing into field goggles',()=>{
 const low=goggles('goggles-low'),field=goggles('goggles-field');
 const shell=named(low,'sport-seal-housing'),pane=named(low,'sport-panoramic-pane-lens');
 assert.ok(shell&&pane);
 const top=shell.userData.d2EyeProfile.height+2.41;
 const a=pane.geometry.attributes.position;
 let paneTop=-Infinity;for(let i=0;i<a.count;i++)paneTop=Math.max(paneTop,a.getY(i));
 assert.ok(top-paneTop>.42,'upper rim is visibly stronger');
 assert.ok(shell.userData.d2EyeProfile.housingDepth<.95);
 assert.ok(named(field,'deep-field-shell-housing').userData.d2EyeProfile.height-
  shell.userData.d2EyeProfile.height>.9,'compact and field stay distinct');
 assert.ok(meshes(low).length<=7,'no new narrow decorative pieces');
});
test('R7-D deep field housing has three taper stations in one mesh and strap roots embedded',()=>{
 const field=goggles('goggles-field');
 const shell=named(field,'single-mass-deep-field-shell-housing');
 assert.ok(shell);
 const a=shell.geometry.attributes.position;
 const maxX=z=>{let mx=0,n=0;for(let i=0;i<a.count;i++)
  if(Math.abs(a.getZ(i)-z)<.001){mx=Math.max(mx,Math.abs(a.getX(i)));n++;}
  assert.ok(n>0,'station exists at '+z);return mx;};
 assert.ok(maxX(-5.88)>maxX(-4.77));
 assert.ok(maxX(-4.77)>maxX(-4.22));
 const straps=meshes(field).filter(m=>m.userData.d2StrapFamily);
 assert.equal(straps.length,2);
 for(const strap of straps){
  const f=strap.userData.d2TempleFit;
  assert.ok(f.frontZ>-5.88&&f.frontZ<-4.22,'strap enters housing depth');
  assert.ok(f.frontHeight>f.shoulderHeight&&f.shoulderHeight>f.rearHeight);
 }
 assert.equal(meshes(field).filter(m=>m.name.includes('deep-field-shell-housing')).length,1);
 assert.ok(meshes(field).length<=8);
});
test('R7-E approved civilian glasses, shield and vintage remain distinctive',()=>{
 const standard=glasses('glasses-standard').children[0];
 const shield=glasses('glasses-shield');
 const retro=goggles('goggles-retro');
 assert.equal(named(standard,'single-acetate-front').geometry.parameters.shapes.holes.length,2);
 assert.equal(meshes(shield).filter(m=>m.name.endsWith('-lens')).length,1);
 assert.equal(meshes(retro).filter(m=>m.name.includes('vintage-faceted-barrel')).length,2);
 assert.equal(D2_EYEWEAR.length,7);
});
