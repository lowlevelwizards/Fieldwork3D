import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseLeafStage,leafStageStride,threatenedByOpeningLeaf,
 MAX_PASSAGE_STAGE_TRAVEL} from '../src/breach-passage-leaf-stage.ts';
const p=(x,y)=>({x,y});
const door={id:'D',a:p(80,100),b:p(120,100),hinge:'a',
 swing:-1,kind:'hinged',open:true,openFraction:0};
test('Q4 staging is only for a genuinely threatening hinged sweep',()=>{
 const here=[p(100,115),p(95,121),p(105,127)]
  .find(p=>threatenedByOpeningLeaf(door,p,1));
 assert.ok(here);
 assert.equal(threatenedByOpeningLeaf({...door,kind:'sliding'},here,1),false);
 assert.equal(threatenedByOpeningLeaf({...door,openFraction:1},here,1),false);
});
test('Q4 physical sweep, distance budget and occupied anchor',()=>{
 const here=[p(100,115),p(95,121),p(105,127)]
  .find(p=>threatenedByOpeningLeaf(door,p,1));
 assert.ok(here);
 assert.equal(chooseLeafStage(door,here,1,()=>false,[]),null);
 const stage=chooseLeafStage(door,here,1,()=>true,[]);
 assert.ok(stage);
 const length=Math.hypot(stage.x-here.x,stage.y-here.y);
 assert.ok(length<=MAX_PASSAGE_STAGE_TRAVEL);
 assert.equal(threatenedByOpeningLeaf(door,stage,1),false);
 const occupied=chooseLeafStage(door,here,1,()=>true,[stage]);
 assert.ok(!occupied||Math.hypot(occupied.x-stage.x,
  occupied.y-stage.y)>=20);
 const bounded=leafStageStride(here,stage,.65);
 assert.ok(Math.hypot(bounded.x-here.x,bounded.y-here.y)<=.651);
});
test('Q4 completed stage never moves again',()=>{
 const p0=p(100,120);
 assert.deepEqual(leafStageStride(p0,p0,1),p0);
});
