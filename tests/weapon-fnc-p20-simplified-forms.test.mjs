/** FNC P20: twelve large vents and fewer control faces, not lost identity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {countGeometry,buildAuditReport} from '../scripts/audit-weapon-geometry.mjs';
const one=(g,key)=>g.children.find(x=>x.userData[key]);
const all=(g,key)=>g.children.filter(x=>x.userData[key]);
const bb=x=>new THREE.Box3().setFromObject(x);
const close=(a,b,t=.03)=>Math.abs(a-b)<t;
const select=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');

test('P20 side/top gas cover has exactly 4+4+4 separate vent quads',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const sides=all(g,'fncP11BrokenGasSideSlots'),
  roof=one(g,'fncP11TopGasVentRow'),poly=one(g,'fncFacetedHandguard');
 assert.equal(L.gas.ventCount,4);
 assert.deepEqual([...L.gas.ventSideYs],[1.17]);
 assert.equal(sides.length,2);
 assert.ok(roof&&poly);
 for(const side of sides){
  const p=side.geometry.getAttribute('position');
  assert.equal(side.userData.fncP5GrooveCount,1);
  assert.equal(p.count,24,'four two-triangle vent quads per side');
  assert.ok(bb(side).min.y>bb(poly).max.y+.1);
  assert.ok(p.count/6===4);
 }
 assert.equal(roof.geometry.getAttribute('position').count,24,
  'four roof vent quads');
 assert.equal(sides.reduce((n,s)=>n+s.geometry.getAttribute('position').count/6,0)+
  roof.geometry.getAttribute('position').count/6,12);
 assert.equal(all(g,'fncP11PolymerLongRibs').length,2);
 clearWeaponSilhouette(g);m.dispose();
});
test('P20 front sight uses just two rectangular ears and a four-corner seat',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const ears=all(g,'fncP20SimpleSightEar'),base=one(g,'fncP20FourCornerSightSeat');
 const gas=one(g,'fncP15UpperGasSpine');
 assert.ok(base&&gas);assert.equal(ears.length,2);
 assert.ok(bb(base).intersectsBox(bb(gas)));
 assert.ok(ears.every(x=>bb(x).intersectsBox(bb(base))));
 for(const ear of ears){
  assert.equal(ear.geometry.type,'ExtrudeGeometry');
  assert.equal(ear.geometry.getAttribute('position').count,36,
   'four-corner ear; no two extra chamfer points');
  const pos=ear.geometry.getAttribute('position');
  for(let i=0;i<pos.count;i++)
   assert.ok(close(pos.getY(i),L.sight.earBottomY)||
    close(pos.getY(i),L.sight.earTopY),'only two heights on rectangular ears');
 }
 assert.equal(base.geometry.getAttribute('position').count,36,
  'four corners, no intermediate sight seat ledge');
 const ordered=ears.slice().sort((a,b)=>bb(a).min.z-bb(b).min.z);
 assert.ok(bb(ordered[0]).max.z<bb(ordered[1]).min.z-.3);
 clearWeaponSilhouette(g);m.dispose();
});
test('P20 receiver square magwell and one-piece charging lug remove bevel clutter',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const lower=one(g,'fncP20SquareMagazineHousing'),
  mag=one(g,'fncSharedARStanag'),
  lug=one(g,'fncP20SingleChargingLug'),
  upper=one(g,'fncP5CrownedReceiver'),
  slot=one(g,'fncP7UnifiedEjectionSlot');
 assert.ok(lower&&mag&&lug&&upper&&slot);
 assert.equal(lower.geometry.getAttribute('position').count,60,
  'six-corner receiver lower without tiny bevels');
 const p=lower.geometry.getAttribute('position');
 let top=0,bottom=0;
 for(let i=0;i<p.count;i++)if(close(p.getX(i),L.receiver.frontX)){
  if(close(p.getY(i),-1.09))top++;
  if(close(p.getY(i),-3.46))bottom++;
 }
 assert.ok(top&&bottom,'vertical squared magwell front face');
 assert.ok(bb(lower).intersectsBox(bb(mag)),'preserve STANAG seating');
 assert.equal(lug.geometry.type,'BoxGeometry');
 assert.equal(all(g,'fncP20SingleChargingLug').length,1);
 assert.equal(one(g,'fncP6ChargingHandleStem'),lug,
  'integrated lug replaces independently modeled connecting stem');
 assert.ok(bb(lug).intersectsBox(bb(upper)));
 assert.ok(bb(lug).intersectsBox(bb(slot)));
 assert.ok(bb(lug).max.z>bb(upper).max.z+1.2);
 assert.ok(bb(slot).min.x<bb(lug).min.x-2.5,
  'ejection opening remains rearward of the charging lug');
 clearWeaponSilhouette(g);m.dispose();
});
test('P20 preserves production family and barrel/stock/magazine anchors with a real budget reduction',()=>{
 const m=new THREE.MeshBasicMaterial(),config=select();
 const g=buildWeaponSilhouette('rifle',m,m,config);
 const count=countGeometry(g),full=buildAuditReport().find(x=>x.name==='FNC');
 assert.ok(full&&count.triangles===full.triangles);
 assert.ok(count.triangles<615,'must actually simplify FNC from 648 triangles');
 assert.ok(count.meshes<33,'must eliminate at least the extra handle stem');
 assert.ok(count.byPart.handguard.triangles<=128,
  'remove a full row of vents from each side');
 assert.ok(close(bb(g).min.x,FNC_P1.stockRearX));
 assert.ok(close(bb(g).max.x,FNC_P1.muzzleX));
 assert.equal(config.build.parts.magazine,'ar-mag30');
 assert.ok(one(g,'fncSharedARStanag'));
 assert.equal(resolveWeaponAssembly(config).muzzleX,FNC_P1.muzzleX);
 const suppressed={...config,slots:{...config.slots,muzzle:'muzzle-suppressor'}};
 const bare=buildWeaponSilhouette('rifle',m,m,suppressed);
 assert.ok(!one(bare,'fncMuzzle'));
 assert.ok(close(bb(bare).max.x,FNC_P1.muzzleX));
 clearWeaponSilhouette(bare);clearWeaponSilhouette(g);m.dispose();
 console.log('FNC P20 SIMPLIFIED GEOMETRY',JSON.stringify(count));
});