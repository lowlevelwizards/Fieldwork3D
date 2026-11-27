/** P22: purposeful FNC mass separation and shared-STANAG fit, without detail inflation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {FNC_P1,buildFNCStage1Silhouette}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {fncPixelAtlas} from '../src/weapons/geometry/fnc-pixel-details.ts';
import {arMagazineCurve} from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
const one=(g,k)=>g.children.find(x=>x.userData[k]);
const all=(g,k)=>g.children.filter(x=>x.userData[k]);
const box=x=>new THREE.Box3().setFromObject(x);
const size=(x,k)=>box(x).max[k]-box(x).min[k];
const close=(a,b,t=.03)=>Math.abs(a-b)<=t;
const cfg=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
const pixel=(col,row,x,y,b)=>{
 const {data,width}=fncPixelAtlas().image,[x0,x1,y0,y1]=b;
 const i=col*128+Math.max(0,Math.min(127,Math.floor((x-x0)/(x1-x0)*128)));
 const j=row*128+Math.max(0,Math.min(127,Math.floor((y-y0)/(y1-y0)*128)));
 return data[(j*width+i)*4];
};
test('P22.1: the one-piece magwell visibly surrounds AR 20/30/poly magazine mouths',()=>{
 const m=new THREE.MeshBasicMaterial();
 assert.equal(L.receiver.magwellRearX,-1.58);
 assert.equal(L.receiver.magwellFrontX,2.45);
 assert.equal(L.receiver.frontX,2.75,'keep visible receiver shoulder ahead of mouth');
 for(const magStyle of ['ar-mag20','ar-mag30','ar-magpoly']){
  const g=buildFNCStage1Silhouette(m,{},true,magStyle);
  const well=one(g,'fncP22ComfortableSTANAGHousing'),
   mag=one(g,'fncSharedARStanag'),upper=one(g,'fncP15FlatReceiverNose');
  assert.ok(well&&mag&&upper);
  const c=arMagazineCurve(magStyle==='ar-magpoly'?'poly':magStyle==='ar-mag20'?'20':'30',
   L.receiver.magazineCenterX,L.receiver.magazineTopY);
  assert.ok(c.topX-c.width/2-L.receiver.magwellRearX>.30,'rear wall has material');
  assert.ok(L.receiver.magwellFrontX-(c.topX+c.width/2)>.30,'front wall has material');
  assert.ok(box(well).intersectsBox(box(mag)),'magazine remains seated');
  assert.equal(well.geometry.getAttribute('position').count,84,'eight-corner integrated lower');
  assert.ok(close(box(upper).max.x,L.receiver.frontX));
  assert.ok(close(box(well).max.x,L.receiver.frontX));
  const pos=well.geometry.getAttribute('position');
  let lipFront=-Infinity;
  for(let i=0;i<pos.count;i++)if(pos.getY(i)<-2.58)
   lipFront=Math.max(lipFront,pos.getX(i));
  assert.ok(close(lipFront,L.receiver.magwellFrontX));
  assert.equal(all(g,'fncP22ComfortableSTANAGHousing').length,1);
  clearWeaponSilhouette(g);
 }
 m.dispose();
});
test('P22.2: visible steel neck is exposed but solidly connected',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const poly=one(g,'fncP22ExposedMetalNeck'),gas=one(g,'fncP22ContinuousGasBlock'),
  upper=one(g,'fncP15FlatReceiverNose'),lower=one(g,'fncAngularLower'),
  stop=one(g,'fncP11HandstopLip');
 assert.ok(poly&&gas&&upper&&lower&&stop);
 assert.ok(L.polymer.startX-L.receiver.frontX>=.45);
 assert.ok(close(box(poly).min.x,3.25));
 assert.ok(box(poly).min.x>box(upper).max.x&&
  box(poly).min.x>box(lower).max.x,'visible gap in side silhouette');
 assert.ok(box(upper).intersectsBox(box(gas))&&
  box(poly).intersectsBox(box(gas)),'exposed steel bridges both masses');
 assert.ok(box(poly).intersectsBox(box(stop))&&box(stop).intersectsBox(box(gas)));
 assert.equal(L.polymer.lowerFlare,.23);
 assert.ok(size(poly,'y')>2.54&&size(poly,'y')<2.63);
 assert.ok(box(poly).max.y<.64,'polymer roof does not swallow gas vents');
 clearWeaponSilhouette(g);m.dispose();
});
test('P22.3: gas box and front sight seat are one true mesh with two open ears',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const gas=one(g,'fncP22ContinuousGasBlock'),seat=one(g,'fncP7ContinuousGasSightSeat'),
  ears=all(g,'fncP20SimpleSightEar'),poly=one(g,'fncFacetedHandguard');
 assert.ok(gas&&seat&&poly);
 assert.equal(gas,seat,'no extra sight pedestal');
 assert.equal(gas.geometry.getAttribute('position').count,216,
  'six closed gas stations including lower housing beneath handguard');
 assert.ok(box(gas).max.x>box(poly).max.x+3.3);
 assert.ok(close(box(gas).max.x,15.10));
 assert.equal(ears.length,2);
 assert.ok(ears.every(e=>box(e).intersectsBox(box(gas))));
 const sorted=ears.slice().sort((a,b)=>box(a).min.z-box(b).min.z);
 assert.ok(box(sorted[0]).max.z<box(sorted[1]).min.z-.3);
 assert.equal(gas.userData.fncPixelVentCounts.top,4);
 assert.equal(gas.userData.fncPixelVentCounts.left,4);
 assert.equal(gas.userData.fncPixelVentCounts.right,4);
 const lastVent=L.gas.ventFirstX+3*L.gas.ventPitch+L.gas.ventLength;
 assert.ok(lastVent<L.gas.transitionStartX-.35,
  'last vent does not enter widened gas-block transition');
 const x=L.gas.ventFirstX+L.gas.ventPitch+.45;
 assert.ok(pixel(3,0,x,1.17,[L.gas.startX,L.gas.endX,L.gas.frontBottomY,L.gas.topY])<150);
 assert.ok(pixel(0,1,x,0,[L.gas.startX,L.gas.endX,
  -L.gas.roofHalfZ,L.gas.roofHalfZ])<150);
 clearWeaponSilhouette(g);m.dispose();
});
test('P22.4: solid rear sight and open, slimmer butt pad stock',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const rear=one(g,'fncP22SolidRearSight'),pad=one(g,'fncButtPlate'),
  web=one(g,'fncP10LongThinConnector'),upper=one(g,'fncP10ContinuousBareUpperRail'),
  lower=one(g,'fncKinkedLowerRail');
 assert.ok(rear&&pad&&web&&upper&&lower);
 assert.equal(rear.geometry.type,'ExtrudeGeometry');
 assert.equal(rear.geometry.parameters.shapes.holes.length,0);
 assert.equal(rear.geometry.getAttribute('position').count,36,
  'four corners; no aperture hole or small knobs');
 assert.ok(close(box(rear).max.y,2.63));
 assert.ok(size(pad,'y')>=4.65&&size(pad,'y')<4.72);
 assert.ok(close(box(pad).min.x,FNC_P1.stockRearX));
 assert.ok(size(web,'x')>3.6&&size(web,'x')<3.8);
 assert.ok(size(web,'z')<size(lower,'z')-.2,'the plate remains inset');
 assert.ok(box(web).intersectsBox(box(upper))&&box(web).intersectsBox(box(lower)));
 assert.ok(box(pad).intersectsBox(box(upper))&&box(pad).intersectsBox(box(lower)));
 clearWeaponSilhouette(g);m.dispose();
});
test('P22.5: remove only lower stamped line, keep receiver seam and pixel vents',()=>{
 const b=[-6.40,2.80,-3.60,-1.00];
 assert.ok(pixel(1,0,-2,-1.30,b)<160,'receiver boundary remains');
 assert.equal(pixel(1,0,-3,-2.16,b),255,'lower stamp removed');
 assert.equal(pixel(2,0,-3,-2.16,b),255,'other flank stays clean');
 const config=cfg(),r=riflePoseContacts('rifle',config);
 assert.ok(r&&r.family==='fnc');
 assert.ok(r.support.near.x>=4.10&&r.support.far.x<=10.90);
 assert.ok(r.support.far.x<L.polymer.endX-.6);
});
test('P22.5: established muzzle, magazine, stock, FAL/AR and compact geometry budget',()=>{
 const mat=new THREE.MeshBasicMaterial(),config=cfg();
 const gun=buildWeaponSilhouette('rifle',mat,mat,config),counts=countGeometry(gun),
  peers=buildAuditReport();
 assert.ok(counts.triangles<=540,'silhouette changes should earn their cost');
 assert.ok(counts.meshes<=26,'avoid added spacer, decals or seat slabs');
 assert.equal(counts.triangles,peers.find(x=>x.name==='FNC').triangles);
 assert.equal(peers.find(x=>x.name==='FAL').triangles,366);
 assert.equal(peers.find(x=>x.name==='M4A1').triangles,462);
 assert.ok(close(box(gun).min.x,FNC_P1.stockRearX));
 assert.ok(close(box(gun).max.x,FNC_P1.muzzleX));
 assert.equal(config.build.parts.magazine,'ar-mag30');
 assert.ok(one(gun,'fncSharedARStanag'));
 assert.equal(resolveWeaponAssembly(config).muzzleX,19.5);
 const suppressed={...config,slots:{...config.slots,muzzle:'muzzle-suppressor'}};
 const noDevice=buildWeaponSilhouette('rifle',mat,mat,suppressed);
 assert.ok(!one(noDevice,'fncMuzzle'));
 assert.ok(close(box(noDevice).max.x,FNC_P1.muzzleX));
 clearWeaponSilhouette(noDevice);clearWeaponSilhouette(gun);mat.dispose();
 console.log('P22 FNC CONTIGUOUS SILHOUETTE AUDIT',JSON.stringify(counts));
});