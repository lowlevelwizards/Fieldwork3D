import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHelmetFieldLayers,updateHelmetFieldLayers}
 from '../src/operator-helmet-field-visuals.ts';
import {achMichProfile} from '../src/operator-ach-mich-details.ts';
import {HELMET_MOUNT_PROFILES} from '../src/operator-helmet-attachment-frames.ts';
import {ACH_MICH_COVER_OFFSET} from '../src/operator-ach-mich-cover-drape.ts';

for(const shell of ['ach','mich-2001','mich-2002']){
 test('H12 '+shell+': both NVG surfaces are seated and share geometry',()=>{
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const cover=kit.modules.shroud.getObjectByName('shroud-covered-mount');
  const bare=kit.modules.shroud.getObjectByName('shroud-bare-mount');
  assert.ok(cover&&bare);
  assert.ok(Math.abs(cover.position.distanceTo(bare.position)-
   ACH_MICH_COVER_OFFSET)<.005);
  assert.equal(cover.children.length,4);
  for(let i=0;i<4;i++)
   assert.equal(cover.children[i].geometry,bare.children[i].geometry);
  for(const covered of [true,false]){
   updateHelmetFieldLayers(kit,{shroud:true},0x52634f,covered);
   assert.equal(cover.visible,covered);
   assert.equal(bare.visible,!covered);
  }
 });

 test('H12 '+shell+': square bungee elbows stay beyond helmet corner',()=>{
  const kit=createHelmetFieldLayers(new THREE.Group(),shell),p=achMichProfile(shell);
  for(const covered of [true,false]){
   const group=kit.modules.bungees.getObjectByName(
    covered?'bungee-cover-route':'bungee-bare-route');
   assert.ok(group);
   const layer=covered?ACH_MICH_COVER_OFFSET:0;
   const strips=[];
   group.traverse(o=>{
    if(o instanceof THREE.Mesh&&o.geometry.userData.h12FlatElastic)strips.push(o);
   });
   assert.equal(strips.length,2);
   for(const strip of strips){
    assert.equal(strip.geometry.getAttribute('position').count,24);
    assert.equal(strip.geometry.userData.h12SegmentCount,4);
   }
   const routes=kit.modules.bungees.userData[covered?
    'h9BungeeRoutes':'h12BareBungeeRoutes'];
   for(const route of routes){
    assert.ok(Math.abs(route.path[0][0])>p.side+layer+.3);
    assert.ok(Math.abs(route.path[2][0])>p.side+layer+.3);
    assert.ok(route.path[2][2]<p.front-layer-.3);
    assert.ok(route.path[4][2]<p.front-layer-.3);
   }
  }
 });

 test('H12 '+shell+': goggle band stays outside all four planes',()=>{
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const p=HELMET_MOUNT_PROFILES[shell];
  for(const where of ['front','rear']){
   const root=kit.modules['goggles-'+where];
   const model=root.children.find(x=>x.userData.h9HelmetGoggles);
   assert.equal(model.userData.h12FullPerimeter,true);
   for(const covered of [true,false]){
    const group=root.getObjectByName(covered?
     'goggle-retention-covered':'goggle-retention-bare');
    const mesh=group.children.find(x=>x instanceof THREE.Mesh);
    assert.equal(group.children.length,1);
    assert.equal(mesh.geometry.userData.h12PerimeterSegments,16);
    const layer=covered?ACH_MICH_COVER_OFFSET:0;
    const path=model.userData.h5AdaptiveStrapPaths[covered?'covered':'bare'];
    assert.equal(path.length,16);
    for(const [x,y,z] of path){
     assert.ok(Math.abs(x)>p.side+layer+.35||
      z<p.front-layer-.35||z>p.rear+layer+.35);
     assert.ok(Number.isFinite(x+y+z));
    }
    assert.ok(path.some(q=>q[2]<p.front-layer-.35));
    assert.ok(path.some(q=>q[2]>p.rear+layer+.35));
   }
  }
 });

 test('H12 '+shell+': taller ARC extends backward and descends',()=>{
  const kit=createHelmetFieldLayers(new THREE.Group(),shell);
  const p=HELMET_MOUNT_PROFILES[shell];
  for(const rail of kit.modules.rails.children){
   assert.equal(rail.userData.h12TallRearArc,true);
   const route=rail.userData.h9ArcStationPositions;
   assert.equal(route.length,7);
   assert.ok(route.at(-1)[2]>p.rear*.32);
   assert.ok(route.at(-1)[1]<route[2][1]-.3);
   const size=new THREE.Box3().setFromObject(rail).getSize(new THREE.Vector3());
   assert.ok(size.y>1.55);
  }
 });
}
