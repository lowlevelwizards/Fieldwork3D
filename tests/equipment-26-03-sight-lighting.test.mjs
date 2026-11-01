import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {equipmentTrainingSite} from '../src/equipment-training-range.ts';
import {actorLightingLevels,lightVisibilityGain}
 from '../src/equipment-sight-lighting.ts';

test('26.03 bright light retains baseline sight acquisition; darkness only slows it',()=>{
 assert.equal(lightVisibilityGain(1),1);
 assert.equal(lightVisibilityGain(.85),1);
 assert.ok(lightVisibilityGain(.05)<lightVisibilityGain(.3));
 assert.ok(lightVisibilityGain(0)>=.3);
 assert.ok(lightVisibilityGain(NaN)>0);
});
test('26.03 site illumination updates on mode transitions, with bounded reuse',()=>{
 const s=newSession(0,undefined,'floor-plan','standard',
  undefined,equipmentTrainingSite());
 const day=actorLightingLevels(s);
 assert.equal(actorLightingLevels(s),day);
 s.lightingMode='blackout';
 const dark=actorLightingLevels(s);
 assert.notEqual(day,dark);
 assert.ok(day.get('rook')>dark.get('rook'));
 assert.equal(actorLightingLevels(s),dark);
 s.seconds+=.14;
 assert.notEqual(actorLightingLevels(s),dark);
});
test('26.03 legacy fixed-site sessions preserve pre-lighting acquisition',()=>{
 const s=newSession();
 assert.equal(actorLightingLevels(s).size,0);
 assert.equal(lightVisibilityGain(actorLightingLevels(s).get('rook')??1),1);
});
