import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('saved-replay DOM rendering is owned by the replay library UI module',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const library=readFileSync(new URL('../src/ui/breach-replay-library-ui.ts',import.meta.url),'utf8');
 assert.ok(main.includes('createReplayLibraryUi({'));
 assert.ok(!main.includes("const fragment=document.createDocumentFragment();\n    for(const item of entries)"));
 assert.ok(library.includes('async function renderSavedReplayLibrary()'));
 assert.ok(library.includes('async function importSavedReplayFile('));
 assert.ok(library.includes('async function exportSavedReplayFile('));
});
