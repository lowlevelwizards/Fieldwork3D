/** R4.8 miniature-art acceptance: geometry, variant identity and save safety. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly,readWeaponConfiguration,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const close=(a,b,e=.002)=>Math.abs(a-b)<e;
function model(id){
 const p=FAMILY_PRESETS.find(x=>x.id===id);assert.ok(p,id);
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const g=buildWeaponSilhouette(p.weapon,material,material,c);
 g.updateMatrixWorld(true);return {g,c,p,a:resolveWeaponAssembly(c)};
}
const part=(g,type)=>g.children.filter(x=>x.name.startsWith('family-'+type+'-'));
const bounds=(g,type)=>{const b=partVisualBounds(g,type);assert.ok(b,type);return b;};
test('R4.8 eight ARs retain their names, configuration and live muzzle extents',()=>{
 assert.equal(FAMILY_PRESETS.filter(x=>x.family==='ar').length,8);
 assert.equal(Object.values(FAMILY_PARTS).filter(x=>x.family==='ar'||x.family==='ak').length,93);
 for(const p of FAMILY_PRESETS.filter(x=>x.family==='ar')){
  const v=model(p.id);
  assert.ok(v.g.children.length<=36,p.id+' mobile draw-call budget');
  assert.ok(bounds(v.g,'stock').intersectsBox(bounds(v.g,'receiver')));
  assert.ok(bounds(v.g,'grip').intersectsBox(bounds(v.g,'receiver')));
  assert.ok(bounds(v.g,'magazine').intersectsBox(bounds(v.g,'receiver')));
  assert.ok(bounds(v.g,'handguard').intersectsBox(bounds(v.g,'barrel')));
  assert.ok(close(new THREE.Box3().setFromObject(v.g).max.x,v.a.muzzleX));
  assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(v.c)),
   v.p.weapon),v.c,'saved parts remain round-trip stable');
  clearWeaponSilhouette(v.g);
 }
});
test('R4.8 substantial assist is farther rearward and projects out from upper',()=>{
 const a=model('ar-m16a1'),m=model('ar-m4a1');
 for(const v of [a,m]){
  const receiver=part(v.g,'receiver');
  const assist=receiver.find(x=>x.userData.arForwardAssist);
  assert.ok(assist&&assist.geometry.type==='ExtrudeGeometry');
  assert.ok(close(assist.rotation.y,.16),'rearward relief leans out in Z');
  assert.ok(close(assist.position.z,1.50));
  const bb=new THREE.Box3().setFromObject(assist);
  assert.ok(bb.min.x<-4&&bb.max.x<-1.2,'further-back broad side profile');
  assert.ok(bb.max.z>2.25,'projecting square-ended back');
  assert.ok(bb.max.z-bb.min.z>.6,'solid readable thickness');
  const port=v.g.children.find(x=>x.name==='family-art-ar-port');
  assert.ok(port);
  const data=port.material.map.image.data;
  const maxRed=Math.max(...Array.from({length:data.length/4},
   (_,i)=>data[i*4]));
  assert.ok(maxRed<85,'muted ejection port, no silver-looking highlight');
 }
 assert.equal(part(a.g,'receiver').filter(x=>x.userData.arShellDeflector).length,0);
 assert.equal(part(m.g,'receiver').filter(x=>x.userData.arShellDeflector).length,1);
 clearWeaponSilhouette(a.g);clearWeaponSilhouette(m.g);
});
test('R4.8 A1 and polymer handguards have real angular 3D cross sections',()=>{
 const a=model('ar-m16a1'),round=model('ar-m16a2');
 const car=model('ar-car15'),commando=model('ar-colt733');
 assert.ok(part(a.g,'handguard').some(x=>x.userData.arForearmProfile==='a1-triangle'));
 assert.ok(part(round.g,'handguard').some(x=>x.userData.arForearmProfile==='ribbed-round'));
 for(const [v,c] of [[round,7],[car,5],[commando,4]]){
  const ribs=part(v.g,'handguard').find(x=>x.userData.arPolymerRibs);
  assert.ok(ribs instanceof THREE.InstancedMesh);
  assert.equal(ribs.count,c*8,'each large rib bends around octagonal facets');
  assert.ok(ribs.count>c,'not a pasted 2D stripe');
  assert.ok(!v.g.children.some(x=>x.name==='family-art-poly-ribs'||
   x.name==='family-art-car-ribs'));
 }
 assert.ok(bounds(car.g,'handguard').max.x-
  bounds(commando.g,'handguard').max.x>.5,
  'Colt 733 receives a distinct shorter front furniture profile');
 for(const v of [a,round,car,commando])clearWeaponSilhouette(v.g);
});
test('R4.8 RIS II stays short, slimmer and four-sided while PRI stays smooth',()=>{
 const mk18=model('ar-mk18'),mk12=model('ar-mk12mod0');
 const ris=part(mk18.g,'handguard').find(x=>x.userData.arRailTeeth&&
  x.userData.arRailFourSided);
 assert.ok(ris instanceof THREE.InstancedMesh);
 assert.ok(bounds(mk18.g,'handguard').max.x<13.55);
 assert.ok(mk18.a.muzzleX-bounds(mk18.g,'handguard').max.x>2.2);
 const bridge=part(mk12.g,'handguard').find(x=>x.userData.arRailTeeth);
 assert.ok(bridge instanceof THREE.InstancedMesh);
 assert.equal(bridge.userData.arRailFourSided,false);
 assert.equal(mk12.g.children.filter(x=>x.name==='family-art-ar-spr-ports').length,2);
 const collars=part(mk12.g,'handguard').filter(x=>x.geometry.type==='BoxGeometry');
 assert.ok(collars.some(x=>Math.abs(x.position.x-15.41)<.02),
  'PRI front retaining collar is conspicuous');
 clearWeaponSilhouette(mk18.g);clearWeaponSilhouette(mk12.g);
});
test('R4.8 polymer magazine is physically tapered, with no overlay slab',()=>{
 const mk=model('ar-mk18'),body=part(mk.g,'magazine')[0];
 assert.ok(body.userData.arPolymerTaper);
 const position=body.geometry.getAttribute('position');
 let top=0,bottom=0;
 const minY=bounds(mk.g,'magazine').min.y,maxY=bounds(mk.g,'magazine').max.y;
 for(let i=0;i<position.count;i++){
  const y=position.getY(i),z=Math.abs(position.getZ(i));
  if(y>maxY-.6)top=Math.max(top,z);
  if(y<minY+.6)bottom=Math.max(bottom,z);
 }
 assert.ok(top>bottom+.09,'poly body narrows laterally toward the toe');
 assert.equal(part(mk.g,'magazine').length,2,'only taper body and baseplate');
 assert.equal(mk.g.children.filter(x=>x.name==='family-art-ar-poly-panel').length,0);
 clearWeaponSilhouette(mk.g);
});
test('R4.8 external muzzle accessories still replace original art correctly',()=>{
 const v=model('ar-m4a1');
 const next=setWeaponAttachment(v.c,'muzzle','muzzle-suppressor');
 const g=buildWeaponSilhouette(next.weapon,material,material,next);
 assert.equal(g.children.filter(x=>x.name==='family-art-ar-birdcage').length,0);
 assert.ok(close(new THREE.Box3().setFromObject(g).max.x,v.a.muzzleX));
 clearWeaponSilhouette(v.g);clearWeaponSilhouette(g);
});
