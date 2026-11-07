import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHelmetSetup,readHelmetSetup} from '../src/operator-helmet-setup-policy.ts';
import {helmetMountSockets} from '../src/operator-helmet-attachment-frames.ts';
test('H1 hardware mounts only on compatible shells',()=>{
 assert.equal(resolveHelmetSetup('mich-2001',{rails:'arc'}).setup.rails,'none');
 assert.equal(resolveHelmetSetup('fast-sf',{rails:'arc'}).setup.rails,'arc');
 assert.equal(resolveHelmetSetup('fast-xp-mid',{rails:'powerpath'}).setup.rails,'powerpath');
});
test('H1 missing shroud suppresses NVG without changing preference',()=>{
 const w=readHelmetSetup({nvg:'dual-lowered',shroud:'none'});
 assert.equal(resolveHelmetSetup('fast-sf',w).setup.nvg,'none');
 assert.equal(w.nvg,'dual-lowered');
 assert.ok(helmetMountSockets('fast-sf')?.lightRight.position[0]>0);
});
