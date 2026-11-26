import test from 'node:test';
import assert from 'node:assert/strict';
import {styleArchitecturalDoors} from '../src/worldgen/door-families.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
const paired=[
 {id:'PAIR-L',a:{x:52,y:0},b:{x:100,y:0},hinge:'a',kind:'hinged',
  open:false,openedAt:-1,pairedWith:'PAIR-R'},
 {id:'PAIR-R',a:{x:100,y:0},b:{x:148,y:0},hinge:'b',kind:'hinged',
  open:false,openedAt:-1,pairedWith:'PAIR-L'}
];
const walls=[{a:{x:0,y:0},b:{x:52,y:0}},{a:{x:148,y:0},b:{x:200,y:0}}];
const make=archetype=>({archetype,rooms:[],doors:paired,walls});
test('EI3 pair styles match architecture and preserve reciprocal identity',()=>{
 for(const [type,style] of [['warehouse','steel'],['utility','reinforced'],
  ['house','french'],['clinic','glazed'],['apartment','wood']]){
  const {doors}=styleArchitecturalDoors(make(type),1);
  assert.equal(doors[0].style,style);assert.equal(doors[1].style,style);
  assert.equal(doors[0].pairedWith,doors[1].id);
  assert.equal(doors[1].pairedWith,doors[0].id);
 }
});
test('EI3 double sliding panels travel apart into separate adequate pockets',()=>{
 const {doors}=styleArchitecturalDoors(make('retail'),2);
 assert.deepEqual(doors.map(d=>d.kind),['sliding','sliding']);
 assert.deepEqual(doors.map(d=>d.slideDirection),[-1,1]);
 const [left,right]=doors.map(d=>doorLeafSegment({...d,open:true,openFraction:1}));
 assert.equal(left.b.x,52);assert.equal(right.a.x,148);
 const narrow=styleArchitecturalDoors({...make('retail'),
  walls:[{a:{x:30,y:0},b:{x:52,y:0}},walls[1]]},2);
 assert.ok(narrow.doors.every(d=>d.kind==='hinged'));
});
