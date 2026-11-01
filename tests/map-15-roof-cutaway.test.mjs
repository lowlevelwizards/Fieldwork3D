import test from 'node:test';
import assert from 'node:assert/strict';
import {roofShouldShow} from '../src/worldgen/roof-cutaways.ts';
import {readFileSync} from 'node:fs';
test('MAP 15 roofs cannot reveal unknown or cover occupied rooms',()=>{
 assert.equal(roofShouldShow(true,true,false),false);
 assert.equal(roofShouldShow(false,false,false),false);
 assert.equal(roofShouldShow(false,true,true),false);
 assert.equal(roofShouldShow(false,true,false),true);
 const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.ok(source.includes('roofGroups.clear()'));
 assert.ok(source.includes('roomKnown(s.intel,id),occupiedRoomIds.has(id)'));
});
