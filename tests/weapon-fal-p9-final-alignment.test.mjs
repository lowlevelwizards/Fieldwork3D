/** FAL P9: miniature art alignment and live-finish invariants. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {weaponPresentationSockets} from '../src/breach-weapon-presentation.ts';
import {FAL_MAG20_CENTER_X,FAL_MAG20_OUTLINE,falMagazineRibOutlines}
 from '../src/weapons/geometry/fal-magazine-profiles.ts';
import {FAL_VISUAL_ANATOMY} from '../src/weapons/geometry/weapon-receiver-anatomy.ts';
import {FAL_BLACK_METAL,FAL_DARK_POLYMER,FAL_MAG_METAL,
 FAL_MAG_RIB,FAL_TRANSITION_METAL,FAL_MUZZLE_METAL,FAL_MUZZLE_SLOT,
 HK_MAG_METAL,HK_MUZZLE_METAL,AR_WA6_STEEL,AK_WA7_STEEL}
 from '../src/weapons/geometry/weapon-visual-palette.ts';
import {ARSENAL_INSPECTION_BACKGROUND,ARSENAL_SKY_FILL,addArsenalInspectionLighting}
 from '../src/arsenal/inspection-lighting.ts';
import {STUDIO_KEY_DIRECTION,STUDIO_INSPECTION_LIGHT}
 from '../src/operator-studio-lighting.ts';
import {GRAPHIC_LIGHT_PROFILE}
 from '../src/rendering/graphic-lighting-profile.ts';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';
const bounds=o=>new THREE.Box3().setFromObject(o);
const make=()=>{
 const m=new THREE.MeshBasicMaterial();
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fal-5000');
 return {m,c,root:buildWeaponSilhouette('rifle',m,m,c)};
};
test('P9 visual mag center moves 0.35 rearward with both stamped ribs',()=>{
 const {root,m,c}=make();
 const mag=root.children.find(x=>x.name==='family-magazine-fal-mag20-0');
 assert.ok(mag);
 const b=bounds(mag);
 assert.equal(FAL_MAG20_CENTER_X,1.00);
 assert.ok(Math.abs(b.min.x-(-.89))<.001);
 assert.ok(Math.abs(b.max.x-2.89)<.001);
 assert.equal(FAL_VISUAL_ANATOMY.magwellCenterX,1);
 assert.equal(falMagazineRibOutlines().length,2);
 assert.ok(root.children.filter(x=>x.userData.falStampedRib).every(x=>{
  const r=bounds(x);
  return r.min.x>=b.min.x&&r.max.x<=b.max.x&&
   x.material===FAL_MAG_RIB;
 }));
 const lower=root.children.find(x=>x.name==='family-receiver-fal-50-receiver-1');
 assert.ok(bounds(lower).min.x<-6);
 assert.ok(FAL_MAG20_OUTLINE[4][1]<FAL_MAG20_OUTLINE[3][1]);
 // Presentation magazine socket follows the moved model. Shot sockets,
 // actual ammunition and authoritative ballistics do NOT move.
 assert.equal(weaponPresentationSockets('rifle',c).magazine.x,1.00);
 assert.equal(resolveWeaponAssembly(c).muzzleX,22);
 clearWeaponSilhouette(root);m.dispose();
});
test('P9 oversize round screw stays BEHIND the moved magazine',()=>{
 const {root,m}=make(),mag=bounds(root.children.find(x=>x.name==='family-magazine-fal-mag20-0'));
 const pivots=root.children.filter(x=>x.userData.falPivotSide);
 assert.equal(pivots.length,2);
 assert.ok(pivots.every(x=>x.position.x+ x.geometry.parameters.radiusTop <mag.min.x));
 clearWeaponSilhouette(root);m.dispose();
});
test('P9 port rear extends to align over the shifted feed area',()=>{
 const {root,m}=make();
 const port=bounds(root.children.find(x=>x.userData.falEjectionPort));
 assert.ok(Math.abs(port.min.x+.80)<.001);
 assert.ok(Math.abs(port.max.x-2.64)<.001);
 assert.equal(FAL_VISUAL_ANATOMY.portWidthX,3.44);
 assert.ok(Math.abs((port.min.x+port.max.x)/2-FAL_MAG20_CENTER_X)<.1);
 assert.ok(port.min.y>=.1&&port.max.y<=.83);
 clearWeaponSilhouette(root);m.dispose();
});
test('P9 rear sight is tall, seated and narrow; front ears close inward',()=>{
 const {root,m}=make();
 const rear=root.children.find(x=>x.userData.falRearSight);
 assert.ok(rear);
 const r=bounds(rear);
 assert.ok(r.min.y<1.55&&r.max.y>2.9);
 assert.ok(r.max.z-r.min.z<=.91);
 const ears=root.children.filter(x=>x.userData.falFrontEar);
 assert.equal(ears.length,2);
 const [left,right]=ears.sort((a,b)=>a.position.z-b.position.z).map(bounds);
 assert.ok(right.min.z-left.max.z<.70);
 assert.ok(left.max.z<0&&right.min.z>0);
 clearWeaponSilhouette(root);m.dispose();
});
test('P9 dark bridge is leaner and taller; stock +15 percent; angled grip',()=>{
 const {root,m}=make();
 const bridge=root.children.find(x=>x.userData.falReceiverHandguardBridge);
 assert.ok(bridge);
 const b=bounds(bridge);
 assert.ok(b.max.z-b.min.z<=2.17);
 assert.ok(b.max.y-b.min.y>=2.54);
 assert.equal(bridge.material,FAL_TRANSITION_METAL);
 const stock=bounds(root.children.find(x=>x.name==='family-stock-fal-fixed-polymer-0'));
 const pad=bounds(root.children.find(x=>x.name==='family-stock-fal-fixed-polymer-1'));
 const grip=bounds(root.children.find(x=>x.name==='family-grip-fal-grip-0'));
 assert.ok(stock.max.y-stock.min.y>=5.50,'15 percent more stock height');
 assert.ok(pad.max.y-pad.min.y>=4.97);
 assert.ok(stock.max.z-stock.min.z<=2.35);
 assert.ok(grip.min.x>=-6.60&&grip.min.x<=-6.54);
 clearWeaponSilhouette(root);m.dispose();
});
test('P9 finishes share in-game HK/AK/AR material logic and dark muzzle steel',()=>{
 const {root,m}=make();
 assert.equal(FAL_MAG_METAL,HK_MAG_METAL);
 assert.equal(FAL_MUZZLE_METAL,HK_MUZZLE_METAL);
 assert.ok(Math.abs(FAL_BLACK_METAL.color.getHex()-AR_WA6_STEEL.color.getHex())<0x040404);
 assert.ok(FAL_DARK_POLYMER.color.getHex()<AK_WA7_STEEL.color.getHex());
 assert.equal(visualMaterialRole(FAL_MUZZLE_METAL),'steel');
 assert.equal(visualMaterialRole(FAL_MUZZLE_SLOT),'steel');
 const collar=root.children.find(x=>x.userData.falMuzzleCollar);
 const body=root.children.find(x=>x.userData.falMuzzleCombo);
 const port=root.children.find(x=>x.userData.falMuzzleSlots);
 assert.equal(collar.material,HK_MUZZLE_METAL);
 assert.equal(body.material,HK_MUZZLE_METAL);
 assert.equal(port.material,FAL_MUZZLE_SLOT);
 clearWeaponSilhouette(root);m.dispose();
});
test('P9 Arsenal and Gallery preserve game key with readable sky bounce and dark backdrop',()=>{
 const scene=new THREE.Scene();addArsenalInspectionLighting(scene);
 assert.equal(scene.background.getHex(),ARSENAL_INSPECTION_BACKGROUND);
 const hemi=scene.children.find(x=>x instanceof THREE.HemisphereLight);
 const dirs=scene.children.filter(x=>x instanceof THREE.DirectionalLight);
 assert.equal(dirs.length,2);
 const [key,fill]=dirs;
 assert.equal(hemi.intensity,ARSENAL_SKY_FILL.hemisphereIntensity);
 assert.equal(key.intensity,2.35);
 assert.equal(fill.intensity,ARSENAL_SKY_FILL.fillIntensity);
 assert.equal(hemi.color.getHex(),ARSENAL_SKY_FILL.sky);
 assert.equal(hemi.groundColor.getHex(),ARSENAL_SKY_FILL.ground);
 assert.equal(fill.color.getHex(),ARSENAL_SKY_FILL.fill);
 assert.ok(key.position.clone().normalize().distanceTo(STUDIO_KEY_DIRECTION)<1e-8);
 assert.ok(STUDIO_KEY_DIRECTION.distanceTo(new THREE.Vector3(
  ...GRAPHIC_LIGHT_PROFILE.keyDirection).normalize())<1e-8);
});

test('P10 forward stock neck climbs toward receiver; grip only translates forward',()=>{
 const {root,m,c}=make();
 const shell=root.children.find(x=>x.name==='family-stock-fal-fixed-polymer-0');
 const grip=root.children.find(x=>x.name==='family-grip-fal-grip-0');
 const receiver=root.children.find(x=>x.name==='family-receiver-fal-50-receiver-0');
 assert.ok(shell&&grip&&receiver);
 const sb=bounds(shell),gb=bounds(grip),rb=bounds(receiver);
 const vertices=shell.geometry.getAttribute('position');
 const contains=(x,y)=>Array.from({length:vertices.count},
  (_,i)=>i).some(i=>Math.abs(vertices.getX(i)-x)<.001&&
   Math.abs(vertices.getY(i)-y)<.001);
 assert.ok(contains(-8.10,.72),'preserve existing sloping comb');
 assert.ok(contains(-6.12,1.48),'raise only forwardmost stock top corner');
 assert.ok(contains(-14.60,.12)&&contains(-14.60,-4.81),
  'preserve butt silhouette and lower heel');
 assert.ok(Math.abs(rb.max.y-sb.max.y)<.10,
  'neck should rise near the rear receiver roof');
 assert.ok(sb.max.x>rb.min.x,'stock and upper must overlap, not float apart');
 assert.ok(sb.max.z-sb.min.z<=2.35,'do not thicken stock');
 assert.ok(Math.abs(gb.min.x+6.57)<.001);
 assert.ok(Math.abs(gb.max.x+2.94)<.001);
 assert.ok(Math.abs((gb.max.y-gb.min.y)-3.67)<.001);
 assert.ok(gb.max.x<-.89,'grip still has air gap behind the magazine');
 assert.equal(root.children.filter(x=>x.name.startsWith('family-stock-')).length,2);
 assert.equal(root.children.filter(x=>x.name.startsWith('family-grip-')).length,1);
 assert.equal(resolveWeaponAssembly(c).muzzleX,22);
 clearWeaponSilhouette(root);m.dispose();
});
