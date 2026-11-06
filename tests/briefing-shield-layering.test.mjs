import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../src/ui/ux-r1-sheets.css',import.meta.url),'utf8');
const base=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('briefing dialog stacks above its blurred shield, like Squad/Settings',()=>{
 const shield=Number(css.match(/#tacticalSheetShield\\{[^}]*z-index:(\\d+)/)?.[1]);
 const briefing=Number(css.match(/\\.briefing-panel\\.fw-mission-dossier\\{z-index:(\\d+)/)?.[1]);
 const squad=Number(css.match(/\\.fw-squad-sheet\\{[\\s\\S]*?z-index:(\\d+)/)?.[1]);
 const settings=Number(css.match(/\\.site-settings\\{[\\s\\S]*?z-index:(\\d+)/)?.[1]);
 assert.ok(Number.isInteger(shield)&&shield>0);
 assert.ok(briefing>shield,'briefing must be in front of blur backdrop');
 assert.ok(squad>shield&&settings>shield);
 assert.match(index,/id="briefingPanel" class="briefing-panel fw-mission-dossier"/);
 assert.match(base,/\\.briefing-panel\\{position:fixed;z-index:8;/);
});
