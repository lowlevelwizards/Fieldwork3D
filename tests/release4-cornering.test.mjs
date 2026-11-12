import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {canSmoothMotorCorner} from '../src/breach-motor-cornering.ts';
const at=(x,y)=>({x,y});
test('R4.3 skips a shallow redundant motor bend only after a verified full-body sweep',()=>{
 let count=0;
 const ok=()=>{count++;return true};
 assert.equal(canSmoothMotorCorner(at(0,0),at(12,1),at(32,5),true,ok),true);
 assert.equal(count,1);
 assert.equal(canSmoothMotorCorner(at(0,0),at(12,1),at(32,5),false,ok),false);
 assert.equal(canSmoothMotorCorner(at(0,0),at(12,1),at(12,30),true,ok),false);
 assert.equal(canSmoothMotorCorner(at(0,0),at(12,1),at(32,5),true,()=>false),false);
 assert.equal(canSmoothMotorCorner(at(0,0),at(40,1),at(52,2),true,ok),false);
 assert.equal(count,1,'disallowed corners never request an expensive sweep');
});
test('R4.3 authoring and actor translation stay in their original owners',()=>{
 const code=readFileSync(new URL('../src/breach-actor-motor.ts',import.meta.url),'utf8');
 assert.match(code,/canSmoothMotorCorner\(a\.p,a\.nav\[0\],a\.nav\[1\]/);
 assert.match(code,/a\.plan\[0\]\?\.kind==='move'/);
 assert.match(code,/sweptBodyClear\(from,to,s\.doors,OPERATOR_RADIUS/);
 assert.match(code,/\)\)\)\)a\.nav\.shift\(\)/);
});
