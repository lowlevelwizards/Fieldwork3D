import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {seeded as publicSeeded} from '../src/breach-site.ts';
import {seeded as pureSeeded} from '../src/worldgen/seeded-rng.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
test('E3.C2 RNG stream matches fixed historical seed vectors',()=>{
 assert.strictEqual(publicSeeded,pureSeeded);
 const expected=new Map([
  [0,[0.23606797284446657,0.278566908556968,0.8195337599609047,0.6678668977692723]],
  [1,[0.23645552527159452,0.3692706737201661,0.5042420323006809,0.7048832636792213]],
  [-1,[0.2356804204173386,0.18786314339376986,0.13482548762112856,0.6308505318593234]],
  [3411,[0.5580093017779291,0.6691098802257329,0.3594507109373808,0.9306910166051239]]
 ]);
 for(const [seed,values] of expected){
  const random=pureSeeded(seed);
  assert.deepEqual(values.map(()=>random()),values,'RNG changed for '+seed);
 }
});
test('E3.C2 compiler has no runtime seeded import from site generator',()=>{
 const source=readFileSync(new URL('../src/worldgen/architectural-compiler.ts',import.meta.url),'utf8');
 assert.ok(source.includes("import {seeded} from './seeded-rng.ts'"));
 assert.ok(!source.includes('SiteScale,seeded}'),
  'compiler must not depend on site-generator exports at runtime');
});
test('E3.C2 seeded compiler geometry is stable across repeated calls',()=>{
 const a=compileArchitecturalSite('house',53,'standard');
 const b=compileArchitecturalSite('house',53,'standard');
 assert.ok(a.rooms.length>0&&a.walls.length>0);
 assert.deepEqual({rooms:a.rooms,walls:a.walls,doors:a.doors,cover:a.cover},
  {rooms:b.rooms,walls:b.walls,doors:b.doors,cover:b.cover});
});
