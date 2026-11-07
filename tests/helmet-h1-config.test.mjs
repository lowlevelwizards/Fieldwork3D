import test from 'node:test';
import assert from 'node:assert/strict';
import {readHelmetSetup,resolveHelmetSetup} from '../src/operator-helmet-setup-policy.ts';
import {helmetMountSockets} from '../src/operator-helmet-attachment-frames.ts';
test('H1 saves validate and preserve explicit choices',()=>{
 const source={rails:'not-a-rail',cover:'loose',nvg:'dual-lowered',shroud:'none'};
 const v=readHelmetSetup(source);
 assert.equal(v.rails,'none');
 assert.equal(v.cover,'loose');
 assert.equal(resolveHelmetSetup('ach',v).setup.nvg,'none');
 assert.equal(source.nvg,'dual-lowered');
});
test('legacy printed helmet implicitly gets fabric',()=>{
 assert.equal(resolveHelmetSetup('ach',undefined,{hasLegacyPrint:true}).setup.cover,'fitted');
 assert.equal(resolveHelmetSetup('ach',undefined).setup.cover,'none');
});
test('new shell sockets have correct directional signs',()=>{
 for(const id of ['ach','pasgt','high-cut','mich-2001','mich-2002','fast-sf','fast-xp-mid']){
  const s=helmetMountSockets(id);
  assert.ok(s,id);
  assert.ok(s.frontShroud.position[2]<0);
  assert.ok(s.rearCenter.position[2]>0);
  assert.equal(s.railLeft.position[0],-s.railRight.position[0]);
 }
});
