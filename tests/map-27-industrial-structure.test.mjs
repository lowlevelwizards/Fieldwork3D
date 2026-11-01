import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/worldgen/asset-character-visuals.ts',import.meta.url),'utf8');
test('industrial racks carry discrete shelves with negative space',()=>{
 assert.ok(s.includes('Open racking shows negative space'));
 assert.ok(s.includes('purposeful partly empty bays'));
 assert.ok(s.includes('shelf lip'));
 assert.ok(s.includes('bolted tank cradle'));
 assert.ok(s.includes('exhaust guard'));
});