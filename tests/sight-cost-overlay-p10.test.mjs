import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
test('opt-in ?perf only activates sight counters after overlay setup',()=>{
 assert.match(main,/setSightDiagnosticsEnabled\(!!perfOverlay\)/);
 const begin=main.indexOf('const perfOverlay=');
 const enabled=main.indexOf('setSightDiagnosticsEnabled(!!perfOverlay)');
 const raf=main.indexOf('function tick(now:number)');
 assert.ok(begin<enabled&&enabled<raf);
 assert.match(main,/const sight=drainSightDiagnostics\(\)/);
 assert.match(main,/SIGHT \(750ms\)/);
 assert.match(main,/sight\.liveQueries/);
 assert.match(main,/sight\.liveOcclusionProbes/);
 assert.match(main,/sight\.personalQueries/);
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
