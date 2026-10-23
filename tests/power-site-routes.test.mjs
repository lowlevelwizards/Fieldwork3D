import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationGrid } from '../src/navigation/grid.ts';

test('new generator, switchgear and junction all have navigable physical working positions',()=>{
  const obstacles=[
    {kind:'box',x:-9,z:-13,halfX:5.4,halfZ:3.9},
    {kind:'box',x:19,z:-17,halfX:3.3,halfZ:2.65},
    {kind:'circle',x:29,z:-19,radius:1.5},
    {kind:'box',x:12,z:4,halfX:3.6,halfZ:2.2},
    {kind:'box',x:1.3,z:-9.3,halfX:.84,halfZ:.55},
    {kind:'box',x:8,z:7,halfX:.96,halfZ:.7},
    {kind:'box',x:-18,z:-7.5,halfX:1.696,halfZ:1.166},
    {kind:'box',x:-3,z:-6.7,halfX:1.007,halfZ:.610},
    {kind:'box',x:24,z:-23,halfX:1.007,halfZ:.583},
    {kind:'box',x:5,z:-12.7,halfX:.56,halfZ:.56},
    {kind:'box',x:6.5,z:-13.1,halfX:.45,halfZ:.45},
    {kind:'box',x:16.5,z:-11,halfX:.67,halfZ:.67},
  ];
  const nav=new NavigationGrid(obstacles);
  const starts=[
    {x:8.2,z:10.8}, {x:10.7,z:10.15},
    {x:-18,z:-5.4},{x:-3,z:-4.85},
    {x:1.3,z:-7.98},{x:24,z:-20.8},{x:29,z:-16.7},
  ];
  for(const point of starts) assert.equal(nav.canOccupy(point),true,`station safe: ${JSON.stringify(point)}`);
  for(const a of starts) for(const b of starts) {
    if(a===b)continue;
    const path=nav.findPath(a,b);
    assert.ok(path.length>0,`path from ${JSON.stringify(a)} to ${JSON.stringify(b)}`);
  }
});
