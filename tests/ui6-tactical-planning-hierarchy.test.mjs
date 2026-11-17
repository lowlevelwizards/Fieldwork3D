import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const hud=read('src/ui/tactical-hud-controller.ts');
const css=read('src/breach-style.css');
test('UI.6A uses authoritative per-operator authored plan length without navigation recalculation',()=>{
 assert.match(hud,/const queued=a\?\.plan\.length\?\?0/);
 assert.match(hud,/button\.dataset\.planCount!==String\(queued\)/);
 assert.match(hud,/const queue=actor\.plan\.length/);
 assert.match(hud,/queue\?' · '\+queue\+' QUEUED':' · NO ORDERS'/);
 assert.match(hud,/queued\+' queued '\+\(queued===1\?'order':'orders'\)/);
 assert.match(css,/\.unit\[data-plan-count\]:not\(\[data-plan-count="0"\]\)::after/);
 assert.match(css,/pointer-events:none/);
});
