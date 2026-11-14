import test from 'node:test';
import assert from 'node:assert/strict';
import {stalledDoorYieldsToMotor} from '../src/breach-motor-door.ts';
const base={id:'D',a:{x:100,y:100},b:{x:148,y:100},
 kind:'hinged',open:true,openFraction:.61,angularVelocity:0,
 locked:false,wedged:false,heldBy:null};
test('D3.2: only genuinely stalled PARTIAL physical opening yields motor ownership',()=>{
 assert.equal(stalledDoorYieldsToMotor(base,1.2),true);
 assert.equal(stalledDoorYieldsToMotor(base,.35),false);
 assert.equal(stalledDoorYieldsToMotor({...base,angularVelocity:.4},1.2),false);
 assert.equal(stalledDoorYieldsToMotor({...base,openFraction:.8},2),false);
 assert.equal(stalledDoorYieldsToMotor({...base,openFraction:.01},2),false);
 for(const bad of [{open:false},{locked:true},{heldBy:'holder'},{wedged:true}])
  assert.equal(stalledDoorYieldsToMotor({...base,...bad},2),false);
});
test('D3.2: protected leaf only defers incidental BODY close; full sweeps remain',async()=>{
 const {readFileSync}=await import('node:fs');
 const collision=readFileSync(new URL('../src/breach-motor-collision.ts',import.meta.url),'utf8');
 assert.match(collision,/door\.id===clearingDoorId/);
 assert.match(collision,/originalDeferClosing\?\.\(door\)===true/);
 assert.match(collision,/sweptBodyClear\(a\.p,desiredMove/);
 const main=readFileSync(new URL('../src/breach-actor-motor.ts',import.meta.url),'utf8');
 assert.match(main,/door\.clearingDoorId/);
});
