import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
test('mission creator carries exact roster-authorized rig, belt and pack UI',()=>{
 const config=read('ui/quick-play-configurator.ts');
 assert.match(config,/\['rig','belt','backpack'\] as const/);
 assert.match(config,/attachCarryGearChangePreview\(/);
 assert.match(config,/options\.onEquipCarryGear\?\.\(selected\.id,slot,itemId\)/);
 assert.match(config,/squadPreview\?\.highlightCarryLocation\(where\)/);
 assert.match(read('breach-quickplay-controller.ts'),/onEquipCarryGear:config\.equipCarryGear/);
 assert.match(read('breach-main.ts'),/equipRosterCarryGear\(persistentRoster,id,slot,itemId\)/);
});
