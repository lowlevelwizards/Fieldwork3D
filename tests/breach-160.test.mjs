import test from 'node:test';import assert from 'node:assert/strict';
import {stockPocket,elbowCorridor,ANATOMY} from '../src/breach-anatomy.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
test('160: anatomical shoulder, eye and elbow references are explicit',()=>{
 assert.ok(ANATOMY.eyeRight.y>ANATOMY.shoulderRight.y);
 for(const handling of ['low','ready','high','short','point','ads']){
  const pocket=stockPocket(handling);
  const fit=fitWeaponPose({weapon:'carbine',handling,yaw:0,recoil:0});
  assert.ok(Number.isFinite(fit.stockError));
  assert.ok(Math.abs(fit.stockError-Math.hypot(
   fit.stock.x-pocket.x,fit.stock.y-pocket.y,fit.stock.z-pocket.z))<1e-6);
  assert.ok(Number.isFinite(elbowCorridor(handling,-1).z));
  assert.ok(elbowCorridor(handling,-1).z<0);
  assert.ok(elbowCorridor(handling,1).z>0);
 }
 assert.notDeepEqual(stockPocket('ads'),stockPocket('short'));
});