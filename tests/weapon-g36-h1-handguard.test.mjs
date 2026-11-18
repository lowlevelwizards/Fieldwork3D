/** H3 production handguard: a single solid six-sided silhouette, no inset. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout} from '../src/weapons/geometry/g36-silhouettes.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_E0_FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_H3_ENDS,G36_H3_VENT_CENTERS,G36_H3_VENT_SIZE,g36H3Section}
 from '../src/weapons/geometry/g36-h3-handguard.ts';
import {G36_LONG_FOREND_RINGS} from '../src/weapons/geometry/g36-handguard-profiles.ts';
import {G36_DARK_POLYMER} from '../src/weapons/geometry/weapon-visual-palette.ts';
import {applyG36PixelDetails,g36PixelAtlas,g36PixelAtlasLayout}
 from '../src/weapons/geometry/g36-pixel-details.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const one=(g,k)=>g.children.find(m=>m.userData[k]);
const box=m=>new THREE.Box3().setFromObject(m);
const near=(a,b,t=.003)=>Math.abs(a-b)<t;
const triangles=g=>g.children.reduce((n,m)=>
 n+(m.geometry.index?.count??m.geometry.getAttribute('position').count)/3,0);
const pixel=(col,x,y)=>{
 const px=Math.floor((x-3.75)/(13.45-3.75)*96);
 const py=Math.floor((y+2.15)/(1.55+2.15)*96);
 return g36PixelAtlas().image.data[(py*384+col*96+px)*4];
};

test('H3 factory is ONE sealed six-sided, two-end shell with no hollow sculpt parts',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const guard=one(g,'g36LongHandguard');
 assert.equal(guard.userData.g36HandguardArtVersion,'h3-six-sided-solid');
 assert.equal(guard.userData.g36HandguardSectionSides,6);
 assert.equal(guard.userData.g36HandguardStations,2);
 assert.equal(G36_H3_ENDS.length,2);
 assert.equal(guard.geometry.getAttribute('position').count,60);
 assert.equal((guard.geometry.getAttribute('position').count)/3,20);
 assert.equal(g.children.filter(x=>x.name.startsWith('family-handguard-')).length,1);
 assert.ok(!one(g,'g36H21MouthRecess')&&!one(g,'g36H21MountingLug'));
 assert.equal(g.children.length,22,'H2 extra cavity and mounting lug removed');
 assert.ok(triangles(g)<=650);
 assert.ok(box(guard).intersectsBox(box(one(g,'g36ReceiverUpper'))));
 assert.ok(box(guard).intersectsBox(box(one(g,'g36Barrel'))));
 assert.ok(near(box(g).max.x,A.muzzleX,.02));
 assert.ok(g.children.every(x=>x.material===m));
 clearWeaponSilhouette(g);m.dispose();
});

test('H3 both ends are individually tilted solid planes, not beveled transition rings',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const guard=one(g,'g36LongHandguard'),pos=guard.geometry.getAttribute('position');
 const find=(x,y,z)=>Array.from({length:pos.count},(_,i)=>i).some(i=>
  near(pos.getX(i),x)&&near(pos.getY(i),y)&&near(pos.getZ(i),z));
 for(const end of G36_H3_ENDS){
  const v=g36H3Section(end);
  assert.equal(v.length,6);
  for(const [x,y,z] of v)assert.ok(find(x,y,z),'missing authored hex vertex '+x);
  assert.ok(end.roofX!==end.floorX,'cap must be tilted');
 }
 assert.ok(G36_H3_ENDS[0].roofX>G36_H3_ENDS[0].floorX,'rear slopes forward up');
 assert.ok(G36_H3_ENDS[1].roofX<G36_H3_ENDS[1].floorX,'nose slopes backward up');
 const n=guard.geometry.getAttribute('normal');
 for(let i=48;i<60;i+=3)
  assert.ok(n.getX(i)>.85,'closed nose faces outward for normal front culling');
 assert.ok(box(guard).getSize(new THREE.Vector3()).z>=2.99,'remains chunky');
 assert.equal(G36_LONG_FOREND_RINGS.length,3,'archived H1 comparator remains intact');
 clearWeaponSilhouette(g);m.dispose();
});

test('H3 keeps exactly four graphic vents and a darker FRONT in one existing atlas',()=>{
 const layout=g36PixelAtlasLayout();
 assert.equal(layout.width,384);assert.equal(layout.height,192);
 assert.equal(layout.ventsPerSide,4);
 assert.equal(layout.rightReceiverEjectionOnly,true);
 assert.equal(G36_H3_VENT_CENTERS.length,4);
 assert.equal(G36_H3_VENT_SIZE.length,1.28);
 for(const side of [0,1])for(const x of G36_H3_VENT_CENTERS){
  const y=G36_H3_VENT_SIZE.centerY;
  assert.ok(pixel(side,x,y)<110,'bold simple vent persists');
  assert.equal(pixel(side,x,y+.37),255);
  assert.equal(pixel(side,x,y-.37),255);
 }
 const atlas=g36PixelAtlas(),rgba=atlas.image.data;
 assert.strictEqual(g36PixelAtlas(),atlas,'pooled texture');
 assert.equal(rgba[((2)*384+2)*4],181,'modest darker front swatch');
 const m=new THREE.MeshStandardMaterial(),g=buildG36OriginalBlockout(m);
 const before=g.children.length,guard=one(g,'g36LongHandguard');
 applyG36PixelDetails(g);
 assert.equal(g.children.length,before,'no additional material-carrying geometry');
 assert.strictEqual(guard.material.map,atlas);
 const uv=guard.geometry.getAttribute('uv');
 for(let i=48;i<60;i++){
  assert.ok(near(uv.getX(i),2.5/384,.0001));
  assert.ok(near(uv.getY(i),2.5/192,.0001));
 }
 const mapped=guard.material;
 applyG36PixelDetails(g);
 assert.strictEqual(guard.material,mapped,'repeat applies no new cloned material');
 clearWeaponSilhouette(g);m.dispose();
});

test('H3 actual Arsenal adapter preserves original part ID, factory palette and one guard',()=>{
 const g=new THREE.Group();
 addG36Family(g,{family:'g36',parts:G36_E0_FACTORY.parts});
 const guard=one(g,'g36LongHandguard');
 assert.equal(g.userData.g36OriginalFactory,true);
 assert.equal(g.userData.g36IntegratedDualOptic,true);
 assert.ok(guard.name.includes('family-handguard-g36-handguard-long-'));
 assert.equal(guard.userData.g36HandguardArtVersion,'h3-six-sided-solid');
 assert.equal(guard.material.color.getHex(),G36_DARK_POLYMER.color.getHex());
 assert.strictEqual(guard.material.map,g36PixelAtlas());
 assert.equal(g.children.length,22);
 assert.ok(triangles(g)<=650);
 clearWeaponSilhouette(g);
});
