import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFALCoreSilhouette,FAL_ART}
 from '../src/weapons/geometry/fal-core-silhouette.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {FAL_BARREL_ART} from '../src/weapons/geometry/fal-barrel-profiles.ts';

const bounds=o=>new THREE.Box3().setFromObject(o);
const find=(root,name)=>{
 const mesh=root.children.find(x=>x.name===name);
 assert.ok(mesh,'missing '+name);
 return mesh;
};
const config=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fal-5000');
test('FAL P1: single shared art core keeps full-sized datum and lean factory budget',()=>{
 const steel=new THREE.MeshBasicMaterial({color:'gray'});
 const poly=new THREE.MeshBasicMaterial({color:'black'});
 const mats={receiver:steel,barrel:steel,stock:poly,grip:poly,
  handguard:poly,magazine:steel};
 const ids=Object.fromEntries(Object.keys(mats).map(x=>[x,'fal-unit-'+x]));
 const core=buildFALCoreSilhouette(mats,ids,{raisedCarryHandle:true});
 assert.equal(core.children.length,19,'P7: merged lower, ribbed magazine and combo muzzle');
 const full=bounds(core);
 assert.ok(Math.abs(full.min.x-FAL_ART.stockRearX)<.001);
 assert.ok(Math.abs(full.max.x-FAL_ART.muzzleX)<.001);
 const support=core.children.find(x=>x.userData.falCarrySupport);
 const handle=core.children.find(x=>x.userData.falCarryGrip);
 assert.ok(support&&handle);
 assert.strictEqual(support.material,steel);
 assert.strictEqual(handle.material,poly);
 assert.ok(bounds(support).intersectsBox(bounds(handle)),
  'carry grip must intersect its steel support');
 assert.ok(bounds(support).intersectsBox(bounds(find(core,'family-receiver-fal-unit-receiver-0'))),
  'steel foot should be embedded in upper receiver');
 assert.ok(bounds(handle).max.x<3.2&&bounds(handle).min.x<1.0,
  'handle grip must extend rearward, never bridge forward like an AR carry handle');
 assert.ok(bounds(handle).min.z<-.1,'folding handle stays offset to the left');
 clearWeaponSilhouette(core);assert.equal(core.children.length,0);
 steel.dispose();poly.dispose();
});
test('FAL P1: front sight has centered post and two lateral protective ears',()=>{
 const m=new THREE.MeshBasicMaterial();
 const root=buildWeaponSilhouette('rifle',m,m,config());
 const base=find(root,'family-barrel-fal-21-service-1');
 const left=find(root,'family-barrel-fal-21-service-2');
 const right=find(root,'family-barrel-fal-21-service-3');
 const post=find(root,'family-barrel-fal-21-service-4');
 assert.equal(left.userData.falFrontEar,'left');
 assert.equal(right.userData.falFrontEar,'right');
 assert.equal(post.userData.falFrontPost,true);
 const L=bounds(left),R=bounds(right),P=bounds(post),B=bounds(base);
 assert.ok(Math.abs(L.min.z+R.max.z)<1e-6);
 assert.ok(Math.abs(L.max.z+R.min.z)<1e-6);
 assert.ok(L.max.z<0&&R.min.z>0);
 assert.ok(P.min.z<0&&P.max.z>0);
 assert.ok(B.max.y>=Math.min(L.min.y,R.min.y),'ear bases embed into gas block');
 assert.ok(B.max.y>P.min.y,'center post embeds into base');
 assert.ok(L.max.y>2.9&&L.max.y<3.05,'maintain current short FAL sight envelope');
 assert.ok(Math.abs((L.min.x+L.max.x)/2-FAL_ART.frontSightX)<.5);
 assert.equal(root.children.length,25);
 assert.equal(root.children.filter(x=>x.name.startsWith('family-handguard-fal-vented')).length,3);
 assert.ok(root.children.every(x=>x.name.startsWith('family-')));
 clearWeaponSilhouette(root);m.dispose();
});
test('FAL P1: buttplate terminates stock without end-face collision or side seams',()=>{
 const m=new THREE.MeshBasicMaterial();
 const root=buildWeaponSilhouette('rifle',m,m,config());
 const shell=bounds(find(root,'family-stock-fal-fixed-polymer-0'));
 const pad=bounds(find(root,'family-stock-fal-fixed-polymer-1'));
 assert.ok(Math.abs(pad.min.x+15)<.001);
 assert.ok(shell.min.x>-14.7,'stock rear terminates inside pad');
 assert.ok(shell.min.x<pad.max.x-.05,'stock overlaps pad rather than leaving a gap');
 assert.ok(pad.min.y<shell.min.y&&pad.max.y>0,'buttpad fits the drooped rear comb');
 assert.ok(pad.max.z>shell.max.z&&pad.min.z<shell.min.z);
 const original=resolveWeaponAssembly(config());
 assert.equal(original.stockX,-15);
 assert.equal(original.muzzleX,FAL_BARREL_ART['fal-21-service'].muzzleX);
 assert.equal(original.muzzleY,0);
 clearWeaponSilhouette(root);m.dispose();
});
test('FAL P1: no-factory-muzzle build still reaches authoritative muzzle, no double tip',()=>{
 const m=new THREE.MeshBasicMaterial();
 const mats={stock:m,receiver:m,grip:m,magazine:m,handguard:m,barrel:m};
 const ids={stock:'s',receiver:'r',grip:'g',magazine:'m',handguard:'h',barrel:'b'};
 const root=buildFALCoreSilhouette(mats,ids,{raisedCarryHandle:true,showFactoryMuzzle:false});
 assert.equal(root.children.length,17);
 assert.ok(Math.abs(bounds(root).max.x-22)<.001);
 assert.ok(!root.children.some(x=>x.userData.falMuzzleCombo||x.userData.falMuzzleCollar),
  'bare muzzle has no factory combo device or collar');
 clearWeaponSilhouette(root);m.dispose();
});
