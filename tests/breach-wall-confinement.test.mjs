import test from 'node:test';
import assert from 'node:assert/strict';
import {confinedGroundRadius,wallSafeFall,fallFreeFraction}
 from '../src/breach-ground-geometry.ts';
import {fallAngles} from '../src/breach-wounds.ts';
import {WALL_VISUAL_HEIGHT,DOOR_CLEAR_VISUAL_HEIGHT,DOOR_LEAF_VISUAL_HEIGHT}
 from '../src/breach-door-proportions.ts';

const vertical=(x,a=-70,b=70)=>({a:{x,y:a},b:{x,y:b}});
const horizontal=(y,a=-70,b=70)=>({a:{x:a,y},b:{x:b,y}});

test('blood pools cannot expand across either side of a solid wall',()=>{
 const wall=[vertical(20)];
 assert.equal(confinedGroundRadius({x:13,y:0},4,wall),2);
 assert.equal(confinedGroundRadius({x:16,y:0},4,wall),0);
 assert.equal(confinedGroundRadius({x:0,y:0},4,wall),4);
 assert.equal(confinedGroundRadius({x:22,y:0},4,wall),0);
 assert.equal(confinedGroundRadius({x:5,y:1},4,[]),4);
});

test('wall-safe fall redirects into open floor and is seek-deterministic',()=>{
 const wall=[vertical(20)];
 const origin={x:0,y:0},heading=0;
 const before=fallFreeFraction(origin,heading,'forward',wall);
 assert.ok(before<1);
 const fall=wallSafeFall(origin,heading,'forward',wall);
 assert.equal(fall.pose,'back');
 assert.equal(fall.space,1);
 assert.deepEqual(wallSafeFall(origin,heading,'forward',wall),fall);
 const boxed=[vertical(-13),vertical(13),horizontal(-13),horizontal(13)];
 const compact=wallSafeFall(origin,heading,'forward',boxed);
 assert.ok(compact.space<.5,'nearby obstacles require compact collapse');
});

test('correct fall axes, tight-space folding, and taller shared portal',()=>{
 assert.ok(fallAngles('forward',1).z< -1.4);
 assert.ok(fallAngles('back',1).z>1.4);
 assert.ok(fallAngles('left',1).x< -1.4);
 assert.ok(fallAngles('right',1).x>1.4);
 const tight=fallAngles('forward',1,0);
 assert.equal(tight.z,0);
 assert.ok(tight.y< -10);
 assert.ok(WALL_VISUAL_HEIGHT>=DOOR_CLEAR_VISUAL_HEIGHT+4);
 assert.ok(DOOR_CLEAR_VISUAL_HEIGHT>=50);
 assert.ok(DOOR_LEAF_VISUAL_HEIGHT>=DOOR_CLEAR_VISUAL_HEIGHT-3);
});
