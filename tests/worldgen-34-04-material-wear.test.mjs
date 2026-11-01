import test from 'node:test';
import assert from 'node:assert/strict';
import {materialWearKind} from '../src/worldgen/material-wear-language.ts';
import {canWear} from '../src/worldgen/material-properties.ts';
import {planEnvironmentalWear} from '../src/worldgen/environment-wear.ts';
import {fixtureWearEffect} from '../src/worldgen/object-wear.ts';
import {fixturePixelSurface,roomPixelSurface} from '../src/worldgen/pixel-surface-selection.ts';
const surfaces=['tile','carpet','wood','sealed-concrete','metal','porcelain',
 'fabric','painted-metal','grass'];
const activities=['private','wet','industrial','traffic','cooking'];
test('proposed wear always resolves to a material-legal nonphysical mark',()=>{
 for(const surface of surfaces)for(const activity of activities){
  for(const proposed of ['rust','fray','oil','grease','mineral','scratch','drip']){
   const result=materialWearKind(surface,proposed,activity,.72);
   assert.ok(canWear(surface,result),surface+':'+activity+':'+result);
  }
 }
 assert.notEqual(materialWearKind('carpet','rust'),'rust');
 assert.notEqual(materialWearKind('porcelain','oil'),'oil');
 assert.equal(materialWearKind('painted-metal','rust'),'rust');
});
test('new utility equipment acquires wear appropriate to its surface',()=>{
 for(const id of ['mop-bucket','trash-bag','storage-tote','linen-cart',
  'tool-rack','ice-machine','utility-sink','refrigerated-display']){
  const surface=fixturePixelSurface(id);
  for(const n of [.1,.6,.95])
   assert.ok(canWear(surface,fixtureWearEffect(id,n)),id+':'+n);
 }
});
test('visible continuous room aging is deterministic and material plausible',()=>{
 const room={id:'R1',x:0,y:0,w:180,h:170,kind:'room',tone:0,purpose:'office'};
 const site={seed:22,archetype:'office',condition:'neglected',conditionLevel:100,
  rooms:[room],cover:[],doors:[],walls:[]};
 const a=planEnvironmentalWear(site);
 assert.deepEqual(a,planEnvironmentalWear(site));
 assert.ok(a.length>0);
 const surface=roomPixelSurface('office','office');
 assert.ok(a.every(m=>canWear(surface,m.kind)),a.map(m=>m.kind).join(','));
});
