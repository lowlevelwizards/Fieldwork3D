import test from 'node:test';import assert from 'node:assert/strict';
import {loadedMotorSample,LOADED_MOTION} from '../src/breach-transport-weight.ts';
test('CT11 weight caps run, limits acceleration and softens turns without a second motor',()=>{
 const step=(mode,v,turn=0)=>loadedMotorSample(mode,100,53,v,1/60,turn);
 assert.ok(step('carry',0).velocity<step('drag',0).velocity);
 assert.ok(step('carry',100).velocity<=53*LOADED_MOTION.carry.speedScale);
 assert.ok(step('drag',20,Math.PI).target<step('drag',20).target);
 assert.ok(step('drag',20,Math.PI).velocity<20);
 let v=0;for(let i=0;i<600;i++)v=step('drag',v).velocity;
 assert.ok(Math.abs(v-53*.48)<.01);
});
