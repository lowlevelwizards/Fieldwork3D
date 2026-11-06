/** Critical HK first-release checks; no visual redesign of AR/AK. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS,compatibleFamilyPart,matchingFamilyPreset}
 from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 readWeaponConfiguration,resolveWeaponAssembly,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {HK_BARREL_ART} from '../src/weapons/geometry/hk-barrel-profiles.ts';
import {HK_MAG20_OUTLINE} from '../src/weapons/geometry/hk-magazine-profiles.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {lowReadyFamilyFit} from '../src/breach-low-ready-family-fit.ts';
import {weaponPresentationSockets} from '../src/breach-weapon-presentation.ts';
import {carriedMagazineGeometry,carriedMagazineProfile}
 from '../src/operator-carried-magazines.ts';
import {REFERENCE_WEAPONS} from '../src/faction-reference-weapons.ts';

const ids=['hk-g3','hk-g3a3'];
const mat=new THREE.MeshBasicMaterial();
const geometry=id=>{
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),id);
 const g=buildWeaponSilhouette('rifle',mat,mat,cfg);g.updateMatrixWorld(true);
 return {cfg,g};
};
const part=(root,s)=>partVisualBounds(root,s);

test('HK catalog has exactly two distinct factory rifles with stable saved builds',()=>{
 assert.equal(FAMILY_PRESETS.filter(x=>x.family==='hk').length,2);
 for(const id of ids){
  const {cfg,g}=geometry(id);
  assert.equal(cfg.build?.family,'hk');
  assert.equal(matchingFamilyPreset(cfg.build)?.id,id);
  assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(cfg)),'rifle'),cfg);
  assert.equal(FAMILY_PARTS[cfg.build.parts.magazine].feed,'hk762');
  assert.equal(compatibleFamilyPart(cfg.build.parts.receiver,'magazine','ak-mag762','rifle'),false);
  assert.equal(compatibleFamilyPart(cfg.build.parts.receiver,'magazine','ar-mag20','rifle'),false);
  clearWeaponSilhouette(g);
 }
});
test('G3 silhouettes retain authored muzzle, seated furniture and miniature budget',()=>{
 for(const id of ids){
  const {cfg,g}=geometry(id);
  const world=new THREE.Box3().setFromObject(g),a=resolveWeaponAssembly(cfg);
  assert.ok(Math.abs(world.max.x-22.4)<.002,id+' art tip');
  assert.ok(Math.abs(a.muzzleX-world.max.x)<.002,id+' game tip');
  assert.ok(world.min.x<-15.10,id+' long fixed stock');
  assert.ok(g.children.length<=28,id+' mobile mesh budget');
  assert.ok(g.children.length>=16,id+' clear silhouette');
  for(const [sa,sb] of [
   ['receiver','stock'],['receiver','grip'],['receiver','magazine'],
   ['receiver','handguard'],['handguard','barrel']]){
   assert.ok(part(g,sa).intersectsBox(part(g,sb)),id+' joined '+sa+'/'+sb);
  }
  assert.ok(part(g,'magazine').min.y<-7.5,id+' full power box mag');
  const [rear,front]=[
   g.children.filter(x=>x.name.startsWith('family-receiver-')),
   g.children.filter(x=>x.name.startsWith('family-barrel-'))];
  assert.ok(rear.length>=8&&front.length>=3,id+' sights attached');
  clearWeaponSilhouette(g);
 }
});
test('R2 HK miniature anatomy stays long, slim and deliberately connected',()=>{
 const art=HK_BARREL_ART['hk-g3-service'];
 assert.equal(art.muzzleX,22.4);
 assert.equal(art.frontSightX,17.4);
 assert.equal(HK_MAG20_OUTLINE.length,6,'one chamfered box magazine contour');
 for(const id of ids){
  const {cfg,g}=geometry(id);
  const guard=g.children.filter(c=>c.name.startsWith('family-handguard-'));
  const forearm=guard.find(c=>c.geometry.type==='BufferGeometry');
  assert.ok(forearm,id+' custom tapered 8-sided fore-end');
  assert.equal(forearm.geometry.getAttribute('position').count,144);
  const sight=g.children.find(c=>c.geometry.type==='TorusGeometry');
  assert.ok(sight,'one open faceted front hood');
  assert.equal(g.children.filter(c=>c.geometry.type==='TorusGeometry').length,1);
  const sideMarks=g.children.filter(c=>c.name==='family-art-hk-mag-stamp20');
  assert.equal(sideMarks.length,2,'two face-seated stamp decals');
  for(const mark of sideMarks)assert.ok(Math.abs(Math.abs(mark.position.z)-1.052)<.001);
  const vents=g.children.filter(c=>c.name.includes('hk-wood-vents')||
   c.name.includes('hk-poly-vents'));
  assert.equal(vents.length,2,'one vent mark per central flat');
  const expectedZ=id==='hk-g3'?1.512:1.562;
  for(const vent of vents){
   assert.ok(Math.abs(Math.abs(vent.position.z)-expectedZ)<.001);
   assert.equal(vent.rotation.x,0,'side mark stays on flat face');
  }
  const contacts=riflePoseContacts('rifle',cfg);
  assert.ok(contacts.support.far.x<=art.handguardEndX);
  assert.ok(contacts.support.near.x<art.handguardStartX);
  clearWeaponSilhouette(g);
 }
});
test('HK has its own low-ready, real hold range, reload and carried mag socket',()=>{
 for(const id of ids){
  const {cfg,g}=geometry(id),a=resolveWeaponAssembly(cfg);
  const hold=riflePoseContacts('rifle',cfg);
  assert.equal(hold?.family,'hk');
  assert.ok(hold.support.near.x<hold.support.far.x);
  assert.ok(hold.support.far.x<14.05);
  assert.ok(lowReadyFamilyFit(cfg)?.minSupportX>=4.0);
  const sockets=weaponPresentationSockets('rifle',cfg);
  assert.equal(sockets.magazine.x,1.55);
  assert.equal(sockets.magazine.y,-2.70);
  assert.equal(sockets.stock.x,a.stockX);
  assert.ok(carriedMagazineProfile(cfg.build.parts.magazine));
  const magazine=carriedMagazineGeometry(cfg.build.parts.magazine);
  assert.ok(magazine&&magazine.getAttribute('position').count>0);
  magazine.dispose();
  clearWeaponSilhouette(g);
 }
});
test('factory muzzle art hides for muzzle attachments, and faction references use G3',()=>{
 const {cfg,g}=geometry('hk-g3a3');
 const modified=setWeaponAttachment(cfg,'muzzle','muzzle-suppressor');
 const group=buildWeaponSilhouette('rifle',mat,mat,modified);
 assert.ok(!group.children.some(x=>x.name.startsWith('family-barrel-')&&
  x.geometry.type==='BoxGeometry'&&x.geometry.parameters?.width===1.10),
  'the stock muzzle device is not drawn under the suppressor');
 assert.equal(REFERENCE_WEAPONS['greek-lizard-1990'].presetId,'hk-g3a3');
 assert.equal(REFERENCE_WEAPONS['norwegian-m98-2005'].presetId,'hk-g3a3');
 assert.equal(REFERENCE_WEAPONS['norwegian-m98-2005'].fidelity,'representative');
 clearWeaponSilhouette(g);clearWeaponSilhouette(group);
});
