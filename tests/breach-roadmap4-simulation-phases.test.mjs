import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,stepSession} from '../src/breach-game.ts';
import {simulationPhaseMark} from '../src/breach-simulation-phases.ts';
test('phase probe is opt-in and measures only requested segments',()=>{
 const trace=[],mark=simulationPhaseMark((name,ms)=>trace.push([name,ms]));
 mark('first');mark('second');
 assert.deepEqual(trace.map(([name])=>name),['first','second']);
 assert.ok(trace.every(([,ms])=>Number.isFinite(ms)&&ms>=0));
 simulationPhaseMark()('unused');
});
test('authoritative tick retains measured ordered phase boundaries',()=>{
 const s=newSession();s.phase='running';
 const calls=[];
 stepSession(s,1/60,(name,ms)=>calls.push([name,ms]));
 assert.ok(calls.some(([name])=>name==='doors'));
 assert.ok(calls.some(([name])=>name==='aging-effects'));
 assert.ok(calls.some(([name])=>name==='fire'));
 assert.ok(calls.findIndex(([name])=>name==='doors')<
   calls.findIndex(([name])=>name==='fire'));
 assert.equal(s.seconds,1/60);
});
