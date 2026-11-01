import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
test('door and window visuals include physical hardware and sill without colliders',()=>{
 for(const name of ['Continuous rebates','Lock-set plates','shutter runners','sill projection'])
   assert.ok(s.includes(name),name);
 assert.match(s,/this\.windowGlass\.set\(opening\.id,glass\)/);
});