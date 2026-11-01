import test from 'node:test';
import assert from 'node:assert/strict';
import {measureSiteCompleteness,preferCompleteCandidate}
 from '../src/worldgen/site-completeness.ts';
import {generateSite} from '../src/breach-site.ts';

const room={id:'R',kind:'room',purpose:'reception',x:0,y:0,w:190,h:160};
const counter={x:95,y:56,w:56,h:24,fixture:'reception-desk',orientation:0};
const site=(cover)=>({rooms:[room],cover,doors:[],openings:[],
 units:[],spawn:[],enemies:[],objective:{x:-200,y:-200},extract:{x:-200,y:-200}});

test('a present reception desk with a blocked staff face ranks below a workable one',()=>{
 const clear=measureSiteCompleteness(site([counter]));
 const blocked=measureSiteCompleteness(site([counter,
  {x:95,y:27,w:28,h:20,fixture:'crate'}]));
 assert.equal(clear.missingEssentials,0);
 assert.equal(blocked.missingEssentials,0);
 assert.equal(clear.counterAccessProblems,0);
 assert.equal(blocked.counterAccessProblems,1);
 assert.equal(clear.score,0);
 assert.ok(blocked.score>clear.score);
 assert.equal(preferCompleteCandidate(clear,blocked),true);
 assert.equal(preferCompleteCandidate(blocked,clear),false);
});
test('counter quality scoring remains deterministic on generated commercial spaces',()=>{
 for(const seed of [3,5,7,14]){
  const a=generateSite(seed,'small'),b=generateSite(seed,'small');
  assert.deepEqual(measureSiteCompleteness(a),measureSiteCompleteness(b));
  assert.ok(measureSiteCompleteness(a).counterAccessProblems>=0);
 }
});
