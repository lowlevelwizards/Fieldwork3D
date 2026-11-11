import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {debriefPrimaryActionLabel,FIELDWORK_TERMS}
 from '../src/ui/fieldwork-vocabulary.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('one tactical round is always a mission; campaign exit is distinct',()=>{
 assert.equal(debriefPrimaryActionLabel('quick'),'NEW MISSION');
 assert.equal(debriefPrimaryActionLabel('mission'),'RETURN TO BASE');
 assert.equal(FIELDWORK_TERMS.mainMenu,'MAIN MENU');
});
test('debrief, Quick Play and configurator use one vocabulary',()=>{
 const index=read('index.html');
 assert.match(index,/id="afterActionMainMenu"/);
 assert.match(index,/id="next"[^>]*>NEW MISSION/);
 assert.match(index,/data-after-tab="squad"/);
 assert.doesNotMatch(index,/NEXT ARRANGEMENT/);
 const cfg=read('src/ui/quick-play-configurator.ts');
 assert.match(cfg,/MISSION SETUP/);
 assert.match(cfg,/SITE SEED/);
 const screens=read('src/ui/breach-mission-screens.ts');
 assert.match(screens,/MISSION SETUP/);
});
