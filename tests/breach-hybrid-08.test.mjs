import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LabDistanceMotionCache,LabHistoricalMotionCache}
  from '../src/breach-lab-tracks.ts';
test('side-by-side references share an identical root timeline',()=>{
 const a=new LabHistoricalMotionCache('strafe-reverse');
 const b=new LabDistanceMotionCache('strafe-reverse');
 for(const time of [0,.4,1.2,1.9,2.5,3.8])
  assert.deepEqual(a.sample(time).motion,b.sample(time).motion);
});
test('lab exposes synchronized gait pair without replacing pose six',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const ts=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(html,/id="compareGaits"/);
 assert.match(html,/id="comparePose"/);
 assert.match(ts,/historicalGait!\.sample\(clock\)/);
 assert.match(ts,/hybridGait!\.sample\(clock\)/);
});