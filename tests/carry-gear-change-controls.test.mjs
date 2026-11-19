import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('carry selector is quote-first and confirms only an authorized change',()=>{
 const s=readFileSync(new URL('../src/ui/carry-gear-change-controls.ts',import.meta.url),'utf8');
 assert.match(s,/previewCarryGearChange\(kit,magazines,slot,candidate,inventory\)/);
 assert.match(s,/quoteCarryGearChange\(kit,magazines,slot,candidate,inventory\)/);
 assert.match(s,/select\.value=kit\.slots\[slot\]/);
 assert.match(s,/apply\.disabled=!quote\.ok/);
 assert.match(s,/options\.onApply\(chosen\)/);
 assert.match(s,/preview\.equipmentMoves/);
 assert.match(s,/preview\.itemMoves/);
 assert.match(s,/preview\.magazineMoves/);
});
