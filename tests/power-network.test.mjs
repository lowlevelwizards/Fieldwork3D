import test from 'node:test';
import assert from 'node:assert/strict';
import {PowerNetwork,nextNetworkFault,faultStation} from '../src/systems/power-network.ts';

test('all six service faults originate at different positions in the network',()=>{
 assert.deepEqual(Array.from({length:6},(_,i)=>nextNetworkFault(i)),
 ['generator','feeder','junction','fuse','terminal','contactor']);
 assert.equal(faultStation('feeder'),'switchgear');
 assert.equal(faultStation('contactor'),'relay');
});
test('real upstream continuity determines all downstream voltage',()=>{
 const n=new PowerNetwork('fuse',1);
 assert.equal(n.voltageAt('generator'),120);
 assert.equal(n.voltageAt('switchgear'),120);
 assert.equal(n.voltageAt('relay'),120);
 assert.equal(n.voltageAt('junction'),0);
 assert.equal(n.mastOnline,false);
 n.isolate();
 assert.equal(n.voltageAt('relay'),0);
 assert.equal(n.repair(false),false);
 assert.equal(n.repair(true),true);
 assert.equal(n.mastOnline,false);
 assert.equal(n.reenergize(),true);
 assert.equal(n.voltageAt('mast'),120);
 assert.equal(n.test(),'online');
});
test('generator outage removes all power and generator repair propagates it',()=>{
 const n=new PowerNetwork('generator');
 assert.equal(n.energized.size,0);
 assert.equal(n.inspection('generator').voltage,0);
 assert.equal(n.repair(false),true);
 assert.equal(n.mastOnline,true);
});
test('open feeder preserves source voltage and isolates downstream',()=>{
 const n=new PowerNetwork('feeder');
 assert.equal(n.voltageAt('switchgear'),120);
 assert.equal(n.voltageAt('relay'),0);
 n.isolate();
 assert.equal(n.repair(true),true);
 n.reenergize();
 assert.equal(n.voltageAt('mast'),120);
});
test('unrepaired short retrips protection, repaired short permits re-energization',()=>{
 const n=new PowerNetwork('junction');
 assert.equal(n.breakerTripped,true);
 assert.equal(n.mastOnline,false);
 assert.equal(n.reenergize(),false);
 assert.ok(n.transientArc>0);
 assert.equal(n.repair(true),true);
 assert.equal(n.reenergize(),true);
 assert.equal(n.breakerTripped,false);
 assert.equal(n.mastOnline,true);
});
test('terminal condition causes one conditional secondary trip, not scripted forever',()=>{
 const n=new PowerNetwork('terminal',4);
 assert.ok(n.oxidation>0.7);
 n.isolate(); n.repair(true); n.reenergize();
 assert.equal(n.test(),'trip');
 assert.equal(n.mastOnline,false);
 assert.equal(n.repaired,false);
 n.isolate(); n.repair(true); n.reenergize();
 assert.equal(n.test(),'online');
 n.tick(1);
 assert.equal(n.transientArc,0);
});
test('a safe breaker isolation affects physically connected lights and loads',()=>{
 const n=new PowerNetwork('generator');
 n.repair(false);
 assert.equal(n.mastOnline,true);
 n.isolate();
 assert.equal(n.voltageAt('switchgear'),0);
 assert.equal(n.voltageAt('relay'),0);
 assert.equal(n.voltageAt('mast'),0);
});
