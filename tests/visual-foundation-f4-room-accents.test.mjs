import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_ARCHETYPES} from '../src/breach-archetypes.ts';
import {buildingTheme,roomFixtureFinishes,roomFloor}
 from '../src/worldgen/building-palettes.ts';
import {readFileSync} from 'node:fs';

test('F4.2 purpose accents are deterministic and preserve one building identity',()=>{
 for(const kind of BUILDING_ARCHETYPES)for(let seed=0;seed<3;seed++){
  const theme=buildingTheme(kind,seed);
  const publicFinish=roomFixtureFinishes(theme,'waiting',0);
  const serviceFinish=roomFixtureFinishes(theme,'storage',0);
  const guestFinish=roomFixtureFinishes(theme,'guest',0);
  assert.deepEqual(publicFinish,roomFixtureFinishes(theme,'waiting',0));
  assert.notEqual(publicFinish.fabric,serviceFinish.fabric,kind+':'+seed);
  assert.equal(publicFinish.wood,guestFinish.wood);
  for(const finish of [publicFinish,serviceFinish])
   assert.ok(Object.values(finish).every(hex=>Number.isInteger(hex)&&hex>=0&&hex<=0xffffff));
 }
});
test('F4.2 room floor and fixture changes are pure, bounded and render-only',()=>{
 const theme=buildingTheme('motel',0);
 assert.notEqual(roomFloor(theme,'waiting',0),roomFloor(theme,'storage',0));
 assert.notEqual(roomFixtureFinishes(theme,'waiting',0).fabric,
  roomFixtureFinishes(theme,'workshop',0).fabric);
 // One site produces a finite number of shared variants, not per-frame noise.
 const colors=new Set(Array.from({length:100},(_,i)=>
  JSON.stringify(roomFixtureFinishes(theme,'waiting',i))));
 assert.ok(colors.size<=2);
 const scene=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
 assert.match(scene,/roomFixtureFinishes\(theme,fixtureRoom\?\.purpose,fixtureRoom\?\.tone\)/);
 assert.doesNotMatch(scene,/Math\.random\(\)/);
});
