import test from 'node:test';
import assert from 'node:assert/strict';
import {wallOccludesFriendly,transitionWallOpacity}
  from '../src/breach-camera-occlusion.ts';
const front={a:{x:90,y:0},b:{x:90,y:100}};
const side={a:{x:0,y:160},b:{x:100,y:160}};
test('cutaway only selects architecture obstructing friendly view corridor',()=>{
 const actor={x:60,y:50};
 assert.equal(wallOccludesFriendly(front,actor,{x:1,y:0},80),true);
 assert.equal(wallOccludesFriendly(side,actor,{x:1,y:0},80),false);
});
test('cutaway fades smoothly and restores instead of global transparency',()=>{
 const blocked=transitionWallOpacity(1,true,.5,.19);
 assert.ok(blocked>=.18&&blocked<.22);
 assert.equal(transitionWallOpacity(1,false,.5,.19),1);
 const recovered=transitionWallOpacity(blocked,false,.5,.19);
 assert.ok(recovered>.96);
 assert.ok(transitionWallOpacity(1,true,.5,.38)>.36);
});
