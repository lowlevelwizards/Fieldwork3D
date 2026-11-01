import test from 'node:test';
import assert from 'node:assert/strict';
import {newAwareness,addObservation,visibleObservation} from '../src/breach-awareness.ts';
test('observations are isolated, deduplicated and bounded',()=>{
 const a=newAwareness(),b=newAwareness();
 const o=visibleObservation('A','hostile',{x:10,y:20},1);
 assert.equal(addObservation(a,o),true);
 assert.equal(addObservation(a,o),false);
 assert.equal(a.contacts.hostile.estimate.x,10);
 assert.equal(b.contacts.hostile,undefined);
 o.estimate.x=500;
 assert.equal(a.contacts.hostile.estimate.x,10);
 for(let i=0;i<100;i++)addObservation(a,{id:'sound'+i,observerId:'A',
 source:'auditory',kind:'noise',at:i+2,estimate:{x:i,y:0},uncertainty:18});
 assert.equal(a.observations.length,48);
});
