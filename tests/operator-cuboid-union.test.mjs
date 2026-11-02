import test from 'node:test';
import assert from 'node:assert/strict';
import {unionCuboids} from '../src/operator-cuboid-union.ts';
test('overlapping boxes become a single six-sided rectangular solid',()=>{
 const g=unionCuboids([
  {name:'a',x:0,y:0,z:0,width:4,height:3,depth:3},
  {name:'b',x:2,y:0,z:0,width:4,height:3,depth:3}
 ]);
 assert.equal(g.userData.exteriorQuads,6);
 assert.equal(g.index.count,36);
 for(const n of g.getAttribute('position').array)assert.ok(Number.isFinite(n));
 const normal=g.getAttribute('normal');
 for(let i=0;i<normal.count;i++){
  const v=[normal.getX(i),normal.getY(i),normal.getZ(i)];
  assert.ok(v.filter(a=>Math.abs(a)>1-1e-6).length===1);
 }
});
test('invalid/empty cuboid volumes cannot be rendered',()=>{
 assert.throws(()=>unionCuboids([]));
 assert.throws(()=>unionCuboids([{name:'bad',x:0,y:0,z:0,
  width:0,height:3,depth:2}]));
});
