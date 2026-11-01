import test from 'node:test';import assert from 'node:assert/strict';
import {coverScore} from '../src/breach-defense-scoring.ts';
test('safe firing positions outrank obstructed or teammate-occupied pockets',()=>{
 const good={protected:true,shotClear:true,travel:50,range:80,
 allyConflict:false,nearDoor:false,approachExposed:false};
 assert.ok(coverScore(good)>coverScore({...good,shotClear:false}));
 assert.ok(coverScore(good)>coverScore({...good,allyConflict:true}));
 assert.ok(coverScore(good)>coverScore({...good,approachExposed:true}));
});
