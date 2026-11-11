/** A1 removal guards: delete duplicate behavior, not active gameplay contracts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import * as core from '../src/breach-core.ts';
import {newSession,team,enemies} from '../src/breach-game.ts';
const source=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('A1: the original geometry and initial actor seed remain active',()=>{
 const state=core.newTacticalState();
 assert.equal(state.phase,'planning');
 assert.deepEqual(state.operators.map(a=>a.id),['rook','moss','sentry','guard']);
 assert.equal(core.initialDoors().length,2);
 assert.equal(typeof core.route,'function');
 assert.equal(typeof core.passable,'function');
 assert.equal(typeof core.isClear,'function');
 assert.equal(typeof core.activeSite,'function');
 assert.equal(typeof core.withTemporarySiteGeometry,'function');
 const session=newSession();
 assert.equal(team(session).length,2);
 assert.equal(enemies(session).length,2);
});

test('A1: no alternate source-of-truth combat or authoring loop remains in geometry',()=>{
 for(const key of ['step','toggleExecution','sees','own','hostiles',
   'queueWaypoint','clearPath','setLook'])
  assert.equal(key in core,false,'retired prototype export: '+key);
 const game=source('src/breach-game.ts');
 assert.ok(game.includes('stepSession('));
 assert.ok(game.includes('newTacticalState()'));
});

test('A1: unused property expansions are absent; active footprint pipeline retained',()=>{
 for(const path of [
  'src/worldgen/architectural-wings.ts','src/worldgen/expanded-property.ts'
 ])assert.equal(existsSync(new URL('../'+path,import.meta.url)),false,path);
 const compiler=source('src/worldgen/architectural-compiler.ts');
 assert.ok(compiler.includes('synthesizeFootprint'));
 assert.ok(compiler.includes('compile')||compiler.includes('rooms'));
 const active=source('src/breach-site.ts');
 assert.ok(active.includes('architectural-compiler')||active.includes('generate'));
});

test('A1: only 3D fog rollback is retired; 2D shared painter remains functional',()=>{
 const threeD=source('src/breach-3d.ts');
 assert.ok(!threeD.includes('fogLegacy'),'3D must not advertise an obsolete alternate mode');
 assert.ok(!threeD.includes('paintFogMask('),'3D uses memory and live visibility layers');
 assert.ok(threeD.includes('paintFogMemory('));
 assert.ok(threeD.includes('paintFogVisibility('));
 const painter=source('src/breach-fog-mask.ts');
 const twoD=source('src/breach-2d-visibility-renderer.ts');
 assert.ok(painter.includes('export function paintFogMask('));
 assert.ok(twoD.includes('paintFogMask('));
 assert.ok(threeD.includes('fogMemoryFingerprint('));
 assert.ok(threeD.includes('fogSessionFingerprint('));
});

test('A1: supported QA and compatibility toggles remain intentionally intact',()=>{
 const threeD=source('src/breach-3d.ts');
 const main=source('src/breach-main.ts');
 const world=source('src/breach-presentation-world-ownership.ts');
 assert.ok(threeD.includes("get('lighting')!=='legacy'"));
 assert.ok(main.includes('civilians=0'));
 assert.ok(main.includes('LEGACY_ROSTER_KEY'));
 assert.ok(world.includes('withDetachedPresentationWorld'));
});
