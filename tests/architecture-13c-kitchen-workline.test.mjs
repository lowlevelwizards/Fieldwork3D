import test from 'node:test';
import assert from 'node:assert/strict';
import {planKitchenWorklines} from '../src/worldgen/kitchen-workline.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
test('commercial kitchen work lines are ordered, correctly scaled, and preserve a clear working face',()=>{
 const room={id:'kitchen-1',kind:'room',purpose:'kitchen',x:0,y:0,w:240,h:160};
 const site={archetype:'restaurant',rooms:[room],cover:[],doors:[],openings:[],
   spawn:[],enemies:[],entrance:{x:-50,y:-50},
   objective:{x:-30,y:-30},extract:{x:-20,y:-20}};
 const group=planKitchenWorklines(site,[]);
 assert.deepEqual(group.map(o=>o.fixture),['prep-table','commercial-range','dish-station']);
 assert.ok(group.every(o=>o.low=== (propDefinition(o.fixture)?.cover==='low')));
 assert.ok(group.every(o=>o.x>room.x&&o.x<room.x+room.w&&o.y>room.y&&o.y<room.y+room.h));
 assert.ok(group[0].x<group[1].x&&group[1].x<group[2].x);
 assert.deepEqual(planKitchenWorklines(site,group),[]);
});
test('small kitchens and threatened doorway approaches do not force a dysfunctional installation',()=>{
 const r={id:'kitchen-1',kind:'room',purpose:'kitchen',x:0,y:0,w:170,h:105};
 const base={archetype:'restaurant',rooms:[r],cover:[],doors:[],openings:[],
   spawn:[],enemies:[],entrance:{x:-50,y:-50},objective:{x:-30,y:-30},extract:{x:-20,y:-20}};
 assert.deepEqual(planKitchenWorklines(base,[]),[]);
 assert.deepEqual(planKitchenWorklines({...base,rooms:[{...r,w:240,h:160}],
   doors:[{a:{x:70,y:38},b:{x:120,y:38}},{a:{x:70,y:122},b:{x:120,y:122}}]},[]),[]);
});
