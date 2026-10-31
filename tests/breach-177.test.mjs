import test from 'node:test';
import assert from 'node:assert/strict';
import {stockPocket,elbowCorridor} from '../src/breach-anatomy.ts';
import {HANDLING_PROFILES} from '../src/breach-handling-profiles.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {readFileSync} from 'node:fs';
test('177: firing-side buttplate seats in padded upper pec, not outside arm',()=>{
 for(const mode of ['high','low','ready','point','ads','short']){
  const p=stockPocket(mode);
  assert.ok(p.z>=6.35&&p.z<7.1);
  const fit=fitWeaponPose({weapon:'carbine',handling:mode,
   yaw:0,recoil:0});
  assert.ok(fit.stock.z<(mode==='short'?7.4:7.1));
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
  assert.ok(Math.abs(l.z)<9.5&&Math.abs(r.z)<9.5);
  assert.ok(Math.abs(r.z)>Math.abs(l.z));
 }
});
