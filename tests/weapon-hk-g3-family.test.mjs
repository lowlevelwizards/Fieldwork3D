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
import {HK_MAG20_OUTLINE,HK_MAG20_CENTER_X}
 from '../src/weapons/geometry/hk-magazine-profiles.ts';
import {HK_VISUAL_ANATOMY}
 from '../src/weapons/geometry/weapon-receiver-anatomy.ts';
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
  assert.ok(g.children.length<=24,id+' lean miniature mesh budget');
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
  assert.ok(rear.length>=7&&front.length>=3,id+' seated HK landmarks');
  assert.equal(g.children.filter(x=>x.userData.hkRearSight).length,1,
   id+' exactly one simple rear sight');
  clearWeaponSilhouette(g);
 }
});
test('R2 HK miniature anatomy stays long, slim and deliberately connected',()=>{
 const art=HK_BARREL_ART['hk-g3-service'];
 assert.equal(art.muzzleX,22.4);
 assert.equal(art.frontSightX,17.4);
 assert.equal(art.lengthScale,.95);
 assert.equal(art.handguardStartX,4.05);
 assert.equal(art.handguardEndX,14.05);
 assert.equal(HK_MAG20_OUTLINE.length,6,'one chamfered box magazine contour');
 for(const id of ids){
  const {cfg,g}=geometry(id);
  const guard=g.children.filter(c=>c.name.startsWith('family-handguard-'));
  const forearm=guard.find(c=>c.geometry.type==='BufferGeometry');
  assert.ok(forearm,id+' custom tapered 8-sided fore-end');
  // The charging handle legitimately projects beyond the receiver sides.
  // Compare the stamped SHELL only, not its visible side-mounted hardware.
  const receiverShell=g.children.find(c=>c.name===
   'family-receiver-'+cfg.build.parts.receiver+'-0');
  assert.ok(receiverShell,id+' main stamped receiver exists');
  const shellBox=new THREE.Box3().setFromObject(receiverShell);
  assert.ok(Math.abs(shellBox.max.z-shellBox.min.z-3.52)<.01,
   'G3 stamped shell retains the shared miniature thickness language');
  assert.equal(forearm.geometry.getAttribute('position').count,144);
  const sight=g.children.find(c=>c.geometry.type==='TorusGeometry');
  assert.ok(sight,'one open faceted front hood');
  assert.equal(g.children.filter(c=>c.geometry.type==='TorusGeometry').length,1);
  assert.equal(g.children.filter(c=>c.name==='family-art-hk-mag-stamp20').length,
   0,'remove two unnecessary pale magazine stripes');
  const vents=g.children.filter(c=>c.name==='family-art-hk-handguard-openings');
  assert.equal(vents.length,2,'one batched opening mesh per side');
  const expectedZ=id==='hk-g3'?1.518:1.568;
  for(const vent of vents){
   assert.equal(vent.userData.hkVentCount,4,'four large openings per side');
   assert.equal(vent.userData.hkFaceAligned,true);
   assert.equal(vent.geometry.index.count,24,'eight triangles, one mesh');
   const a=vent.geometry.getAttribute('position');
   for(let k=0;k<a.count;k++){
    assert.ok(Math.abs(Math.abs(a.getZ(k))-expectedZ)<.001,
     'every opening sits directly on the true flat handguard face');
   }
  }
  const handle=g.children.filter(c=>c.userData.hkCockingHandle);
  assert.equal(handle.length,1,'single overbuilt side-folded HK cocking handle');
  assert.ok(handle[0].position.z<-.9,'HK handle sits on the left side');
  const rear=g.children.filter(c=>c.userData.hkRearSight);
  assert.deepEqual(rear.map(c=>c.userData.hkRearSight),
   [id==='hk-g3'?'early-leaf':'diopter-drum']);
  assert.equal(sight.geometry.parameters.tubularSegments,6,
   'six strong sides rather than a fiddly circular ring');
  const port=g.children.find(c=>c.name==='family-art-hk-port');
  assert.ok(port);
  assert.equal(port.geometry.parameters.width,4.00,'port sized for the magwell');
  assert.equal(port.material.map.image.width,24);
  const pixels=port.material.map.image.data;
  const boltPixels=[];
  for(let p=0;p<pixels.length/4;p++){
   if(pixels[p*4]>=70)boltPixels.push(p);
  }
  assert.ok(boltPixels.length>=40,'one broad visible light bolt inset');
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

test('R4: one non-coplanar buttplate per stock, preserving the rear landmark',()=>{
 for(const id of ids){
  const {cfg,g}=geometry(id),a=resolveWeaponAssembly(cfg);
  const pad=g.children.find(x=>x.userData.hkButtpad);
  const stock=g.children.find(x=>x.name===
   'family-stock-'+cfg.build.parts.stock+'-0');
  assert.ok(pad&&stock,id+' one seated buttpad and stock body');
  assert.equal(g.children.filter(x=>x.userData.hkButtpad).length,1);
  const rear=pad.position.x-pad.geometry.parameters.width/2;
  assert.ok(Math.abs(rear-a.stockX)<1e-5,id+' outer stock X unchanged');
  const shell=new THREE.Box3().setFromObject(stock);
  const cover=new THREE.Box3().setFromObject(pad);
  assert.ok(cover.min.x<shell.min.x,'pad is the actual rear-most component');
  assert.ok(cover.max.x>shell.min.x+.02,'pad overlaps stock body');
  assert.ok(cover.min.z<shell.min.z-.02 && cover.max.z>shell.max.z+.02,
   'pad side faces stand clear of stock side faces, no Z fight');
  clearWeaponSilhouette(g);
 }
});
test('R4: vertical box magazine is centered in its magwell at top and heel',()=>{
 const profile=HK_MAG20_OUTLINE;
 assert.equal(profile.length,6,'one clean magazine mesh with two heel bevels');
 const topCenter=(profile[0][0]+profile[1][0])/2;
 const heelCenter=(profile[3][0]+profile[4][0])/2;
 assert.ok(Math.abs(topCenter-HK_MAG20_CENTER_X)<1e-6);
 assert.ok(Math.abs(heelCenter-topCenter)<1e-6);
 assert.equal(profile[0][0],profile[5][0],'rear edge stays vertical');
 assert.equal(profile[1][0],profile[2][0],'front edge stays vertical');
 for(const id of ids){
  const {cfg,g}=geometry(id);
  const mag=g.children.find(x=>x.name==='family-magazine-'+cfg.build.parts.magazine+'-0');
  const base=g.children.find(x=>x.name==='family-magazine-'+cfg.build.parts.magazine+'-1');
  assert.ok(mag&&base);
  assert.equal(base.position.x,HK_MAG20_CENTER_X,'baseplate seated on box');
  assert.ok(base.geometry.parameters.width<=3.24,'no oversized projecting heel');
  clearWeaponSilhouette(g);
 }
});
test('R4: right-side port aligns with magazine; opposite side holds HK selector',()=>{
 assert.equal(HK_VISUAL_ANATOMY.portX,HK_VISUAL_ANATOMY.magwellCenterX);
 for(const id of ids){
  const {cfg,g}=geometry(id);
  const port=g.children.find(x=>x.userData.hkEjectionPort);
  const selector=g.children.find(x=>x.name==='family-art-hk-selector');
  assert.ok(port&&selector);
  assert.equal(port.position.x,HK_VISUAL_ANATOMY.magwellCenterX);
  assert.equal(port.position.y,HK_VISUAL_ANATOMY.portY);
  assert.equal(port.geometry.parameters.width,HK_VISUAL_ANATOMY.portWidthX);
  assert.ok(port.position.z>1.76 && selector.position.z<0,
   'ejection opening right, selector on opposite side');
  assert.ok(HK_VISUAL_ANATOMY.portY>.35 && HK_VISUAL_ANATOMY.portY<.75,
   'ejection opening stays adjacent to barrel centerline');
  const bolt=port.material.map.image.data;
  assert.ok(bolt.length>0);
  let bright=0;
  for(let n=0;n<bolt.length;n+=4)
   if(bolt[n]>=70)bright++;
  assert.ok(bright>=40,'single broad bolt inset remains readable');
  clearWeaponSilhouette(g);
 }
});
test('R4: HK pistol-grip rake, one side cocking handle and distinct sights',()=>{
 for(const id of ids){
  const {cfg,g}=geometry(id),a=resolveWeaponAssembly(cfg);
  const grip=g.children.find(x=>x.name===
   'family-grip-'+cfg.build.parts.grip+'-0');
  const gripBounds=new THREE.Box3().setFromObject(grip);
  assert.ok(a.primaryX>gripBounds.min.x&&a.primaryX<gripBounds.max.x,
   'hand socket remains within raked grip span');
  const position=grip.geometry.getAttribute('position');
  const low=[],high=[];
  for(let i=0;i<position.count;i++){
   const x=position.getX(i),y=position.getY(i);
   if(y<-6.5)low.push(x);
   if(y>-2.5&&y<-2.0)high.push(x);
  }
  assert.ok(low.length&&high.length);
  // Extruded profiles contain repeated triangle vertices. Comparing their
  // raw average biases toward tessellation instead of the authored contour.
  const contourCenter=xs=>{
   const unique=[...new Set(xs.map(x=>x.toFixed(3)))].map(Number);
   return (Math.min(...unique)+Math.max(...unique))/2;
  };
  assert.ok(contourCenter(low)<contourCenter(high)-.25,
   'authored grip heel has a clear rearward rake');
  const handle=g.children.find(x=>x.userData.hkCockingHandle);
  assert.ok(handle);
  const hb=new THREE.Box3().setFromObject(handle);
  assert.ok(hb.min.z< -1.95,'side cocking handle is visible beyond receiver');
  assert.ok(hb.max.y<=2.56,'side handle does not become a second rear tower');
  const rear=g.children.find(x=>x.userData.hkRearSight);
  assert.ok(rear);
  if(id==='hk-g3a3'){
   assert.equal(rear.geometry.type,'CylinderGeometry');
   assert.equal(rear.geometry.parameters.radialSegments,6);
  }else assert.equal(rear.geometry.type,'ExtrudeGeometry');
  clearWeaponSilhouette(g);
 }
});
