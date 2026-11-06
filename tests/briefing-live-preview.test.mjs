import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
test('B6 preview: dossier is opt-in; default Quick Play remains unchanged',()=>{
 assert.match(source,/briefingPreviewEnabled=startupParams\.get\('briefingV2'\)==='1'/);
 assert.match(source,/const dossier=briefingPreviewEnabled\?state\.operationDossier:undefined/);
 assert.match(source,/ui\.briefingBody\.textContent=dossier\?/);
});
test('B6 preview: restart and replay restore resolved dossiers',()=>{
 assert.match(source,/state\.operationDossier=restartStart\?\.dossier\?/);
 assert.match(source,/state\.operationDossier=recorder\.manifest\?\.dossier\?/);
 assert.match(source,/if\(state\.operationDossier\)state\.operationDossier\.identity\.entryId=next/);
});
