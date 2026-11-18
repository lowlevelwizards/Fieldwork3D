/** O3 acceptance: compact proportions, distinct stacked lenses, real handle contact,
 * and G36-only material assignment in the actual live family factory adapter.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout} from '../src/weapons/geometry/g36-silhouettes.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_E0_FACTORY as F} from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {weaponFinish,WEAPON_FINISH_SPECS}
 from '../src/weapons/geometry/weapon-material-registry.ts';
import {G36_DARK_POLYMER,G36_OPTIC_RIM,G36_LENS_BLACK,G36_RUBBER,
 G36_SMOKED_MAGAZINE,HK_DARK_POLYMER,HK_BLACK_METAL}
 from '../src/weapons/geometry/weapon-visual-palette.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const one=(g,k)=>g.children.find(x=>x.userData[k]);
const bb=x=>new THREE.Box3().setFromObject(x);
const span=(b,axis)=>b.max[axis]-b.min[axis];
const close=(a,b,t=.012)=>Math.abs(a-b)<t;
const triangles=g=>g.children.reduce((n,x)=>
 n+(x.geometry.index?.count??x.geometry.getAttribute('position').count)/3,0);

test('O3-S1: retain 125% optical breadth but make both primary bodies compact in X',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(mat);
 const main=one(g,'g36LowerOptic'),upper=one(g,'g36UpperReflex');
 assert.equal(main.userData.g36OpticArtVersion,'o3-compact-integrated-125-125-55');
 assert.ok(close(span(bb(main),'x'),4.33),'main compressed 12.5% from 4.95');
 assert.ok(close(span(bb(upper),'x'),2.43),'upper hood compressed 19% from 3.0');
 assert.ok(span(bb(main),'z')>2.26,'125% O2 broad cross-section retained');
 assert.ok(span(bb(upper),'z')>1.80,'125% upper breadth retained');
 clearWeaponSilhouette(g);mat.dispose();
});

test('O3-S2: proud upper module and distinct oculars, not nested into one rectangle',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(mat);
 const main=bb(one(g,'g36LowerOptic')),upper=bb(one(g,'g36UpperReflex'));
 const hi=bb(one(g,'g36UpperReflexBarrel')),lo=bb(one(g,'g36LowerOpticBarrel'));
 assert.ok(close(upper.max.y,5.03)&&close(upper.max.y,A.opticTopY));
 assert.ok(upper.max.y-main.max.y>.85,'upper rises proud above lower housing');
 assert.ok(hi.min.y>main.max.y,'entire upper ocular clears lower roof');
 assert.ok(hi.min.y>lo.max.y-.06,'upper/lower ocular rims are separately readable');
 assert.ok(bb(one(g,'g36UpperReflexWindow')).min.x<
  bb(one(g,'g36UpperReflex')).min.x,'upper optical face remains rear-visible');
 assert.equal(F.upperSightY,4.46,'existing aim datum deliberately remains stable');
 assert.equal(F.lowerSightY,3.57);
 clearWeaponSilhouette(g);mat.dispose();
});

test('O3-S3: lower optic extends into handle root without closing the carry void',()=>{
 const mat=new THREE.MeshBasicMaterial({side:THREE.FrontSide}),
 g=buildG36OriginalBlockout(mat),main=one(g,'g36LowerOptic'),
 handle=one(g,'g36HandleOpening');
 const b=bb(main);
 assert.ok(b.min.y<2.0,'rear lower rectangular pod descends into handle root');
 assert.ok(bb(main).intersectsBox(bb(handle)),'main lower pod actually meets frame');
 assert.ok(close(b.max.y,4.12),'lower body roof remains a short broad plane');
 assert.equal(handle.geometry.parameters.shapes.holes.length,1);
 const through=(x,y)=>g.children.some(mesh=>new THREE.Raycaster(
  new THREE.Vector3(x,y,10),new THREE.Vector3(0,0,-1)
 ).intersectObject(mesh,false).length>0);
 assert.equal(through(3,2.58),false,'interior handle window remains transparent');
 assert.equal(through(3,3.65),true,'carry roof remains solid');
 clearWeaponSilhouette(g);mat.dispose();
});

test('O3-S4: six main/upper facets, short ocular sleeves, two simple opaque faces',()=>{
 const mat=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(mat);
 for(const k of ['g36LowerOptic','g36UpperReflex']){
  const x=one(g,k);
  assert.equal(x.userData.g36OpticCrossSectionSides,6);
  assert.equal(x.geometry.getAttribute('position').count,60);
 }
 assert.equal(one(g,'g36LowerOpticBarrel').geometry.parameters.radialSegments,8);
 assert.equal(one(g,'g36UpperReflexBarrel').geometry.parameters.radialSegments,6);
 assert.ok(span(bb(one(g,'g36UpperReflexBarrel')),'x')<.31,
  'short upper sleeve removes unnecessary projected ring depth');
 for(const k of ['g36OpticFace','g36UpperReflexWindow']){
  assert.equal(one(g,k).geometry.type,'CircleGeometry');
  assert.ok(one(g,k).geometry.parameters.segments<=8);
  assert.equal(g.children.filter(x=>x.userData[k]).length,1);
 }
 assert.equal(g.children.length,24,'H2.1 adds one front cavity and one lug, O3 unchanged');
 assert.ok(triangles(g)<=760,'H2.1 adds only major sculptural forms');
 clearWeaponSilhouette(g);mat.dispose();
});

test('O3-S5: full factory adapter applies audited G36-only palette by semantic role',()=>{
 const g=new THREE.Group();
 addG36Family(g,{family:'g36',parts:F.parts});
 const body=one(g,'g36ReceiverUpper'),handle=one(g,'g36HandleOpening');
 const stock=one(g,'g36MasterStock'),guard=one(g,'g36LongHandguard');
 for(const x of [body,stock,guard]){
  assert.equal(x.material.color.getHex(),G36_DARK_POLYMER.color.getHex());
 }
 assert.equal(handle.material,G36_DARK_POLYMER);
 assert.equal(one(g,'g36LowerOptic').material,G36_DARK_POLYMER);
 assert.equal(one(g,'g36UpperReflex').material,G36_DARK_POLYMER);
 for(const k of ['g36LowerOpticBarrel','g36UpperReflexBarrel'])
  assert.equal(one(g,k).material,G36_OPTIC_RIM);
 for(const k of ['g36OpticFace','g36UpperReflexWindow'])
  assert.equal(one(g,k).material,G36_LENS_BLACK);
 assert.equal(one(g,'g36Buttpad').material,G36_RUBBER);
 assert.equal(one(g,'g36SelectorLever').material,G36_RUBBER);
 assert.equal(one(g,'g36ChargingHandle').material,HK_BLACK_METAL);
 assert.equal(one(g,'g36Magazine').material.color.getHex(),
  G36_SMOKED_MAGAZINE.color.getHex());
 assert.equal(one(g,'g36Magazine').material.transparent,false);
 assert.equal(one(g,'g36Magazine').material.map!==null,true);
 assert.notEqual(G36_DARK_POLYMER,HK_DARK_POLYMER,
  'other HK polymer families not recolored');
 assert.equal(weaponFinish('hk-polymer'),HK_DARK_POLYMER,
  'global HK polymer cache unchanged');
 assert.equal(WEAPON_FINISH_SPECS['g36-polymer'].role,'polymer');
 assert.equal(WEAPON_FINISH_SPECS['g36-lens'].color,0x141c18);
 clearWeaponSilhouette(g);
});
