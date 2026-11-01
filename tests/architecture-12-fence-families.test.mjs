import test from 'node:test';
import assert from 'node:assert/strict';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {generateSite} from '../src/breach-site.ts';
test('perimeter fence families share physical span but retain different cover and visibility meaning',()=>{
 const chain=propDefinition('chain-link-fence');
 const iron=propDefinition('iron-fence');
 const privacy=propDefinition('privacy-fence');
 assert.ok(chain&&iron&&privacy);
 assert.deepEqual([chain.width,chain.depth],[iron.width,iron.depth]);
 assert.deepEqual([chain.width,chain.depth],[privacy.width,privacy.depth]);
});
test('seeded property fencing uses context-specific material and matching gate',()=>{
 let seen=new Set();
 for(let seed=1;seed<=150;seed++){
  const site=generateSite(seed);
  const gate=site.doors.find(d=>d.id==='PROPERTY-GATE');
  if(!gate)continue;
  const fixture=site.archetype==='warehouse'?'chain-link-fence':
     site.archetype==='utility'||site.archetype==='townhouse'?'iron-fence':'privacy-fence';
  seen.add(fixture);
  assert.equal(site.cover.filter(c=>c.fixture===fixture).length,2);
  assert.equal(gate.style,fixture==='privacy-fence'?'wood':'mesh-gate');
 }
 assert.ok(seen.size>=2,'different property programs should show distinct fences');
});
