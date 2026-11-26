import test from 'node:test';
import assert from 'node:assert/strict';
import {styleArchitecturalDoors} from '../src/worldgen/door-families.ts';
import {doorLeafSegment} from '../src/breach-core.ts';
import {primaryEntranceSpan} from '../src/worldgen/primary-entrance.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
const paired=[
 {id:'PAIR-L',a:{x:52,y:0},b:{x:100,y:0},hinge:'a',kind:'hinged',
  open:false,openedAt:-1,pairedWith:'PAIR-R'},
 {id:'PAIR-R',a:{x:100,y:0},b:{x:148,y:0},hinge:'b',kind:'hinged',
  open:false,openedAt:-1,pairedWith:'PAIR-L'}
];
const walls=[{a:{x:0,y:0},b:{x:52,y:0}},{a:{x:148,y:0},b:{x:200,y:0}}];
const make=archetype=>({archetype,expandedDoorFamilies:true,rooms:[],doors:paired,walls});
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

test('EI3 public entrance keeps a stable FRONT identity but spans both leaves',()=>{
 const doors=[{...paired[0],id:'FRONT',pairedWith:'FRONT-R'},
  {...paired[1],id:'FRONT-R',pairedWith:'FRONT'}];
 assert.deepEqual(primaryEntranceSpan(doors),{a:{x:52,y:0},b:{x:148,y:0}});
 assert.deepEqual(primaryEntranceSpan([doors[0]]),{a:doors[0].a,b:doors[0].b});
 assert.equal(primaryEntranceSpan(undefined),undefined);
});

test('EI8 all scales may use full 48-unit public entrance leaves',()=>{
 const counts=new Map();
 for(const kind of ['retail','clinic','office','restaurant','motel'])for(const seed of [0,2,3,5,6,8,9,11,12,14])for(const scale of ['small','standard','medium','expanded','large']){
   const site=compileArchitecturalSite(kind,seed,scale);
   const front=site.doors.find(d=>d.id==='FRONT');
   if(!front?.pairedWith)continue;
   counts.set(scale,(counts.get(scale)??0)+1);
   const span=primaryEntranceSpan(site.doors);
   assert.ok(Math.abs(Math.hypot(span.b.x-span.a.x,span.b.y-span.a.y)-96)<1e-6);
   assert.ok(site.doors.filter(d=>d.id==='FRONT'||d.id===front.pairedWith).every(d=>Math.abs(Math.hypot(d.b.x-d.a.x,d.b.y-d.a.y)-48)<1e-6));
 }
 assert.ok(counts.get('large')>0);
 assert.ok([...counts.keys()].some(scale=>scale!=='large'),'eligible non-large sites must actually generate pairs');
});
