import test from 'node:test';import assert from 'node:assert/strict';
import {proposeStreetInfrastructure,streetConflicts} from '../src/worldgen/street-infrastructure.ts';
import {attachStreetJunction} from '../src/worldgen/street-junction.ts';
import {planStreetMarkings} from '../src/worldgen/street-markings.ts';
import {planStreetFinishes} from '../src/worldgen/street-finish.ts';
import {overlapsPublicStreetRoad} from '../src/worldgen/public-street-layout.ts';
const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.width+b.width)/2&&Math.abs(a.y-b.y)<(a.depth+b.depth)/2;
test('clear side corridor makes a connected road with a real opening, never over authored property',()=>{
 for(const entrySide of ['south','north','east','west']){
  const axis=entrySide==='south'||entrySide==='north'?'x':'y',sign=entrySide==='south'||entrySide==='east'?1:-1;
  const entrance=axis==='x'?{x:500,y:500+sign*100}:{x:500+sign*100,y:500};
  const site={seed:8,entrySide,archetype:'office',bounds:{minX:0,minY:0,maxX:1000,maxY:1000},rooms:[{x:400,y:400,w:200,h:200}],doors:[],entrance,spawn:[entrance],enemies:[],objective:{x:500,y:500},extract:entrance,cover:[],exteriorZones:[]};
  const p=proposeStreetInfrastructure(site,'commercial',80);
  const withPlan={...site,streetInfrastructure:p},next=attachStreetJunction(withPlan);
  assert.ok(next.junction,entrySide);
  const r=next.junction.road;
  assert.ok(!overlap(r,next.frontage.road));
  assert.ok(next.frontage.sidewalkPieces.every(s=>!overlap(s,r)));
  assert.ok(next.frontage.curb.every(s=>!overlap(s,r)));
  const final={...site,streetInfrastructure:next};
  assert.deepEqual(streetConflicts(final,next),[]);
  assert.ok(overlapsPublicStreetRoad(final,{x:r.x,y:r.y,w:2,h:2}));
  assert.ok(planStreetFinishes(final).some(m=>m.kind==='street-side-road'));
  assert.ok(planStreetMarkings(final).length>planStreetMarkings(withPlan).length);
  const blocked={...withPlan,cover:[{x:64,y:500,w:128,h:128},{x:936,y:500,w:128,h:128},{x:500,y:64,w:128,h:128},{x:500,y:936,w:128,h:128}]};
  assert.equal(attachStreetJunction(blocked).junction,undefined);
 }
});
