/** MP5 R2: shape-first art improvement without changes to older firearms. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {workbenchFitDistance,workbenchFitCenter}
 from '../src/weapons/geometry/weapon-workbench-camera-fit.ts';
import {readFileSync} from 'node:fs';
const steel=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
const setup=id=>{
 const p=FAMILY_PRESETS.find(x=>x.id===id);
 assert.ok(p,id);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const model=buildWeaponSilhouette(p.weapon,steel,dark,cfg);
 model.updateMatrixWorld(true);
 return {cfg,model};
};
const box=mesh=>new THREE.Box3().setFromObject(mesh);
const close=(a,b)=>Math.abs(a-b)<.02;
const atX=(mesh,x)=>{
 const pos=mesh.geometry.getAttribute('position'),out=[];
 for(let i=0;i<pos.count;i++){
  if(close(pos.getX(i),x))out.push(Math.abs(pos.getZ(i)));
 }
 assert.ok(out.length>0,'actual ring at '+x);
 return Math.max(...out);
};
test('MP5A3 tropical fore-end grows a simple single-mesh belly, not extra ribs',()=>{
 const {model}=setup('hk-mp5a3');
 const fore=model.children.filter(x=>x.userData.hkMP5Forearm==='tropical');
 assert.equal(fore.length,1,'one faceted polymer shell');
 const m=fore[0],start=3.12,end=9.55;
 assert.ok(atX(m,start+(end-start)*.36)>atX(m,start)+.20);
 assert.ok(atX(m,start+(end-start)*.36)>atX(m,end)+.20);
 assert.ok(atX(m,start+(end-start)*.72)>atX(m,end)+.15);
 assert.ok(m.geometry.getAttribute('position').count<=200,
  'large contours, no detailed decorative tessellation');
 assert.equal(model.children.some(x=>x.userData.hkMP5SDBand),false);
 clearWeaponSilhouette(model);
});
test('SD3 removes tiny dark band seams; only two large polymer rings',()=>{
 const {model}=setup('hk-mp5sd3');
 const shroud=model.children.find(x=>x.userData.hkMP5SDShroud);
 const bands=model.children.filter(x=>x.userData.hkMP5SDBand);
 assert.ok(shroud);assert.equal(bands.length,2);
 for(const band of bands){
  assert.equal(band.material,shroud.material,
   'band relief uses same polymer, no contrasting dark pinstripes');
  assert.ok(box(band).getSize(new THREE.Vector3()).x>.75,
   'intentionally broad bands rather than micro-seams');
  assert.ok(box(band).max.z>box(shroud).max.z+.06,
   'solid band projects beyond body, no coplanar faces');
 }
 assert.equal(model.children.filter(x=>x.userData.hkMP5IntegralSuppressor).length,1);
 clearWeaponSilhouette(model);
});
test('MP5K massive tilted integral grip occupies its own side silhouette',()=>{
 const {cfg,model}=setup('hk-mp5k');
 const g=model.children.find(x=>x.userData.hkMP5KVerticalForegrip);
 assert.ok(g);
 const b=box(g),h=model.children.find(x=>x.userData.hkMP5Forearm==='k');
 assert.ok(h);
 assert.ok(b.min.y<=-5.90,'visible depth below tiny fore-end');
 assert.ok(b.max.x-b.min.x>=1.55,'bold foregrip, not thin fin');
 assert.ok(b.max.z-b.min.z>=2.18,'grippable thickness in three-quarter view');
 assert.ok(b.min.x<box(h).max.x&&b.max.y>box(h).min.y,
  'integral foregrip joins the compact fore-end');
 const c=riflePoseContacts('smg',cfg),a=resolveWeaponAssembly(cfg);
 assert.ok(c.support.near.x>=b.min.x&&c.support.far.x<=b.max.x);
 assert.ok(c.support.near.y>=b.min.y&&c.support.near.y<=b.max.y);
 assert.equal(c.support.near.y,-4.20);
 assert.equal(a.supportY,-4.20,'weapon assembly agrees with operator contacts');
 assert.ok(model.children.length<=28,'minimum mesh-count standard');
 clearWeaponSilhouette(model);
});
test('K-only camera fit increases mobile occupation, without changing other models',()=>{
 const {model}=setup('hk-mp5k');
 const bounds=box(model);
 for(const [w,h] of [[300,240],[250,240]]){
  const legacy=workbenchFitDistance(bounds,w,h);
  const compact=workbenchFitDistance(bounds,w,h,37,.80,true);
  assert.ok(compact<legacy-1.0,'compact preview is demonstrably closer');
  assert.ok(compact>=24,'retains near-plane and socket margin');
  assert.deepEqual(workbenchFitCenter(bounds),[
   (bounds.min.x+bounds.max.x)/2,(bounds.min.y+bounds.max.y)/2]);
 }
 for(const id of ['hk-mp5a3','hk-mp5sd3','hk-hk53a3','ar-m4a1','ak-akm']){
  const next=setup(id),b=box(next.model);
  assert.equal(workbenchFitDistance(b,300,240),
   workbenchFitDistance(b,300,240,37,.78,false),
   id+' keeps legacy fit unchanged');
  clearWeaponSilhouette(next.model);
 }
 const workbench=readFileSync(new URL(
  '../src/equipment-weapon-workbench.ts',import.meta.url),'utf8');
 assert.match(workbench,/this.compactPreview=config.build\?\.parts.receiver==='hk-mp5k-stockless'/);
 assert.match(workbench,/this.compactPreview\?\.80:\.78,this.compactPreview/);
 clearWeaponSilhouette(model);
});
