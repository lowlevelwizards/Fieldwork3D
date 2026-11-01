import test from 'node:test';
import assert from 'node:assert/strict';
import {synthesizeFootprint} from '../src/worldgen/footprint-synthesis.ts';
import {blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {generateSite} from '../src/breach-site.ts';

test('real footprint synthesis moves functional space into a void and changes exterior outline',()=>{
 const source={kind:'garage',family:'custom garage',widths:[190,68,144],
  depths:[130,130,100],front:{col:1,row:2},cells:[
   ['bay','aisle','workshop'],['bay','aisle',null],['waiting','reception','office']]};
 const next=synthesizeFootprint(source,0);
 assert.notEqual(next,source,'expected at least one structural relocation');
 assert.deepEqual(next.cells.flat().slice().sort(),source.cells.flat().slice().sort());
 assert.deepEqual(next.front,source.front);
 assert.deepEqual(next.widths,source.widths);
 assert.deepEqual(next.depths,source.depths);
 assert.equal(next.cells[2][1],'reception');
 assert.equal(next.cells.flat().filter(x=>x===null).length,1);
 assert.equal(blueprintIssues(next).length,0);
 assert.deepEqual(synthesizeFootprint(source,0),next);
});
test('private residential unit boundaries and guest suites never relocate',()=>{
 const base={kind:'apartment',family:'unit',widths:[120,120],
  depths:[120,120],front:{col:0,row:1},
  cells:[['bedroom','bathroom'],['living',null]]};
 assert.strictEqual(synthesizeFootprint(base,12),base);
 const hotel={...base,kind:'motel'};
 assert.strictEqual(synthesizeFootprint(hotel,12),hotel);
 const owned={...base,kind:'retail',unitIds:[['U','U'],['U',null]]};
 assert.strictEqual(synthesizeFootprint(owned,12),owned);
});
test('synthesized layouts still create actual playable doors and deterministic rooms',()=>{
 for(const seed of [3,6,15,27]){
  const site=generateSite(seed,'medium');
  assert.ok(site.rooms.length>=3);
  assert.ok(site.doors.some(d=>d.id==='FRONT'));
  assert.deepEqual(generateSite(seed,'medium').rooms,site.rooms);
 }
});
