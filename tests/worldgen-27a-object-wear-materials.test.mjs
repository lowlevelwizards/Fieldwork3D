import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureWearEffect,planObjectWear}
 from '../src/worldgen/object-wear.ts';
import {fixturePixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
import {canWear} from '../src/worldgen/material-properties.ts';

test('a fixture physically ages according to its substrate and use',()=>{
 assert.equal(fixtureWearEffect('vehicle-lift',0),'oil');
 assert.equal(fixtureWearEffect('stove',0),'grease');
 assert.equal(fixtureWearEffect('sink',0),'mineral');
 assert.equal(fixtureWearEffect('sofa',0),'fray');
 assert.equal(fixtureWearEffect('crate',0),'scratch');
 for(const fixture of ['vehicle-lift','sofa','sink','stove','crate',
  'filing-cabinet','trash-bin','printer','dining-table']){
  for(const p of [0,.2,.6,.99]){
   const effect=fixtureWearEffect(fixture,p);
   assert.ok(canWear(fixturePixelSurface(fixture),effect),fixture+' '+effect);
  }
 }
});
test('object wear is deterministic, bounded and attached to real fixtures',()=>{
 const fixtures=['vehicle-lift','stove','sink','sofa','crate'];
 const site={seed:7,archetype:'garage',condition:'neglected',conditionLevel:94,
  cover:fixtures.map((fixture,i)=>({fixture,x:55+i*38,y:80,w:30,h:24})),
  walls:[],doors:[],rooms:[]};
 const a=planObjectWear(site),b=planObjectWear(site);
 assert.deepEqual(a,b);
 assert.ok(a.length<=38);
 for(const mark of a){
  assert.ok(mark.u>=0&&mark.u<=1&&mark.v>=0&&mark.v<=1);
  if(mark.owner==='fixture'){
   const fixture=site.cover[mark.index].fixture;
   assert.ok(canWear(fixturePixelSurface(fixture),mark.kind));
  }
 }
});
