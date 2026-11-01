import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
test('QA room labels associate warning doors through actual door geometry',()=>{
 assert.match(text,/site\.doors\.find\(door=>door\.id===issue\.doorId\)/);
 assert.match(text,/x>=room\.x-1&&x<=room\.x\+room\.w\+1/);
 assert.doesNotMatch(text,/d\.roomId===room\.id/);
});
