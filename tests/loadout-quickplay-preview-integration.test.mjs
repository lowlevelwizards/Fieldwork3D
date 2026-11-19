import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=readFileSync(new URL('../src/ui/quick-play-configurator.ts',import.meta.url),'utf8');
test('Quick Play shares a lazy operator preview and disposes on close',()=>{
 assert.match(file,/const renderSquadPrep=\(\)=>/);
 assert.match(file,/new CampaignKitPreview\(previewHost/);
 assert.match(file,/squadPreview\.attachHost\(previewHost,false\)/);
 assert.match(file,/squadPreview\?\.updateEquipment\(/);
 assert.match(file,/onInspectLocation:location=>squadPreview\?\.highlightCarryLocation\(location\)/);
 assert.match(file,/if\(squadPrep\.open&&!backdrop\.hidden\)renderSquadPrep\(\)/);
 assert.match(file,/function hide\(returnFocus=true\)\{\s*disposeSquadPreview\(\)/);
 assert.match(file,/if\(squadPrep\.open\)renderSquadPrep\(\)/);
});
