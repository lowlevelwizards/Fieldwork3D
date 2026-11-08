import test from 'node:test';
import assert from 'node:assert/strict';
import {stackApproachPositions} from '../src/breach-entry-coordination.ts';

const point=(x,y)=>({x,y});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('Phase A1: normal axis-aligned stacks keep existing familiar slot positions',()=>{
 const horizontal={id:'H',a:point(200,300),b:point(248,300)};
 assert.deepEqual(stackApproachPositions(horizontal,point(224,345)),[
  point(186,319),point(262,319),point(212,319),point(236,319)]);
 const vertical={id:'V',a:point(300,200),b:point(300,248)};
 assert.deepEqual(stackApproachPositions(vertical,point(345,224)),[
  point(319,186),point(319,262),point(319,212),point(319,236)]);
});

test('Phase A1: diagonal and reversed door ends preserve the physical approach side',()=>{
 const door={id:'D',a:point(200,200),b:point(248,248)};
 const center=point(224,224),normal=point(-Math.SQRT1_2,Math.SQRT1_2);
 const from=point(center.x+normal.x*65,center.y+normal.y*65);
 const slots=stackApproachPositions(door,from);
 assert.equal(slots.length,4);
 for(const p of slots){
  const signed=(p.x-center.x)*normal.x+(p.y-center.y)*normal.y;
  assert.ok(Math.abs(signed-19)<.00001,'stack remains 19 units on the approach side');
  assert.ok(distance(p,center)<44,'candidate remains within door interaction reach envelope');
 }
 const reversed=stackApproachPositions({...door,a:door.b,b:door.a},from);
 assert.deepEqual(reversed,[slots[1],slots[0],slots[3],slots[2]],
  'reversing the endpoints changes preferred flank order, never the physical side');
});

test('Phase A1: invalid zero-length door cannot fabricate stack positions',()=>{
 assert.deepEqual(stackApproachPositions({id:'X',a:point(1,2),b:point(1,2)},point(4,5)),[]);
});
