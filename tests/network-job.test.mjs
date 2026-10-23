import test from 'node:test';
import assert from 'node:assert/strict';
import {NetworkJob} from '../src/fieldwork/network-job.ts';

test('unobserved fault is not diagnosed by remote readings alone',()=>{
 const j=new NetworkJob(1);
 assert.equal(j.phase,'searching');
 const gen=j.inspect('generator');
 assert.equal(gen.newDiagnosis,false);
 assert.equal(j.phase,'searching');
 const relay=j.inspect('relay');
 assert.equal(relay.observation.voltage,0);
 assert.equal(j.phase,'searching');
 assert.equal(j.inspect('switchgear').newDiagnosis,true);
 assert.equal(j.phase,'diagnosed');
});
test('repairs need actual hardware, isolation, proximity and sustained contact',()=>{
 const j=new NetworkJob(1);j.inspect('switchgear');
 assert.equal(j.begin(false,false),false);
 assert.equal(j.begin(true,false),false);
 assert.equal(j.begin(true,true),true);
 j.release();
 for(let i=0;i<30;i++)j.update(.05,true,true,true);
 assert.equal(j.phase,'working');
 j.begin(true,true);
 for(let i=0;i<70;i++)j.update(.05,true,true,true);
 assert.equal(j.phase,'prepared');
 assert.equal(j.network.mastOnline,false);
 assert.equal(j.test(),null);
 j.network.reenergize();
 assert.equal(j.test(),'complete');
});
test('generator repair changes power at every downstream load',()=>{
 const j=new NetworkJob(0);j.inspect('generator');
 assert.equal(j.begin(true,false),true);
 for(let i=0;i<75;i++)j.update(.05,true,true,false);
 assert.equal(j.phase,'prepared');
 assert.equal(j.network.mastOnline,true);
 assert.equal(j.test(),'complete');
});
test('short and terminal faults require distinct operations and re-energization',()=>{
 const short=new NetworkJob(2);short.inspect('junction');
 assert.equal(short.begin(true,true),true);
 for(let i=0;i<80;i++)short.update(.05,true,true,true);
 assert.equal(short.phase,'prepared');
 assert.equal(short.network.breakerTripped,true);
 assert.equal(short.network.reenergize(),true);
 assert.equal(short.test(),'complete');

 const oxidized=new NetworkJob(4);oxidized.inspect('relay');
 oxidized.network.isolate();
 oxidized.begin(true,true);
 for(let i=0;i<70;i++)oxidized.update(.05,true,true,true);
 oxidized.network.reenergize();
 assert.equal(oxidized.test(),'trip');
 assert.equal(oxidized.phase,'secondary');
 assert.equal(oxidized.begin(false,true),true);
 for(let i=0;i<60;i++)oxidized.update(.05,true,false,true);
 assert.equal(oxidized.phase,'prepared');
 oxidized.network.reenergize();
 assert.equal(oxidized.test(),'complete');
});
test('deferred jobs never energize an unrepaired load',()=>{
 const j=new NetworkJob(3);j.inspect('relay');j.defer();
 assert.equal(j.phase,'deferred');
 assert.equal(j.begin(true,true),false);
 assert.equal(j.network.mastOnline,false);
});
