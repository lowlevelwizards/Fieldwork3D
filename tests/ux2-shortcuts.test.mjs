import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const handler=main.slice(main.indexOf("window.addEventListener('keydown'"),
 main.indexOf('function pointerWorld(',main.indexOf("window.addEventListener('keydown'")));
test('keyboard route clear and restart share guarded UI actions',()=>{
 assert.match(handler,/if\(e\.code==='KeyX'[^]*?ui\.clear\.click\(\)/);
 assert.match(handler,/if\(e\.code==='KeyR'[^]*?ui\.restart\.click\(\)/);
 assert.doesNotMatch(handler,/clearPlan\(state,selected\)/);
});
test('shortcuts ignore form editing and active dialogs',()=>{
 assert.match(handler,/appFlow.mode==='menu'\|\|appFlow.mode==='home'/);
 assert.match(handler,/target\.isContentEditable/);
 assert.match(handler,/\.fw-confirm-backdrop/);
});
