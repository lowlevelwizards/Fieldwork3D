import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSnapshot,interpolatedActor,lerpAngle}
  from '../src/breach-frame-interpolation.ts';
import {readFileSync} from 'node:fs';
const actor=(heading,x)=>({id:'rook',p:{x,y:0},heading,weaponYaw:heading});
test('173: 60 Hz pose interpolates continuously across 180-degree wrap',()=>{
 const prev=actor(Math.PI-.08,0),now=actor(-Math.PI+.08,4);
 const frame={previous:renderSnapshot([prev]),alpha:.5};
 const middle=interpolatedActor(now,frame);
 assert.equal(middle.x,2);
 assert.ok(Math.abs(middle.heading-Math.PI)<.01);
 assert.ok(Math.abs(lerpAngle(3.1,-3.1,.5)-Math.PI)<.01);
 assert.deepEqual(now.p,{x:4,y:0});
 assert.deepEqual(interpolatedActor(now,{...frame,alpha:0}),{
   x:0,z:0,heading:prev.heading,weaponYaw:prev.weaponYaw});
 assert.equal(interpolatedActor(now,{...frame,alpha:1}).x,4);
});
test('173: render never advances simulation or adds another foot-placement writer',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(main,/previousRenderActors=renderSnapshot\(state\.operators\)/);
 assert.match(scene,/interpolatedActor\(actor,renderFrame\)/);
 assert.match(scene,/shotHeading:drawActor.weaponYaw/);
});
