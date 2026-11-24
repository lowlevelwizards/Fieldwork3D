import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=readFileSync(new URL('../src/ui/quick-play-configurator.ts',import.meta.url),'utf8');
test('Quick Play shares a lazy operator preview and disposes on close',()=>{
 assert.match(file,/const renderSquadPrep=\(\)=>/);
 const owner=readFileSync(new URL('../src/ui/equipment-workspace.ts',import.meta.url),'utf8');
 assert.match(file,/equipmentWorkspace\.mountPreview\(previewHost,selected,'carry'\)/);
 assert.match(owner,/new CampaignKitPreview\(\.\.\.args\)/);
 assert.match(owner,/preview\.attachHost\(host,false\)/);
 assert.match(file,/equipmentWorkspace\.preview\?\.updateEquipment\(/);
 assert.match(file,/onInspectLocation:location=>equipmentWorkspace\.preview\?\.highlightCarryLocation\(location\)/);
 assert.match(file,/disposeSquadPreview=\(\)=>equipmentWorkspace\.dispose\(\)/);
 assert.match(file,/if\(squadPrep\.open&&!backdrop\.hidden\)renderSquadPrep\(\)/);
 assert.match(file,/function hide\(returnFocus=true\)\{\s*disposeSquadPreview\(\)/);
 assert.match(file,/if\(squadPrep\.open\)renderSquadPrep\(\)/);
});
