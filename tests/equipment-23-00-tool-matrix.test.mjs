import test from 'node:test';import assert from 'node:assert/strict';
import {entryToolVerdict} from '../src/breach-entry-tools.ts';
const door=(style,kind='hinged')=>({id:'T',a:{x:0,y:0},b:{x:0,y:40},open:false,openedAt:0,style,kind});
test('23.00 cut requires a physical gate or mesh fastener',()=>{
 assert.equal(entryToolVerdict(door('wood'),'cut').allowed,false);
 assert.equal(entryToolVerdict(door('mesh-gate'),'cut').allowed,true);
 assert.equal(entryToolVerdict(door('screen'),'cut').allowed,true);
});
test('23.00 sliders and shutters cannot be levered or wedged as a hinge',()=>{
 for(const kind of ['sliding','shutter']){
  assert.equal(entryToolVerdict(door('steel',kind),'pry').allowed,false);
  assert.equal(entryToolVerdict(door('steel',kind),'wedge').allowed,false);
 }
});
test('23.00 wedge constrains door interactions and can be removed',()=>{
 let d=door('wood');assert.equal(entryToolVerdict(d,'wedge').allowed,true);
 d={...d,wedged:true};
 assert.equal(entryToolVerdict(d,'wedge').allowed,false);
 assert.equal(entryToolVerdict(d,'pry').allowed,false);
 assert.equal(entryToolVerdict(d,'unwedge').allowed,true);
 assert.equal(entryToolVerdict({...d,wedged:false},'unwedge').allowed,false);
});
test('23.00 reinforced doors have slower and louder forced entry',()=>{
 const wood=entryToolVerdict(door('wood'),'pry');
 const steel=entryToolVerdict(door('reinforced'),'pry');
 assert.ok(steel.seconds>wood.seconds);
 assert.ok(steel.noise>wood.noise);
 assert.equal(entryToolVerdict({...door('wood'),open:true},'breach').allowed,false);
});
