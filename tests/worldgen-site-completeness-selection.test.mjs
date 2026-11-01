import test from 'node:test';
import assert from 'node:assert/strict';
import {measureSiteCompleteness,preferCompleteCandidate,shouldTryAnotherLayout}
 from '../src/worldgen/site-completeness.ts';
import {generateSite} from '../src/breach-site.ts';
const room=(purpose,id)=>({id,kind:'room',purpose,x:0,y:0,w:150,h:120});
const seedSite=(purpose,cover=[])=>({rooms:[room(purpose,'a')],
 cover,doors:[],units:[],enemies:[],spawn:[],objective:{x:0,y:0},extract:{x:0,y:0}});
test('essential equipment and private-unit completion influence physical candidate rank',()=>{
 const empty=measureSiteCompleteness(seedSite('bathroom'));
 const full=measureSiteCompleteness(seedSite('bathroom',[
   {x:15,y:20,w:20,h:10,fixture:'toilet'},
   {x:44,y:20,w:20,h:10,fixture:'sink'},
   {x:80,y:20,w:35,h:25,fixture:'shower'}
 ]));
 assert.equal(full.score,0);
 assert.ok(empty.criticalMissing>=3);
 assert.ok(preferCompleteCandidate(full,empty));
 assert.ok(!preferCompleteCandidate(empty,full));
 assert.equal(shouldTryAnotherLayout(empty,'standard'),true);
 assert.equal(shouldTryAnotherLayout(full,'large'),false);
});
test('minor optional omissions do not require more mobile layout generation',()=>{
 const intact=measureSiteCompleteness(seedSite('guest',[{x:30,y:30,w:50,h:50,fixture:'bed'}]));
 assert.equal(intact.score,0);
 assert.equal(shouldTryAnotherLayout(intact,'small'),false);
});
test('bounded candidate selection remains deterministic on actual generated sites',()=>{
 for(const seed of [3,9,17,24]){
  const first=generateSite(seed,'standard');
  const second=generateSite(seed,'standard');
  assert.deepEqual(first.rooms,second.rooms);
  assert.deepEqual(first.cover,second.cover);
  assert.deepEqual(measureSiteCompleteness(first),measureSiteCompleteness(second));
 }
});
