import test from 'node:test';
import assert from 'node:assert/strict';
import {weaponTruth,footTruth,wrappedAngle} from '../src/breach-animation-diagnostics.ts';
import {readFileSync} from 'node:fs';
test('170: wrap-around and sideways firearm mismatches measured without pose changes',()=>{
 assert.ok(Math.abs(wrappedAngle(Math.PI-.01,-Math.PI+.01))<.03);
 const aligned=weaponTruth(0,0,0);
 assert.equal(aligned.aligned,true);
 assert.equal(aligned.shotErrorDeg,0);
 const sideways=weaponTruth(Math.PI/2,0,0);
 assert.ok(sideways.aimErrorDeg>89);
 assert.equal(sideways.aligned,false);
});
test('170: planted and rendered foot truth is always reported independently',()=>{
 const make=(x,rendered)=>({requested:{x,y:0},rendered:{x:rendered,y:0},phase:'planted',contact:true,reachError:0});
 const [a,b]=footTruth(make(3,3),make(4,7));
 assert.equal(a.offset,0);
 assert.equal(b.offset,3);
});
test('170: diagnostics surfaced in lab without changing gameplay state',()=>{
 const s=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(s,/weaponTruth\(/);
 assert.match(s,/footTruth\(/);
 assert.match(s,/BARREL /);
 assert.match(s,/FOOT TRUTH /);
});