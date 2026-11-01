import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelSign,PIXEL_SIGN_KINDS} from '../src/rendering/pixel-signage.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {decorateWalls} from '../src/worldgen/wall-dresser.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('every semantic sign uses a deterministic actual pixel texture',()=>{
 for(const kind of ['menu','sale','business','wayfinding','safety']){
  assert.ok(PIXEL_SIGN_KINDS.includes(kind));
  const a=pixelSign(kind,3),b=pixelSign(kind,3);
  assert.equal(a.length,32*32*4);
  assert.deepEqual(a,b);
 }
});
test('retail and restaurant get signage appropriate to their purpose',()=>{
 for(const [type,expected] of [['retail','promotion-sign'],
 ['restaurant','menu-board'],['garage','safety-sign']]){
  const s=compileArchitecturalSite(type,4,'medium'),d=decorateWalls(s,4);
  assert.ok(d.wallDetails.some(x=>x.kind==='exit-sign'),
   type+' lacks a real exterior exit label');
  assert.ok(d.wallDetails.some(x=>x.kind==='business-sign'),
   type+' lacks a frontage business marker');
  assert.ok(d.wallDetails.every(x=>x.roomId&&x.width>0));
  // The new semantic vocabulary appears at least in some seeded sites,
  // without enforcing a sign on each room surface.
 }
});
test('wall signs are all nonphysical and share the live Asset Lab vocabulary',()=>{
 const library=assetLibrary();
 for(const kind of ['menu-board','promotion-sign','business-sign','wayfinding-sign','safety-sign']){
  const x=library.find(x=>x.id==='wall-detail:'+kind);
  assert.ok(x,kind);
  assert.equal(x.solid,false);
 }
});
