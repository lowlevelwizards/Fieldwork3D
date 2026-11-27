import test from 'node:test';import assert from 'node:assert/strict';
import {isTransportRelease,transportOrderAllowed,pairInExtraction} from '../src/breach-transport-gameplay.ts';
import {newSession} from '../src/breach-game.ts';
import {commitTransportExtractions} from '../src/breach-operation-outcomes.ts';
test('CT13 occupied hands permit movement and release but not treatment or weapon actions',()=>{
 const release={kind:'interact',interaction:'release-capture-target',objectId:'b'};
 assert.equal(isTransportRelease(release,'b'),true);
 assert.equal(isTransportRelease(release,'c'),false);
 for(const kind of ['move','wait','holdClear','look','sync'])assert.equal(transportOrderAllowed({kind},'b',[]),true);
 for(const kind of ['treat','recover-medical','reload','flash','switch-weapon','tool','pie'])assert.equal(transportOrderAllowed({kind},'b',[]),false);
 assert.equal(transportOrderAllowed({kind:'door',doorId:'d',method:'open'},'b',[{id:'d',operatingMode:'automatic'}]),true);
 assert.equal(transportOrderAllowed({kind:'door',doorId:'d',method:'open'},'b',[{id:'d',open:false}]),false);
});
test('CT13 both actual positions must enter extraction; legacy custody is archived once',()=>{
 const s=newSession(),[carrier,patient]=s.operators;
 s.phase='running';carrier.health=4;carrier.carryingId=patient.id;carrier.transportLatched=false;
 patient.health=0;patient.carriedById=carrier.id;patient.transportMode='drag';patient.deathAt=null;
 carrier.p={...s.scenario.extract};patient.p={x:carrier.p.x+50,y:carrier.p.y};
 assert.equal(pairInExtraction(carrier.p,patient.p,s.scenario.extract,37),false);
 assert.equal(commitTransportExtractions(s).length,0);
 patient.p={x:carrier.p.x+20,y:carrier.p.y};
 assert.equal(commitTransportExtractions(s).length,1);
 assert.equal(carrier.carryingId,null);
 assert.equal(commitTransportExtractions(s).length,0);
 assert.equal(s.extractedOperators.filter(p=>p.id===patient.id).length,1);
});
