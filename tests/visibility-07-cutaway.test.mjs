import test from 'node:test';
import assert from 'node:assert/strict';
import {wallOccludesFriendly,transitionWallOpacity}
 from '../src/breach-camera-occlusion.ts';
const p={x:0,y:0},camera={x:1,y:0};
const wall=(x,y0=-20,y1=20)=>({a:{x,y:y0},b:{x,y:y1}});
test('VIS-07 only obstructing walls fade',()=>{
 assert.equal(wallOccludesFriendly(wall(40),p,camera,90),true);
 assert.equal(wallOccludesFriendly(wall(-40),p,camera,90),false);
 assert.equal(wallOccludesFriendly(wall(150),p,camera,90),false);
 assert.equal(wallOccludesFriendly(wall(40,40,60),p,camera,90),false);
 assert.equal(wallOccludesFriendly(wall(-40),p,{x:-1,y:0},90),true);
});
test('VIS-07 cutaways ease in and out',()=>{
 const x=transitionWallOpacity(1,true,1/60);
 assert.ok(x<1&&x>.38);
 assert.ok(transitionWallOpacity(x,true,1/60)<x);
 assert.ok(transitionWallOpacity(.38,false,1/60)>.38);
 assert.equal(transitionWallOpacity(.38,true,1),.38);
});
