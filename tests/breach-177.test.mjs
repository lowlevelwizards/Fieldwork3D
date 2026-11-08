import test from 'node:test';
import assert from 'node:assert/strict';
import {stockPocket,elbowCorridor} from '../src/breach-anatomy.ts';
import {HANDLING_PROFILES} from '../src/breach-handling-profiles.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {readFileSync} from 'node:fs';
test('177: firing-side buttplate seats outside fitted chest and beneath arm when short',()=>{
 for(const mode of ['high','low','ready','point','ads','short']){
  const p=stockPocket(mode);
  if(mode==='short'){
   // The short-stock butt is under the firing armpit, not planted into
   // the normal upper-pec shoulder seat.
   assert.ok(p.z>9.7&&p.z<11);
  }else assert.ok(p.z>=7.75&&p.z<=8.25);
  const fit=fitWeaponPose({weapon:'carbine',handling:mode,
   yaw:0,recoil:0});
  assert.ok(fit.stock.z<(mode==='short'?11:8.5));
  assert.ok(fit.stockError<3);
 }
 const src=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.match(src,/for\(const sign of \[-1,1\]\)/);
});
test('177: relaxed support/firing elbows remain asymmetric and bounded',()=>{
 for(const mode of ['high','low','ready','point','ads','short']){
  const p=HANDLING_PROFILES[mode];
  assert.ok(p.supportElbowFlare>.35);
  const l=elbowCorridor(mode,-1,p),r=elbowCorridor(mode,1,p);
  assert.ok(Math.abs(l.z)<9.5&&
    Math.abs(r.z)<(mode==='short'?14:9.5));
  assert.ok(Math.abs(r.z)>Math.abs(l.z));
 }
});
