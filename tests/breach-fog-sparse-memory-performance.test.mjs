import test from 'node:test';
import assert from 'node:assert/strict';
import {microKeyAt,forEachRememberedMicroCell} from '../src/breach-fog-memory.ts';

test('sparse micro-memory painting matches full-grid discovery including bounds',()=>{
 const scenarios=[
  {minX:0,minY:0,maxX:640,maxY:740},
  {minX:-180,minY:-160,maxX:880,maxY:920},
  {minX:-73,minY:27,maxX:347,maxY:621},
  {minX:0,minY:0,maxX:1600,maxY:1850}
 ];
 let seed=17;
 const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(const bounds of scenarios){
  const seen=new Set(['fine:3,2','0,0','micro:not-a-cell',
   'micro:3, 1','micro:1,','micro:+3,1']);
  for(let i=0;i<2500;i++){
   const col=Math.floor(rng()*200)-50,row=Math.floor(rng()*200)-45;
   seen.add(microKeyAt(col,row));
  }
  const expected=[];
  for(let row=Math.floor(bounds.minY/10);row<Math.ceil(bounds.maxY/10);row++)
   for(let col=Math.floor(bounds.minX/10);col<Math.ceil(bounds.maxX/10);col++)
    if(seen.has(microKeyAt(col,row)))expected.push(col+','+row);
  const actual=[];
  const count=forEachRememberedMicroCell(seen,bounds,
    (col,row)=>actual.push(col+','+row));
  assert.equal(count,expected.length);
  assert.deepEqual(actual.sort(),expected.sort());
 }
});
