import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('Quick Play mission creator uses the same saved roster layout copy authority',()=>{
 assert.match(read('ui/quick-play-configurator.ts'),/onCopyLayout:options\.onCopyCarryLayout\?/);
 assert.match(read('breach-quickplay-controller.ts'),/onCopyCarryLayout:config\.copyCarryLayout/);
 assert.match(read('breach-main.ts'),/copyRosterCarryLayout\(persistentRoster,sourceId,targetId\)/);
});
