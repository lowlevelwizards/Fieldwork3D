import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies,toggling,stepSession,knownAt}
  from '../src/breach-game.ts';
import {readFileSync} from 'node:fs';
import {activateSite} from '../src/breach-core.ts';
test('144C: a slow pie builds dense fine-grain explored memory',()=>{
  const s=newSession(),a=team(s)[0];
  enemies(s).forEach(e=>e.health=0);
  a.p={x:310,y:605};a.heading=-Math.PI/2;
  toggling(s);
  for(let i=0;i<45;i++)stepSession(s,1/60);
  const fine=[...s.seenGround].filter(x=>x.startsWith('fine:'));
  assert.ok(fine.length>35,'should record a fine visible footprint');
  assert.ok(knownAt(s,310,585),'existing coarse intel remains available');
  activateSite(null);
});
test('144C: renderer consumes fine footprints, not coarse square tiles',()=>{
  const mask=readFileSync(new URL('../src/breach-fog-mask.ts',import.meta.url),'utf8');
  assert.match(mask,/row<37/);
  assert.match(mask,/col<32/);
  assert.match(mask,/s\.seenGround\.has\('fine:'/);
  assert.match(mask,/fillRect\(col\*20,row\*20,20,20\)/);
});