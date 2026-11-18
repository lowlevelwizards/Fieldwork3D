import test from 'node:test';
import assert from 'node:assert/strict';
import {coldExactPassageWorldRoute,claimD327ColdPassage}
 from '../src/breach-d327-cold-passage.ts';
const world={passable:()=>true,walls:[],cover:[],
 bounds:{minX:100,minY:100,maxX:700,maxY:700}};
const passage={id:'OPEN-T',kind:'wide',a:{x:280,y:300},b:{x:320,y:300}};
const origin={x:300,y:240},goal={x:300,y:360};
const shutter={id:'SHUTTER',kind:'shutter',a:{x:280,y:300},
 b:{x:320,y:300},open:false,openFraction:0,locked:false,
 jammed:false,wedged:false,heldBy:null};
test('D3.27E open passage connector retains exact GO and all-swept path',()=>{
 const route=coldExactPassageWorldRoute(origin,goal,[passage],[],world);
 assert.ok(route.length>=3);
 assert.deepEqual(route.at(-1),goal);
 assert.deepEqual(coldExactPassageWorldRoute(origin,goal,[passage],[],world),route);
});
test('D3.27E closed operable shutter is future motor authority, not pre-opened',()=>{
 const doors=[{...shutter}];
 const route=coldExactPassageWorldRoute(origin,goal,[passage],doors,world);
 assert.ok(route.length>0,'only the real ordinary motor may open shutter');
 assert.equal(doors[0].open,false);
 assert.equal(doors[0].openFraction,0);
 assert.deepEqual(route.at(-1),goal);
 assert.deepEqual(coldExactPassageWorldRoute(origin,goal,[passage],
  [{...shutter,locked:true}],world),[],
  'cannot adopt route across locked leaf');
 assert.deepEqual(coldExactPassageWorldRoute(origin,goal,[passage],
  [{...shutter,jammed:true}],world),[],
  'cannot adopt route across jammed leaf');
});
test('D3.27E requires sustained real blocked MOVE, excludes entry/stack',()=>{
 const a={side:'blue',p:{x:300,y:240},plan:[{id:1,kind:'move',p:goal}],
 blockedTime:5.4,squeeze:false,traversal:null,traversalPending:null,
 doorTraversal:null,fireRetreatTarget:null};
 assert.equal(claimD327ColdPassage(a,goal,6),false);
 a.blockedTime=6;
 assert.equal(claimD327ColdPassage(a,goal,6),true);
 assert.equal(claimD327ColdPassage(a,goal,7),false);
 assert.equal(claimD327ColdPassage(a,goal,10.5),true);
 assert.equal(claimD327ColdPassage(a,goal,99),false);
 for(const field of ['entryDoorId','stackDoorId']){
  const actor={...a,plan:[{id:2,kind:'move',p:goal,[field]:'D1'}]};
  assert.equal(claimD327ColdPassage(actor,goal,12),false);
 }
});
