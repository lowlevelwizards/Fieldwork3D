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
 assert.match(css,/:is\(body\[data-hud-phase="planning"\],body\[data-hud-phase="targeting"\]\).*?\.unit:not\(\.down\)\[data-plan-count\]/);
 assert.match(css,/pointer-events:none/);
});

test('UI.6B keeps GO executable while updating squad-order feedback on edit',()=>{
 assert.match(hud,/queuedOrders:friendly\.reduce\(\(sum,actor\)=>\s*sum\+\(actor\.health>0\?actor\.plan\.length:0\),0\)/);
 assert.match(hud,/writeDomAttribute\(config\.play,'aria-label',executionAction\)/);
 assert.match(hud,/writeDomAttribute\(config\.play,'title',executionAction\)/);
 assert.match(hud,/config\.play\.dataset\.queuedOrders=String\(config\.queuedOrders\)/);
 assert.match(hud,/Execute plan · no orders queued/);
 assert.match(css,/:is\(body\[data-hud-phase="planning"\],body\[data-hud-phase="targeting"\]\).*?#play\[data-mode="go"\]:not\(\[data-queued-orders="0"\]\)/);
 assert.doesNotMatch(hud,/config\.play\.disabled=config\.queuedOrders===0/);
});

test('UI.6C names the actual command target, including selected WATCH marker semantics',()=>{
 assert.match(hud,/const validWaypoint=!!node&&index>0/);
 assert.match(hud,/const watchSelected=!validWaypoint&&input\.selectedActiveWatch&&/);
 assert.match(hud,/watchSelected\?'HERE · WATCH SELECTED':'HERE'/);
 assert.match(hud,/actor\.name\+' at waypoint '\+index/);
 assert.match(hud,/actor\.name\+' at current position'/);
 assert.match(hud,/const current=input\.plannedControl\(validWaypoint\?node\?\.id:undefined\)/);
 assert.match(hud,/writeDomAttribute\(button,'aria-label',\s*scopeTarget\+': '/);
 assert.match(css,/\.quick-states\[data-scope-kind="waypoint"\]/);
 assert.match(css,/\.quick-states\[data-scope-kind="watch"\]/);
});

test('UI.6D limits readiness decoration to planning and target authoring, omitting down operators',()=>{
 assert.match(css,/:is\(body\[data-hud-phase="planning"\],body\[data-hud-phase="targeting"\]\) \.tactical-hud \.bar \.unit:not\(\.down\)/);
 assert.match(css,/:is\(body\[data-hud-phase="planning"\],body\[data-hud-phase="targeting"\]\) \.tactical-hud \.bar #play/);
 assert.doesNotMatch(css,/^\.tactical-hud \.bar \.unit\[data-plan-count\]/m);
});

test('UI.6E execution readiness excludes incapacitated operators without discarding plans',()=>{
 assert.match(hud,/actor\.health>0\?actor\.plan\.length:0/);
 assert.match(hud,/Execute plan · '\+config\.queuedOrders\+' queued '/);
 assert.match(hud,/on available operators/);
 assert.match(hud,/const queued=a\?\.plan\.length\?\?0/);
});
