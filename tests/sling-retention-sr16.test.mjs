import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {labRetentionSample} from '../src/operator-lab-retention.ts';
import {sampleSuspensionMotion} from '../src/breach-weapon-suspension.ts';
test('SR16 loop audition and motion multiplier remain deterministic',()=>{
 const a=labRetentionSample('front-slung','sling-two-point',0,true,.5);
 assert.ok(a.weight>0&&a.weight<1);
 assert.deepEqual(a,labRetentionSample('front-slung','sling-two-point',1,true,.5));
 const m={stride:8.74,speed:40,massKg:3,inertia:100};
 assert.equal(sampleSuspensionMotion('two',{...m,strength:0}).lift,0);
 assert.ok(Math.abs(sampleSuspensionMotion('two',{...m,strength:1.5}).lift)>Math.abs(sampleSuspensionMotion('two',m).lift));
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 for(const id of ['retentionRate','retentionMotion','retentionHeld','retentionSettled','retentionRoute'])assert.ok(html.includes('id="'+id+'"'));
});
