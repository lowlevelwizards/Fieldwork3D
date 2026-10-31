import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
test('141F: hall topologies are repeatable and keep targets reachable',()=>{
  const names=new Set();
  for(let i=0;i<20;i++){
    const seed=i*5,s=generateSite(seed);
    assert.deepEqual(generateSite(seed),s);
    names.add(s.name);
    activateSite(s);
    assert.ok(s.rooms.some(r=>r.kind==='hall'));
    assert.ok(s.roomCount>=6&&s.roomCount<=22);
    assert.ok(passable(s.objective), 'objective in clear space seed '+seed);
    assert.ok(route(s.entrance,s.objective).length,
      'all mandatory circulation accessible seed '+seed);
    assert.ok(s.enemies.every(p=>passable(p)));
  }
  assert.ok(names.size>=5,'architectural families create varied seed geometry');
  activateSite(null);
});