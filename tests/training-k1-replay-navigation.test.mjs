import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('training terminal UI never invokes New Site and replay uses existing entry',()=>{
 const screen=readFileSync(new URL('../src/ui/breach-mission-screens.ts',import.meta.url),'utf8');
 const trainer=readFileSync(new URL('../src/ui/breach-training-screen.ts',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(screen,/config\.getMode\(\)==='training'\)port\.restartMission\(\)/);
 assert.match(trainer,/WATCH REPLAY/);
 assert.match(main,/onReplay:\(\)=>enterReplay\('debrief'\)/);
});
