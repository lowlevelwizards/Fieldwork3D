import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const runtime=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
test('opt-in ?perf only activates sight counters after overlay setup',()=>{
 assert.match(runtime,/setSightDiagnosticsEnabled\(!!perfOverlay\)/);
 const begin=runtime.indexOf('const perfOverlay=');
 const enabled=runtime.indexOf('setSightDiagnosticsEnabled(!!perfOverlay)');
 const raf=runtime.indexOf('function tick(now:number)');
 assert.ok(begin<enabled&&enabled<raf);
 assert.match(runtime,/const sight=drainSightDiagnostics\(\)/);
 assert.match(runtime,/SIGHT \(750ms\)/);
 assert.match(runtime,/sight\.liveQueries/);
 assert.match(runtime,/sight\.liveOcclusionProbes/);
 assert.match(runtime,/sight\.personalQueries/);
});
test('visibility metrics never gate tactical decisions or operator reveal',()=>{
 const source=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const start=source.indexOf('export function observerPointVisible(');
 const end=source.indexOf('export function nearestDoor(',start);
 const functions=source.slice(start,end);
 assert.match(functions,/return unobstructed\(observer\.p,p,s,observer\.posture==='crouch'\)/);
 assert.match(functions,/if\(unobstructed\(a\.p,p,s,a\.posture==='crouch'\)\)/);
 assert.doesNotMatch(functions,/drainSightDiagnostics\(/);
 assert.doesNotMatch(functions,/sightDiagnosticCounts\.[a-zA-Z]+\s*[!=<>]/,
   'counters can never control LOS results');
});
