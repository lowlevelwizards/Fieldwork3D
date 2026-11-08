import test from 'node:test';
import assert from 'node:assert/strict';
import {requestedMiniatureFocus,miniatureFocusDecision}
  from '../src/rendering/miniature-focus-config.ts';
import {miniatureProtectedRect,miniatureRegionFullyProtected,
  miniatureFocusEligibility} from '../src/rendering/miniature-focus-mask.ts';
const decision=(patch={})=>miniatureFocusDecision({mode:'subtle',
  view:'tactical',quality:'balanced',protectedRegionValid:true,
  capable:true,gesturesActive:false,...patch});
test('opt-in parsing fails closed',()=>{
 assert.equal(requestedMiniatureFocus(null),'off');
 assert.equal(requestedMiniatureFocus('cinematic'),'off');
 assert.equal(requestedMiniatureFocus('subtle'),'subtle');
 assert.equal(requestedMiniatureFocus('replay'),'replay');
});
test('all unsafe views and performance preset bypass the pass',()=>{
 for(const view of ['top','floor-plan','bodycam'])
   assert.equal(decision({view}).active,false,view);
 for(const patch of [{quality:'performance'},{gesturesActive:true},
   {capable:false},{protectedRegionValid:false},
   {mode:'replay',view:'tactical'}])
   assert.equal(decision(patch).active,false,JSON.stringify(patch));
 assert.equal(decision({view:'director'}).radiusPx,2);
 assert.equal(decision({mode:'replay',view:'director'}).active,true);
});
test('conservative rectangle clips to viewport and rejects broken projection',()=>{
 assert.deepEqual(miniatureProtectedRect([{x:25,y:40},{x:80,y:60}],
   100,100,24),{left:1,top:16,right:100,bottom:84});
 assert.equal(miniatureProtectedRect([{x:NaN,y:2}],100,100),null);
 assert.equal(miniatureProtectedRect([],100,100),null);
 assert.equal(miniatureRegionFullyProtected({left:0,top:0,right:100,bottom:100},100,100),true);
});
test('protected pixels stay completely sharp; exposed corners can soften',()=>{
 const rect={left:30,top:30,right:70,bottom:70};
 assert.equal(miniatureFocusEligibility(50,50,100,100,rect),0);
 assert.equal(miniatureFocusEligibility(32,32,100,100,rect),0);
 assert.ok(miniatureFocusEligibility(0,0,100,100,rect)>0);
 assert.equal(miniatureFocusEligibility(50,50,100,100,
   {left:0,top:0,right:100,bottom:100}),0);
});
