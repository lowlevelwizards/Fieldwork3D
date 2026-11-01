import test from 'node:test';
import assert from 'node:assert/strict';
import {visualGain,advanceSight,confirmedSight} from '../src/breach-visual-perception.ts';
test('visual acquisition requires facing and time, and vanishes behind obstacles',()=>{
 assert.equal(visualGain(30,1.5,true,false),0);
 let p=0;
 for(let i=0;i<5;i++)p=advanceSight(p,1/60,visualGain(180,.3,false,false),true);
 assert.equal(confirmedSight(p),false);
 for(let i=0;i<100;i++)p=advanceSight(p,1/60,visualGain(180,.3,true,false),true);
 assert.equal(confirmedSight(p),true);
 assert.equal(advanceSight(p,1/60,1,false),0);
 assert.ok(visualGain(60,0,true,false)>visualGain(60,0,false,true));
});
