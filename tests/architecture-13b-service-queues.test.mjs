import test from 'node:test';
import assert from 'node:assert/strict';
import {placeServiceQueues} from '../src/worldgen/service-queue-layout.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibraryProblems,assetLibrary} from '../src/worldgen/asset-library.ts';
test('queue posts form a physical pair at the customer face of a reception station',()=>{
 const room={id:'R',x:0,y:0,w:190,h:160,kind:'room',purpose:'reception'};
 const desk={x:95,y:56,w:56,h:24,fixture:'reception-desk',low:false,orientation:0};
 const base={rooms:[room],cover:[desk],doors:[],openings:[],
   spawn:[],enemies:[],objective:{x:10,y:10},extract:{x:14,y:14},
   entrance:{x:18,y:18}};
 const s=placeServiceQueues(base);
 const posts=s.cover.filter(c=>c.fixture==='queue-stanchion');
 assert.equal(posts.length,2);
 assert.ok(posts.every(c=>c.y>desk.y));
 assert.equal(s.cover.length,3);
 assert.equal(base.cover.length,1);
 assert.deepEqual(placeServiceQueues(s),s,'generation is idempotent');
});
test('queue posts do not invade door approaches or existing customer circulation',()=>{
 const room={id:'R',x:0,y:0,w:190,h:160,kind:'room',purpose:'checkout'};
 const desk={x:95,y:56,w:52,h:24,fixture:'transaction-counter',low:false,orientation:0};
 const base={rooms:[room],cover:[desk],doors:[{id:'E',a:{x:77,y:90},b:{x:112,y:90}}],
   openings:[],spawn:[],enemies:[],objective:{x:10,y:10},extract:{x:14,y:14},
   entrance:{x:18,y:18}};
 assert.equal(placeServiceQueues(base).cover.filter(c=>c.fixture==='queue-stanchion').length,0);
 const p=propDefinition('queue-stanchion');
 assert.ok(p&&p.solid&&p.cover==='low');
 assert.equal(assetLibrary().find(x=>x.id==='queue-stanchion')?.presentation,'bespoke');
 assert.deepEqual(assetLibraryProblems(),[]);
});
