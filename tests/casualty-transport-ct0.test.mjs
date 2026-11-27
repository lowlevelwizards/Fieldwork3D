import test from 'node:test';import assert from 'node:assert/strict';
import {observeTransport} from '../src/breach-transport-diagnostics.ts';
import {proposedCivilianTransportStep} from '../src/breach-civilian-transport.ts';
test('CT0 diagnostics distinguish stationary body drift from reciprocal movement',()=>{
 const carrier={id:'a',health:4,p:{x:0,y:0},carryingId:'b'};
 const body={id:'b',health:0,p:{x:-20,y:0},carriedById:'a',transportMode:'drag'};
 const next=proposedCivilianTransportStep(body.p,carrier.p,carrier.p,0,'drag',()=>true,[],.6);
 const obs=observeTransport(carrier,{...body,p:next},{carrier:carrier.p,body:body.p});
 assert.equal(obs.reciprocal,true);assert.equal(obs.eligible,true);
 assert.ok(obs.stationaryDrift>0); // documents baseline, not desired behavior
 assert.equal(observeTransport(carrier,{...body,carriedById:'c'}).reciprocal,false);
});
