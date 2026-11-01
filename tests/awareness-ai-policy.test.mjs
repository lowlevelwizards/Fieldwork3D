import test from 'node:test';import assert from 'node:assert/strict';
import {chooseAiIntent} from '../src/breach-ai-policy.ts';
const idle={visible:false,hasBelief:false,recentSound:false,suppression:0,morale:1};
test('credible threat overrides search but lost contact cannot persist as a live target',()=>{
 const watch=chooseAiIntent(null,idle,1);
 assert.equal(watch.kind,'watch');
 const search=chooseAiIntent(watch,{...idle,recentSound:true},1.1);
 assert.equal(search.kind,'investigate');
 const engage=chooseAiIntent(search,{...idle,visible:true},1.2);
 assert.equal(engage.kind,'engage');
 assert.notEqual(chooseAiIntent(engage,{...idle,hasBelief:true},1.3).kind,'engage');
 assert.equal(chooseAiIntent(null,{...idle,visible:true,suppression:.9,morale:.2},2).kind,'withdraw');
});
