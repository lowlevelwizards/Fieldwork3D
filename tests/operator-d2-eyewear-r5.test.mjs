/** R5 critical release gate: proportion and topology instead of material-only
 * checks. Visual phone approval is a separate requirement after release.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Glasses} from '../src/operator-d2-eyewear-visuals.ts';
import {createD2Goggles} from '../src/operator-d2-goggle-visuals.ts';
import {fittedEyeOffset} from '../src/operator-d2-eyewear-fit.ts';
import {D2_EYEWEAR} from '../src/operator-head-accessory-catalog.ts';
import {wardrobeItemsForSlot,readWardrobe} from '../src/operator-wardrobe-data.ts';

const metal=new THREE.MeshStandardMaterial({color:0x252b2c});
const lens=new THREE.MeshStandardMaterial({color:0x9ba5a0,transparent:true,opacity:.3,side:THREE.DoubleSide});
const cloth=new THREE.MeshStandardMaterial({color:0x39433c});
const glasses=id=>createD2Glasses(id,metal,lens);
const goggles=id=>createD2Goggles(id,metal,lens,cloth).children[0];
const meshes=g=>{const out=[];g.traverse(x=>{if(x.isMesh)out.push(x)});return out;};
const mesh=(g,name)=>meshes(g).find(x=>x.name.includes(name));
const bounds=m=>m.userData.d2EyeProfile;
const poly=m=>m.geometry.parameters.shapes.getPoints();
const numberOfUnique=pts=>new Set(pts.map(v=>v.x.toFixed(4)+':'+v.y.toFixed(4))).size;

test('R5 locks successful acetate, vintage cups and shield construction',()=>{
 const basic=glasses('glasses-standard').children[0];
 const acetate=mesh(basic,'single-acetate-front');
 assert.ok(acetate);
 assert.equal(acetate.geometry.parameters.shapes.holes.length,2);
 assert.equal(meshes(basic).filter(m=>m.userData.d2TempleFit).length,2);
 const vintage=goggles('goggles-retro');
 assert.equal(meshes(vintage).filter(m=>m.name.includes('vintage-faceted-barrel')).length,2);
 assert.equal(meshes(vintage).filter(m=>m.name.endsWith('-lens')).length,2);
 assert.ok(mesh(vintage,'connected-vintage-leather'));
 const shield=glasses('glasses-shield');
 assert.equal(meshes(shield).filter(m=>m.name.endsWith('-lens')).length,1);
 assert.equal(meshes(shield).filter(m=>m.name.includes('housing')).length,0);
});
test('R5 aviators shift teardrop fullness outward and keep broad rounded shoulders',()=>{
 const pilot=glasses('glasses-aviator');
 const left=mesh(pilot,'pilot-lens-collar');
 const points=poly(left);
 const bottomY=Math.min(...points.map(p=>p.y));
 const bottom=points.filter(p=>p.y<bottomY+.06);
 const centerX=bottom.reduce((sum,p)=>sum+p.x,0)/bottom.length;
 const width=Math.max(...bottom.map(p=>p.x))-Math.min(...bottom.map(p=>p.x));
 assert.ok(centerX< -2.55,'lower foot should move outward on left lens');
 assert.ok(width>.8,'rounded, broad foot instead of sharp tip');
 const top=points.filter(p=>p.y>4.8);
 assert.ok(top.length>=4,'round pilot outer shoulder');
 assert.ok(pilot.userData.d2EyeFitTop>5.1);
 assert.equal(meshes(pilot).filter(m=>m.name.includes('pilot-')&&m.name.includes('-bridge')).length,2);
});
test('R5 shooting glasses retain the excellent lens with only eight brow corners',()=>{
 const sport=glasses('glasses-wrap');
 const brow=mesh(sport,'integrated-swept-frame');
 const pane=mesh(sport,'shooting-panoramic');
 assert.ok(brow&&pane);
 assert.equal(numberOfUnique(poly(brow)),8,'one deliberate eight-corner brow');
 assert.equal(brow.geometry.parameters.options.depth,.34);
 assert.ok(pane.geometry.attributes.position.count>0);
 const paneZ=pane.geometry.attributes.position;
 let z=Infinity;
 for(let i=0;i<paneZ.count;i++)z=Math.min(z,paneZ.getZ(i));
 assert.ok(z-brow.position.z>.12,'brow front must be separated from lens');
 assert.equal(meshes(sport).filter(m=>m.name.includes('lower-rim')).length,0);
});
test('R5 compact goggle is shallow panoramic sport seal, not scaled field goggle',()=>{
 const low=goggles('goggles-low'),field=goggles('goggles-field');
 const lowShell=mesh(low,'sport-seal-housing'),fieldShell=mesh(field,'deep-field-shell');
 assert.ok(lowShell&&fieldShell);
 const sport=bounds(lowShell),bunker=bounds(fieldShell);
 assert.ok(sport.housingDepth<1.00,'sport goggles stay close to the face');
 assert.ok(bunker.housingDepth>1.50&&bunker.housingDepth<1.85,'field goggles tapered, not huge brick');
 assert.ok(bunker.width-sport.width>1.05,'field clearly wider');
 assert.ok(bunker.height-sport.height>1.15,'field clearly taller');
 assert.ok(bunker.height>3.15,'taller field top silhouette');
 assert.ok(mesh(low,'sport-panoramic-pane-lens'));
 assert.equal(meshes(low).filter(m=>m.name.endsWith('-lens')).length,1);
});
test('R5 two fabric tapered side bands clear head; vintage approved band unchanged',()=>{
 for(const id of ['goggles-low','goggles-field']){
  const g=goggles(id);
  const straps=meshes(g).filter(m=>m.userData.d2StrapFamily);
  assert.equal(straps.length,2,id);
  assert.equal(meshes(g).filter(m=>m.name==='strap-back').length,1);
  for(const m of straps){
   const f=m.userData.d2TempleFit;
   assert.ok(f.shoulderX-(f.shoulderWidth??.63)/2>4.00,id);
   assert.ok(f.rearX-(f.rearWidth??.40)/2>4.00,id);
   assert.ok(f.frontHeight>f.rearHeight,id+' strap tapers toward rear');
   assert.ok(f.frontZ<f.shoulderZ&&f.shoulderZ<f.rearZ);
  }
  assert.ok(meshes(g).length<=8,'no superfluous accessory pieces');
 }
 const retro=goggles('goggles-retro');
 assert.equal(meshes(retro).filter(m=>m.name==='strap-back').length,1);
 assert.equal(meshes(retro).filter(m=>m.userData.d2StrapFamily).length,0);
});
test('R5 goggles fit beneath helmet brow within controlled vertical travel',()=>{
 const ach=fittedEyeOffset('ach',5.23);
 const pasgt=fittedEyeOffset('pasgt',5.23);
 assert.ok(ach.y<-.95);
 assert.ok(pasgt.y<=-1.10&&pasgt.y>=-1.16);
 assert.ok(pasgt.z<-.3,'low helmet brim should move shell slightly forward');
 assert.equal(fittedEyeOffset('bare',5.23).y,0);
 assert.ok(fittedEyeOffset('ach',4.73).y>ach.y);
});
test('R5 display names align without modifying saved wardrobe IDs',()=>{
 const all=wardrobeItemsForSlot('eyewear');
 const shooting=all.find(x=>x.id==='glasses-wrap');
 const retro=all.find(x=>x.id==='goggles-retro');
 assert.equal(shooting?.name,'Shooting glasses');
 assert.equal(retro?.name,'Vintage motor goggles');
 assert.equal(D2_EYEWEAR.find(x=>x.id==='glasses-wrap')?.name,shooting.name);
 const look=readWardrobe({version:1,styles:{eyewear:'goggles-field'},d2Accessories:{eyePosition:'raised',eyeFrame:'olive',eyeTint:'smoke'}});
 assert.equal(look.styles.eyewear,'goggles-field');
 assert.equal(look.d2Accessories.eyePosition,'raised');
 assert.equal(look.d2Accessories.eyeTint,'smoke');
});
