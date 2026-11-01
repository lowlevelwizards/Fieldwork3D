import test from 'node:test';import assert from 'node:assert/strict';
import {newAwareness,addObservation,visibleObservation,ageAwareness,clearObservedPosition,bestBelief} from '../src/breach-awareness.ts';
test('contact estimates age without leaking the moving subject position',()=>{
 const m=newAwareness();addObservation(m,visibleObservation('a','b',{x:10,y:12},1));
 ageAwareness(m,2,3);assert.ok(m.contacts.b.uncertainty>0);
 assert.deepEqual(m.contacts.b.estimate,{x:10,y:12});
 clearObservedPosition(m,'b');
 assert.ok(m.contacts.b.confidence<.6);
 ageAwareness(m,200,400);assert.equal(bestBelief(m),null);
});
