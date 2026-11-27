/** P23 FNC fieldwork silhouette: raised stock, genuine lower gas block, long muzzle. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {FNC_P1,buildFNCStage1Silhouette}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
const one=(g,key)=>g.children.find(x=>x.userData[key]);
const all=(g,key)=>g.children.filter(x=>x.userData[key]);
const bb=x=>new THREE.Box3().setFromObject(x);
const size=(x,axis)=>bb(x).max[axis]-bb(x).min[axis];
const near=(a,b,e=.035)=>Math.abs(a-b)<e;
const cfg=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');

test('P23 stock rises together; taller hinge remains physically connected, frame remains open',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const stock=all(g,'fncP23RaisedStock'),hinge=one(g,'fncP23TallerStockHinge'),
  pad=one(g,'fncButtPlate'),top=one(g,'fncP10ContinuousBareUpperRail'),
  lower=one(g,'fncKinkedLowerRail'),brace=one(g,'fncP10LongThinConnector'),
  receiver=one(g,'fncP15FlatReceiverNose');
 assert.equal(stock.length,5,'one upper bar, one lower bar, pad, hinge and central web');
 assert.ok(stock.every(x=>near(x.userData.fncP23StockRaiseY,.38)&&near(x.position.y,.38)),
  'all five stock parts must move by exactly the same delta');
 assert.ok(hinge&&pad&&top&&lower&&brace&&receiver);
 assert.ok(size(hinge,'y')>3.17&&size(hinge,'y')<3.23);
 assert.ok(near(bb(hinge).max.y,1.38)&&near(bb(hinge).min.y,-1.82),
  'taller vertical hinge, raised top');
 assert.ok(near(bb(pad).max.y,1.03),'raised buttpad');
 assert.ok(near(bb(pad).min.x,FNC_P1.stockRearX),'overall rifle length unchanged');
 assert.ok(bb(hinge).intersectsBox(bb(top))&&bb(hinge).intersectsBox(bb(lower)));
 assert.ok(bb(hinge).intersectsBox(bb(receiver)),'connector must not float');
 assert.ok(bb(pad).intersectsBox(bb(top))&&bb(pad).intersectsBox(bb(lower)));
 assert.ok(bb(brace).intersectsBox(bb(top))&&bb(brace).intersectsBox(bb(lower)));
 assert.ok(bb(top).min.y>bb(lower).max.y+.15,
  'top and lower rails retain a meaningful open gap');
 assert.ok(size(brace,'z')<size(top,'z'),
  'inset frame plate cannot turn into a filled stock');
 clearWeaponSilhouette(g);m.dispose();
});
test('P24 front gas block begins inside handguard but upper vent geometry stays undisturbed',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const gas=one(g,'fncP23DeepForwardGasBlock'),poly=one(g,'fncFacetedHandguard'),
  ears=all(g,'fncP20SimpleSightEar'),barrel=one(g,'fncServiceBarrel');
 assert.ok(gas&&poly&&barrel);
 assert.equal(gas,one(g,'fncP22ContinuousGasBlock'));
 assert.equal(gas.geometry.getAttribute('position').count,216,
  'two extra six-face stations integrate lower housing without another mesh');
 assert.equal(L.gas.frontBottomY,-1.10);
 assert.ok(near(bb(gas).min.y,L.gas.frontBottomY));
 assert.ok(bb(gas).min.y<bb(barrel).min.y-.35,
  'front gas block extends well below the exposed barrel');
 const v=gas.geometry.getAttribute('position');
 const lowAt=x=>{
  let min=Infinity;
  for(let i=0;i<v.count;i++)if(near(v.getX(i),x,.002))
   min=Math.min(min,v.getY(i));
  return min;
 };
 assert.ok(near(lowAt(L.gas.lowerStartX),L.gas.bottomY));
 assert.ok(near(lowAt(L.gas.lowerFullX),L.gas.frontBottomY));
 assert.ok(near(lowAt(L.gas.transitionStartX),L.gas.frontBottomY));
 assert.ok(near(lowAt(L.gas.transitionEndX),L.gas.frontBottomY));
 assert.ok(near(lowAt(L.gas.endX),L.gas.frontBottomY));
 assert.ok(L.gas.lowerStartX<bb(poly).max.x-.5,
  'lower gas silhouette enters the handguard before becoming exposed');
 assert.ok(L.gas.lowerFullX>bb(poly).max.x,
  'deep housing reaches full silhouette just outside the handguard');
 assert.equal(ears.length,2);
 assert.ok(ears.every(x=>bb(x).intersectsBox(bb(gas))));
 assert.deepEqual(gas.userData.fncPixelVentCounts,{left:4,right:4,top:4});
 const lastVent=L.gas.ventFirstX+(L.gas.ventCount-1)*L.gas.ventPitch+
  L.gas.ventLength;
 assert.ok(lastVent<L.gas.transitionStartX-.35,
  'gas vents must not straddle the deep front block transition');
 clearWeaponSilhouette(g);m.dispose();
});
test('P23 factory device extends toward barrel, not forward past muzzle anchor',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const muzzle=one(g,'fncP23ExtendedFlashHider'),barrel=one(g,'fncServiceBarrel'),
  slots=one(g,'fncP17ProjectedMuzzleSlots');
 assert.ok(muzzle&&barrel&&slots);
 assert.ok(near(L.muzzle.length,1.98));
 assert.ok(near(size(muzzle,'x'),1.98));
 assert.ok(near(bb(muzzle).min.x,17.52));
 assert.ok(near(bb(muzzle).max.x,FNC_P1.muzzleX));
 assert.ok(bb(barrel).intersectsBox(bb(muzzle)));
 assert.equal(slots.geometry.getAttribute('position').count,24,
  'reuse existing two-slot pairs, no additional port geometry');
 assert.ok(bb(slots).min.x>bb(muzzle).min.x+.2&&
  bb(slots).max.x<bb(muzzle).max.x-.2,
  'all port markings remain inside longer body');
 const suppressed=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!one(suppressed,'fncMuzzle')&&!one(suppressed,'fncP17ProjectedMuzzleSlots'));
 assert.ok(near(bb(suppressed).max.x,FNC_P1.muzzleX));
 clearWeaponSilhouette(g);clearWeaponSilhouette(suppressed);m.dispose();
});
test('P23 production rifle keeps factory magazine variants, envelope and triangle budget',()=>{
 const m=new THREE.MeshBasicMaterial(),c=cfg();
 const g=buildWeaponSilhouette('rifle',m,m,c);
 const audit=countGeometry(g),peers=buildAuditReport();
 assert.ok(audit.triangles<=540&&audit.meshes<=24,
  'no new draw calls or high polygon details for structural corrections');
 assert.equal(audit.triangles,peers.find(x=>x.name==='FNC').triangles);
 assert.equal(peers.find(x=>x.name==='FAL').triangles,366);
 assert.equal(peers.find(x=>x.name==='M4A1').triangles,462);
 assert.ok(near(bb(g).min.x,FNC_P1.stockRearX)&&near(bb(g).max.x,FNC_P1.muzzleX));
 assert.equal(c.build.parts.magazine,'ar-mag30');
 assert.ok(one(g,'fncSharedARStanag'));
 assert.equal(resolveWeaponAssembly(c).muzzleX,FNC_P1.muzzleX);
 const sup={...c,slots:{...c.slots,muzzle:'muzzle-suppressor'}};
 const noMuzzle=buildWeaponSilhouette('rifle',m,m,sup);
 assert.ok(!one(noMuzzle,'fncMuzzle'));
 assert.ok(near(bb(noMuzzle).max.x,FNC_P1.muzzleX));
 clearWeaponSilhouette(g);clearWeaponSilhouette(noMuzzle);m.dispose();
 console.log('FNC P23 PRODUCTION GEOMETRY',JSON.stringify(audit));
});
