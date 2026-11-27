import test from 'node:test';import assert from 'node:assert/strict';
import {buildTransportLabTrack} from '../src/casualty-transport-lab-track.ts';
test('CT14 fixed sample track is seek safe and uses reciprocal patient support',()=>{
 for(const mode of ['drag','carry'])for(const scenario of ['idle','straight','corner','doorway']){
  const a=buildTransportLabTrack(mode,scenario),b=buildTransportLabTrack(mode,scenario);
  assert.deepEqual(a,b);assert.ok(a.some(s=>s.stage==='pickup'));assert.ok(a.some(s=>s.stage==='release'));
  assert.ok(a.every(s=>Number.isFinite(s.carrier.x+s.patient.y+s.speed)));
  assert.ok(a.filter(s=>s.stage==='loaded').every(s=>s.pose?.mode===mode));
  assert.ok(!a.at(-1).pose);assert.equal(a.at(-1).stage,'released');
 }
});
