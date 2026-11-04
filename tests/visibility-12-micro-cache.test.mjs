import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MICRO_COLS,MICRO_ROWS,MICRO_KEYS,microKeyAt}
 from '../src/breach-fog-memory.ts';

test('in-bounds fog memory uses stable cached keys',()=>{
 for(const [col,row] of [[0,0],[63,0],[0,1],[63,73]]){
   assert.equal(microKeyAt(col,row),MICRO_KEYS[row*MICRO_COLS+col]);
 }
});
test('expanded and negative world cells never alias a valid cached cell',()=>{
 assert.equal(microKeyAt(MICRO_COLS,0),'micro:64,0');
 assert.equal(microKeyAt(-1,1),'micro:-1,1');
 assert.equal(microKeyAt(0,MICRO_ROWS),'micro:0,74');
 assert.equal(microKeyAt(0,-1),'micro:0,-1');
 assert.notEqual(microKeyAt(MICRO_COLS,0),microKeyAt(0,1));
 assert.notEqual(microKeyAt(-1,1),microKeyAt(63,0));
});
test('the real fog painter resolves each cell by its own world coordinates',()=>{
 const code=readFileSync(new URL('../src/breach-fog-mask.ts',import.meta.url),'utf8');
 assert.match(code,/s\.seenGround\.has\(microKeyAt\(col,row\)\)/);
 assert.doesNotMatch(code,/MICRO_KEYS\[row\*MICRO_COLS\+col\]/);
 const motor=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.match(motor,/s\.seenGround\.add\(microKeyAt\(col,row\)\)/,
   'the motor must record exactly the same cell that fog draws');
 assert.doesNotMatch(motor,/MICRO_KEYS\[row\*MICRO_COLS\+col\]/);
});
