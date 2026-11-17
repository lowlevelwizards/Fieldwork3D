/** G36 V13 stock art: approved reference-first silhouette in the real weapon builder. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout,G36_B_PART_IDS} from '../src/weapons/geometry/g36-silhouettes.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const find=(g,key)=>g.children.find(x=>x.userData[key]);
const bounds=x=>new THREE.Box3().setFromObject(x);
const hit=(mesh,x,y)=>new THREE.Raycaster(
 new THREE.Vector3(x,y,8),new THREE.Vector3(0,0,-1)
).intersectObject(mesh,false).length>0;

test('V13: original G36 factory uses one reference-led main stock with two open voids',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const g=buildG36OriginalBlockout(m);
 const stock=find(g,'g36MasterStock'),pad=find(g,'g36Buttpad'),
  hinge=find(g,'g36StockHinge');
 assert.ok(stock&&pad&&hinge);
 assert.equal(stock.userData.g36StockArtVersion,'v13-reference');
 assert.equal(stock.userData.g36StockOpeningCount,2);
 assert.equal(stock.geometry.parameters.shapes.holes.length,2);
 assert.equal(stock.geometry.parameters.shapes.getPoints(1).length>=12,true);
 assert.equal(g.children.filter(x=>x.userData.g36MasterStock).length,1);
 assert.ok(stock.name.startsWith('family-stock-'+G36_B_PART_IDS.stock+'-'));
 assert.ok(bounds(stock).intersectsBox(bounds(pad)),'rear buttpad contacts the V13 frame');
 assert.ok(bounds(stock).intersectsBox(bounds(hinge)),'hinge contacts the V13 frame');
 assert.ok(bounds(stock).max.z-bounds(stock).min.z<1.8,'no thick blocky Z slab');
 assert.ok(Math.abs(bounds(g).min.x-A.stockRearX)<.01,'rear factory datum preserved');
 assert.ok(Math.abs(bounds(g).max.x-A.muzzleX)<.01,'muzzle factory datum preserved');
 clearWeaponSilhouette(g);m.dispose();
});

test('V13: reference heel is solid, two openings physically clear and rear brace sweeps down',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const g=buildG36OriginalBlockout(m),stock=find(g,'g36MasterStock');
 assert.equal(hit(stock,-12.5,-1.4),false,'large rear opening is physically open');
 assert.equal(hit(stock,-8.15,-.92),false,'small hinge-side opening is physically open');
 assert.equal(hit(stock,-14.45,-1.4),true,'rear upright is thick solid material');
 assert.equal(hit(stock,-14.45,-4.8),true,'tall rear heel stays solid');
 assert.equal(hit(stock,-13.4,-4.2),false,'open space remains below the heel sweep');
 assert.equal(hit(stock,-6.65,-.75),true,'front frame attaches at the hinge');
 const outline=stock.geometry.parameters.shapes;
 assert.ok(outline.holes.every(x=>x.getPoints(1).length>=4));
 assert.ok(bounds(stock).min.y<-5.23&&bounds(stock).max.y>1.19,
  'reference-led tall heel and raised forward shoulder retained');
 clearWeaponSilhouette(g);m.dispose();
});
