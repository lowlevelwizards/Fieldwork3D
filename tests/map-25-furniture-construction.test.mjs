import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/worldgen/asset-character-visuals.ts',import.meta.url),'utf8');
test('furniture supports and profiles are visibly differentiated',()=>{
 for(const x of ['mattress side piping','armrest support','slightly reclining back',
 'backrest.rotation.x','drawer pull','rear stabilizer','brace.rotation.x'])
 assert.ok(s.includes(x),x);
});
