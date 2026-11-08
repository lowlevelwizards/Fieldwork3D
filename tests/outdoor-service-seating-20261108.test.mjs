import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary} from '../src/worldgen/asset-library.ts';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';
import {outdoorFixtureAllowed,frontageEdgeCandidates}
  from '../src/worldgen/outdoor-fixture-policy.ts';
import {overlapsPublicStreetRoad,planPublicStreet}
  from '../src/worldgen/public-street-layout.ts';

const zone={id:'arrival-forecourt',kind:'parking',
 x:350,y:500,w:222,h:118};
test('public bench is a dedicated physical seating asset, not a vehicle or room bench',()=>{
 const asset=propDefinition('public-bench');
 assert.deepEqual([asset?.width,asset?.depth,asset?.height],[45,21,26]);
 assert.equal(asset?.cover,'low');
 assert.equal(assetLibrary().find(a=>a.id==='public-bench')?.presentation,
  'bespoke');
 assert.equal(outdoorFixtureAllowed({archetype:'clinic'},zone,'public-bench'),true);
 assert.equal(outdoorFixtureAllowed({archetype:'house'},zone,'public-bench'),false);
 assert.equal(outdoorFixtureAllowed({archetype:'warehouse'},zone,'public-bench'),false);
});

test('public frontage infrastructure stays on property side of sidewalk',()=>{
 const s={entrySide:'south',rooms:[{
  id:'R',kind:'room',x:225,y:230,w:250,h:200}],
  bounds:{minX:0,minY:0,maxX:700,maxY:700},
  entrance:{x:350,y:430},doors:[],exteriorZones:[zone]};
 const street=planPublicStreet(s);
 assert.ok(street?.sidewalk);
 const points=frontageEdgeCandidates(s,zone,'public-bench',45,21);
 assert.equal(points?.length,2);
 for(const p of points){
  assert.equal(overlapsPublicStreetRoad(s,{...p,w:45,h:21}),false);
  assert.ok(p.x<330||p.x>370,'bench must leave entry approach clear');
 }
});

test('generated clinic entrance may get a real public bench without blocking street',()=>{
 const site={seed:23,archetype:'clinic',entrySide:'south',
  rooms:[{id:'R',kind:'room',purpose:'waiting',x:225,y:230,w:250,h:200}],
  bounds:{minX:0,minY:0,maxX:700,maxY:700},cover:[],
  doors:[{id:'FRONT',a:{x:326,y:430},b:{x:374,y:430}}],
  entrance:{x:350,y:430},spawn:[],enemies:[],
  objective:{x:-50,y:-50},extract:{x:-50,y:-50}};
 const generated=addExteriorProperty(site,23);
 const benches=generated.cover.filter(c=>c.fixture==='public-bench');
 assert.ok(benches.length>=1);
 for(const b of benches){
  assert.equal(overlapsPublicStreetRoad(generated,b),false);
  assert.ok(Math.abs(b.x-350)>35);
 }
});

test('electrical cabinet has recognizable service doors, not dark vending display',()=>{
 const source=readFileSync(new URL('../src/worldgen/fixture-visuals.ts',
  import.meta.url),'utf8');
 assert.match(source,/fixture==='utility-cabinet'/);
 assert.match(source,/powder-coated steel, two accessible door leaves/);
 assert.match(source,/w\*\.438,height\*\.77,1\.15,doors/);
 assert.doesNotMatch(source,/w\*\.84,height\*\.90,1,dark/);
 assert.match(source,/fixture==='public-bench'/);
 assert.match(source,/fixture==='mailbox'/);
 assert.match(source,/fixture==='parking-block'/);
});
