import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {akMagazineCurve,akMagazineRibOutlines,akMagazineWidthPoints}
 from '../src/weapons/geometry/ak-magazine-profiles.ts';
import {akBarrelArt}
 from '../src/weapons/geometry/ak-barrel-profiles.ts';
import {AK_VISUAL_ANATOMY}
 from '../src/weapons/geometry/weapon-receiver-anatomy.ts';

const plain=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const ids=['ak-akm','ak-akms','ak-ak74','ak-aks74','ak-ak74m',
 'ak-rpk74','ak-ak103','ak-aks74u','ak-ak105'];
const close=(x,y,e=.001)=>Math.abs(x-y)<e;
function model(id){
 const preset=FAMILY_PRESETS.find(x=>x.id===id);assert.ok(preset,id);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(cfg.weapon,plain,plain,cfg);
 group.updateMatrixWorld(true);
 return {preset,cfg,group};
}
function slot(g,s){return g.children.filter(x=>x.name.startsWith('family-'+s+'-'));}
function box(mesh){return new THREE.Box3().setFromObject(mesh);}
function bounds(g,s){const b=partVisualBounds(g,s);assert.ok(b,s);return b;}
function done(...ms){for(const m of ms)clearWeaponSilhouette(m.group);}
test('R4.5 flatter receiver belly, forward dust-cover nose, and flush furniture junctions',()=>{
 for(const id of ids){
  const m=model(id),receiver=slot(m.group,'receiver');
  const base=receiver[0],cover=receiver[1],v=base.geometry.getAttribute('position');
  const yBottom=[];
  for(let j=0;j<v.count;j++)if(v.getY(j)<-1.9)yBottom.push(v.getY(j));
  assert.ok(yBottom.length>=2&&yBottom.every(y=>close(y,-2.05)),id+' flat belly');
  const rb=box(base),cb=box(cover),hand=bounds(m.group,'handguard');
  assert.ok(hand.min.x<rb.max.x-.3,id+' lower furniture seated');
  assert.ok(cb.max.x>rb.max.x-.2,id+' cover nose reaches furniture');
  const pieces=slot(m.group,'handguard');
  const lower=box(pieces[0]),upper=box(pieces[1]);
  assert.ok(upper.min.y>lower.max.y+.15,id+' deliberate upper-lower gap');
  const lowerH=lower.max.y-lower.min.y,upperH=upper.max.y-upper.min.y;
  assert.ok(upperH/lowerH>.48&&upperH/lowerH<.85,
   id+' upper and lower closer in height, still lower-dominant');
  const resolved=resolveWeaponAssembly(m.cfg),art=akBarrelArt(m.preset.parts.barrel);
  assert.ok(close(resolved.muzzleX,art.muzzleX));
  done(m);
 }
});
test('R4.5 correct ejection-port center, long selector and stamped-cover policy',()=>{
 assert.ok(AK_VISUAL_ANATOMY.portWidthX>=3.1);
 assert.ok(AK_VISUAL_ANATOMY.portHeightY>=1.2);
 assert.ok(AK_VISUAL_ANATOMY.portY<.25);
 for(const id of ids){
  const m=model(id),port=m.group.children.find(x=>x.name==='family-art-ak-port');
  const selector=m.group.children.find(x=>x.name==='family-art-ak-selector');
  assert.ok(port&&selector,id+' has exterior marks');
  assert.ok(close(port.position.y,AK_VISUAL_ANATOMY.portY));
  assert.ok(close(port.geometry.parameters.width,AK_VISUAL_ANATOMY.portWidthX));
  assert.ok(selector.geometry.parameters.width>2.9&&selector.position.y<0);
  const expected=['ak-akm','ak-akms','ak-ak74','ak-aks74','ak-rpk74'].includes(id);
  assert.equal(m.group.children.some(x=>x.name==='family-art-ak-cover-ribs'),
   expected,id+' should use historical ribbing, not modern smooth cover');
  done(m);
 }
});
test('R4.5 AKM is two dropped, broad quads; AKMS a single rod on each side',()=>{
 const a=model('ak-akm'),ms=model('ak-akms');
 const wood=slot(a.group,'stock');
 assert.equal(wood.length,2,'two simple connected stock quads');
 assert.ok(box(wood[0]).intersectsBox(box(wood[1])));
 const stock=slot(ms.group,'stock');
 assert.equal(stock.length,6);
 const rods=stock.filter(x=>Math.abs(x.position.z)>0.9&&
  x.geometry.type==='ExtrudeGeometry');
 const hinges=stock.filter(x=>x.geometry.type==='CylinderGeometry');
 assert.equal(rods.length,2);
 assert.equal(hinges.length,2);
 assert.ok(rods[0].position.z<0&&rods[1].position.z>0);
 for(const rod of rods){
  const vertices=rod.geometry.getAttribute('position');
  const ys=[];
  for(let j=0;j<vertices.count;j++)ys.push(vertices.getY(j));
  assert.ok(Math.max(...ys)-Math.min(...ys)<1.8,
   'underfolder side projection stays single shallow-angled line');
 }
 assert.ok(stock.some(x=>{
  const b=box(x);return b.min.x<-14&&b.max.y>0&&b.min.y<-3;
 }), 'rear vertical buttplate');
 done(a,ms);
});
test('R4.5 all front ends have oblique gas bridge and only one front sight',()=>{
 for(const id of ids){
  const m=model(id),barrel=slot(m.group,'barrel'),
   art=akBarrelArt(m.preset.parts.barrel);
  const tube=box(barrel[1]),gas=box(barrel[2]),sight=box(barrel[3]),muzzle=box(barrel[4]);
  assert.ok(tube.intersectsBox(gas),id+' tube meets bridge');
  assert.ok(tube.max.y>1.9&&gas.min.y<0,id+' upper tube descends to barrel');
  assert.ok(sight.max.x>=muzzle.min.x-.16,
   id+' sight meets rear of muzzle device');
  assert.ok(sight.max.y>2.5,id+' one readable main sight');
  assert.ok(close(bounds(m.group,'barrel').max.x,art.muzzleX));
  done(m);
 }
});
test('R4.5 RPK magazine and folded support distinguish it from standard AKs',()=>{
 const c=akMagazineCurve('rpk45'),normal=akMagazineCurve('545');
 assert.ok(c.length>=8.2&&c.sweep>=2.5);
 assert.ok(c.length>normal.length+2);
 for(const t of [0,.25,.5,.75,1]){
  const [a,b]=akMagazineWidthPoints(c,t);
  assert.ok(close(Math.hypot(a[0]-b[0],a[1]-b[1]),c.width));
 }
 const r=model('ak-rpk74');
 const barrel=slot(r.group,'barrel');
 const bipod=barrel[5],b=box(bipod);
 assert.ok(b.max.x-b.min.x>7,'straight folded support extends toward handguard');
 assert.ok(b.max.y<-.5,'support runs under the main barrel');
 assert.ok(bounds(r.group,'stock').max.y>=1.0,
  'clubfoot stock comb meets lower receiver roof');
 done(r);
});
test('R4.5 the two 7.62 ribs are thicker, raised and reach receiver neck',()=>{
 const c=akMagazineCurve('762'),ribs=akMagazineRibOutlines(c);
 assert.equal(ribs.length,2);
 for(const rib of ribs){
  const width=Math.hypot(rib[0][0]-rib.at(-1)[0],
   rib[0][1]-rib.at(-1)[1]);
  assert.ok(width>=.40,'doubled emboss line width');
 }
 for(const id of ['ak-akm','ak-akms','ak-ak103']){
  const m=model(id),mag=slot(m.group,'magazine');
  assert.equal(mag.length,3);
  assert.ok(box(mag[1]).max.y>-3.0,id+' ribs reach near insertion');
  done(m);
 }
 assert.equal(akMagazineRibOutlines(akMagazineCurve('545')).length,0);
});
