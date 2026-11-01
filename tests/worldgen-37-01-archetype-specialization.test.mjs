import test from 'node:test';
import assert from 'node:assert/strict';
import {optionalOperationalFixtures} from '../src/worldgen/archetype-operational-variants.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
const room=(purpose,x=20,y=15)=>({kind:'room',id:'R',x,y,w:210,h:180,
 purpose,tone:0});
test('seeded operational variations do not invent props or sprawl',()=>{
 const archetypes=[
  ['restaurant','dining','cafe'],['retail','sales','convenience-store'],
  ['office','break',''],['motel','laundry',''],['garage','workshop',''],
  ['warehouse','packing',''],['clinic','treatment',''],['utility','maintenance',''],
  ['house','living','']
 ];
 for(const [kind,purpose,subtype] of archetypes)for(let seed=0;seed<24;seed++){
  const extras=optionalOperationalFixtures(kind,room(purpose),subtype,seed);
  assert.ok(extras.length<=1);
  assert.ok(extras.every(item=>propDefinition(item.id)?.solid),kind+' '+purpose);
  assert.deepEqual(extras,optionalOperationalFixtures(kind,room(purpose),subtype,seed));
 }
});
test('archetypes have genuinely varied functional equipment choices',()=>{
 const variants=Array.from({length:24},(_,seed)=>
  optionalOperationalFixtures('restaurant',room('kitchen'),'diner',seed)
   .map(x=>x.id).join(','));
 assert.ok(new Set(variants).size>=3);
 assert.deepEqual(optionalOperationalFixtures('restaurant',room('exam'),'diner',7),[]);
});
test('small rooms and hallways are not randomly filled with specialty equipment',()=>{
 assert.deepEqual(optionalOperationalFixtures('clinic',{...room('treatment'),w:75,h:90},'',7),[]);
 assert.deepEqual(optionalOperationalFixtures('warehouse',{...room('loading'),kind:'hall'},'',7),[]);
});
