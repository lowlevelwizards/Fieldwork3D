import test from 'node:test';import assert from 'node:assert/strict';
import {HANDLING_PROFILES,handlingProfile} from '../src/breach-handling-profiles.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
test('161: named silhouettes own distinct intentional muzzle and stock geometry',()=>{
 const keys=['low','ready','high','short','point','ads'];
 assert.equal(new Set(keys.map(k=>HANDLING_PROFILES[k].pitch)).size,6);
 const fit=mode=>fitWeaponPose({weapon:'carbine',handling:mode,yaw:0,recoil:0});
 const poses=Object.fromEntries(keys.map(k=>[k,fit(k)]));
 assert.ok(poses.high.rotation.z>.4,'high ready muzzle must visibly rise');
 assert.ok(poses.low.rotation.z<-.3,'low ready muzzle must visibly lower');
 assert.ok(poses.short.stock.x<poses.ready.stock.x-1);
 assert.ok(poses.ads.stock.y>poses.point.stock.y);
 assert.ok(poses.point.stock.x>=poses.ready.stock.x);
 for(const k of keys){
  assert.equal(poses[k].handling,k,'solver cannot silently substitute Short Stock');
  assert.ok(Number.isFinite(poses[k].contactError));
 }
});
test('161: weapon-family profile corrections preserve distinct silhouette identity',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const short=handlingProfile('short',weapon);
  assert.ok(short.preferredBack>5);
  assert.ok(handlingProfile('high',weapon).pitch>
    handlingProfile('low',weapon).pitch+.75);
 }
});